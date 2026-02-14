import { AdminApiClient } from "./admin-api-client";
import { getCachedStat, setCachedStat, invalidateCache } from "@/lib/db/stats-cache";
import type { StatType } from "@/types/product";

const CACHE_TTLS: Record<StatType, number> = {
  stats: 5 * 60 * 1000,
  trends_24h: 15 * 60 * 1000,
  trends_7d: 15 * 60 * 1000,
  trends_30d: 15 * 60 * 1000,
  meta: 60 * 60 * 1000,
};

export class CachedAdminApiClient {
  constructor(
    private readonly client: AdminApiClient,
    private readonly productId: string,
  ) {}

  // ──────────────────────────────────
  // Generic cached fetch (for runtime-determined paths)
  // ──────────────────────────────────

  async fetchCached(cacheKey: StatType, path: string): Promise<unknown> {
    return this.cachedGet(cacheKey, () => this.client.fetchJson(path));
  }

  // ──────────────────────────────────
  // Pass-through (always fresh)
  // ──────────────────────────────────

  entity(capabilityName: string) {
    return this.client.entity(capabilityName);
  }

  // ──────────────────────────────────
  // Cache invalidation
  // ──────────────────────────────────

  invalidateStats(): void {
    invalidateCache(this.productId, "stats");
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
    const cached = getCachedStat(this.productId, statType);
    if (cached && new Date(cached.expiresAt) > new Date()) {
      return cached.data as T;
    }

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
