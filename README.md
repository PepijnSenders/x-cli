# browse

**Scrape any webpage to markdown using your browser session**

[![npm version](https://img.shields.io/npm/v/@pep/browse-cli.svg)](https://www.npmjs.com/package/@pep/browse-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Traditional web scrapers get blocked by Cloudflare, CAPTCHAs, and bot detection. **browse** sidesteps all of that by using your actual Chrome browser - the same session where you're already logged in and verified as human.

<p align="center">
  <img src="assets/demo.gif" alt="browse-cli demo" width="600">
</p>

## How It Works

```
Chrome Browser (with your logins)
        │
        ▼
  Browse Extension ←──→ WebSocket Daemon (port 9222)
        │                      │
        ▼                      ▼
   Page Content           browse CLI
        │                      │
        └──────────────────────┘
                  │
                  ▼
            Markdown Output
```

The Browse extension connects your authenticated browser sessions to the CLI via a local WebSocket daemon. This lets you scrape any page you can see in your browser - including sites that require login.

## Installation

### Homebrew (recommended)

```bash
brew tap pepijnsenders/tap
brew install browse
```

### npm

```bash
npm install -g @pep/browse-cli
```

### From source

```bash
git clone https://github.com/PepijnSenders/browse-cli
cd browse-cli
bun install
bun run build
npm link
```

## Quick Start

### 1. Install the Chrome Extension

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder from this package

To find the extension folder after npm install:
```bash
npm root -g  # Shows global node_modules path
# Extension is at: <path>/browse-cli/extension
```

### 2. Start the Daemon

```bash
browse init
```

### 3. Scrape Any Page

```bash
browse https://example.com
```

## Usage

```bash
# Basic usage - outputs markdown
browse <url>

# Output JSON with metadata (url, title, content)
browse <url> --json

# Output pruned HTML instead of markdown
browse <url> --html

# Wait longer for dynamic content (default: 2000ms)
browse <url> --wait 5000

# Scroll for infinite-scroll pages
browse <url> --scroll 3
```

## Commands

| Command | Description |
|---------|-------------|
| `browse <url>` | Scrape URL and output markdown |
| `browse init` | Start the WebSocket daemon |
| `browse stop` | Stop the daemon |
| `browse --help` | Show help |
| `browse --version` | Show version |

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--json` | Output JSON with url, title, and content | - |
| `--html` | Output pruned HTML instead of markdown | - |
| `--wait <ms>` | Wait time after page load | 2000 |
| `--scroll <n>` | Number of scroll iterations | 0 |

## Examples

### News Articles

```bash
browse https://techcrunch.com/2024/01/15/some-article
```

### Social Media (requires login in browser)

```bash
# Twitter/X
browse https://x.com/elonmusk

# LinkedIn
browse https://linkedin.com/in/satyanadella
```

### Infinite Scroll Pages

```bash
# Scroll 5 times to load more content
browse https://news.ycombinator.com --scroll 5
```

### Get Structured Output

```bash
# JSON with metadata
browse https://example.com --json | jq .

# Output:
# {
#   "url": "https://example.com",
#   "title": "Example Domain",
#   "content": "# Example Domain\n\nThis domain is for..."
# }
```

## Claude Code Integration

This package includes a Claude Code skill for natural language web scraping.

### Install the Plugin

```bash
# In Claude Code, run:
/plugin marketplace add PepijnSenders/browse-cli
/plugin install browse@PepijnSenders-browse-cli
```

### Usage

Once installed, Claude can scrape pages naturally:

```
You: Get the content from https://news.ycombinator.com
Claude: [runs: browse https://news.ycombinator.com]

You: Scrape this Twitter profile and scroll to get more tweets
Claude: [runs: browse https://x.com/openai --scroll 3]
```

## Troubleshooting

### "Connection refused" or "Daemon not running"

Start the daemon:
```bash
browse init
```

### "Extension not connected"

1. Make sure the Browse extension is installed in Chrome
2. Check that the extension icon shows "Connected" when clicked
3. Refresh the page you want to scrape

### "No content returned"

Some pages load content dynamically. Try:
```bash
browse <url> --wait 5000  # Wait longer
browse <url> --scroll 2   # Scroll to trigger lazy loading
```

### "Login required"

Log into the website in your Chrome browser first. The CLI uses your existing browser session.

### Extension not finding the daemon

Make sure port 9222 is available:
```bash
lsof -i :9222  # Check if something else is using the port
browse stop    # Stop any existing daemon
browse init    # Start fresh
```

## Why Not Just Use Puppeteer/Playwright?

Traditional headless browsers and scrapers fail on modern websites because:

- **Cloudflare/Akamai** detect and block headless browsers
- **CAPTCHAs** stop automated requests
- **Login walls** require maintaining complex session management
- **Fingerprinting** identifies non-human browser signatures

**browse** bypasses all of this because it's not pretending to be a browser - it IS your browser, with your cookies, your login sessions, and your human verification already done.

| Feature | browse | Puppeteer/Playwright | curl/wget |
|---------|--------|---------------------|-----------|
| Bypasses Cloudflare | **Yes** | Rarely | No |
| Bypasses CAPTCHAs | **Yes** | No | No |
| Uses existing logins | **Yes** | No | No |
| JavaScript rendering | Yes | Yes | No |
| Blocked by rate limits | Rarely | Often | Often |

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Type check
bun run typecheck

# Run tests
bun test

# Build for distribution
bun run build

# Lint
bun run lint
```

## Architecture

- **`src/cli.ts`** - Commander.js CLI interface
- **`src/daemon.ts`** - WebSocket relay server
- **`src/scrape.ts`** - Core scraping logic
- **`src/utils/html-parser.ts`** - Turndown-based HTML to markdown conversion
- **`extension/`** - Chrome extension (Manifest V3)

## Requirements

- Node.js >= 18.0.0
- Chrome browser
- Browse extension installed

## License

MIT
