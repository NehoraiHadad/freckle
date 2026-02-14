/** Common wrapper keys that contain the actual data array */
const WRAPPER_KEYS = ["points", "data", "items", "results", "records", "entries", "rows"]

/**
 * Extract the primary data array from various response shapes.
 * Handles: direct arrays, `{ points: [...] }`, `{ data: [...] }`, etc.,
 * or a singleton object → `[object]`.
 */
export function extractItems(data: unknown): Record<string, unknown>[] | null {
  if (data == null) return null

  // Direct array
  if (Array.isArray(data)) {
    if (data.length === 0) return []
    if (typeof data[0] === "object" && data[0] !== null) {
      return data as Record<string, unknown>[]
    }
    return null
  }

  // Object — check wrapper keys
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>
    for (const key of WRAPPER_KEYS) {
      const value = obj[key]
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        return value as Record<string, unknown>[]
      }
    }

    // Singleton object → wrap as single-item array
    return [obj]
  }

  return null
}
