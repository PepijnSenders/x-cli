# Integration Testing Guide

This guide covers integration testing for the Session Scraper project, including both automated and manual testing approaches.

## Overview

Integration tests verify that the CLI and MCP server work correctly with live browser sessions. These tests require:
1. Chrome browser with Playwriter extension installed
2. Active browser tabs with Playwriter enabled
3. Authentication to target platforms (Twitter, LinkedIn)

## Test Categories

### 1. Automated Integration Tests (Without Live Auth)

These tests can run in CI/CD and don't require live authentication:

- **Connection Tests**: Browser connection, retry logic, timeout handling
- **Parser Tests**: Number parsing, duration parsing, date formatting
- **Type Detection**: Tweet type detection, thread detection
- **Error Handling**: Error detection, exit codes, error formatting
- **CLI Interface**: Command parsing, argument validation, help text

**Run with:**
```bash
bun test
```

**Current Status:** ✅ 187 tests passing

### 2. Manual Integration Tests (With Live Auth)

These tests require manual setup and live authentication:

- **Browser Control**: Navigate, screenshot, tab switching
- **Twitter Scraping**: Profile, timeline, posts, search, lists
- **LinkedIn Scraping**: Profile, posts, search
- **Generic Scraping**: Page scraping, custom scripts

**Run with:**
```bash
./tests/manual-test.sh
```

### 3. Platform-Specific Tests (Requires Auth)

Tests that verify platform scrapers work with real data.

#### Twitter Tests

```bash
# Prerequisites:
# 1. Open Chrome and navigate to twitter.com
# 2. Log in to your Twitter account
# 3. Click the Playwriter extension icon (should turn green)

# Test profile scraping
session-scraper twitter profile elonmusk

# Test timeline scraping
session-scraper twitter timeline elonmusk --count 10

# Test search
session-scraper twitter search "TypeScript" --count 5

# Test single post (replace with actual tweet URL)
session-scraper twitter post "https://x.com/elonmusk/status/1234567890"

# Test lists (replace with actual list ID)
session-scraper twitter list 1234567890 --count 10
```

#### LinkedIn Tests

```bash
# Prerequisites:
# 1. Open Chrome and navigate to linkedin.com
# 2. Log in to your LinkedIn account
# 3. Click the Playwriter extension icon (should turn green)

# Test profile scraping (replace with real profile URL)
session-scraper linkedin profile "https://linkedin.com/in/satyanadella"

# Test posts
session-scraper linkedin posts "https://linkedin.com/in/satyanadella" --count 5

# Test search
session-scraper linkedin search "software engineer" --type people --count 5
```

#### Generic Browser Tests

```bash
# Test navigation
session-scraper browser navigate "https://example.com"

# Test page info
session-scraper browser info

# Test listing tabs
session-scraper browser list

# Test page scraping
session-scraper page scrape

# Test with selector
session-scraper page scrape --selector "main"

# Test custom script
session-scraper page script "return document.title"

# Test screenshot
session-scraper browser screenshot --output test.png
session-scraper browser screenshot --full-page --output test-full.png
```

## Setting Up Integration Tests

### 1. Install Prerequisites

```bash
# Install the CLI globally
npm install -g @pep/session-scraper-mcp

# Or use locally built version
bun run build
alias session-scraper="./dist/cli.js"
```

### 2. Install Playwriter Extension

1. Visit [Chrome Web Store](https://chromewebstore.google.com/detail/playwriter-mcp/jfeammnjpkecdekppnclgkkffahnhfhe)
2. Click "Add to Chrome"
3. Pin the extension to your toolbar

### 3. Enable Playwriter on Tabs

1. Open Chrome and navigate to the platform you want to test (twitter.com, linkedin.com, etc.)
2. Log in to your account
3. Click the Playwriter extension icon in the toolbar
4. Icon should turn green, indicating the tab is now controllable

### 4. Verify Connection

```bash
# This should show current tab info without errors
session-scraper browser info
```

If you see `"Extension not connected"` error:
- Make sure Chrome is running
- Ensure Playwriter extension is installed and enabled
- Click the extension icon on at least one tab

## Test Scenarios

### Scenario 1: Basic Browser Control

**Goal:** Verify browser connection and basic navigation

```bash
# 1. Check connection
session-scraper browser info

# 2. List available tabs
session-scraper browser list

# 3. Navigate to a website
session-scraper browser navigate "https://github.com"

# 4. Scrape the page
session-scraper page scrape

# Expected: All commands succeed with valid JSON output
```

### Scenario 2: Twitter Profile Analysis

**Goal:** Extract comprehensive profile data

```bash
# 1. Scrape a well-known public profile
session-scraper twitter profile elonmusk

# Verify output includes:
# - username, displayName, bio
# - followersCount, followingCount, postsCount
# - verified status
# - profileImageUrl
# - joinDate

# 2. Test error handling with non-existent user
session-scraper twitter profile nonexistentuser123xyz

# Expected: Error with exit code 8 (not found)
```

### Scenario 3: Twitter Timeline Pagination

**Goal:** Verify pagination and count limits work correctly

```bash
# 1. Small count
session-scraper twitter timeline elonmusk --count 5

# Expected: Exactly 5 tweets (or fewer if user has < 5 tweets)

# 2. Large count
session-scraper twitter timeline elonmusk --count 50

# Expected: Up to 50 tweets with proper pagination

# 3. Max count
session-scraper twitter timeline elonmusk --count 100

# Expected: Up to 100 tweets (enforced maximum)
```

### Scenario 4: LinkedIn Profile Extraction

**Goal:** Verify all profile sections are extracted

```bash
# Scrape a public profile
session-scraper linkedin profile "https://linkedin.com/in/satyanadella"

# Verify output includes:
# - name, headline, location
# - about section
# - experience array with titles, companies, durations
# - education array
# - skills array
```

### Scenario 5: Error Handling

**Goal:** Verify error detection and recovery

```bash
# Test 1: Connection error (with Playwriter disabled)
# - Disable Playwriter extension temporarily
session-scraper browser info
# Expected: Exit code 2, "Extension not connected" error

# Test 2: No pages available
# - Close all Chrome tabs where Playwriter is enabled
session-scraper browser info
# Expected: Exit code 3, "No pages available" error

# Test 3: Profile not found
session-scraper twitter profile thisuserdoesnotexist999
# Expected: Exit code 8, "Profile not found" error

# Test 4: Invalid URL
session-scraper linkedin profile "not-a-valid-url"
# Expected: Error about invalid URL format
```

### Scenario 6: Rate Limit Handling

**Goal:** Verify rate limit detection and delays

```bash
# Run multiple requests in succession
for i in {1..10}; do
  echo "Request $i"
  session-scraper twitter profile elonmusk
  sleep 2
done

# Expected:
# - All requests succeed
# - Human-like delays prevent rate limiting
# - If rate limited, proper error message with exit code 6
```

## MCP Server Testing

### 1. Configure MCP Server

Add to your MCP configuration (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "session-scraper": {
      "command": "session-scraper-mcp"
    }
  }
}
```

### 2. Test MCP Tools

Use Claude Code or another MCP client to test the tools:

```
User: Use scrape_twitter_profile to get information about elonmusk

Claude: [Calls scrape_twitter_profile with username: "elonmusk"]

Expected: Profile data returned successfully
```

### 3. MCP Tool Test Matrix

| Tool | Test Input | Expected Output |
|------|------------|-----------------|
| `scrape_twitter_profile` | `{ "username": "elonmusk" }` | Profile object with follower counts |
| `scrape_twitter_timeline` | `{ "username": "elonmusk", "count": 10 }` | Array of 10 tweets |
| `scrape_twitter_search` | `{ "query": "AI", "count": 5 }` | Array of 5 search results |
| `scrape_twitter_list` | `{ "listId": "123", "count": 10 }` | List metadata + tweets |
| `scrape_linkedin_profile` | `{ "url": "https://linkedin.com/in/..." }` | Profile with experience/education |
| `navigate` | `{ "url": "https://example.com" }` | Success response with final URL |
| `take_screenshot` | `{ "fullPage": false }` | Base64 encoded screenshot |
| `scrape_page` | `{ "selector": "main" }` | Page content scoped to selector |
| `execute_script` | `{ "script": "return document.title" }` | Script execution result |

## CI/CD Integration

### Current Status

**Automated Tests:** ✅ Run in CI (187 tests)
**Integration Tests:** ⚠️ Manual only (requires browser + auth)

### Future: Automated Integration Tests

Potential approaches for automated integration testing:

1. **Mock Playwriter Server**: Create a mock CDP server that simulates browser responses
2. **Record/Replay**: Record real browser interactions and replay them in tests
3. **Docker with Chrome**: Run Chrome in headless mode with Playwriter in CI
4. **Test Fixtures**: Use saved HTML snapshots of Twitter/LinkedIn pages

### Recommended: Integration Test Suite

```typescript
// tests/integration/twitter.integration.test.ts
import { describe, it, expect, beforeAll } from 'bun:test';
import { connect, getPage } from '../src/browser';

describe('Twitter Integration Tests', () => {
  let isPlaywriterAvailable = false;

  beforeAll(async () => {
    try {
      await connect();
      isPlaywriterAvailable = true;
    } catch {
      console.warn('Skipping integration tests - Playwriter not available');
    }
  });

  it('should scrape a Twitter profile', async () => {
    if (!isPlaywriterAvailable) return;

    // Integration test implementation
    const page = await getPage();
    // ... test scraping logic
  });

  // More tests...
});
```

## Troubleshooting

### Issue: Connection Refused

**Symptom:** `ECONNREFUSED 127.0.0.1:19988`

**Solution:**
1. Verify Chrome is running
2. Check Playwriter extension is installed and enabled
3. Click extension icon on at least one tab
4. Verify extension icon turns green

### Issue: No Pages Available

**Symptom:** `No pages available` error

**Solution:**
1. Click Playwriter extension icon on a Chrome tab
2. Verify the icon turns green
3. Ensure tab is still open and not closed

### Issue: Login Required

**Symptom:** `Login required` error when scraping platforms

**Solution:**
1. Open the platform (twitter.com, linkedin.com) in browser
2. Log in to your account
3. Click Playwriter extension icon on that tab
4. Run scraper commands

### Issue: Rate Limited

**Symptom:** `Rate limit exceeded` error

**Solution:**
1. Wait 5-10 minutes before retrying
2. Reduce request frequency (add delays between requests)
3. Use smaller `--count` values
4. The scraper includes automatic delays, but rapid succession requests may still trigger limits

### Issue: Navigation Timeout

**Symptom:** `Navigation timeout` error

**Solution:**
1. Increase timeout: `--timeout 60000` (60 seconds)
2. Check internet connection
3. Verify the website is accessible
4. Try navigating manually in browser first

## Best Practices

1. **Always test with Playwriter enabled**: Ensure green icon before running tests
2. **Use test accounts**: Don't use production accounts for testing
3. **Respect rate limits**: Add delays between requests (2-3 seconds)
4. **Test error cases**: Verify error handling for all failure scenarios
5. **Test on real data**: Integration tests should use actual platform data
6. **Document edge cases**: Record unusual behavior or platform changes
7. **Keep tests idempotent**: Tests should not affect platform data
8. **Clean up**: Close test tabs after testing

## Test Checklist

Before releasing a new version, verify:

- [ ] All unit tests pass (`bun test`)
- [ ] All type checks pass (`bun run typecheck`)
- [ ] Manual test script runs successfully (`./tests/manual-test.sh`)
- [ ] Browser connection works
- [ ] At least one Twitter scraping operation succeeds
- [ ] At least one LinkedIn scraping operation succeeds
- [ ] Generic page scraping works
- [ ] Error messages are clear and helpful
- [ ] MCP server starts without errors
- [ ] Documentation is up to date

## Contributing Integration Tests

When adding new features:

1. Add unit tests for parsing/logic
2. Add integration test scenarios to this guide
3. Update manual test script if applicable
4. Document any new prerequisites or setup steps
5. Test with multiple accounts/platforms when possible

## Resources

- [Playwriter Extension](https://chromewebstore.google.com/detail/playwriter-mcp/jfeammnjpkecdekppnclgkkffahnhfhe)
- [Project Documentation](../specs/)
- [Manual Test Script](./manual-test.sh)
- [Skill Testing Guide](./skill-testing.md)
