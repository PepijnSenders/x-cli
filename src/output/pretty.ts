import chalk from "chalk";
import ora, { type Ora } from "ora";
import Table from "cli-table3";
import type { User, Tweet } from "../types/index.js";
import type { XCLIError } from "../types/errors.js";

/**
 * Format a number with K/M suffix
 * e.g., 1500 -> "1.5K", 2300000 -> "2.3M"
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return n.toString();
}

/**
 * Format a relative timestamp
 * e.g., "2h ago", "3d ago", "just now"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  if (diffWeek < 4) return `${diffWeek}w`;
  if (diffMonth < 12) return `${diffMonth}mo`;
  return `${diffYear}y`;
}

/**
 * Format time duration in human readable format
 * e.g., 6300 -> "1h 45m"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "< 1m";
}

/**
 * Format user display with verification badge
 */
export function formatUsername(user: User): string {
  let badge = "";
  if (user.verified_type === "blue") badge = chalk.blue(" ✓");
  else if (user.verified_type === "business") badge = chalk.yellow(" ✓");
  else if (user.verified_type === "government") badge = chalk.gray(" ✓");
  else if (user.verified) badge = chalk.blue(" ✓");

  return chalk.bold(`@${user.username}`) + badge;
}

/**
 * Format a tweet for pretty output
 */
export function formatTweet(tweet: Tweet, author?: User): string {
  const lines: string[] = [];

  // Header: @username · time
  if (author) {
    const time = tweet.created_at
      ? chalk.gray(` · ${formatRelativeTime(tweet.created_at)}`)
      : "";
    lines.push(formatUsername(author) + time);
  } else if (tweet.created_at) {
    lines.push(chalk.gray(formatRelativeTime(tweet.created_at)));
  }

  // Tweet text
  lines.push(tweet.text);

  // Metrics
  if (tweet.public_metrics) {
    const m = tweet.public_metrics;
    const metrics = [
      chalk.red(`♥ ${formatNumber(m.like_count)}`),
      chalk.green(`↺ ${formatNumber(m.retweet_count)}`),
      chalk.blue(`💬 ${formatNumber(m.reply_count)}`),
    ];
    lines.push("");
    lines.push(metrics.join("  "));
  }

  return lines.join("\n");
}

/**
 * Format a user profile for pretty output
 */
export function formatUserProfile(user: User): string {
  const lines: string[] = [];

  // Name and username
  lines.push(chalk.bold(user.name));
  lines.push(formatUsername(user));

  // Description
  if (user.description) {
    lines.push("");
    lines.push(user.description);
  }

  // Location
  if (user.location) {
    lines.push("");
    lines.push(chalk.gray(`📍 ${user.location}`));
  }

  // Metrics
  if (user.public_metrics) {
    const m = user.public_metrics;
    lines.push("");
    lines.push(
      [
        chalk.bold(formatNumber(m.followers_count)) +
          chalk.gray(" followers"),
        chalk.bold(formatNumber(m.following_count)) +
          chalk.gray(" following"),
        chalk.bold(formatNumber(m.tweet_count)) + chalk.gray(" posts"),
      ].join("  ")
    );
  }

  return lines.join("\n");
}

/**
 * Format error for pretty output
 */
export function formatError(error: XCLIError): string {
  return chalk.red(`Error: ${error.message}`) + chalk.gray(` [${error.code}]`);
}

/**
 * Create a spinner
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: "cyan",
  });
}

/**
 * Create a table
 */
export function createTable(options?: {
  head?: string[];
  colWidths?: number[];
}): Table.Table {
  return new Table({
    head: options?.head?.map((h) => chalk.bold(h)),
    colWidths: options?.colWidths,
    style: {
      head: [],
      border: [],
    },
  });
}

/**
 * Print success message
 */
export function printSuccess(message: string): void {
  console.log(chalk.green("✓") + " " + message);
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  console.log(chalk.yellow("⚠") + " " + message);
}

/**
 * Print error message
 */
export function printError(error: Error | XCLIError): void {
  if ("code" in error) {
    console.error(formatError(error as XCLIError));
  } else {
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(chalk.blue("ℹ") + " " + message);
}
