/**
 * Text node rule
 * Ported from: github.com/firecrawl/html-to-markdown/commonmark.go
 */

import type { Rule, Options } from '../types.js';
import { escapeMarkdownCharacters } from '../utils/escape.js';

/**
 * Rule for handling text nodes (#text)
 */
export const textRule: Rule = {
  filter: ['#text'],
  replacement: (_content: string, el: Node, options: Options): string | null => {
    let text = (el as Text).textContent || '';

    // Empty or whitespace-only text
    if (!text.trim()) {
      // Preserve single space for inline elements
      if (text.includes(' ') || text.includes('\n')) {
        return ' ';
      }
      return '';
    }

    // Normalize whitespace
    text = text.replace(/\t+/g, ' ');
    text = text.replace(/  +/g, ' ');
    // Normalize newlines but preserve paragraph breaks
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');

    // Escape markdown characters if enabled
    if (options.escapeMode === 'basic') {
      text = escapeMarkdownCharacters(text);
    }

    return text;
  },
};
