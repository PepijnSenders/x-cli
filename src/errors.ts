/**
 * Error Handling Utilities
 *
 * Consistent error detection and response formatting for MCP tools.
 */

// ============================================================================
// Error Types
// ============================================================================

export enum ErrorCode {
  EXTENSION_NOT_CONNECTED = 'EXTENSION_NOT_CONNECTED',
  NO_PAGES_AVAILABLE = 'NO_PAGES_AVAILABLE',
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  NAVIGATION_TIMEOUT = 'NAVIGATION_TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  LOGIN_REQUIRED = 'LOGIN_REQUIRED',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  INVALID_INPUT = 'INVALID_INPUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ScraperError {
  code: ErrorCode;
  message: string;
  recoveryHint?: string;
}

// ============================================================================
// Error Detection
// ============================================================================

/**
 * Detect error type from error message
 */
export function detectErrorType(error: Error | string): ScraperError {
  const message = error instanceof Error ? error.message : error;
  const lowerMessage = message.toLowerCase();

  // Extension/connection errors
  if (lowerMessage.includes('econnrefused') || lowerMessage.includes('connect')) {
    return {
      code: ErrorCode.EXTENSION_NOT_CONNECTED,
      message: 'Extension not connected',
      recoveryHint: 'Make sure Chrome has the Playwriter extension installed and enabled. Click the extension icon on a tab to enable control.',
    };
  }

  // No pages available
  if (lowerMessage.includes('no pages available') || lowerMessage.includes('no tabs')) {
    return {
      code: ErrorCode.NO_PAGES_AVAILABLE,
      message: 'No pages available for control',
      recoveryHint: 'Click the Playwriter extension icon on a Chrome tab to enable control.',
    };
  }

  // Navigation timeout
  if (lowerMessage.includes('timeout') || lowerMessage.includes('navigation')) {
    return {
      code: ErrorCode.NAVIGATION_TIMEOUT,
      message: 'Navigation timed out',
      recoveryHint: 'The page took too long to load. Try again or navigate manually.',
    };
  }

  // Rate limiting - Twitter
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return {
      code: ErrorCode.RATE_LIMITED,
      message: 'Rate limit detected',
      recoveryHint: 'Wait a few minutes before making more requests.',
    };
  }

  // Rate limiting - LinkedIn (unusual activity)
  if (lowerMessage.includes('unusual activity') || lowerMessage.includes('restricted')) {
    return {
      code: ErrorCode.RATE_LIMITED,
      message: 'Unusual activity detected by LinkedIn',
      recoveryHint: 'Wait 10-15 minutes before making more requests. Use LinkedIn normally for a while.',
    };
  }

  // Login required
  if (lowerMessage.includes('sign in') || lowerMessage.includes('log in') ||
      lowerMessage.includes('not logged in') || lowerMessage.includes('login required')) {
    return {
      code: ErrorCode.LOGIN_REQUIRED,
      message: 'Login required',
      recoveryHint: 'Log into the website in your browser first.',
    };
  }

  // Profile not found
  if (lowerMessage.includes('not found') || lowerMessage.includes('doesn\'t exist') ||
      lowerMessage.includes('page not found')) {
    return {
      code: ErrorCode.PROFILE_NOT_FOUND,
      message: 'Profile or page not found',
      recoveryHint: 'Check that the username or URL is correct.',
    };
  }

  // Account suspended
  if (lowerMessage.includes('suspended') || lowerMessage.includes('banned')) {
    return {
      code: ErrorCode.ACCOUNT_SUSPENDED,
      message: 'Account suspended or banned',
      recoveryHint: 'The account you\'re trying to access has been suspended.',
    };
  }

  // Element not found (selector issues)
  if (lowerMessage.includes('element') || lowerMessage.includes('selector') ||
      lowerMessage.includes('waiting for')) {
    return {
      code: ErrorCode.ELEMENT_NOT_FOUND,
      message: 'Expected element not found',
      recoveryHint: 'The page structure may have changed. Try refreshing the page.',
    };
  }

  // Invalid input
  if (lowerMessage.includes('invalid') || lowerMessage.includes('argument')) {
    return {
      code: ErrorCode.INVALID_INPUT,
      message: message,
      recoveryHint: 'Check that all required parameters are provided correctly.',
    };
  }

  // Unknown error
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: message,
    recoveryHint: undefined,
  };
}

/**
 * Format error for MCP response
 */
export function formatErrorResponse(error: Error | string | ScraperError) {
  let scraperError: ScraperError;

  if (typeof error === 'object' && 'code' in error) {
    scraperError = error;
  } else {
    scraperError = detectErrorType(error);
  }

  let text = `Error: ${scraperError.message}`;
  if (scraperError.recoveryHint) {
    text += `\n\nHow to fix: ${scraperError.recoveryHint}`;
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
    isError: true,
  };
}

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitState {
  lastRequest: number;
  consecutiveRequests: number;
  backoffMs: number;
}

const rateLimits: Map<string, RateLimitState> = new Map();

const PLATFORM_LIMITS = {
  twitter: { minDelay: 1000, maxDelay: 3000, maxConsecutive: 10 },
  linkedin: { minDelay: 2000, maxDelay: 5000, maxConsecutive: 5 },
  default: { minDelay: 500, maxDelay: 1500, maxConsecutive: 20 },
};

/**
 * Wait for rate limit if needed
 */
export async function waitForRateLimit(platform: string = 'default'): Promise<void> {
  const limits = PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS] || PLATFORM_LIMITS.default;
  const state = rateLimits.get(platform) || { lastRequest: 0, consecutiveRequests: 0, backoffMs: limits.minDelay };

  const now = Date.now();
  const timeSinceLastRequest = now - state.lastRequest;

  // If we need to wait
  if (timeSinceLastRequest < state.backoffMs) {
    const waitTime = state.backoffMs - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // Update state
  state.lastRequest = Date.now();
  state.consecutiveRequests++;

  // Increase backoff if making many consecutive requests
  if (state.consecutiveRequests > limits.maxConsecutive) {
    state.backoffMs = Math.min(state.backoffMs * 1.5, limits.maxDelay);
  }

  // Reset consecutive count if there was a long gap
  if (timeSinceLastRequest > 60000) {
    state.consecutiveRequests = 0;
    state.backoffMs = limits.minDelay;
  }

  rateLimits.set(platform, state);
}

/**
 * Trigger exponential backoff (call when rate limit detected)
 */
export function triggerBackoff(platform: string = 'default'): void {
  const state = rateLimits.get(platform) || { lastRequest: 0, consecutiveRequests: 0, backoffMs: 5000 };
  state.backoffMs = Math.min(state.backoffMs * 2, 60000); // Max 1 minute
  rateLimits.set(platform, state);
}

/**
 * Reset rate limit state for a platform
 */
export function resetRateLimit(platform: string): void {
  rateLimits.delete(platform);
}

// ============================================================================
// Logging
// ============================================================================

const DEBUG = process.env.DEBUG?.includes('session-scraper') || false;

export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    console.error('[session-scraper]', ...args);
  }
}

export function errorLog(...args: unknown[]): void {
  console.error('[session-scraper:error]', ...args);
}

export function infoLog(...args: unknown[]): void {
  console.error('[session-scraper:info]', ...args);
}
