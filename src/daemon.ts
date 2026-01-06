/**
 * Daemon management for browse CLI
 *
 * Architecture:
 * - Daemon runs WebSocket server on port 9222
 * - Extension connects and handles page interactions
 * - CLI connects as "command" client to issue requests
 * - Daemon relays commands CLI → Extension → CLI
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const BROWSE_DIR = join(homedir(), '.browse');
const PID_FILE = join(BROWSE_DIR, 'daemon.pid');
const PORT = parseInt(process.env.BROWSE_PORT || '9222', 10);
const HEALTH_PORT = PORT + 1; // Health endpoint on 9223

// Message types for client identification
interface ClientMessage {
  type: 'extension' | 'cli';
  id?: number;
  action?: string;
  [key: string]: unknown;
}

/**
 * Ensure ~/.browse directory exists
 */
function ensureDir(): void {
  if (!existsSync(BROWSE_DIR)) {
    mkdirSync(BROWSE_DIR, { recursive: true });
  }
}

/**
 * Check if daemon is already running
 */
export function isDaemonRunning(): boolean {
  if (!existsSync(PID_FILE)) {
    return false;
  }

  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
    process.kill(pid, 0);
    return true;
  } catch {
    try {
      unlinkSync(PID_FILE);
    } catch {
      // Ignore cleanup errors
    }
    return false;
  }
}

/**
 * Get daemon PID if running
 */
export function getDaemonPid(): number | null {
  if (!existsSync(PID_FILE)) {
    return null;
  }

  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

/**
 * Start the daemon in background
 */
export async function startDaemon(): Promise<void> {
  ensureDir();

  if (isDaemonRunning()) {
    console.log(`Daemon already running (PID: ${getDaemonPid()})`);
    return;
  }

  // Determine if we're running as a compiled binary or from source/npm
  // Compiled binaries: execPath is the binary itself (not node/bun)
  // Source/npm: execPath is node or bun, and we need to pass the script path
  const isCompiledBinary = !process.execPath.includes('node') && !process.execPath.includes('bun');

  let spawnArgs: string[];
  if (isCompiledBinary) {
    // Compiled binary: spawn the binary itself with __daemon__ argument
    spawnArgs = ['__daemon__'];
  } else {
    // Source or npm: spawn node/bun with the CLI script path
    const cliPath = fileURLToPath(import.meta.url).replace(/daemon\.(js|ts)$/, 'cli.js');
    spawnArgs = [cliPath, '__daemon__'];
  }

  const child = spawn(process.execPath, spawnArgs, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, BROWSE_DAEMON: '1' },
  });

  child.unref();

  // Wait a moment for daemon to start
  await new Promise(resolve => setTimeout(resolve, 500));

  if (isDaemonRunning()) {
    console.log(`Daemon started on port ${PORT}`);
    console.log('Install the Browse extension and it will auto-connect');
  } else {
    console.error('Failed to start daemon');
    process.exit(1);
  }
}

/**
 * Stop the daemon
 */
export async function stopDaemon(): Promise<void> {
  const pid = getDaemonPid();

  if (!pid) {
    console.log('Daemon is not running');
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');

    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!isDaemonRunning()) {
        console.log('Daemon stopped');
        return;
      }
    }

    process.kill(pid, 'SIGKILL');
    console.log('Daemon forcefully stopped');
  } catch {
    console.log('Daemon stopped');
  }

  try {
    unlinkSync(PID_FILE);
  } catch {
    // Ignore
  }
}

/**
 * Run the actual daemon server
 */
export async function runDaemon(): Promise<void> {
  ensureDir();
  writeFileSync(PID_FILE, process.pid.toString());

  let extensionSocket: WebSocket | null = null;
  const cliClients = new Map<WebSocket, { pendingRequests: Map<number, (response: unknown) => void> }>();

  // HTTP health endpoint for quick connectivity checks
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Enable CORS for extension health checks
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        extensionConnected: extensionSocket !== null && extensionSocket.readyState === WebSocket.OPEN,
        cliClients: cliClients.size,
        uptime: process.uptime(),
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  httpServer.listen(HEALTH_PORT, '127.0.0.1', () => {
    console.error(`Health endpoint on http://127.0.0.1:${HEALTH_PORT}/health`);
  });

  const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' });

  wss.on('connection', (ws) => {
    let clientType: 'extension' | 'cli' | null = null;

    ws.on('message', (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());

        // First message identifies client type
        if (!clientType) {
          if (message.type === 'extension') {
            clientType = 'extension';
            // Clean up old extension socket if exists
            if (extensionSocket && extensionSocket !== ws) {
              try {
                extensionSocket.close();
              } catch {
                // Ignore
              }
            }
            extensionSocket = ws;
            console.error('Extension connected');
            ws.send(JSON.stringify({ type: 'connected' }));
            return;
          } else if (message.type === 'cli') {
            clientType = 'cli';
            cliClients.set(ws, { pendingRequests: new Map() });
            console.error('CLI client connected');
            ws.send(JSON.stringify({ type: 'connected', extensionReady: extensionSocket !== null }));
            return;
          }
        }

        // Handle ping from extension (heartbeat)
        if (clientType === 'extension' && message.action === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // Handle messages based on client type
        if (clientType === 'cli') {
          // CLI sending a command - relay to extension
          if (!extensionSocket || extensionSocket.readyState !== WebSocket.OPEN) {
            ws.send(JSON.stringify({ id: message.id, error: 'Extension not connected' }));
            return;
          }

          // Store pending request and forward to extension
          const client = cliClients.get(ws);
          if (client && message.id !== undefined) {
            client.pendingRequests.set(message.id, (response) => {
              ws.send(JSON.stringify(response));
            });
          }

          extensionSocket.send(JSON.stringify(message));
        } else if (clientType === 'extension') {
          // Extension sending a response - find the CLI that made the request
          if (message.id !== undefined) {
            for (const [, client] of cliClients) {
              const resolver = client.pendingRequests.get(message.id);
              if (resolver) {
                client.pendingRequests.delete(message.id);
                resolver(message);
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    ws.on('close', () => {
      if (clientType === 'extension') {
        console.error('Extension disconnected');
        if (extensionSocket === ws) {
          extensionSocket = null;
        }
      } else if (clientType === 'cli') {
        console.error('CLI client disconnected');
        cliClients.delete(ws);
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
  });

  const shutdown = () => {
    httpServer.close();
    wss.close();
    try {
      unlinkSync(PID_FILE);
    } catch {
      // Ignore
    }
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.error(`Daemon listening on port ${PORT}`);
}

/**
 * Get the daemon port
 */
export function getDaemonPort(): number {
  return PORT;
}
