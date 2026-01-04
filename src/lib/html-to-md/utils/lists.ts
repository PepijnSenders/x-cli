/**
 * List handling utilities
 * Ported from: github.com/firecrawl/html-to-markdown/utils.go
 */

/**
 * Check if a line looks like a list item (starts with marker)
 */
export function isListItem(line: string): boolean {
  const trimmed = line.trimStart();
  // Unordered: - item, * item, + item
  if (/^[-*+] /.test(trimmed)) return true;
  // Ordered: 1. item, 2. item, etc.
  if (/^\d+\. /.test(trimmed)) return true;
  return false;
}

/**
 * Indent multi-line list item content
 * First line is not indented (already has prefix)
 * Subsequent lines get indented to align with content
 */
export function indentMultiLineListItem(text: string, spaces: number): string {
  const lines = text.split('\n');
  const indent = ' '.repeat(spaces);

  return lines.map((line, i) => {
    // First line already has prefix from list item processing
    if (i === 0) return line;
    // Don't double-indent nested list items
    if (isListItem(line)) return line;
    // Empty lines don't need indentation
    if (!line.trim()) return line;
    // Indent continuation lines
    return indent + line;
  }).join('\n');
}

/**
 * Calculate list item prefix based on parent list type
 */
export function calculateListPrefix(
  listEl: Element,
  index: number,
  bulletMarker: string
): { prefix: string; prefixLength: number } {
  const isOrdered = listEl.nodeName.toLowerCase() === 'ol';

  if (isOrdered) {
    // Get start attribute for ordered lists
    const startAttr = listEl.getAttribute('start');
    const start = startAttr ? parseInt(startAttr, 10) : 1;
    const number = (isNaN(start) ? 1 : start) + index;
    const prefix = `${number}. `;
    return { prefix, prefixLength: prefix.length };
  }

  const prefix = `${bulletMarker} `;
  return { prefix, prefixLength: prefix.length };
}

/**
 * Set data attributes on list items for proper indentation
 * This pre-processes the list to calculate proper prefixes
 */
export function preprocessList(listEl: Element, bulletMarker: string, prevPrefixCount = 0): void {
  const items = Array.from(listEl.children).filter(
    child => child.nodeName.toLowerCase() === 'li'
  );

  items.forEach((item, index) => {
    const { prefix, prefixLength } = calculateListPrefix(listEl, index, bulletMarker);

    item.setAttribute('data-converter-list-prefix', prefix);
    item.setAttribute('data-converter-prefix-count', String(prefixLength));
    item.setAttribute('data-converter-prev-prefix-counts', String(prevPrefixCount));

    // Process nested lists
    const nestedLists = Array.from(item.children).filter(
      child => child.nodeName.toLowerCase() === 'ul' || child.nodeName.toLowerCase() === 'ol'
    );

    for (const nested of nestedLists) {
      preprocessList(nested, bulletMarker, prevPrefixCount + prefixLength);
    }
  });
}
