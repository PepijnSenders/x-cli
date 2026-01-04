/**
 * Table plugin for GFM tables
 * Ported from: github.com/firecrawl/html-to-markdown/plugin/table.go
 */

import type { Rule, Plugin, ConverterInterface } from '../types.js';

/**
 * Check if a row is a heading row (first row in thead, or contains th elements)
 */
function isHeadingRow(row: Element): boolean {
  // In thead
  if (row.parentElement?.nodeName.toLowerCase() === 'thead') {
    return true;
  }
  // Contains th elements
  if (row.querySelector('th')) {
    return true;
  }
  // First row in table without thead
  const table = row.closest('table');
  if (table && !table.querySelector('thead')) {
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows[0] === row;
  }
  return false;
}

/**
 * Get cell border based on alignment
 */
function getCellBorder(cell: Element): string {
  const align = cell.getAttribute('align')?.toLowerCase();
  switch (align) {
    case 'left':
      return ':---';
    case 'right':
      return '---:';
    case 'center':
      return ':---:';
    default:
      return '---';
  }
}

/** Table rule */
const tableRule: Rule = {
  filter: ['table'],
  replacement: (content: string, el: Element): string | null => {
    // Check if table has a header row
    const hasHeader = el.querySelector('thead, th') !== null;

    if (!hasHeader) {
      // Create empty header row
      const maxCols = Math.max(
        ...Array.from(el.querySelectorAll('tr')).map(
          (tr) => tr.querySelectorAll('td, th').length
        )
      );

      if (maxCols > 0) {
        const header = '|' + '     |'.repeat(maxCols);
        const divider = '|' + ' --- |'.repeat(maxCols);
        content = header + '\n' + divider + content;
      }
    }

    return '\n\n' + content.trim() + '\n\n';
  },
};

/** Table head rule - skip thead wrapper */
const theadRule: Rule = {
  filter: ['thead'],
  replacement: (content: string): string => content,
};

/** Table body rule - skip tbody wrapper */
const tbodyRule: Rule = {
  filter: ['tbody'],
  replacement: (content: string): string => content,
};

/** Table row rule */
const trRule: Rule = {
  filter: ['tr'],
  replacement: (content: string, el: Element): string => {
    let borderCells = '';

    // If this is a heading row, add the separator line
    if (isHeadingRow(el)) {
      const cells = el.querySelectorAll('th, td');
      cells.forEach((cell) => {
        const border = getCellBorder(cell);
        const isFirst = !cell.previousElementSibling;
        borderCells += (isFirst ? '| ' : ' ') + border + ' |';
      });
    }

    return '\n' + content + (borderCells ? '\n' + borderCells : '');
  },
};

/** Table cell rule (th and td) */
const cellRule: Rule = {
  filter: ['th', 'td'],
  replacement: (content: string, el: Element): string => {
    // Clean up content for table cell
    content = content.trim().replace(/\n+/g, '<br>');
    // Escape pipes in content
    content = content.replace(/\|/g, '\\|');

    const isFirst = !el.previousElementSibling;
    return (isFirst ? '| ' : ' ') + content + ' |';
  },
};

/** Caption rule - convert to paragraph */
const captionRule: Rule = {
  filter: ['caption'],
  replacement: (content: string): string | null => {
    const trimmed = content.trim();
    if (!trimmed) return null;
    return '\n\n*' + trimmed + '*\n\n';
  },
};

/**
 * Table plugin
 */
export function tablePlugin(): Plugin {
  return (converter: ConverterInterface): Rule[] => {
    // Move captions outside tables before conversion
    converter.before((doc: Document) => {
      doc.querySelectorAll('caption').forEach((caption) => {
        const table = caption.parentElement;
        if (table?.matches('table')) {
          // Move caption after table
          table.after(caption);
        }
      });
    });

    return [tableRule, theadRule, tbodyRule, trRule, cellRule, captionRule];
  };
}
