/**
 * Spacing and whitespace utilities
 * Ported from: github.com/firecrawl/html-to-markdown/utils.go
 */

/** Inline elements that don't create block breaks */
const INLINE_ELEMENTS = new Set([
  'a', 'abbr', 'acronym', 'b', 'bdo', 'big', 'br', 'button', 'cite',
  'code', 'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map',
  'object', 'output', 'q', 'samp', 'script', 'select', 'small', 'span',
  'strong', 'sub', 'sup', 'textarea', 'time', 'tt', 'var',
]);

/**
 * Check if a tag name represents an inline element
 */
export function isInlineElement(tagName?: string): boolean {
  if (!tagName) return false;
  return INLINE_ELEMENTS.has(tagName.toLowerCase());
}

/**
 * Get text content of the previous sibling (for spacing decisions)
 */
export function getPrevSiblingText(el: Element): string {
  let node = el.previousSibling;
  while (node) {
    if (node.nodeType === 3) { // Text node
      return node.textContent || '';
    }
    if (node.nodeType === 1) { // Element node
      return (node as Element).textContent || '';
    }
    node = node.previousSibling;
  }
  return '';
}

/**
 * Get text content of the next sibling (for spacing decisions)
 */
export function getNextSiblingText(el: Element): string {
  let node = el.nextSibling;
  while (node) {
    if (node.nodeType === 3) { // Text node
      return node.textContent || '';
    }
    if (node.nodeType === 1) { // Element node
      return (node as Element).textContent || '';
    }
    node = node.nextSibling;
  }
  return '';
}

/**
 * Add space before/after markdown if neighboring text needs it
 * Prevents words from running together: "hello**world**there" -> "hello **world** there"
 */
export function addSpaceIfNecessary(el: Element, markdown: string): string {
  if (!markdown) return markdown;

  const prevText = getPrevSiblingText(el);
  const nextText = getNextSiblingText(el);

  // Add leading space if previous char is not whitespace
  if (prevText) {
    const lastChar = prevText.slice(-1);
    if (lastChar && !/\s/.test(lastChar)) {
      markdown = ' ' + markdown;
    }
  }

  // Add trailing space if next char is not whitespace or punctuation
  if (nextText) {
    const firstChar = nextText[0];
    if (firstChar && !/[\s\p{P}]/u.test(firstChar)) {
      markdown = markdown + ' ';
    }
  }

  return markdown;
}

/**
 * Trim leading spaces from each line while preserving structure
 */
export function trimLeadingSpaces(text: string): string {
  return text.split('\n').map(line => line.trimStart()).join('\n');
}

/**
 * Apply delimiter to every line (for multiline bold/italic)
 */
export function delimiterForEveryLine(text: string, delimiter: string): string {
  return text.split('\n')
    .map(line => {
      line = line.trim();
      return line ? delimiter + line + delimiter : '';
    })
    .join('\n');
}

/**
 * Resolve a URL against a base domain
 */
export function getAbsoluteURL(url: string, domain?: string): string {
  if (!url || !domain) return url;

  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url;
  }

  // Data URIs, javascript:, etc.
  if (url.includes(':')) {
    return url;
  }

  try {
    return new URL(url, domain).href;
  } catch {
    return url;
  }
}
