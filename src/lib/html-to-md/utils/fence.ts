/**
 * Code fence utilities
 * Ported from: github.com/firecrawl/html-to-markdown/utils.go
 */

/**
 * Calculate the appropriate code fence based on content
 * If content contains backticks/tildes, we need more fence characters
 */
export function calculateCodeFence(fenceChar: string, content: string): string {
  let maxConsecutive = 0;
  let current = 0;

  for (const char of content) {
    if (char === fenceChar) {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 0;
    }
  }

  // Fence must be at least 3 chars and more than any sequence in content
  const count = Math.max(3, maxConsecutive + 1);
  return fenceChar.repeat(count);
}

/**
 * Extract language from code element's class attribute
 */
export function extractLanguage(el: Element): string {
  const codeEl = el.matches('code') ? el : el.querySelector('code');
  if (!codeEl) return '';

  const className = codeEl.getAttribute('class') || '';

  // Common patterns: language-js, lang-js, hljs-js
  const match = className.match(/(?:language-|lang-|hljs-)(\w+)/);
  if (match) return match[1];

  // If class is just a language name
  const simpleMatch = className.match(/^(\w+)$/);
  if (simpleMatch && isLikelyLanguage(simpleMatch[1])) {
    return simpleMatch[1];
  }

  return '';
}

/** Common programming languages for detection */
const commonLanguages = new Set([
  'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'ruby', 'rb',
  'java', 'go', 'rust', 'c', 'cpp', 'csharp', 'cs', 'php', 'swift',
  'kotlin', 'scala', 'bash', 'sh', 'shell', 'zsh', 'powershell', 'ps1',
  'sql', 'html', 'css', 'scss', 'sass', 'less', 'json', 'yaml', 'yml',
  'xml', 'markdown', 'md', 'plaintext', 'text', 'diff', 'dockerfile',
]);

function isLikelyLanguage(str: string): boolean {
  return commonLanguages.has(str.toLowerCase());
}

/**
 * Collect text content from inline code elements
 * Handles nested elements properly
 */
export function collectInlineCodeContent(el: Element): string {
  let result = '';

  const walk = (node: Node) => {
    if (node.nodeType === 3) { // Text node
      result += node.textContent || '';
    } else if (node.nodeType === 1) { // Element node
      const element = node as Element;
      // Handle br tags as newlines
      if (element.nodeName.toLowerCase() === 'br') {
        result += '\n';
      } else {
        for (const child of Array.from(node.childNodes)) {
          walk(child);
        }
      }
    }
  };

  walk(el);
  return result;
}
