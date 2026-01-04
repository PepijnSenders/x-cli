/**
 * Core scrape functionality
 * Connects to daemon, sends commands to extension, returns markdown
 */

import WebSocket from 'ws';
import { isDaemonRunning, getDaemonPort } from './daemon.js';
import { htmlToMarkdown } from './utils/html-parser.js';

export interface ScrapeOptions {
  raw?: boolean;
  wait?: number;
  scroll?: number;
}

interface DaemonResponse {
  type?: string;
  id?: number;
  error?: string;
  extensionReady?: boolean;
  html?: string;
  url?: string;
  title?: string;
  success?: boolean;
}

/**
 * Connect to daemon and return a client for sending commands
 */
async function connectToDaemon(): Promise<{
  send: <T>(action: string, params?: Record<string, unknown>) => Promise<T>;
  close: () => void;
}> {
  if (!isDaemonRunning()) {
    throw new Error('Daemon not running. Start it with: browse init');
  }

  const port = getDaemonPort();
  const ws = new WebSocket(`ws://localhost:${port}`);

  let requestId = 0;
  const pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 5000);

    ws.on('open', () => {
      // Identify as CLI client
      ws.send(JSON.stringify({ type: 'cli' }));
    });

    ws.on('message', (data) => {
      const message: DaemonResponse = JSON.parse(data.toString());

      // Handle initial connection response
      if (message.type === 'connected') {
        clearTimeout(timeout);
        if (!message.extensionReady) {
          reject(new Error('Extension not connected. Make sure the Browse extension is installed and Chrome is open.'));
          ws.close();
          return;
        }
        resolve();
        return;
      }

      // Handle command responses
      if (message.id !== undefined) {
        const pending = pendingRequests.get(message.id);
        if (pending) {
          pendingRequests.delete(message.id);
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message);
          }
        }
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      // Reject all pending requests
      pendingRequests.forEach(({ reject }) => {
        reject(new Error('Connection closed'));
      });
      pendingRequests.clear();
    });
  });

  return {
    send: <T>(action: string, params: Record<string, unknown> = {}): Promise<T> => {
      return new Promise((resolve, reject) => {
        const id = ++requestId;
        pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject });

        ws.send(JSON.stringify({ id, action, ...params }));

        // Timeout after 30 seconds
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error(`Request timeout: ${action}`));
          }
        }, 30000);
      });
    },
    close: () => ws.close(),
  };
}

/**
 * Scrape a URL and output markdown (default) or cleaned HTML (--raw)
 */
export async function scrape(url: string, options: ScrapeOptions): Promise<void> {
  const waitTime = options.wait ?? 2000;
  const scrollCount = options.scroll ?? 0;

  const client = await connectToDaemon();

  try {
    // Navigate to URL
    await client.send('navigate', { url });

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Scroll if requested
    for (let i = 0; i < scrollCount; i++) {
      await client.send('scroll', { pixels: 1000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get page content
    const response = await client.send<DaemonResponse>('getPageContent', { prune: true });

    if (!response.html) {
      throw new Error('No content received from page');
    }

    // Output in requested format
    const sourceUrl = response.url || url;
    if (options.raw) {
      // Output cleaned HTML
      console.log(response.html);
    } else {
      // Output markdown (default)
      console.log(htmlToMarkdown(response.html, sourceUrl));
    }
  } finally {
    client.close();
  }
}
