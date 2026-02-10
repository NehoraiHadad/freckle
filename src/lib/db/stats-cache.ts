import { getDb } from "./index";
import type { CachedStat, StatType } from "@/types/product";

export function getCachedStat(productId: string, statType: StatType): CachedStat | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM stats_cache WHERE product_id = ? AND stat_type = ?")
    .get(productId, statType) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    productId: row.product_id as string,
    statType: row.stat_type as StatType,
    data: JSON.parse(row.data as string),
    fetchedAt: row.fetched_at as string,
    expiresAt: row.expires_at as string,
  };
}

export function setCachedStat(stat: CachedStat): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO stats_cache (product_id, stat_type, data, fetched_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    stat.productId,
    stat.statType,
    JSON.stringify(stat.data),
    stat.fetchedAt,
    stat.expiresAt,
  );
}

export function invalidateCache(productId: string, statType: StatType): void {
  const db = getDb();
  db.prepare("DELETE FROM stats_cache WHERE product_id = ? AND stat_type = ?").run(
    productId,
    statType,
  );
}

export function cleanExpiredCache(): number {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare("DELETE FROM stats_cache WHERE expires_at < ?").run(now);
  return result.changes;
}
