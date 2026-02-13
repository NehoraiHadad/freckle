"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ErrorBanner } from "@/components/freckle/error-banner"
import { renderValue } from "@/components/freckle/value-renderer"
import { toTitleCase } from "@/lib/format"
import { HIDDEN_FIELDS } from "@/lib/entity-fields"

interface SubResourceTabProps {
  productSlug: string
  /** The proxy path to fetch, e.g., "/users/abc123/credits" */
  fetchPath: string
}

export function SubResourceTab({ productSlug, fetchPath }: SubResourceTabProps) {
  const tGeneric = useTranslations("generic")
  const tCommon = useTranslations("common")
  const tErrors = useTranslations("errors")
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/proxy/${productSlug}${fetchPath}`)
      const json = await res.json()
      if (json.success === false) {
        setError(json.error?.message || tErrors("unknown"))
      } else {
        setData(json.data ?? json)
      }
    } catch {
      setError(tErrors("network"))
    } finally {
      setLoading(false)
    }
  }, [productSlug, fetchPath, tErrors])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">{tCommon("loading")}</span>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorBanner error={{ code: "FETCH_ERROR", message: error }} onRetry={fetchData} />
    )
  }

  if (!data) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{tGeneric("noData")}</p>
    )
  }

  // If data is an array -> render as a list/table
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">{tGeneric("noResults")}</p>
    }
    return <SubResourceList items={data} />
  }

  // If data is an object -> render as key-value pairs
  if (typeof data === "object") {
    return <SubResourceDetail data={data as Record<string, unknown>} />
  }

  return <p className="text-sm">{String(data)}</p>
}

function SubResourceList({ items }: { items: Array<Record<string, unknown>> }) {
  const tGeneric = useTranslations("generic")
  const labels = { yes: tGeneric("yes"), no: tGeneric("no"), items: tGeneric("items"), links: tGeneric("links"), fields: tGeneric("fields") }

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
                      {renderValue(col, item[col], labels)}
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
  const tGeneric = useTranslations("generic")
  const labels = { yes: tGeneric("yes"), no: tGeneric("no"), items: tGeneric("items"), links: tGeneric("links"), fields: tGeneric("fields") }
  const entries = Object.entries(data).filter(([key]) => !HIDDEN_FIELDS.has(key))
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{tGeneric("noData")}</p>
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start justify-between border-b border-border/50 py-3 last:border-0">
            <span className="text-sm text-muted-foreground">{toTitleCase(key)}</span>
            <span className="text-sm font-medium text-end max-w-[60%] break-words">
              {renderValue(key, value, labels)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
