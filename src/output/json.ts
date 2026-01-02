import type { XCLIError } from "../types/errors.js";

/**
 * JSON output formatter
 * Outputs minimal, single-line JSON for piping to other tools
 */
export function formatJSON<T>(data: T): string {
  return JSON.stringify(data);
}

/**
 * Format error as JSON
 */
export function formatJSONError(error: XCLIError): string {
  return JSON.stringify(error.toJSON());
}

/**
 * Print JSON to stdout
 */
export function printJSON<T>(data: T): void {
  console.log(formatJSON(data));
}

/**
 * Print JSON error to stderr
 */
export function printJSONError(error: XCLIError): void {
  console.error(formatJSONError(error));
}
