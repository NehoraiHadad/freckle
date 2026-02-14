import { describe, it, expect } from "vitest";
import { AdminApiError, AdminApiNetworkError, classifyError } from "../errors";

describe("AdminApiError", () => {
  it("creates error with correct properties", () => {
    const error = new AdminApiError("prod-1", 404, "NOT_FOUND", "Not found", "/api/test");
    expect(error.productId).toBe("prod-1");
    expect(error.statusCode).toBe(404);
    expect(error.errorCode).toBe("NOT_FOUND");
    expect(error.errorMessage).toBe("Not found");
    expect(error.endpoint).toBe("/api/test");
    expect(error.name).toBe("AdminApiError");
  });

  it("formats message correctly", () => {
    const error = new AdminApiError("prod-1", 404, "NOT_FOUND", "Not found", "/api/test");
    expect(error.message).toBe("[prod-1] NOT_FOUND: Not found (404 on /api/test)");
  });
});

describe("AdminApiNetworkError", () => {
  it("creates error with correct properties", () => {
    const cause = new Error("ECONNREFUSED");
    const error = new AdminApiNetworkError("prod-1", "http://localhost/api", cause);
    expect(error.productId).toBe("prod-1");
    expect(error.endpoint).toBe("http://localhost/api");
    expect(error.cause).toBe(cause);
    expect(error.name).toBe("AdminApiNetworkError");
  });

  it("formats message correctly", () => {
    const cause = new Error("timeout");
    const error = new AdminApiNetworkError("prod-1", "http://localhost/api", cause);
    expect(error.message).toBe("[prod-1] Network error on http://localhost/api: timeout");
  });
});

describe("classifyError", () => {
  it("classifies network errors as retryable", () => {
    const error = new AdminApiNetworkError("test", "http://localhost/api", new Error("timeout"));
    const result = classifyError(error);
    expect(result.category).toBe("network");
    expect(result.retryable).toBe(true);
    expect(result.retryAfterMs).toBe(5_000);
  });

  it("classifies 401 as auth error", () => {
    const error = new AdminApiError("test", 401, "UNAUTHORIZED", "Bad key", "/api/test");
    const result = classifyError(error);
    expect(result.category).toBe("auth");
    expect(result.retryable).toBe(false);
  });

  it("classifies 404 as not_found", () => {
    const error = new AdminApiError("test", 404, "NOT_FOUND", "Not found", "http://localhost/api/test");
    const result = classifyError(error);
    expect(result.category).toBe("not_found");
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toContain("/api/test");
  });

  it("classifies 429 as rate_limited", () => {
    const error = new AdminApiError("test", 429, "RATE_LIMITED", "Too many", "/api/test");
    const result = classifyError(error);
    expect(result.category).toBe("rate_limited");
    expect(result.retryable).toBe(true);
    expect(result.retryAfterMs).toBe(60_000);
  });

  it("classifies 400 as validation", () => {
    const error = new AdminApiError("test", 400, "INVALID", "Bad input", "/api/test");
    const result = classifyError(error);
    expect(result.category).toBe("validation");
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toBe("Bad input");
  });

  it("classifies 422 as validation", () => {
    const error = new AdminApiError("test", 422, "INVALID", "Unprocessable", "/api/test");
    const result = classifyError(error);
    expect(result.category).toBe("validation");
    expect(result.retryable).toBe(false);
  });

  it("classifies 500 as server error with retry", () => {
    const error = new AdminApiError("test", 500, "INTERNAL", "Server error", "/api/test");
    const result = classifyError(error);
    expect(result.category).toBe("server");
    expect(result.retryable).toBe(true);
    expect(result.retryAfterMs).toBe(10_000);
  });

  it("classifies 503 as server error with retry", () => {
    const error = new AdminApiError("test", 503, "UNAVAILABLE", "Service down", "/api/test");
    const result = classifyError(error);
    expect(result.category).toBe("server");
    expect(result.retryable).toBe(true);
  });

  it("classifies unknown Error as non-retryable server error", () => {
    const result = classifyError(new Error("random"));
    expect(result.category).toBe("server");
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toBe("An unexpected error occurred.");
  });

  it("classifies non-Error objects as server error", () => {
    const result = classifyError("string error");
    expect(result.category).toBe("server");
    expect(result.retryable).toBe(false);
  });

  it("classifies null/undefined as server error", () => {
    expect(classifyError(null).category).toBe("server");
    expect(classifyError(undefined).category).toBe("server");
  });
});
