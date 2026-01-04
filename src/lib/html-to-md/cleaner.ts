/**
 * HTML pre-cleaning utilities
 * Ported from: firecrawl/apps/api/src/scraper/scrapeURL/lib/removeUnwantedElements.ts
 */

import { parseHTML } from 'linkedom';

/** Selectors for noise elements to remove */
const EXCLUDE_SELECTORS = [
  // Navigation
  'header', 'footer', 'nav', 'aside',
  '.header', '.top', '.navbar', '#header',
  '.footer', '.bottom', '#footer',
  '.sidebar', '.side', '.aside', '#sidebar',
  '.menu', '.navigation', '#nav',
  '.breadcrumbs', '#breadcrumbs',

  // Modals & popups
  '.modal', '.popup', '#modal', '.overlay',
  '.cookie', '#cookie', '.consent',

  // Ads
  '.ad', '.ads', '.advert', '#ad',
  '.advertisement', '.sponsored',

  // Social & sharing
  '.social', '.social-media', '.social-links', '#social',
  '.share', '#share', '.sharing',

  // Language selectors
  '.lang-selector', '.language', '#language-selector',

  // Widgets & misc
  '.widget', '#widget',
  '.newsletter', '.subscribe',
  '.comments', '#comments',
  '.related', '.recommended',
];

/** Tags to always remove (with content) */
const REMOVE_TAGS = [
  'script',
  'style',
  'noscript',
  'meta',
  'link',
  'svg',
  'canvas',
];

/**
 * Clean HTML by removing noise elements
 */
export function cleanHtml(html: string, baseUrl?: string): string {
  // Wrap in proper HTML structure if needed to ensure linkedom parses correctly
  const wrappedHtml = html.includes('<body') || html.includes('<html')
    ? html
    : `<!DOCTYPE html><html><body>${html}</body></html>`;

  const { document } = parseHTML(wrappedHtml);

  // Remove script, style, noscript, meta, etc.
  for (const tag of REMOVE_TAGS) {
    document.querySelectorAll(tag).forEach((el: Element) => el.remove());
  }

  // Remove head if present
  document.querySelector('head')?.remove();

  // Remove noise elements by selector
  for (const selector of EXCLUDE_SELECTORS) {
    try {
      document.querySelectorAll(selector).forEach((el: Element) => el.remove());
    } catch {
      // Invalid selector, skip
    }
  }

  // Remove elements with common noise attributes
  document.querySelectorAll('[role="banner"], [role="navigation"], [role="complementary"], [role="contentinfo"]')
    .forEach((el: Element) => el.remove());

  // Remove hidden elements
  document.querySelectorAll('[hidden], [aria-hidden="true"], [style*="display: none"], [style*="display:none"]')
    .forEach((el: Element) => el.remove());

  // Process images - get best src from srcset
  document.querySelectorAll('img[srcset]').forEach((img: Element) => {
    const srcset = img.getAttribute('srcset') || '';
    const sizes = srcset.split(',').map((s) => {
      const parts = s.trim().split(/\s+/);
      const url = parts[0] || '';
      const desc = parts[1] || '1x';
      const isX = desc.endsWith('x');
      const size = parseInt(desc) || 1;
      return { url, size, isX };
    }).filter(s => s.url);

    // If all are pixel density descriptors, include current src
    const currentSrc = img.getAttribute('src');
    if (sizes.every((s) => s.isX) && currentSrc) {
      sizes.push({ url: currentSrc, size: 1, isX: true });
    }

    // Sort by size descending and use largest
    sizes.sort((a, b) => b.size - a.size);
    if (sizes[0]) {
      img.setAttribute('src', sizes[0].url);
    }
    img.removeAttribute('srcset');
  });

  // Make URLs absolute if base URL provided
  if (baseUrl) {
    // Images
    document.querySelectorAll('img[src]').forEach((img: Element) => {
      const src = img.getAttribute('src');
      if (src) {
        try {
          img.setAttribute('src', new URL(src, baseUrl).href);
        } catch {
          // Invalid URL, keep as-is
        }
      }
    });

    // Links
    document.querySelectorAll('a[href]').forEach((a: Element) => {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          a.setAttribute('href', new URL(href, baseUrl).href);
        } catch {
          // Invalid URL, keep as-is
        }
      }
    });
  }

  // Remove empty elements that add no value
  const emptySelectors = ['div', 'span', 'p', 'section', 'article'];
  for (const sel of emptySelectors) {
    document.querySelectorAll(sel).forEach((el: Element) => {
      if (!el.textContent?.trim() && !el.querySelector('img, video, audio, iframe, table')) {
        el.remove();
      }
    });
  }

  // Remove tracking parameters from links
  document.querySelectorAll('a[href]').forEach((a: Element) => {
    const href = a.getAttribute('href');
    if (href) {
      try {
        const url = new URL(href, baseUrl || 'http://example.com');
        const trackingParams = [
          'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
          'fbclid', 'gclid', 'msclkid', 'dclid',
          'ref', 'ref_src', 'ref_url',
        ];
        trackingParams.forEach((param) => url.searchParams.delete(param));
        a.setAttribute('href', url.href);
      } catch {
        // Invalid URL, keep as-is
      }
    }
  });

  // Return body innerHTML (we wrapped in body, so it should always exist)
  return document.body?.innerHTML || '';
}

/**
 * Get cleaned HTML serialized from document
 */
export function getCleanedHtml(html: string, baseUrl?: string): string {
  return cleanHtml(html, baseUrl);
}
