# Session Scraper MCP

**MCP server for scraping "uncrawlable" sites using your existing browser session**

Scrape Twitter, LinkedIn, and other sites that block traditional scrapers - using your own logged-in browser session.

## How It Works

```
Your Chrome Browser (logged into Twitter, LinkedIn, etc.)
         │
         ▼
   Playwriter Extension (enables tab control)
         │
         ▼
   Session Scraper MCP (this project)
         │
         ▼
   Claude Code / AI Agent
```

No API keys. No rate limits. No bot detection. Just your normal browser session.

## Features

- **Twitter/X** - Profiles, timelines, posts, search
- **LinkedIn** - Profiles, posts, people search
- **Any site** - Generic scraping, screenshots, custom scripts
- **Your session** - Uses your existing logins, no credentials needed

## Installation

### 1. Install Playwriter Extension

[Install from Chrome Web Store](https://chromewebstore.google.com/detail/playwriter-mcp/jfeammnjpkecdekppnclgkkffahnhfhe)

### 2. Add to MCP Client

Add to your Claude Code or MCP client config:

```json
{
  "mcpServers": {
    "session-scraper": {
      "command": "npx",
      "args": ["@pep/session-scraper-mcp"]
    }
  }
}
```

### 3. Enable on Tabs

Click the Playwriter extension icon on tabs you want to control (icon turns green).

## Tools

### Twitter/X

| Tool | Description |
|------|-------------|
| `scrape_twitter_profile` | Get user profile info |
| `scrape_twitter_timeline` | Get tweets from user/home |
| `scrape_twitter_post` | Get single tweet + thread |
| `scrape_twitter_search` | Search tweets |

### LinkedIn

| Tool | Description |
|------|-------------|
| `scrape_linkedin_profile` | Get profile info |
| `scrape_linkedin_posts` | Get user's posts |
| `scrape_linkedin_search` | Search people/companies |

### Browser

| Tool | Description |
|------|-------------|
| `navigate` | Go to URL |
| `take_screenshot` | Screenshot page |
| `get_page_info` | Get current URL/title |
| `list_pages` | List controlled tabs |
| `switch_page` | Switch active tab |

### Generic

| Tool | Description |
|------|-------------|
| `scrape_page` | Extract text/links/images |
| `execute_script` | Run custom JavaScript |

## Tool Reference

### Twitter Tools

#### `scrape_twitter_profile`
Get user profile information including bio, follower counts, and verification status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Twitter username (without @) |

**Example:**
```json
{ "username": "elonmusk" }
```

**Returns:** Profile object with `username`, `displayName`, `bio`, `followersCount`, `followingCount`, `verified`, etc.

#### `scrape_twitter_timeline`
Get tweets from a user's timeline or home feed with pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | No | Username to scrape (omit for home timeline) |
| `count` | number | No | Number of tweets (default: 20, max: 100) |

#### `scrape_twitter_post`
Get a single tweet with thread context and replies.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Full tweet URL (e.g., https://x.com/user/status/123) |

#### `scrape_twitter_search`
Search Twitter for tweets matching a query.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (supports Twitter operators) |
| `count` | number | No | Number of results (default: 20, max: 100) |

### LinkedIn Tools

#### `scrape_linkedin_profile`
Get profile information including experience, education, and skills.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Full LinkedIn profile URL |

#### `scrape_linkedin_posts`
Get posts from a LinkedIn user's activity feed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | LinkedIn profile URL |
| `count` | number | No | Number of posts (default: 10, max: 50) |

#### `scrape_linkedin_search`
Search LinkedIn for people, companies, or posts.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `type` | string | No | "people", "companies", or "posts" (default: "people") |
| `count` | number | No | Number of results (default: 10, max: 50) |

### Browser Tools

#### `navigate`
Navigate the active tab to a URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | URL to navigate to |

#### `take_screenshot`
Capture a screenshot of the current page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fullPage` | boolean | No | Capture full page (default: false) |

#### `scrape_page`
Extract text content, links, and images from the current page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `selector` | string | No | CSS selector to scope extraction |

#### `execute_script`
Run custom JavaScript on the page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `script` | string | Yes | JavaScript code to execute |

## Troubleshooting

### "Extension not connected"
1. Make sure Chrome has the Playwriter extension installed
2. Click the extension icon on a tab (icon turns green)
3. The extension relay server should be running

### "No pages available"
Click the Playwriter extension icon on a Chrome tab to enable control.

### "Rate limit detected"
Wait a few minutes before making more requests. The scraper includes automatic delays, but rapid consecutive requests may trigger platform rate limits.

### "Login required"
Log into the website (Twitter, LinkedIn, etc.) in your browser first. The scraper uses your existing session.

### "Profile not found"
Check that the username or URL is correct. The account may have been deleted or suspended.

### Debug Mode
Enable verbose logging with:
```bash
DEBUG=session-scraper:* npx @pep/session-scraper-mcp
```

## Example Usage

```
You: Scrape Elon Musk's Twitter profile

Claude: [Uses scrape_twitter_profile with username "elonmusk"]

Result:
{
  "username": "elonmusk",
  "displayName": "Elon Musk",
  "bio": "Mars & Cars, Chips & Dips",
  "followersCount": 170500000,
  "followingCount": 512,
  ...
}
```

## Requirements

- Chrome browser
- [Playwriter extension](https://chromewebstore.google.com/detail/playwriter-mcp/jfeammnjpkecdekppnclgkkffahnhfhe)
- Logged into the sites you want to scrape

## Specs

See `/specs` for detailed specifications:

- [Overview & Architecture](specs/01-overview.md)
- [MCP Tools](specs/02-mcp-tools.md)
- [Twitter Scraper](specs/03-twitter-scraper.md)
- [LinkedIn Scraper](specs/04-linkedin-scraper.md)
- [Generic Scraper](specs/05-generic-scraper.md)

## Development

```bash
bun install
bun run dev
```

## License

MIT
