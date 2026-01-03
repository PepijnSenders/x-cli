import { describe, expect, test } from "bun:test";
import {
  formatNumber,
  formatRelativeTime,
  formatDuration,
  formatJSON,
  formatUsername,
  formatTweet,
  formatUserList,
  formatUserProfile,
  formatError,
  createTable,
  formatJSONError,
} from "../src/output/index.js";
import { XCLIError, ErrorCode, APIError, ValidationError } from "../src/types/errors.js";
import type { User, Tweet } from "../src/types/index.js";

describe("Number Formatting", () => {
  test("formats small numbers as-is", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1)).toBe("1");
    expect(formatNumber(999)).toBe("999");
  });

  test("formats thousands with K suffix", () => {
    expect(formatNumber(1000)).toBe("1K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(42000)).toBe("42K");
    expect(formatNumber(999999)).toBe("1000K");
  });

  test("formats millions with M suffix", () => {
    expect(formatNumber(1000000)).toBe("1M");
    expect(formatNumber(2300000)).toBe("2.3M");
    expect(formatNumber(10500000)).toBe("10.5M");
  });
});

describe("Relative Time Formatting", () => {
  test("formats just now", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  test("formats minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe("5m");
  });

  test("formats hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe("2h");
  });

  test("formats days ago", () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d");
  });
});

describe("Duration Formatting", () => {
  test("formats under a minute", () => {
    expect(formatDuration(30)).toBe("< 1m");
    expect(formatDuration(0)).toBe("< 1m");
  });

  test("formats minutes only", () => {
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(3599)).toBe("59m");
  });

  test("formats hours only", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(7200)).toBe("2h");
  });

  test("formats hours and minutes", () => {
    expect(formatDuration(6300)).toBe("1h 45m");
    expect(formatDuration(5400)).toBe("1h 30m");
  });
});

describe("JSON Formatting", () => {
  test("formats object to JSON string", () => {
    const data = { foo: "bar", num: 42 };
    expect(formatJSON(data)).toBe('{"foo":"bar","num":42}');
  });

  test("formats array to JSON string", () => {
    const data = [1, 2, 3];
    expect(formatJSON(data)).toBe("[1,2,3]");
  });

  test("formats nested objects", () => {
    const data = { user: { id: "123", name: "Test" } };
    expect(formatJSON(data)).toBe('{"user":{"id":"123","name":"Test"}}');
  });

  test("formats XCLIError to JSON string", () => {
    const error = new XCLIError("Test error", ErrorCode.API_ERROR);
    const result = formatJSONError(error);
    expect(result).toBe('{"error":"Test error","code":"API_ERROR"}');
  });

  test("formats APIError to JSON string", () => {
    const error = new APIError("API failed");
    const result = formatJSONError(error);
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe("API failed");
    expect(parsed.code).toBe("API_ERROR");
  });

  test("formats ValidationError to JSON string", () => {
    const error = new ValidationError("Invalid input");
    const result = formatJSONError(error);
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe("Invalid input");
    expect(parsed.code).toBe("VALIDATION");
  });
});

describe("Extended Relative Time", () => {
  test("formats weeks ago", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoWeeksAgo)).toBe("2w");
  });

  test("formats months ago", () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoMonthsAgo)).toBe("2mo");
  });

  test("formats years ago", () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoYearsAgo)).toBe("2y");
  });
});

describe("Username Formatting", () => {
  test("formats basic username", () => {
    const user: User = {
      id: "123",
      name: "Test User",
      username: "testuser",
    };
    const result = formatUsername(user);
    expect(result).toContain("@testuser");
  });

  test("formats verified user with blue check", () => {
    const user: User = {
      id: "123",
      name: "Verified User",
      username: "verified",
      verified: true,
    };
    const result = formatUsername(user);
    expect(result).toContain("@verified");
    expect(result).toContain("✓");
  });

  test("formats blue verified type", () => {
    const user: User = {
      id: "123",
      name: "Blue User",
      username: "blueuser",
      verified_type: "blue",
    };
    const result = formatUsername(user);
    expect(result).toContain("✓");
  });

  test("formats business verified type", () => {
    const user: User = {
      id: "123",
      name: "Business",
      username: "business",
      verified_type: "business",
    };
    const result = formatUsername(user);
    expect(result).toContain("✓");
  });

  test("formats government verified type", () => {
    const user: User = {
      id: "123",
      name: "Gov Account",
      username: "gov",
      verified_type: "government",
    };
    const result = formatUsername(user);
    expect(result).toContain("✓");
  });
});

describe("Tweet Formatting", () => {
  test("formats tweet without author", () => {
    const tweet: Tweet = {
      id: "123",
      text: "Hello world!",
      edit_history_tweet_ids: ["123"],
    };
    const result = formatTweet(tweet);
    expect(result).toContain("Hello world!");
  });

  test("formats tweet with author", () => {
    const tweet: Tweet = {
      id: "123",
      text: "Hello world!",
      created_at: new Date().toISOString(),
      edit_history_tweet_ids: ["123"],
    };
    const author: User = {
      id: "456",
      name: "Test User",
      username: "testuser",
    };
    const result = formatTweet(tweet, author);
    expect(result).toContain("@testuser");
    expect(result).toContain("Hello world!");
  });

  test("formats tweet with metrics", () => {
    const tweet: Tweet = {
      id: "123",
      text: "Popular tweet",
      edit_history_tweet_ids: ["123"],
      public_metrics: {
        like_count: 1500,
        retweet_count: 200,
        reply_count: 50,
        quote_count: 10,
        impression_count: 10000,
        bookmark_count: 5,
      },
    };
    const result = formatTweet(tweet);
    expect(result).toContain("1.5K");
    expect(result).toContain("200");
  });

  test("formats tweet with timestamp only", () => {
    const tweet: Tweet = {
      id: "123",
      text: "Timed tweet",
      created_at: new Date().toISOString(),
      edit_history_tweet_ids: ["123"],
    };
    const result = formatTweet(tweet);
    expect(result).toContain("just now");
  });
});

describe("User List Formatting", () => {
  test("formats empty user list", () => {
    const result = formatUserList([]);
    expect(result).toBe("No users found");
  });

  // Note: formatUserList with data uses cli-table3 which has environment-specific behavior
  // The function is tested indirectly through CLI integration tests
});

describe("User Profile Formatting", () => {
  test("formats basic user profile", () => {
    const user: User = {
      id: "123",
      name: "Test User",
      username: "testuser",
    };
    const result = formatUserProfile(user);
    expect(result).toContain("Test User");
    expect(result).toContain("@testuser");
  });

  test("formats user with description", () => {
    const user: User = {
      id: "123",
      name: "Test User",
      username: "testuser",
      description: "This is my bio",
    };
    const result = formatUserProfile(user);
    expect(result).toContain("This is my bio");
  });

  test("formats user with location", () => {
    const user: User = {
      id: "123",
      name: "Test User",
      username: "testuser",
      location: "San Francisco, CA",
    };
    const result = formatUserProfile(user);
    expect(result).toContain("San Francisco, CA");
  });

  test("formats user with metrics", () => {
    const user: User = {
      id: "123",
      name: "Test User",
      username: "testuser",
      public_metrics: {
        followers_count: 5000,
        following_count: 200,
        tweet_count: 1000,
        listed_count: 50,
        like_count: 100,
      },
    };
    const result = formatUserProfile(user);
    expect(result).toContain("5K");
    expect(result).toContain("followers");
    expect(result).toContain("following");
    expect(result).toContain("posts");
  });
});

describe("Error Formatting", () => {
  test("formats XCLIError", () => {
    const error = new XCLIError("Something went wrong", ErrorCode.API_ERROR);
    const result = formatError(error);
    expect(result).toContain("Something went wrong");
    expect(result).toContain("API_ERROR");
  });

  test("formats error with different codes", () => {
    const authError = new XCLIError("Not authenticated", ErrorCode.AUTH_REQUIRED);
    const rateLimitError = new XCLIError("Rate limited", ErrorCode.RATE_LIMITED);

    expect(formatError(authError)).toContain("AUTH_REQUIRED");
    expect(formatError(rateLimitError)).toContain("RATE_LIMITED");
  });
});

describe("Table Creation", () => {
  test("creates table object", () => {
    const table = createTable();
    expect(table).toBeDefined();
    expect(typeof table.push).toBe("function");
    expect(typeof table.toString).toBe("function");
  });

  test("creates table with headers", () => {
    const table = createTable({ head: ["Col1", "Col2"] });
    expect(table).toBeDefined();
  });

  // Note: cli-table3 toString() has environment-specific behavior
  // Table output is tested indirectly through CLI integration tests
});
