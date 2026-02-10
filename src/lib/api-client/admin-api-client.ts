import type {
  AdminApiResponse,
  PaginationMeta,
  PaginationParams,
  HealthResponse,
  MetaResponse,
  StatsResponse,
  TrendsResponse,
  AdminUser,
  AdminUserDetail,
  AdminContentItem,
  ActionResponse,
  DeleteResponse,
  WebhookRegistration,
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
  // Users
  // ──────────────────────────────────

  readonly users = {
    list: (params?: PaginationParams & { status?: string; role?: string }) =>
      this.getList<AdminUser>("/users", params ? { ...params } : undefined),

    get: (id: string) =>
      this.get<AdminUserDetail>(`/users/${encodeURIComponent(id)}`),

    update: (id: string, data: { role?: string; status?: string; name?: string; metadata?: Record<string, unknown> }) =>
      this.patch<AdminUser>(`/users/${encodeURIComponent(id)}`, data),

    delete: (id: string) =>
      this.del<DeleteResponse>(`/users/${encodeURIComponent(id)}`),

    action: (id: string, action: string, params?: Record<string, unknown>) =>
      this.post<ActionResponse>(`/users/${encodeURIComponent(id)}/actions`, { action, params }),
  };

  // ──────────────────────────────────
  // Content
  // ──────────────────────────────────

  readonly content = {
    list: (params?: PaginationParams & { type?: string; status?: string; authorId?: string }) =>
      this.getList<AdminContentItem>("/content", params ? { ...params } : undefined),

    get: (id: string) =>
      this.get<AdminContentItem>(`/content/${encodeURIComponent(id)}`),

    update: (id: string, data: { status?: string; title?: string; metadata?: Record<string, unknown> }) =>
      this.patch<AdminContentItem>(`/content/${encodeURIComponent(id)}`, data),

    delete: (id: string) =>
      this.del<DeleteResponse>(`/content/${encodeURIComponent(id)}`),

    action: (id: string, action: string, params?: Record<string, unknown>) =>
      this.post<ActionResponse>(`/content/${encodeURIComponent(id)}/actions`, { action, params }),
  };

  // ──────────────────────────────────
  // Analytics
  // ──────────────────────────────────

  readonly analytics = {
    usage: (params?: { period?: string; from?: string; to?: string }) =>
      this.get<unknown>("/analytics/usage", params),

    activity: (params?: PaginationParams) =>
      this.getList<unknown>("/analytics/activity", params ? { ...params } : undefined),
  };

  // ──────────────────────────────────
  // Config
  // ──────────────────────────────────

  readonly config = {
    get: () =>
      this.get<{ settings: Record<string, unknown>; updatedAt: string; updatedBy: string }>("/config"),

    update: (settings: Record<string, unknown>) =>
      this.patch<{ settings: Record<string, unknown>; updatedAt: string; updatedBy: string }>("/config", settings),
  };

  // ──────────────────────────────────
  // Operations
  // ──────────────────────────────────

  async runOperation(action: string, params?: Record<string, unknown>): Promise<ActionResponse> {
    return this.post<ActionResponse>("/operations", { action, params });
  }

  // ──────────────────────────────────
  // Webhooks
  // ──────────────────────────────────

  readonly webhooks = {
    list: () =>
      this.get<WebhookRegistration[]>("/webhooks"),

    create: (data: { url: string; events: string[]; secret: string }) =>
      this.post<WebhookRegistration>("/webhooks", data),

    delete: (id: string) =>
      this.del<DeleteResponse>(`/webhooks/${encodeURIComponent(id)}`),
  };

  // ──────────────────────────────────
  // Generic Entity Accessor
  // ──────────────────────────────────

  /**
   * Generic entity accessor for any capability.
   * Use for capabilities without dedicated typed methods.
   */
  entity(capabilityName: string) {
    return {
      list: (params?: PaginationParams & Record<string, string | number | boolean | undefined | null>) =>
        this.getList<Record<string, unknown> & { id: string }>(
          `/${capabilityName}`,
          params ? { ...params } : undefined,
        ),
      get: (id: string) =>
        this.get<Record<string, unknown> & { id: string }>(
          `/${capabilityName}/${encodeURIComponent(id)}`,
        ),
      update: (id: string, data: Record<string, unknown>) =>
        this.patch<Record<string, unknown>>(
          `/${capabilityName}/${encodeURIComponent(id)}`,
          data,
        ),
      action: (id: string, action: string, params?: Record<string, unknown>) =>
        this.post<ActionResponse>(
          `/${capabilityName}/${encodeURIComponent(id)}/actions`,
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

    return {
      data: json.data,
      meta: json.meta ?? { total: json.data.length, page: 1, pageSize: json.data.length, hasMore: false },
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
