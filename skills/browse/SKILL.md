---
name: browse
description: Scrape any webpage to markdown using the user's authenticated browser session. Use when you need to fetch web content, extract data from websites, scrape pages requiring login, convert HTML to markdown, or get content from social media profiles like Twitter/X or LinkedIn.
allowed-tools: Bash(browse:*)
---

# Browse - Web Scraper

Scrape any webpage to markdown using the user's authenticated browser session.

## Installation

```bash
# macOS/Linux via Homebrew (recommended)
brew tap pepijnsenders/tap
brew install browse

# Or via npm
npm install -g @pep/browse-cli
```

After installing, load the Chrome extension:
1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the extension folder:
   - Homebrew: `/opt/homebrew/opt/browse/share/browse/extension`
   - npm: `~/.npm-global/lib/node_modules/@pep/browse-cli/extension`

## Prerequisites

Before using, ensure:
1. Daemon is running: `browse init`
2. Browse Chrome extension is installed and Chrome is open

## Quick Start

```bash
# Scrape any URL to markdown
browse https://example.com

# Scrape with JSON metadata
browse https://example.com --json
```

## Commands

### Scrape URL (default)

```bash
browse <url> [options]
```

**Options:**
- `--json` - Output JSON with url/title/content
- `--html` - Output pruned HTML instead of markdown
- `--wait <ms>` - Wait time after page load (default: 2000)
- `--scroll <n>` - Number of scrolls for infinite scroll pages (default: 0)

### Daemon Management

```bash
browse init    # Start background daemon
browse stop    # Stop daemon
```

## Examples

### Basic Scraping

```bash
# Twitter/X profile
browse https://x.com/elonmusk

# LinkedIn profile
browse https://linkedin.com/in/satyanadella

# Any webpage
browse https://news.ycombinator.com
```

### Dynamic Content

```bash
# Infinite scroll - load more content
browse https://x.com/elonmusk --scroll 5

# Slow pages - wait longer
browse https://example.com/slow --wait 10000
```

### Programmatic Output

```bash
# JSON output
browse https://example.com --json
# Returns: {"url": "...", "title": "...", "content": "...markdown..."}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `browse: command not found` | Install via `brew tap pepijnsenders/tap && brew install browse` |
| "Daemon not running" | Run `browse init` |
| "Extension not connected" | Check Chrome is open, extension shows "ON" badge |
| Empty output | Try `--wait 5000 --scroll 3` |
