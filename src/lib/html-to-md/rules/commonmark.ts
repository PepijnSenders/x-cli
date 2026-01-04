/**
 * CommonMark rules
 * Ported from: github.com/firecrawl/html-to-markdown/commonmark.go
 */

import type { Rule, Options, AdvancedResult } from '../types.js';
import {
  addSpaceIfNecessary,
  delimiterForEveryLine,
  isInlineElement,
  trimLeadingSpaces,
  getAbsoluteURL,
} from '../utils/spacing.js';
import { escapeMultiLine } from '../utils/escape.js';
import {
  calculateCodeFence,
  extractLanguage,
  collectInlineCodeContent,
} from '../utils/fence.js';
import { indentMultiLineListItem } from '../utils/lists.js';

/** 1. Lists (ul, ol) */
export const listRule: Rule = {
  filter: ['ul', 'ol'],
  replacement: (content: string, el: Element): string | null => {
    const parent = el.parentElement;

    // Nested list inside li: single newline prefix
    if (parent?.matches('li, ul, ol') && parent.lastElementChild === el) {
      // Check if parent text ends with newline
      const textContent = parent.firstChild?.textContent?.trimEnd() || '';
      if (!textContent.endsWith('\n')) {
        content = '\n' + content;
      }
      return content.trimEnd();
    }

    return '\n\n' + content + '\n\n';
  },
};

/** 2. List items (li) */
export const listItemRule: Rule = {
  filter: ['li'],
  replacement: (content: string, el: Element): string | null => {
    if (!content.trim()) return null;

    // Clean up content
    content = content.replace(/^\n+/, ''); // Remove leading newlines
    content = content.replace(/\n+$/, '\n'); // Single trailing newline
    content = content.trimStart();

    // Get prefix data from preprocessing
    const prefix = el.getAttribute('data-converter-list-prefix') || '- ';
    const prefixCount = parseInt(el.getAttribute('data-converter-prefix-count') || '2', 10);
    const prevPrefixCounts = parseInt(el.getAttribute('data-converter-prev-prefix-counts') || '0', 10);

    // Calculate indentation
    const indent = ' '.repeat(prevPrefixCounts);

    // Indent multiline content
    content = indentMultiLineListItem(content, prefixCount + prevPrefixCounts);

    return indent + prefix + content + '\n';
  },
};

/** 3. Paragraphs (p, div) */
export const paragraphRule: Rule = {
  filter: ['p', 'div'],
  replacement: (content: string, el: Element): string | null => {
    const parentName = el.parentElement?.nodeName.toLowerCase();

    // Inside inline elements or list items: minimal spacing
    if (isInlineElement(parentName) || parentName === 'li') {
      return '\n' + content + '\n';
    }

    content = trimLeadingSpaces(content);
    return '\n\n' + content + '\n\n';
  },
};

/** 4. Headings (h1-h6) */
export const headingRule: Rule = {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: (content: string, el: Element, options: Options): string | null => {
    if (!content.trim()) return null;

    // Clean up content for heading
    content = content.replace(/\n/g, ' ').replace(/\r/g, ' ');
    content = content.replace(/#/g, '\\#').trim();

    // If inside a link, just bold it
    if (el.closest('a')) {
      return addSpaceIfNecessary(el, options.strongDelimiter + content + options.strongDelimiter);
    }

    const level = parseInt(el.nodeName[1], 10);

    // Setext style for h1/h2
    if (options.headingStyle === 'setext' && level < 3) {
      const line = level === 1 ? '=' : '-';
      return '\n\n' + content + '\n' + line.repeat(content.length) + '\n\n';
    }

    // ATX style (default)
    return '\n\n' + '#'.repeat(level) + ' ' + content + '\n\n';
  },
};

/** 5. Bold (strong, b) */
export const boldRule: Rule = {
  filter: ['strong', 'b'],
  replacement: (content: string, el: Element, options: Options): string | null => {
    // Avoid double-wrapping nested bold
    const parent = el.parentElement;
    if (parent?.matches('strong, b')) return content;

    const trimmed = content.trim();
    if (!trimmed) return '';

    // Apply delimiter to every line for multiline content
    const wrapped = delimiterForEveryLine(trimmed, options.strongDelimiter);
    return addSpaceIfNecessary(el, wrapped);
  },
};

/** 6. Italic (i, em) */
export const italicRule: Rule = {
  filter: ['i', 'em'],
  replacement: (content: string, el: Element, options: Options): string | null => {
    // Avoid double-wrapping nested italic
    const parent = el.parentElement;
    if (parent?.matches('i, em')) return content;

    const trimmed = content.trim();
    if (!trimmed) return '';

    // Apply delimiter to every line for multiline content
    const wrapped = delimiterForEveryLine(trimmed, options.emDelimiter);
    return addSpaceIfNecessary(el, wrapped);
  },
};

/** 7. Images (img) */
export const imageRule: Rule = {
  filter: ['img'],
  replacement: (_content: string, el: Element, options: Options): string | null => {
    let src = el.getAttribute('src')?.trim() || '';
    if (!src) return '';

    src = getAbsoluteURL(src, options.domain);

    let alt = el.getAttribute('alt') || '';
    alt = alt.replace(/\n/g, ' ').trim();

    return `![${alt}](${src})`;
  },
};

/** 8. Links (a) */
export const linkRule: Rule = {
  filter: ['a'],
  advancedReplacement: (content: string, el: Element, options: Options): AdvancedResult | null => {
    let href = el.getAttribute('href')?.trim() || '';

    // Empty or fragment-only links
    if (!href || href === '#') {
      return { markdown: content };
    }

    href = getAbsoluteURL(href, options.domain);
    content = escapeMultiLine(content);

    // Handle title attribute
    let title = el.getAttribute('title') || '';
    if (title) {
      title = ` "${title.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`;
    }

    // Fallback to title/aria-label if no content
    if (!content.trim()) {
      content = el.getAttribute('title') || el.getAttribute('aria-label') || '';
    }
    if (!content) return null;

    if (options.linkStyle === 'inlined') {
      const md = `[${content}](${href}${title})`;
      return { markdown: addSpaceIfNecessary(el, md) };
    }

    // Referenced style
    const index = el.getAttribute('data-index') || '1';
    return {
      markdown: addSpaceIfNecessary(el, `[${content}][${index}]`),
      footer: `[${index}]: ${href}${title}`,
    };
  },
};

/** 9. Inline code (code, kbd, samp, tt) */
export const inlineCodeRule: Rule = {
  filter: ['code', 'kbd', 'samp', 'tt'],
  replacement: (_content: string, el: Element): string | null => {
    // Skip if inside a pre (handled by codeBlockRule)
    if (el.closest('pre')) return null;

    let code = collectInlineCodeContent(el);
    code = code.replace(/\n{2,}/g, '\n'); // Collapse multiple newlines

    const fence = calculateCodeFence('`', code);

    // Pad if starts/ends with backtick
    if (code.startsWith('`')) code = ' ' + code;
    if (code.endsWith('`')) code = code + ' ';

    return addSpaceIfNecessary(el, fence + code + fence);
  },
};

/** 10. Code blocks (pre) */
export const codeBlockRule: Rule = {
  filter: ['pre'],
  replacement: (_content: string, el: Element, options: Options): string | null => {
    const language = extractLanguage(el);
    const code = collectInlineCodeContent(el);
    const fenceChar = options.fence[0];
    const fence = calculateCodeFence(fenceChar, code);

    return '\n\n' + fence + language + '\n' + code + '\n' + fence + '\n\n';
  },
};

/** 11. Horizontal rule (hr) */
export const hrRule: Rule = {
  filter: ['hr'],
  replacement: (_content: string, el: Element, options: Options): string | null => {
    // Skip hr inside headings (sometimes used for styling)
    if (el.closest('h1, h2, h3, h4, h5, h6')) return '';
    return '\n\n' + options.horizontalRule + '\n\n';
  },
};

/** 12. Line break (br) */
export const brRule: Rule = {
  filter: ['br'],
  replacement: (): string => '\n\n',
};

/** 13. Blockquote */
export const blockquoteRule: Rule = {
  filter: ['blockquote'],
  replacement: (content: string): string | null => {
    content = content.trim();
    if (!content) return null;

    // Collapse multiple blank lines
    content = content.replace(/\n{2,}/g, '\n\n');
    // Add > prefix to each line
    content = content.replace(/^/gm, '> ');

    return '\n\n' + content + '\n\n';
  },
};

/** 14. Noscript - remove entirely */
export const noscriptRule: Rule = {
  filter: ['noscript'],
  replacement: (): null => null,
};

/** 15. Iframe */
export const iframeRule: Rule = {
  filter: ['iframe'],
  replacement: (_content: string, el: Element, options: Options): string => {
    const src = el.getAttribute('src');
    if (!src) return '';

    // Handle data: URIs containing HTML
    if (src.startsWith('data:text/html')) {
      const commaIndex = src.indexOf(',');
      if (commaIndex !== -1) {
        const htmlContent = src.slice(commaIndex + 1);
        try {
          decodeURIComponent(htmlContent);
          // Note: Recursive conversion would require importing Converter
          // For now, just indicate there's iframe content
          return `[iframe content]`;
        } catch {
          return '';
        }
      }
      return '';
    }

    return `[iframe](${getAbsoluteURL(src, options.domain)})`;
  },
};

/** 16. Figure and figcaption */
export const figureRule: Rule = {
  filter: ['figure'],
  replacement: (content: string): string => {
    return '\n\n' + content.trim() + '\n\n';
  },
};

export const figcaptionRule: Rule = {
  filter: ['figcaption'],
  replacement: (content: string): string | null => {
    const trimmed = content.trim();
    if (!trimmed) return null;
    return '\n\n*' + trimmed + '*\n\n';
  },
};

/** All CommonMark rules */
export const commonmarkRules: Rule[] = [
  listRule,
  listItemRule,
  paragraphRule,
  headingRule,
  boldRule,
  italicRule,
  imageRule,
  linkRule,
  inlineCodeRule,
  codeBlockRule,
  hrRule,
  brRule,
  blockquoteRule,
  noscriptRule,
  iframeRule,
  figureRule,
  figcaptionRule,
];
