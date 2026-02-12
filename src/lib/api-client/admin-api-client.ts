import type {
  AdminApiResponse,
  PaginationMeta,
  PaginationParams,
  HealthResponse,
  MetaResponse,
  StatsResponse,
  TrendsResponse,
  ActionResponse,
} from "@/types/admin-api";
import { AdminApiError, AdminApiNetworkError } from "./errors";

export interface AdminApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  productId: string;
}

export class AdminApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly productId: string;

  constructor(config: AdminApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 10_000;
    this.productId = config.productId;
  }

  // ──────────────────────────────────
  // Health & Meta
  // ──────────────────────────────────

  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>("/health");
  }

  async meta(): Promise<MetaResponse> {
    return this.get<MetaResponse>("/meta");
  }

  // ──────────────────────────────────
  // Stats
  // ──────────────────────────────────

  async stats(): Promise<StatsResponse> {
    return this.get<StatsResponse>("/stats");
  }

  async trends(period: "24h" | "7d" | "30d" | "90d" = "7d"): Promise<TrendsResponse> {
    return this.get<TrendsResponse>(`/stats/trends?period=${period}`);
  }

  // ──────────────────────────────────
  // Generic Entity Accessor
  // ──────────────────────────────────

  /**
   * Generic entity accessor for any capability.
   * Use for capabilities without dedicated typed methods.
   */
  entity(capabilityName: string) {
    // Convert dotted resource keys to slash paths (e.g., "stats.trends" → "stats/trends")
    const apiPath = capabilityName.replace(/\./g, "/")
    return {
      list: (params?: PaginationParams & Record<string, string | number | boolean | undefined | null>) =>
        this.getList<Record<string, unknown> & { id: string }>(
          `/${apiPath}`,
          params ? { ...params } : undefined,
        ),
      get: (id: string) =>
        this.get<Record<string, unknown> & { id: string }>(
          `/${apiPath}/${encodeURIComponent(id)}`,
        ),
      update: (id: string, data: Record<string, unknown>) =>
        this.patch<Record<string, unknown>>(
          `/${apiPath}/${encodeURIComponent(id)}`,
          data,
        ),
      action: (id: string, action: string, params?: Record<string, unknown>) =>
        this.post<ActionResponse>(
          `/${apiPath}/${encodeURIComponent(id)}/actions`,
          { action, params },
        ),
    };
  }

  // ──────────────────────────────────
  // Raw request (for proxy route)
  // ──────────────────────────────────

  async rawProxyRequest(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const url = this.buildUrl(path);
    return this.rawRequest(method, url, body);
  }

  /**
   * Attempt to fetch the OpenAPI spec from the product.
   * Tries well-known paths in order:
   * 1. {origin}/api/openapi.json
   * 2. {baseUrl}/../openapi.json (one level up from admin prefix)
   * 3. {baseUrl}/openapi.json
   * Returns the raw spec object or null if not found.
   */
  async fetchOpenApiSpec(customUrl?: string): Promise<unknown | null> {
    const urlsToTry: string[] = [];

    if (customUrl) {
      urlsToTry.push(customUrl);
    } else {
      // Auto-detect: try well-known paths
      try {
        const origin = new URL(this.baseUrl).origin;
        urlsToTry.push(`${origin}/api/openapi.json`);
      } catch { /* ignore */ }

      // Try one level up from admin prefix
      const parentUrl = this.baseUrl.replace(/\/[^/]+\/?$/, "");
      if (parentUrl !== this.baseUrl) {
        urlsToTry.push(`${parentUrl}/openapi.json`);
      }

      urlsToTry.push(`${this.baseUrl}/openapi.json`);
    }

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("Content-Type") || "";
          if (contentType.includes("json") || url.endsWith(".json")) {
            const spec = await response.json();
            // Basic validation: check it looks like an OpenAPI spec
            if (spec && typeof spec === "object" && "openapi" in spec && "paths" in spec) {
              return spec;
            }
          }
        }
      } catch {
        // Try next URL
        continue;
      }
    }

    return null;
  }

  // ──────────────────────────────────
  // Internal HTTP methods
  // ──────────────────────────────────

  private async get<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>("GET", url);
  }

  private async getList<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): Promise<{ data: T[]; meta: PaginationMeta }> {
    const url = this.buildUrl(path, params);
    const response = await this.rawRequest("GET", url);
    const json = (await response.json()) as AdminApiResponse<T[]>;

    if (!json.success) {
      throw new AdminApiError(
        this.productId,
        response.status,
        json.error.code,
        json.error.message,
        path,
      );
    }

    // Some endpoints return singleton objects instead of arrays.
    // Pass through as-is; callers should normalize if needed.
    const dataLength = Array.isArray(json.data) ? json.data.length : 1;
    const defaultMeta = { total: dataLength, page: 1, pageSize: dataLength, hasMore: false };
    return {
      data: json.data,
      meta: json.meta ? { ...defaultMeta, ...json.meta } : defaultMeta,
    };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("POST", url, body);
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("PATCH", url, body);
  }

  private async del<T>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("DELETE", url);
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await this.rawRequest(method, url, body);
    const json = (await response.json()) as AdminApiResponse<T>;

    if (!json.success) {
      throw new AdminApiError(
        this.productId,
        response.status,
        json.error.code,
        json.error.message,
        url,
      );
    }

    return json.data;
  }

  private async rawRequest(method: string, url: string, body?: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
      };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AdminApiNetworkError(
          this.productId,
          url,
          new Error(`Request timed out after ${this.timeout}ms`),
        );
      }
      throw new AdminApiNetworkError(
        this.productId,
        url,
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
}
