import { getDb } from "./index";
import type { AuditLogEntry, AuditLogInput } from "@/types/product";

export function appendLog(input: AuditLogInput): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_log (product_id, action, entity_type, entity_id, details, result, error_message, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.productId,
    input.action,
    input.entityType ?? null,
    input.entityId ?? null,
    input.details ? JSON.stringify(input.details) : null,
    input.result ?? "success",
    input.errorMessage ?? null,
    input.ipAddress ?? null,
    now,
  );
}

export function getAllLogs({
  productId,
  action,
  limit = 50,
  offset = 0,
}: {
  productId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): { logs: AuditLogEntry[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (productId) {
    conditions.push("product_id = ?");
    values.push(productId);
  }
  if (action) {
    conditions.push("action LIKE ?");
    values.push(`${action}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM audit_log ${where}`)
    .get(...values) as { count: number };

  const rows = db
    .prepare(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...values, limit, offset) as Record<string, unknown>[];

  return {
    logs: rows.map(deserializeAuditLog),
    total: countRow.count,
  };
}

export function getRecentLogs(productId: string, limit = 50): AuditLogEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM audit_log WHERE product_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(productId, limit) as Record<string, unknown>[];

  return rows.map(deserializeAuditLog);
}

export function getLogsByEntity(
  entityType: string,
  entityId: string,
  limit = 50,
): AuditLogEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(entityType, entityId, limit) as Record<string, unknown>[];

  return rows.map(deserializeAuditLog);
}

function deserializeAuditLog(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as number,
    productId: row.product_id as string,
    action: row.action as string,
    entityType: row.entity_type as string | null,
    entityId: row.entity_id as string | null,
    details: row.details ? safeJsonParse(row.details as string) : null,
    result: row.result as AuditLogEntry["result"],
    errorMessage: row.error_message as string | null,
    ipAddress: row.ip_address as string | null,
    createdAt: row.created_at as string,
  };
}

function safeJsonParse(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
