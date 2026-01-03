# Publishing

## Distribution Channels

Session Scraper is distributed via:

1. **npm** - CLI tool installation
2. **Claude Code Plugin** - Skill registration

## npm Package

### Package Configuration

```json
{
  "name": "@pep/session-scraper",
  "version": "1.0.0",
  "description": "Scrape social media and web pages using your authenticated browser session",
  "bin": {
    "session-scraper": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "skill"
  ],
  "scripts": {
    "build": "bun build src/cli.ts --outdir dist --target node",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "prepublishOnly": "bun run build"
  },
  "keywords": [
    "scraper",
    "twitter",
    "linkedin",
    "browser",
    "automation",
    "claude",
    "mcp"
  ],
  "author": "pep",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/pep/session-scraper"
  },
  "engines": {
    "node": ">=18.0.0"
  },
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

### CLI Entry Point

Ensure shebang for npx execution:

```typescript
#!/usr/bin/env node
// src/cli.ts

import { program } from 'commander';
// ... rest of CLI implementation
```

### Installation

```bash
# Global install
npm install -g @pep/session-scraper

# Or run directly
npx @pep/session-scraper twitter profile elonmusk
```

---

## Claude Code Plugin

### Plugin Structure

```
session-scraper-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── scrape.md
└── README.md
```

### Plugin Manifest

`.claude-plugin/plugin.json`:

```json
{
  "name": "session-scraper",
  "version": "1.0.0",
  "description": "Scrape Twitter, LinkedIn, and web pages using your browser session",
  "author": "pep",
  "homepage": "https://github.com/pep/session-scraper",
  "keywords": ["scraper", "twitter", "linkedin", "browser"],
  "skills": [
    {
      "name": "scrape",
      "description": "Scrape social media and web pages",
      "file": "skills/scrape.md"
    }
  ],
  "prerequisites": [
    {
      "type": "npm",
      "package": "@pep/session-scraper",
      "global": true
    },
    {
      "type": "extension",
      "name": "Playwriter",
      "url": "https://github.com/anthropics/playwriter"
    }
  ]
}
```

### Skill File

`skills/scrape.md`: See [03-skill-definition.md](03-skill-definition.md) for full content.

### Installation

```bash
# Via plugin marketplace (when available)
/plugin install session-scraper

# Or local development
claude --plugin-dir ./session-scraper-plugin
```

---

## CI/CD

### GitHub Actions

#### Test Workflow

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - run: bun install
      - run: bun run typecheck
      - run: bun test
```

#### Publish Workflow

`.github/workflows/publish.yml`:

```yaml
name: Publish

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - run: bun install
      - run: bun run build

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Versioning

Follow semantic versioning:

- **MAJOR**: Breaking changes (CLI interface, output format)
- **MINOR**: New features (new platforms, new commands)
- **PATCH**: Bug fixes, selector updates

### Release Checklist

1. Update version in `package.json`
2. Update version in `.claude-plugin/plugin.json`
3. Update `CHANGELOG.md`
4. Run tests: `bun test`
5. Build: `bun run build`
6. Test CLI locally: `./dist/cli.js twitter profile elonmusk`
7. Create git tag: `git tag v1.0.0`
8. Push with tags: `git push origin main --tags`
9. Create GitHub release (triggers npm publish)

---

## Documentation

### README.md

```markdown
# Session Scraper

Scrape Twitter, LinkedIn, and web pages using your authenticated browser session.

## Quick Start

1. Install the [Playwriter extension](https://github.com/anthropics/playwriter) in Chrome
2. Click the extension icon on a tab to enable control
3. Install the CLI:

```bash
npm install -g @pep/session-scraper
```

4. Start scraping:

```bash
session-scraper twitter profile elonmusk
session-scraper linkedin profile "https://linkedin.com/in/someone"
```

## With Claude Code

Install the skill:

```
/plugin install session-scraper
```

Then use naturally:

```
/scrape @elonmusk on twitter
/scrape this linkedin profile
```

## Commands

| Command | Description |
|---------|-------------|
| `twitter profile <username>` | Get Twitter profile |
| `twitter timeline <username>` | Get tweets |
| `twitter search <query>` | Search Twitter |
| `linkedin profile <url>` | Get LinkedIn profile |
| `linkedin posts <url>` | Get LinkedIn posts |
| `browser navigate <url>` | Navigate to URL |
| `page scrape` | Extract page content |

See [full documentation](./docs) for all commands and options.

## Requirements

- Node.js 18+
- Chrome with Playwriter extension
- Logged into target platforms

## License

MIT
```

---

## Future: Plugin Marketplace

When Claude Code Plugin Marketplace launches:

1. Create marketplace entry repository
2. Submit plugin for review
3. Users install via `/plugin install session-scraper`

Marketplace manifest structure TBD based on final marketplace spec.
