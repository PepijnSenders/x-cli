# Session Scraper - Overview

## Problem

Social media platforms and authenticated websites are effectively "uncrawlable":

- **Official APIs**: Expensive ($100-5000/month), rate-limited, incomplete data
- **Headless browsers**: Detected and blocked (Cloudflare, bot detection)
- **Proxy services**: Expensive, unreliable, often blocked

Users already have legitimate access to these sites through their browser. They're logged in, pass bot detection, and see full content. But there's no way to programmatically extract that data.

## Solution

**Session Scraper** leverages the user's existing authenticated browser session via the [Playwriter](https://github.com/anthropics/playwriter) Chrome extension.

Session Scraper provides:

1. **CLI Tool** (`session-scraper`) - Command-line interface for scraping
2. **Skill** (`/scrape`) - Natural language interface for Claude Code

```
┌─────────────────────────────────────┐
│  User: "/scrape @elonmusk twitter"  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Skill interprets intent            │
│  Claude runs CLI via Bash           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  $ session-scraper twitter profile  │
│      --username elonmusk            │
└──────────────┬──────────────────────┘
               │ CDP (localhost:19988)
               ▼
┌─────────────────────────────────────┐
│  Playwriter Chrome Extension        │
│  (user's authenticated browser)     │
└─────────────────────────────────────┘
```

## Supported Platforms

| Platform | Commands |
|----------|----------|
| Twitter/X | `profile`, `timeline`, `post`, `search` |
| LinkedIn | `profile`, `posts`, `search` |
| Generic | `navigate`, `screenshot`, `scrape`, `script` |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Claude Code    │────▶│  /scrape skill   │
└─────────────────┘     └────────┬─────────┘
                                 │ interprets
                                 ▼
┌─────────────────┐     ┌──────────────────┐
│  Terminal/Bash  │────▶│  session-scraper │
└─────────────────┘     │  CLI             │
                        └────────┬─────────┘
                                 │ playwright-core
                                 │ CDP WebSocket
                                 ▼
┌─────────────────┐     ┌──────────────────┐
│  Chrome Browser │◀───▶│  Playwriter Ext  │
│  (authenticated)│     │  (relay server)  │
└─────────────────┘     └──────────────────┘
```

## Security Model

1. **Local only**: All communication via `localhost:19988`
2. **User-controlled**: Only tabs where user clicked extension are accessible
3. **Visible**: Chrome shows "controlled by automation" banner
4. **No credentials**: Uses existing browser sessions, stores nothing
5. **Transparent**: Users see what's being accessed

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PLAYWRITER_HOST` | `127.0.0.1` | Relay server host |
| `PLAYWRITER_PORT` | `19988` | Relay server port |

## Quick Start

```bash
# 1. Install Playwriter extension in Chrome
# 2. Click extension icon on a tab to enable control

# 3. Install CLI
npm install -g @pep/session-scraper

# 4. Use directly
session-scraper twitter profile elonmusk

# 5. Or via skill in Claude Code
/scrape @elonmusk on twitter
```

## Project Structure

```
session-scraper/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── browser.ts          # Playwriter connection
│   ├── commands/
│   │   ├── twitter.ts      # Twitter commands
│   │   ├── linkedin.ts     # LinkedIn commands
│   │   └── generic.ts      # Browser/page commands
│   └── scrapers/
│       ├── twitter.ts      # Twitter extraction logic
│       ├── linkedin.ts     # LinkedIn extraction logic
│       └── generic.ts      # Generic page extraction
├── skill/
│   └── scrape.md           # Skill definition
├── specs/                  # This documentation
├── package.json
└── tsconfig.json
```
