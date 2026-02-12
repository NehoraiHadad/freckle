/** Shared field classification sets for entity rendering */

/** Fields hidden from table columns and detail views */
export const HIDDEN_FIELDS = new Set([
  "id", "metadata", "stats", "replies", "pages",
  "characterTemplates", "adHocCharacters", "characterIds",
  "userId",
])

/** Fields rendered as Badge components */
export const BADGE_FIELDS = new Set([
  "status", "type", "role", "tier", "plan", "operationType",
])

/** Fields rendered as formatted dates */
export const DATE_FIELDS = new Set([
  "createdAt", "updatedAt", "resolvedAt", "lastActiveAt",
  "expiresAt", "timestamp", "startedAt", "endedAt", "reservedAt",
])

/** Check if a field should be rendered as a date, using both explicit set and pattern matching */
export function isDateField(key: string, value: unknown): boolean {
  if (DATE_FIELDS.has(key)) return true
  if (typeof value !== "string") return false
  if (/(?:_at|At|Date|Time|Timestamp)$/.test(key) && /^\d{4}-\d{2}-\d{2}T/.test(value)) return true
  return false
}
