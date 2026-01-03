/**
 * Twitter scraper
 * Extracts profile information from Twitter/X pages
 */

import type { Page } from 'playwright-core';
import type {
  TwitterProfile,
  TwitterTweet,
  TwitterSearchResults,
  TwitterAuthor,
  TwitterMetrics,
  TwitterTweetType,
  PlatformErrorType,
  TwitterPost,
  TwitterTimeline,
  TwitterList,
  TwitterListTimeline
} from '../types.js';
import { parseTwitterNumber, cleanText } from '../utils/index.js';
import {
  humanDelay as commonHumanDelay,
  waitForElement as commonWaitForElement
} from './common.js';

// Re-export parseTwitterNumber for convenience as per spec
export { parseTwitterNumber };

// Re-export common utilities for backwards compatibility
export const humanDelay = commonHumanDelay;
export const waitForElement = commonWaitForElement;

// ============================================================================
// Constants & Configuration
// ============================================================================

/**
 * Twitter DOM selectors using data-testid attributes
 */
export const SELECTORS = {
  // Profile selectors
  profile: {
    displayName: '[data-testid="UserName"] > div > div > span',
    bio: '[data-testid="UserDescription"]',
    location: '[data-testid="UserLocation"]',
    website: '[data-testid="UserUrl"] a',
    joinDate: '[data-testid="UserJoinDate"]',
    followers: 'a[href$="/verified_followers"] span, a[href$="/followers"] span',
    following: 'a[href$="/following"] span',
    verified: '[data-testid="UserName"] svg[aria-label*="Verified"]',
    profileImage: '[data-testid="UserAvatar"] img',
    postsCount: 'div[data-testid="primaryColumn"] nav a[href$="with_replies"] span'
  },

  // Tweet selectors
  tweet: {
    container: 'article[data-testid="tweet"]',
    text: '[data-testid="tweetText"]',
    author: '[data-testid="User-Name"]',
    time: 'time[datetime]',
    replyCount: '[data-testid="reply"]',
    retweetCount: '[data-testid="retweet"]',
    likeCount: '[data-testid="like"]',
    viewCount: '[data-testid="views"]',
    media: '[data-testid="tweetPhoto"] img, [data-testid="videoPlayer"]',
    socialContext: '[data-testid="socialContext"]'
  },

  // Search selectors
  search: {
    input: '[data-testid="SearchBox_Search_Input"]',
    latestTab: 'a[href*="f=live"]'
  }
} as const;

/**
 * Rate limit configuration for Twitter
 */
export const RATE_LIMITS = {
  navigationDelay: 1500, // 1-2 seconds between navigations
  scrollDelay: 1500, // 1.5 seconds between scrolls
  maxConsecutiveRequests: 10,
  rateLimitPause: 60000 // 60 seconds on rate limit
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect if a tweet is part of a thread based on text patterns and DOM indicators
 *
 * @param text - Tweet text content
 * @param article - Tweet article element
 * @returns True if tweet is part of a thread
 */
export function detectThreadIndicators(text: string, article: Element): boolean {
  // Check for common thread numbering patterns
  const threadPatterns = [
    /^\d+[/\.]\d+/,           // "1/5", "1.5", "2/10"
    /^\d+\/\s/,               // "1/ " (number, slash, space)
    /^\(\d+[/\.]\d+\)/,       // "(1/5)", "(2.3)"
    /thread:/i,               // "Thread:", "THREAD:"
    /🧵/,                     // Thread emoji
  ];

  for (const pattern of threadPatterns) {
    if (pattern.test(text.trim())) {
      return true;
    }
  }

  // Check for "Show this thread" link which indicates thread context
  const showThreadLink = article.querySelector('a[href*="/status/"][role="link"]');
  if (showThreadLink?.textContent?.toLowerCase().includes('show this thread')) {
    return true;
  }

  // Check for thread indicator card
  const threadCard = article.querySelector('[data-testid="card.layoutLarge.detail"]');
  if (threadCard) {
    return true;
  }

  // Check for "Show more" in the same tweet (self-thread continuation)
  const showMoreButton = article.querySelector('[data-testid="tweet"] [role="button"]');
  if (showMoreButton?.textContent?.toLowerCase().includes('show more')) {
    return true;
  }

  return false;
}

/**
 * Detect tweet type based on DOM indicators
 *
 * @param article - Tweet article element
 * @param text - Tweet text content (for thread detection)
 * @param authorUsername - Author's username (for self-reply detection)
 * @returns Tweet type classification
 */
export function detectTweetType(
  article: Element,
  text: string = '',
  authorUsername: string = ''
): TwitterTweetType {
  // Check for retweet indicator (highest priority)
  const socialContext = article.querySelector(SELECTORS.tweet.socialContext);
  if (socialContext?.textContent?.includes('reposted')) {
    return 'retweet';
  }

  // Check for reply indicator
  const tweetContent = article.querySelector('[data-testid="tweet"]');
  const isReply = tweetContent?.textContent?.includes('Replying to');

  if (isReply) {
    // Check if it's a self-reply (thread continuation) vs reply to someone else
    const replyingToText = tweetContent?.textContent || '';
    const replyingToMatch = replyingToText.match(/Replying to @(\w+)/);

    if (replyingToMatch) {
      const replyingToUsername = replyingToMatch[1];

      // If replying to self AND has thread indicators, it's a thread
      if (replyingToUsername === authorUsername && detectThreadIndicators(text, article)) {
        return 'thread';
      }

      // If replying to self but no explicit thread indicators, still mark as thread
      if (replyingToUsername === authorUsername) {
        return 'thread';
      }
    }

    // Reply to someone else
    return 'reply';
  }

  // Check for thread indicators on original tweets
  if (detectThreadIndicators(text, article)) {
    return 'thread';
  }

  return 'original';
}


/**
 * Check for Twitter-specific error states
 *
 * @param page - Playwright page instance
 * @returns Error type if detected, null otherwise
 */
export async function checkTwitterErrors(page: Page): Promise<PlatformErrorType | null> {
  const content = await page.content();

  if (content.includes("This account doesn't exist")) {
    return 'not_found';
  }

  if (content.includes("Account suspended")) {
    return 'suspended';
  }

  // Check for private/protected accounts
  if (content.includes("These posts are protected") ||
      content.includes("This account is private")) {
    return 'private_account';
  }

  // Check for blocked users
  if (content.includes("You're blocked") ||
      content.includes("You are blocked")) {
    return 'blocked';
  }

  // Check for deleted/unavailable posts
  if (content.includes("This post is unavailable") ||
      content.includes("doesn't exist") ||
      content.includes("page doesn't exist")) {
    return 'not_found';
  }

  if (content.includes("Rate limit exceeded")) {
    return 'rate_limited';
  }

  if (content.includes("Log in") && content.includes("Sign up")) {
    return 'login_required';
  }

  return null;
}

// ============================================================================
// Main Extraction Functions
// ============================================================================

/**
 * Extract Twitter profile information from a profile page.
 *
 * Must be called on a page already navigated to https://x.com/{username}
 *
 * @param page - Playwright page instance on Twitter profile
 * @returns TwitterProfile with extracted data
 */
export async function extractProfile(page: Page): Promise<TwitterProfile> {
  // Wait for profile to load
  await page.waitForSelector('[data-testid="UserName"]', { timeout: 10000 });

  // Extract all profile data in browser context
  const profileData = await page.evaluate(() => {
    // Helper: Get text content safely
    function getText(selector: string): string {
      const element = document.querySelector(selector);
      return element?.textContent?.trim() || '';
    }

    // Helper: Check if element exists
    function exists(selector: string): boolean {
      return document.querySelector(selector) !== null;
    }

    // Extract username from URL
    const url = window.location.href;
    const usernameMatch = url.match(/x\.com\/([^/?]+)/);
    const username = usernameMatch ? usernameMatch[1] : '';

    // Display name - first span in UserName testid
    const displayName = getText('[data-testid="UserName"] > div > div > span');

    // Bio
    const bio = getText('[data-testid="UserDescription"]');

    // Location
    const location = getText('[data-testid="UserLocation"]');

    // Website
    const websiteElement = document.querySelector('[data-testid="UserUrl"] a');
    const website = websiteElement ? (websiteElement as HTMLAnchorElement).href : '';

    // Join date
    const joinDateElement = document.querySelector('[data-testid="UserJoinDate"]');
    const joinDateText = joinDateElement?.textContent?.trim() || '';
    // Extract date from "Joined January 2020" format
    const joinDateMatch = joinDateText.match(/Joined\s+(.+)/i);
    const joinDate = joinDateMatch ? joinDateMatch[1] : joinDateText;

    // Followers count
    const followersElement = document.querySelector('a[href$="/verified_followers"] span, a[href$="/followers"] span');
    const followersText = followersElement?.textContent?.trim() || '0';

    // Following count
    const followingElement = document.querySelector('a[href$="/following"] span');
    const followingText = followingElement?.textContent?.trim() || '0';

    // Posts count - this is typically in the profile header, harder to get reliably
    // Try to find it in various possible locations
    let postsText = '0';
    const possiblePostsSelectors = [
      '[data-testid="UserTweets"] span',
      'div[role="tablist"] a:first-child span'
    ];
    for (const selector of possiblePostsSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        const text = element.textContent.trim();
        // Check if it's a number-like value
        if (/^[\d,KMB.]+$/.test(text)) {
          postsText = text;
          break;
        }
      }
    }

    // Verified badge
    const verified = exists('[data-testid="UserName"] svg[aria-label*="Verified"]');

    // Profile image
    const profileImageElement = document.querySelector('[data-testid="UserAvatar"] img');
    const profileImageUrl = profileImageElement ? (profileImageElement as HTMLImageElement).src : '';

    return {
      username,
      displayName,
      bio,
      location,
      website,
      joinDate,
      followersText,
      followingText,
      postsText,
      verified,
      profileImageUrl
    };
  });

  // Parse the join date to ISO format
  let joinDateISO = '';
  if (profileData.joinDate) {
    try {
      // Parse "January 2020" or "Jan 15, 2020" format
      const parsed = new Date(profileData.joinDate);
      if (!isNaN(parsed.getTime())) {
        joinDateISO = parsed.toISOString().split('T')[0]; // YYYY-MM-DD format
      } else {
        joinDateISO = profileData.joinDate; // Fallback to original text
      }
    } catch {
      joinDateISO = profileData.joinDate; // Fallback to original text
    }
  }

  // Build the final profile object with parsed numbers
  const profile: TwitterProfile = {
    username: profileData.username,
    displayName: cleanText(profileData.displayName),
    bio: cleanText(profileData.bio),
    location: cleanText(profileData.location),
    website: profileData.website,
    joinDate: joinDateISO,
    followersCount: parseTwitterNumber(profileData.followersText),
    followingCount: parseTwitterNumber(profileData.followingText),
    postsCount: parseTwitterNumber(profileData.postsText),
    verified: profileData.verified,
    profileImageUrl: profileData.profileImageUrl
  };

  return profile;
}

/**
 * Navigate to a Twitter profile and wait for it to load.
 *
 * @param page - Playwright page instance
 * @param username - Twitter username (without @)
 * @param timeout - Navigation timeout in milliseconds
 */
export async function navigateToProfile(
  page: Page,
  username: string,
  timeout = 30000
): Promise<void> {
  const url = `https://x.com/${username}`;

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Navigation timeout');
    }
    throw error;
  }
}

/**
 * Scroll page to load more tweets with verification of new content.
 * Returns true if new content was loaded (verified by tweet count increase).
 *
 * @param page - Playwright page instance
 * @param maxAttempts - Maximum scroll attempts without new content
 * @returns True if new tweets were loaded (at least 1 new tweet on page)
 */
export async function scrollForMore(
  page: Page,
  maxAttempts = 3
): Promise<boolean> {
  let attempts = 0;
  let previousHeight = await page.evaluate(() => document.body.scrollHeight);

  while (attempts < maxAttempts) {
    // Get current tweet count on page before scrolling
    const tweetCountBefore = await page.evaluate(() => {
      return document.querySelectorAll('article[data-testid="tweet"]').length;
    });

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait for content to load
    await page.waitForTimeout(1500);

    // Check if height changed
    const newHeight = await page.evaluate(() => document.body.scrollHeight);

    // Get tweet count after scroll
    const tweetCountAfter = await page.evaluate(() => {
      return document.querySelectorAll('article[data-testid="tweet"]').length;
    });

    // Success if:
    // 1. Height changed (content loaded), AND
    // 2. At least 1 new tweet appeared on the page
    if (newHeight > previousHeight && tweetCountAfter > tweetCountBefore) {
      return true;
    }

    // If height changed but no new tweets, update height and continue
    if (newHeight > previousHeight) {
      previousHeight = newHeight;
    }

    attempts++;
  }

  return false;
}

/**
 * Extract tweet data from tweet article elements on the page.
 *
 * @param page - Playwright page instance
 * @returns Array of extracted tweets
 */
export async function extractTweets(page: Page): Promise<TwitterTweet[]> {
  return page.evaluate(() => {
    const tweets: TwitterTweet[] = [];
    const articles = document.querySelectorAll('article[data-testid="tweet"]');

    for (const article of articles) {
      try {
        // Extract tweet ID from URL
        const linkEl = article.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
        if (!linkEl) continue;

        const url = linkEl.href;
        const idMatch = url.match(/\/status\/(\d+)/);
        if (!idMatch) continue;

        const id = idMatch[1];

        // Extract text
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl?.textContent?.trim() || '';

        // Extract author info
        const userNameEl = article.querySelector('[data-testid="User-Name"]');
        const authorText = userNameEl?.textContent || '';

        // Parse username from author text (format: "Display Name @username · time")
        const usernameMatch = authorText.match(/@(\w+)/);
        const username = usernameMatch ? usernameMatch[1] : '';

        // Display name is before the @ symbol
        const displayName = authorText.split('@')[0]?.trim() || username;

        // Check if verified
        const verified = !!article.querySelector('[data-testid="User-Name"] svg[aria-label*="Verified"]');

        // Extract profile image
        const profileImgEl = article.querySelector('img[alt][src*="profile"]') as HTMLImageElement;
        const profileImageUrl = profileImgEl?.src || '';

        const author: TwitterAuthor = {
          username,
          displayName,
          verified,
          profileImageUrl
        };

        // Extract timestamp
        const timeEl = article.querySelector('time[datetime]') as HTMLTimeElement;
        const createdAt = timeEl?.getAttribute('datetime') || new Date().toISOString();

        // Extract metrics
        const replyEl = article.querySelector('[data-testid="reply"]');
        const retweetEl = article.querySelector('[data-testid="retweet"]');
        const likeEl = article.querySelector('[data-testid="like"]');

        // Helper to parse number from element
        const parseMetric = (el: Element | null): number => {
          if (!el) return 0;
          const text = el.getAttribute('aria-label') || el.textContent || '0';
          const numMatch = text.match(/[\d,\.]+[KMB]?/);
          if (!numMatch) return 0;

          const cleaned = numMatch[0].replace(/,/g, '');
          if (cleaned.endsWith('K')) return Math.round(parseFloat(cleaned) * 1000);
          if (cleaned.endsWith('M')) return Math.round(parseFloat(cleaned) * 1000000);
          if (cleaned.endsWith('B')) return Math.round(parseFloat(cleaned) * 1000000000);
          return parseInt(cleaned, 10) || 0;
        };

        // Try to extract views count from various possible locations
        let views = 0;
        const viewsSelectors = [
          '[aria-label*="Views"]',
          '[aria-label*="views"]',
          '[data-testid="app-text-transition-container"]'
        ];

        for (const selector of viewsSelectors) {
          const viewsEl = article.querySelector(selector);
          if (viewsEl) {
            views = parseMetric(viewsEl);
            if (views > 0) break;
          }
        }

        // Extract bookmarks and quotes from aria-label
        let bookmarks: number | undefined = undefined;
        let quotes: number | undefined = undefined;

        // Look for elements with aria-label containing interaction metrics
        const interactionElements = article.querySelectorAll('[aria-label]');
        for (const el of interactionElements) {
          const label = el.getAttribute('aria-label');
          if (label && /(replies|reposts|likes|bookmarks|quotes|views)/.test(label.toLowerCase())) {
            // Extract bookmarks: "3 bookmarks" or "3 Bookmarks"
            const bookmarkMatch = label.match(/(\d+)\s+bookmarks?/i);
            if (bookmarkMatch) {
              bookmarks = parseMetric(el);
            }

            // Extract quotes: "5 quotes" or "5 Quotes"
            const quoteMatch = label.match(/(\d+)\s+quotes?/i);
            if (quoteMatch) {
              quotes = parseMetric(el);
            }
          }
        }

        const metrics: TwitterMetrics = {
          replies: parseMetric(replyEl),
          retweets: parseMetric(retweetEl),
          likes: parseMetric(likeEl),
          views,
          ...(bookmarks !== undefined && { bookmarks }),
          ...(quotes !== undefined && { quotes })
        };

        // Detect tweet type using the comprehensive detection function
        const type = detectTweetType(article, text, username);

        // Extract media
        const media: Array<{ type: 'photo' | 'video' | 'gif'; url: string; thumbnailUrl?: string; alt?: string }> = [];

        // Extract photos
        const photoEls = article.querySelectorAll('[data-testid="tweetPhoto"] img');
        for (const img of photoEls) {
          const imgEl = img as HTMLImageElement;
          if (imgEl.src && !imgEl.src.includes('profile')) {
            media.push({
              type: 'photo',
              url: imgEl.src,
              alt: imgEl.alt
            });
          }
        }

        // Extract videos and GIFs
        const videoPlayers = article.querySelectorAll('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
        for (const player of videoPlayers) {
          // Try to get video thumbnail from poster image
          const posterImg = player.querySelector('img') as HTMLImageElement | null;
          const videoEl = player.querySelector('video') as HTMLVideoElement | null;

          // Determine if it's a GIF (typically has autoplay, loop, and muted attributes)
          const isGif = videoEl?.hasAttribute('autoplay') &&
                       videoEl?.hasAttribute('loop') &&
                       videoEl?.hasAttribute('muted');

          // Get video URL from video element or fallback to thumbnail
          const videoUrl = videoEl?.src || videoEl?.querySelector('source')?.src || '';
          const thumbnailUrl = posterImg?.src || videoEl?.poster || '';

          if (videoUrl || thumbnailUrl) {
            media.push({
              type: isGif ? 'gif' : 'video',
              url: videoUrl || thumbnailUrl,
              thumbnailUrl: thumbnailUrl || undefined,
              alt: posterImg?.alt
            });
          }
        }

        tweets.push({
          id,
          text,
          author,
          createdAt,
          metrics,
          type,
          media,
          url,
          isThread: type === 'thread'
        });
      } catch (err) {
        // Skip tweets that fail to parse
        console.error('Failed to parse tweet:', err);
        continue;
      }
    }

    return tweets;
  });
}

/**
 * Extract search results from Twitter search page.
 * Handles scrolling to get the requested count.
 *
 * @param page - Playwright page instance
 * @param query - Search query
 * @param count - Number of tweets to retrieve
 * @returns TwitterSearchResults with tweets and metadata
 */
export async function extractSearchResults(
  page: Page,
  query: string,
  count: number = 20
): Promise<TwitterSearchResults> {
  const tweets: TwitterTweet[] = [];
  const seenIds = new Set<string>();
  let attempts = 0;
  const maxAttempts = 10;

  // Wait for initial results to load
  try {
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });
  } catch {
    // No results found
    return {
      query,
      tweets: [],
      hasMore: false
    };
  }

  // Extract tweets and scroll until we have enough
  while (tweets.length < count && attempts < maxAttempts) {
    // Track previous count to detect if we got new tweets
    const previousCount = tweets.length;

    // Extract current tweets
    const currentTweets = await extractTweets(page);

    // Add new unique tweets
    for (const tweet of currentTweets) {
      if (!seenIds.has(tweet.id)) {
        seenIds.add(tweet.id);
        tweets.push(tweet);
      }
    }

    // If we have enough, stop
    if (tweets.length >= count) {
      break;
    }

    // Check if we got new tweets
    const gotNewTweets = tweets.length > previousCount;

    // Try to scroll for more
    const hasMore = await scrollForMore(page, 3);
    if (!hasMore) {
      // If no scroll success AND no new tweets, increment attempts
      if (!gotNewTweets) {
        attempts++;
      }
    } else {
      attempts = 0; // Reset on successful scroll
    }

    // Add delay to be respectful
    await page.waitForTimeout(500);
  }

  return {
    query,
    tweets: tweets.slice(0, count),
    hasMore: attempts < maxAttempts
  };
}

/**
 * Collect tweets from timeline until target count is reached.
 * Handles pagination via infinite scroll with proper deduplication.
 *
 * @param page - Playwright page instance (should already be on timeline)
 * @param targetCount - Number of tweets to collect (max 100)
 * @param maxScrollAttempts - Maximum scroll attempts
 * @returns Object with tweets array and hasMore flag
 */
export async function collectTimelineTweets(
  page: Page,
  targetCount: number,
  maxScrollAttempts = 20
): Promise<{ tweets: TwitterTweet[]; hasMore: boolean }> {
  const tweets: TwitterTweet[] = [];
  const seenIds = new Set<string>();
  let scrollAttempts = 0;
  let hasMore = true;
  let consecutiveFailedScrolls = 0;

  // Wait for initial tweets to load
  try {
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });
  } catch (error) {
    throw new Error('No tweets found on page. The page may have failed to load or login may be required.');
  }

  while (tweets.length < targetCount && scrollAttempts < maxScrollAttempts) {
    // Track how many tweets we had before extracting
    const previousTweetCount = tweets.length;

    // Extract tweets from current view
    const newTweets = await extractTweets(page);

    // Add new unique tweets
    for (const tweet of newTweets) {
      if (!seenIds.has(tweet.id)) {
        seenIds.add(tweet.id);
        tweets.push(tweet);

        if (tweets.length >= targetCount) {
          break;
        }
      }
    }

    // If we have enough, stop
    if (tweets.length >= targetCount) {
      break;
    }

    // Check if we actually got new tweets this iteration
    const gotNewTweets = tweets.length > previousTweetCount;

    // Try to scroll for more
    const scrolledMore = await scrollForMore(page, 3);

    if (!scrolledMore) {
      consecutiveFailedScrolls++;

      // If scroll failed AND we didn't get new tweets, we're likely at the end
      if (!gotNewTweets) {
        hasMore = false;
        break;
      }

      // Allow a few failed scrolls if we're still getting new tweets from the page
      // (Sometimes tweets load without scroll, or duplicates filter out)
      if (consecutiveFailedScrolls >= 3) {
        hasMore = false;
        break;
      }
    } else {
      // Reset counter on successful scroll
      consecutiveFailedScrolls = 0;
    }

    scrollAttempts++;

    // Add delay to respect rate limits (1-2 seconds per spec)
    await humanDelay(1000, 2000);
  }

  // Trim to exact count
  const finalTweets = tweets.slice(0, targetCount);

  return {
    tweets: finalTweets,
    hasMore: hasMore && tweets.length >= targetCount
  };
}

// ============================================================================
// Tweet Post Extraction
// ============================================================================

/**
 * Extract tweet ID from URL
 *
 * @param url - Tweet URL (e.g., "https://x.com/elonmusk/status/123456")
 * @returns Tweet ID or null
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract username from tweet URL
 *
 * @param url - Tweet URL
 * @returns Username or null
 */
export function extractUsernameFromUrl(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status/);
  return match ? match[1] : null;
}

/**
 * Navigate to a tweet URL and wait for it to load
 *
 * @param page - Playwright page
 * @param url - Tweet URL
 * @param timeout - Navigation timeout in ms
 */
export async function navigateToTweet(page: Page, url: string, timeout = 30000): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    await humanDelay(1000, 2000);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Navigation to tweet timed out. Try again or increase the timeout.');
    }
    throw error;
  }
}

/**
 * Extract a single tweet post with thread context and replies.
 * Must be called on a page already navigated to a tweet URL.
 *
 * @param page - Playwright page (should already be on the tweet URL)
 * @returns TwitterPost with tweet, thread, and replies
 */
export async function extractTweetPost(page: Page): Promise<TwitterPost> {
  // Wait for tweets to load
  try {
    await page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 });
    await humanDelay(1000, 2000);
  } catch (error) {
    throw new Error('Could not find tweet on page. The tweet may not exist or may have been deleted.');
  }

  // Extract all tweets on the page
  const allTweets = await extractTweets(page);

  if (allTweets.length === 0) {
    throw new Error('Could not extract tweets from the page.');
  }

  // Get the tweet ID from the URL to identify the main tweet
  const url = page.url();
  const mainTweetId = extractTweetId(url);

  if (!mainTweetId) {
    throw new Error('Could not extract tweet ID from URL.');
  }

  // Find the main tweet and its index
  let mainTweetIndex = -1;
  let mainTweet: TwitterTweet | null = null;

  for (let i = 0; i < allTweets.length; i++) {
    if (allTweets[i].id === mainTweetId) {
      mainTweetIndex = i;
      mainTweet = allTweets[i];
      break;
    }
  }

  if (!mainTweet || mainTweetIndex === -1) {
    // If we can't find by ID, assume the first tweet is the main one
    mainTweetIndex = 0;
    mainTweet = allTweets[0];
  }

  // Thread context: tweets before the main tweet
  const thread = allTweets.slice(0, mainTweetIndex);

  // Scroll to load more replies
  await scrollForMore(page, 2);
  await humanDelay(1000, 1500);

  // Re-extract tweets after scrolling
  const allTweetsAfterScroll = await extractTweets(page);

  // Replies: tweets after the main tweet
  // Find the main tweet index again in the updated list
  let updatedMainTweetIndex = allTweetsAfterScroll.findIndex(t => t.id === mainTweet.id);
  if (updatedMainTweetIndex === -1) {
    updatedMainTweetIndex = mainTweetIndex; // Fallback to original index
  }

  // Extract replies (tweets after the main tweet that are marked as replies)
  const replies = allTweetsAfterScroll
    .slice(updatedMainTweetIndex + 1)
    .filter(tweet => tweet.type === 'reply' || tweet.id !== mainTweet.id)
    .slice(0, 20); // Limit to 20 replies

  return {
    tweet: mainTweet,
    thread,
    replies
  };
}

/**
 * Extract timeline of tweets from a user profile page.
 * Alias for collectTimelineTweets that returns TwitterTimeline format.
 *
 * @param page - Playwright page instance (must be on timeline page)
 * @param count - Number of tweets to extract
 * @returns Twitter timeline with tweets
 *
 * @example
 * await page.goto('https://x.com/username');
 * const timeline = await extractTimeline(page, 20);
 */
export async function extractTimeline(page: Page, count = 20): Promise<TwitterTimeline> {
  // Extract username from URL if on user timeline
  const url = page.url();
  const username = url.includes('x.com/') ? url.split('x.com/')[1]?.split('/')[0] : undefined;

  // Check for errors
  const error = await checkTwitterErrors(page);
  if (error) {
    throw new Error(`Twitter error: ${error}`);
  }

  // Use collectTimelineTweets to get tweets with pagination
  const result = await collectTimelineTweets(page, count);

  return {
    tweets: result.tweets,
    hasMore: result.hasMore,
    username
  };
}

/**
 * Extract a single post with thread context and replies.
 * Alias for extractTweetPost that matches the spec naming.
 *
 * @param page - Playwright page instance (must be on tweet page)
 * @returns Twitter post with thread and replies
 *
 * @example
 * await page.goto('https://x.com/username/status/123456789');
 * const post = await extractPost(page);
 */
export async function extractPost(page: Page): Promise<TwitterPost> {
  return extractTweetPost(page);
}

// ============================================================================
// Twitter Lists Functions
// ============================================================================

/**
 * Navigate to a Twitter List page
 *
 * @param page - Playwright Page object
 * @param listId - Twitter List ID (from URL: x.com/i/lists/{listId})
 * @param timeout - Navigation timeout in milliseconds (default: 30000)
 *
 * @example
 * await navigateToList(page, '1234567890');
 */
export async function navigateToList(
  page: Page,
  listId: string,
  timeout = 30000
): Promise<void> {
  const url = `https://x.com/i/lists/${listId}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await humanDelay(1000, 2000);
}

/**
 * Extract Twitter List information from a list page
 *
 * @param page - Playwright Page object positioned on a list page
 * @returns Twitter List metadata
 *
 * @example
 * await page.goto('https://x.com/i/lists/1234567890');
 * const list = await extractList(page);
 */
export async function extractList(page: Page): Promise<TwitterList> {
  // Extract list ID from URL
  const url = page.url();
  const listIdMatch = url.match(/\/lists\/(\d+)/);
  const listId = listIdMatch ? listIdMatch[1] : '';

  return page.evaluate((id) => {
    const result: any = {
      id,
      name: '',
      description: '',
      owner: {
        username: '',
        displayName: '',
        verified: false
      },
      memberCount: 0,
      followerCount: 0,
      isPrivate: false,
      url: window.location.href
    };

    // Extract list name
    const nameElement = document.querySelector('h1[role="heading"]');
    if (nameElement) {
      result.name = nameElement.textContent?.trim() || '';
    }

    // Extract description
    const descElement = document.querySelector('[data-testid="listDescription"]');
    if (descElement) {
      result.description = descElement.textContent?.trim() || '';
    }

    // Extract owner information
    const ownerElement = document.querySelector('[data-testid="UserCell"]');
    if (ownerElement) {
      const ownerNameElement = ownerElement.querySelector('[data-testid="User-Name"]');
      if (ownerNameElement) {
        const nameSpans = ownerNameElement.querySelectorAll('span');
        if (nameSpans.length > 0) {
          result.owner.displayName = nameSpans[0].textContent?.trim() || '';
        }
        // Extract username from link
        const ownerLink = ownerElement.querySelector('a[href*="/"]');
        if (ownerLink) {
          const href = ownerLink.getAttribute('href') || '';
          const usernameMatch = href.match(/\/([^\/]+)$/);
          if (usernameMatch) {
            result.owner.username = usernameMatch[1];
          }
        }
        // Check verification
        const verifiedBadge = ownerNameElement.querySelector('svg[aria-label*="Verified"]');
        result.owner.verified = !!verifiedBadge;
      }
    }

    // Extract member count
    const memberElement = document.querySelector('a[href$="/members"] span');
    if (memberElement) {
      const memberText = memberElement.textContent?.trim() || '0';
      const memberMatch = memberText.match(/([\d,.]+[KMB]?)/);
      if (memberMatch) {
        const cleaned = memberMatch[1].replace(/,/g, '');
        if (cleaned.endsWith('K')) {
          result.memberCount = Math.round(parseFloat(cleaned) * 1000);
        } else if (cleaned.endsWith('M')) {
          result.memberCount = Math.round(parseFloat(cleaned) * 1000000);
        } else if (cleaned.endsWith('B')) {
          result.memberCount = Math.round(parseFloat(cleaned) * 1000000000);
        } else {
          result.memberCount = parseInt(cleaned, 10) || 0;
        }
      }
    }

    // Extract follower count
    const followerElement = document.querySelector('a[href$="/followers"] span');
    if (followerElement) {
      const followerText = followerElement.textContent?.trim() || '0';
      const followerMatch = followerText.match(/([\d,.]+[KMB]?)/);
      if (followerMatch) {
        const cleaned = followerMatch[1].replace(/,/g, '');
        if (cleaned.endsWith('K')) {
          result.followerCount = Math.round(parseFloat(cleaned) * 1000);
        } else if (cleaned.endsWith('M')) {
          result.followerCount = Math.round(parseFloat(cleaned) * 1000000);
        } else if (cleaned.endsWith('B')) {
          result.followerCount = Math.round(parseFloat(cleaned) * 1000000000);
        } else {
          result.followerCount = parseInt(cleaned, 10) || 0;
        }
      }
    }

    // Check if list is private (look for lock icon or private indicator)
    const lockIcon = document.querySelector('[data-testid="iconBadge"] svg[aria-label*="Private"], [data-testid="iconBadge"] svg[aria-label*="Lock"]');
    result.isPrivate = !!lockIcon;

    // Extract banner image if present
    const bannerImg = document.querySelector('[data-testid="listBanner"] img');
    if (bannerImg) {
      result.bannerImageUrl = bannerImg.getAttribute('src') || undefined;
    }

    return result;
  }, listId);
}

/**
 * Extract tweets from a Twitter List timeline
 *
 * @param page - Playwright Page object positioned on a list page
 * @param count - Number of tweets to collect (default: 20, max: 100)
 * @returns Twitter List timeline with list metadata and tweets
 *
 * @example
 * await page.goto('https://x.com/i/lists/1234567890');
 * const timeline = await extractListTimeline(page, 50);
 */
export async function extractListTimeline(
  page: Page,
  count = 20
): Promise<TwitterListTimeline> {
  // Extract list metadata first
  const list = await extractList(page);

  // Collect tweets from the list
  const result = await collectTimelineTweets(page, count);

  return {
    list,
    tweets: result.tweets,
    hasMore: result.hasMore
  };
}
