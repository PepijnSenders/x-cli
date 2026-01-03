# CLI Interface

## Installation

```bash
npm install -g @pep/session-scraper
```

Or run directly:

```bash
npx @pep/session-scraper <command>
```

## Global Options

```
--format <json|text>    Output format (default: json)
--quiet                 Suppress status messages
--timeout <ms>          Navigation timeout (default: 30000)
--help                  Show help
--version               Show version
```

## Commands

### Twitter

```bash
session-scraper twitter <command> [options]
```

#### `twitter profile <username>`

Get user profile information.

```bash
session-scraper twitter profile elonmusk
```

Output:
```json
{
  "username": "elonmusk",
  "displayName": "Elon Musk",
  "bio": "...",
  "location": "...",
  "website": "...",
  "joinDate": "2009-06-01",
  "followersCount": 150000000,
  "followingCount": 500,
  "postsCount": 30000,
  "verified": true,
  "profileImageUrl": "https://..."
}
```

#### `twitter timeline [username]`

Get tweets from timeline. Omit username for home timeline.

```bash
session-scraper twitter timeline elonmusk --count 20
```

Options:
- `--count <n>` - Number of tweets (default: 20, max: 100)

Output:
```json
{
  "tweets": [
    {
      "id": "1234567890",
      "text": "...",
      "author": { "username": "elonmusk", "displayName": "Elon Musk" },
      "createdAt": "2024-01-15T10:30:00Z",
      "metrics": { "replies": 1000, "retweets": 5000, "likes": 50000, "views": 1000000 },
      "type": "original",
      "media": []
    }
  ],
  "hasMore": true
}
```

#### `twitter post <url>`

Get a single tweet with thread context and replies.

```bash
session-scraper twitter post "https://x.com/elonmusk/status/123456"
```

Output:
```json
{
  "tweet": { ... },
  "thread": [ ... ],
  "replies": [ ... ]
}
```

#### `twitter search <query>`

Search tweets.

```bash
session-scraper twitter search "AI agents" --count 20
```

Options:
- `--count <n>` - Number of results (default: 20, max: 100)

Supports Twitter search operators:
- `from:username` - Tweets from user
- `to:username` - Replies to user
- `filter:media` - Only with media
- `since:2024-01-01` - After date
- `until:2024-12-31` - Before date
- `min_retweets:100` - Minimum retweets

---

### LinkedIn

```bash
session-scraper linkedin <command> [options]
```

#### `linkedin profile <url>`

Get profile information.

```bash
session-scraper linkedin profile "https://linkedin.com/in/satyanadella"
```

Output:
```json
{
  "name": "Satya Nadella",
  "headline": "Chairman and CEO at Microsoft",
  "location": "Seattle, Washington",
  "about": "...",
  "connectionDegree": "3rd",
  "experience": [
    {
      "title": "Chairman and CEO",
      "company": "Microsoft",
      "duration": "10 yrs 2 mos",
      "location": "Redmond, WA"
    }
  ],
  "education": [ ... ],
  "skills": [ ... ]
}
```

#### `linkedin posts <url>`

Get posts from a profile.

```bash
session-scraper linkedin posts "https://linkedin.com/in/satyanadella" --count 10
```

Options:
- `--count <n>` - Number of posts (default: 10, max: 50)

#### `linkedin search <query>`

Search LinkedIn.

```bash
session-scraper linkedin search "AI engineer" --type people --count 10
```

Options:
- `--type <people|posts|companies>` - Search type (default: people)
- `--count <n>` - Number of results (default: 10, max: 50)

---

### Generic Browser

```bash
session-scraper browser <command> [options]
```

#### `browser navigate <url>`

Navigate to a URL.

```bash
session-scraper browser navigate "https://example.com"
```

Output:
```json
{
  "success": true,
  "url": "https://example.com/",
  "title": "Example Domain"
}
```

#### `browser screenshot`

Take a screenshot.

```bash
session-scraper browser screenshot --output screenshot.png
session-scraper browser screenshot --full-page --output full.png
```

Options:
- `--output <file>` - Save to file (default: stdout as base64)
- `--full-page` - Capture full page, not just viewport

#### `browser info`

Get current page info.

```bash
session-scraper browser info
```

Output:
```json
{
  "url": "https://example.com/",
  "title": "Example Domain"
}
```

#### `browser list`

List controlled tabs.

```bash
session-scraper browser list
```

Output:
```json
{
  "pages": [
    { "index": 0, "url": "https://x.com", "title": "X" },
    { "index": 1, "url": "https://linkedin.com", "title": "LinkedIn" }
  ],
  "current": 0
}
```

#### `browser switch <index>`

Switch to a different tab.

```bash
session-scraper browser switch 1
```

---

### Generic Page

```bash
session-scraper page <command> [options]
```

#### `page scrape`

Extract content from current page.

```bash
session-scraper page scrape
session-scraper page scrape --selector "article.main"
```

Options:
- `--selector <css>` - Scope to element

Output:
```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "text": "...",
  "links": [
    { "text": "More info", "href": "https://..." }
  ],
  "images": [
    { "alt": "Logo", "src": "https://..." }
  ]
}
```

#### `page script <code>`

Execute JavaScript on the page.

```bash
session-scraper page script "return document.title"
session-scraper page script "return Array.from(document.querySelectorAll('h2')).map(h => h.textContent)"
```

Output: JSON-serializable return value from script.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Connection error (Playwriter not running) |
| 3 | No pages available |
| 4 | Navigation timeout |
| 5 | Element not found |
| 6 | Rate limited |
| 7 | Login required |
| 8 | Profile/page not found |

## Error Output

Errors are written to stderr in JSON format:

```json
{
  "error": "Extension not connected",
  "code": 2,
  "hint": "Make sure Chrome has the Playwriter extension installed and enabled."
}
```

## Examples

```bash
# Get Elon's profile
session-scraper twitter profile elonmusk

# Get latest 50 tweets
session-scraper twitter timeline elonmusk --count 50

# Search for AI discussions
session-scraper twitter search "from:anthroploic AI" --count 20

# Get LinkedIn profile
session-scraper linkedin profile "https://linkedin.com/in/someone"

# Scrape any page
session-scraper browser navigate "https://news.ycombinator.com"
session-scraper page scrape

# Run custom extraction
session-scraper page script "return [...document.querySelectorAll('.titleline a')].map(a => ({title: a.textContent, url: a.href}))"
```
