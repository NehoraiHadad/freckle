import type { ApiResource } from "@/types/openapi";

export interface DashboardEndpoints {
  statsPath: string | null;
  trendsPath: string | null;
  activityPath: string | null;
}

/** Pattern lists ordered by specificity — first match wins */
const STATS_PATTERNS = ["stats", "statistics", "dashboard", "summary", "overview"];
const TRENDS_PATTERNS = ["stats.trends", "trends", "statistics.trends", "analytics.trends"];
const ACTIVITY_PATTERNS = ["analytics.activity", "activity", "events", "audit", "analytics.events"];

/**
 * Find the GET path for the first resource whose key matches one of the patterns.
 * Returns the pathTemplate from the resource's first GET operation, or null.
 */
function findEndpointPath(resources: ApiResource[], patterns: string[]): string | null {
  // Build a flat map of key → resource (including nested children)
  const flatMap = new Map<string, ApiResource>();
  function walk(list: ApiResource[]) {
    for (const r of list) {
      flatMap.set(r.key, r);
      if (r.children.length > 0) walk(r.children);
    }
  }
  walk(resources);

  for (const pattern of patterns) {
    const resource = flatMap.get(pattern);
    if (resource) {
      const getOp = resource.operations.find((op) => op.httpMethod === "GET");
      if (getOp) return getOp.pathTemplate;
    }
  }

  return null;
}

/**
 * Discover dashboard-relevant endpoints from the OpenAPI resource tree.
 * Uses pattern matching on resource keys to find stats, trends, and activity paths.
 */
export function discoverDashboardEndpoints(resources: ApiResource[]): DashboardEndpoints {
  return {
    statsPath: findEndpointPath(resources, STATS_PATTERNS),
    trendsPath: findEndpointPath(resources, TRENDS_PATTERNS),
    activityPath: findEndpointPath(resources, ACTIVITY_PATTERNS),
  };
}
