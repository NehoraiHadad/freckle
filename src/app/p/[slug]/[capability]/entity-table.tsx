"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { DataTable, type ColumnDef } from "@/components/freckle/data-table"
import { Badge } from "@/components/ui/badge"
import type { PaginationMeta } from "@/types/admin-api"
import { LayoutList } from "lucide-react"
import { toTitleCase, formatDateShort } from "@/lib/format"
import { HIDDEN_FIELDS, BADGE_FIELDS, isDateField } from "@/lib/entity-fields"

interface EntityTableProps {
  slug: string
  capability: string
  data: Array<Record<string, unknown> & { id: string }>
  meta: PaginationMeta
  searchParams: Record<string, string | undefined>
  hasDetail?: boolean
}

function buildColumns(data: Array<Record<string, unknown>>): ColumnDef<Record<string, unknown> & { id: string }>[] {
  if (!Array.isArray(data) || data.length === 0) return []

  // Collect all keys from the first few items
  const allKeys = new Set<string>()
  for (const item of data.slice(0, 5)) {
    for (const key of Object.keys(item)) {
      allKeys.add(key)
    }
  }

  const columns: ColumnDef<Record<string, unknown> & { id: string }>[] = []

  for (const key of allKeys) {
    if (HIDDEN_FIELDS.has(key)) continue

    const col: ColumnDef<Record<string, unknown> & { id: string }> = {
      key,
      header: toTitleCase(key),
      sortable: true,
      render: (item) => {
        const value = item[key]

        if (value === null || value === undefined) {
          return <span className="text-muted-foreground">—</span>
        }

        if (BADGE_FIELDS.has(key)) {
          return <Badge variant="outline">{String(value)}</Badge>
        }

        if (isDateField(key, value) && typeof value === "string") {
          return <span className="text-muted-foreground">{formatDateShort(value)}</span>
        }

        // Image URL detection
        if (typeof value === "string" && /^https?:\/\//.test(value) && /image|avatar|photo|thumbnail|picture/i.test(key)) {
          return <img src={value} alt="" className="size-8 rounded-full object-cover" />
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

        if (typeof value === "boolean") {
          return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
        }

        if (typeof value === "number") {
          return <span>{value.toLocaleString()}</span>
        }

        // String — truncate long values
        const str = String(value)
        if (str.length > 100) {
          return <span title={str}>{str.slice(0, 97)}...</span>
        }
        return <span>{str}</span>
      },
    }

    columns.push(col)
  }

  return columns
}

export function EntityTable({
  slug,
  capability,
  data,
  meta,
  searchParams,
  hasDetail = true,
}: EntityTableProps) {
  const router = useRouter()
  const columns = buildColumns(data)

  const emptyIcon: ReactNode = <LayoutList className="size-12" />

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      searchParams={searchParams}
      baseUrl={`/p/${slug}/${capability}`}
      searchPlaceholder={`Search ${capability}...`}
      onRowClick={hasDetail ? (item) => router.push(`/p/${slug}/${capability}/${item.id}`) : undefined}
      emptyState={{
        icon: emptyIcon,
        title: `No ${capability} found`,
        description: "Try adjusting your search or filters.",
      }}
    />
  )
}
