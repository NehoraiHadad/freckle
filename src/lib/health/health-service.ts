import { getClientManager } from "@/lib/api-client/product-client-manager";
import { updateProductHealth } from "@/lib/db/products";
import { insertHealthCheck } from "@/lib/db/health-checks";
import { AdminApiNetworkError } from "@/lib/api-client/errors";
import type { HealthStatus } from "@/types/product";

export interface HealthCheckResult {
  productId: string;
  status: HealthStatus | "unreachable";
  responseMs: number;
  version?: string;
  error?: string;
}

/** Extract status from a flexible health response */
function extractStatus(data: Record<string, unknown>): HealthStatus {
  // Try common status field names
  for (const key of ["status", "state", "health"]) {
    const val = data[key];
    if (typeof val === "string") {
      const normalized = val.toLowerCase();
      if (normalized === "healthy" || normalized === "ok" || normalized === "up" || normalized === "pass") return "healthy";
      if (normalized === "degraded" || normalized === "warning" || normalized === "warn") return "degraded";
      if (normalized === "unhealthy" || normalized === "down" || normalized === "fail" || normalized === "error") return "unhealthy";
      // Map to unknown for unrecognized but present values
      return "unknown";
    }
  }

  // { ok: true } pattern
  if (data.ok === true) return "healthy";
  if (data.ok === false) return "unhealthy";

  // If we got any 200 response, treat as healthy
  return "healthy";
}

/** Extract version from a flexible health response */
function extractVersion(data: Record<string, unknown>): string | undefined {
  for (const key of ["version", "ver", "app_version", "appVersion"]) {
    const val = data[key];
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
  }
  return undefined;
}

export async function checkProductHealth(productId: string): Promise<HealthCheckResult> {
  const client = getClientManager().getClient(productId);
  const start = Date.now();

  try {
    const health = await client.health();
    const responseMs = Date.now() - start;

    // Flexible parsing: treat response as generic object
    const data = health as Record<string, unknown>;
    const status = extractStatus(data);
    const version = extractVersion(data);

    const result: HealthCheckResult = {
      productId,
      status,
      responseMs,
      version,
    };

    updateProductHealth(productId, result.status, result.version);
    insertHealthCheck({
      productId,
      status: result.status,
      responseMs: result.responseMs,
      version: result.version,
    });

    return result;
  } catch (error) {
    const responseMs = Date.now() - start;

    const result: HealthCheckResult = {
      productId,
      status: error instanceof AdminApiNetworkError ? "unreachable" : "unhealthy",
      responseMs,
      error: error instanceof Error ? error.message : String(error),
    };

    updateProductHealth(productId, result.status);
    insertHealthCheck({
      productId,
      status: result.status,
      responseMs: result.responseMs,
      error: result.error,
    });

    return result;
  }
}

export async function checkAllProducts(): Promise<HealthCheckResult[]> {
  const manager = getClientManager();
  let clients: { productId: string }[];

  try {
    clients = manager.getAllClients();
  } catch {
    return [];
  }

  const results = await Promise.allSettled(
    clients.map(({ productId }) => checkProductHealth(productId)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<HealthCheckResult> => r.status === "fulfilled")
    .map((r) => r.value);
}
