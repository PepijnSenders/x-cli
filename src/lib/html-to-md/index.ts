/**
 * HTML to Markdown converter
 * TypeScript port of Firecrawl's html-to-markdown library
 *
 * @example
 * ```typescript
 * import { Converter, commonmarkRules, gfmPlugin, cleanHtml } from './lib/html-to-md';
 *
 * // Basic usage
 * const converter = new Converter()
 *   .addRules(...commonmarkRules)
 *   .use(gfmPlugin());
 *
 * const markdown = converter.convertString('<h1>Hello</h1>');
 *
 * // With HTML cleaning
 * const cleanedHtml = cleanHtml(rawHtml, 'https://example.com');
 * const markdown = converter.convertString(cleanedHtml);
 * ```
 */

export { Converter, createConverter } from './converter.js';
export { textRule } from './rules/text.js';
export { commonmarkRules } from './rules/commonmark.js';
export { tablePlugin } from './plugins/table.js';
export { gfmPlugin } from './plugins/gfm.js';
export { cleanHtml, getCleanedHtml } from './cleaner.js';

// Re-export types
export type {
  Options,
  Rule,
  Plugin,
  BeforeHook,
  AfterHook,
  AdvancedResult,
  ConverterInterface,
} from './types.js';

export { defaultOptions } from './types.js';

// Re-export utilities that may be useful for custom rules
export {
  escapeMarkdownCharacters,
  escapeMultiLine,
} from './utils/escape.js';

export {
  calculateCodeFence,
  extractLanguage,
  collectInlineCodeContent,
} from './utils/fence.js';

export {
  isInlineElement,
  addSpaceIfNecessary,
  trimLeadingSpaces,
  delimiterForEveryLine,
  getAbsoluteURL,
} from './utils/spacing.js';

export {
  isListItem,
  indentMultiLineListItem,
} from './utils/lists.js';
