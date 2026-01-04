/**
 * TypeScript port of Firecrawl's html-to-markdown library
 * Ported from: github.com/firecrawl/html-to-markdown
 */

/** Options for the Converter */
export interface Options {
  /** Heading style: 'setext' uses underlines, 'atx' uses # */
  headingStyle: 'setext' | 'atx';
  /** Horizontal rule characters */
  horizontalRule: string;
  /** Bullet list marker character */
  bulletListMarker: '-' | '+' | '*';
  /** Code block style: 'indented' or 'fenced' */
  codeBlockStyle: 'indented' | 'fenced';
  /** Fence character for code blocks */
  fence: '```' | '~~~';
  /** Emphasis delimiter */
  emDelimiter: '_' | '*';
  /** Strong emphasis delimiter */
  strongDelimiter: '**' | '__';
  /** Link style: 'inlined' or 'referenced' */
  linkStyle: 'inlined' | 'referenced';
  /** Link reference style when using referenced links */
  linkReferenceStyle: 'full' | 'collapsed' | 'shortcut';
  /** Escape mode: 'basic' escapes markdown chars, 'disabled' for raw */
  escapeMode: 'basic' | 'disabled';
  /** Base domain for resolving relative URLs */
  domain?: string;
}

/** Default options */
export const defaultOptions: Options = {
  headingStyle: 'atx',
  horizontalRule: '* * *',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full',
  escapeMode: 'basic',
};

/** Result from advanced replacement containing markdown and optional header/footer */
export interface AdvancedResult {
  markdown: string;
  header?: string;
  footer?: string;
}

/** A conversion rule */
export interface Rule {
  /** Tag names this rule applies to */
  filter: string[];
  /** Simple replacement function */
  replacement?: (content: string, el: Element, options: Options) => string | null;
  /** Advanced replacement with header/footer support */
  advancedReplacement?: (content: string, el: Element, options: Options) => AdvancedResult | null;
}

/** Hook that runs before conversion on the document */
export type BeforeHook = (doc: Document) => void;

/** Hook that runs after conversion on the markdown string */
export type AfterHook = (markdown: string) => string;

/** A plugin function that configures the converter */
export type Plugin = (converter: ConverterInterface) => Rule[] | void;

/** Converter interface for plugins */
export interface ConverterInterface {
  addRules(...rules: Rule[]): ConverterInterface;
  keep(...tags: string[]): ConverterInterface;
  remove(...tags: string[]): ConverterInterface;
  before(...hooks: BeforeHook[]): ConverterInterface;
  after(...hooks: AfterHook[]): ConverterInterface;
}
