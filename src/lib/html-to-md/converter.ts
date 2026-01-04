/**
 * Main Converter class
 * Ported from: github.com/firecrawl/html-to-markdown/from.go
 */

import { parseHTML } from 'linkedom';
import {
  Options,
  defaultOptions,
  Rule,
  BeforeHook,
  AfterHook,
  Plugin,
  ConverterInterface,
  AdvancedResult,
} from './types.js';
import { preprocessList } from './utils/lists.js';

/**
 * HTML to Markdown converter
 */
export class Converter implements ConverterInterface {
  private rules: Map<string, Rule[]> = new Map();
  private keepTags: Set<string> = new Set();
  private removeTags: Set<string> = new Set();
  private beforeHooks: BeforeHook[] = [];
  private afterHooks: AfterHook[] = [];
  private options: Options;

  constructor(options?: Partial<Options>) {
    this.options = { ...defaultOptions, ...options };
  }

  /** Add conversion rules */
  addRules(...rules: Rule[]): this {
    for (const rule of rules) {
      for (const tag of rule.filter) {
        const tagLower = tag.toLowerCase();
        const existing = this.rules.get(tagLower) || [];
        existing.push(rule);
        this.rules.set(tagLower, existing);
      }
    }
    return this;
  }

  /** Apply plugins */
  use(...plugins: Plugin[]): this {
    for (const plugin of plugins) {
      const rules = plugin(this);
      if (rules && Array.isArray(rules)) {
        this.addRules(...rules);
      }
    }
    return this;
  }

  /** Keep these tags as-is (render as HTML in output) */
  keep(...tags: string[]): this {
    for (const tag of tags) {
      this.keepTags.add(tag.toLowerCase());
    }
    return this;
  }

  /** Remove these tags and their content entirely */
  remove(...tags: string[]): this {
    for (const tag of tags) {
      this.removeTags.add(tag.toLowerCase());
    }
    return this;
  }

  /** Add hooks that run before conversion */
  before(...hooks: BeforeHook[]): this {
    this.beforeHooks.push(...hooks);
    return this;
  }

  /** Add hooks that run after conversion */
  after(...hooks: AfterHook[]): this {
    this.afterHooks.push(...hooks);
    return this;
  }

  /** Convert an HTML string to markdown */
  convertString(html: string): string {
    // Wrap in proper HTML structure if needed to ensure linkedom parses correctly
    const wrappedHtml = html.includes('<body') || html.includes('<html')
      ? html
      : `<!DOCTYPE html><html><body>${html}</body></html>`;

    const { document } = parseHTML(wrappedHtml);
    return this.convert(document.body || document.documentElement);
  }

  /** Convert a DOM element to markdown */
  convert(element: Element | Document): string {
    // Get document for hooks
    const doc = element.ownerDocument || (element as Document);

    // Run before hooks
    for (const hook of this.beforeHooks) {
      hook(doc as Document);
    }

    // Preprocess lists for proper indentation
    const docElement = 'body' in doc ? (doc as Document).body : element;
    if (docElement) {
      docElement.querySelectorAll('ul, ol').forEach((list: Element) => {
        // Only preprocess top-level lists
        if (!list.parentElement?.closest('ul, ol')) {
          preprocessList(list, this.options.bulletListMarker);
        }
      });
    }

    // Convert
    const result = this.processElement(element);

    // Collect headers and footers
    let markdown = result.markdown;
    if (result.header) {
      markdown = result.header + '\n\n' + markdown;
    }
    if (result.footer) {
      markdown = markdown + '\n\n' + result.footer;
    }

    // Clean up whitespace
    markdown = this.normalizeWhitespace(markdown);

    // Run after hooks
    for (const hook of this.afterHooks) {
      markdown = hook(markdown);
    }

    return markdown.trim();
  }

  /** Process a single element and its children */
  private processElement(element: Element | Document): AdvancedResult {
    const headers: string[] = [];
    const footers: string[] = [];

    // Process children first (depth-first)
    const childContent = this.processChildren(element, headers, footers);

    // Get tag name
    const tagName = 'nodeName' in element
      ? (element as Element).nodeName.toLowerCase()
      : '';

    // Check if this tag should be removed
    if (this.removeTags.has(tagName)) {
      return { markdown: '' };
    }

    // Check if this tag should be kept as HTML
    if (this.keepTags.has(tagName) && 'outerHTML' in element) {
      return { markdown: (element as Element).outerHTML };
    }

    // Apply rules
    const rules = this.rules.get(tagName);
    if (rules && rules.length > 0 && 'outerHTML' in element) {
      for (const rule of rules) {
        let result: AdvancedResult | string | null = null;

        if (rule.advancedReplacement) {
          result = rule.advancedReplacement(childContent, element as Element, this.options);
        } else if (rule.replacement) {
          const md = rule.replacement(childContent, element as Element, this.options);
          if (md !== null) {
            result = { markdown: md };
          }
        }

        if (result !== null) {
          if (typeof result === 'string') {
            result = { markdown: result };
          }
          // Collect headers/footers from this result
          if (result.header) headers.push(result.header);
          if (result.footer) footers.push(result.footer);

          return {
            markdown: result.markdown,
            header: headers.length > 0 ? headers.join('\n') : undefined,
            footer: footers.length > 0 ? footers.join('\n') : undefined,
          };
        }
      }
    }

    // Default: return child content
    return {
      markdown: childContent,
      header: headers.length > 0 ? headers.join('\n') : undefined,
      footer: footers.length > 0 ? footers.join('\n') : undefined,
    };
  }

  /** Process all children of an element */
  private processChildren(
    element: Element | Document,
    headers: string[],
    footers: string[]
  ): string {
    const parts: string[] = [];

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 3) {
        // Text node - apply text rules if any
        const textRules = this.rules.get('#text');
        if (textRules && textRules.length > 0) {
          for (const rule of textRules) {
            if (rule.replacement) {
              // Create a pseudo-element for the text node
              const text = rule.replacement(
                child.textContent || '',
                child as unknown as Element,
                this.options
              );
              if (text !== null) {
                parts.push(text);
                break;
              }
            }
          }
        } else {
          // No text rules, use raw content
          parts.push(child.textContent || '');
        }
      } else if (child.nodeType === 1) {
        // Element node
        const result = this.processElement(child as Element);
        parts.push(result.markdown);
        if (result.header) headers.push(result.header);
        if (result.footer) footers.push(result.footer);
      }
    }

    return parts.join('');
  }

  /** Normalize whitespace in the final markdown */
  private normalizeWhitespace(markdown: string): string {
    // Collapse more than 2 consecutive newlines to 2
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    // Remove trailing whitespace on each line
    markdown = markdown.replace(/[ \t]+$/gm, '');
    // Remove leading/trailing whitespace
    return markdown.trim();
  }
}

/**
 * Create a new converter with CommonMark rules
 */
export function createConverter(options?: Partial<Options>): Converter {
  return new Converter(options);
}
