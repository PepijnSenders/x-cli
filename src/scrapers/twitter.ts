/**
 * Twitter/X Scraper
 *
 * Extracts data from x.com using Playwright browser automation.
 * Requires user to be logged into Twitter in their browser.
 */

import type { Page } from 'playwright-core';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TwitterProfile {
  username: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  joinDate: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  profileImageUrl: string | null;
  bannerImageUrl: string | null;
}

export interface TwitterAuthor {
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  verified: boolean;
}

export interface TwitterMetrics {
  replies: number;
  retweets: number;
  likes: number;
  views: number;
}

export interface TwitterMedia {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnailUrl?: string;
}

export interface TwitterTweet {
  id: string;
  url: string;
  text: string;
  author: TwitterAuthor;
  createdAt: string;
  metrics: TwitterMetrics;
  media: TwitterMedia[];
  type: 'tweet' | 'retweet' | 'reply';
  quotedTweet: TwitterTweet | null;
  inReplyTo: string | null;
}

export interface TwitterTweetWithContext extends TwitterTweet {
  thread: TwitterTweet[];
  replies: TwitterTweet[];
}

export interface TwitterSearchResults {
  tweets: TwitterTweet[];
  hasMore: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TWITTER_BASE_URL = 'https://x.com';
const DEFAULT_TIMEOUT = 30000;
const SCROLL_DELAY = 1500;
const MAX_SCROLL_ATTEMPTS = 10;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse Twitter's compact number format (1.2K, 5.3M, etc.)
 */
export function parseTwitterNumber(text: string): number {
  if (!text || text.trim() === '') return 0;
  const cleaned = text.replace(/,/g, '').trim();
  if (cleaned.endsWith('K')) {
    return Math.round(parseFloat(cleaned) * 1000);
  }
  if (cleaned.endsWith('M')) {
    return Math.round(parseFloat(cleaned) * 1000000);
  }
  return parseInt(cleaned, 10) || 0;
}

/**
 * Add a human-like delay
 */
async function humanDelay(min = 500, max = 1500): Promise<void> {
  const delay = min + Math.random() * (max - min);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Load more content by scrolling
 */
async function loadMoreContent(page: Page): Promise<boolean> {
  const previousHeight = await page.evaluate(() => document.body.scrollHeight);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(SCROLL_DELAY);

  const newHeight = await page.evaluate(() => document.body.scrollHeight);
  return newHeight > previousHeight;
}

// ============================================================================
// Profile Scraper
// ============================================================================

/**
 * Scrape a Twitter profile by username
 */
export async function scrapeTwitterProfile(
  page: Page,
  username: string
): Promise<TwitterProfile> {
  // Navigate to profile
  const profileUrl = `${TWITTER_BASE_URL}/${username}`;
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });

  // Wait for profile to load
  await page.waitForSelector('[data-testid="UserName"]', { timeout: DEFAULT_TIMEOUT });

  // Check for error states
  const pageContent = await page.content();
  if (pageContent.includes("This account doesn't exist") || pageContent.includes("Account suspended")) {
    const errorType = pageContent.includes("suspended") ? "Account suspended" : "User not found";
    throw new Error(`${errorType}: @${username}`);
  }

  // Extract profile data
  const profile = await page.evaluate((uname) => {
    const parseNumber = (text: string): number => {
      if (!text || text.trim() === '') return 0;
      const cleaned = text.replace(/,/g, '').trim();
      if (cleaned.endsWith('K')) return Math.round(parseFloat(cleaned) * 1000);
      if (cleaned.endsWith('M')) return Math.round(parseFloat(cleaned) * 1000000);
      return parseInt(cleaned, 10) || 0;
    };

    const getText = (selector: string): string | null => {
      const el = document.querySelector(selector);
      return el?.textContent?.trim() || null;
    };


    // Display name - first span in UserName
    const userNameEl = document.querySelector('[data-testid="UserName"]');
    const displayName = userNameEl?.querySelector('span')?.textContent?.trim() || uname;

    // Bio
    const bio = getText('[data-testid="UserDescription"]');

    // Location
    const location = getText('[data-testid="UserLocation"] span');

    // Website
    const websiteEl = document.querySelector('[data-testid="UserUrl"] a');
    const website = websiteEl?.getAttribute('href') || null;

    // Join date
    const joinDate = getText('[data-testid="UserJoinDate"] span');

    // Follower/following counts
    const followersLink = document.querySelector('a[href$="/verified_followers"], a[href$="/followers"]');
    const followingLink = document.querySelector('a[href$="/following"]');
    const followersText = followersLink?.querySelector('span')?.textContent || '0';
    const followingText = followingLink?.querySelector('span')?.textContent || '0';

    // Profile image
    const profileImg = document.querySelector('[data-testid="UserAvatar-Container"] img');
    const profileImageUrl = profileImg?.getAttribute('src') || null;

    // Banner image
    const bannerImg = document.querySelector('a[href$="/header_photo"] img');
    const bannerImageUrl = bannerImg?.getAttribute('src') || null;

    // Verified badge
    const verifiedBadge = document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"], [data-testid="UserName"] svg[aria-label*="verified"]');
    const verified = !!verifiedBadge;

    return {
      username: uname,
      displayName,
      bio,
      location,
      website,
      joinDate,
      followersCount: parseNumber(followersText),
      followingCount: parseNumber(followingText),
      postsCount: 0, // Posts count is harder to reliably extract
      verified,
      profileImageUrl,
      bannerImageUrl,
    };
  }, username);

  return profile;
}

// ============================================================================
// Timeline Scraper
// ============================================================================

/**
 * Scrape tweets from a timeline (user timeline or home timeline)
 */
export async function scrapeTwitterTimeline(
  page: Page,
  username?: string,
  count: number = 20
): Promise<TwitterTweet[]> {
  // Cap count at 100 to avoid excessive scraping
  const maxCount = Math.min(count, 100);

  // Navigate to timeline
  const timelineUrl = username
    ? `${TWITTER_BASE_URL}/${username}`
    : `${TWITTER_BASE_URL}/home`;

  await page.goto(timelineUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });

  // Wait for tweets to load
  await page.waitForSelector('article[data-testid="tweet"]', { timeout: DEFAULT_TIMEOUT });
  await humanDelay();

  const tweets: TwitterTweet[] = [];
  const seenIds = new Set<string>();
  let scrollAttempts = 0;

  while (tweets.length < maxCount && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    // Extract tweets from current view
    const newTweets = await page.evaluate(() => {
      const parseNumber = (text: string): number => {
        if (!text || text.trim() === '') return 0;
        const cleaned = text.replace(/,/g, '').trim();
        if (cleaned.endsWith('K')) return Math.round(parseFloat(cleaned) * 1000);
        if (cleaned.endsWith('M')) return Math.round(parseFloat(cleaned) * 1000000);
        return parseInt(cleaned, 10) || 0;
      };

      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const results: TwitterTweet[] = [];

      articles.forEach((article) => {
        try {
          // Get tweet link to extract ID
          const tweetLink = article.querySelector('a[href*="/status/"]');
          const href = tweetLink?.getAttribute('href') || '';
          const idMatch = href.match(/\/status\/(\d+)/);
          if (!idMatch) return;

          const id = idMatch[1];
          const url = `https://x.com${href.split('?')[0]}`;

          // Author info
          const authorNameEl = article.querySelector('[data-testid="User-Name"]');
          const authorName = authorNameEl?.querySelector('span')?.textContent?.trim() || '';
          const authorUsernameEl = article.querySelector('[data-testid="User-Name"] a[tabindex="-1"]');
          const authorUsername = authorUsernameEl?.textContent?.replace('@', '').trim() || '';
          const authorAvatar = article.querySelector('[data-testid="Tweet-User-Avatar"] img')?.getAttribute('src') || null;
          const authorVerified = !!article.querySelector('[data-testid="User-Name"] svg[aria-label*="Verified"], [data-testid="User-Name"] svg[aria-label*="verified"]');

          // Tweet text
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const text = textEl?.textContent?.trim() || '';

          // Time
          const timeEl = article.querySelector('time');
          const createdAt = timeEl?.getAttribute('datetime') || new Date().toISOString();

          // Metrics
          const replyEl = article.querySelector('[data-testid="reply"] span');
          const retweetEl = article.querySelector('[data-testid="retweet"] span');
          const likeEl = article.querySelector('[data-testid="like"] span');
          const viewEl = article.querySelector('a[href$="/analytics"] span');

          // Media
          const media: TwitterMedia[] = [];
          const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
          images.forEach((img) => {
            const src = img.getAttribute('src');
            if (src) {
              media.push({ type: 'image', url: src });
            }
          });
          const videoPlayer = article.querySelector('[data-testid="videoPlayer"]');
          if (videoPlayer) {
            media.push({ type: 'video', url: '' }); // Video URL is complex to extract
          }

          // Tweet type
          const socialContext = article.querySelector('[data-testid="socialContext"]');
          let tweetType: 'tweet' | 'retweet' | 'reply' = 'tweet';
          if (socialContext?.textContent?.toLowerCase().includes('repost')) {
            tweetType = 'retweet';
          }

          results.push({
            id,
            url,
            text,
            author: {
              username: authorUsername,
              displayName: authorName,
              profileImageUrl: authorAvatar,
              verified: authorVerified,
            },
            createdAt,
            metrics: {
              replies: parseNumber(replyEl?.textContent || '0'),
              retweets: parseNumber(retweetEl?.textContent || '0'),
              likes: parseNumber(likeEl?.textContent || '0'),
              views: parseNumber(viewEl?.textContent || '0'),
            },
            media,
            type: tweetType,
            quotedTweet: null,
            inReplyTo: null,
          });
        } catch {
          // Skip malformed tweets
        }
      });

      return results;
    });

    // Add new tweets (avoiding duplicates)
    for (const tweet of newTweets) {
      if (!seenIds.has(tweet.id) && tweets.length < maxCount) {
        seenIds.add(tweet.id);
        tweets.push(tweet);
      }
    }

    // If we have enough tweets, stop
    if (tweets.length >= maxCount) break;

    // Try to load more
    const hasMore = await loadMoreContent(page);
    if (!hasMore) {
      scrollAttempts++;
    } else {
      scrollAttempts = 0; // Reset on successful scroll
    }

    await humanDelay(800, 1200);
  }

  return tweets.slice(0, maxCount);
}

// ============================================================================
// Post Scraper
// ============================================================================

/**
 * Scrape a specific tweet by URL, including thread context and replies
 */
export async function scrapeTwitterPost(
  page: Page,
  url: string
): Promise<TwitterTweetWithContext> {
  // Validate URL
  if (!url.includes('/status/')) {
    throw new Error('Invalid tweet URL. Expected format: https://x.com/user/status/123');
  }

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });

  // Wait for main tweet to load
  await page.waitForSelector('article[data-testid="tweet"]', { timeout: DEFAULT_TIMEOUT });
  await humanDelay();

  const result = await page.evaluate((tweetUrl) => {
    const parseNumber = (text: string): number => {
      if (!text || text.trim() === '') return 0;
      const cleaned = text.replace(/,/g, '').trim();
      if (cleaned.endsWith('K')) return Math.round(parseFloat(cleaned) * 1000);
      if (cleaned.endsWith('M')) return Math.round(parseFloat(cleaned) * 1000000);
      return parseInt(cleaned, 10) || 0;
    };

    const extractTweet = (article: Element): TwitterTweet | null => {
      try {
        const tweetLink = article.querySelector('a[href*="/status/"]');
        const href = tweetLink?.getAttribute('href') || '';
        const idMatch = href.match(/\/status\/(\d+)/);
        if (!idMatch) return null;

        const id = idMatch[1];
        const url = `https://x.com${href.split('?')[0]}`;

        const authorNameEl = article.querySelector('[data-testid="User-Name"]');
        const authorName = authorNameEl?.querySelector('span')?.textContent?.trim() || '';
        const authorUsernameEl = article.querySelector('[data-testid="User-Name"] a[tabindex="-1"]');
        const authorUsername = authorUsernameEl?.textContent?.replace('@', '').trim() || '';
        const authorAvatar = article.querySelector('[data-testid="Tweet-User-Avatar"] img')?.getAttribute('src') || null;
        const authorVerified = !!article.querySelector('[data-testid="User-Name"] svg[aria-label*="Verified"]');

        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl?.textContent?.trim() || '';

        const timeEl = article.querySelector('time');
        const createdAt = timeEl?.getAttribute('datetime') || new Date().toISOString();

        const replyEl = article.querySelector('[data-testid="reply"] span');
        const retweetEl = article.querySelector('[data-testid="retweet"] span');
        const likeEl = article.querySelector('[data-testid="like"] span');
        const viewEl = article.querySelector('a[href$="/analytics"] span');

        const media: TwitterMedia[] = [];
        const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
        images.forEach((img) => {
          const src = img.getAttribute('src');
          if (src) media.push({ type: 'image', url: src });
        });

        return {
          id,
          url,
          text,
          author: {
            username: authorUsername,
            displayName: authorName,
            profileImageUrl: authorAvatar,
            verified: authorVerified,
          },
          createdAt,
          metrics: {
            replies: parseNumber(replyEl?.textContent || '0'),
            retweets: parseNumber(retweetEl?.textContent || '0'),
            likes: parseNumber(likeEl?.textContent || '0'),
            views: parseNumber(viewEl?.textContent || '0'),
          },
          media,
          type: 'tweet' as const,
          quotedTweet: null,
          inReplyTo: null,
        };
      } catch {
        return null;
      }
    };

    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const tweets: (TwitterTweet | null)[] = [];

    articles.forEach((article) => {
      tweets.push(extractTweet(article));
    });

    const validTweets = tweets.filter((t): t is TwitterTweet => t !== null);

    // Find the main tweet (the one matching our URL)
    const urlIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    const targetId = urlIdMatch ? urlIdMatch[1] : '';

    const mainTweetIndex = validTweets.findIndex(t => t.id === targetId);
    const mainTweet = mainTweetIndex >= 0 ? validTweets[mainTweetIndex] : validTweets[0];

    // Thread = tweets before main tweet, Replies = tweets after
    const thread = mainTweetIndex > 0 ? validTweets.slice(0, mainTweetIndex) : [];
    const replies = mainTweetIndex >= 0 ? validTweets.slice(mainTweetIndex + 1) : validTweets.slice(1);

    return {
      mainTweet,
      thread,
      replies: replies.slice(0, 10), // Limit replies
    };
  }, url);

  if (!result.mainTweet) {
    throw new Error('Could not find the main tweet');
  }

  return {
    ...result.mainTweet,
    thread: result.thread,
    replies: result.replies,
  };
}

// ============================================================================
// Search Scraper
// ============================================================================

/**
 * Search Twitter for tweets matching a query
 */
export async function scrapeTwitterSearch(
  page: Page,
  query: string,
  count: number = 20
): Promise<TwitterSearchResults> {
  const maxCount = Math.min(count, 100);

  // Navigate to search
  const searchUrl = `${TWITTER_BASE_URL}/search?q=${encodeURIComponent(query)}&f=live`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });

  // Wait for results
  try {
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: DEFAULT_TIMEOUT });
  } catch {
    // No results found
    return { tweets: [], hasMore: false };
  }

  await humanDelay();

  // Reuse timeline scraping logic
  const tweets: TwitterTweet[] = [];
  const seenIds = new Set<string>();
  let scrollAttempts = 0;

  while (tweets.length < maxCount && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    const newTweets = await page.evaluate(() => {
      const parseNumber = (text: string): number => {
        if (!text || text.trim() === '') return 0;
        const cleaned = text.replace(/,/g, '').trim();
        if (cleaned.endsWith('K')) return Math.round(parseFloat(cleaned) * 1000);
        if (cleaned.endsWith('M')) return Math.round(parseFloat(cleaned) * 1000000);
        return parseInt(cleaned, 10) || 0;
      };

      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const results: TwitterTweet[] = [];

      articles.forEach((article) => {
        try {
          const tweetLink = article.querySelector('a[href*="/status/"]');
          const href = tweetLink?.getAttribute('href') || '';
          const idMatch = href.match(/\/status\/(\d+)/);
          if (!idMatch) return;

          const id = idMatch[1];
          const url = `https://x.com${href.split('?')[0]}`;

          const authorNameEl = article.querySelector('[data-testid="User-Name"]');
          const authorName = authorNameEl?.querySelector('span')?.textContent?.trim() || '';
          const authorUsernameEl = article.querySelector('[data-testid="User-Name"] a[tabindex="-1"]');
          const authorUsername = authorUsernameEl?.textContent?.replace('@', '').trim() || '';
          const authorAvatar = article.querySelector('[data-testid="Tweet-User-Avatar"] img')?.getAttribute('src') || null;
          const authorVerified = !!article.querySelector('[data-testid="User-Name"] svg[aria-label*="Verified"]');

          const textEl = article.querySelector('[data-testid="tweetText"]');
          const text = textEl?.textContent?.trim() || '';

          const timeEl = article.querySelector('time');
          const createdAt = timeEl?.getAttribute('datetime') || new Date().toISOString();

          const replyEl = article.querySelector('[data-testid="reply"] span');
          const retweetEl = article.querySelector('[data-testid="retweet"] span');
          const likeEl = article.querySelector('[data-testid="like"] span');
          const viewEl = article.querySelector('a[href$="/analytics"] span');

          const media: TwitterMedia[] = [];
          const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
          images.forEach((img) => {
            const src = img.getAttribute('src');
            if (src) media.push({ type: 'image', url: src });
          });

          results.push({
            id,
            url,
            text,
            author: {
              username: authorUsername,
              displayName: authorName,
              profileImageUrl: authorAvatar,
              verified: authorVerified,
            },
            createdAt,
            metrics: {
              replies: parseNumber(replyEl?.textContent || '0'),
              retweets: parseNumber(retweetEl?.textContent || '0'),
              likes: parseNumber(likeEl?.textContent || '0'),
              views: parseNumber(viewEl?.textContent || '0'),
            },
            media,
            type: 'tweet' as const,
            quotedTweet: null,
            inReplyTo: null,
          });
        } catch {
          // Skip malformed tweets
        }
      });

      return results;
    });

    for (const tweet of newTweets) {
      if (!seenIds.has(tweet.id) && tweets.length < maxCount) {
        seenIds.add(tweet.id);
        tweets.push(tweet);
      }
    }

    if (tweets.length >= maxCount) break;

    const hasMore = await loadMoreContent(page);
    if (!hasMore) {
      scrollAttempts++;
    } else {
      scrollAttempts = 0;
    }

    await humanDelay(800, 1200);
  }

  return {
    tweets: tweets.slice(0, maxCount),
    hasMore: scrollAttempts < MAX_SCROLL_ATTEMPTS,
  };
}

// ============================================================================
// Legacy exports for compatibility
// ============================================================================

export function parseTwitterDate(timeElement: Element): string {
  const datetime = timeElement.getAttribute('datetime');
  if (datetime) return datetime;
  return new Date().toISOString();
}

export function detectTweetType(article: Element): 'tweet' | 'retweet' | 'reply' {
  const socialContext = article.querySelector('[data-testid="socialContext"]');
  if (socialContext?.textContent?.includes('reposted')) {
    return 'retweet';
  }
  const replyContext = article.querySelector('[data-testid="tweet"] > div:first-child');
  if (replyContext?.textContent?.includes('Replying to')) {
    return 'reply';
  }
  return 'tweet';
}

export async function loadMoreTweets(page: Page): Promise<boolean> {
  return loadMoreContent(page);
}
