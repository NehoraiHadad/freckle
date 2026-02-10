"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { DataTable, type ColumnDef } from "@/components/freckle/data-table"
import { Badge } from "@/components/ui/badge"
import type { PaginationMeta } from "@/types/admin-api"
import { LayoutList } from "lucide-react"

interface EntityTableProps {
  slug: string
  capability: string
  data: Array<Record<string, unknown> & { id: string }>
  meta: PaginationMeta
  searchParams: Record<string, string | undefined>
}

/** Fields hidden from the main table columns */
const HIDDEN_FIELDS = new Set(["id", "metadata", "stats", "replies", "pages", "characterTemplates", "adHocCharacters", "characterIds"])

/** Fields that get Badge rendering */
const BADGE_FIELDS = new Set(["status", "type", "role", "tier"])

/** Fields that get date rendering */
const DATE_FIELDS = new Set(["createdAt", "updatedAt", "resolvedAt", "lastActiveAt", "expiresAt"])

function formatDate(dateStr: string): string {
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

/** Convert camelCase to Title Case */
function toHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function buildColumns(data: Array<Record<string, unknown>>): ColumnDef<Record<string, unknown> & { id: string }>[] {
  if (data.length === 0) return []

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
      header: toHeader(key),
      sortable: true,
      render: (item) => {
        const value = item[key]

        if (value === null || value === undefined) {
          return <span className="text-muted-foreground">—</span>
        }

        if (BADGE_FIELDS.has(key)) {
          return <Badge variant="outline">{String(value)}</Badge>
        }

        if (DATE_FIELDS.has(key) && typeof value === "string") {
          return <span className="text-muted-foreground">{formatDate(value)}</span>
        }

        if (typeof value === "object") {
          // For nested objects like author: { name: "..." }
          const obj = value as Record<string, unknown>
          if ("name" in obj && obj.name) return <span>{String(obj.name)}</span>
          if ("email" in obj && obj.email) return <span>{String(obj.email)}</span>
          return <span className="text-xs text-muted-foreground">{JSON.stringify(value)}</span>
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
      onRowClick={(item) => router.push(`/p/${slug}/${capability}/${item.id}`)}
      emptyState={{
        icon: emptyIcon,
        title: `No ${capability} found`,
        description: "Try adjusting your search or filters.",
      }}
    />
  )
}
