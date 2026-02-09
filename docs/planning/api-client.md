# Freckle API Client Design

> How Freckle consumes product Admin APIs through a generic, type-safe client.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Freckle Next.js App                                │
│                                                     │
│  Server Components / Server Actions                 │
│    │                                                │
│    ▼                                                │
│  ProductClientManager (singleton)                   │
│    │  getClient("story-creator") → AdminApiClient   │
│    │  getClient("podcasto")      → AdminApiClient   │
│    │                                                │
│    ├── AdminApiClient("story-creator")              │
│    │     baseUrl + apiKey from product registry     │
│    │     ├── health()                               │
│    │     ├── meta()                                 │
│    │     ├── stats()                                │
│    │     ├── users.list()                           │
│    │     ├── users.get(id)                          │
│    │     ├── content.list()                         │
│    │     └── ...                                    │
│    │                                                │
│    └── AdminApiClient("podcasto")                   │
│          same interface, different baseUrl/apiKey    │
│                                                     │
│  Stats Cache Layer (SQLite)                         │
│    intercepts reads, serves from cache if fresh     │
└─────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
    Product A       Product B      Product C
    Admin API       Admin API      Admin API
```

---

## Generic Admin API Client

A single class that works with ANY product implementing the Freckle Admin API Standard.

### Core Design

```typescript
// src/lib/api-client/admin-api-client.ts

import type {
  AdminApiResponse,
  AdminApiSuccess,
  PaginationMeta,
  PaginationParams,
  ActionRequest,
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

// ============================================
// Client Configuration
// ============================================

interface AdminApiClientConfig {
  baseUrl: string;       // e.g. "https://story-creator.app/api/v1/admin"
  apiKey: string;        // the product's ADMIN_API_KEY
  timeout?: number;      // request timeout in ms (default: 10000)
  productId: string;     // for logging/error context
}

// ============================================
// Error Types
// ============================================

class AdminApiError extends Error {
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

class AdminApiNetworkError extends Error {
  constructor(
    public readonly productId: string,
    public readonly endpoint: string,
    public readonly cause: Error,
  ) {
    super(`[${productId}] Network error on ${endpoint}: ${cause.message}`);
    this.name = "AdminApiNetworkError";
  }
}

// ============================================
// The Client
// ============================================

class AdminApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly productId: string;

  constructor(config: AdminApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, ""); // strip trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 10_000;
    this.productId = config.productId;
  }

  // ──────────────────────────────────
  // Health & Meta (Required endpoints)
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
      this.getList<AdminUser>("/users", params),

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
      this.getList<AdminContentItem>("/content", params),

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
      this.getList<unknown>("/analytics/activity", params),
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
  // Internal HTTP methods
  // ──────────────────────────────────

  private async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>("GET", url);
  }

  private async getList<T>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<{ data: T[]; meta: PaginationMeta }> {
    const url = this.buildUrl(path, params);
    const response = await this.rawRequest("GET", url);
    const json = await response.json() as AdminApiResponse<T[]>;

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
    const json = await response.json() as AdminApiResponse<T>;

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
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
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

  private buildUrl(path: string, params?: Record<string, unknown>): string {
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

export { AdminApiClient, AdminApiError, AdminApiNetworkError };
export type { AdminApiClientConfig };
```

---

## Product Client Manager

Manages one `AdminApiClient` per registered product. Lazily creates clients from the product registry.

```typescript
// src/lib/api-client/product-client-manager.ts

import { AdminApiClient } from "./admin-api-client";
import { getProduct, getAllProducts } from "@/lib/db/products";
import type { Product } from "@/types/product";

class ProductClientManager {
  private clients = new Map<string, AdminApiClient>();

  /**
   * Get or create a client for a specific product.
   * Reads product config from the database on first access.
   */
  getClient(productId: string): AdminApiClient {
    let client = this.clients.get(productId);
    if (client) return client;

    const product = getProduct(productId);
    if (!product) {
      throw new Error(`Product "${productId}" not found in registry`);
    }
    if (product.status === "inactive") {
      throw new Error(`Product "${productId}" is inactive`);
    }

    client = new AdminApiClient({
      productId: product.id,
      baseUrl: product.baseUrl,
      apiKey: product.apiKey,  // already decrypted by getProduct
      timeout: 10_000,
    });

    this.clients.set(productId, client);
    return client;
  }

  /**
   * Remove a cached client (e.g., after product config changes).
   */
  invalidate(productId: string): void {
    this.clients.delete(productId);
  }

  /**
   * Remove all cached clients.
   */
  invalidateAll(): void {
    this.clients.clear();
  }

  /**
   * Get clients for all active products.
   */
  getAllClients(): { productId: string; client: AdminApiClient }[] {
    const products = getAllProducts().filter(p => p.status === "active");
    return products.map(p => ({
      productId: p.id,
      client: this.getClient(p.id),
    }));
  }
}

// Singleton
let manager: ProductClientManager | null = null;

export function getClientManager(): ProductClientManager {
  if (!manager) {
    manager = new ProductClientManager();
  }
  return manager;
}
```

---

## Health Monitoring

### Health Check Service

Runs periodic checks on all registered products.

```typescript
// src/lib/health/health-service.ts

import { getClientManager } from "@/lib/api-client/product-client-manager";
import { updateProductHealth } from "@/lib/db/products";
import { insertHealthCheck } from "@/lib/db/health-checks";
import { AdminApiNetworkError } from "@/lib/api-client/admin-api-client";
import type { HealthStatus } from "@/types/product";

interface HealthCheckResult {
  productId: string;
  status: HealthStatus | "unreachable";
  responseMs: number;
  version?: string;
  error?: string;
}

/**
 * Check health of a single product.
 */
async function checkProductHealth(productId: string): Promise<HealthCheckResult> {
  const client = getClientManager().getClient(productId);
  const start = Date.now();

  try {
    const health = await client.health();
    const responseMs = Date.now() - start;

    return {
      productId,
      status: health.status,
      responseMs,
      version: health.version,
    };
  } catch (error) {
    const responseMs = Date.now() - start;

    if (error instanceof AdminApiNetworkError) {
      return {
        productId,
        status: "unreachable",
        responseMs,
        error: error.message,
      };
    }

    return {
      productId,
      status: "unhealthy",
      responseMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check all active products and persist results.
 */
async function checkAllProducts(): Promise<HealthCheckResult[]> {
  const manager = getClientManager();
  const clients = manager.getAllClients();
  const results = await Promise.allSettled(
    clients.map(({ productId }) => checkProductHealth(productId))
  );

  const checkResults: HealthCheckResult[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      const check = result.value;
      checkResults.push(check);

      // Persist to DB
      updateProductHealth(check.productId, check.status, check.version);
      insertHealthCheck({
        productId: check.productId,
        status: check.status,
        responseMs: check.responseMs,
        version: check.version,
        error: check.error,
      });
    }
  }

  return checkResults;
}

export { checkProductHealth, checkAllProducts };
export type { HealthCheckResult };
```

### How Health Checks Are Triggered

| Trigger | Mechanism | Interval |
|---------|-----------|----------|
| Page load (dashboard) | Server component calls `checkAllProducts()` if last check > 1 min | ~1 min |
| API route (cron) | `GET /api/health-check` called by external cron (or Vercel cron) | Every 1 min |
| Manual | Admin clicks "Refresh" button in UI | On demand |

### Unhealthy Product Behavior

When a product is unhealthy or unreachable:

1. **Show warning badge** on the product in the sidebar (yellow for degraded, red for unhealthy/unreachable)
2. **Keep the product accessible** -- admin may want to see cached data or retry
3. **Show error banner** on the product's pages: "This product is currently unreachable. Data shown may be stale."
4. **Disable write actions** (mutations) when unreachable -- prevent actions that would silently fail
5. **Continue health checks** -- auto-recover badge when product comes back

---

## Error Handling Strategy

### Error Classification & Response

```typescript
// src/lib/api-client/error-handler.ts

import { AdminApiError, AdminApiNetworkError } from "./admin-api-client";

type ErrorCategory = "auth" | "not_found" | "validation" | "rate_limited" | "network" | "server";

interface ClassifiedError {
  category: ErrorCategory;
  userMessage: string;      // safe to show in UI
  retryable: boolean;
  retryAfterMs?: number;
}

function classifyError(error: unknown): ClassifiedError {
  if (error instanceof AdminApiNetworkError) {
    return {
      category: "network",
      userMessage: "Could not reach this product. It may be offline or experiencing issues.",
      retryable: true,
      retryAfterMs: 5_000,
    };
  }

  if (error instanceof AdminApiError) {
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
          userMessage: "The requested resource was not found.",
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
          userMessage: "The product reported an internal error.",
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

export { classifyError };
export type { ErrorCategory, ClassifiedError };
```

### How Errors Surface to the UI

**Server Components**: Errors caught in the component, rendered as error UI with retry button (if retryable).

**Server Actions**: Return `{ success: false, error: classifiedError }` to the client. Client shows toast notification.

**Pattern**: Never let raw `AdminApiError` or network errors leak to the client. Always classify first.

---

## Caching Strategy

### Cache Layer

Sits between the Freckle app and the `AdminApiClient`. Uses SQLite `stats_cache` table.

```typescript
// src/lib/api-client/cached-client.ts

import { AdminApiClient } from "./admin-api-client";
import { getCachedStat, setCachedStat, invalidateCache } from "@/lib/db/stats-cache";
import type { StatType } from "@/types/product";

// Cache TTLs in milliseconds
const CACHE_TTLS: Record<StatType, number> = {
  stats:       5 * 60 * 1000,      // 5 minutes
  trends_24h: 15 * 60 * 1000,      // 15 minutes
  trends_7d:  15 * 60 * 1000,
  trends_30d: 15 * 60 * 1000,
  meta:       60 * 60 * 1000,      // 1 hour
};

/**
 * Wraps an AdminApiClient with caching for read-heavy endpoints.
 * Write operations bypass cache and invalidate relevant entries.
 */
class CachedAdminApiClient {
  constructor(
    private readonly client: AdminApiClient,
    private readonly productId: string,
  ) {}

  // ──────────────────────────────────
  // Cached reads
  // ──────────────────────────────────

  async stats(): Promise<unknown> {
    return this.cachedGet("stats", () => this.client.stats());
  }

  async trends(period: "24h" | "7d" | "30d" | "90d"): Promise<unknown> {
    const statType = `trends_${period}` as StatType;
    return this.cachedGet(statType, () => this.client.trends(period));
  }

  async meta(): Promise<unknown> {
    return this.cachedGet("meta", () => this.client.meta());
  }

  // ──────────────────────────────────
  // Uncached (always fresh)
  // ──────────────────────────────────

  // Users - always fresh (admin needs current data)
  get users() { return this.client.users; }

  // Content - always fresh
  get content() { return this.client.content; }

  // Health - always fresh (short-lived by nature)
  health() { return this.client.health(); }

  // Analytics - always fresh (has its own time-range params)
  get analytics() { return this.client.analytics; }

  // Config - always fresh (admin reads should reflect latest)
  get config() { return this.client.config; }

  // Operations - always fresh (mutations)
  runOperation(action: string, params?: Record<string, unknown>) {
    return this.client.runOperation(action, params);
  }

  // Webhooks - always fresh
  get webhooks() { return this.client.webhooks; }

  // ──────────────────────────────────
  // Cache invalidation after mutations
  // ──────────────────────────────────

  /**
   * Call after any write operation that changes stats.
   * E.g., after deleting a user, stats.users.total would change.
   */
  invalidateStats(): void {
    invalidateCache(this.productId, "stats");
    // Trends may also be affected
    invalidateCache(this.productId, "trends_24h");
    invalidateCache(this.productId, "trends_7d");
    invalidateCache(this.productId, "trends_30d");
  }

  invalidateMeta(): void {
    invalidateCache(this.productId, "meta");
  }

  // ──────────────────────────────────
  // Internal
  // ──────────────────────────────────

  private async cachedGet<T>(statType: StatType, fetcher: () => Promise<T>): Promise<T> {
    // Try cache first
    const cached = getCachedStat(this.productId, statType);
    if (cached && new Date(cached.expiresAt) > new Date()) {
      return cached.data as T;
    }

    // Cache miss or expired -- fetch fresh
    const data = await fetcher();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTLS[statType]);

    setCachedStat({
      productId: this.productId,
      statType,
      data,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    return data;
  }
}

export { CachedAdminApiClient };
```

### Cache Summary

| Data              | Cached? | TTL     | Invalidation                     |
|-------------------|---------|---------|----------------------------------|
| /health           | No      | -       | Always fetch fresh               |
| /meta             | Yes     | 1 hour  | After product config changes     |
| /stats            | Yes     | 5 min   | After any write operation        |
| /stats/trends     | Yes     | 15 min  | After any write operation        |
| /users (list)     | No      | -       | Always fresh                     |
| /users/:id        | No      | -       | Always fresh                     |
| /content (list)   | No      | -       | Always fresh                     |
| /content/:id      | No      | -       | Always fresh                     |
| /analytics/*      | No      | -       | Always fresh (has time params)   |
| /config           | No      | -       | Always fresh                     |
| /operations       | No      | -       | Mutation, never cached           |
| /webhooks         | No      | -       | Always fresh                     |

**Rationale**: Stats and meta are the only endpoints worth caching. They power the dashboard and change slowly. User/content lists need to be fresh because the admin is actively managing them.

---

## Usage in Server Components

### Reading product data (dashboard page)

```typescript
// src/app/(dashboard)/[productId]/page.tsx

import { getClientManager } from "@/lib/api-client/product-client-manager";
import { CachedAdminApiClient } from "@/lib/api-client/cached-client";
import { getProduct } from "@/lib/db/products";
import { ProductDashboard } from "@/components/product-dashboard";

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { productId } = await params;
  const product = getProduct(productId);

  if (!product) {
    notFound();
  }

  const rawClient = getClientManager().getClient(productId);
  const client = new CachedAdminApiClient(rawClient, productId);

  try {
    const [stats, meta] = await Promise.all([
      client.stats(),
      client.meta(),
    ]);

    return <ProductDashboard product={product} stats={stats} meta={meta} />;
  } catch (error) {
    const classified = classifyError(error);
    return <ProductErrorBanner error={classified} product={product} />;
  }
}
```

### User list with pagination (server component)

```typescript
// src/app/(dashboard)/[productId]/users/page.tsx

import { getClientManager } from "@/lib/api-client/product-client-manager";

interface Props {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function UsersPage({ params, searchParams }: Props) {
  const { productId } = await params;
  const { page = "1", search, status } = await searchParams;

  const client = getClientManager().getClient(productId);
  const result = await client.users.list({
    page: parseInt(page),
    pageSize: 20,
    search: search || undefined,
    status: status || undefined,
  });

  return (
    <UserList
      users={result.data}
      meta={result.meta}
      productId={productId}
    />
  );
}
```

### Mutation via server action

```typescript
// src/actions/user-actions.ts
"use server";

import { getClientManager } from "@/lib/api-client/product-client-manager";
import { CachedAdminApiClient } from "@/lib/api-client/cached-client";
import { logAuditAction } from "@/lib/db/audit-log";
import { classifyError } from "@/lib/api-client/error-handler";
import type { ActionResult } from "@/types/api";

export async function updateUserRole(
  productId: string,
  userId: string,
  role: string,
): Promise<ActionResult<{ role: string }>> {
  try {
    const rawClient = getClientManager().getClient(productId);
    const client = new CachedAdminApiClient(rawClient, productId);

    const updated = await client.users.update(userId, { role });

    // Invalidate stats cache (user role change may affect stats)
    client.invalidateStats();

    // Audit log
    logAuditAction({
      productId,
      action: "user.update",
      entityType: "user",
      entityId: userId,
      details: { field: "role", newValue: role },
    });

    return { success: true, data: { role: updated.role } };
  } catch (error) {
    const classified = classifyError(error);

    logAuditAction({
      productId,
      action: "user.update",
      entityType: "user",
      entityId: userId,
      details: { field: "role", newValue: role },
      result: "error",
      errorMessage: classified.userMessage,
    });

    return { success: false, error: classified.userMessage };
  }
}

export async function runUserAction(
  productId: string,
  userId: string,
  action: string,
  params?: Record<string, unknown>,
): Promise<ActionResult<{ result: string }>> {
  try {
    const client = getClientManager().getClient(productId);
    const response = await client.users.action(userId, action, params);

    logAuditAction({
      productId,
      action: `user.action.${action}`,
      entityType: "user",
      entityId: userId,
      details: { action, params },
    });

    return { success: true, data: { result: String(response.result) } };
  } catch (error) {
    const classified = classifyError(error);
    return { success: false, error: classified.userMessage };
  }
}
```

---

## Complete Method Inventory

Every standard endpoint mapped to a client method:

| Standard Endpoint                  | Client Method                        | Returns                  |
|------------------------------------|--------------------------------------|--------------------------|
| `GET /health`                      | `client.health()`                    | `HealthResponse`         |
| `GET /meta`                        | `client.meta()`                      | `MetaResponse`           |
| `GET /stats`                       | `client.stats()`                     | `StatsResponse`          |
| `GET /stats/trends?period=`        | `client.trends(period)`              | `TrendsResponse`         |
| `GET /users`                       | `client.users.list(params)`          | `{ data, meta }`         |
| `GET /users/:id`                   | `client.users.get(id)`               | `AdminUserDetail`        |
| `PATCH /users/:id`                 | `client.users.update(id, data)`      | `AdminUser`              |
| `DELETE /users/:id`                | `client.users.delete(id)`            | `DeleteResponse`         |
| `POST /users/:id/actions`          | `client.users.action(id, action, p)` | `ActionResponse`         |
| `GET /content`                     | `client.content.list(params)`        | `{ data, meta }`         |
| `GET /content/:id`                 | `client.content.get(id)`             | `AdminContentItem`       |
| `PATCH /content/:id`               | `client.content.update(id, data)`    | `AdminContentItem`       |
| `DELETE /content/:id`              | `client.content.delete(id)`          | `DeleteResponse`         |
| `POST /content/:id/actions`        | `client.content.action(id, act, p)`  | `ActionResponse`         |
| `GET /analytics/usage`             | `client.analytics.usage(params)`     | Usage data               |
| `GET /analytics/activity`          | `client.analytics.activity(params)`  | `{ data, meta }`         |
| `GET /config`                      | `client.config.get()`                | Config data              |
| `PATCH /config`                    | `client.config.update(settings)`     | Config data              |
| `POST /operations`                 | `client.runOperation(action, p)`     | `ActionResponse`         |
| `GET /webhooks`                    | `client.webhooks.list()`             | `WebhookRegistration[]`  |
| `POST /webhooks`                   | `client.webhooks.create(data)`       | `WebhookRegistration`    |
| `DELETE /webhooks/:id`             | `client.webhooks.delete(id)`         | `DeleteResponse`         |

---

## Product Registration Flow

When an admin adds a new product to Freckle:

```
1. Admin enters: name, baseUrl, apiKey
2. Freckle calls GET {baseUrl}/health to verify connectivity
3. Freckle calls GET {baseUrl}/meta to discover capabilities
4. Product registered in SQLite with:
   - id = meta.product
   - name = meta.displayName
   - capabilities = meta.capabilities
   - supportedActions = meta.supportedActions
   - apiStandardVersion = meta.apiStandardVersion
   - productVersion = health.version
5. Health check begins on interval
6. Product appears in sidebar
```

```typescript
// src/actions/product-actions.ts
"use server";

import { AdminApiClient } from "@/lib/api-client/admin-api-client";
import { addProduct } from "@/lib/db/products";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import type { ActionResult } from "@/types/api";

export async function registerProduct(
  baseUrl: string,
  apiKey: string,
): Promise<ActionResult<{ productId: string }>> {
  // 1. Create a temporary client to probe the product
  const tempClient = new AdminApiClient({
    productId: "discovery",
    baseUrl,
    apiKey,
    timeout: 15_000,
  });

  // 2. Verify connectivity
  try {
    await tempClient.health();
  } catch {
    return { success: false, error: "Could not reach the product. Check the URL and try again." };
  }

  // 3. Discover capabilities
  let meta;
  try {
    meta = await tempClient.meta();
  } catch {
    return { success: false, error: "Product is reachable but /meta endpoint failed. Is the Admin API implemented?" };
  }

  // 4. Register in database
  const product = addProduct({
    id: meta.product,
    name: meta.displayName,
    description: meta.description,
    baseUrl,
    apiKey,
  });

  // 5. Invalidate client cache so next access picks up the new product
  getClientManager().invalidateAll();

  return { success: true, data: { productId: product.id } };
}
```

---

## File Layout

```
src/lib/api-client/
  admin-api-client.ts           -- Generic HTTP client for any product
  product-client-manager.ts     -- Singleton that manages per-product clients
  cached-client.ts              -- Caching wrapper
  error-handler.ts              -- Error classification

src/lib/health/
  health-service.ts             -- Health check logic

src/actions/
  product-actions.ts            -- Register/remove products
  user-actions.ts               -- User CRUD server actions
  content-actions.ts            -- Content CRUD server actions

src/types/
  admin-api.ts                  -- All types from the Freckle standard (Section 9.1)
  product.ts                    -- Product, HealthCheck, AuditLogEntry
  preferences.ts                -- Preferences
  api.ts                        -- ActionResult, shared response types
```
