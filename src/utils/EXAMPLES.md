# Utility Usage Examples

## Number Parsing

### Twitter Engagement Numbers

```typescript
import { parseTwitterNumber } from './parse.js';

// Parse follower counts
const followers = parseTwitterNumber('150.5M');  // 150500000
const following = parseTwitterNumber('1.2K');    // 1200

// Parse engagement metrics
const likes = parseTwitterNumber('12.5K');       // 12500
const retweets = parseTwitterNumber('2.3K');     // 2300
const views = parseTwitterNumber('1.2M');        // 1200000

// Handle various formats
parseTwitterNumber('1,234,567');  // 1234567
parseTwitterNumber('5');          // 5
parseTwitterNumber('invalid');    // 0 (safe fallback)
```

### LinkedIn Duration Parsing

```typescript
import { parseLinkedInDuration } from './parse.js';

const duration = parseLinkedInDuration('Jan 2020 - Present · 4 yrs 2 mos');
console.log(duration.dateRange);  // 'Jan 2020 - Present'
console.log(duration.duration);   // '4 yrs 2 mos'

// Store in structured format
interface Experience {
  title: string;
  company: string;
  dateRange: string;
  duration: string;
}

const exp: Experience = {
  title: 'CEO',
  company: 'Microsoft',
  ...parseLinkedInDuration(rawDuration)
};
```

## Text Processing

### Clean and Normalize Text

```typescript
import { cleanText, truncateText } from './parse.js';

// Clean bio text from scraped content
const rawBio = `
  Building   the   future   


  of   AI   
`;

const cleanBio = cleanText(rawBio);
// 'Building the future\nof AI'

// Create preview text
const preview = truncateText(cleanBio, 50);
// 'Building the future\nof AI'

const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
const shortPreview = truncateText(longText, 20);
// 'Lorem ipsum dolor...'
```

## URL and Username Extraction

### Extract Twitter Usernames

```typescript
import { extractTwitterUsername } from './parse.js';

// From various input formats
extractTwitterUsername('https://x.com/elonmusk');              // 'elonmusk'
extractTwitterUsername('https://twitter.com/elonmusk/status/123');  // 'elonmusk'
extractTwitterUsername('@elonmusk');                           // 'elonmusk'
extractTwitterUsername('elonmusk');                            // 'elonmusk'

// Use in scraper function
async function scrapeTwitterProfile(input: string) {
  const username = extractTwitterUsername(input);
  
  if (!username) {
    throw new Error('Invalid Twitter username or URL');
  }
  
  const url = `https://x.com/${username}`;
  // ... scrape profile
}
```

### Extract LinkedIn Profile Slugs

```typescript
import { extractLinkedInSlug } from './parse.js';

const slug = extractLinkedInSlug('https://www.linkedin.com/in/satyanadella');
// 'satyanadella'

// Build API-friendly profile URL
const cleanUrl = `https://linkedin.com/in/${slug}`;
```

## Error Detection and Handling

### Twitter Error Detection

```typescript
import { checkTwitterErrors, ScraperError } from './errors.js';

async function scrapeTwitter(page: Page) {
  await page.goto(url);
  
  // Check for common errors
  const content = await page.content();
  const errorType = checkTwitterErrors(content);
  
  if (errorType) {
    throw new ScraperError(
      `Failed to load Twitter profile: ${errorType}`,
      errorType
    );
  }
  
  // Continue scraping...
}
```

### LinkedIn Error Detection

```typescript
import { checkLinkedInErrors, throwScraperError } from './errors.js';

async function scrapeLinkedIn(page: Page) {
  const content = await page.content();
  const errorType = checkLinkedInErrors(content);
  
  if (errorType === 'rate_limited') {
    throwScraperError(
      'rate_limited',
      'LinkedIn detected unusual activity. Wait 10-15 minutes.',
      { timestamp: Date.now() }
    );
  }
  
  if (errorType === 'login_required') {
    throwScraperError(
      'login_required',
      'You must be logged in to LinkedIn',
      { url: page.url() }
    );
  }
}
```

### Comprehensive Error Handling

```typescript
import {
  formatError,
  isConnectionError,
  isTimeoutError,
  ScraperError,
  ExitCode
} from './errors.js';

async function main() {
  try {
    await scrapeProfile();
  } catch (error) {
    // Check for specific error types
    if (isConnectionError(error)) {
      console.error('Playwriter extension is not running');
      process.exit(ExitCode.CONNECTION_ERROR);
    }
    
    if (isTimeoutError(error)) {
      console.error('Page load timeout - try again');
      process.exit(ExitCode.NAVIGATION_TIMEOUT);
    }
    
    // Format all errors consistently
    const formatted = formatError(error);
    
    // Write to stderr as JSON
    console.error(JSON.stringify(formatted, null, 2));
    
    // Exit with appropriate code
    process.exit(formatted.code);
  }
}
```

## CLI Integration

### Complete Example: Twitter Profile Scraper

```typescript
import { Page } from 'playwright-core';
import {
  parseTwitterNumber,
  extractTwitterUsername,
  cleanText
} from './utils/parse.js';
import {
  checkTwitterErrors,
  formatError,
  ScraperError,
  ExitCode
} from './utils/errors.js';

interface TwitterProfile {
  username: string;
  displayName: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  verified: boolean;
}

async function scrapeTwitterProfile(
  page: Page,
  input: string
): Promise<TwitterProfile> {
  try {
    // Extract and validate username
    const username = extractTwitterUsername(input);
    if (!username) {
      throw new ScraperError(
        'Invalid Twitter username or URL',
        'not_found'
      );
    }
    
    // Navigate to profile
    const url = `https://x.com/${username}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check for errors
    const content = await page.content();
    const errorType = checkTwitterErrors(content);
    if (errorType) {
      throw new ScraperError(
        `Failed to load profile: ${errorType}`,
        errorType,
        { username, url }
      );
    }
    
    // Scrape profile data
    const displayName = await page
      .locator('[data-testid="UserName"] span')
      .first()
      .textContent() || '';
    
    const bio = cleanText(
      await page
        .locator('[data-testid="UserDescription"]')
        .textContent() || ''
    );
    
    const followersText = await page
      .locator('a[href$="/followers"] span')
      .textContent() || '0';
    
    const followingText = await page
      .locator('a[href$="/following"] span')
      .textContent() || '0';
    
    const verified = await page
      .locator('[data-testid="UserName"] svg[aria-label*="Verified"]')
      .count() > 0;
    
    return {
      username,
      displayName,
      bio,
      followersCount: parseTwitterNumber(followersText),
      followingCount: parseTwitterNumber(followingText),
      verified
    };
    
  } catch (error) {
    // Format and re-throw for consistent error handling
    if (error instanceof ScraperError) {
      throw error;
    }
    
    const formatted = formatError(error);
    throw new ScraperError(
      formatted.error,
      'element_not_found',
      formatted.details
    );
  }
}

// CLI entry point
async function main() {
  try {
    const input = process.argv[2];
    if (!input) {
      console.error('Usage: scraper <username|url>');
      process.exit(1);
    }
    
    // Get Playwright page (from Playwriter connection)
    const page = await getPage();
    
    const profile = await scrapeTwitterProfile(page, input);
    
    // Output as JSON
    console.log(JSON.stringify(profile, null, 2));
    process.exit(ExitCode.SUCCESS);
    
  } catch (error) {
    const formatted = formatError(error);
    console.error(JSON.stringify(formatted, null, 2));
    process.exit(formatted.code);
  }
}
```

## Testing Examples

### Testing Parse Functions

```typescript
import { test, expect } from 'bun:test';
import { parseTwitterNumber, cleanText } from './utils/parse.js';

test('parse engagement metrics', () => {
  expect(parseTwitterNumber('12.5K')).toBe(12500);
  expect(parseTwitterNumber('1.2M')).toBe(1200000);
});

test('clean bio text', () => {
  const raw = 'Building  the   future\n\n\nof AI';
  expect(cleanText(raw)).toBe('Building the future\nof AI');
});
```

### Testing Error Detection

```typescript
import { test, expect } from 'bun:test';
import { checkTwitterErrors, formatError } from './utils/errors.js';

test('detect Twitter errors', () => {
  expect(checkTwitterErrors("Account doesn't exist")).toBe('not_found');
  expect(checkTwitterErrors('Rate limit exceeded')).toBe('rate_limited');
});

test('format errors with hints', () => {
  const error = new Error('Navigation timeout');
  const formatted = formatError(error);
  
  expect(formatted.code).toBe(4);
  expect(formatted.hint).toContain('timeout');
});
```
