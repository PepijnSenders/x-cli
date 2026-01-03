/**
 * Error detection, formatting, and exit code mapping utilities.
 */

/**
 * Exit codes for the CLI.
 */
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  CONNECTION_ERROR = 2,
  NO_PAGES = 3,
  NAVIGATION_TIMEOUT = 4,
  ELEMENT_NOT_FOUND = 5,
  RATE_LIMITED = 6,
  LOGIN_REQUIRED = 7,
  NOT_FOUND = 8
}

/**
 * Error types that can be detected from page content.
 */
export type ErrorType =
  | 'not_found'
  | 'suspended'
  | 'rate_limited'
  | 'login_required'
  | 'restricted'
  | 'connection_error'
  | 'navigation_timeout'
  | 'element_not_found'
  | 'no_pages';

/**
 * Structured error object for JSON output.
 */
export interface StructuredError {
  error: string;
  code: number;
  hint?: string;
  details?: Record<string, unknown>;
}

/**
 * Check Twitter page for common error states.
 *
 * @param content - Page HTML content
 * @returns Error type if detected, null otherwise
 */
export function checkTwitterErrors(content: string): ErrorType | null {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const lower = content.toLowerCase();

  if (lower.includes("this account doesn't exist") || lower.includes("account doesn't exist")) {
    return 'not_found';
  }

  if (lower.includes('account suspended') || lower.includes('suspended account')) {
    return 'suspended';
  }

  if (lower.includes('rate limit exceeded') || lower.includes('rate limit')) {
    return 'rate_limited';
  }

  // Check for login requirement (but not if we see "log out" which means we're logged in)
  if (lower.includes('log in') && !lower.includes('log out')) {
    return 'login_required';
  }

  return null;
}

/**
 * Check LinkedIn page for common error states.
 *
 * @param content - Page HTML content
 * @returns Error type if detected, null otherwise
 */
export function checkLinkedInErrors(content: string): ErrorType | null {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const lower = content.toLowerCase();

  if (lower.includes('page not found') || lower.includes('404')) {
    return 'not_found';
  }

  if (lower.includes('account suspended')) {
    return 'suspended';
  }

  if (lower.includes('unusual activity') || lower.includes('restricted')) {
    return 'rate_limited';
  }

  // Check for login requirement (but not if we see "sign out")
  if (lower.includes('sign in') && !lower.includes('sign out')) {
    return 'login_required';
  }

  return null;
}

/**
 * Map error type to exit code.
 *
 * @param errorType - The error type
 * @returns Appropriate exit code
 */
export function getExitCode(errorType: ErrorType): ExitCode {
  switch (errorType) {
    case 'not_found':
    case 'suspended':
      return ExitCode.NOT_FOUND;

    case 'rate_limited':
    case 'restricted':
      return ExitCode.RATE_LIMITED;

    case 'login_required':
      return ExitCode.LOGIN_REQUIRED;

    case 'connection_error':
      return ExitCode.CONNECTION_ERROR;

    case 'navigation_timeout':
      return ExitCode.NAVIGATION_TIMEOUT;

    case 'element_not_found':
      return ExitCode.ELEMENT_NOT_FOUND;

    case 'no_pages':
      return ExitCode.NO_PAGES;

    default:
      return ExitCode.GENERAL_ERROR;
  }
}

/**
 * Get a user-friendly hint for an error type.
 *
 * @param errorType - The error type
 * @returns Helpful hint message
 */
export function getErrorHint(errorType: ErrorType): string {
  switch (errorType) {
    case 'not_found':
      return 'The requested profile or page does not exist.';

    case 'suspended':
      return 'The account has been suspended.';

    case 'rate_limited':
      return 'Rate limit exceeded. Wait a few minutes before trying again.';

    case 'restricted':
      return 'LinkedIn detected unusual activity. Wait 10-15 minutes before continuing.';

    case 'login_required':
      return 'You must be logged in to access this content. Open the page in your browser and log in first.';

    case 'connection_error':
      return 'Make sure Chrome has the Playwriter extension installed and enabled.';

    case 'navigation_timeout':
      return 'Page took too long to load. Try increasing the timeout or check your connection.';

    case 'element_not_found':
      return 'Could not find the expected content on the page. The page structure may have changed.';

    case 'no_pages':
      return 'No browser pages are available. Open a new tab in Chrome first.';

    default:
      return 'An unexpected error occurred.';
  }
}

/**
 * Format an error as a structured JSON object.
 *
 * @param error - The error to format
 * @param errorType - Optional error type for better hints
 * @returns Structured error object
 */
export function formatError(error: Error | unknown, errorType?: ErrorType): StructuredError {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Detect error type from message if not provided
  let detectedType = errorType;
  if (!detectedType) {
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      detectedType = 'navigation_timeout';
    } else if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist') || lowerMessage.includes("doesn't exist")) {
      detectedType = 'not_found';
    } else if (lowerMessage.includes('rate limit')) {
      detectedType = 'rate_limited';
    } else if (lowerMessage.includes('login') || lowerMessage.includes('sign in')) {
      detectedType = 'login_required';
    } else if (
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('connection refused') ||
      lowerMessage.includes('extension not connected') ||
      lowerMessage.includes('no connection')
    ) {
      detectedType = 'connection_error';
    } else if (lowerMessage.includes('element') || lowerMessage.includes('selector')) {
      detectedType = 'element_not_found';
    } else if (lowerMessage.includes('no pages') || lowerMessage.includes('no page')) {
      detectedType = 'no_pages';
    }
  }

  const result: StructuredError = {
    error: message,
    code: detectedType ? getExitCode(detectedType) : ExitCode.GENERAL_ERROR
  };

  if (detectedType) {
    result.hint = getErrorHint(detectedType);
  }

  // Include stack trace in details if available
  if (error instanceof Error && error.stack) {
    result.details = {
      stack: error.stack.split('\n').slice(0, 5) // First 5 lines only
    };
  }

  return result;
}

/**
 * Custom error class for scraper-specific errors.
 */
export class ScraperError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorType,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ScraperError';
  }

  toJSON(): StructuredError {
    return formatError(this, this.type);
  }
}

/**
 * Throw a scraper error with proper typing.
 *
 * @param type - Error type
 * @param message - Error message
 * @param details - Optional additional details
 */
export function throwScraperError(
  type: ErrorType,
  message: string,
  details?: Record<string, unknown>
): never {
  throw new ScraperError(message, type, details);
}

/**
 * Check if an error is a connection error (Playwriter not running).
 *
 * @param error - The error to check
 * @returns True if it's a connection error
 */
export function isConnectionError(error: Error | unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes('econnrefused') ||
    message.includes('connection refused') ||
    message.includes('connect econnrefused') ||
    message.includes('extension not connected') ||
    message.includes('no connection')
  );
}

/**
 * Check if an error is a timeout error.
 *
 * @param error - The error to check
 * @returns True if it's a timeout error
 */
export function isTimeoutError(error: Error | unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return message.includes('timeout') || message.includes('timed out');
}

/**
 * Safely extract error message from any error type.
 *
 * @param error - The error to extract message from
 * @returns Error message string
 */
export function getErrorMessage(error: Error | unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unknown error occurred';
}
