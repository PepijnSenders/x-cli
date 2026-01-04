/**
 * Markdown character escaping
 * Ported from: github.com/firecrawl/html-to-markdown/escape/escape.go
 */

/** Pattern-replacement pairs for escaping markdown characters */
const replacements: Array<[RegExp | string, string | ((match: string, ...args: string[]) => string)]> = [
  // Escape backslashes first
  [/\\(\S)/g, '\\\\$1'],
  // Escape headings at start of line
  [/^(#{1,6} )/gm, '\\$1'],
  // Escape ordered lists
  [/^(\W* {0,3})(\d+)\. /gm, '$1$2\\. '],
  // Escape unordered lists
  [/^([^\\\w]*)[*+-] /gm, (m: string, p1: string) => p1 + '\\' + m.slice(p1.length)],
  // Escape blockquotes
  [/^(\W* {0,3})> /gm, '$1\\> '],
  // Escape emphasis markers
  ['*', '\\*'],
  ['_', '\\_'],
  // Escape inline code
  ['`', '\\`'],
  // Escape table pipes
  ['|', '\\|'],
  // Escape brackets
  [/([\[\]])/g, '\\$1'],
];

/**
 * Escape markdown special characters in text
 */
export function escapeMarkdownCharacters(text: string): string {
  for (const [pattern, replacement] of replacements) {
    if (typeof pattern === 'string') {
      text = text.split(pattern).join(replacement as string);
    } else {
      text = text.replace(pattern, replacement as string);
    }
  }
  return text;
}

/**
 * Escape content that spans multiple lines (for links, etc.)
 * Replaces newlines with spaces to keep link text on one line
 */
export function escapeMultiLine(text: string): string {
  return text.replace(/\n+/g, ' ').trim();
}
