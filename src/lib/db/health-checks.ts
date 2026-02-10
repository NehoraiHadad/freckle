import { getDb } from "./index";
import type { HealthCheck } from "@/types/product";

export interface HealthCheckInput {
  productId: string;
  status: string;
  responseMs?: number;
  version?: string;
  error?: string;
}

export function insertHealthCheck(input: HealthCheckInput): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO health_checks (product_id, status, response_ms, version, error, checked_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.productId,
    input.status,
    input.responseMs ?? null,
    input.version ?? null,
    input.error ?? null,
    now,
  );
}

export function getRecentChecks(productId: string, limit = 50): HealthCheck[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM health_checks WHERE product_id = ? ORDER BY checked_at DESC LIMIT ?",
    )
    .all(productId, limit) as Record<string, unknown>[];

  return rows.map(deserializeHealthCheck);
}

export function cleanOldChecks(daysToKeep = 7): number {
  const db = getDb();
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare("DELETE FROM health_checks WHERE checked_at < ?").run(cutoff);
  return result.changes;
}

function deserializeHealthCheck(row: Record<string, unknown>): HealthCheck {
  return {
    id: row.id as number,
    productId: row.product_id as string,
    status: row.status as HealthCheck["status"],
    responseMs: row.response_ms as number | null,
    version: row.version as string | null,
    error: row.error as string | null,
    checkedAt: row.checked_at as string,
  };
}
