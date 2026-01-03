/**
 * Generic page scraper
 * Extracts content from any web page
 */

import type { Page } from 'playwright-core';
import type { PageContent, PageLink, PageImage, PageScript } from '../types.js';

/**
 * Extract content from a page
 * Uses content detection: main > article > [role="main"] > body
 *
 * @param page - Playwright page instance
 * @returns PageContent with extracted data
 */
export async function extractPageContent(page: Page): Promise<PageContent> {
  const url = page.url();
  const title = await page.title();

  // Extract content in browser context
  const extracted = await page.evaluate(() => {
    // Helper: Find main content area
    function findMainContent(): Element {
      const main = document.querySelector('main');
      if (main) return main;

      const article = document.querySelector('article');
      if (article) return article;

      const roleMain = document.querySelector('[role="main"]');
      if (roleMain) return roleMain;

      return document.body;
    }

    // Helper: Extract text
    function extractText(element: Element): string {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return '';
      }

      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) {
        return '';
      }

      return element.textContent?.trim() || '';
    }

    // Helper: Extract links
    function extractLinks(root: Element): Array<{ text: string; href: string }> {
      const seen = new Set<string>();
      const links: Array<{ text: string; href: string }> = [];

      for (const anchor of root.querySelectorAll('a[href]')) {
        const href = (anchor as HTMLAnchorElement).href;
        if (!href || !href.startsWith('http') || seen.has(href)) {
          continue;
        }

        seen.add(href);
        links.push({
          text: anchor.textContent?.trim() || '',
          href
        });

        if (links.length >= 100) break; // Max 100 links
      }

      return links;
    }

    // Helper: Extract images
    function extractImages(root: Element): Array<{ alt: string; src: string }> {
      const seen = new Set<string>();
      const images: Array<{ alt: string; src: string }> = [];

      for (const img of root.querySelectorAll('img[src]')) {
        const src = (img as HTMLImageElement).src;
        if (!src || !src.startsWith('http') || seen.has(src)) {
          continue;
        }

        seen.add(src);
        images.push({
          alt: (img as HTMLImageElement).alt || '',
          src
        });

        if (images.length >= 50) break; // Max 50 images
      }

      return images;
    }

    const mainContent = findMainContent();

    // Extract with limits
    let text = extractText(mainContent);
    if (text.length > 100000) {
      text = text.slice(0, 100000); // Max 100,000 chars
    }

    const links = extractLinks(mainContent);
    const images = extractImages(mainContent);

    return { text, links, images };
  });

  return {
    url,
    title,
    text: extracted.text,
    links: extracted.links,
    images: extracted.images
  };
}

/**
 * Execute JavaScript on the page and return JSON-serializable result.
 *
 * Wraps user script in async IIFE for await support.
 * Validates that result is JSON-serializable and under 1 MB limit.
 *
 * @param page - Playwright Page object
 * @param script - JavaScript code to execute
 * @returns PageScript with execution result
 * @throws Error if script result exceeds 1 MB or is not JSON-serializable
 */
export async function executePageScript(page: Page, script: string): Promise<PageScript> {
  const MAX_SCRIPT_RESULT_SIZE = 1_000_000; // 1 MB

  // Wrap in async IIFE to support await
  const wrapped = `(async () => { ${script} })()`;

  try {
    // Execute script
    const result = await page.evaluate(wrapped);

    // Serialize to JSON for size validation
    const json = JSON.stringify(result);
    const size = Buffer.byteLength(json, 'utf8');

    // Check size limit
    if (size > MAX_SCRIPT_RESULT_SIZE) {
      throw new Error(
        `Script result exceeds 1MB limit (${Math.round(size / 1024)}KB > ${Math.round(MAX_SCRIPT_RESULT_SIZE / 1024)}KB)`
      );
    }

    return {
      script,
      result,
      size
    };
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with better context
      if (error.message.includes('not JSON-serializable')) {
        throw new Error('Script result must be JSON-serializable');
      }
      throw error;
    }
    throw new Error('Script execution failed');
  }
}

/**
 * Extract text content only from the page.
 *
 * Helper function that extracts just the text content without links or images.
 *
 * @param page - Playwright Page object
 * @returns Extracted text (max 100,000 chars)
 */
export async function extractText(page: Page): Promise<string> {
  const content = await extractPageContent(page);
  return content.text;
}

/**
 * Extract links only from the page.
 *
 * Helper function that extracts just the links without text or images.
 *
 * @param page - Playwright Page object
 * @returns Array of links (max 100)
 */
export async function extractLinks(page: Page): Promise<PageLink[]> {
  const content = await extractPageContent(page);
  return content.links;
}

/**
 * Extract images only from the page.
 *
 * Helper function that extracts just the images without text or links.
 *
 * @param page - Playwright Page object
 * @returns Array of images (max 50)
 */
export async function extractImages(page: Page): Promise<PageImage[]> {
  const content = await extractPageContent(page);
  return content.images;
}

/**
 * Scrape content from a page with optional selector.
 *
 * Backward compatibility alias for extractPageContent.
 * Note: selector parameter is ignored as extractPageContent uses automatic content detection.
 *
 * @param page - Playwright Page object
 * @param _selector - Optional CSS selector (ignored, kept for compatibility)
 * @returns PageContent with extracted data
 * @deprecated Use extractPageContent instead
 */
export async function scrapePage(page: Page, _selector?: string): Promise<PageContent> {
  // Selector is ignored - we always use automatic content detection (main > article > [role="main"] > body)
  return extractPageContent(page);
}
