# Utilities

Shared utility functions for parsing and error handling.

## Parse Utilities (`parse.ts`)

### `parseTwitterNumber(text: string): number`

Parse Twitter-style numbers with K/M/B suffixes.

```typescript
parseTwitterNumber('12.5K')   // 12500
parseTwitterNumber('1.2M')    // 1200000
parseTwitterNumber('1.5B')    // 1500000000
parseTwitterNumber('1,234')   // 1234
parseTwitterNumber('5')       // 5
```

Returns `0` for invalid input.

### `parseLinkedInDuration(text: string): { dateRange: string; duration: string }`

Parse LinkedIn duration format.

```typescript
parseLinkedInDuration('Jan 2020 - Present · 4 yrs 2 mos')
// { dateRange: 'Jan 2020 - Present', duration: '4 yrs 2 mos' }
```

### `parseTwitterDate(text: string): string | null`

Parse Twitter date strings (relative or absolute) to ISO 8601.

```typescript
parseTwitterDate('2h')        // ISO date 2 hours ago
parseTwitterDate('5m')        // ISO date 5 minutes ago
parseTwitterDate('1d')        // ISO date 1 day ago
parseTwitterDate('2024-01-15T10:30:00Z')  // ISO date
```

Returns `null` for invalid input.

### `cleanText(text: string): string`

Clean and normalize whitespace in text.

```typescript
cleanText('hello    world')    // 'hello world'
cleanText('line1\n\n\nline2')  // 'line1\nline2'
cleanText('  text  ')          // 'text'
```

- Normalizes multiple spaces/tabs to single space
- Normalizes multiple newlines to single newline
- Trims leading/trailing whitespace
- Preserves single newlines

### `truncateText(text: string, maxLength: number): string`

Truncate text to maximum length with ellipsis.

```typescript
truncateText('hello world this is a test', 15)  // 'hello world ...'
truncateText('short', 10)                       // 'short'
```

### `extractTwitterUsername(input: string): string | null`

Extract username from Twitter URL or handle.

```typescript
extractTwitterUsername('https://x.com/elonmusk')        // 'elonmusk'
extractTwitterUsername('https://twitter.com/jack')      // 'jack'
extractTwitterUsername('@elonmusk')                     // 'elonmusk'
extractTwitterUsername('elonmusk')                      // 'elonmusk'
```

Returns `null` for invalid input.

### `extractLinkedInSlug(input: string): string | null`

Extract profile slug from LinkedIn URL.

```typescript
extractLinkedInSlug('https://linkedin.com/in/satyanadella')  // 'satyanadella'
extractLinkedInSlug('https://www.linkedin.com/in/john-doe')  // 'john-doe'
```

Returns `null` for invalid input.

---

## Error Utilities (`errors.ts`)

### Exit Codes

```typescript
enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  CONNECTION_ERROR = 2,      // Playwriter not running
  NO_PAGES = 3,              // No browser pages available
  NAVIGATION_TIMEOUT = 4,    // Page load timeout
  ELEMENT_NOT_FOUND = 5,     // Expected content not found
  RATE_LIMITED = 6,          // Rate limit exceeded
  LOGIN_REQUIRED = 7,        // Login required
  NOT_FOUND = 8              // Profile/page not found
}
```

### Error Types

```typescript
type ErrorType =
  | 'not_found'
  | 'suspended'
  | 'rate_limited'
  | 'restricted'
  | 'login_required'
  | 'connection_error'
  | 'navigation_timeout'
  | 'element_not_found'
  | 'no_pages';
```

### `checkTwitterErrors(content: string): ErrorType | null`

Detect common Twitter error states from page content.

```typescript
checkTwitterErrors("This account doesn't exist")  // 'not_found'
checkTwitterErrors('Account suspended')           // 'suspended'
checkTwitterErrors('Rate limit exceeded')         // 'rate_limited'
checkTwitterErrors('Log in to Twitter')           // 'login_required'
checkTwitterErrors('Normal content')              // null
```

### `checkLinkedInErrors(content: string): ErrorType | null`

Detect common LinkedIn error states from page content.

```typescript
checkLinkedInErrors('Page not found')           // 'not_found'
checkLinkedInErrors('unusual activity')         // 'rate_limited'
checkLinkedInErrors('Sign in to LinkedIn')      // 'login_required'
checkLinkedInErrors('Normal content')           // null
```

### `getExitCode(errorType: ErrorType): ExitCode`

Map error type to exit code.

```typescript
getExitCode('not_found')           // ExitCode.NOT_FOUND (8)
getExitCode('rate_limited')        // ExitCode.RATE_LIMITED (6)
getExitCode('connection_error')    // ExitCode.CONNECTION_ERROR (2)
```

### `getErrorHint(errorType: ErrorType): string`

Get user-friendly hint for error type.

```typescript
getErrorHint('login_required')
// "You must be logged in to access this content. Open the page in your browser and log in first."

getErrorHint('rate_limited')
// "Rate limit exceeded. Wait a few minutes before trying again."
```

### `formatError(error: Error | unknown, errorType?: ErrorType): StructuredError`

Format error as structured JSON object.

```typescript
formatError(new Error('Navigation timeout'))
// {
//   error: 'Navigation timeout',
//   code: 4,
//   hint: 'Page took too long to load...',
//   details: { stack: [...] }
// }

formatError(new Error('Custom error'), 'rate_limited')
// {
//   error: 'Custom error',
//   code: 6,
//   hint: 'Rate limit exceeded...'
// }
```

Auto-detects error type from message if not provided.

### `ScraperError`

Custom error class for scraper-specific errors.

```typescript
const error = new ScraperError('Profile not found', 'not_found', {
  url: 'https://x.com/invalid',
  status: 404
});

error.type      // 'not_found'
error.details   // { url: '...', status: 404 }
error.toJSON()  // StructuredError object
```

### `throwScraperError(type: ErrorType, message: string, details?: Record<string, unknown>): never`

Throw a scraper error with proper typing.

```typescript
throwScraperError('not_found', 'Profile does not exist', { username: 'invalid' });
// Throws ScraperError
```

### `isConnectionError(error: Error | unknown): boolean`

Check if error is a connection error.

```typescript
isConnectionError(new Error('connect ECONNREFUSED'))      // true
isConnectionError(new Error('Extension not connected'))   // true
isConnectionError(new Error('Timeout'))                   // false
```

### `isTimeoutError(error: Error | unknown): boolean`

Check if error is a timeout error.

```typescript
isTimeoutError(new Error('Navigation timeout'))     // true
isTimeoutError(new Error('Request timed out'))      // true
isTimeoutError(new Error('Connection refused'))     // false
```

### `getErrorMessage(error: Error | unknown): string`

Safely extract error message from any error type.

```typescript
getErrorMessage(new Error('Test'))         // 'Test'
getErrorMessage('String error')            // 'String error'
getErrorMessage({ message: 'Object' })     // 'Object'
getErrorMessage(null)                      // 'An unknown error occurred'
```

---

## Usage Examples

### Parsing Twitter Profile

```typescript
import { parseTwitterNumber, extractTwitterUsername } from './utils/parse.js';

const followers = parseTwitterNumber('150.5M');  // 150500000
const username = extractTwitterUsername('@elonmusk');  // 'elonmusk'
```

### Error Handling

```typescript
import {
  checkTwitterErrors,
  formatError,
  ScraperError,
  ExitCode
} from './utils/errors.js';

// Check for errors on page
const content = await page.content();
const errorType = checkTwitterErrors(content);

if (errorType) {
  throw new ScraperError('Failed to load profile', errorType);
}

// Catch and format errors
try {
  await scrapePage();
} catch (error) {
  const formatted = formatError(error);
  console.error(JSON.stringify(formatted));
  process.exit(formatted.code);
}
```

### Clean User Input

```typescript
import { cleanText, truncateText } from './utils/parse.js';

const bio = cleanText(rawBio);  // Normalize whitespace
const preview = truncateText(bio, 100);  // Truncate for preview
```

---

## Testing

All utilities have comprehensive test coverage:

```bash
bun test tests/parse.test.ts
bun test tests/errors.test.ts
```

Tests cover:
- Normal cases
- Edge cases (empty strings, null, undefined)
- Invalid input handling
- Case sensitivity
- Whitespace handling
- Error detection accuracy
