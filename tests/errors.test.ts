import { describe, expect, test } from 'bun:test';
import {
  ExitCode,
  checkTwitterErrors,
  checkLinkedInErrors,
  getExitCode,
  getErrorHint,
  formatError,
  ScraperError,
  throwScraperError,
  isConnectionError,
  isTimeoutError,
  getErrorMessage
} from '../src/utils/errors.js';

describe('checkTwitterErrors', () => {
  test('detects account not found', () => {
    expect(checkTwitterErrors("This account doesn't exist")).toBe('not_found');
    expect(checkTwitterErrors("Account doesn't exist - try searching")).toBe('not_found');
  });

  test('detects suspended accounts', () => {
    expect(checkTwitterErrors('Account suspended')).toBe('suspended');
    expect(checkTwitterErrors('This is a suspended account')).toBe('suspended');
  });

  test('detects rate limiting', () => {
    expect(checkTwitterErrors('Rate limit exceeded')).toBe('rate_limited');
    expect(checkTwitterErrors('You have exceeded the rate limit')).toBe('rate_limited');
  });

  test('detects login requirement', () => {
    expect(checkTwitterErrors('Log in to Twitter to see this')).toBe('login_required');
    expect(checkTwitterErrors('Please log in to continue')).toBe('login_required');
  });

  test('does not detect login requirement when logged in', () => {
    expect(checkTwitterErrors('Log in | Log out')).toBeNull();
    expect(checkTwitterErrors('Profile settings | Log out')).toBeNull();
  });

  test('returns null for normal content', () => {
    expect(checkTwitterErrors('Welcome to Twitter')).toBeNull();
    expect(checkTwitterErrors('Latest tweets from @user')).toBeNull();
  });

  test('is case insensitive', () => {
    expect(checkTwitterErrors('ACCOUNT SUSPENDED')).toBe('suspended');
    expect(checkTwitterErrors('RATE LIMIT EXCEEDED')).toBe('rate_limited');
  });

  test('handles empty or invalid input', () => {
    expect(checkTwitterErrors('')).toBeNull();
    expect(checkTwitterErrors(null as any)).toBeNull();
    expect(checkTwitterErrors(undefined as any)).toBeNull();
  });
});

describe('checkLinkedInErrors', () => {
  test('detects page not found', () => {
    expect(checkLinkedInErrors('Page not found')).toBe('not_found');
    expect(checkLinkedInErrors('404 - This page does not exist')).toBe('not_found');
  });

  test('detects unusual activity', () => {
    expect(checkLinkedInErrors('We detected unusual activity')).toBe('rate_limited');
    expect(checkLinkedInErrors('Your account is restricted')).toBe('rate_limited');
  });

  test('detects login requirement', () => {
    expect(checkLinkedInErrors('Sign in to LinkedIn')).toBe('login_required');
    expect(checkLinkedInErrors('Please sign in to continue')).toBe('login_required');
  });

  test('does not detect login requirement when logged in', () => {
    expect(checkLinkedInErrors('Profile | Sign out')).toBeNull();
    expect(checkLinkedInErrors('Settings | Sign out')).toBeNull();
  });

  test('returns null for normal content', () => {
    expect(checkLinkedInErrors('Welcome to LinkedIn')).toBeNull();
    expect(checkLinkedInErrors('Your network')).toBeNull();
  });

  test('is case insensitive', () => {
    expect(checkLinkedInErrors('PAGE NOT FOUND')).toBe('not_found');
    expect(checkLinkedInErrors('UNUSUAL ACTIVITY')).toBe('rate_limited');
  });

  test('handles empty or invalid input', () => {
    expect(checkLinkedInErrors('')).toBeNull();
    expect(checkLinkedInErrors(null as any)).toBeNull();
    expect(checkLinkedInErrors(undefined as any)).toBeNull();
  });
});

describe('getExitCode', () => {
  test('maps not_found to NOT_FOUND', () => {
    expect(getExitCode('not_found')).toBe(ExitCode.NOT_FOUND);
  });

  test('maps suspended to NOT_FOUND', () => {
    expect(getExitCode('suspended')).toBe(ExitCode.NOT_FOUND);
  });

  test('maps rate_limited to RATE_LIMITED', () => {
    expect(getExitCode('rate_limited')).toBe(ExitCode.RATE_LIMITED);
  });

  test('maps restricted to RATE_LIMITED', () => {
    expect(getExitCode('restricted')).toBe(ExitCode.RATE_LIMITED);
  });

  test('maps login_required to LOGIN_REQUIRED', () => {
    expect(getExitCode('login_required')).toBe(ExitCode.LOGIN_REQUIRED);
  });

  test('maps connection_error to CONNECTION_ERROR', () => {
    expect(getExitCode('connection_error')).toBe(ExitCode.CONNECTION_ERROR);
  });

  test('maps navigation_timeout to NAVIGATION_TIMEOUT', () => {
    expect(getExitCode('navigation_timeout')).toBe(ExitCode.NAVIGATION_TIMEOUT);
  });

  test('maps element_not_found to ELEMENT_NOT_FOUND', () => {
    expect(getExitCode('element_not_found')).toBe(ExitCode.ELEMENT_NOT_FOUND);
  });

  test('maps no_pages to NO_PAGES', () => {
    expect(getExitCode('no_pages')).toBe(ExitCode.NO_PAGES);
  });
});

describe('getErrorHint', () => {
  test('provides hint for not_found', () => {
    const hint = getErrorHint('not_found');
    expect(hint).toContain('does not exist');
  });

  test('provides hint for suspended', () => {
    const hint = getErrorHint('suspended');
    expect(hint).toContain('suspended');
  });

  test('provides hint for rate_limited', () => {
    const hint = getErrorHint('rate_limited');
    expect(hint).toContain('Rate limit');
    expect(hint).toContain('Wait');
  });

  test('provides hint for restricted', () => {
    const hint = getErrorHint('restricted');
    expect(hint).toContain('unusual activity');
  });

  test('provides hint for login_required', () => {
    const hint = getErrorHint('login_required');
    expect(hint).toContain('logged in');
  });

  test('provides hint for connection_error', () => {
    const hint = getErrorHint('connection_error');
    expect(hint).toContain('Playwriter');
  });

  test('provides hint for navigation_timeout', () => {
    const hint = getErrorHint('navigation_timeout');
    expect(hint).toContain('timeout');
  });

  test('provides hint for element_not_found', () => {
    const hint = getErrorHint('element_not_found');
    expect(hint).toContain('content');
  });

  test('provides hint for no_pages', () => {
    const hint = getErrorHint('no_pages');
    expect(hint).toContain('No browser pages');
  });
});

describe('formatError', () => {
  test('formats Error objects', () => {
    const error = new Error('Test error');
    const formatted = formatError(error);

    expect(formatted.error).toBe('Test error');
    expect(formatted.code).toBe(ExitCode.GENERAL_ERROR);
  });

  test('formats string errors', () => {
    const formatted = formatError('String error');

    expect(formatted.error).toBe('String error');
    expect(formatted.code).toBe(ExitCode.GENERAL_ERROR);
  });

  test('formats with error type', () => {
    const error = new Error('Not found');
    const formatted = formatError(error, 'not_found');

    expect(formatted.error).toBe('Not found');
    expect(formatted.code).toBe(ExitCode.NOT_FOUND);
    expect(formatted.hint).toContain('does not exist');
  });

  test('detects timeout from message', () => {
    const error = new Error('Navigation timeout exceeded');
    const formatted = formatError(error);

    expect(formatted.code).toBe(ExitCode.NAVIGATION_TIMEOUT);
    expect(formatted.hint).toBeDefined();
  });

  test('detects connection error from message', () => {
    const error = new Error('Connection refused');
    const formatted = formatError(error);

    expect(formatted.code).toBe(ExitCode.CONNECTION_ERROR);
    expect(formatted.hint).toBeDefined();
  });

  test('detects rate limit from message', () => {
    const error = new Error('Rate limit exceeded');
    const formatted = formatError(error);

    expect(formatted.code).toBe(ExitCode.RATE_LIMITED);
    expect(formatted.hint).toBeDefined();
  });

  test('includes stack trace in details', () => {
    const error = new Error('Test error');
    const formatted = formatError(error);

    expect(formatted.details).toBeDefined();
    expect(formatted.details?.stack).toBeDefined();
    expect(Array.isArray(formatted.details?.stack)).toBe(true);
  });

  test('limits stack trace to 5 lines', () => {
    const error = new Error('Test error');
    const formatted = formatError(error);

    if (formatted.details?.stack && Array.isArray(formatted.details.stack)) {
      expect(formatted.details.stack.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('ScraperError', () => {
  test('creates error with type and message', () => {
    const error = new ScraperError('Test error', 'not_found');

    expect(error.message).toBe('Test error');
    expect(error.type).toBe('not_found');
    expect(error.name).toBe('ScraperError');
  });

  test('creates error with details', () => {
    const details = { url: 'https://example.com', status: 404 };
    const error = new ScraperError('Test error', 'not_found', details);

    expect(error.details).toEqual(details);
  });

  test('converts to JSON', () => {
    const error = new ScraperError('Test error', 'rate_limited');
    const json = error.toJSON();

    expect(json.error).toBe('Test error');
    expect(json.code).toBe(ExitCode.RATE_LIMITED);
    expect(json.hint).toBeDefined();
  });

  test('is instance of Error', () => {
    const error = new ScraperError('Test error', 'not_found');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof ScraperError).toBe(true);
  });
});

describe('throwScraperError', () => {
  test('throws ScraperError', () => {
    expect(() => {
      throwScraperError('not_found', 'Test error');
    }).toThrow(ScraperError);
  });

  test('throws with correct type', () => {
    try {
      throwScraperError('rate_limited', 'Test error');
    } catch (error) {
      expect(error).toBeInstanceOf(ScraperError);
      if (error instanceof ScraperError) {
        expect(error.type).toBe('rate_limited');
        expect(error.message).toBe('Test error');
      }
    }
  });

  test('throws with details', () => {
    const details = { url: 'https://example.com' };

    try {
      throwScraperError('not_found', 'Test error', details);
    } catch (error) {
      expect(error).toBeInstanceOf(ScraperError);
      if (error instanceof ScraperError) {
        expect(error.details).toEqual(details);
      }
    }
  });
});

describe('isConnectionError', () => {
  test('detects ECONNREFUSED', () => {
    expect(isConnectionError(new Error('connect ECONNREFUSED'))).toBe(true);
    expect(isConnectionError(new Error('ECONNREFUSED 127.0.0.1'))).toBe(true);
  });

  test('detects connection refused', () => {
    expect(isConnectionError(new Error('Connection refused'))).toBe(true);
    expect(isConnectionError(new Error('connection refused by server'))).toBe(true);
  });

  test('detects extension not connected', () => {
    expect(isConnectionError(new Error('Extension not connected'))).toBe(true);
    expect(isConnectionError(new Error('No connection available'))).toBe(true);
  });

  test('is case insensitive', () => {
    expect(isConnectionError(new Error('CONNECTION REFUSED'))).toBe(true);
  });

  test('handles string errors', () => {
    expect(isConnectionError('connect ECONNREFUSED')).toBe(true);
  });

  test('returns false for other errors', () => {
    expect(isConnectionError(new Error('Timeout'))).toBe(false);
    expect(isConnectionError(new Error('Not found'))).toBe(false);
  });
});

describe('isTimeoutError', () => {
  test('detects timeout errors', () => {
    expect(isTimeoutError(new Error('Navigation timeout'))).toBe(true);
    expect(isTimeoutError(new Error('Request timed out'))).toBe(true);
  });

  test('is case insensitive', () => {
    expect(isTimeoutError(new Error('TIMEOUT'))).toBe(true);
  });

  test('handles string errors', () => {
    expect(isTimeoutError('timeout exceeded')).toBe(true);
  });

  test('returns false for other errors', () => {
    expect(isTimeoutError(new Error('Connection refused'))).toBe(false);
    expect(isTimeoutError(new Error('Not found'))).toBe(false);
  });
});

describe('getErrorMessage', () => {
  test('extracts message from Error objects', () => {
    expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
  });

  test('handles string errors', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  test('handles objects with message property', () => {
    expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
  });

  test('handles unknown error types', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred');
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    expect(getErrorMessage(123)).toBe('An unknown error occurred');
  });

  test('handles objects without message', () => {
    expect(getErrorMessage({ code: 404 })).toBe('An unknown error occurred');
  });
});

describe('ExitCode enum', () => {
  test('has correct values', () => {
    expect(ExitCode.SUCCESS).toBe(0);
    expect(ExitCode.GENERAL_ERROR).toBe(1);
    expect(ExitCode.CONNECTION_ERROR).toBe(2);
    expect(ExitCode.NO_PAGES).toBe(3);
    expect(ExitCode.NAVIGATION_TIMEOUT).toBe(4);
    expect(ExitCode.ELEMENT_NOT_FOUND).toBe(5);
    expect(ExitCode.RATE_LIMITED).toBe(6);
    expect(ExitCode.LOGIN_REQUIRED).toBe(7);
    expect(ExitCode.NOT_FOUND).toBe(8);
  });

  test('all exit codes are unique', () => {
    const values = Object.values(ExitCode).filter(v => typeof v === 'number');
    const uniqueValues = new Set(values);
    expect(values.length).toBe(uniqueValues.size);
  });
});
