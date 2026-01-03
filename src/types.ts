/**
 * Type definitions for session-scraper CLI tool
 *
 * This file contains all interfaces and types needed for the session-scraper CLI tool,
 * which uses authenticated browser sessions to scrape Twitter, LinkedIn, and generic web pages.
 */

// ============================================================================
// Twitter Types
// ============================================================================

/**
 * Twitter user profile information
 * Extracted from https://x.com/{username}
 */
export interface TwitterProfile {
  /** Twitter handle without @ symbol */
  username: string;
  /** Display name shown on profile */
  displayName: string;
  /** Profile bio/description */
  bio: string;
  /** Location text from profile */
  location: string;
  /** Website URL from profile */
  website: string;
  /** Account creation date (ISO 8601 format) */
  joinDate: string;
  /** Number of followers */
  followersCount: number;
  /** Number of accounts following */
  followingCount: number;
  /** Total number of posts/tweets */
  postsCount: number;
  /** Whether account has verified badge */
  verified: boolean;
  /** URL to profile image */
  profileImageUrl: string;
}

/**
 * Basic author information for tweets
 */
export interface TwitterAuthor {
  /** Twitter handle without @ symbol */
  username: string;
  /** Display name */
  displayName: string;
  /** Whether account is verified */
  verified?: boolean;
  /** Profile image URL */
  profileImageUrl?: string;
}

/**
 * Tweet engagement metrics
 */
export interface TwitterMetrics {
  /** Number of replies */
  replies: number;
  /** Number of retweets */
  retweets: number;
  /** Number of likes */
  likes: number;
  /** Number of views (if available) */
  views: number;
}

/**
 * Media attachment in a tweet
 */
export interface TwitterMedia {
  /** Type of media */
  type: 'photo' | 'video' | 'gif';
  /** URL to media */
  url: string;
  /** Alt text if available */
  alt?: string;
}

/**
 * Tweet type classification
 */
export type TwitterTweetType = 'original' | 'retweet' | 'reply';

/**
 * Individual tweet data
 * Extracted from article[data-testid="tweet"]
 */
export interface TwitterTweet {
  /** Tweet ID from URL */
  id: string;
  /** Tweet text content */
  text: string;
  /** Author information */
  author: TwitterAuthor;
  /** Creation timestamp (ISO 8601 format) */
  createdAt: string;
  /** Engagement metrics */
  metrics: TwitterMetrics;
  /** Tweet type */
  type: TwitterTweetType;
  /** Media attachments */
  media: TwitterMedia[];
  /** URL to the tweet */
  url?: string;
  /** Whether this is part of a thread */
  isThread?: boolean;
}

/**
 * Timeline response with pagination info
 */
export interface TwitterTimeline {
  /** Array of tweets */
  tweets: TwitterTweet[];
  /** Whether more tweets are available */
  hasMore: boolean;
  /** Username of the timeline owner (if user timeline) */
  username?: string;
}

/**
 * Single tweet with context (thread and replies)
 */
export interface TwitterPost {
  /** The main tweet */
  tweet: TwitterTweet;
  /** Thread context (tweets before this one) */
  thread: TwitterTweet[];
  /** Replies to this tweet */
  replies: TwitterTweet[];
}

/**
 * Twitter search results
 */
export interface TwitterSearchResults {
  /** Search query used */
  query: string;
  /** Array of matching tweets */
  tweets: TwitterTweet[];
  /** Whether more results are available */
  hasMore: boolean;
}

// ============================================================================
// LinkedIn Types
// ============================================================================

/**
 * LinkedIn experience entry
 */
export interface LinkedInExperience {
  /** Job title */
  title: string;
  /** Company name */
  company: string;
  /** Duration text (e.g., "Jan 2020 - Present · 4 yrs 2 mos") */
  duration: string;
  /** Date range portion (e.g., "Jan 2020 - Present") */
  dateRange: string;
  /** Duration portion (e.g., "4 yrs 2 mos") */
  durationYears?: string;
  /** Work location */
  location?: string;
  /** Job description */
  description?: string;
}

/**
 * LinkedIn education entry
 */
export interface LinkedInEducation {
  /** School/university name */
  school: string;
  /** Degree and field of study */
  degree: string;
  /** Date range */
  dateRange?: string;
  /** Activities and societies */
  activities?: string;
}

/**
 * LinkedIn profile information
 * Extracted from https://www.linkedin.com/in/{slug}/
 */
export interface LinkedInProfile {
  /** Full name */
  name: string;
  /** Professional headline */
  headline: string;
  /** Location text */
  location: string;
  /** About section text */
  about: string;
  /** Connection degree (e.g., "1st", "2nd", "3rd") */
  connectionDegree?: string;
  /** Number of connections text (e.g., "500+") */
  connections?: string;
  /** Profile URL */
  url: string;
  /** Work experience entries */
  experience: LinkedInExperience[];
  /** Education entries */
  education: LinkedInEducation[];
  /** Skills list */
  skills: string[];
  /** Profile image URL */
  profileImageUrl?: string;
}

/**
 * LinkedIn post engagement metrics
 */
export interface LinkedInMetrics {
  /** Number of reactions */
  reactions: number;
  /** Number of comments */
  comments: number;
  /** Number of reposts/shares */
  reposts?: number;
}

/**
 * LinkedIn post/update
 */
export interface LinkedInPost {
  /** Post ID (if extractable) */
  id?: string;
  /** Author name */
  author: string;
  /** Post text content */
  text: string;
  /** Relative time (e.g., "2h ago") */
  time: string;
  /** Engagement metrics */
  metrics: LinkedInMetrics;
  /** Post URL */
  url?: string;
  /** Media URLs if present */
  media?: string[];
}

/**
 * LinkedIn posts collection
 */
export interface LinkedInPosts {
  /** Profile URL these posts are from */
  profileUrl: string;
  /** Array of posts */
  posts: LinkedInPost[];
  /** Whether more posts are available */
  hasMore: boolean;
}

/**
 * LinkedIn search result item (person)
 */
export interface LinkedInSearchPerson {
  /** Person's name */
  name: string;
  /** Professional headline */
  headline: string;
  /** Location */
  location: string;
  /** Connection degree */
  connectionDegree: string;
  /** Profile URL */
  url: string;
}

/**
 * LinkedIn search result item (post)
 */
export interface LinkedInSearchPost {
  /** Author name */
  author: string;
  /** Post text preview */
  text: string;
  /** Relative time */
  time: string;
  /** Post URL */
  url: string;
}

/**
 * LinkedIn search result item (company)
 */
export interface LinkedInSearchCompany {
  /** Company name */
  name: string;
  /** Company tagline/description */
  description: string;
  /** Industry */
  industry?: string;
  /** Company page URL */
  url: string;
}

/**
 * LinkedIn search type
 */
export type LinkedInSearchType = 'people' | 'posts' | 'companies';

/**
 * LinkedIn search results (discriminated union)
 */
export type LinkedInSearchResults =
  | {
      type: 'people';
      query: string;
      results: LinkedInSearchPerson[];
      hasMore: boolean;
    }
  | {
      type: 'posts';
      query: string;
      results: LinkedInSearchPost[];
      hasMore: boolean;
    }
  | {
      type: 'companies';
      query: string;
      results: LinkedInSearchCompany[];
      hasMore: boolean;
    };

// ============================================================================
// Generic Page Types
// ============================================================================

/**
 * Link extracted from a page
 */
export interface PageLink {
  /** Link text content */
  text: string;
  /** Link href URL */
  href: string;
}

/**
 * Image extracted from a page
 */
export interface PageImage {
  /** Image alt text */
  alt: string;
  /** Image src URL */
  src: string;
}

/**
 * Generic page content
 * Extracted using content detection (main, article, [role="main"], or body)
 */
export interface PageContent {
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
  /** Extracted text content (max 100,000 chars) */
  text: string;
  /** Links found on page (max 100) */
  links: PageLink[];
  /** Images found on page (max 50) */
  images: PageImage[];
}

/**
 * Browser page info
 */
export interface PageInfo {
  /** Current page URL */
  url: string;
  /** Current page title */
  title: string;
}

/**
 * Browser page list item
 */
export interface PageListItem {
  /** Page index for switching */
  index: number;
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
}

/**
 * Browser pages list
 */
export interface PagesList {
  /** Array of available pages */
  pages: PageListItem[];
  /** Index of current page */
  current: number;
}

/**
 * Screenshot result (base64 encoded)
 */
export interface Screenshot {
  /** Base64 encoded PNG data */
  data: string;
  /** Whether this is a full page screenshot */
  fullPage: boolean;
}

/**
 * Navigation result
 */
export interface NavigationResult {
  /** Whether navigation succeeded */
  success: boolean;
  /** Final URL after navigation */
  url: string;
  /** Page title */
  title: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes used by the CLI
 */
export enum ErrorCode {
  /** Success */
  SUCCESS = 0,
  /** General error */
  GENERAL_ERROR = 1,
  /** Connection error (Playwriter not running) */
  CONNECTION_ERROR = 2,
  /** No pages available */
  NO_PAGES = 3,
  /** Navigation timeout */
  TIMEOUT = 4,
  /** Element not found */
  NOT_FOUND_ELEMENT = 5,
  /** Rate limited by platform */
  RATE_LIMITED = 6,
  /** Login required */
  LOGIN_REQUIRED = 7,
  /** Profile/page not found */
  NOT_FOUND = 8,
}

/**
 * Scraper error with additional context
 */
export interface ScraperError extends Error {
  /** Error code */
  code: ErrorCode;
  /** Hint for user on how to fix */
  hint?: string;
  /** Original error if wrapped */
  originalError?: Error;
}

/**
 * Platform-specific error types
 */
export type PlatformErrorType =
  | 'not_found'
  | 'suspended'
  | 'rate_limited'
  | 'login_required'
  | 'restricted';

// ============================================================================
// Options Types
// ============================================================================

/**
 * Global CLI options
 */
export interface GlobalOptions {
  /** Output format */
  format: 'json' | 'text';
  /** Suppress status messages */
  quiet: boolean;
  /** Navigation timeout in milliseconds */
  timeout: number;
}

/**
 * Options for timeline/search commands
 */
export interface CountOptions {
  /** Number of items to fetch */
  count: number;
}

/**
 * Options for screenshot command
 */
export interface ScreenshotOptions {
  /** Output file path */
  output?: string;
  /** Capture full page */
  fullPage: boolean;
}

/**
 * Options for page scrape command
 */
export interface ScrapeOptions {
  /** CSS selector to scope extraction */
  selector?: string;
}

/**
 * Options for LinkedIn search
 */
export interface LinkedInSearchOptions extends CountOptions {
  /** Search type */
  type: LinkedInSearchType;
}

// ============================================================================
// Browser Connection Types
// ============================================================================

/**
 * Playwriter connection configuration
 */
export interface PlaywriterConfig {
  /** Host where Playwriter is running */
  host: string;
  /** Port for WebSocket connection */
  port: number;
}

/**
 * Connection error details
 */
export interface ConnectionErrorDetails {
  /** Error code */
  code: ErrorCode;
  /** Error message */
  message: string;
  /** Hint for recovery */
  hint: string;
}

// ============================================================================
// Scraper Internal Types
// ============================================================================

/**
 * Scroll pagination state
 */
export interface ScrollState {
  /** Previous scroll height */
  previousHeight: number;
  /** Number of failed scroll attempts */
  attempts: number;
  /** Maximum attempts before giving up */
  maxAttempts: number;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Delay between navigations (ms) */
  navigationDelay: number;
  /** Delay between scroll actions (ms) */
  scrollDelay: number;
  /** Maximum consecutive requests */
  maxConsecutiveRequests: number;
  /** Delay when rate limited (ms) */
  rateLimitPause: number;
}

/**
 * Number parsing result
 */
export interface ParsedNumber {
  /** Original text */
  raw: string;
  /** Parsed numeric value */
  value: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for async operations
 */
export type Result<T, E = ScraperError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Partial result for operations that can partially succeed
 */
export interface PartialResult<T> {
  /** Successfully extracted items */
  items: T[];
  /** Errors encountered during extraction */
  errors: string[];
  /** Whether operation completed fully */
  complete: boolean;
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  /** Navigation timeout */
  navigation: number;
  /** Element wait timeout */
  element: number;
  /** Network idle timeout */
  networkIdle: number;
}

/**
 * Delay range for human-like timing
 */
export interface DelayRange {
  /** Minimum delay in ms */
  min: number;
  /** Maximum delay in ms */
  max: number;
}
