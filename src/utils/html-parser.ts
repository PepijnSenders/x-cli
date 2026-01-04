// src/utils/html-parser.ts
// CLI-side HTML parsing and markdown conversion (Firecrawl-identical quality)

import { parseHTML as linkedomParse } from 'linkedom';
import {
  Converter,
  textRule,
  commonmarkRules,
  gfmPlugin,
  cleanHtml,
} from '../lib/html-to-md/index.js';

// Create and configure the converter (Firecrawl-identical settings)
const converter = new Converter({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
})
  .addRules(textRule, ...commonmarkRules)
  .use(gfmPlugin())
  // Remove empty elements that add noise
  .addRules({
    filter: ['div', 'span', 'p', 'section', 'article'],
    replacement: (content, el) => {
      const isEmpty = !content.trim() &&
        !el.querySelector('img, video, audio, iframe');
      return isEmpty ? '' : content;
    },
  })
  // Remove empty links
  .addRules({
    filter: ['a'],
    replacement: (content, _el) => {
      if (!content.trim()) return '';
      return null; // Let default link rule handle it
    },
  });

/**
 * Normalize markdown output for cleaner results
 */
function normalizeMarkdown(md: string): string {
  return md
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing whitespace from lines
    .replace(/[ \t]+$/gm, '')
    // Normalize bullet list markers
    .replace(/^(\s*)[*+] /gm, '$1- ')
    // Fix excessive spaces in headers
    .replace(/^(#{1,6})\s+/gm, '$1 ')
    // Remove multiple spaces
    .replace(/  +/g, ' ')
    // Clean up link text (remove extra whitespace)
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    // Remove empty list items
    .replace(/^-\s*$/gm, '')
    // Remove standalone numbers (engagement counts like "4", "2,998", "5.7K")
    .replace(/^[\d,\.]+[KMB]?\s*$/gm, '')
    // Remove short standalone link lines (just a link with minimal text)
    .replace(/^\[.{1,15}\]\([^)]+\)\s*$/gm, '')
    // Clean up any resulting multiple blank lines again
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();
}

/**
 * Convert HTML to clean, Firecrawl-identical markdown
 */
export function htmlToMarkdown(html: string, sourceUrl?: string): string {
  // Clean the HTML first (remove noise elements)
  const cleaned = cleanHtml(html, sourceUrl);

  // Convert to markdown
  const raw = converter.convertString(cleaned);
  let normalized = normalizeMarkdown(raw);

  // Add source footer if URL provided
  if (sourceUrl) {
    normalized += `\n\n---\nSource: ${sourceUrl}`;
  }

  return normalized;
}

// ============================================================================
// Helper functions for HTML parsing (kept for compatibility)
// ============================================================================

export interface ParsedDocument {
  document: Document;
  querySelector: (selector: string) => Element | null;
  querySelectorAll: (selector: string) => Element[];
  getText: (selector: string) => string | null;
  getTexts: (selector: string) => string[];
  getAttribute: (selector: string, attr: string) => string | null;
  getAttributes: (selector: string, attr: string) => string[];
}

/**
 * Parse HTML string and return a document with query methods
 */
export function parseHTML(html: string): ParsedDocument {
  const { document } = linkedomParse(html);

  return {
    document,

    querySelector(selector: string): Element | null {
      return document.querySelector(selector);
    },

    querySelectorAll(selector: string): Element[] {
      return Array.from(document.querySelectorAll(selector));
    },

    getText(selector: string): string | null {
      const el = document.querySelector(selector);
      return el?.textContent?.trim() || null;
    },

    getTexts(selector: string): string[] {
      return Array.from(document.querySelectorAll(selector))
        .map(el => el.textContent?.trim())
        .filter((t): t is string => t !== null && t !== undefined && t !== '');
    },

    getAttribute(selector: string, attr: string): string | null {
      const el = document.querySelector(selector);
      return el?.getAttribute(attr) || null;
    },

    getAttributes(selector: string, attr: string): string[] {
      return Array.from(document.querySelectorAll(selector))
        .map(el => el.getAttribute(attr))
        .filter((a): a is string => a !== null);
    },
  };
}

/**
 * Extract all text content from HTML, stripping tags
 */
export function extractText(html: string): string {
  const { document } = linkedomParse(html);
  return document.body?.textContent?.trim() || '';
}

/**
 * Extract links from HTML
 */
export function extractLinks(html: string): Array<{ href: string; text: string }> {
  const { document } = linkedomParse(html);
  return Array.from(document.querySelectorAll('a[href]')).map(a => ({
    href: a.getAttribute('href') || '',
    text: a.textContent?.trim() || '',
  }));
}

/**
 * Extract images from HTML
 */
export function extractImages(html: string): Array<{ src: string; alt: string }> {
  const { document } = linkedomParse(html);
  return Array.from(document.querySelectorAll('img[src]')).map(img => ({
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || '',
  }));
}
