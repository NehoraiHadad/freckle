"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toTitleCase, formatDate } from "@/lib/format"
import { HIDDEN_FIELDS, BADGE_FIELDS, isDateField } from "@/lib/entity-fields"

interface SubResourceTabProps {
  productSlug: string
  /** The proxy path to fetch, e.g., "/users/abc123/credits" */
  fetchPath: string
}

export function SubResourceTab({ productSlug, fetchPath }: SubResourceTabProps) {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/proxy/${productSlug}${fetchPath}`)
        const json = await res.json()
        if (!cancelled) {
          if (json.success === false) {
            setError(json.error?.message || "Failed to load data")
          } else {
            // Data might be in json.data (wrapped) or json itself
            setData(json.data ?? json)
          }
        }
      } catch {
        if (!cancelled) setError("Network error")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [productSlug, fetchPath])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-destructive">{error}</p>
    )
  }

  if (!data) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No data available.</p>
    )
  }

  // If data is an array → render as a list/table
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">No items found.</p>
    }
    return <SubResourceList items={data} />
  }

  // If data is an object → render as key-value pairs
  if (typeof data === "object") {
    return <SubResourceDetail data={data as Record<string, unknown>} />
  }

  return <p className="text-sm">{String(data)}</p>
}

function SubResourceList({ items }: { items: Array<Record<string, unknown>> }) {
  // Get column keys from first item, filter out hidden fields
  const firstItem = items[0]
  if (!firstItem || typeof firstItem !== "object") return null

  const columns = Object.keys(firstItem).filter(k => !HIDDEN_FIELDS.has(k)).slice(0, 6)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map(col => (
                  <th key={col} className="pb-2 pe-4 text-start font-medium text-muted-foreground">
                    {toTitleCase(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id ? String(item.id) : i} className="border-b border-border/50 last:border-0">
                  {columns.map(col => (
                    <td key={col} className="py-2 pe-4">
                      {renderCellValue(col, item[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function SubResourceDetail({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([key]) => !HIDDEN_FIELDS.has(key))
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data available.</p>
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start justify-between border-b border-border/50 py-3 last:border-0">
            <span className="text-sm text-muted-foreground">{toTitleCase(key)}</span>
            <span className="text-sm font-medium text-end max-w-[60%] break-words">
              {renderCellValue(key, value)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function renderCellValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>
  }

  if (BADGE_FIELDS.has(key)) {
    return <Badge variant="outline">{String(value)}</Badge>
  }

  if (isDateField(key, value) && typeof value === "string") {
    return formatDate(value)
  }

  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
  }

  if (typeof value === "number") {
    return value.toLocaleString()
  }

  // Array handling
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>
    if (value.every(v => typeof v === "string" && /^https?:\/\//.test(v))) {
      return <span className="text-xs text-muted-foreground">{value.length} {value.length === 1 ? "link" : "links"}</span>
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
    return <span className="text-xs text-muted-foreground">{value.length} items</span>
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
    return <span className="text-xs text-muted-foreground">{Object.keys(obj).length} fields</span>
  }

  return String(value)
}
