import type { ApiResource, JsonSchema } from "@/types/openapi";

// ──────────────────────────────────
// Legacy interface (kept for backward compat during migration)
// ──────────────────────────────────

export interface DashboardEndpoints {
  statsPath: string | null;
  trendsPath: string | null;
  activityPath: string | null;
}

// ──────────────────────────────────
// New discovery interface
// ──────────────────────────────────

export interface DiscoveredEndpoint {
  path: string;
  resourceKey: string;
  resourceName: string;
  responseSchema?: JsonSchema;
  operationSummary?: string;
  priority: number;
  /** True if this resource has CRUD operations (list/detail/create/update/delete) */
  isEntityCollection: boolean;
}

/** Pattern for dashboard-type resources (stats, analytics, trends, etc.) */
const DASHBOARD_PATTERN = /stats|analytics|trend|summary|overview|metric|report|activity|event|audit|health|dashboard/i;

/**
 * Discover all parameterless GET endpoints from the resource tree.
 * Classifies them as dashboard-type (stats, trends, activity) or entity-type (CRUD collections).
 * Returns sorted by priority then key.
 */
export function discoverAllEndpoints(resources: ApiResource[]): DiscoveredEndpoint[] {
  const endpoints: DiscoveredEndpoint[] = [];
  const flat: ApiResource[] = [];

  // Flatten tree
  function walk(list: ApiResource[]) {
    for (const r of list) {
      flat.push(r);
      if (r.children.length > 0) walk(r.children);
    }
  }
  walk(resources);

  for (const resource of flat) {
    // Skip resources that require a parent ID (sub-resources)
    if (resource.requiresParentId) continue;

    // Find parameterless GET operations
    const getOp = resource.operations.find(
      (op) => op.httpMethod === "GET" && op.pathParameters.length === 0,
    );
    if (!getOp) continue;

    // Skip health — handled separately
    if (resource.key === "health") continue;

    const hasCrud = resource.operations.some(
      (op) => op.operationType === "create" || op.operationType === "update" || op.operationType === "delete",
    );
    const hasList = getOp.operationType === "list" || getOp.operationType === "sub-list";
    const isDashboardType = DASHBOARD_PATTERN.test(resource.key) || DASHBOARD_PATTERN.test(resource.pathSegment);
    const isEntityCollection = (hasList && hasCrud) || (hasList && resource.operations.some(op => op.operationType === "detail"));

    // Assign priority: lower = shown first
    let priority: number;
    if (isDashboardType && !isEntityCollection) {
      // Dashboard endpoints: stats=1, trends=2, activity=3
      if (/^stats$|^statistics$|^dashboard$|^summary$|^overview$/i.test(resource.key)) {
        priority = 1;
      } else if (/trend/i.test(resource.key)) {
        priority = 2;
      } else if (/activity|event|audit/i.test(resource.key)) {
        priority = 3;
      } else {
        priority = 4;
      }
    } else if (isEntityCollection) {
      priority = 10;
    } else {
      // Read-only non-dashboard endpoints (like config)
      priority = 5;
    }

    endpoints.push({
      path: getOp.pathTemplate,
      resourceKey: resource.key,
      resourceName: resource.name,
      responseSchema: getOp.responseSchema,
      operationSummary: getOp.summary,
      priority,
      isEntityCollection,
    });
  }

  // Sort by priority, then by key
  endpoints.sort((a, b) => a.priority - b.priority || a.resourceKey.localeCompare(b.resourceKey));

  return endpoints;
}

// ──────────────────────────────────
// Legacy API (kept for backward compat)
// ──────────────────────────────────

const STATS_PATTERNS = ["stats", "statistics", "dashboard", "summary", "overview"];
const TRENDS_PATTERNS = ["stats.trends", "trends", "statistics.trends", "analytics.trends"];
const ACTIVITY_PATTERNS = ["analytics.activity", "activity", "events", "audit", "analytics.events"];

function findEndpointPath(resources: ApiResource[], patterns: string[]): string | null {
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
 * Legacy: Discover dashboard-relevant endpoints from the OpenAPI resource tree.
 * @deprecated Use discoverAllEndpoints() instead.
 */
export function discoverDashboardEndpoints(resources: ApiResource[]): DashboardEndpoints {
  return {
    statsPath: findEndpointPath(resources, STATS_PATTERNS),
    trendsPath: findEndpointPath(resources, TRENDS_PATTERNS),
    activityPath: findEndpointPath(resources, ACTIVITY_PATTERNS),
  };
}
