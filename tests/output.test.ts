import { describe, expect, test } from "bun:test";
import {
  formatNumber,
  formatRelativeTime,
  formatDuration,
  formatJSON,
} from "../src/output/index.js";

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
});
