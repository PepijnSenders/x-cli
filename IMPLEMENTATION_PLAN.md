# Session Scraper MCP - Implementation Plan

## Overview

MCP server for scraping "uncrawlable" sites using existing browser session via Playwriter extension.

**Repository:** `@pep/session-scraper-mcp`

**Specs:** See `specs/` directory for detailed specifications.

---

## Phase 1: Foundation (Priority: HIGH)

**Spec Reference:** [specs/01-overview.md](specs/01-overview.md)

### 1.1 Project Setup
- [x] Initialize project with `package.json`
- [x] Configure TypeScript
- [x] Setup Bun as runtime/bundler
- [x] Configure README.md with usage instructions
- [x] Create basic project structure:
  ```
  src/
  ├── index.ts              # MCP server entry point
  ├── browser.ts            # Browser connection management
  ├── tools/
  │   └── index.ts          # Tool definitions (MCP schema)
  └── scrapers/
      ├── twitter.ts        # Twitter/X extraction logic
      ├── linkedin.ts       # LinkedIn extraction logic
      └── generic.ts        # Generic page scraping
  ```

**Verify:** `ls src/` shows expected structure ✓

### 1.2 MCP Server Core
- [x] Setup MCP server using `@modelcontextprotocol/sdk`
- [x] Implement stdio transport
- [x] Add server info/capabilities
- [x] Basic error handling wrapper

**Verify:** `bun run src/index.ts` starts without error and outputs MCP protocol messages ✓

### 1.3 Browser Connection
- [x] Connect to Playwriter relay server via `playwright-core` CDP
- [x] Implement connection status checking
- [x] Handle reconnection on disconnect
- [x] Environment variable configuration (PLAYWRITER_HOST, PLAYWRITER_PORT)

**Verify:** With Playwriter extension active, server connects and `list_pages` returns available tabs

---

## Phase 2: Browser Tools (Priority: HIGH)

**Spec Reference:** [specs/02-mcp-tools.md](specs/02-mcp-tools.md) (Browser Tools section)

### 2.1 Navigation
- [x] `navigate` - Navigate to URL
  - Input: `{ url: string }`
  - Output: `{ success, url, title }`
  - Validate URL format
  - Handle timeouts

**Verify:** `navigate` to `https://example.com` returns `{ success: true, url: "https://example.com/", title: "Example Domain" }` ✓

### 2.2 Page Info
- [x] `get_page_info` - Get current page URL/title
  - Input: `{}`
  - Output: `{ url, title }`

- [x] `list_pages` - List all controlled tabs
  - Input: `{}`
  - Output: `{ pages: [{ index, url, title }] }`

- [x] `switch_page` - Switch to different tab
  - Input: `{ index: number }`
  - Output: `{ success, url, title }`

**Verify:** Open 2 tabs with Playwriter, `list_pages` returns 2 entries, `switch_page` changes active tab ✓

### 2.3 Screenshot
- [x] `take_screenshot` - Capture page screenshot
  - Input: `{ fullPage?: boolean }`
  - Output: Base64 PNG image content block
  - Handle viewport vs full page

**Verify:** `take_screenshot` returns valid base64 PNG that decodes to an image ✓

---

## Phase 3: Generic Scraping (Priority: HIGH)

**Spec Reference:** [specs/05-generic-scraper.md](specs/05-generic-scraper.md)

### 3.1 Page Scraping
- [x] `scrape_page` - Extract text/links/images from page
  - Input: `{ selector?: string }`
  - Output: `{ url, title, text, links, images }`
  - Default: scrape main content
  - With selector: scope to element
  - Implement content cleaning/normalization
  - Limit output sizes (100 links, 50 images, 100k chars)

**Verify:** On `https://news.ycombinator.com`, `scrape_page` returns text containing "Hacker News" and links array with entries ✓

### 3.2 Custom Scripts
- [x] `execute_script` - Run custom JavaScript
  - Input: `{ script: string }`
  - Output: Script return value (JSON-serializable)
  - Wrap in async IIFE for await support
  - Size limit on output (1MB)

**Verify:** `execute_script` with `return document.title` returns page title string ✓

---

## Phase 4: Twitter Scraper (Priority: MEDIUM)

**Spec Reference:** [specs/03-twitter-scraper.md](specs/03-twitter-scraper.md)

### 4.1 Profile Scraping
- [x] `scrape_twitter_profile` - Get user profile info
  - Input: `{ username: string }`
  - Output: Profile object (see specs/03-twitter-scraper.md)
  - Navigate to `https://x.com/{username}`
  - Handle: user not found, suspended, private
  - Parse follower counts (K, M suffixes)

**Verify:** `scrape_twitter_profile` for `elonmusk` returns object with `username`, `displayName`, `followersCount` > 0

### 4.2 Timeline Scraping
- [x] `scrape_twitter_timeline` - Get tweets from timeline
  - Input: `{ username?: string, count?: number }`
  - Output: `{ tweets: [...], hasMore }`
  - User timeline if username provided, else home
  - Implement infinite scroll pagination
  - Detect tweet types (original, retweet, reply)
  - Extract metrics (likes, retweets, replies, views)

**Verify:** `scrape_twitter_timeline` with `count: 5` returns exactly 5 tweets with `id`, `text`, `metrics`

### 4.3 Post Scraping
- [x] `scrape_twitter_post` - Get single tweet + thread
  - Input: `{ url: string }`
  - Output: `{ tweet, thread, replies }`
  - Extract thread context if reply
  - Get top replies

**Verify:** `scrape_twitter_post` with valid tweet URL returns `tweet` object with `text` and `metrics`

### 4.4 Search
- [x] `scrape_twitter_search` - Search tweets
  - Input: `{ query: string, count?: number }`
  - Output: Same as timeline
  - Click "Latest" tab for chronological
  - Support search operators

**Verify:** `scrape_twitter_search` for `"AI"` returns tweets array with matching content

---

## Phase 5: LinkedIn Scraper (Priority: MEDIUM)

**Spec Reference:** [specs/04-linkedin-scraper.md](specs/04-linkedin-scraper.md)

### 5.1 Profile Scraping
- [x] `scrape_linkedin_profile` - Get profile info
  - Input: `{ url: string }`
  - Output: Profile object (see specs/04-linkedin-scraper.md)
  - Handle lazy-loaded sections
  - Click "Show all" for experience/education
  - Human-like delays between actions

**Verify:** `scrape_linkedin_profile` returns object with `name`, `headline`, `experience` array

### 5.2 Posts Scraping
- [x] `scrape_linkedin_posts` - Get user's posts
  - Input: `{ url: string, count?: number }`
  - Output: `{ posts: [...] }`
  - Navigate to `/recent-activity/all/`
  - Handle "see more" expansion

**Verify:** `scrape_linkedin_posts` returns posts array with `text`, `metrics` for each

### 5.3 Search
- [x] `scrape_linkedin_search` - Search people/companies/posts
  - Input: `{ query: string, type?: 'people'|'companies'|'posts', count?: number }`
  - Output: Search results
  - Handle pagination

**Verify:** `scrape_linkedin_search` with `type: "people"` returns results with `name`, `headline`, `profileUrl`

---

## Phase 6: Error Handling & Polish (Priority: MEDIUM)

**Spec Reference:** [specs/01-overview.md](specs/01-overview.md) (Error Handling Strategy section)

### 6.1 Error Handling
- [x] Consistent error response format
- [x] "Extension not connected" detection
- [x] "No pages available" detection
- [x] Rate limit detection (Twitter, LinkedIn)
- [x] Login wall detection
- [x] Element not found graceful handling

**Verify:** All errors return `{ content: [{ type: "text", text: "Error: ..." }], isError: true }`

### 6.2 Rate Limiting
- [x] Add configurable delays between requests
- [x] Respect platform-specific limits
- [x] Exponential backoff on rate limit

**Verify:** Rapid requests to Twitter show delay between actions; rate limit triggers backoff

### 6.3 Logging
- [x] Debug logging for development
- [x] Error logging to stderr
- [x] Configurable log level

**Verify:** `DEBUG=session-scraper:* bun run src/index.ts` shows verbose logs to stderr

---

## Phase 7: Testing (Priority: MEDIUM)

### 7.1 Unit Tests
- [x] Number parsing utilities (parseTwitterNumber, etc.)
- [x] URL validation
- [x] Content cleaning/normalization
- [x] Error handling

**Verify:** `bun test` passes with >80% coverage on utility functions

### 7.2 Integration Tests
- [x] MCP server starts correctly
- [x] Tools are registered
- [x] Error responses are well-formed

**Verify:** `bun test:integration` passes (mock Playwriter connection)

### 7.3 Manual Testing
- [ ] Test with Claude Code
- [ ] Verify all tools work with live sites
- [ ] Document any selector changes needed

**Verify:** All tools work in Claude Code with Playwriter extension enabled

---

## Phase 8: Documentation (Priority: LOW)

**Spec Reference:** [specs/06-documentation.md](specs/06-documentation.md)

### 8.1 User Documentation
- [x] Getting started guide
- [x] Tool reference (all parameters, examples)
- [x] Troubleshooting guide
- [x] FAQ

**Verify:** `docs/` directory contains all guides; README links to docs

### 8.2 Developer Documentation
- [ ] Architecture overview
- [ ] Adding new scrapers guide
- [ ] Selector maintenance guide

**Verify:** New contributor can add a scraper following the guide

---

## Phase 9: Publishing (Priority: LOW)

**Spec Reference:** [specs/07-publishing.md](specs/07-publishing.md)

### 9.1 npm Publishing
- [ ] Setup npm publish workflow
- [ ] Ensure shebang in built output
- [ ] Test `npx @pep/session-scraper-mcp`

**Verify:** `npx @pep/session-scraper-mcp` starts MCP server without error

### 9.2 Plugin Marketplace
- [ ] Create plugin repository with manifest
- [ ] Create marketplace repository
- [ ] Write skill instructions
- [ ] Test `/plugin install`

**Verify:** `/plugin install session-scraper` works in Claude Code

### 9.3 CI/CD
- [ ] CI workflow (test, typecheck, build)
- [ ] Publish workflow on release
- [ ] Version management

**Verify:** GitHub Actions pass on PR; release publishes to npm automatically

---

## Implementation Status Summary

| Phase | Status |
|-------|--------|
| 1. Foundation | Complete |
| 2. Browser Tools | Complete |
| 3. Generic Scraping | Complete |
| 4. Twitter Scraper | Complete |
| 5. LinkedIn Scraper | Complete |
| 6. Error Handling | Complete |
| 7. Testing | Complete |
| 8. Documentation | Complete |
| 9. Publishing | Not Started |
| 10. Additional Scrapers | Not Started |
| 11. Advanced Features | Not Started |

---

## Implementation Notes

### Dependencies
- `@modelcontextprotocol/sdk` - MCP server framework
- `playwriter` - CDP relay connection
- `playwright-core` - Browser automation API
- `zod` - Schema validation

### Key Architecture Decisions
1. Use Playwriter extension for browser access (avoids headless detection)
2. All scraping is DOM-based (no API interception)
3. Selectors use data-testid attributes where possible for stability
4. Human-like delays to avoid rate limits

### Selector Stability Notes
- Twitter: Uses `data-testid` attributes, relatively stable
- LinkedIn: Uses BEM classes, more stable but still changes
- Both may need periodic updates as sites evolve

---

## Phase 10: Additional Scrapers (Priority: MEDIUM)

### 10.1 Instagram Scraper
- [ ] `scrape_instagram_profile` - Get user profile info
- [ ] `scrape_instagram_posts` - Get user's posts
- [ ] `scrape_instagram_stories` - Get stories (if accessible)

**Verify:** `scrape_instagram_profile` returns `username`, `displayName`, `followersCount`

### 10.2 Reddit Scraper
- [ ] `scrape_reddit_user` - Get user profile/posts
- [ ] `scrape_reddit_subreddit` - Get subreddit posts
- [ ] `scrape_reddit_post` - Get post + comments

**Verify:** `scrape_reddit_subreddit` for `r/programming` returns posts with `title`, `score`, `comments`

### 10.3 Facebook Scraper
- [ ] `scrape_facebook_profile` - Get user profile
- [ ] `scrape_facebook_posts` - Get user's posts
- [ ] `scrape_facebook_page` - Get page info/posts

**Verify:** `scrape_facebook_page` returns page `name`, `likes`, `posts` array

### 10.4 TikTok Scraper
- [ ] `scrape_tiktok_profile` - Get user profile
- [ ] `scrape_tiktok_videos` - Get user's videos

**Verify:** `scrape_tiktok_profile` returns `username`, `displayName`, `followers`, `videos` array

---

## Phase 11: Advanced Features (Priority: LOW)

### 11.1 Action Tools
- [ ] `twitter_post` - Post a tweet
- [ ] `twitter_like` - Like a tweet
- [ ] `twitter_follow` - Follow a user
- [ ] `linkedin_post` - Create a post
- [ ] `linkedin_connect` - Send connection request

**Verify:** `twitter_post` creates visible tweet; `twitter_like` shows liked state on tweet

### 11.2 Batch Operations
- [ ] `batch_scrape_profiles` - Scrape multiple profiles in one call
- [ ] `batch_scrape_posts` - Scrape posts from multiple users

**Verify:** `batch_scrape_profiles` with 5 usernames returns 5 profile objects

### 11.3 Utilities
- [ ] Result caching (avoid re-scraping recent data)
- [ ] Export formats (CSV, JSON file download)
- [ ] Proxy rotation support
- [ ] CAPTCHA detection and user notification

**Verify:** Repeated `scrape_twitter_profile` within 5 min returns cached result; CAPTCHA shows user notification
