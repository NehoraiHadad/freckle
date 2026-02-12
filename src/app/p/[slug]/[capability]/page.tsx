import { Suspense } from "react"
import { getClientManager } from "@/lib/api-client/product-client-manager"
import { getProduct } from "@/lib/db/products"
import { getProductResources, getResourceOperations } from "@/lib/db/api-resources"
import { classifyError } from "@/lib/api-client/errors"
import { notFound } from "next/navigation"
import { EntityTable } from "./entity-table"
import { ErrorBanner } from "@/components/freckle/error-banner"
import { OperationPanel } from "@/components/freckle/operation-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { PaginationMeta } from "@/types/admin-api"
import type { ApiResource, ApiOperation } from "@/types/openapi"
import { toTitleCase, formatDate } from "@/lib/format"
import { BADGE_FIELDS, isDateField } from "@/lib/entity-fields"
import { findResource } from "@/lib/openapi/find-resource"

interface EntityPageProps {
  params: Promise<{ slug: string; capability: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// ─── Singleton detail view (for endpoints returning objects) ───

/** Check if a value is a "simple" primitive (not object/array) */
function isPrimitive(v: unknown): boolean {
  return v === null || v === undefined || typeof v === "string" || typeof v === "number" || typeof v === "boolean"
}

/** Check if an object is flat (all values are primitives) */
function isFlatObject(obj: Record<string, unknown>): boolean {
  return Object.values(obj).every(isPrimitive)
}

function renderPrimitive(key: string, value: unknown): React.ReactNode {
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
  const str = String(value)
  if (str.length > 200) {
    return <span title={str}>{str.slice(0, 197)}...</span>
  }
  return str
}

/** Render a flat key-value row */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-border/50 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-end max-w-[60%] break-words">{value}</span>
    </div>
  )
}

/** Render a flat object as key-value rows in a card */
function FlatObjectCard({ title, data }: { title?: string; data: Record<string, unknown> }) {
  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-6"}>
        {Object.entries(data).map(([key, value]) => (
          <InfoRow key={key} label={toTitleCase(key)} value={renderPrimitive(key, value)} />
        ))}
      </CardContent>
    </Card>
  )
}

/** Render an array of strings as a comma-separated list or badges */
function StringList({ items }: { items: string[] }) {
  if (items.length <= 5) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className="font-normal">{item}</Badge>
        ))}
      </div>
    )
  }
  return <span className="text-sm">{items.join(", ")}</span>
}

/** Render a nested object as a structured card with sub-sections */
function NestedObjectCard({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data)

  // If it's a flat object, just render as key-value
  if (isFlatObject(data)) {
    return <FlatObjectCard title={title} data={data} />
  }

  // Separate primitives from complex values
  const primitives = entries.filter(([, v]) => isPrimitive(v))
  const complex = entries.filter(([, v]) => !isPrimitive(v))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Render primitive fields as rows */}
        {primitives.length > 0 && (
          <div>
            {primitives.map(([key, value]) => (
              <InfoRow key={key} label={toTitleCase(key)} value={renderPrimitive(key, value)} />
            ))}
          </div>
        )}

        {/* Render complex sub-fields */}
        {complex.map(([key, value]) => {
          if (Array.isArray(value)) {
            // Array of primitives
            if (value.length === 0) {
              return <InfoRow key={key} label={toTitleCase(key)} value={<span className="text-muted-foreground">—</span>} />
            }
            if (value.every(isPrimitive)) {
              return (
                <div key={key} className="border-b border-border/50 py-3 last:border-0">
                  <p className="text-sm text-muted-foreground mb-2">{toTitleCase(key)}</p>
                  <StringList items={value.map(String)} />
                </div>
              )
            }
            // Array of objects
            return (
              <div key={key} className="border-b border-border/50 py-3 last:border-0">
                <p className="text-sm text-muted-foreground mb-2">{toTitleCase(key)}</p>
                <div className="space-y-2">
                  {value.map((item, i) => (
                    typeof item === "object" && item !== null
                      ? <div key={i} className="rounded-lg border bg-muted/30 p-3">
                          {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                            isPrimitive(v)
                              ? <InfoRow key={k} label={toTitleCase(k)} value={renderPrimitive(k, v)} />
                              : Array.isArray(v) && v.every(isPrimitive)
                                ? <div key={k} className="py-2"><p className="text-sm text-muted-foreground mb-1">{toTitleCase(k)}</p><StringList items={v.map(String)} /></div>
                                : <InfoRow key={k} label={toTitleCase(k)} value={<code className="text-xs">{JSON.stringify(v)}</code>} />
                          ))}
                        </div>
                      : <span key={i} className="text-sm">{String(item)}</span>
                  ))}
                </div>
              </div>
            )
          }

          if (typeof value === "object" && value !== null) {
            const obj = value as Record<string, unknown>
            // Check if this is a "dictionary" — object where keys are IDs/names and values are objects
            const vals = Object.values(obj)
            const isDictionary = vals.length > 0 && vals.every(v => typeof v === "object" && v !== null && !Array.isArray(v))

            if (isDictionary) {
              return (
                <div key={key} className="space-y-3 border-b border-border/50 py-3 last:border-0">
                  <p className="text-sm font-medium text-muted-foreground">{toTitleCase(key)}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(obj).map(([subKey, subValue]) => (
                      <div key={subKey} className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-sm font-semibold mb-2">{toTitleCase(subKey)}</p>
                        {Object.entries(subValue as Record<string, unknown>).map(([k, v]) => (
                          isPrimitive(v)
                            ? <InfoRow key={k} label={toTitleCase(k)} value={renderPrimitive(k, v)} />
                            : Array.isArray(v) && v.every(isPrimitive)
                              ? <div key={k} className="py-2"><p className="text-sm text-muted-foreground mb-1">{toTitleCase(k)}</p><StringList items={v.map(String)} /></div>
                              : <InfoRow key={k} label={toTitleCase(k)} value={<code className="text-xs">{JSON.stringify(v)}</code>} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            // Regular nested object — render as flat rows
            if (isFlatObject(obj)) {
              return (
                <div key={key} className="border-b border-border/50 py-3 last:border-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{toTitleCase(key)}</p>
                  {Object.entries(obj).map(([k, v]) => (
                    <InfoRow key={k} label={toTitleCase(k)} value={renderPrimitive(k, v)} />
                  ))}
                </div>
              )
            }

            // Mixed or deep nesting — recurse
            return (
              <div key={key} className="border-b border-border/50 py-3 last:border-0">
                <NestedObjectCard title={toTitleCase(key)} data={obj} />
              </div>
            )
          }

          return null
        })}
      </CardContent>
    </Card>
  )
}

function SingletonView({ data, actions }: { data: Record<string, unknown>; actions?: React.ReactNode }) {
  const entries = Object.entries(data)

  // Separate by type: numbers (stat cards), primitives (info card), complex (nested sections)
  const numericEntries = entries.filter(([, v]) => typeof v === "number")
  const primitiveEntries = entries.filter(([, v]) => isPrimitive(v) && typeof v !== "number")
  const complexEntries = entries.filter(([, v]) => !isPrimitive(v))

  return (
    <div className="space-y-6">
      {/* Numeric stats as cards */}
      {numericEntries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {numericEntries.map(([key, value]) => (
            <Card key={key}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{toTitleCase(key)}</p>
                <p className="mt-1 text-2xl font-bold">{(value as number).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Simple primitive fields */}
      {primitiveEntries.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            {primitiveEntries.map(([key, value]) => (
              <InfoRow key={key} label={toTitleCase(key)} value={renderPrimitive(key, value)} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Nested objects and arrays as separate sections */}
      {complexEntries.map(([key, value]) => {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return <NestedObjectCard key={key} title={toTitleCase(key)} data={value as Record<string, unknown>} />
        }
        if (Array.isArray(value)) {
          if (value.length === 0) return null
          if (value.every(isPrimitive)) {
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{toTitleCase(key)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <StringList items={value.map(String)} />
                </CardContent>
              </Card>
            )
          }
          // Array of objects
          return (
            <NestedObjectCard key={key} title={toTitleCase(key)} data={Object.fromEntries(value.map((item, i) => [String(i), item]))} />
          )
        }
        return null
      })}

      {actions}
    </div>
  )
}

function ChildResourceLinks({ slug, resources }: { slug: string; resources: ApiResource[] }) {
  const navigable = resources.filter(c => !c.requiresParentId)
  if (navigable.length === 0) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {navigable.map((child) => (
        <Link key={child.key} href={`/p/${slug}/${child.key}`}>
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {child.name}
                <ArrowRight className="size-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {child.operations.length} {child.operations.length === 1 ? "endpoint" : "endpoints"}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

// ─── Data fetching section ───

type ViewMode = "table" | "singleton" | "actions" | "children" | "empty"

async function EntityDataSection({
  slug,
  capability,
  searchParams,
  hasDetail,
  viewMode,
  operations,
  childResources,
}: {
  slug: string
  capability: string
  searchParams: Record<string, string | undefined>
  hasDetail: boolean
  viewMode: ViewMode
  operations: ApiOperation[]
  childResources: ApiResource[]
}) {
  // Actions-only view (e.g., /operations)
  if (viewMode === "actions") {
    return (
      <OperationPanel
        productSlug={slug}
        operations={operations}
        pathParams={{}}
      />
    )
  }

  // Parent resource with children but no data endpoint
  if (viewMode === "children") {
    return <ChildResourceLinks slug={slug} resources={childResources} />
  }

  // Empty — no GET, no children
  if (viewMode === "empty") {
    // Still might have non-GET operations to show
    if (operations.length > 0) {
      return (
        <OperationPanel
          productSlug={slug}
          operations={operations}
          pathParams={{}}
        />
      )
    }
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No data available for this resource.
      </p>
    )
  }

  // Fetch data for table or singleton views
  let errorInfo: { code: string; message: string } | null = null
  let rawData: unknown = null
  let apiMeta: PaginationMeta = { total: 0, page: 1, pageSize: 20, hasMore: false }

  try {
    const client = getClientManager().getClient(slug)
    const result = await client.entity(capability).list({
      page: searchParams.page ? Number(searchParams.page) : undefined,
      pageSize: searchParams.pageSize ? Number(searchParams.pageSize) : undefined,
      search: searchParams.search,
      sort: searchParams.sort,
      order: searchParams.order as "asc" | "desc" | undefined,
      status: searchParams.status,
    })
    rawData = result.data as unknown
    apiMeta = result.meta
  } catch (error) {
    const classified = classifyError(error)
    errorInfo = { code: classified.category, message: classified.userMessage }
  }

  if (errorInfo) {
    return <ErrorBanner error={errorInfo} />
  }

  // Build actions element for non-GET operations (including from non-navigable children)
  const nonGetOps = operations.filter(op => op.httpMethod !== "GET")

  // Also collect operations from child resources that don't have their own page
  // (no GET endpoint = not navigable, so their write operations belong here)
  const childWriteOps: ApiOperation[] = []
  for (const child of childResources) {
    const childHasGet = child.operations.some(op => op.httpMethod === "GET")
    if (!childHasGet) {
      childWriteOps.push(...child.operations)
    }
  }

  const allActionOps = [...nonGetOps, ...childWriteOps]

  // Pass current data so edit forms can be pre-populated
  const currentDataObj = rawData && typeof rawData === "object" && !Array.isArray(rawData)
    ? rawData as Record<string, unknown>
    : undefined

  const actionsElement = allActionOps.length > 0 ? (
    <OperationPanel
      productSlug={slug}
      operations={allActionOps}
      pathParams={{}}
      currentData={currentDataObj}
    />
  ) : null

  // Singleton view: response is an object
  if (currentDataObj) {
    return <SingletonView data={currentDataObj} actions={actionsElement} />
  }

  // Table view: response is an array
  const data = Array.isArray(rawData)
    ? rawData as Array<Record<string, unknown> & { id: string }>
    : []

  return (
    <>
      <EntityTable
        slug={slug}
        capability={capability}
        data={data}
        meta={apiMeta}
        searchParams={searchParams}
        hasDetail={hasDetail}
      />
      {actionsElement}
    </>
  )
}

function EntitySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  )
}

// ─── Main page ───

export default async function GenericEntityPage({ params, searchParams }: EntityPageProps) {
  const { slug, capability } = await params
  const rawSearchParams = await searchParams

  const product = getProduct(slug)
  if (!product) notFound()

  // Verify this capability/resource exists in the OpenAPI resource tree
  const resources = getProductResources(slug)
  const allKeys = new Set<string>()

  function collectKeys(rs: ApiResource[]) {
    for (const r of rs) {
      allKeys.add(r.key)
      collectKeys(r.children)
    }
  }
  collectKeys(resources)

  if (!allKeys.has(capability)) {
    notFound()
  }

  const sp: Record<string, string | undefined> = {}
  for (const [key, val] of Object.entries(rawSearchParams)) {
    sp[key] = Array.isArray(val) ? val[0] : val
  }

  const title = toTitleCase(capability)

  // Determine view mode based on operations
  let viewMode: ViewMode = "table"
  const operations = getResourceOperations(slug, capability)
  const hasGet = operations.some(op => op.httpMethod === "GET")
  const hasList = operations.some(op => op.operationType === "list" || op.operationType === "sub-list")
  const hasDetail = operations.some(op => op.operationType === "detail")
  const hasNonGet = operations.some(op => op.httpMethod !== "GET")

  // Find the resource to check for children
  const resource = findResource(resources, capability)
  const childResources = resource?.children ?? []

  if (!hasGet && !hasNonGet && childResources.length > 0) {
    viewMode = "children"
  } else if (!hasGet && hasNonGet) {
    viewMode = "actions"
  } else if (!hasGet && !hasNonGet) {
    viewMode = childResources.length > 0 ? "children" : "empty"
  } else if (hasList) {
    viewMode = "table"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Manage {capability} for {product.name}
        </p>
      </div>
      <Suspense fallback={<EntitySkeleton />}>
        <EntityDataSection
          slug={slug}
          capability={capability}
          searchParams={sp}
          hasDetail={hasDetail}
          viewMode={viewMode}
          operations={operations}
          childResources={childResources}
        />
      </Suspense>
    </div>
  )
}
