/**
 * LinkedIn command handlers
 */

import type { GlobalOptions, CountOptions, LinkedInSearchOptions } from '../types.js';

/**
 * Get LinkedIn profile
 */
export async function getProfile(
  _url: string,
  _options: GlobalOptions
): Promise<void> {
  // TODO: Implement LinkedIn profile scraping
  throw new Error('Not implemented yet');
}

/**
 * Get LinkedIn posts from a profile
 */
export async function getPosts(
  _url: string,
  _options: GlobalOptions & CountOptions
): Promise<void> {
  // TODO: Implement LinkedIn posts scraping
  throw new Error('Not implemented yet');
}

/**
 * Search LinkedIn
 */
export async function search(
  _query: string,
  _options: GlobalOptions & LinkedInSearchOptions
): Promise<void> {
  // TODO: Implement LinkedIn search
  throw new Error('Not implemented yet');
}
