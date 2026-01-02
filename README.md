<div align="center">

# X CLI

**Fast, type-safe CLI for X (Twitter)**

[![CI](https://github.com/ps/x-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/ps/x-cli/actions)
[![License](https://img.shields.io/github/license/ps/x-cli)](LICENSE)

[Installation](#installation) · [Quick Start](#quick-start) · [Commands](#commands)

</div>

## Features

- **Full X API v2** — Posts, timelines, users, lists, DMs, spaces, media, engagement
- **Grok AI Integration** — Natural language commands, summarization, analysis, drafting
- **OAuth 2.0 PKCE** — Secure authentication, no API keys exposed
- **Type-safe** — Zod validation on all API responses
- **Beautiful output** — Pretty terminal formatting or JSON for pipes
- **Rate limit aware** — Automatic retry with exponential backoff

## Installation

### From Source

```bash
git clone https://github.com/ps/x-cli
cd x-cli
bun install
bun run build
```

### Run directly

```bash
bun run src/index.ts <command>
```

## Quick Start

```bash
# Authenticate
x auth login

# Post something
x post create "Hello, X!"

# View your timeline
x timeline home

# Search posts
x search "from:elonmusk AI"

# Get user info
x user elonmusk
```

## Commands

<details>
<summary><strong>Authentication</strong></summary>

```bash
x auth login          # Start OAuth flow
x auth logout         # Clear credentials
x auth status         # Show current user
x auth refresh        # Refresh token
```

</details>

<details>
<summary><strong>Posts</strong></summary>

```bash
x post create <text>           # Create a post
x post get <id>                # Get post by ID
x post delete <id>             # Delete your post
x post reply <id> <text>       # Reply to a post
x post quote <id> <text>       # Quote a post
```

</details>

<details>
<summary><strong>Timelines</strong></summary>

```bash
x timeline home                # Home timeline
x timeline user <username>     # User's posts
x timeline mentions            # Your mentions
x timeline --limit 50          # Custom limit
```

</details>

<details>
<summary><strong>Search</strong></summary>

```bash
x search <query>               # Search posts
x search "from:user keyword"   # Advanced search
x search --limit 20            # Limit results
```

</details>

<details>
<summary><strong>Engagement</strong></summary>

```bash
x like <id>                    # Like a post
x unlike <id>                  # Unlike
x repost <id>                  # Repost
x unrepost <id>                # Remove repost
x bookmark add <id>            # Bookmark
x bookmark list                # View bookmarks
x bookmark remove <id>         # Remove bookmark
```

</details>

<details>
<summary><strong>Users</strong></summary>

```bash
x me                           # Your profile
x user <username>              # User lookup
x follow <username>            # Follow user
x unfollow <username>          # Unfollow
x followers [username]         # List followers
x following [username]         # List following
x block <username>             # Block user
x unblock <username>           # Unblock user
x blocks                       # List blocked
x mute <username>              # Mute user
x unmute <username>            # Unmute user
x mutes                        # List muted
```

</details>

<details>
<summary><strong>Lists</strong></summary>

```bash
x list create <name>           # Create list
x list get <id>                # List info
x list update <id>             # Update list
x list delete <id>             # Delete list
x list timeline <id>           # List timeline
x list members <id>            # List members
x list add <id> <user>         # Add member
x list remove <id> <user>      # Remove member
x list follow <id>             # Follow list
x list unfollow <id>           # Unfollow list
x list pin <id>                # Pin list
x list unpin <id>              # Unpin list
x lists                        # Your lists
x lists owned                  # Lists you own
x lists followed               # Lists you follow
x lists pinned                 # Pinned lists
```

</details>

<details>
<summary><strong>Direct Messages</strong></summary>

```bash
x dm list                      # List conversations
x dm view <username>           # View conversation with user
x dm conversation <id>         # View by conversation ID
x dm send <username> <text>    # Send a DM
x dm group -u user1 -u user2 <text>  # Create group DM
x dm delete <event_id>         # Delete a message
```

</details>

<details>
<summary><strong>Spaces</strong></summary>

```bash
x space get <id>               # Get space details
x space search <query>         # Search spaces
x space search --state live    # Filter by state
x space buyers <id>            # Get ticketed space buyers
x spaces <username>            # User's spaces
```

</details>

<details>
<summary><strong>Media</strong></summary>

```bash
x media upload <file>          # Upload media file
x media upload <file> --alt "description"  # With alt text
x media upload <file> --wait   # Wait for processing
x media status <id>            # Check processing status
x media wait <id>              # Wait for processing complete
```

</details>

<details>
<summary><strong>Grok AI</strong></summary>

```bash
x grok "show my last 5 posts"  # Natural language parsing
x grok summarize <post_id>     # Summarize a thread
x grok summarize @username     # Summarize user's posts
x grok analyze <post_id>       # Sentiment & topic analysis
x grok draft "topic"           # Draft a post
x grok draft "topic" --tone professional  # With tone
x grok reply <post_id>         # Suggest replies
x grok ask "question"          # Ask about your timeline
```

Requires `XAI_API_KEY` environment variable.

</details>

## Global Options

```bash
-j, --json       Force JSON output
-q, --quiet      Suppress non-essential output
-v, --verbose    Debug information
--no-color       Disable colors
```

## Configuration

Tokens are stored securely at `~/.config/x-cli/tokens.json` with AES-256-GCM encryption.

## Development

```bash
# Install dependencies
bun install

# Run development
bun run src/index.ts <command>

# Type check
bun run typecheck

# Test
bun test

# Build
bun run build
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Language**: TypeScript
- **CLI Framework**: [Commander.js](https://github.com/tj/commander.js)
- **Validation**: [Zod](https://zod.dev)
- **OAuth**: [Arctic](https://arcticjs.dev)
- **Terminal**: [Chalk](https://github.com/chalk/chalk), [Ora](https://github.com/sindresorhus/ora), [cli-table3](https://github.com/cli-table/cli-table3)

## License

MIT
