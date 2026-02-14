"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toTitleCase } from "@/lib/format"
import { renderValue } from "@/components/freckle/value-renderer"
import { HIDDEN_FIELDS } from "@/lib/entity-fields"
import { useTranslations } from "next-intl"

interface CompactListProps {
  title: string
  items: Record<string, unknown>[]
  className?: string
}

export function CompactList({ title, items, className }: CompactListProps) {
  const tGeneric = useTranslations("generic")
  const labels = {
    yes: tGeneric("yes"),
    no: tGeneric("no"),
    items: tGeneric("items"),
    links: tGeneric("links"),
    fields: tGeneric("fields"),
  }

  if (items.length === 0) return null

  // Get columns from first item, filter hidden, cap at 4
  const firstItem = items[0]
  const columns = Object.keys(firstItem)
    .filter((k) => !HIDDEN_FIELDS.has(k))
    .slice(0, 4)

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="pb-2 pe-4 text-start font-medium text-muted-foreground"
                  >
                    {toTitleCase(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={item.id ? String(item.id) : i}
                  className="border-b border-border/50 last:border-0"
                >
                  {columns.map((col) => (
                    <td key={col} className="py-2 pe-4">
                      {renderValue(col, item[col], labels, { dateFormat: "short" })}
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
