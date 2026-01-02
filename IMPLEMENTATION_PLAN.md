# X-CLI Implementation Plan

## Status: P1 Complete | P2 Complete | P3 Complete | P4 Complete | P5 Complete | P6 Pending | P7 Pending | P8 Pending

This document tracks the implementation of x-cli based on the spec phases.

---

## Phase 1: Foundation (specs/01-foundation.md)

### Setup
- [x] Project initialization with Bun + pnpm
- [x] TypeScript configuration (strict mode)
- [x] Directory structure (src/cli, src/api, src/types, src/output, src/config)
- [x] Dependencies installed (commander, chalk, ora, cli-table3, arctic, zod)

### Types & Validation
- [x] User schema (UserSchema) with public_metrics
- [x] Tweet schema (TweetSchema) with entities, metrics
- [x] Media schema (MediaSchema)
- [x] List schema (ListSchema)
- [x] Space schema (SpaceSchema) - types only
- [x] DM schemas (DMEventSchema, DMConversationSchema) - types only
- [x] Poll schema (PollSchema)
- [x] Place schema (PlaceSchema)
- [x] Response wrappers with pagination (PaginatedResponse)
- [x] Error classes (XCLIError, AuthError, RateLimitError, APIError, ValidationError, ConfigError, NotFoundError)

### Authentication
- [x] OAuth 2.0 PKCE flow using Arctic Twitter provider
- [x] Token storage with AES-256-GCM encryption
- [x] Machine-specific key derivation
- [x] `x auth login` - opens browser, completes OAuth
- [x] `x auth logout` - clears stored tokens
- [x] `x auth status` - shows current user info
- [x] `x auth refresh` - force token refresh

### HTTP Client
- [x] Base URL configuration (api.twitter.com/2)
- [x] Auto-attach Bearer token
- [x] Rate limit header parsing (x-rate-limit-*)
- [x] Auto-retry on 429 with exponential backoff
- [x] Auto-retry on 5xx (max 3 attempts)
- [x] Timeout configuration (30s default)
- [x] Zod response validation

### Output Formatters
- [x] JSON formatter (minimal, single line)
- [x] Pretty formatter with chalk colors
- [x] Relative timestamps ("2h ago")
- [x] Number formatting (1.5K, 2.3M)
- [x] Spinner support with ora
- [x] Table support with cli-table3

### Global Options
- [x] `--json` / `-j` flag
- [x] `--quiet` / `-q` flag
- [x] `--verbose` / `-v` flag
- [x] `--no-color` flag

---

## Phase 2: Posts (specs/02-posts.md)

### Post CRUD
- [x] `x post create <text>` - create new post
- [x] `x post get <id>` - get post by ID
- [x] `x post delete <id>` - delete post
- [x] `x post reply <id> <text>` - reply to post
- [x] `x post quote <id> <text>` - quote post
- [ ] `x post create --media <file>` - post with media attachment

### Timelines
- [x] `x timeline home` - home timeline
- [x] `x timeline user <username>` - user's posts
- [x] `x timeline mentions` - mentions timeline
- [x] `--limit` pagination option
- [x] `--since-id` option

### Search
- [x] `x search <query>` - search posts
- [x] Advanced search operators (from:, #, etc.)
- [x] `--limit` option

### Engagement
- [x] `x like <id>` - like a post
- [x] `x unlike <id>` - unlike a post
- [x] `x repost <id>` - repost
- [x] `x unrepost <id>` - remove repost
- [x] `x bookmark add <id>` - bookmark post
- [x] `x bookmark list` - list bookmarks
- [x] `x bookmark remove <id>` - remove bookmark

---

## Phase 3: Users (specs/03-users.md)

### User Lookup
- [x] `x user <username>` - lookup by username
- [x] `x me` - current authenticated user
- [ ] `x user --id <id>` - lookup by ID
- [ ] `x user search <query>` - search users

### Following
- [x] `x follow <username>` - follow user
- [x] `x unfollow <username>` - unfollow user
- [x] `x following` - list your following
- [x] `x following <username>` - list user's following
- [x] `x followers` - list your followers
- [x] `x followers <username>` - list user's followers

### Block/Mute
- [x] `x block <username>` - block user
- [x] `x unblock <username>` - unblock user
- [x] `x blocks` - list blocked users
- [x] `x mute <username>` - mute user
- [x] `x unmute <username>` - unmute user
- [x] `x mutes` - list muted users

---

## Phase 4: Lists (specs/04-lists.md)

### List CRUD
- [x] `x list create <name>` - create list
- [x] `x list create --private` - create private list
- [x] `x list get <id>` - get list details
- [x] `x list update <id>` - update list
- [x] `x list delete <id>` - delete list

### List Content
- [x] `x list timeline <id>` - list timeline
- [x] `x lists` - your lists (owned)
- [x] `x lists owned` - lists you own
- [x] `x lists followed` - lists you follow
- [x] `x lists pinned` - pinned lists

### List Membership
- [x] `x list members <id>` - list members
- [x] `x list add <id> <username>` - add member
- [x] `x list remove <id> <username>` - remove member

### List Following
- [x] `x list follow <id>` - follow list
- [x] `x list unfollow <id>` - unfollow list
- [x] `x list pin <id>` - pin list
- [x] `x list unpin <id>` - unpin list

---

## Phase 5: Direct Messages (specs/05-direct-messages.md)

### DM Conversations
- [x] `x dm list` - list conversations
- [x] `x dm view <username>` - view conversation with user
- [x] `x dm conversation <id>` - view by conversation ID
- [x] DM API client implementation

### DM Send/Delete
- [x] `x dm send <username> <text>` - send DM
- [ ] `x dm send --media <file>` - DM with media (requires media upload)
- [x] `x dm delete <event_id>` - delete message

### Group DM
- [x] `x dm group -u user1 -u user2 <text>` - create group DM

---

## Phase 6: Spaces & Media (specs/06-spaces-media.md)

### Spaces
- [ ] `x space <id>` - get space details
- [ ] `x space search <query>` - search spaces
- [ ] `x space search --state live` - filter by state
- [ ] `x spaces <username>` - user's spaces
- [ ] Space API client implementation

### Media Upload
- [ ] `x media upload <file>` - upload media
- [ ] Simple upload for images < 5MB
- [ ] Chunked upload for videos/large files
- [ ] `x media upload --alt <text>` - set alt text
- [ ] `x media status <id>` - check processing status
- [ ] Progress indicator during upload
- [ ] Media API client implementation

---

## Phase 7: Grok Integration (specs/07-grok-integration.md)

### Grok Client
- [ ] Grok API client (api.x.ai/v1)
- [ ] XAI_API_KEY environment variable support
- [ ] Chat completion endpoint

### Natural Language
- [ ] `x grok "<natural language>"` - parse and execute
- [ ] Command parsing with confidence scoring
- [ ] NL to CLI command translation

### Summarization
- [ ] `x grok summarize <post_id>` - summarize thread
- [ ] `x grok summarize @<username>` - summarize user's posts
- [ ] `--length` option (brief, detailed)

### Analysis
- [ ] `x grok analyze <post_id>` - analyze post
- [ ] Sentiment analysis
- [ ] Topic extraction
- [ ] Engagement prediction

### Content Generation
- [ ] `x grok draft <topic>` - draft a post
- [ ] `x grok draft --tone <tone>` - specify tone
- [ ] `x grok reply <post_id>` - suggest replies
- [ ] `x grok ask <question>` - ask about timeline

---

## Phase 8: Polish & Release (specs/08-polish-release.md)

### Interactive Mode
- [ ] `x -i` / `x --interactive` - REPL mode
- [ ] Command history (up arrow)
- [ ] Tab completion in REPL
- [ ] `clear` / `exit` / `history` commands
- [ ] Graceful Ctrl+C handling

### Shell Completions
- [ ] `x completion bash` - bash completions
- [ ] `x completion zsh` - zsh completions
- [ ] `x completion fish` - fish completions

### Configuration Commands
- [ ] `x config set <key> <value>` - set config
- [ ] `x config get <key>` - get config value
- [ ] `x config list` - list all config
- [ ] `x config reset` - reset to defaults
- [ ] Config file at ~/.config/x-cli/config.json

### Documentation
- [x] README.md with features, install, quick start
- [x] Command reference in README
- [ ] CHANGELOG.md
- [ ] CONTRIBUTING.md

### Testing & Quality
- [x] Type checking passes (bun run typecheck)
- [x] Basic test suite (28 tests)
- [ ] 100% test coverage
- [ ] Integration tests (E2E flows)
- [ ] Build optimization (< 10MB binary)

---

## Out of Scope / Future Work

These items from specs/09-12 are now in scope:

### Release & Distribution (specs/09-release-distribution.md)
- [ ] npm package publishing
- [ ] Homebrew formula
- [ ] Binary releases (darwin-arm64, darwin-x64, linux-x64, win-x64)
- [ ] GitHub Actions CI/CD
- [ ] Version management

### Website (specs/11-website.md)
- [ ] Landing page
- [ ] Documentation site
- [ ] Interactive demo

### Claude Integration (specs/12-claude-integration.md)
- [ ] MCP server implementation
- [ ] Claude Code integration
- [ ] Tool definitions for Claude

---

## Recent Enhancements

**2025-01-03 (Direct Messages - COMPLETE!):**
- Implemented DM API client (listConversations, getMessages, send, delete)
- Created CLI commands: dm list, dm view, dm conversation, dm send, dm group, dm delete
- Pretty output for conversation list and message display
- Group DM creation support
- All 28 tests passing, TypeScript clean

**2025-01-03 (Lists & Documentation - COMPLETE!):**
- Implemented full Lists API (CRUD, timeline, members, follow, pin)
- Created comprehensive CLI commands for list management
- Added README documentation with features, install, commands reference

**Previous Work:**
- Foundation complete (OAuth 2.0 PKCE, HTTP client, formatters)
- Posts complete (CRUD, timelines, search)
- Engagement complete (like, repost, bookmark)
- Users complete (lookup, follow, block, mute)

---

## Next Priority

**Phase 6: Spaces & Media** - Implement Spaces lookup and Media upload:
1. Spaces API client (lookup, search)
2. Media upload (simple and chunked)
3. CLI commands: space, spaces, media upload, media status
