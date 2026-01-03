/**
 * LinkedIn scraper
 * Extracts profile information, posts, and search results from LinkedIn pages
 */

import type { Page } from 'playwright-core';
import type {
  LinkedInProfile,
  LinkedInExperience,
  LinkedInEducation,
  LinkedInPost,
  LinkedInSearchResults,
  LinkedInSearchType,
  LinkedInMetrics,
  PlatformErrorType
} from '../types.js';
import { parseTwitterNumber, cleanText } from '../utils/index.js';

// Re-export parseLinkedInDuration for convenience
export { parseTwitterNumber };

// ============================================================================
// Constants & Configuration
// ============================================================================

/**
 * LinkedIn DOM selectors using BEM-style classes
 */
export const SELECTORS = {
  // Profile selectors
  profile: {
    name: '.pv-top-card h1',
    headline: '.pv-top-card .text-body-medium',
    location: '.pv-top-card .text-body-small:has(span.text-body-small)',
    connections: '.pv-top-card--list-bullet li span',
    about: '#about ~ .display-flex .pv-shared-text-with-see-more span[aria-hidden="true"]',
    profileImage: '.pv-top-card img.pv-top-card-profile-picture__image',

    // Experience section
    experienceContainer: '#experience ~ .pvs-list__outer-container',
    experienceItem: 'li.artdeco-list__item',
    experienceTitle: '.display-flex .mr1 span[aria-hidden="true"]',
    experienceCompany: '.t-14.t-normal span[aria-hidden="true"]',
    experienceDuration: '.pvs-entity__caption-wrapper',

    // Education section
    educationContainer: '#education ~ .pvs-list__outer-container',
    educationSchool: '.display-flex .mr1 span[aria-hidden="true"]',
    educationDegree: '.t-14.t-normal span[aria-hidden="true"]',

    // Skills section
    skillsContainer: '#skills ~ .pvs-list__outer-container',
    skill: '.hoverable-link-text span[aria-hidden="true"]'
  },

  // Posts selectors
  posts: {
    container: '.feed-shared-update-v2',
    author: '.feed-shared-actor__name span',
    text: '.feed-shared-update-v2__description .break-words span',
    time: '.feed-shared-actor__sub-description span',
    reactions: '.social-details-social-counts__reactions-count',
    comments: '.social-details-social-counts__comments button span',
    reposts: '.social-details-social-counts__reposts button span'
  },

  // Search selectors
  search: {
    container: '.reusable-search__result-container',
    personName: '.entity-result__title-text a span[aria-hidden="true"]',
    headline: '.entity-result__primary-subtitle',
    location: '.entity-result__secondary-subtitle',
    connection: '.entity-result__badge-text span'
  },

  // Content expansion
  seeMore: 'button.inline-show-more-text__button'
} as const;

/**
 * Rate limit configuration for LinkedIn
 */
export const RATE_LIMITS = {
  navigationDelay: 2500, // 2-3 seconds between navigations
  scrollDelay: 2000, // 2 seconds between scrolls
  maxConsecutiveRequests: 8,
  rateLimitPause: 600000 // 10 minutes (600,000ms)
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse LinkedIn duration format: "Jan 2020 - Present · 4 yrs 2 mos"
 *
 * @param text - Duration text from LinkedIn
 * @returns Object with dateRange and duration separated
 */
export function parseLinkedInDuration(text: string): { dateRange: string; duration: string } {
  if (!text || typeof text !== 'string') {
    return { dateRange: '', duration: '' };
  }

  const parts = text.split('·').map(s => s.trim());

  return {
    dateRange: parts[0] || '',
    duration: parts[1] || ''
  };
}

/**
 * Expand truncated content by clicking "see more" buttons
 *
 * @param page - Playwright page instance
 */
export async function expandContent(page: Page): Promise<void> {
  try {
    const seeMoreButtons = await page.$$(SELECTORS.seeMore);
    for (const button of seeMoreButtons) {
      try {
        await button.click();
        await page.waitForTimeout(300);
      } catch {
        // Button might not be clickable, skip it
        continue;
      }
    }
  } catch {
    // No see more buttons found or error clicking them
  }
}

/**
 * Check for LinkedIn-specific error states
 *
 * @param page - Playwright page instance
 * @returns Error type if detected, null otherwise
 */
export async function checkLinkedInErrors(page: Page): Promise<PlatformErrorType | null> {
  const content = await page.content();
  const lower = content.toLowerCase();

  if (lower.includes('page not found') || lower.includes('404')) {
    return 'not_found';
  }

  if (lower.includes('account suspended')) {
    return 'suspended';
  }

  if (lower.includes('unusual activity') || lower.includes('restricted')) {
    return 'rate_limited';
  }

  // Check for login requirement (but not if we see "sign out")
  if (lower.includes('sign in') && !lower.includes('sign out')) {
    return 'login_required';
  }

  return null;
}

/**
 * Human-like delay between actions to avoid rate limiting
 *
 * @param min - Minimum delay in milliseconds
 * @param max - Maximum delay in milliseconds
 */
export async function humanDelay(min = 500, max = 1500): Promise<void> {
  const delay = min + Math.random() * (max - min);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Scroll page to load more content.
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
    await page.waitForTimeout(RATE_LIMITS.scrollDelay);

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
 * Extract LinkedIn profile information from a profile page.
 *
 * Must be called on a page already navigated to https://www.linkedin.com/in/{slug}/
 *
 * @param page - Playwright page instance on LinkedIn profile
 * @returns LinkedInProfile with extracted data
 */
export async function extractProfile(page: Page): Promise<LinkedInProfile> {
  // Wait for profile to load
  await waitForElement(page, SELECTORS.profile.name, 10000);

  // Expand content to show full descriptions
  await expandContent(page);
  await humanDelay(500, 1000);

  // Extract profile data in browser context
  const profileData = await page.evaluate(() => {
    // Helper: Get text content safely
    function getText(selector: string): string {
      const element = document.querySelector(selector);
      return element?.textContent?.trim() || '';
    }

    // Basic profile info
    const name = getText('.pv-top-card h1');
    const headline = getText('.pv-top-card .text-body-medium');
    const location = getText('.pv-top-card .text-body-small:has(span.text-body-small)');
    const about = getText('#about ~ .display-flex .pv-shared-text-with-see-more span[aria-hidden="true"]');
    const url = window.location.href;

    // Connection info
    const connectionsElement = document.querySelector('.pv-top-card--list-bullet li span');
    const connections = connectionsElement?.textContent?.trim() || '';

    // Profile image
    const profileImgEl = document.querySelector('.pv-top-card img.pv-top-card-profile-picture__image') as HTMLImageElement;
    const profileImageUrl = profileImgEl?.src || '';

    // Extract experience
    const experience: Array<{
      title: string;
      company: string;
      duration: string;
      location: string;
      description: string;
    }> = [];

    const experienceContainer = document.querySelector('#experience ~ .pvs-list__outer-container');
    if (experienceContainer) {
      const items = Array.from(experienceContainer.querySelectorAll('li.artdeco-list__item'));
      for (const item of items) {
        const titleEl = item.querySelector('.display-flex .mr1 span[aria-hidden="true"]');
        const companyEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const durationEl = item.querySelector('.pvs-entity__caption-wrapper');

        const title = titleEl?.textContent?.trim() || '';
        const company = companyEl?.textContent?.trim() || '';
        const duration = durationEl?.textContent?.trim() || '';

        if (title && company) {
          experience.push({
            title,
            company,
            duration,
            location: '',
            description: ''
          });
        }
      }
    }

    // Extract education
    const education: Array<{
      school: string;
      degree: string;
      dateRange: string;
    }> = [];

    const educationContainer = document.querySelector('#education ~ .pvs-list__outer-container');
    if (educationContainer) {
      const items = Array.from(educationContainer.querySelectorAll('li.artdeco-list__item'));
      for (const item of items) {
        const schoolEl = item.querySelector('.display-flex .mr1 span[aria-hidden="true"]');
        const degreeEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');

        const school = schoolEl?.textContent?.trim() || '';
        const degree = degreeEl?.textContent?.trim() || '';

        if (school) {
          education.push({
            school,
            degree,
            dateRange: ''
          });
        }
      }
    }

    // Extract skills
    const skills: string[] = [];
    const skillsContainer = document.querySelector('#skills ~ .pvs-list__outer-container');
    if (skillsContainer) {
      const skillElements = Array.from(skillsContainer.querySelectorAll('.hoverable-link-text span[aria-hidden="true"]'));
      for (const el of skillElements) {
        const skill = el.textContent?.trim();
        if (skill) {
          skills.push(skill);
        }
      }
    }

    return {
      name,
      headline,
      location,
      about,
      connections,
      url,
      profileImageUrl,
      experience,
      education,
      skills
    };
  });

  // Parse experience data
  const experience: LinkedInExperience[] = profileData.experience.map(exp => {
    const parsed = parseLinkedInDuration(exp.duration);
    return {
      title: cleanText(exp.title),
      company: cleanText(exp.company),
      duration: exp.duration,
      dateRange: parsed.dateRange,
      durationYears: parsed.duration,
      location: exp.location,
      description: exp.description
    };
  });

  // Parse education data
  const education: LinkedInEducation[] = profileData.education.map(edu => ({
    school: cleanText(edu.school),
    degree: cleanText(edu.degree),
    dateRange: edu.dateRange
  }));

  // Build the final profile object
  const profile: LinkedInProfile = {
    name: cleanText(profileData.name),
    headline: cleanText(profileData.headline),
    location: cleanText(profileData.location),
    about: cleanText(profileData.about),
    connections: profileData.connections,
    url: profileData.url,
    experience,
    education,
    skills: profileData.skills,
    profileImageUrl: profileData.profileImageUrl
  };

  return profile;
}

/**
 * Extract posts from a LinkedIn profile's activity page.
 *
 * Must be called on a page already navigated to
 * https://www.linkedin.com/in/{slug}/recent-activity/all/
 *
 * @param page - Playwright page instance on posts page
 * @param count - Number of posts to extract
 * @returns Array of LinkedIn posts
 */
export async function extractPosts(page: Page, count = 20): Promise<LinkedInPost[]> {
  const posts: LinkedInPost[] = [];
  const seenIds = new Set<string>();
  let attempts = 0;
  const maxAttempts = 10;

  // Wait for posts to load
  try {
    await waitForElement(page, SELECTORS.posts.container, 10000);
  } catch {
    // No posts found
    return [];
  }

  // Extract posts and scroll until we have enough
  while (posts.length < count && attempts < maxAttempts) {
    // Extract current posts
    const currentPosts = await page.evaluate(() => {
      const posts: Array<{
        id: string;
        author: string;
        text: string;
        time: string;
        reactions: string;
        comments: string;
        reposts: string;
        url: string;
      }> = [];

      const containers = Array.from(document.querySelectorAll('.feed-shared-update-v2'));

      for (const container of containers) {
        try {
          // Generate ID from container
          const id = container.id || `post-${posts.length}`;

          // Extract author
          const authorEl = container.querySelector('.feed-shared-actor__name span');
          const author = authorEl?.textContent?.trim() || '';

          // Extract text
          const textEl = container.querySelector('.feed-shared-update-v2__description .break-words span');
          const text = textEl?.textContent?.trim() || '';

          // Extract time
          const timeEl = container.querySelector('.feed-shared-actor__sub-description span');
          const time = timeEl?.textContent?.trim() || '';

          // Extract metrics
          const reactionsEl = container.querySelector('.social-details-social-counts__reactions-count');
          const reactions = reactionsEl?.textContent?.trim() || '0';

          const commentsEl = container.querySelector('.social-details-social-counts__comments button span');
          const comments = commentsEl?.textContent?.trim() || '0';

          const repostsEl = container.querySelector('.social-details-social-counts__reposts button span');
          const reposts = repostsEl?.textContent?.trim() || '0';

          // Get post URL if available
          const linkEl = container.querySelector('a[href*="/posts/"]') as HTMLAnchorElement;
          const url = linkEl?.href || '';

          if (author && text) {
            posts.push({
              id,
              author,
              text,
              time,
              reactions,
              comments,
              reposts,
              url
            });
          }
        } catch {
          // Skip posts that fail to parse
          continue;
        }
      }

      return posts;
    });

    // Add new unique posts
    for (const post of currentPosts) {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id);

        const metrics: LinkedInMetrics = {
          reactions: parseTwitterNumber(post.reactions),
          comments: parseTwitterNumber(post.comments),
          reposts: parseTwitterNumber(post.reposts)
        };

        posts.push({
          id: post.id,
          author: cleanText(post.author),
          text: cleanText(post.text),
          time: post.time,
          metrics,
          url: post.url
        });
      }
    }

    // If we have enough, stop
    if (posts.length >= count) {
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
    await humanDelay(1000, 2000);
  }

  return posts.slice(0, count);
}

/**
 * Extract search results from LinkedIn search page.
 * Handles scrolling to get the requested count.
 *
 * @param page - Playwright page instance on search results page
 * @param type - Type of search (people, posts, companies)
 * @param count - Number of results to retrieve
 * @returns LinkedInSearchResults with results and metadata
 */
export async function extractSearchResults(
  page: Page,
  type: LinkedInSearchType,
  count = 20
): Promise<LinkedInSearchResults> {
  const results: any[] = [];
  const seenUrls = new Set<string>();
  let attempts = 0;
  const maxAttempts = 10;

  // Wait for results to load
  try {
    await waitForElement(page, SELECTORS.search.container, 10000);
  } catch {
    // No results found - return empty based on type
    const query = new URL(page.url()).searchParams.get('keywords') || '';

    if (type === 'people') {
      return { type: 'people', query, results: [], hasMore: false };
    } else if (type === 'posts') {
      return { type: 'posts', query, results: [], hasMore: false };
    } else {
      return { type: 'companies', query, results: [], hasMore: false };
    }
  }

  // Extract results and scroll until we have enough
  while (results.length < count && attempts < maxAttempts) {
    // Extract based on type
    const currentResults = await page.evaluate((searchType) => {
      const items: any[] = [];
      const containers = Array.from(document.querySelectorAll('.reusable-search__result-container'));

      for (const container of containers) {
        try {
          if (searchType === 'people') {
            const nameEl = container.querySelector('.entity-result__title-text a span[aria-hidden="true"]');
            const headlineEl = container.querySelector('.entity-result__primary-subtitle');
            const locationEl = container.querySelector('.entity-result__secondary-subtitle');
            const connectionEl = container.querySelector('.entity-result__badge-text span');
            const linkEl = container.querySelector('.entity-result__title-text a') as HTMLAnchorElement;

            const name = nameEl?.textContent?.trim() || '';
            const headline = headlineEl?.textContent?.trim() || '';
            const location = locationEl?.textContent?.trim() || '';
            const connectionDegree = connectionEl?.textContent?.trim() || '';
            const url = linkEl?.href || '';

            if (name && url) {
              items.push({ name, headline, location, connectionDegree, url });
            }
          } else if (searchType === 'posts') {
            const authorEl = container.querySelector('.update-components-actor__name');
            const textEl = container.querySelector('.feed-shared-update-v2__description');
            const timeEl = container.querySelector('.update-components-actor__sub-description');
            const linkEl = container.querySelector('a[href*="/posts/"]') as HTMLAnchorElement;

            const author = authorEl?.textContent?.trim() || '';
            const text = textEl?.textContent?.trim() || '';
            const time = timeEl?.textContent?.trim() || '';
            const url = linkEl?.href || '';

            if (author && text && url) {
              items.push({ author, text, time, url });
            }
          } else if (searchType === 'companies') {
            const nameEl = container.querySelector('.entity-result__title-text a span');
            const descEl = container.querySelector('.entity-result__primary-subtitle');
            const industryEl = container.querySelector('.entity-result__secondary-subtitle');
            const linkEl = container.querySelector('.entity-result__title-text a') as HTMLAnchorElement;

            const name = nameEl?.textContent?.trim() || '';
            const description = descEl?.textContent?.trim() || '';
            const industry = industryEl?.textContent?.trim() || '';
            const url = linkEl?.href || '';

            if (name && url) {
              items.push({ name, description, industry, url });
            }
          }
        } catch {
          continue;
        }
      }

      return items;
    }, type);

    // Add new unique results
    for (const result of currentResults) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        results.push(result);
      }
    }

    // If we have enough, stop
    if (results.length >= count) {
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
    await humanDelay(1000, 2000);
  }

  // Get query from URL
  const query = new URL(page.url()).searchParams.get('keywords') || '';

  // Return typed results based on search type
  const finalResults = results.slice(0, count);

  if (type === 'people') {
    return {
      type: 'people',
      query,
      results: finalResults,
      hasMore: attempts < maxAttempts
    };
  } else if (type === 'posts') {
    return {
      type: 'posts',
      query,
      results: finalResults,
      hasMore: attempts < maxAttempts
    };
  } else {
    return {
      type: 'companies',
      query,
      results: finalResults,
      hasMore: attempts < maxAttempts
    };
  }
}

// ============================================================================
// Navigation Functions
// ============================================================================

/**
 * Navigate to a LinkedIn profile and wait for it to load.
 *
 * @param page - Playwright page instance
 * @param url - LinkedIn profile URL or slug
 * @param timeout - Navigation timeout in milliseconds
 */
export async function navigateToProfile(
  page: Page,
  url: string,
  timeout = 30000
): Promise<void> {
  // If url is just a slug, construct full URL
  const fullUrl = url.startsWith('http')
    ? url
    : `https://www.linkedin.com/in/${url}/`;

  try {
    await page.goto(fullUrl, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    // Add human-like delay after navigation
    await humanDelay(2000, 3000);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Navigation timeout');
    }
    throw error;
  }
}

/**
 * Navigate to a LinkedIn profile's posts page.
 *
 * @param page - Playwright page instance
 * @param url - LinkedIn profile URL or slug
 * @param timeout - Navigation timeout in milliseconds
 */
export async function navigateToPostsPage(
  page: Page,
  url: string,
  timeout = 30000
): Promise<void> {
  // If url is just a slug, construct full URL
  const slug = url.includes('linkedin.com/in/')
    ? url.split('linkedin.com/in/')[1].split('/')[0]
    : url;

  const fullUrl = `https://www.linkedin.com/in/${slug}/recent-activity/all/`;

  try {
    await page.goto(fullUrl, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    // Add human-like delay after navigation
    await humanDelay(2000, 3000);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Navigation timeout');
    }
    throw error;
  }
}

/**
 * Navigate to LinkedIn search and wait for results to load.
 *
 * @param page - Playwright page instance
 * @param query - Search query
 * @param type - Type of search (people, posts, companies)
 * @param timeout - Navigation timeout in milliseconds
 */
export async function navigateToSearch(
  page: Page,
  query: string,
  type: LinkedInSearchType,
  timeout = 30000
): Promise<void> {
  const encodedQuery = encodeURIComponent(query);
  let url: string;

  switch (type) {
    case 'people':
      url = `https://www.linkedin.com/search/results/people/?keywords=${encodedQuery}`;
      break;
    case 'posts':
      url = `https://www.linkedin.com/search/results/content/?keywords=${encodedQuery}`;
      break;
    case 'companies':
      url = `https://www.linkedin.com/search/results/companies/?keywords=${encodedQuery}`;
      break;
  }

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    // Add human-like delay after navigation
    await humanDelay(2000, 3000);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Navigation timeout');
    }
    throw error;
  }
}
