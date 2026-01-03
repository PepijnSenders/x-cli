/**
 * Utility functions for parsing numbers and text from social media platforms.
 */

/**
 * Parse Twitter-style numbers with K/M suffixes.
 *
 * Examples:
 * - "12.5K" → 12500
 * - "1.2M" → 1200000
 * - "1,234" → 1234
 * - "5" → 5
 *
 * @param text - The text to parse (e.g., "12.5K", "1.2M", "1,234")
 * @returns The parsed number, or 0 if parsing fails
 */
export function parseTwitterNumber(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  const cleaned = text.replace(/,/g, '').trim();

  if (cleaned.endsWith('K') || cleaned.endsWith('k')) {
    const number = parseFloat(cleaned.slice(0, -1));
    return isNaN(number) ? 0 : Math.round(number * 1000);
  }

  if (cleaned.endsWith('M') || cleaned.endsWith('m')) {
    const number = parseFloat(cleaned.slice(0, -1));
    return isNaN(number) ? 0 : Math.round(number * 1_000_000);
  }

  if (cleaned.endsWith('B') || cleaned.endsWith('b')) {
    const number = parseFloat(cleaned.slice(0, -1));
    return isNaN(number) ? 0 : Math.round(number * 1_000_000_000);
  }

  const number = parseInt(cleaned, 10);
  return isNaN(number) ? 0 : number;
}

/**
 * Parse LinkedIn duration format: "Jan 2020 - Present · 4 yrs 2 mos"
 *
 * @param text - The duration text from LinkedIn
 * @returns Object with dateRange and duration separated
 */
export function parseLinkedInDuration(text: string): { dateRange: string; duration: string } {
  if (!text || typeof text !== 'string') {
    return { dateRange: '', duration: '' };
  }

  const parts = text.split('·').map(s => s.trim());

  return {
    dateRange: parts[0] || '',
    duration: parts[1] || ''
  };
}

/**
 * Parse a date string from Twitter (relative or absolute).
 *
 * Examples:
 * - "2h" → 2 hours ago
 * - "Jan 15" → January 15 of current or previous year
 * - "Jan 15, 2023" → January 15, 2023
 *
 * @param text - The date text from Twitter
 * @returns ISO 8601 date string, or null if parsing fails
 */
export function parseTwitterDate(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const cleaned = text.trim();

  // Relative time (e.g., "2h", "5m", "1d")
  const relativeMatch = cleaned.match(/^(\d+)([smhd])$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];

    const now = new Date();
    switch (unit) {
      case 's':
        now.setSeconds(now.getSeconds() - amount);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() - amount);
        break;
      case 'h':
        now.setHours(now.getHours() - amount);
        break;
      case 'd':
        now.setDate(now.getDate() - amount);
        break;
    }

    return now.toISOString();
  }

  // Try parsing as a standard date
  try {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Fall through
  }

  return null;
}

/**
 * Clean and normalize whitespace in text.
 *
 * @param text - The text to clean
 * @returns Cleaned text with normalized whitespace
 */
export function cleanText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space (preserve newlines)
    .replace(/\n\s*\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
}

/**
 * Truncate text to a maximum length with ellipsis.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length (including ellipsis)
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract username from Twitter URL or handle.
 *
 * Examples:
 * - "https://x.com/elonmusk" → "elonmusk"
 * - "@elonmusk" → "elonmusk"
 * - "elonmusk" → "elonmusk"
 *
 * @param input - URL or username
 * @returns Username without @ symbol
 */
export function extractTwitterUsername(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove @ prefix
  let cleaned = input.trim();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1);
  }

  // Extract from URL
  const urlMatch = cleaned.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Return as-is if it looks like a valid username
  if (/^[a-zA-Z0-9_]+$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Extract LinkedIn profile slug from URL.
 *
 * Examples:
 * - "https://linkedin.com/in/satyanadella" → "satyanadella"
 * - "https://www.linkedin.com/in/satyanadella/" → "satyanadella"
 *
 * @param input - LinkedIn profile URL
 * @returns Profile slug
 */
export function extractLinkedInSlug(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const match = input.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}
