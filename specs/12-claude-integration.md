# Phase 12: Claude Code Integration

## Objectives

- Claude Code skill to teach Claude how to use x-cli
- Marketplace plugin for easy distribution
- Slash commands for common workflows
- MCP server integration (optional)

## Overview

Two distribution methods:

| Method | Use Case | Installation |
|--------|----------|--------------|
| **Skill** | Personal/project use | Copy to `.claude/skills/` |
| **Plugin** | Public distribution | `/plugin install x-cli@marketplace` |

## Skill Structure

```
x-cli/
├── SKILL.md              # Main skill file (required)
└── docs/
    ├── commands.md       # Full command reference
    ├── examples.md       # Real-world usage examples
    └── troubleshooting.md # Common issues and fixes
```

### SKILL.md

```yaml
---
name: x-cli
description: Use the X (Twitter) CLI to post, read timelines, search, manage users, send DMs, and use Grok AI. Use when working with X/Twitter, posting to social media, checking timelines, or using Grok.
allowed-tools: Bash
---

# X CLI Skill

A fast, type-safe CLI for X (Twitter).

## Prerequisites

Ensure x-cli is installed:
```bash
which x && x --version
```

If not installed:
```bash
brew tap YOUR_USERNAME/x-cli && brew install x-cli
# or: npm install -g x-cli
```

## Authentication

Before using, authenticate:
```bash
x auth login
```

Check status:
```bash
x auth status
```

## Core Commands

### Posts
```bash
x post create "Your message here"          # Create post
x post create "With image" -m image.jpg    # Post with media
x post get <id>                            # Get post by ID
x post delete <id>                         # Delete post
x post reply <id> "Reply text"             # Reply to post
```

### Timelines
```bash
x timeline home                            # Home timeline
x timeline home --limit 10                 # Limit results
x timeline user <username>                 # User's posts
x timeline mentions                        # Your mentions
```

### Search
```bash
x search "query"                           # Search posts
x search "from:user keyword"               # From specific user
x search "topic" --limit 20                # With limit
```

### Engagement
```bash
x like <id>                                # Like post
x unlike <id>                              # Unlike
x repost <id>                              # Repost
x bookmark <id>                            # Bookmark
x bookmarks                                # View bookmarks
```

### Users
```bash
x me                                       # Your profile
x user <username>                          # User lookup
x follow <username>                        # Follow
x unfollow <username>                      # Unfollow
x followers <username>                     # List followers
x following <username>                     # List following
x block <username>                         # Block user
x mute <username>                          # Mute user
```

### Direct Messages
```bash
x dm list                                  # List conversations
x dm view <conversation_id>                # View messages
x dm send <username> "message"             # Send DM
```

### Grok AI
```bash
x grok "your question"                     # Ask Grok anything
x grok summarize @username                 # Summarize user's posts
x grok analyze <post_id>                   # Analyze thread
x grok draft "topic"                       # Draft a post
x grok reply <post_id>                     # Suggest reply
```

## Output Formats

```bash
x timeline home                            # Pretty output (default TTY)
x timeline home --json                     # JSON output
x timeline home | jq '.data[0]'            # Pipe to jq
```

## Additional Resources

- @docs/commands.md - Complete command reference with all flags
- @docs/examples.md - Real-world usage patterns and scripts
- @docs/troubleshooting.md - Common issues and fixes
```

### docs/commands.md

```markdown
# X CLI Command Reference

## Global Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--json` | `-j` | Force JSON output |
| `--quiet` | `-q` | Suppress non-essential output |
| `--verbose` | `-v` | Debug information |
| `--no-color` | | Disable colors |
| `--help` | `-h` | Show help |
| `--version` | | Show version |

## Authentication

| Command | Description |
|---------|-------------|
| `x auth login` | Start OAuth 2.0 flow |
| `x auth logout` | Clear stored credentials |
| `x auth status` | Show current auth status |

## Posts

| Command | Description |
|---------|-------------|
| `x post create <text>` | Create a new post |
| `x post create <text> -m <file>` | Post with media attachment |
| `x post get <id>` | Get post by ID |
| `x post delete <id>` | Delete your post |
| `x post reply <id> <text>` | Reply to a post |

## Timelines

| Command | Description |
|---------|-------------|
| `x timeline home` | Home timeline |
| `x timeline user <username>` | User's posts |
| `x timeline mentions` | Your mentions |
| `x timeline --limit <n>` | Limit number of posts |

## Search

| Command | Description |
|---------|-------------|
| `x search <query>` | Search posts |
| `x search --recent` | Recent results only |
| `x search --limit <n>` | Limit results |

### Search Operators

- `from:username` - Posts from user
- `to:username` - Replies to user
- `#hashtag` - Contains hashtag
- `"exact phrase"` - Exact match
- `-keyword` - Exclude keyword

## Engagement

| Command | Description |
|---------|-------------|
| `x like <id>` | Like a post |
| `x unlike <id>` | Remove like |
| `x repost <id>` | Repost |
| `x unrepost <id>` | Remove repost |
| `x bookmark <id>` | Add bookmark |
| `x unbookmark <id>` | Remove bookmark |
| `x bookmarks` | View all bookmarks |

## Users

| Command | Description |
|---------|-------------|
| `x me` | Your profile info |
| `x user <username>` | Get user by username |
| `x follow <username>` | Follow user |
| `x unfollow <username>` | Unfollow user |
| `x followers [username]` | List followers |
| `x following [username]` | List following |
| `x block <username>` | Block user |
| `x unblock <username>` | Unblock user |
| `x mute <username>` | Mute user |
| `x unmute <username>` | Unmute user |
| `x blocks` | List blocked users |
| `x mutes` | List muted users |

## Lists

| Command | Description |
|---------|-------------|
| `x list create <name>` | Create new list |
| `x list <id>` | Get list info |
| `x list timeline <id>` | List timeline |
| `x list update <id> --name <n>` | Update list |
| `x list delete <id>` | Delete list |
| `x list add <id> <username>` | Add member |
| `x list remove <id> <username>` | Remove member |
| `x list members <id>` | List members |

## Direct Messages

| Command | Description |
|---------|-------------|
| `x dm list` | List conversations |
| `x dm view <conv_id>` | View conversation |
| `x dm send <user> <text>` | Send message |

## Grok AI

| Command | Description |
|---------|-------------|
| `x grok <prompt>` | Ask Grok anything |
| `x grok summarize @<user>` | Summarize user's posts |
| `x grok summarize <id>` | Summarize thread |
| `x grok analyze <id>` | Analyze conversation |
| `x grok draft <topic>` | Draft a post |
| `x grok reply <id>` | Suggest reply |

Requires `XAI_API_KEY` environment variable.

## Other

| Command | Description |
|---------|-------------|
| `x space <id>` | Get Space info |
| `x media upload <file>` | Upload media |
| `x config set <key> <val>` | Set config |
| `x config get <key>` | Get config |
| `x config list` | Show all config |
| `x -i` / `x --interactive` | REPL mode |
| `x completion bash\|zsh\|fish` | Shell completions |
```

### docs/examples.md

```markdown
# X CLI Examples

## Daily Workflow

### Morning routine
```bash
# Check mentions
x timeline mentions --limit 10

# Review home timeline
x timeline home --limit 20

# Check DMs
x dm list
```

### Post something
```bash
# Simple post
x post create "Good morning! Starting the day with coffee."

# Post with image
x post create "Check out this view!" -m photo.jpg

# Thread (reply to yourself)
POST_ID=$(x post create "Thread: Why I love Bun (1/3)" --json | jq -r '.data.id')
x post reply $POST_ID "It's incredibly fast (2/3)"
x post reply $POST_ID "And the DX is amazing (3/3)"
```

## Research & Analysis

### Analyze a topic
```bash
# Search for recent discussions
x search "AI safety" --limit 20

# Summarize what someone's been saying
x grok summarize @sama

# Analyze a specific thread
x grok analyze 1234567890
```

### Track users
```bash
# Get user info
x user elonmusk

# Check their recent posts
x timeline user elonmusk --limit 10

# Follow for updates
x follow elonmusk
```

## Engagement

### Interact with posts
```bash
# Like something good
x like 1234567890

# Repost to share
x repost 1234567890

# Save for later
x bookmark 1234567890

# Reply thoughtfully
x post reply 1234567890 "Great point! I think..."
```

### Manage relationships
```bash
# Follow someone
x follow username

# Check who follows you
x followers

# See who you follow
x following

# Block a troll
x block trollaccount
```

## Scripting & Automation

### Export timeline to JSON
```bash
x timeline home --limit 100 --json > timeline.json
```

### Post from file
```bash
x post create "$(cat draft.txt)"
```

### Scheduled-style posting (with cron)
```bash
# In crontab: post at 9am daily
0 9 * * * x post create "Good morning!"
```

### Monitor mentions
```bash
while true; do
  x timeline mentions --limit 5 --json
  sleep 300
done
```

## Grok AI Workflows

### Content creation
```bash
# Draft a post
x grok draft "thoughts on the future of AI"

# Get reply suggestions
x grok reply 1234567890

# Analyze before engaging
x grok analyze 1234567890
```

### Research assistant
```bash
# Summarize a conversation
x grok summarize 1234567890

# Understand someone's position
x grok "summarize @username's views on climate change"
```

## Piping & Integration

### With jq
```bash
# Get just the text of posts
x timeline home --json | jq '.data[].text'

# Count posts
x timeline home --limit 100 --json | jq '.data | length'

# Find posts with links
x search "topic" --json | jq '.data[] | select(.text | contains("http"))'
```

### With other tools
```bash
# Post git commit message
x post create "Just shipped: $(git log -1 --pretty=%B)"

# Share current song (macOS)
SONG=$(osascript -e 'tell application "Music" to get name of current track')
x post create "Listening to: $SONG"
```
```

### docs/troubleshooting.md

```markdown
# X CLI Troubleshooting

## Common Issues

### "Not authenticated"

```bash
# Check auth status
x auth status

# Re-authenticate
x auth login
```

### "Rate limit exceeded"

Wait 15 minutes or check remaining:
```bash
x timeline home --verbose
# Shows rate limit info in debug output
```

Rate limits:
- Posts read: 900/15min
- Posts write: 200/15min
- Search: 180/15min

### "Command not found: x"

```bash
# Check if installed
which x

# If using npm, might need:
export PATH="$PATH:$(npm bin -g)"

# Or reinstall
brew reinstall x-cli
# or
npm install -g x-cli
```

### "Grok not responding"

Check API key:
```bash
echo $XAI_API_KEY

# Set if missing
export XAI_API_KEY=your_key_here
```

### "Invalid post ID"

Post IDs are long numbers:
```bash
# Correct
x post get 1234567890123456789

# Wrong
x post get abc123
```

### Token expired

```bash
# Usually auto-refreshes, but if not:
x auth logout
x auth login
```

## Debug Mode

```bash
x timeline home --verbose
```

Shows:
- API endpoints called
- Rate limit headers
- Response timing
- Error details

## Getting Help

```bash
x --help              # General help
x post --help         # Command-specific
x help post create    # Subcommand help
```
```

## Plugin Structure

For marketplace distribution:

```
x-cli-plugin/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── commands/
│   ├── post.md               # /x-cli:post command
│   ├── timeline.md           # /x-cli:timeline command
│   ├── search.md             # /x-cli:search command
│   └── grok.md               # /x-cli:grok command
├── skills/
│   └── x-cli/
│       ├── SKILL.md
│       ├── COMMANDS.md
│       ├── EXAMPLES.md
│       └── TROUBLESHOOTING.md
└── README.md
```

### plugin.json

```json
{
  "name": "x-cli",
  "version": "1.0.0",
  "description": "Claude Code integration for X CLI - post, read timelines, search, and use Grok AI",
  "author": {
    "name": "YOUR_NAME",
    "email": "you@example.com"
  },
  "repository": "https://github.com/YOUR_USERNAME/x-cli-plugin",
  "homepage": "https://YOUR_USERNAME.github.io/x-cli",
  "license": "MIT",
  "keywords": ["x", "twitter", "cli", "social", "grok"],
  "skills": "./skills/",
  "commands": "./commands/"
}
```

### Slash Commands

#### commands/post.md

```yaml
---
description: Create a post on X (Twitter)
---

# Post to X

Create a new post on X with the provided text.

Text to post: $ARGUMENTS

If no text is provided, ask the user what they want to post.

To post, run:
```bash
x post create "<text>"
```

If the user wants to include media, use:
```bash
x post create "<text>" -m <file>
```
```

#### commands/timeline.md

```yaml
---
description: View your X (Twitter) timeline
---

# View Timeline

Fetch and display the user's X timeline.

Options: $ARGUMENTS

Default to home timeline with 10 posts:
```bash
x timeline home --limit 10
```

Parse $ARGUMENTS for:
- "mentions" → `x timeline mentions`
- "@username" → `x timeline user <username>`
- A number → use as --limit
```

#### commands/search.md

```yaml
---
description: Search posts on X (Twitter)
---

# Search X

Search query: $ARGUMENTS

Run the search:
```bash
x search "$ARGUMENTS" --limit 10
```

Present results in a readable format. If the user wants more, increase the limit.
```

#### commands/grok.md

```yaml
---
description: Ask Grok AI about X content
---

# Ask Grok

Prompt: $ARGUMENTS

If the prompt mentions summarizing a user (e.g., "summarize @username"):
```bash
x grok summarize @username
```

If it mentions analyzing a post:
```bash
x grok analyze <post_id>
```

Otherwise, pass directly to Grok:
```bash
x grok "$ARGUMENTS"
```
```

## Marketplace Structure

To create a marketplace hosting this plugin:

```
x-cli-marketplace/
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    └── x-cli/
        ├── .claude-plugin/
        │   └── plugin.json
        ├── commands/
        └── skills/
```

### marketplace.json

```json
{
  "name": "x-cli-plugins",
  "owner": {
    "name": "YOUR_NAME"
  },
  "metadata": {
    "description": "Claude Code plugins for X CLI",
    "version": "1.0.0",
    "pluginRoot": "./plugins"
  },
  "plugins": [
    {
      "name": "x-cli",
      "source": "./plugins/x-cli",
      "description": "X (Twitter) CLI integration with posts, timelines, search, and Grok AI",
      "version": "1.0.0",
      "category": "social",
      "tags": ["twitter", "x", "social", "grok", "ai"]
    }
  ]
}
```

## Installation Methods

### Personal Skill

```bash
# Copy skill to personal directory
mkdir -p ~/.claude/skills/x-cli
cp -r x-cli-skill/* ~/.claude/skills/x-cli/

# Restart Claude Code
```

### Project Skill

```bash
# Add to project for team use
mkdir -p .claude/skills/x-cli
cp -r x-cli-skill/* .claude/skills/x-cli/

# Commit to git
git add .claude/skills/x-cli
git commit -m "Add X CLI skill for Claude Code"
```

### Plugin via Marketplace

```bash
# In Claude Code:
/plugin marketplace add YOUR_USERNAME/x-cli-marketplace
/plugin install x-cli@x-cli-plugins
```

### Direct Plugin Install

```bash
# In Claude Code:
/plugin install https://github.com/YOUR_USERNAME/x-cli-plugin
```

## Testing

### Test Skill Loading

1. Restart Claude Code
2. Ask: "Can you post something to X for me?"
3. Claude should recognize and use the x-cli skill

### Test Commands

```bash
# In Claude Code:
/x-cli:post Hello from Claude!
/x-cli:timeline
/x-cli:search AI news
/x-cli:grok summarize @anthropic
```

### Validate Plugin

```bash
# In Claude Code:
/plugin validate ./x-cli-plugin
```

## Verification Checklist

### Skill
- [ ] SKILL.md has valid frontmatter
- [ ] Description triggers on relevant queries
- [ ] All commands documented
- [ ] Examples are accurate
- [ ] Troubleshooting covers common issues

### Plugin
- [ ] plugin.json valid
- [ ] Commands work as slash commands
- [ ] Skill loads from plugin
- [ ] README has installation instructions

### Marketplace
- [ ] marketplace.json valid
- [ ] Plugin installable via marketplace
- [ ] Version numbers consistent

### Integration
- [ ] Claude recognizes when to use x-cli
- [ ] Authentication flow works
- [ ] Common operations succeed
- [ ] Error messages are helpful
