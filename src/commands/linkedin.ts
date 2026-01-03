/**
 * LinkedIn command handlers
 */

import type { GlobalOptions, CountOptions, LinkedInSearchOptions } from '../types.js';
import { getPage } from '../browser.js';
import {
  navigateToProfile,
  navigateToPostsPage,
  navigateToSearch,
  extractProfile,
  extractPosts,
  extractSearchResults
} from '../scrapers/linkedin.js';
import { checkLinkedInErrors, formatError, throwScraperError } from '../utils/index.js';

/**
 * Get LinkedIn profile
 */
export async function getProfile(
  url: string,
  options: GlobalOptions
): Promise<void> {
  try {
    // Get the current browser page
    const page = await getPage();

    // Navigate to the profile
    if (!options.quiet) {
      console.error('Navigating to LinkedIn profile...');
    }

    await navigateToProfile(page, url, options.timeout);

    // Check for errors
    const content = await page.content();
    const error = checkLinkedInErrors(content);

    if (error) {
      // Map error types to appropriate messages
      switch (error) {
        case 'not_found':
          throwScraperError('not_found', 'Profile not found');
          break;
        case 'rate_limited':
          throwScraperError('rate_limited', 'LinkedIn detected unusual activity. Wait 10-15 minutes before continuing.');
          break;
        case 'login_required':
          throwScraperError('login_required', 'Login required to view this profile. Please log in to LinkedIn in your browser first.');
          break;
        case 'restricted':
          throwScraperError('restricted', 'Access restricted. LinkedIn may have flagged unusual activity.');
          break;
        default:
          throwScraperError('not_found', 'Profile not found or unavailable');
      }
    }

    // Extract profile data
    if (!options.quiet) {
      console.error('Extracting profile data...');
    }

    const profile = await extractProfile(page);

    // Output JSON
    if (options.format === 'json') {
      console.log(JSON.stringify(profile, null, 2));
    } else {
      // Text format output
      console.log(`Name: ${profile.name}`);
      console.log(`Headline: ${profile.headline}`);
      if (profile.location) {
        console.log(`Location: ${profile.location}`);
      }
      if (profile.connections) {
        console.log(`Connections: ${profile.connections}`);
      }
      if (profile.about) {
        console.log(`\nAbout:\n${profile.about}`);
      }

      if (profile.experience.length > 0) {
        console.log(`\nExperience (${profile.experience.length}):`);
        profile.experience.slice(0, 5).forEach((exp, idx) => {
          console.log(`\n[${idx + 1}] ${exp.title}`);
          console.log(`    ${exp.company}`);
          if (exp.duration) {
            console.log(`    ${exp.duration}`);
          }
        });
        if (profile.experience.length > 5) {
          console.log(`\n... and ${profile.experience.length - 5} more`);
        }
      }

      if (profile.education.length > 0) {
        console.log(`\nEducation (${profile.education.length}):`);
        profile.education.slice(0, 3).forEach((edu, idx) => {
          console.log(`\n[${idx + 1}] ${edu.school}`);
          if (edu.degree) {
            console.log(`    ${edu.degree}`);
          }
        });
        if (profile.education.length > 3) {
          console.log(`\n... and ${profile.education.length - 3} more`);
        }
      }

      if (profile.skills.length > 0) {
        console.log(`\nSkills (${profile.skills.length}):`);
        console.log(profile.skills.slice(0, 10).join(', '));
        if (profile.skills.length > 10) {
          console.log(`... and ${profile.skills.length - 10} more`);
        }
      }

      console.log(`\nProfile URL: ${profile.url}`);
    }
  } catch (error) {
    // Format and output error
    const structured = formatError(error);
    console.error(JSON.stringify(structured, null, 2));
    process.exit(structured.code);
  }
}

/**
 * Get LinkedIn posts from a profile
 */
export async function getPosts(
  url: string,
  options: GlobalOptions & CountOptions
): Promise<void> {
  try {
    // Get the current browser page
    const page = await getPage();

    // Navigate to the posts page
    if (!options.quiet) {
      console.error(`Fetching posts from LinkedIn profile...`);
    }

    await navigateToPostsPage(page, url, options.timeout);

    // Check for errors
    const content = await page.content();
    const error = checkLinkedInErrors(content);

    if (error) {
      switch (error) {
        case 'not_found':
          throwScraperError('not_found', 'Profile not found');
          break;
        case 'rate_limited':
          throwScraperError('rate_limited', 'LinkedIn detected unusual activity. Wait 10-15 minutes before continuing.');
          break;
        case 'login_required':
          throwScraperError('login_required', 'Login required to view posts. Please log in to LinkedIn in your browser first.');
          break;
        case 'restricted':
          throwScraperError('restricted', 'Access restricted. LinkedIn may have flagged unusual activity.');
          break;
        default:
          throwScraperError('not_found', 'Posts not available');
      }
    }

    // Extract posts
    if (!options.quiet) {
      console.error(`Extracting up to ${options.count} posts...`);
    }

    const posts = await extractPosts(page, options.count);

    // Build the response object
    const response = {
      profileUrl: page.url(),
      posts,
      count: posts.length,
      hasMore: posts.length >= options.count
    };

    // Output JSON
    if (options.format === 'json') {
      console.log(JSON.stringify(response, null, 2));
    } else {
      // Text format output
      console.log(`\nLinkedIn Posts`);
      console.log(`Profile: ${response.profileUrl}`);
      console.log(`Found: ${response.count} posts`);
      console.log(`Has more: ${response.hasMore}\n`);

      for (const post of posts) {
        console.log('─'.repeat(80));
        console.log(`${post.author}`);
        console.log(`Posted: ${post.time}`);
        console.log(`\n${post.text}\n`);
        console.log(`👍 ${post.metrics.reactions} reactions | 💬 ${post.metrics.comments} comments${post.metrics.reposts ? ` | 🔁 ${post.metrics.reposts} reposts` : ''}`);
        if (post.url) {
          console.log(`URL: ${post.url}`);
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
 * Search LinkedIn
 */
export async function search(
  query: string,
  options: GlobalOptions & LinkedInSearchOptions
): Promise<void> {
  try {
    // Get the current browser page
    const page = await getPage();

    // Navigate to search page
    if (!options.quiet) {
      console.error(`Searching LinkedIn for: "${query}" (${options.type})...`);
    }

    await navigateToSearch(page, query, options.type, options.timeout);

    // Check for errors
    const content = await page.content();
    const error = checkLinkedInErrors(content);

    if (error) {
      switch (error) {
        case 'rate_limited':
          throwScraperError('rate_limited', 'LinkedIn detected unusual activity. Wait 10-15 minutes before continuing.');
          break;
        case 'login_required':
          throwScraperError('login_required', 'Login required to view search results. Please log in to LinkedIn in your browser first.');
          break;
        case 'restricted':
          throwScraperError('restricted', 'Access restricted. LinkedIn may have flagged unusual activity.');
          break;
        default:
          throwScraperError('not_found', 'Search failed or unavailable');
      }
    }

    // Extract search results
    if (!options.quiet) {
      console.error(`Extracting up to ${options.count} results...`);
    }

    const results = await extractSearchResults(page, options.type, options.count);

    // Output JSON
    if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      // Text format output
      console.log(`\nLinkedIn Search Results: "${query}"`);
      console.log(`Type: ${results.type}`);
      console.log(`Found: ${results.results.length} results`);
      console.log(`Has more: ${results.hasMore}\n`);

      if (results.type === 'people') {
        for (const person of results.results) {
          console.log('─'.repeat(80));
          console.log(`Name: ${person.name}`);
          console.log(`Headline: ${person.headline}`);
          if (person.location) {
            console.log(`Location: ${person.location}`);
          }
          if (person.connectionDegree) {
            console.log(`Connection: ${person.connectionDegree}`);
          }
          console.log(`URL: ${person.url}`);
        }
      } else if (results.type === 'posts') {
        for (const post of results.results) {
          console.log('─'.repeat(80));
          console.log(`Author: ${post.author}`);
          console.log(`Posted: ${post.time}`);
          console.log(`\n${post.text}\n`);
          console.log(`URL: ${post.url}`);
        }
      } else if (results.type === 'companies') {
        for (const company of results.results) {
          console.log('─'.repeat(80));
          console.log(`Name: ${company.name}`);
          console.log(`Description: ${company.description}`);
          if (company.industry) {
            console.log(`Industry: ${company.industry}`);
          }
          console.log(`URL: ${company.url}`);
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
