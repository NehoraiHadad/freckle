"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { DataTable, type ColumnDef } from "@/components/freckle/data-table"
import { renderValue } from "@/components/freckle/value-renderer"
import type { PaginationMeta } from "@/types/admin-api"
import { LayoutList } from "lucide-react"
import { toTitleCase } from "@/lib/format"
import { HIDDEN_FIELDS } from "@/lib/entity-fields"

interface EntityTableProps {
  slug: string
  capability: string
  data: Array<Record<string, unknown> & { id: string }>
  meta: PaginationMeta
  searchParams: Record<string, string | undefined>
  hasDetail?: boolean
}

function buildColumns(data: Array<Record<string, unknown>>, tGeneric: (key: string) => string): ColumnDef<Record<string, unknown> & { id: string }>[] {
  if (!Array.isArray(data) || data.length === 0) return []

  // Collect all keys from the first few items
  const allKeys = new Set<string>()
  for (const item of data.slice(0, 5)) {
    for (const key of Object.keys(item)) {
      allKeys.add(key)
    }
  }

  const columns: ColumnDef<Record<string, unknown> & { id: string }>[] = []
  const labels = { yes: tGeneric("yes"), no: tGeneric("no"), items: tGeneric("items"), links: tGeneric("links"), fields: tGeneric("fields") }

  for (const key of allKeys) {
    if (HIDDEN_FIELDS.has(key)) continue

    const col: ColumnDef<Record<string, unknown> & { id: string }> = {
      key,
      header: toTitleCase(key),
      sortable: true,
      render: (item) => renderValue(key, item[key], labels, { dateFormat: "short" }),
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
  const tGeneric = useTranslations("generic")
  const tErrors = useTranslations("errors")
  const columns = buildColumns(data, tGeneric)

  const emptyIcon: ReactNode = <LayoutList className="size-12" />

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      searchParams={searchParams}
      baseUrl={`/p/${slug}/${capability}`}
      searchPlaceholder={tGeneric("searchPlaceholder", { entity: capability })}
      onRowClick={hasDetail ? (item) => router.push(`/p/${slug}/${capability}/${item.id}`) : undefined}
      emptyState={{
        icon: emptyIcon,
        title: tGeneric("noItems", { entity: capability }),
        description: tErrors("noResultsDescription"),
      }}
    />
  )
}
