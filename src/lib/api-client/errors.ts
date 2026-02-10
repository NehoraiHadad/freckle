export class AdminApiError extends Error {
  constructor(
    public readonly productId: string,
    public readonly statusCode: number,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly endpoint: string,
  ) {
    super(`[${productId}] ${errorCode}: ${errorMessage} (${statusCode} on ${endpoint})`);
    this.name = "AdminApiError";
  }
}

export class AdminApiNetworkError extends Error {
  constructor(
    public readonly productId: string,
    public readonly endpoint: string,
    public readonly cause: Error,
  ) {
    super(`[${productId}] Network error on ${endpoint}: ${cause.message}`);
    this.name = "AdminApiNetworkError";
  }
}

type ErrorCategory = "auth" | "not_found" | "validation" | "rate_limited" | "network" | "server";

export interface ClassifiedError {
  category: ErrorCategory;
  userMessage: string;
  retryable: boolean;
  retryAfterMs?: number;
}

export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof AdminApiNetworkError) {
    return {
      category: "network",
      userMessage: `Could not reach the product at ${error.endpoint}. It may be offline or experiencing issues.`,
      retryable: true,
      retryAfterMs: 5_000,
    };
  }

  if (error instanceof AdminApiError) {
    const endpointPath = extractPath(error.endpoint);
    switch (error.statusCode) {
      case 401:
        return {
          category: "auth",
          userMessage: "Authentication failed. The API key may be invalid or rotated.",
          retryable: false,
        };
      case 404:
        return {
          category: "not_found",
          userMessage: `The endpoint ${endpointPath} was not found on this product.`,
          retryable: false,
        };
      case 429:
        return {
          category: "rate_limited",
          userMessage: "Too many requests. Please wait before trying again.",
          retryable: true,
          retryAfterMs: 60_000,
        };
      case 400:
      case 422:
        return {
          category: "validation",
          userMessage: error.errorMessage,
          retryable: false,
        };
      default:
        return {
          category: "server",
          userMessage: `The product returned an error from ${endpointPath}: ${error.errorMessage} (${error.statusCode})`,
          retryable: true,
          retryAfterMs: 10_000,
        };
    }
  }

  return {
    category: "server",
    userMessage: "An unexpected error occurred.",
    retryable: false,
  };
}

function extractPath(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return url.pathname;
  } catch {
    return endpoint;
  }
}
