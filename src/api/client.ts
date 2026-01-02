import { z } from "zod";
import {
  loadTokens,
  isTokenExpired,
  type TokenData,
} from "../config/tokens.js";
import { refreshAccessToken } from "../auth/oauth.js";
import {
  AuthError,
  RateLimitError,
  APIError,
  NetworkError,
  APIErrorResponseSchema,
} from "../types/errors.js";

const BASE_URL = "https://api.twitter.com/2";
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;

/**
 * Rate limit information from response headers
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

/**
 * HTTP client options
 */
export interface ClientOptions {
  timeout?: number;
  maxRetries?: number;
}

/**
 * Request options
 */
export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string>;
}

/**
 * Sleep helper for backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number, baseDelay = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}

/**
 * Parse rate limit headers from response
 */
function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get("x-rate-limit-limit");
  const remaining = headers.get("x-rate-limit-remaining");
  const reset = headers.get("x-rate-limit-reset");

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: new Date(parseInt(reset, 10) * 1000),
  };
}

/**
 * X API HTTP Client
 */
export class XClient {
  private tokens: TokenData | null = null;
  private timeout: number;
  private maxRetries: number;
  private rateLimits: Map<string, RateLimitInfo> = new Map();

  constructor(options: ClientOptions = {}) {
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
  }

  /**
   * Get current tokens, refreshing if needed
   */
  private async getValidTokens(): Promise<TokenData> {
    // Load tokens if not cached
    if (!this.tokens) {
      this.tokens = await loadTokens();
    }

    if (!this.tokens) {
      throw new AuthError("Not authenticated. Run 'x auth login' first.");
    }

    // Refresh if expired
    if (isTokenExpired(this.tokens) && this.tokens.refresh_token) {
      this.tokens = await refreshAccessToken(this.tokens.refresh_token);
    }

    return this.tokens;
  }

  /**
   * Clear cached tokens (after logout)
   */
  clearTokenCache(): void {
    this.tokens = null;
  }

  /**
   * Get rate limit info for an endpoint
   */
  getRateLimit(endpoint: string): RateLimitInfo | null {
    return this.rateLimits.get(endpoint) || null;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(
    endpoint: string,
    params?: Record<string, string | string[] | undefined>
  ): string {
    const url = new URL(endpoint, BASE_URL);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;

        if (Array.isArray(value)) {
          url.searchParams.set(key, value.join(","));
        } else {
          url.searchParams.set(key, value);
        }
      }
    }

    return url.toString();
  }

  /**
   * Make HTTP request with retries and rate limit handling
   */
  async request<T>(
    endpoint: string,
    schema: z.ZodType<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = "GET", body, params, headers = {} } = options;
    const tokens = await this.getValidTokens();

    const url = this.buildUrl(endpoint, params);
    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      ...headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse rate limit headers
        const rateLimit = parseRateLimitHeaders(response.headers);
        if (rateLimit) {
          this.rateLimits.set(endpoint, rateLimit);
        }

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter =
            rateLimit?.reset
              ? Math.ceil((rateLimit.reset.getTime() - Date.now()) / 1000)
              : getBackoffDelay(attempt) / 1000;

          if (attempt < this.maxRetries - 1) {
            await sleep(retryAfter * 1000);
            continue;
          }

          throw new RateLimitError(
            "Rate limit exceeded. Please try again later.",
            retryAfter
          );
        }

        // Handle server errors (5xx) with retry
        if (response.status >= 500) {
          if (attempt < this.maxRetries - 1) {
            await sleep(getBackoffDelay(attempt));
            continue;
          }
          throw new APIError(`Server error: ${response.status}`);
        }

        // Handle auth errors
        if (response.status === 401) {
          // Try to refresh token once
          if (attempt === 0 && this.tokens?.refresh_token) {
            this.tokens = await refreshAccessToken(this.tokens.refresh_token);
            continue;
          }
          throw new AuthError("Authentication failed", true);
        }

        if (response.status === 403) {
          throw new AuthError("Access forbidden. Check your permissions.");
        }

        // Parse response
        const data = await response.json();

        // Handle API errors
        if (!response.ok) {
          const errorResult = APIErrorResponseSchema.safeParse(data);
          if (errorResult.success) {
            throw new APIError(
              errorResult.data.errors[0]?.message || "Unknown API error",
              errorResult.data.errors
            );
          }
          throw new APIError(`Request failed: ${response.status}`);
        }

        // Validate response against schema
        return schema.parse(data);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on validation or auth errors
        if (
          error instanceof AuthError ||
          error instanceof z.ZodError ||
          error instanceof RateLimitError
        ) {
          throw error;
        }

        // Handle timeout/network errors
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new NetworkError("Request timed out");
        } else if (
          error instanceof TypeError &&
          error.message.includes("fetch")
        ) {
          lastError = new NetworkError("Network error. Check your connection.");
        }

        // Retry on network errors
        if (
          lastError instanceof NetworkError &&
          attempt < this.maxRetries - 1
        ) {
          await sleep(getBackoffDelay(attempt));
          continue;
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * GET request helper
   */
  async get<T>(
    endpoint: string,
    schema: z.ZodType<T>,
    params?: Record<string, string | string[] | undefined>
  ): Promise<T> {
    return this.request(endpoint, schema, { method: "GET", params });
  }

  /**
   * POST request helper
   */
  async post<T>(
    endpoint: string,
    schema: z.ZodType<T>,
    body?: unknown
  ): Promise<T> {
    return this.request(endpoint, schema, { method: "POST", body });
  }

  /**
   * DELETE request helper
   */
  async delete<T>(endpoint: string, schema: z.ZodType<T>): Promise<T> {
    return this.request(endpoint, schema, { method: "DELETE" });
  }

  /**
   * PUT request helper
   */
  async put<T>(
    endpoint: string,
    schema: z.ZodType<T>,
    body?: unknown
  ): Promise<T> {
    return this.request(endpoint, schema, { method: "PUT", body });
  }
}

/**
 * Singleton client instance
 */
let clientInstance: XClient | null = null;

export function getClient(): XClient {
  if (!clientInstance) {
    clientInstance = new XClient();
  }
  return clientInstance;
}
