import { Badge } from "@/components/ui/badge"
import { toTitleCase, formatDate, formatDateShort } from "@/lib/format"
import { BADGE_FIELDS, isDateField } from "@/lib/entity-fields"

export interface ValueLabels {
  yes: string
  no: string
  items?: string
  links?: string
  fields?: string
}

const defaultLabels: ValueLabels = {
  yes: "Yes",
  no: "No",
  items: "items",
  links: "links",
  fields: "fields",
}

/**
 * Shared value renderer for entity tables, detail views, and sub-resource tabs.
 * Handles: null/undefined, booleans, numbers, dates, badges, arrays, objects, and strings.
 */
export function renderValue(
  key: string,
  value: unknown,
  labels?: Partial<ValueLabels>,
  options?: { truncate?: number; dateFormat?: "short" | "full" }
): React.ReactNode {
  const l = { ...defaultLabels, ...labels }
  const truncateAt = options?.truncate ?? 100
  const dateFormatter = options?.dateFormat === "short" ? formatDateShort : formatDate

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">&mdash;</span>
  }

  if (BADGE_FIELDS.has(key)) {
    return <Badge variant="outline">{String(value)}</Badge>
  }

  if (isDateField(key, value) && typeof value === "string") {
    return <span className="text-muted-foreground">{dateFormatter(value)}</span>
  }

  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? l.yes : l.no}</Badge>
  }

  if (typeof value === "number") {
    return <span>{value.toLocaleString()}</span>
  }

  // Image URL detection — using <img> intentionally for dynamic external URLs
  if (typeof value === "string" && /^https?:\/\//.test(value) && /image|avatar|photo|thumbnail|picture/i.test(key)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
  }

  // Array handling
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">&mdash;</span>
    }
    if (value.every(v => typeof v === "string" && /^https?:\/\//.test(v))) {
      return <span className="text-xs text-muted-foreground">{value.length} {l.links}</span>
    }
    if (value.every(v => typeof v === "string" || typeof v === "number")) {
      const shown = value.slice(0, 3)
      return (
        <div className="flex flex-wrap gap-1">
          {shown.map((v, i) => <Badge key={i} variant="secondary" className="text-xs">{String(v)}</Badge>)}
          {value.length > 3 && <span className="text-xs text-muted-foreground">+{value.length - 3}</span>}
        </div>
      )
    }
    return <span className="text-xs text-muted-foreground">{value.length} {l.items}</span>
  }

  // Object handling
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>
    if ("name" in obj && obj.name) return <span>{String(obj.name)}</span>
    if ("email" in obj && obj.email) return <span>{String(obj.email)}</span>
    const entries = Object.entries(obj).slice(0, 2)
    if (entries.length > 0 && entries.every(([, v]) => typeof v !== "object")) {
      return <span className="text-xs text-muted-foreground">{entries.map(([k, v]) => `${toTitleCase(k)}: ${v}`).join(", ")}</span>
    }
    return <span className="text-xs text-muted-foreground">{Object.keys(obj).length} {l.fields}</span>
  }

  // String — truncate long values
  const str = String(value)
  if (str.length > truncateAt) {
    return <span title={str}>{str.slice(0, truncateAt - 3)}...</span>
  }
  return <span>{str}</span>
}
