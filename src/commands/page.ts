/**
 * Page command handlers
 */

import * as browserModule from '../browser.js';
import { extractPageContent } from '../scrapers/generic.js';
import type { GlobalOptions, ScrapeOptions, PageContent } from '../types.js';

/**
 * Scrape content from current page
 */
export async function scrape(
  options: GlobalOptions & ScrapeOptions
): Promise<void> {
  const page = await browserModule.getPage();

  // If selector is provided, we need to scope the extraction
  let content: PageContent;

  if (options.selector) {
    // Extract content scoped to the selector
    const url = page.url();
    const title = await page.title();

    const extracted = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      // Extract text (max 100,000 chars)
      const text = (element.textContent || '').trim().slice(0, 100000);

      // Extract links (max 100)
      const linkElements = element.querySelectorAll('a[href]');
      const links: Array<{ text: string; href: string }> = [];
      for (let i = 0; i < Math.min(linkElements.length, 100); i++) {
        const anchor = linkElements[i] as HTMLAnchorElement;
        links.push({
          text: (anchor.textContent || '').trim(),
          href: anchor.href
        });
      }

      // Extract images (max 50)
      const imgElements = element.querySelectorAll('img[src]');
      const images: Array<{ alt: string; src: string }> = [];
      for (let i = 0; i < Math.min(imgElements.length, 50); i++) {
        const img = imgElements[i] as HTMLImageElement;
        images.push({
          alt: img.alt || '',
          src: img.src
        });
      }

      return { text, links, images };
    }, options.selector);

    content = {
      url,
      title,
      text: extracted.text,
      links: extracted.links,
      images: extracted.images
    };
  } else {
    // Use the generic extractor for full page
    content = await extractPageContent(page);
  }

  console.log(JSON.stringify(content, null, 2));
}

/**
 * Execute JavaScript on the page
 */
export async function script(
  code: string,
  _options: GlobalOptions
): Promise<void> {
  const page = await browserModule.getPage();

  // Wrap user code in async IIFE to support await
  const wrappedCode = `(async () => {
    ${code}
  })()`;

  const result = await page.evaluate(wrappedCode);

  console.log(JSON.stringify(result, null, 2));
}
