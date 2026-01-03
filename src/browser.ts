// src/browser.ts
import { chromium, Browser, Page } from 'playwright-core';

let browser: Browser | null = null;
let currentPageIndex = 0;

const PLAYWRITER_HOST = process.env.PLAYWRITER_HOST || '127.0.0.1';
const PLAYWRITER_PORT = process.env.PLAYWRITER_PORT || '19988';

export async function connect(): Promise<Browser> {
  if (browser?.isConnected()) {
    return browser;
  }

  const wsEndpoint = `ws://${PLAYWRITER_HOST}:${PLAYWRITER_PORT}`;

  try {
    browser = await chromium.connectOverCDP(wsEndpoint);
    return browser;
  } catch (error) {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      throw new Error('Extension not connected. Click the Playwriter extension icon in Chrome.');
    }
    throw error;
  }
}

export async function getPages(): Promise<Page[]> {
  const b = await connect();
  const contexts = b.contexts();

  if (contexts.length === 0) {
    throw new Error('No pages available. Click the Playwriter extension icon on a Chrome tab.');
  }

  return contexts[0].pages();
}

export async function getPage(): Promise<Page> {
  const pages = await getPages();

  if (pages.length === 0) {
    throw new Error('No pages available');
  }

  // Clamp index to valid range
  currentPageIndex = Math.max(0, Math.min(currentPageIndex, pages.length - 1));

  return pages[currentPageIndex];
}

export async function switchPage(index: number): Promise<Page> {
  const pages = await getPages();

  if (index < 0 || index >= pages.length) {
    throw new Error(`Invalid page index: ${index}. Available: 0-${pages.length - 1}`);
  }

  currentPageIndex = index;
  return pages[index];
}

export async function disconnect(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export function isConnected(): boolean {
  return browser?.isConnected() ?? false;
}

export function detectConnectionError(error: Error): { code: number; message: string; hint: string } {
  const msg = error.message.toLowerCase();

  if (msg.includes('econnrefused') || msg.includes('connect')) {
    return {
      code: 2,
      message: 'Extension not connected',
      hint: 'Make sure Chrome has the Playwriter extension installed. Click the extension icon on a tab to enable control.'
    };
  }

  if (msg.includes('no pages')) {
    return {
      code: 3,
      message: 'No pages available',
      hint: 'Click the Playwriter extension icon on a Chrome tab to enable control.'
    };
  }

  return {
    code: 1,
    message: error.message,
    hint: 'An unexpected error occurred.'
  };
}

export async function listPages(): Promise<Array<{ index: number; url: string; title: string }>> {
  const pages = await getPages();

  return Promise.all(
    pages.map(async (page, index) => ({
      index,
      url: page.url(),
      title: await page.title()
    }))
  );
}

export async function getPageInfo(): Promise<{ url: string; title: string }> {
  const page = await getPage();
  return {
    url: page.url(),
    title: await page.title()
  };
}

export async function ensureConnection(): Promise<Browser> {
  if (browser && !browser.isConnected()) {
    browser = null;
  }
  return connect();
}

export async function runCommand(command: () => Promise<void>): Promise<void> {
  try {
    await connect();
    await command();
  } finally {
    await disconnect();
  }
}
