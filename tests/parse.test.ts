import { describe, expect, test } from 'bun:test';
import {
  parseTwitterNumber,
  parseLinkedInDuration,
  parseTwitterDate,
  cleanText,
  truncateText,
  extractTwitterUsername,
  extractLinkedInSlug
} from '../src/utils/parse.js';

describe('parseTwitterNumber', () => {
  test('parses numbers with K suffix', () => {
    expect(parseTwitterNumber('12.5K')).toBe(12500);
    expect(parseTwitterNumber('1K')).toBe(1000);
    expect(parseTwitterNumber('10.3K')).toBe(10300);
    expect(parseTwitterNumber('0.5K')).toBe(500);
  });

  test('parses numbers with M suffix', () => {
    expect(parseTwitterNumber('1.2M')).toBe(1200000);
    expect(parseTwitterNumber('5M')).toBe(5000000);
    expect(parseTwitterNumber('10.5M')).toBe(10500000);
    expect(parseTwitterNumber('0.1M')).toBe(100000);
  });

  test('parses numbers with B suffix', () => {
    expect(parseTwitterNumber('1.5B')).toBe(1500000000);
    expect(parseTwitterNumber('2B')).toBe(2000000000);
  });

  test('parses numbers with commas', () => {
    expect(parseTwitterNumber('1,234')).toBe(1234);
    expect(parseTwitterNumber('1,234,567')).toBe(1234567);
    expect(parseTwitterNumber('10,000')).toBe(10000);
  });

  test('parses plain numbers', () => {
    expect(parseTwitterNumber('123')).toBe(123);
    expect(parseTwitterNumber('5')).toBe(5);
    expect(parseTwitterNumber('0')).toBe(0);
  });

  test('handles lowercase suffixes', () => {
    expect(parseTwitterNumber('12k')).toBe(12000);
    expect(parseTwitterNumber('1.5m')).toBe(1500000);
    expect(parseTwitterNumber('2b')).toBe(2000000000);
  });

  test('handles invalid input', () => {
    expect(parseTwitterNumber('')).toBe(0);
    expect(parseTwitterNumber('abc')).toBe(0);
    expect(parseTwitterNumber('K')).toBe(0);
    expect(parseTwitterNumber('M')).toBe(0);
  });

  test('handles whitespace', () => {
    expect(parseTwitterNumber('  123  ')).toBe(123);
    expect(parseTwitterNumber(' 1.5K ')).toBe(1500);
  });

  test('handles null and undefined', () => {
    expect(parseTwitterNumber(null as any)).toBe(0);
    expect(parseTwitterNumber(undefined as any)).toBe(0);
  });
});

describe('parseLinkedInDuration', () => {
  test('parses standard duration format', () => {
    const result = parseLinkedInDuration('Jan 2020 - Present · 4 yrs 2 mos');
    expect(result.dateRange).toBe('Jan 2020 - Present');
    expect(result.duration).toBe('4 yrs 2 mos');
  });

  test('parses duration without date range', () => {
    const result = parseLinkedInDuration('4 yrs 2 mos');
    expect(result.dateRange).toBe('4 yrs 2 mos');
    expect(result.duration).toBe('');
  });

  test('parses date range without duration', () => {
    const result = parseLinkedInDuration('Jan 2020 - Dec 2021 ·');
    expect(result.dateRange).toBe('Jan 2020 - Dec 2021');
    expect(result.duration).toBe('');
  });

  test('handles empty string', () => {
    const result = parseLinkedInDuration('');
    expect(result.dateRange).toBe('');
    expect(result.duration).toBe('');
  });

  test('handles multiple separators', () => {
    const result = parseLinkedInDuration('Jan 2020 - Present · 4 yrs · Remote');
    expect(result.dateRange).toBe('Jan 2020 - Present');
    expect(result.duration).toBe('4 yrs');
  });

  test('trims whitespace', () => {
    const result = parseLinkedInDuration('  Jan 2020  ·  4 yrs  ');
    expect(result.dateRange).toBe('Jan 2020');
    expect(result.duration).toBe('4 yrs');
  });

  test('handles null and undefined', () => {
    const nullResult = parseLinkedInDuration(null as any);
    expect(nullResult.dateRange).toBe('');
    expect(nullResult.duration).toBe('');

    const undefinedResult = parseLinkedInDuration(undefined as any);
    expect(undefinedResult.dateRange).toBe('');
    expect(undefinedResult.duration).toBe('');
  });
});

describe('parseTwitterDate', () => {
  test('parses relative time in seconds', () => {
    const result = parseTwitterDate('30s');
    expect(result).not.toBeNull();
    if (result) {
      const date = new Date(result);
      const now = new Date();
      const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
      expect(diffSeconds).toBeGreaterThanOrEqual(29);
      expect(diffSeconds).toBeLessThanOrEqual(31);
    }
  });

  test('parses relative time in minutes', () => {
    const result = parseTwitterDate('5m');
    expect(result).not.toBeNull();
    if (result) {
      const date = new Date(result);
      const now = new Date();
      const diffMinutes = Math.round((now.getTime() - date.getTime()) / 60000);
      expect(diffMinutes).toBeGreaterThanOrEqual(4);
      expect(diffMinutes).toBeLessThanOrEqual(6);
    }
  });

  test('parses relative time in hours', () => {
    const result = parseTwitterDate('2h');
    expect(result).not.toBeNull();
    if (result) {
      const date = new Date(result);
      const now = new Date();
      const diffHours = Math.round((now.getTime() - date.getTime()) / 3600000);
      expect(diffHours).toBeGreaterThanOrEqual(1);
      expect(diffHours).toBeLessThanOrEqual(3);
    }
  });

  test('parses relative time in days', () => {
    const result = parseTwitterDate('3d');
    expect(result).not.toBeNull();
    if (result) {
      const date = new Date(result);
      const now = new Date();
      const diffDays = Math.round((now.getTime() - date.getTime()) / 86400000);
      expect(diffDays).toBeGreaterThanOrEqual(2);
      expect(diffDays).toBeLessThanOrEqual(4);
    }
  });

  test('parses absolute dates', () => {
    const result = parseTwitterDate('2024-01-15T10:30:00Z');
    expect(result).toBe('2024-01-15T10:30:00.000Z');
  });

  test('handles invalid dates', () => {
    expect(parseTwitterDate('invalid')).toBeNull();
    expect(parseTwitterDate('')).toBeNull();
    expect(parseTwitterDate('abc123')).toBeNull();
  });

  test('handles null and undefined', () => {
    expect(parseTwitterDate(null as any)).toBeNull();
    expect(parseTwitterDate(undefined as any)).toBeNull();
  });
});

describe('cleanText', () => {
  test('normalizes multiple spaces', () => {
    expect(cleanText('hello    world')).toBe('hello world');
    expect(cleanText('test  spaces   here')).toBe('test spaces here');
  });

  test('normalizes multiple newlines', () => {
    expect(cleanText('hello\n\n\nworld')).toBe('hello\nworld');
    expect(cleanText('line1\n\n\n\nline2')).toBe('line1\nline2');
  });

  test('trims leading and trailing whitespace', () => {
    expect(cleanText('  hello  ')).toBe('hello');
    expect(cleanText('\n\nhello\n\n')).toBe('hello');
  });

  test('handles tabs and mixed whitespace', () => {
    expect(cleanText('hello\t\tworld')).toBe('hello world');
    expect(cleanText('test \t  mixed')).toBe('test mixed');
  });

  test('handles empty strings', () => {
    expect(cleanText('')).toBe('');
    expect(cleanText('   ')).toBe('');
  });

  test('preserves single newlines', () => {
    expect(cleanText('line1\nline2\nline3')).toBe('line1\nline2\nline3');
  });

  test('handles null and undefined', () => {
    expect(cleanText(null as any)).toBe('');
    expect(cleanText(undefined as any)).toBe('');
  });
});

describe('truncateText', () => {
  test('truncates long text', () => {
    expect(truncateText('hello world this is a test', 15)).toBe('hello world ...');
    expect(truncateText('1234567890', 7)).toBe('1234...');
  });

  test('does not truncate short text', () => {
    expect(truncateText('hello', 10)).toBe('hello');
    expect(truncateText('test', 4)).toBe('test');
  });

  test('handles exact length', () => {
    expect(truncateText('hello', 5)).toBe('hello');
  });

  test('handles very short max length', () => {
    expect(truncateText('hello', 3)).toBe('...');
  });

  test('handles empty strings', () => {
    expect(truncateText('', 10)).toBe('');
  });

  test('handles null and undefined', () => {
    expect(truncateText(null as any, 10)).toBe('');
    expect(truncateText(undefined as any, 10)).toBe('');
  });
});

describe('extractTwitterUsername', () => {
  test('extracts from x.com URLs', () => {
    expect(extractTwitterUsername('https://x.com/elonmusk')).toBe('elonmusk');
    expect(extractTwitterUsername('https://x.com/elonmusk/status/123')).toBe('elonmusk');
    expect(extractTwitterUsername('http://x.com/jack')).toBe('jack');
  });

  test('extracts from twitter.com URLs', () => {
    expect(extractTwitterUsername('https://twitter.com/elonmusk')).toBe('elonmusk');
    expect(extractTwitterUsername('https://www.twitter.com/jack')).toBe('jack');
  });

  test('extracts from @ handles', () => {
    expect(extractTwitterUsername('@elonmusk')).toBe('elonmusk');
    expect(extractTwitterUsername('@jack')).toBe('jack');
  });

  test('extracts from plain usernames', () => {
    expect(extractTwitterUsername('elonmusk')).toBe('elonmusk');
    expect(extractTwitterUsername('jack')).toBe('jack');
  });

  test('handles usernames with underscores and numbers', () => {
    expect(extractTwitterUsername('user_name_123')).toBe('user_name_123');
    expect(extractTwitterUsername('@test_123')).toBe('test_123');
  });

  test('returns null for invalid input', () => {
    expect(extractTwitterUsername('')).toBeNull();
    expect(extractTwitterUsername('https://example.com')).toBeNull();
    expect(extractTwitterUsername('invalid@user!')).toBeNull();
  });

  test('handles whitespace', () => {
    expect(extractTwitterUsername('  elonmusk  ')).toBe('elonmusk');
    expect(extractTwitterUsername('  @jack  ')).toBe('jack');
  });

  test('handles null and undefined', () => {
    expect(extractTwitterUsername(null as any)).toBeNull();
    expect(extractTwitterUsername(undefined as any)).toBeNull();
  });
});

describe('extractLinkedInSlug', () => {
  test('extracts from LinkedIn URLs', () => {
    expect(extractLinkedInSlug('https://linkedin.com/in/satyanadella')).toBe('satyanadella');
    expect(extractLinkedInSlug('https://www.linkedin.com/in/satyanadella/')).toBe('satyanadella');
  });

  test('handles slugs with hyphens', () => {
    expect(extractLinkedInSlug('https://linkedin.com/in/john-doe-123')).toBe('john-doe-123');
  });

  test('handles various URL formats', () => {
    expect(extractLinkedInSlug('http://linkedin.com/in/testuser')).toBe('testuser');
    expect(extractLinkedInSlug('https://www.linkedin.com/in/testuser?trk=123')).toBe('testuser');
  });

  test('returns null for invalid input', () => {
    expect(extractLinkedInSlug('')).toBeNull();
    expect(extractLinkedInSlug('https://example.com')).toBeNull();
    expect(extractLinkedInSlug('not a url')).toBeNull();
  });

  test('returns null for non-profile URLs', () => {
    expect(extractLinkedInSlug('https://linkedin.com/company/microsoft')).toBeNull();
    expect(extractLinkedInSlug('https://linkedin.com/jobs/view/123')).toBeNull();
  });

  test('handles null and undefined', () => {
    expect(extractLinkedInSlug(null as any)).toBeNull();
    expect(extractLinkedInSlug(undefined as any)).toBeNull();
  });
});
