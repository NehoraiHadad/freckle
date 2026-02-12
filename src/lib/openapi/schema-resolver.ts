import type { JsonSchema } from "@/types/openapi";

/**
 * Resolves $ref pointers in a JSON Schema using the spec's component schemas.
 * Returns a new schema with all refs replaced by their definitions.
 * Handles circular references by stopping at depth limit.
 */
export function resolveSchema(
  schema: JsonSchema | undefined,
  componentSchemas: Record<string, JsonSchema>,
  maxDepth: number = 10,
): JsonSchema | undefined {
  if (!schema) return undefined;
  return resolve(schema, componentSchemas, 0, maxDepth, new Set());
}

function resolve(
  schema: JsonSchema,
  components: Record<string, JsonSchema>,
  depth: number,
  maxDepth: number,
  visited: Set<string>,
): JsonSchema {
  if (depth > maxDepth) return schema;

  // Handle $ref
  if (schema.$ref) {
    const refName = extractRefName(schema.$ref);
    if (!refName || visited.has(refName)) return schema;
    const resolved = components[refName];
    if (!resolved) return schema;
    visited.add(refName);
    const result = resolve(resolved, components, depth + 1, maxDepth, new Set(visited));
    visited.delete(refName);
    return result;
  }

  const result: JsonSchema = { ...schema };

  // Resolve nested properties
  if (result.properties) {
    const resolvedProps: Record<string, JsonSchema> = {};
    for (const [key, prop] of Object.entries(result.properties)) {
      resolvedProps[key] = resolve(prop, components, depth + 1, maxDepth, visited);
    }
    result.properties = resolvedProps;
  }

  // Resolve items (arrays)
  if (result.items) {
    result.items = resolve(result.items, components, depth + 1, maxDepth, visited);
  }

  // Resolve composition keywords
  for (const keyword of ["oneOf", "anyOf", "allOf"] as const) {
    const arr = result[keyword];
    if (Array.isArray(arr)) {
      (result as Record<string, unknown>)[keyword] = arr.map(s => resolve(s, components, depth + 1, maxDepth, visited));
    }
  }

  // Resolve additionalProperties if it's a schema
  if (result.additionalProperties && typeof result.additionalProperties === "object") {
    result.additionalProperties = resolve(result.additionalProperties as JsonSchema, components, depth + 1, maxDepth, visited);
  }

  return result;
}

/** Extract schema name from $ref string like "#/components/schemas/Foo" → "Foo" */
function extractRefName(ref: string): string | null {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/);
  return match ? match[1] : null;
}
