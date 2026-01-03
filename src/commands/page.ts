/**
 * Page command handlers
 */

import type { GlobalOptions, ScrapeOptions } from '../types.js';

/**
 * Scrape content from current page
 */
export async function scrape(
  _options: GlobalOptions & ScrapeOptions
): Promise<void> {
  // TODO: Implement page scraping
  throw new Error('Not implemented yet');
}

/**
 * Execute JavaScript on the page
 */
export async function script(
  _code: string,
  _options: GlobalOptions
): Promise<void> {
  // TODO: Implement script execution
  throw new Error('Not implemented yet');
}
