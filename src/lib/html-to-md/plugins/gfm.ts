/**
 * GitHub Flavored Markdown (GFM) plugin
 * Combines table support + strikethrough + task lists
 */

import type { Rule, Plugin, ConverterInterface } from '../types.js';
import { tablePlugin } from './table.js';
import { addSpaceIfNecessary } from '../utils/spacing.js';

/** Strikethrough rule (del, s, strike) */
const strikethroughRule: Rule = {
  filter: ['del', 's', 'strike'],
  replacement: (content: string, el: Element): string | null => {
    const trimmed = content.trim();
    if (!trimmed) return '';
    return addSpaceIfNecessary(el, '~~' + trimmed + '~~');
  },
};

/** Task list item rule - checkbox handling */
const taskListRule: Rule = {
  filter: ['input'],
  replacement: (_content: string, el: Element): string | null => {
    // Only handle checkboxes in list items
    if (el.getAttribute('type') !== 'checkbox') return null;
    if (!el.closest('li')) return null;

    const checked = el.hasAttribute('checked');
    return checked ? '[x] ' : '[ ] ';
  },
};

/** Mark/highlight rule */
const markRule: Rule = {
  filter: ['mark'],
  replacement: (content: string, el: Element): string | null => {
    const trimmed = content.trim();
    if (!trimmed) return '';
    // GFM doesn't have native mark support, use == for some parsers or bold
    return addSpaceIfNecessary(el, '==' + trimmed + '==');
  },
};

/** Subscript rule */
const subRule: Rule = {
  filter: ['sub'],
  replacement: (content: string, el: Element): string | null => {
    const trimmed = content.trim();
    if (!trimmed) return '';
    return addSpaceIfNecessary(el, '~' + trimmed + '~');
  },
};

/** Superscript rule */
const supRule: Rule = {
  filter: ['sup'],
  replacement: (content: string, el: Element): string | null => {
    const trimmed = content.trim();
    if (!trimmed) return '';
    return addSpaceIfNecessary(el, '^' + trimmed + '^');
  },
};

/**
 * GFM plugin - GitHub Flavored Markdown
 * Includes: tables, strikethrough, task lists
 */
export function gfmPlugin(): Plugin {
  return (converter: ConverterInterface): Rule[] => {
    // Apply table plugin first
    const tableRules = tablePlugin()(converter) || [];

    // Return all GFM rules
    return [
      ...tableRules,
      strikethroughRule,
      taskListRule,
      markRule,
      subRule,
      supRule,
    ];
  };
}
