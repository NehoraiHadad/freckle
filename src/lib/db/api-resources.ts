import { getDb } from "./index";
import type { ApiResource, ApiOperation, JsonSchema } from "@/types/openapi";

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

/** Delete all resources and operations for a product (before re-parsing) */
export function clearProductResources(productId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM api_resources WHERE product_id = ?").run(productId);
  db.prepare("DELETE FROM api_operations WHERE product_id = ?").run(productId);
}

/** Store parsed resources and operations */
export function storeResources(productId: string, resources: ApiResource[], allOperations: ApiOperation[]): void {
  const db = getDb();
  const now = new Date().toISOString();

  const insertResource = db.prepare(`
    INSERT OR REPLACE INTO api_resources (product_id, key, name, parent_key, path_segment, requires_parent_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOperation = db.prepare(`
    INSERT OR REPLACE INTO api_operations (product_id, resource_key, operation_type, http_method, path_template, summary, description, path_parameters, request_body_schema, response_schema, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    clearProductResources(productId);

    // Flatten resource tree and insert
    function insertTree(resources: ApiResource[]) {
      for (const r of resources) {
        insertResource.run(productId, r.key, r.name, r.parentKey, r.pathSegment, r.requiresParentId ? 1 : 0, now);
        insertTree(r.children);
      }
    }
    insertTree(resources);

    // Insert operations
    for (const op of allOperations) {
      insertOperation.run(
        productId, op.resourceKey, op.operationType, op.httpMethod, op.pathTemplate,
        op.summary ?? null, op.description ?? null,
        JSON.stringify(op.pathParameters),
        op.requestBodySchema ? JSON.stringify(op.requestBodySchema) : null,
        op.responseSchema ? JSON.stringify(op.responseSchema) : null,
        JSON.stringify(op.tags ?? []),
        now
      );
    }
  })();
}

/** Get all resources for a product as a flat list */
export function getProductResources(productId: string): ApiResource[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM api_resources WHERE product_id = ? ORDER BY key").all(productId) as Array<Record<string, unknown>>;
  const ops = db.prepare("SELECT * FROM api_operations WHERE product_id = ? ORDER BY resource_key, path_template").all(productId) as Array<Record<string, unknown>>;

  // Build operation map
  const opsByResource = new Map<string, ApiOperation[]>();
  for (const row of ops) {
    const op = deserializeOperation(row);
    const existing = opsByResource.get(op.resourceKey) ?? [];
    existing.push(op);
    opsByResource.set(op.resourceKey, existing);
  }

  // Build resource map
  const resourceMap = new Map<string, ApiResource>();
  for (const row of rows) {
    const key = row.key as string;
    resourceMap.set(key, {
      key,
      name: row.name as string,
      parentKey: row.parent_key as string | null,
      pathSegment: row.path_segment as string,
      requiresParentId: (row.requires_parent_id as number) === 1,
      operations: opsByResource.get(key) ?? [],
      children: [],
    });
  }

  // Build tree
  const topLevel: ApiResource[] = [];
  for (const resource of resourceMap.values()) {
    if (resource.parentKey) {
      const parent = resourceMap.get(resource.parentKey);
      if (parent) {
        parent.children.push(resource);
      } else {
        topLevel.push(resource);
      }
    } else {
      topLevel.push(resource);
    }
  }

  return topLevel;
}

/** Get operations for a specific resource */
export function getResourceOperations(productId: string, resourceKey: string): ApiOperation[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM api_operations WHERE product_id = ? AND resource_key = ? ORDER BY path_template").all(productId, resourceKey) as Array<Record<string, unknown>>;
  return rows.map(deserializeOperation);
}

/** Get all operations for a product (flat list) */
export function getAllOperations(productId: string): ApiOperation[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM api_operations WHERE product_id = ? ORDER BY resource_key, path_template").all(productId) as Array<Record<string, unknown>>;
  return rows.map(deserializeOperation);
}

function deserializeOperation(row: Record<string, unknown>): ApiOperation {
  return {
    id: String(row.id),
    resourceKey: row.resource_key as string,
    operationType: row.operation_type as ApiOperation["operationType"],
    httpMethod: row.http_method as ApiOperation["httpMethod"],
    pathTemplate: row.path_template as string,
    summary: row.summary as string | undefined,
    description: row.description as string | undefined,
    pathParameters: safeJsonParse<string[]>(row.path_parameters, []),
    requestBodySchema: safeJsonParse<JsonSchema | undefined>(row.request_body_schema, undefined),
    responseSchema: safeJsonParse<JsonSchema | undefined>(row.response_schema, undefined),
    tags: safeJsonParse<string[]>(row.tags, []),
  };
}
