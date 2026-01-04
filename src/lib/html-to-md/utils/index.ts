/**
 * Utilities barrel export
 */

export { escapeMarkdownCharacters, escapeMultiLine } from './escape.js';
export { calculateCodeFence, extractLanguage, collectInlineCodeContent } from './fence.js';
export {
  isInlineElement,
  getPrevSiblingText,
  getNextSiblingText,
  addSpaceIfNecessary,
  trimLeadingSpaces,
  delimiterForEveryLine,
  getAbsoluteURL,
} from './spacing.js';
export {
  isListItem,
  indentMultiLineListItem,
  calculateListPrefix,
  preprocessList,
} from './lists.js';
