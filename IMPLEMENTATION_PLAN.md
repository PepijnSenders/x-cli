# Session Scraper - Implementation Plan

## Overview

CLI tool + Claude Code skill for scraping social media and web pages using the user's authenticated browser session via Playwriter extension.

**Architecture**: CLI + Skill (zero MCP token overhead)

**Specs**: See `specs/` directory

---

## Phase 1: Project Setup

### 1.1 Initialize Project
- [x] Create `src/` directory structure
- [x] Configure `package.json` with bin entry
- [x] Configure TypeScript
- [x] Setup Bun as runtime/bundler
- [x] Add dependencies: `playwright-core`, `commander`

**Verify**: `bun run build` produces `dist/index.js` ✓

### 1.2 CLI Framework
- [x] Setup Commander.js with subcommands
- [x] Implement global options (`--format`, `--quiet`, `--timeout`)
- [x] Add help text and version
- [x] Implement exit codes

**Verify**: `session-scraper --help` shows all commands ✓

---

## Phase 2: Browser Connection

**Spec**: [specs/05-browser-connection.md](specs/05-browser-connection.md)

### 2.1 Playwriter Integration
- [ ] Implement `connect()` via CDP WebSocket
- [ ] Implement `getPage()` / `getPages()`
- [ ] Implement `switchPage()`
- [ ] Handle connection errors with helpful messages

**Verify**: With Playwriter active, `session-scraper browser list` returns tabs

### 2.2 Browser Commands
- [ ] `browser navigate <url>`
- [ ] `browser info`
- [ ] `browser list`
- [ ] `browser switch <index>`
- [ ] `browser screenshot`

**Verify**: All browser commands work with live Chrome

---

## Phase 3: Generic Scraping

**Spec**: [specs/04-scrapers.md](specs/04-scrapers.md) (Generic section)

### 3.1 Page Commands
- [ ] `page scrape` - Extract text, links, images
- [ ] `page scrape --selector` - Scoped extraction
- [ ] `page script` - Execute JavaScript

**Verify**: `session-scraper page scrape` on any page returns structured JSON

---

## Phase 4: Twitter Scraper

**Spec**: [specs/04-scrapers.md](specs/04-scrapers.md) (Twitter section)

### 4.1 Profile
- [ ] `twitter profile <username>`
- [ ] Handle: not found, suspended, private

**Verify**: `session-scraper twitter profile elonmusk` returns profile JSON

### 4.2 Timeline
- [ ] `twitter timeline <username>`
- [ ] `twitter timeline` (home feed)
- [ ] `--count` option
- [ ] Infinite scroll pagination

**Verify**: `session-scraper twitter timeline elonmusk --count 10` returns 10 tweets

### 4.3 Post
- [ ] `twitter post <url>`
- [ ] Extract thread context
- [ ] Extract replies

**Verify**: `session-scraper twitter post <url>` returns tweet with context

### 4.4 Search
- [ ] `twitter search <query>`
- [ ] `--count` option
- [ ] Support search operators

**Verify**: `session-scraper twitter search "AI"` returns results

---

## Phase 5: LinkedIn Scraper

**Spec**: [specs/04-scrapers.md](specs/04-scrapers.md) (LinkedIn section)

### 5.1 Profile
- [ ] `linkedin profile <url>`
- [ ] Extract experience, education, skills
- [ ] Handle "see more" expansion
- [ ] Human-like delays

**Verify**: `session-scraper linkedin profile <url>` returns profile JSON

### 5.2 Posts
- [ ] `linkedin posts <url>`
- [ ] `--count` option

**Verify**: `session-scraper linkedin posts <url>` returns posts

### 5.3 Search
- [ ] `linkedin search <query>`
- [ ] `--type` option (people, posts, companies)
- [ ] `--count` option

**Verify**: `session-scraper linkedin search "engineer"` returns results

---

## Phase 6: Error Handling

### 6.1 Error Detection
- [ ] Connection errors (Playwriter not running)
- [ ] No pages available
- [ ] Navigation timeout
- [ ] Rate limiting detection
- [ ] Login required detection
- [ ] Profile not found

### 6.2 Error Output
- [ ] JSON error format to stderr
- [ ] Exit codes per error type
- [ ] Helpful recovery hints

**Verify**: All errors return proper exit code and JSON error message

---

## Phase 7: Skill Definition

**Spec**: [specs/03-skill-definition.md](specs/03-skill-definition.md)

### 7.1 Create Skill
- [ ] Write `skill/scrape.md`
- [ ] Document all CLI commands
- [ ] Add interpretation examples
- [ ] Add error handling guidance

**Verify**: Skill file is complete and accurate

### 7.2 Test with Claude Code
- [ ] Load skill locally
- [ ] Test `/scrape @elonmusk twitter`
- [ ] Test ambiguous requests
- [ ] Verify error handling

**Verify**: Claude correctly interprets and executes scrape requests

---

## Phase 8: Testing

### 8.1 Unit Tests
- [ ] Number parsing (K/M suffixes)
- [ ] URL validation
- [ ] Error detection
- [ ] Duration parsing

### 8.2 Integration Tests
- [ ] CLI command parsing
- [ ] Output format validation
- [ ] Exit code verification

**Verify**: `bun test` passes

---

## Phase 9: Publishing

**Spec**: [specs/06-publishing.md](specs/06-publishing.md)

### 9.1 npm Package
- [ ] Configure package.json bin entry
- [ ] Ensure shebang in output
- [ ] Setup npm publish workflow
- [ ] Test `npx @pep/session-scraper`

**Verify**: `npx @pep/session-scraper --help` works

### 9.2 Plugin Package
- [ ] Create `.claude-plugin/plugin.json`
- [ ] Include skill file
- [ ] Document prerequisites

**Verify**: Plugin loads in Claude Code

### 9.3 CI/CD
- [ ] GitHub Actions for tests
- [ ] Publish on release

**Verify**: PR triggers tests; release publishes to npm

---

## Implementation Status

| Phase | Status |
|-------|--------|
| 1. Project Setup | ✓ Completed |
| 2. Browser Connection | Not Started |
| 3. Generic Scraping | Not Started |
| 4. Twitter Scraper | Not Started |
| 5. LinkedIn Scraper | Not Started |
| 6. Error Handling | Not Started |
| 7. Skill Definition | Not Started |
| 8. Testing | Not Started |
| 9. Publishing | Not Started |

---

## Project Structure

```
session-scraper/
├── src/
│   ├── cli.ts              # CLI entry point (Commander.js)
│   ├── browser.ts          # Playwriter connection
│   ├── commands/
│   │   ├── twitter.ts      # Twitter subcommands
│   │   ├── linkedin.ts     # LinkedIn subcommands
│   │   ├── browser.ts      # Browser subcommands
│   │   └── page.ts         # Page subcommands
│   ├── scrapers/
│   │   ├── twitter.ts      # Twitter extraction logic
│   │   ├── linkedin.ts     # LinkedIn extraction logic
│   │   └── generic.ts      # Generic page extraction
│   ├── utils/
│   │   ├── parse.ts        # Number/duration parsing
│   │   └── errors.ts       # Error handling
│   └── types.ts            # TypeScript interfaces
├── skill/
│   └── scrape.md           # Claude Code skill
├── specs/                  # Specifications
├── tests/                  # Test files
├── dist/                   # Build output
├── package.json
├── tsconfig.json
└── README.md
```

---

## Dependencies

```json
{
  "dependencies": {
    "playwright-core": "^1.40.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "bun-types": "latest"
  }
}
```
