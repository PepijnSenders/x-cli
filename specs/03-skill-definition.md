# Skill Definition

## Overview

The `/scrape` skill provides a natural language interface to the Session Scraper CLI. It interprets user intent and invokes the appropriate CLI command.

## Skill File

Location: `skill/scrape.md` or registered via Claude Code plugin.

```markdown
---
name: scrape
description: Scrape social media and web pages using your authenticated browser
---

# Scrape Skill

You can scrape content from Twitter, LinkedIn, and any webpage using the user's authenticated browser session.

## Prerequisites

1. **Playwriter extension** must be installed in Chrome
2. **Extension enabled** on at least one tab (click the extension icon)
3. **User logged in** to the target platform

## Available Commands

The `session-scraper` CLI tool is available. Use it via Bash:

### Twitter
```bash
session-scraper twitter profile <username>
session-scraper twitter timeline <username> [--count N]
session-scraper twitter post <url>
session-scraper twitter search <query> [--count N]
```

### LinkedIn
```bash
session-scraper linkedin profile <url>
session-scraper linkedin posts <url> [--count N]
session-scraper linkedin search <query> [--type people|posts|companies] [--count N]
```

### Browser Control
```bash
session-scraper browser navigate <url>
session-scraper browser screenshot [--full-page] [--output file.png]
session-scraper browser info
session-scraper browser list
session-scraper browser switch <index>
```

### Page Extraction
```bash
session-scraper page scrape [--selector <css>]
session-scraper page script <javascript>
```

## Interpretation Guide

When user says... | Run this command
------------------|------------------
"scrape @elonmusk" or "get elonmusk's twitter" | `session-scraper twitter profile elonmusk`
"get elon's latest tweets" | `session-scraper twitter timeline elonmusk --count 20`
"search twitter for AI news" | `session-scraper twitter search "AI news"`
"scrape linkedin.com/in/someone" | `session-scraper linkedin profile "https://linkedin.com/in/someone"`
"get this page" or "scrape current page" | `session-scraper page scrape`
"take a screenshot" | `session-scraper browser screenshot`
"go to example.com" | `session-scraper browser navigate "https://example.com"`

## Tips

- Output is JSON by default. Add `--format text` for human-readable output.
- For Twitter usernames, omit the @ symbol.
- For LinkedIn, always use the full URL.
- If connection fails, remind user to click the Playwriter extension icon.

## Error Handling

If the command fails, check:
1. Is Playwriter extension running? (exit code 2)
2. Is a tab enabled? (exit code 3)
3. Is user logged in? (exit code 7)
4. Does the profile exist? (exit code 8)
```

## Invocation Examples

User messages and expected skill behavior:

### Example 1: Twitter Profile
```
User: /scrape @elonmusk on twitter

Skill interprets: Twitter profile request
Claude runs: session-scraper twitter profile elonmusk
```

### Example 2: Ambiguous Platform
```
User: /scrape satyanadella

Skill interprets: Ambiguous - could be Twitter or LinkedIn
Claude asks: "Would you like me to scrape Satya Nadella's Twitter profile or LinkedIn profile?"
```

### Example 3: LinkedIn URL
```
User: /scrape https://linkedin.com/in/satyanadella

Skill interprets: LinkedIn profile (URL contains linkedin.com)
Claude runs: session-scraper linkedin profile "https://linkedin.com/in/satyanadella"
```

### Example 4: Current Page
```
User: /scrape this page

Skill interprets: Generic page scrape
Claude runs: session-scraper page scrape
```

### Example 5: Search
```
User: /scrape search for AI engineers on linkedin

Skill interprets: LinkedIn search
Claude runs: session-scraper linkedin search "AI engineers" --type people
```

### Example 6: Timeline with Count
```
User: /scrape last 50 tweets from @anthroploic

Skill interprets: Twitter timeline with count
Claude runs: session-scraper twitter timeline anthroploic --count 50
```

## Registration

### As User Skill

Create `~/.claude/skills/scrape.md` with the skill content above.

### As Plugin Skill

In plugin manifest (`.claude-plugin/plugin.json`):

```json
{
  "name": "session-scraper",
  "version": "1.0.0",
  "skills": [
    {
      "name": "scrape",
      "file": "skills/scrape.md"
    }
  ]
}
```

### Skill Discovery

Users invoke with:
```
/scrape @elonmusk twitter
/scrape https://linkedin.com/in/someone
/scrape this page
```

Or naturally in conversation:
```
"Can you scrape Elon Musk's Twitter profile?"
"Get me the latest posts from this LinkedIn page"
```

When the skill is loaded, Claude understands the `session-scraper` CLI is available and uses it appropriately.
