// src/utils/html-parser.ts
// CLI-side HTML parsing and markdown conversion (Firecrawl-like quality)

import { parseHTML as linkedomParse } from 'linkedom';
import TurndownService from 'turndown';
// @ts-expect-error - no types available for turndown-plugin-gfm
import { gfm } from 'turndown-plugin-gfm';

// Configure turndown for high-quality markdown output
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
});

// Enable GitHub Flavored Markdown (tables, strikethrough, task lists)
turndownService.use(gfm);

// Remove empty elements that add noise
turndownService.addRule('removeEmpty', {
  filter: (node) => {
    const isEmpty = !node.textContent?.trim() &&
                    !node.querySelector('img, video, audio, iframe, svg');
    return isEmpty && ['DIV', 'SPAN', 'P', 'SECTION', 'ARTICLE'].includes(node.nodeName);
  },
  replacement: () => '',
});

// Remove empty links
turndownService.addRule('removeEmptyLinks', {
  filter: (node) => node.nodeName === 'A' && !node.textContent?.trim(),
  replacement: () => '',
});

// Remove image-only links (e.g., profile pics that link to profiles)
turndownService.addRule('imageOnlyLinks', {
  filter: (node) => {
    if (node.nodeName !== 'A') return false;
    const hasImage = !!node.querySelector('img');
    const textContent = node.textContent?.trim();
    return hasImage && !textContent;
  },
  replacement: () => '',
});

// Better image handling with alt text
turndownService.addRule('images', {
  filter: 'img',
  replacement: (_content, node) => {
    const element = node as Element;
    const alt = element.getAttribute('alt') || '';
    const src = element.getAttribute('src') || '';
    if (!src || src.startsWith('data:')) return '';
    // Clean alt text
    const cleanAlt = alt.replace(/[\n\r]/g, ' ').trim();
    return `![${cleanAlt}](${src})`;
  },
});

// Clean links - remove tracking params and handle relative URLs
turndownService.addRule('cleanLinks', {
  filter: (node) => node.nodeName === 'A' && !!node.getAttribute('href'),
  replacement: (content, node) => {
    const element = node as Element;
    const href = element.getAttribute('href') || '';

    // Skip empty content or anchor-only links
    if (!content.trim()) return '';
    if (href.startsWith('#')) return content;
    if (href.startsWith('javascript:')) return content;

    // Clean tracking params from URLs
    try {
      if (href.startsWith('http')) {
        const url = new URL(href);
        const trackingParams = [
          'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
          'ref', 'fbclid', 'gclid', 'msclkid', 'mc_eid', '_ga',
        ];
        trackingParams.forEach(p => url.searchParams.delete(p));
        return `[${content.trim()}](${url.toString()})`;
      }
    } catch {
      // Invalid URL, use as-is
    }

    return `[${content.trim()}](${href})`;
  },
});

// Handle figure elements with captions
turndownService.addRule('figures', {
  filter: 'figure',
  replacement: (content) => {
    return '\n\n' + content.trim() + '\n\n';
  },
});

// Handle figcaption
turndownService.addRule('figcaption', {
  filter: 'figcaption',
  replacement: (content) => {
    return content.trim() ? `\n_${content.trim()}_\n` : '';
  },
});

// Better code block handling - preserve language hints
turndownService.addRule('codeBlocks', {
  filter: (node) => {
    return node.nodeName === 'PRE' && !!node.querySelector('code');
  },
  replacement: (_content, node) => {
    const element = node as Element;
    const code = element.querySelector('code');
    if (!code) return '';

    // Try to detect language from class
    const className = code.getAttribute('class') || '';
    const langMatch = className.match(/(?:language-|lang-)(\w+)/);
    const lang = langMatch ? langMatch[1] : '';

    const codeContent = code.textContent || '';
    return `\n\n\`\`\`${lang}\n${codeContent.trim()}\n\`\`\`\n\n`;
  },
});

// Handle blockquotes better
turndownService.addRule('blockquotes', {
  filter: 'blockquote',
  replacement: (content) => {
    const trimmed = content.trim();
    if (!trimmed) return '';
    const lines = trimmed.split('\n');
    return '\n\n' + lines.map(line => '> ' + line).join('\n') + '\n\n';
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
    // Collapse consecutive headers (remove header if followed by another header)
    .replace(/^(#{1,6} .+)\n\n(#{1,6} )/gm, '$2')
    // Remove short standalone link lines (just a link with minimal text)
    .replace(/^\[.{1,15}\]\([^)]+\)\s*$/gm, '')
    // Clean up any resulting multiple blank lines again
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();
}

/**
 * Convert HTML to clean, Firecrawl-like markdown
 */
export function htmlToMarkdown(html: string, sourceUrl?: string): string {
  const raw = turndownService.turndown(html);
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
