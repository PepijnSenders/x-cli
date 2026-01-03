/**
 * Twitter command handlers
 */

import type { GlobalOptions, CountOptions, TwitterTweet } from '../types.js';
import { getPage } from '../browser.js';
import { navigateToProfile, extractProfile, extractSearchResults, humanDelay, collectTimelineTweets } from '../scrapers/twitter.js';
import { checkTwitterErrors, formatError, throwScraperError } from '../utils/index.js';

/**
 * Get Twitter user profile
 */
export async function getProfile(
  username: string,
  options: GlobalOptions
): Promise<void> {
  try {
    // Get the current browser page
    const page = await getPage();

    // Navigate to the profile
    await navigateToProfile(page, username, options.timeout);

    // Small delay for content to render
    await page.waitForTimeout(1000);

    // Check for errors
    const content = await page.content();
    const error = checkTwitterErrors(content);

    if (error) {
      // Map error types to appropriate messages
      switch (error) {
        case 'not_found':
          throwScraperError('not_found', `Profile @${username} not found`);
          break;
        case 'suspended':
          throwScraperError('suspended', `Account @${username} has been suspended`);
          break;
        case 'rate_limited':
          throwScraperError('rate_limited', 'Rate limit exceeded');
          break;
        case 'login_required':
          throwScraperError('login_required', 'Login required to view this profile');
          break;
        default:
          throwScraperError('not_found', `Profile @${username} not found or unavailable`);
      }
    }

    // Extract profile data
    const profile = await extractProfile(page);

    // Output JSON
    if (options.format === 'json') {
      console.log(JSON.stringify(profile, null, 2));
    } else {
      // Text format output
      console.log(`Username: @${profile.username}`);
      console.log(`Display Name: ${profile.displayName}`);
      if (profile.verified) {
        console.log('Verified: Yes');
      }
      console.log(`Bio: ${profile.bio}`);
      if (profile.location) {
        console.log(`Location: ${profile.location}`);
      }
      if (profile.website) {
        console.log(`Website: ${profile.website}`);
      }
      console.log(`Joined: ${profile.joinDate}`);
      console.log(`Followers: ${profile.followersCount.toLocaleString()}`);
      console.log(`Following: ${profile.followingCount.toLocaleString()}`);
      console.log(`Posts: ${profile.postsCount.toLocaleString()}`);
    }
  } catch (error) {
    // Format and output error
    const structured = formatError(error);
    console.error(JSON.stringify(structured, null, 2));
    process.exit(structured.code);
  }
}

/**
 * Get Twitter timeline
 */
export async function getTimeline(
  username: string | undefined,
  options: GlobalOptions & CountOptions
): Promise<void> {
  try {
    // Get the current browser page
    const page = await getPage();

    // Determine the URL to navigate to
    const url = username ? `https://x.com/${username}` : 'https://x.com/home';

    if (!options.quiet) {
      if (username) {
        console.error(`Fetching timeline for @${username}...`);
      } else {
        console.error('Fetching home timeline...');
      }
    }

    // Navigate to the timeline
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeout
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throwScraperError('navigation_timeout', 'Page took too long to load');
      }
      throw error;
    }

    // Add human-like delay
    await humanDelay(1000, 2000);

    // Check for errors
    const content = await page.content();
    const error = checkTwitterErrors(content);

    if (error) {
      switch (error) {
        case 'not_found':
          throwScraperError('not_found', username ? `Profile @${username} not found` : 'Timeline not found');
          break;
        case 'suspended':
          throwScraperError('not_found', username ? `Account @${username} has been suspended` : 'Account suspended');
          break;
        case 'rate_limited':
          throwScraperError('rate_limited', 'Rate limit exceeded. Please wait before trying again.');
          break;
        case 'login_required':
          throwScraperError('login_required', 'Login required. Please log in to Twitter in your browser first.');
          break;
        default:
          throwScraperError('element_not_found', 'Timeline not available');
      }
    }

    // Collect tweets from the timeline
    const result = await collectTimelineTweets(page, options.count);

    // Build the response object
    const response: any = {
      tweets: result.tweets,
      hasMore: result.hasMore
    };

    // Add username if fetching user timeline
    if (username) {
      response.username = username;
    }

    // Output JSON
    if (options.format === 'json') {
      console.log(JSON.stringify(response, null, 2));
    } else {
      // Text format output
      if (username) {
        console.log(`\nTimeline for @${username}`);
      } else {
        console.log('\nHome Timeline');
      }
      console.log(`Tweets: ${result.tweets.length}`);
      console.log(`Has more: ${result.hasMore}\n`);

      for (const tweet of result.tweets) {
        console.log('─'.repeat(80));
        console.log(`@${tweet.author.username} (${tweet.author.displayName})${tweet.author.verified ? ' ✓' : ''}`);
        console.log(`Posted: ${new Date(tweet.createdAt).toLocaleString()}`);
        console.log(`Type: ${tweet.type}`);
        console.log(`\n${tweet.text}\n`);
        console.log(`💬 ${tweet.metrics.replies} | 🔁 ${tweet.metrics.retweets} | ❤️ ${tweet.metrics.likes} | 👁️ ${tweet.metrics.views}`);
        if (tweet.url) {
          console.log(`URL: ${tweet.url}`);
        }
        if (tweet.media.length > 0) {
          console.log(`Media: ${tweet.media.length} attachment(s)`);
        }
      }

      console.log('─'.repeat(80));
    }
  } catch (error) {
    // Format and output error
    const structured = formatError(error);
    console.error(JSON.stringify(structured, null, 2));
    process.exit(structured.code);
  }
}

/**
 * Get single Twitter post with thread and replies
 */
export async function getPost(
  url: string,
  options: GlobalOptions
): Promise<void> {
  try {
    const { navigateToTweet, extractTweetPost, extractTweetId } = await import('../scrapers/twitter.js');

    // Validate URL
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      throwScraperError('not_found', 'Invalid tweet URL. Expected format: https://x.com/username/status/123456');
    }

    // Get the browser page
    const page = await getPage();

    // Navigate to the tweet
    if (!options.quiet) {
      console.error('Navigating to tweet...');
    }

    await navigateToTweet(page, url, options.timeout);

    // Check for errors on the page
    const content = await page.content();
    const error = checkTwitterErrors(content);

    if (error) {
      switch (error) {
        case 'not_found':
          throwScraperError('not_found', 'Tweet not found. It may have been deleted or the URL is incorrect.');
          break;
        case 'suspended':
          throwScraperError('not_found', 'The account has been suspended.');
          break;
        case 'rate_limited':
          throwScraperError('rate_limited', 'Rate limit exceeded. Wait a few minutes before trying again.');
          break;
        case 'login_required':
          throwScraperError('login_required', 'You must be logged in to view this tweet. Open X/Twitter in your browser and log in first.');
          break;
        default:
          throwScraperError('not_found', 'Tweet not available');
      }
    }

    // Extract the post data
    if (!options.quiet) {
      console.error('Extracting tweet data...');
    }

    const post = await extractTweetPost(page);

    // Output the result
    if (options.format === 'json') {
      console.log(JSON.stringify(post, null, 2));
    } else {
      // Text format output
      console.log('\n' + '='.repeat(80));
      console.log('MAIN TWEET');
      console.log('='.repeat(80));
      console.log(`@${post.tweet.author.username} (${post.tweet.author.displayName})${post.tweet.author.verified ? ' ✓' : ''}`);
      console.log(`Posted: ${new Date(post.tweet.createdAt).toLocaleString()}`);
      console.log(`\n${post.tweet.text}\n`);
      console.log(`💬 ${post.tweet.metrics.replies} | 🔁 ${post.tweet.metrics.retweets} | ❤️ ${post.tweet.metrics.likes} | 👁️ ${post.tweet.metrics.views}`);
      if (post.tweet.url) {
        console.log(`URL: ${post.tweet.url}`);
      }
      if (post.tweet.media.length > 0) {
        console.log(`Media: ${post.tweet.media.length} attachment(s)`);
      }

      if (post.thread.length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log(`THREAD CONTEXT (${post.thread.length} tweets)`);
        console.log('='.repeat(80));
        post.thread.forEach((tweet: TwitterTweet, index: number) => {
          console.log(`\n[${index + 1}] @${tweet.author.username}${tweet.author.verified ? ' ✓' : ''}`);
          console.log(tweet.text);
          console.log(`💬 ${tweet.metrics.replies} | 🔁 ${tweet.metrics.retweets} | ❤️ ${tweet.metrics.likes}`);
        });
      }

      if (post.replies.length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log(`REPLIES (${post.replies.length} shown)`);
        console.log('='.repeat(80));
        post.replies.forEach((tweet: TwitterTweet, index: number) => {
          console.log(`\n[${index + 1}] @${tweet.author.username}${tweet.author.verified ? ' ✓' : ''}`);
          console.log(tweet.text);
          console.log(`💬 ${tweet.metrics.replies} | 🔁 ${tweet.metrics.retweets} | ❤️ ${tweet.metrics.likes}`);
        });
      }

      console.log('\n' + '='.repeat(80));
    }
  } catch (error) {
    // Format and output error
    const structured = formatError(error);
    console.error(JSON.stringify(structured, null, 2));
    process.exit(structured.code);
  }
}

/**
 * Search Twitter
 */
export async function search(
  query: string,
  options: GlobalOptions & CountOptions
): Promise<void> {
  try {
    // Get the current browser page
    const page = await getPage();

    // Encode the query for URL
    const encodedQuery = encodeURIComponent(query);

    // Navigate to search page with "Latest" tab (f=live parameter)
    const searchUrl = `https://x.com/search?q=${encodedQuery}&f=live`;

    if (!options.quiet) {
      console.error(`Searching Twitter for: "${query}"`);
    }

    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeout
    });

    // Add human-like delay
    await humanDelay(1000, 2000);

    // Check for errors
    const content = await page.content();
    const error = checkTwitterErrors(content);

    if (error) {
      switch (error) {
        case 'rate_limited':
          throwScraperError('rate_limited', 'Rate limit exceeded');
          break;
        case 'login_required':
          throwScraperError('login_required', 'Login required to view search results');
          break;
        default:
          throwScraperError('not_found', 'Search failed or unavailable');
      }
    }

    // Extract search results
    const results = await extractSearchResults(page, query, options.count);

    // Output JSON
    if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      // Text format output
      console.log(`\nSearch Results for: "${query}"`);
      console.log(`Found: ${results.tweets.length} tweets`);
      console.log(`Has more: ${results.hasMore}\n`);

      for (const tweet of results.tweets) {
        console.log('─'.repeat(80));
        console.log(`@${tweet.author.username} (${tweet.author.displayName})${tweet.author.verified ? ' ✓' : ''}`);
        console.log(`Posted: ${new Date(tweet.createdAt).toLocaleString()}`);
        console.log(`Type: ${tweet.type}`);
        console.log(`\n${tweet.text}\n`);
        console.log(`💬 ${tweet.metrics.replies} | 🔁 ${tweet.metrics.retweets} | ❤️ ${tweet.metrics.likes} | 👁️ ${tweet.metrics.views}`);
        if (tweet.url) {
          console.log(`URL: ${tweet.url}`);
        }
        if (tweet.media.length > 0) {
          console.log(`Media: ${tweet.media.length} attachment(s)`);
        }
      }

      console.log('─'.repeat(80));
    }
  } catch (error) {
    // Format and output error
    const structured = formatError(error);
    console.error(JSON.stringify(structured, null, 2));
    process.exit(structured.code);
  }
}
