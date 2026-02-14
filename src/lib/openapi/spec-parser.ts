import type {
  ParsedSpec,
  ApiResource,
  ApiOperation,
  HttpMethod,
  OperationType,
  JsonSchema,
} from "@/types/openapi";
import { resolveSchema } from "./schema-resolver";
import { toTitleCase } from "@/lib/format";

interface RawOpenApiSpec {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, RawOperation>>;
  components?: {
    schemas?: Record<string, JsonSchema>;
  };
}

interface RawOperation {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<{ name: string; in: string; schema?: JsonSchema }>;
  requestBody?: {
    content?: Record<string, { schema?: JsonSchema }>;
  };
  responses?: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function parseOpenApiSpec(
  rawSpec: RawOpenApiSpec,
  baseUrl: string,
  productId: string,
): ParsedSpec {
  const adminPrefix = detectAdminPrefix(baseUrl);
  const componentSchemas = rawSpec.components?.schemas ?? {};

  // Collect all operations from admin paths
  const operations: ApiOperation[] = [];
  const resourcePaths = new Set<string>(); // Track all resource path patterns

  for (const [fullPath, methods] of Object.entries(rawSpec.paths)) {
    if (!fullPath.startsWith(adminPrefix)) continue;
    const strippedPath = fullPath.slice(adminPrefix.length) || "/";

    for (const methodKey of Object.keys(methods)) {
      const method = methodKey.toUpperCase() as HttpMethod;
      if (!HTTP_METHODS.includes(method)) continue;

      const rawOp = methods[methodKey] as RawOperation;
      const pathParams = extractPathParameters(strippedPath);
      const resourceKey = pathToResourceKey(strippedPath);
      const opType = classifyOperation(method, strippedPath);

      // Resolve request body schema
      let requestBodySchema: JsonSchema | undefined;
      if (rawOp.requestBody?.content) {
        const jsonContent = rawOp.requestBody.content["application/json"];
        if (jsonContent?.schema) {
          requestBodySchema = resolveSchema(jsonContent.schema, componentSchemas);
        }
      }

      // Resolve response schema (from 200/201 response)
      let responseSchema: JsonSchema | undefined;
      if (rawOp.responses) {
        for (const status of ["200", "201"]) {
          const resp = rawOp.responses[status];
          if (resp?.content?.["application/json"]?.schema) {
            responseSchema = resolveSchema(resp.content["application/json"].schema, componentSchemas);
            break;
          }
        }
      }

      operations.push({
        id: `${method}:${strippedPath}`,
        resourceKey,
        operationType: opType,
        httpMethod: method,
        pathTemplate: strippedPath,
        summary: rawOp.summary,
        description: rawOp.description,
        pathParameters: pathParams,
        requestBodySchema,
        responseSchema,
        tags: rawOp.tags,
      });

      resourcePaths.add(resourceKey);
    }
  }

  // Build resource tree from operations
  const resources = buildResourceTree(operations);

  return {
    productId,
    specVersion: rawSpec.openapi,
    apiTitle: rawSpec.info.title,
    apiVersion: rawSpec.info.version,
    adminPrefix,
    resources,
    allOperations: operations,
    schemas: componentSchemas,
    parsedAt: new Date().toISOString(),
  };
}

/**
 * Detect the admin API prefix from the product's baseUrl.
 * e.g., "http://localhost:3000/api/v1/admin" → "/api/v1/admin"
 */
function detectAdminPrefix(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return url.pathname.replace(/\/+$/, "");
  } catch {
    // If not a valid URL, try to extract path directly
    const match = baseUrl.match(/(\/api\/.+)/);
    return match ? match[1].replace(/\/+$/, "") : "";
  }
}

/**
 * Extract path parameter names from a path template.
 * "/users/{userId}/credits/{creditId}" → ["userId", "creditId"]
 */
function extractPathParameters(path: string): string[] {
  const matches = path.matchAll(/\{([^}]+)\}/g);
  return Array.from(matches, m => m[1]);
}

/**
 * Convert a path template to a dot-separated resource key.
 *
 * Algorithm:
 * - Split into segments, ignore parameter segments (contain {})
 * - Join resource segments with dots
 *
 * Examples:
 *   "/users" → "users"
 *   "/users/{userId}" → "users"
 *   "/users/{userId}/credits" → "users.credits"
 *   "/users/{userId}/credits/history" → "users.credits.history"
 *   "/users/{userId}/credits/deduct" → "users.credits.deduct"
 *   "/feedback/{feedbackId}/reply" → "feedback.reply"
 *   "/credits/config/tiers" → "credits.config.tiers"
 *   "/stats/trends" → "stats.trends"
 *   "/config/history" → "config.history"
 */
function pathToResourceKey(path: string): string {
  const segments = path.split("/").filter(Boolean);
  const resourceSegments: string[] = [];

  for (const seg of segments) {
    if (!seg.startsWith("{")) {
      resourceSegments.push(seg);
    }
  }

  return resourceSegments.join(".") || "root";
}

/**
 * Classify what type of operation this is based on HTTP method and path pattern.
 */
function classifyOperation(method: HttpMethod, path: string): OperationType {
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? "";
  const hasTrailingParam = lastSegment.startsWith("{");
  const paramCount = segments.filter(s => s.startsWith("{")).length;

  // Count non-parameter segments after stripping
  // to determine if this is a top-level or sub-resource operation
  const resourceSegments = segments.filter(s => !s.startsWith("{"));
  const isSubResource = paramCount > 0 && resourceSegments.length > 1;

  if (method === "GET") {
    if (hasTrailingParam) {
      return isSubResource ? "sub-detail" : "detail";
    }
    // GET on a collection
    if (paramCount === 0) {
      return "list";
    }
    // GET on a sub-resource collection (e.g., /users/{id}/credits)
    return "sub-list";
  }

  if (method === "POST") {
    if (paramCount === 0 && resourceSegments.length === 1) {
      return "create";
    }
    // POST to /resource/{id}/actions or /resource/{id}/verb
    if (paramCount > 0) {
      return isSubResource ? "sub-action" : "action";
    }
    // POST to top-level (like /operations)
    return "action";
  }

  if (method === "PATCH" || method === "PUT") {
    if (hasTrailingParam) {
      return isSubResource ? "sub-action" : "update";
    }
    // PATCH/PUT without trailing param (like PATCH /config or PUT /credits/config/tiers)
    if (isSubResource || paramCount > 0) {
      return "sub-action";
    }
    return "update";
  }

  if (method === "DELETE") {
    if (hasTrailingParam) {
      return isSubResource ? "sub-action" : "delete";
    }
    return isSubResource ? "sub-action" : "action";
  }

  return "custom";
}

/**
 * Build resource tree from operations.
 * Groups operations by resource key and establishes parent/child relationships.
 */
function buildResourceTree(
  operations: ApiOperation[],
): ApiResource[] {
  // Collect all unique resource keys
  const allKeys = new Set<string>();
  for (const op of operations) {
    allKeys.add(op.resourceKey);
    // Also add parent keys to ensure tree continuity
    const parts = op.resourceKey.split(".");
    for (let i = 1; i < parts.length; i++) {
      allKeys.add(parts.slice(0, i).join("."));
    }
  }

  // Create resource entries
  const resourceMap = new Map<string, ApiResource>();

  for (const key of allKeys) {
    const parts = key.split(".");
    const parentKey = parts.length > 1 ? parts.slice(0, -1).join(".") : null;
    const segment = parts[parts.length - 1];

    // Determine if this resource requires a parent ID
    // Check if any operation's path has a parameter before this segment
    const requiresParentId = checkRequiresParentId(key, operations);

    const opsForResource = operations.filter(op => op.resourceKey === key);

    resourceMap.set(key, {
      key,
      name: toTitleCase(segment),
      parentKey,
      pathSegment: segment,
      requiresParentId,
      operations: opsForResource,
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

  // Sort children alphabetically
  function sortChildren(resources: ApiResource[]) {
    resources.sort((a, b) => a.key.localeCompare(b.key));
    for (const r of resources) {
      sortChildren(r.children);
    }
  }
  sortChildren(topLevel);

  return topLevel;
}

/**
 * Check if a resource requires a parent entity ID to access.
 * "users.credits" → true (path is /users/{userId}/credits)
 * "credits.config.tiers" → false (path is /credits/config/tiers)
 * "analytics.usage" → false (path is /analytics/usage)
 */
function checkRequiresParentId(key: string, operations: ApiOperation[]): boolean {
  // Find operations for this resource
  const ops = operations.filter(op => op.resourceKey === key);
  if (ops.length === 0) {
    // Check child operations to infer
    const childOps = operations.filter(op => op.resourceKey.startsWith(key + "."));
    if (childOps.length > 0) {
      return childOps.some(op => {
        const pathBeforeSegment = getPathBeforeLastResourceSegment(op.pathTemplate, key);
        return pathBeforeSegment !== null && /\{[^}]+\}/.test(pathBeforeSegment);
      });
    }
    return false;
  }

  // Check if the path to this resource contains a parameter
  for (const op of ops) {
    const segments = op.pathTemplate.split("/").filter(Boolean);
    const parts = key.split(".");
    const lastPart = parts[parts.length - 1];

    // Find the position of the resource segment in the path
    const segIndex = segments.indexOf(lastPart);
    if (segIndex > 0) {
      // Check if any segment before this one is a parameter
      const precedingSegments = segments.slice(0, segIndex);
      if (precedingSegments.some(s => s.startsWith("{"))) {
        return true;
      }
    }
  }

  return false;
}

function getPathBeforeLastResourceSegment(pathTemplate: string, key: string): string | null {
  const parts = key.split(".");
  const lastPart = parts[parts.length - 1];
  const idx = pathTemplate.indexOf(`/${lastPart}`);
  if (idx < 0) return null;
  return pathTemplate.slice(0, idx);
}

