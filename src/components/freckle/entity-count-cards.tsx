import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { getClientManager } from "@/lib/api-client/product-client-manager"
import { classifyError } from "@/lib/api-client/errors"
import { getResourceIcon } from "@/lib/resource-icons"
import type { DiscoveredEndpoint } from "@/lib/openapi/dashboard-endpoints"

interface EntityCountCardsProps {
  productSlug: string
  endpoints: DiscoveredEndpoint[]
}

interface EntityCount {
  endpoint: DiscoveredEndpoint
  total: number | null
  error: string | null
}

export async function EntityCountCards({ productSlug, endpoints }: EntityCountCardsProps) {
  if (endpoints.length === 0) return null

  const counts = await Promise.allSettled(
    endpoints.map(async (ep): Promise<EntityCount> => {
      try {
        const client = getClientManager().getClient(productSlug)
        const res = await client.fetchJson<{ meta?: { total?: number } }>(
          `${ep.path}?pageSize=1`
        )
        const total = typeof res === "object" && res !== null && "meta" in res
          ? (res as Record<string, unknown>).meta
          : undefined
        const totalNum = total && typeof total === "object" && total !== null && "total" in total
          ? (total as Record<string, unknown>).total
          : undefined
        return { endpoint: ep, total: typeof totalNum === "number" ? totalNum : null, error: null }
      } catch (err) {
        const classified = classifyError(err)
        return { endpoint: ep, total: null, error: classified.userMessage }
      }
    })
  )

  const results = counts
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((r): r is EntityCount => r !== null && (r.total !== null || r.error !== null))

  if (results.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {results.map(({ endpoint, total }) => {
        const Icon = getResourceIcon(endpoint.resourceKey)
        return (
          <Link key={endpoint.resourceKey} href={`/p/${productSlug}/${endpoint.resourceKey}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{endpoint.resourceName}</p>
                  {total !== null && (
                    <p className="text-xs text-muted-foreground">
                      {total.toLocaleString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
