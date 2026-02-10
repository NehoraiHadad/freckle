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

export async function checkProductHealth(productId: string): Promise<HealthCheckResult> {
  const client = getClientManager().getClient(productId);
  const start = Date.now();

  try {
    const health = await client.health();
    const responseMs = Date.now() - start;

    const result: HealthCheckResult = {
      productId,
      status: health.status,
      responseMs,
      version: health.version,
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
