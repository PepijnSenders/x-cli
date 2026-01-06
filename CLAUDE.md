# Claude Code Instructions

## Creating Releases

**IMPORTANT: Always use the automated release workflow instead of manual releases.**

### Proper Release Process

To create a new release, use the GitHub Actions workflow:

```bash
gh workflow run release.yml -f version=X.Y.Z -f prerelease=false
```

### What the Release Workflow Does

The `release.yml` workflow handles everything automatically:

1. ✅ Builds macOS binaries (arm64 + x64)
2. ✅ Builds Linux binaries (x64)
3. ✅ Bumps version in `package.json` and `.claude-plugin/plugin.json`
4. ✅ Runs type checks and tests
5. ✅ Creates git commit and tag
6. ✅ Creates GitHub release with compiled binaries as assets
7. ✅ Publishes to npm (`@pep/browse-cli`)
8. ✅ Updates Homebrew formula to use GitHub release binaries

### Why Not Manual Releases?

Manual releases (creating tags/releases without the workflow) will:
- ❌ Miss the compiled binaries
- ❌ Break Homebrew installs (formula expects binaries from GitHub releases)
- ❌ Cause version conflicts
- ❌ Skip npm publishing

### Homebrew Distribution

The Homebrew formula (`pepijnsenders/tap/browse`) uses **compiled binaries from GitHub releases**, not npm packages.

**Formula structure:**
```ruby
on_macos do
  on_arm do
    url "https://github.com/PepijnSenders/browse-cli/releases/download/vX.Y.Z/browse-darwin-arm64.tar.gz"
  end
  on_intel do
    url "https://github.com/PepijnSenders/browse-cli/releases/download/vX.Y.Z/browse-darwin-x64.tar.gz"
  end
end

on_linux do
  on_intel do
    url "https://github.com/PepijnSenders/browse-cli/releases/download/vX.Y.Z/browse-linux-x64.tar.gz"
  end
end
```

The workflow automatically:
- Builds these binaries using `bun build --compile`
- Uploads them to the GitHub release
- Generates SHA256 checksums
- Updates the Homebrew formula with correct URLs and checksums

### Example Release

```bash
# Create release v1.0.11
gh workflow run release.yml -f version=1.0.11 -f prerelease=false

# Watch the workflow progress
gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
```

### Manual Homebrew Update (Emergency Only)

If you need to manually update the Homebrew formula for an existing release:

```bash
gh workflow run homebrew.yml -f version=X.Y.Z
```

**Note:** This assumes the GitHub release already exists with binaries.

### Project Structure

- `extension/` - Chrome extension (Manifest V3)
- `src/` - TypeScript source for CLI
- `dist/` - Built Node.js CLI (generated)
- `homebrew/browse.rb.template` - Template for Homebrew formula
- `.github/workflows/release.yml` - Main release workflow
- `.github/workflows/homebrew.yml` - Standalone Homebrew update workflow

### Distribution Channels

1. **Homebrew** (recommended for end users)
   ```bash
   brew tap pepijnsenders/tap
   brew install browse
   ```

2. **npm** (for Node.js users)
   ```bash
   npm install -g @pep/browse-cli
   ```

3. **Manual Download**
   - Download binaries from GitHub releases
   - Extract and run `./browse`
