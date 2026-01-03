import type { XCLIError } from "../types/errors.js";
import { formatJSON, printJSON, formatJSONError, printJSONError } from "./json.js";
import {
  formatTweet,
  formatUserProfile,
  formatUserList,
  formatError,
  printSuccess,
  printWarning,
  printError,
  printInfo,
  createSpinner,
  createTable,
  formatNumber,
  formatRelativeTime,
  formatDuration,
  formatUsername,
} from "./pretty.js";

export {
  // JSON formatters
  formatJSON,
  printJSON,
  formatJSONError,
  printJSONError,
  // Pretty formatters
  formatTweet,
  formatUserProfile,
  formatUserList,
  formatError,
  printSuccess,
  printWarning,
  printError,
  printInfo,
  createSpinner,
  createTable,
  formatNumber,
  formatRelativeTime,
  formatDuration,
  formatUsername,
};

/**
 * Global output options
 */
export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  color?: boolean;
}

let globalOptions: OutputOptions = {};

/**
 * Set global output options
 */
export function setOutputOptions(options: OutputOptions): void {
  globalOptions = { ...globalOptions, ...options };
}

/**
 * Get current output options
 */
export function getOutputOptions(): OutputOptions {
  return globalOptions;
}

/**
 * Check if JSON mode is enabled
 */
export function isJsonMode(): boolean {
  // JSON if explicitly requested or if not a TTY
  return globalOptions.json || !process.stdout.isTTY;
}

/**
 * Output data in appropriate format
 */
export function output<T>(
  data: T,
  prettyFormatter?: (data: T) => string
): void {
  if (isJsonMode()) {
    printJSON(data);
  } else if (prettyFormatter) {
    console.log(prettyFormatter(data));
  } else {
    printJSON(data);
  }
}

/**
 * Output error in appropriate format
 */
export function outputError(error: XCLIError): void {
  if (isJsonMode()) {
    printJSONError(error);
  } else {
    printError(error);
  }
}
