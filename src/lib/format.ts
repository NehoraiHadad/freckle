/** Convert camelCase/snake_case/kebab-case to Title Case */
export function toTitleCase(s: string): string {
  return s
    .replace(/[-_]/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** Format ISO date string to human-readable short format */
export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

/** Format ISO date string to short date only (no time) */
export function formatDateShort(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}
