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
  TwitterTimeline
} from '../types.js';
import { parseTwitterNumber, cleanText } from '../utils/index.js';

// Re-export parseTwitterNumber for convenience as per spec
export { parseTwitterNumber };

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
 * Detect tweet type based on DOM indicators
 *
 * @param article - Tweet article element
 * @returns Tweet type classification
 */
export function detectTweetType(article: Element): TwitterTweetType {
  // Check for retweet indicator
  const socialContext = article.querySelector(SELECTORS.tweet.socialContext);
  if (socialContext?.textContent?.includes('reposted')) {
    return 'retweet';
  }

  // Check for reply indicator
  const tweetContent = article.querySelector('[data-testid="tweet"]');
  if (tweetContent?.textContent?.includes('Replying to')) {
    return 'reply';
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

  if (content.includes("Rate limit exceeded")) {
    return 'rate_limited';
  }

  if (content.includes("Log in") && content.includes("Sign up")) {
    return 'login_required';
  }

  return null;
}

/**
 * Wait for element with timeout
 *
 * @param page - Playwright page instance
 * @param selector - CSS selector to wait for
 * @param timeout - Timeout in milliseconds
 * @returns Whether element was found
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
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
 * Scroll page to load more tweets.
 * Returns true if new content was loaded.
 *
 * @param page - Playwright page instance
 * @param maxAttempts - Maximum scroll attempts without new content
 * @returns True if new content was loaded
 */
export async function scrollForMore(page: Page, maxAttempts = 3): Promise<boolean> {
  let attempts = 0;
  const previousHeight = await page.evaluate(() => document.body.scrollHeight);

  while (attempts < maxAttempts) {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait for content to load
    await page.waitForTimeout(1500);

    // Check if height changed
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight > previousHeight) {
      return true;
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

        const metrics: TwitterMetrics = {
          replies: parseMetric(replyEl),
          retweets: parseMetric(retweetEl),
          likes: parseMetric(likeEl),
          views
        };

        // Detect tweet type
        let type: 'original' | 'retweet' | 'reply' = 'original';

        // Check for retweet indicator
        const socialContext = article.querySelector('[data-testid="socialContext"]');
        if (socialContext?.textContent?.toLowerCase().includes('repost')) {
          type = 'retweet';
        }
        // Check for reply indicator
        else if (article.textContent?.includes('Replying to')) {
          type = 'reply';
        }

        // Extract media
        const media: Array<{ type: 'photo' | 'video' | 'gif'; url: string; alt?: string }> = [];
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

        tweets.push({
          id,
          text,
          author,
          createdAt,
          metrics,
          type,
          media,
          url,
          isThread: false
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

    // Try to scroll for more
    const hasMore = await scrollForMore(page);
    if (!hasMore) {
      attempts++;
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
 * Human-like delay between actions to avoid rate limiting.
 *
 * @param min - Minimum delay in milliseconds
 * @param max - Maximum delay in milliseconds
 */
export async function humanDelay(min = 500, max = 1500): Promise<void> {
  const delay = min + Math.random() * (max - min);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Collect tweets from timeline until target count is reached.
 * Handles pagination via infinite scroll.
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

  // Wait for initial tweets to load
  try {
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });
  } catch (error) {
    throw new Error('No tweets found on page. The page may have failed to load or login may be required.');
  }

  while (tweets.length < targetCount && scrollAttempts < maxScrollAttempts) {
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

    // Try to scroll for more
    const scrolledMore = await scrollForMore(page, 3);

    if (!scrolledMore) {
      // No more content loaded
      hasMore = false;
      break;
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
