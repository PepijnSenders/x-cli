# Browser Connection

## Overview

Session Scraper connects to the user's Chrome browser via the [Playwriter](https://github.com/anthropics/playwriter) Chrome extension. Playwriter acts as a CDP (Chrome DevTools Protocol) relay server, allowing external tools to control browser tabs the user has explicitly enabled.

## Architecture

```
┌─────────────────────────────────────┐
│  Chrome Browser                     │
│  ┌───────────────────────────────┐  │
│  │  Playwriter Extension         │  │
│  │  - Listens on localhost:19988 │  │
│  │  - CDP WebSocket relay        │  │
│  │  - User clicks icon to enable │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                │
                │ WebSocket (ws://127.0.0.1:19988)
                ▼
┌─────────────────────────────────────┐
│  session-scraper CLI                │
│  - Uses playwright-core            │
│  - Connects via CDP                 │
│  - Controls enabled tabs            │
└─────────────────────────────────────┘
```

## Connection Flow

1. User installs Playwriter extension in Chrome
2. User clicks extension icon on a tab to enable control
3. Playwriter starts WebSocket server on `localhost:19988`
4. CLI connects via `playwright-core` CDP transport
5. CLI can now control enabled tabs

## Implementation

### Dependencies

```json
{
  "dependencies": {
    "playwright-core": "^1.40.0"
  }
}
```

### Connection Module

```typescript
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
    if (error.message.includes('ECONNREFUSED')) {
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
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PLAYWRITER_HOST` | `127.0.0.1` | Host where Playwriter is running |
| `PLAYWRITER_PORT` | `19988` | Port for WebSocket connection |

## Error Handling

### Connection Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| `ECONNREFUSED` | Playwriter not running | Install extension, click icon |
| `No pages available` | No tabs enabled | Click extension on a tab |
| `WebSocket timeout` | Extension crashed | Restart Chrome |

### Detection Code

```typescript
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
```

## Tab Management

### Listing Tabs

```typescript
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
```

### Current Page Info

```typescript
export async function getPageInfo(): Promise<{ url: string; title: string }> {
  const page = await getPage();
  return {
    url: page.url(),
    title: await page.title()
  };
}
```

## Reconnection

The connection may drop if:
- Chrome restarts
- Extension is disabled/re-enabled
- Network issues

Handle gracefully:

```typescript
export async function ensureConnection(): Promise<Browser> {
  if (browser && !browser.isConnected()) {
    browser = null;
  }
  return connect();
}
```

For CLI commands, reconnect on each invocation rather than maintaining persistent connection:

```typescript
// In CLI command handler
export async function runCommand(command: () => Promise<void>): Promise<void> {
  try {
    await connect();
    await command();
  } finally {
    await disconnect();
  }
}
```

## Security Considerations

1. **Localhost only**: Playwriter binds to `127.0.0.1`, not accessible remotely
2. **User consent**: User must explicitly click extension icon to enable control
3. **Visible automation**: Chrome shows "controlled by automation" banner
4. **Tab isolation**: Only tabs where user clicked extension are accessible
5. **No persistence**: Connection state not stored, credentials never accessed
