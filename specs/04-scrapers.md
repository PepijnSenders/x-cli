# Scrapers

## Overview

Each scraper extracts structured data from a specific platform using DOM selectors and browser automation. All scrapers share common patterns:

- Navigation with timeout handling
- Human-like delays between actions
- Infinite scroll pagination
- Number parsing (K/M suffixes)
- Error detection (not found, rate limited, login required)

---

## Twitter Scraper

### URLs

| Page | URL Pattern |
|------|-------------|
| Profile | `https://x.com/{username}` |
| Tweet | `https://x.com/{username}/status/{id}` |
| Timeline | `https://x.com/{username}` (scroll) |
| Home | `https://x.com/home` |
| Search | `https://x.com/search?q={query}&f=live` |

### Selectors

Twitter uses `data-testid` attributes which are relatively stable.

#### Profile
```
Display Name:    [data-testid="UserName"] > div > div > span
Bio:             [data-testid="UserDescription"]
Location:        [data-testid="UserLocation"]
Website:         [data-testid="UserUrl"] a
Join Date:       [data-testid="UserJoinDate"]
Followers:       a[href$="/followers"] span
Following:       a[href$="/following"] span
Verified:        [data-testid="UserName"] svg[aria-label*="Verified"]
Profile Image:   [data-testid="UserAvatar"] img
```

#### Tweet
```
Container:       article[data-testid="tweet"]
Text:            [data-testid="tweetText"]
Author:          [data-testid="User-Name"]
Time:            time[datetime]
Reply Count:     [data-testid="reply"] span
Retweet Count:   [data-testid="retweet"] span
Like Count:      [data-testid="like"] span
View Count:      [data-testid="views"] span  (or aria-label containing "views")
Bookmark Count:  aria-label containing "bookmarks" (parsed from interaction metrics)
Quote Count:     aria-label containing "quotes" (parsed from interaction metrics)
Media:           [data-testid="tweetPhoto"] img
```

#### Search
```
Search Input:    [data-testid="SearchBox_Search_Input"]
Latest Tab:      a[href*="f=live"]
Results:         Same as tweet selectors
```

### Number Parsing

```typescript
function parseTwitterNumber(text: string): number {
  const cleaned = text.replace(/,/g, '').trim();
  if (cleaned.endsWith('K')) return Math.round(parseFloat(cleaned) * 1000);
  if (cleaned.endsWith('M')) return Math.round(parseFloat(cleaned) * 1000000);
  return parseInt(cleaned, 10) || 0;
}

// "12.5K" → 12500
// "1.2M" → 1200000
// "1,234" → 1234
```

### Tweet Type Detection

```typescript
function detectTweetType(article: Element): 'original' | 'retweet' | 'reply' {
  // Retweet indicator
  if (article.querySelector('[data-testid="socialContext"]')?.textContent?.includes('reposted')) {
    return 'retweet';
  }
  // Reply indicator (has "Replying to" text)
  if (article.querySelector('[data-testid="tweet"]')?.textContent?.includes('Replying to')) {
    return 'reply';
  }
  return 'original';
}
```

### Pagination

Infinite scroll:
```typescript
async function scrollForMore(page: Page, maxAttempts = 10): Promise<boolean> {
  let attempts = 0;
  let previousHeight = await page.evaluate(() => document.body.scrollHeight);

  while (attempts < maxAttempts) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight > previousHeight) {
      previousHeight = newHeight;
      attempts = 0; // Reset on success
      return true;
    }
    attempts++;
  }
  return false;
}
```

### Error Detection

```typescript
async function checkTwitterErrors(page: Page): Promise<string | null> {
  const content = await page.content();

  if (content.includes("This account doesn't exist")) return 'not_found';
  if (content.includes("Account suspended")) return 'suspended';
  if (content.includes("Rate limit exceeded")) return 'rate_limited';
  if (content.includes("Log in")) return 'login_required';

  return null;
}
```

### Rate Limits

- **Delay between navigations**: 1-2 seconds
- **Delay between scroll**: 1.5 seconds
- **Max consecutive requests**: ~10 before longer pause
- **On rate limit**: Wait 60 seconds

---

## LinkedIn Scraper

### URLs

| Page | URL Pattern |
|------|-------------|
| Profile | `https://www.linkedin.com/in/{slug}/` |
| Posts | `https://www.linkedin.com/in/{slug}/recent-activity/all/` |
| Search People | `https://www.linkedin.com/search/results/people/?keywords={query}` |
| Search Posts | `https://www.linkedin.com/search/results/content/?keywords={query}` |
| Search Companies | `https://www.linkedin.com/search/results/companies/?keywords={query}` |

### Selectors

LinkedIn uses BEM-style classes. Less stable than Twitter.

#### Profile
```
Name:            .pv-top-card h1
Headline:        .pv-top-card .text-body-medium
Location:        .pv-top-card .text-body-small:has(span.text-body-small)
Connections:     .pv-top-card--list-bullet li span
About:           #about ~ .display-flex .pv-shared-text-with-see-more span[aria-hidden="true"]

Experience Section:
Container:       #experience ~ .pvs-list__outer-container
Item:            li.artdeco-list__item
Title:           .display-flex .mr1 span[aria-hidden="true"]
Company:         .t-14.t-normal span[aria-hidden="true"]
Duration:        .pvs-entity__caption-wrapper

Education Section:
Container:       #education ~ .pvs-list__outer-container
School:          .display-flex .mr1 span[aria-hidden="true"]
Degree:          .t-14.t-normal span[aria-hidden="true"]

Skills Section:
Container:       #skills ~ .pvs-list__outer-container
Skill:           .hoverable-link-text span[aria-hidden="true"]
```

#### Posts
```
Container:       .feed-shared-update-v2
Author:          .feed-shared-actor__name span
Text:            .feed-shared-update-v2__description .break-words span
Time:            .feed-shared-actor__sub-description span (contains "ago")
Reactions:       .social-details-social-counts__reactions-count
Comments:        .social-details-social-counts__comments button span
```

#### Search Results
```
Container:       .reusable-search__result-container
Person Name:     .entity-result__title-text a span[aria-hidden="true"]
Headline:        .entity-result__primary-subtitle
Location:        .entity-result__secondary-subtitle
Connection:      .entity-result__badge-text span
```

### Duration Parsing

LinkedIn formats: `"Jan 2020 - Present · 4 yrs 2 mos"`

```typescript
function parseLinkedInDuration(text: string): { dateRange: string; duration: string } {
  const parts = text.split('·').map(s => s.trim());
  return {
    dateRange: parts[0] || '',
    duration: parts[1] || ''
  };
}
```

### Content Expansion

LinkedIn truncates long text with "see more" buttons:

```typescript
async function expandContent(page: Page) {
  const seeMoreButtons = await page.$$('button.inline-show-more-text__button');
  for (const button of seeMoreButtons) {
    await button.click();
    await page.waitForTimeout(300);
  }
}
```

### Error Detection

```typescript
async function checkLinkedInErrors(page: Page): Promise<string | null> {
  const content = await page.content();

  if (content.includes("Page not found")) return 'not_found';
  if (content.includes("unusual activity")) return 'rate_limited';
  if (content.includes("Sign in") && !content.includes("Sign out")) return 'login_required';
  if (content.includes("restricted")) return 'rate_limited';

  return null;
}
```

### Rate Limits

LinkedIn is more aggressive about rate limiting:

- **Delay between navigations**: 2-3 seconds
- **Delay between scroll**: 2 seconds
- **Max profiles per hour**: ~50
- **Human-like behavior**: Random delays 500-1500ms
- **On unusual activity warning**: Wait 10-15 minutes

---

## Generic Scraper

### Page Scraping

Extract structured content from any page:

```typescript
interface PageContent {
  url: string;
  title: string;
  text: string;
  links: Array<{ text: string; href: string }>;
  images: Array<{ alt: string; src: string }>;
}
```

### Content Detection

Priority order for main content:
1. `<main>` element
2. `<article>` element
3. `[role="main"]` element
4. `<body>` fallback

### Size Limits

Prevent overwhelming output:

| Content | Limit |
|---------|-------|
| Text | 100,000 characters |
| Links | 100 items |
| Images | 50 items |
| Script result | 1 MB |
| Screenshot | 5 MB |

### Text Extraction

```typescript
function extractText(element: Element): string {
  // Skip hidden elements
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return '';

  // Skip script/style
  if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) return '';

  // Get text content
  return element.textContent?.trim() || '';
}
```

### Link Extraction

```typescript
function extractLinks(root: Element): Array<{ text: string; href: string }> {
  const seen = new Set<string>();
  const links: Array<{ text: string; href: string }> = [];

  for (const anchor of root.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('http') || seen.has(href)) continue;

    seen.add(href);
    links.push({
      text: anchor.textContent?.trim() || '',
      href
    });
  }

  return links.slice(0, 100);
}
```

### Script Execution

Wrap user scripts in async IIFE for await support:

```typescript
async function executeScript(page: Page, script: string): Promise<unknown> {
  const wrapped = `(async () => { ${script} })()`;
  const result = await page.evaluate(wrapped);

  // Validate size
  const json = JSON.stringify(result);
  if (json.length > 1_000_000) {
    throw new Error('Script result exceeds 1MB limit');
  }

  return result;
}
```

---

## Common Patterns

### Human-like Delays

```typescript
async function humanDelay(min = 500, max = 1500): Promise<void> {
  const delay = min + Math.random() * (max - min);
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

### Navigation with Timeout

```typescript
async function navigateTo(page: Page, url: string, timeout = 30000): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (error) {
    if (error.message.includes('timeout')) {
      throw new Error('Navigation timeout');
    }
    throw error;
  }
}
```

### Wait for Selector

```typescript
async function waitForElement(page: Page, selector: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}
```
