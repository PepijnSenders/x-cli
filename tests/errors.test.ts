import { describe, expect, test } from "bun:test";
import {
  XCLIError,
  AuthError,
  RateLimitError,
  APIError,
  ValidationError,
  ConfigError,
  NetworkError,
  ErrorCode,
} from "../src/types/errors.js";

describe("XCLIError", () => {
  test("creates error with message and code", () => {
    const error = new XCLIError("Test error", ErrorCode.API_ERROR);
    expect(error.message).toBe("Test error");
    expect(error.code).toBe(ErrorCode.API_ERROR);
    expect(error.name).toBe("XCLIError");
  });

  test("extends Error", () => {
    const error = new XCLIError("Test", ErrorCode.API_ERROR);
    expect(error instanceof Error).toBe(true);
    expect(error instanceof XCLIError).toBe(true);
  });

  test("toJSON returns error and code", () => {
    const error = new XCLIError("Test message", ErrorCode.VALIDATION);
    const json = error.toJSON();
    expect(json).toEqual({
      error: "Test message",
      code: ErrorCode.VALIDATION,
    });
  });
});

describe("AuthError", () => {
  test("creates error with AUTH_REQUIRED code by default", () => {
    const error = new AuthError("Not logged in");
    expect(error.message).toBe("Not logged in");
    expect(error.code).toBe(ErrorCode.AUTH_REQUIRED);
    expect(error.name).toBe("AuthError");
  });

  test("creates error with AUTH_EXPIRED code when expired=true", () => {
    const error = new AuthError("Token expired", true);
    expect(error.code).toBe(ErrorCode.AUTH_EXPIRED);
  });

  test("extends XCLIError", () => {
    const error = new AuthError("Test");
    expect(error instanceof XCLIError).toBe(true);
    expect(error instanceof AuthError).toBe(true);
  });
});

describe("RateLimitError", () => {
  test("creates error with RATE_LIMITED code", () => {
    const error = new RateLimitError("Too many requests");
    expect(error.message).toBe("Too many requests");
    expect(error.code).toBe(ErrorCode.RATE_LIMITED);
    expect(error.name).toBe("RateLimitError");
  });

  test("stores retryAfter value", () => {
    const error = new RateLimitError("Rate limited", 60);
    expect(error.retryAfter).toBe(60);
  });

  test("retryAfter is undefined when not provided", () => {
    const error = new RateLimitError("Rate limited");
    expect(error.retryAfter).toBeUndefined();
  });

  test("extends XCLIError", () => {
    const error = new RateLimitError("Test");
    expect(error instanceof XCLIError).toBe(true);
  });
});

describe("APIError", () => {
  test("creates error with API_ERROR code", () => {
    const error = new APIError("API failed");
    expect(error.message).toBe("API failed");
    expect(error.code).toBe(ErrorCode.API_ERROR);
    expect(error.name).toBe("APIError");
  });

  test("stores error details", () => {
    const details = [
      { message: "Invalid parameter", code: 400 },
      { message: "Missing field", parameter: "text" },
    ];
    const error = new APIError("Multiple errors", details);
    expect(error.details).toEqual(details);
  });

  test("details is undefined when not provided", () => {
    const error = new APIError("Simple error");
    expect(error.details).toBeUndefined();
  });

  test("extends XCLIError", () => {
    const error = new APIError("Test");
    expect(error instanceof XCLIError).toBe(true);
  });
});

describe("ValidationError", () => {
  test("creates error with VALIDATION code", () => {
    const error = new ValidationError("Invalid input");
    expect(error.message).toBe("Invalid input");
    expect(error.code).toBe(ErrorCode.VALIDATION);
    expect(error.name).toBe("ValidationError");
  });

  test("stores field name", () => {
    const error = new ValidationError("Required field missing", "username");
    expect(error.field).toBe("username");
  });

  test("field is undefined when not provided", () => {
    const error = new ValidationError("General validation error");
    expect(error.field).toBeUndefined();
  });

  test("extends XCLIError", () => {
    const error = new ValidationError("Test");
    expect(error instanceof XCLIError).toBe(true);
  });
});

describe("ConfigError", () => {
  test("creates error with CONFIG_ERROR code", () => {
    const error = new ConfigError("Config file not found");
    expect(error.message).toBe("Config file not found");
    expect(error.code).toBe(ErrorCode.CONFIG_ERROR);
    expect(error.name).toBe("ConfigError");
  });

  test("extends XCLIError", () => {
    const error = new ConfigError("Test");
    expect(error instanceof XCLIError).toBe(true);
  });
});

describe("NetworkError", () => {
  test("creates error with NETWORK_ERROR code", () => {
    const error = new NetworkError("Connection failed");
    expect(error.message).toBe("Connection failed");
    expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(error.name).toBe("NetworkError");
  });

  test("extends XCLIError", () => {
    const error = new NetworkError("Test");
    expect(error instanceof XCLIError).toBe(true);
  });
});

describe("ErrorCode", () => {
  test("has all expected error codes", () => {
    expect(ErrorCode.AUTH_REQUIRED).toBe("AUTH_REQUIRED");
    expect(ErrorCode.AUTH_EXPIRED).toBe("AUTH_EXPIRED");
    expect(ErrorCode.RATE_LIMITED).toBe("RATE_LIMITED");
    expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
    expect(ErrorCode.FORBIDDEN).toBe("FORBIDDEN");
    expect(ErrorCode.VALIDATION).toBe("VALIDATION");
    expect(ErrorCode.API_ERROR).toBe("API_ERROR");
    expect(ErrorCode.NETWORK_ERROR).toBe("NETWORK_ERROR");
    expect(ErrorCode.CONFIG_ERROR).toBe("CONFIG_ERROR");
  });
});
