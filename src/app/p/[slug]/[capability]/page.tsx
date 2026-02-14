import { Suspense } from "react"
import { getClientManager } from "@/lib/api-client/product-client-manager"
import { getProduct } from "@/lib/db/products"
import { getProductResources, getResourceOperations } from "@/lib/db/api-resources"
import { classifyError } from "@/lib/api-client/errors"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { EntityTable } from "./entity-table"
import { ErrorBanner } from "@/components/freckle/error-banner"
import { OperationPanel } from "@/components/freckle/operation-panel"
import { ProductShell } from "@/components/layout/product-shell"
import { Skeleton } from "@/components/ui/skeleton"
import type { PaginationMeta } from "@/types/admin-api"
import type { ApiResource, ApiOperation } from "@/types/openapi"
import { toTitleCase } from "@/lib/format"
import { findResource } from "@/lib/openapi/find-resource"
import { SingletonView } from "@/components/freckle/singleton-view"
import { ChildResourceLinks } from "@/components/freckle/child-resource-links"
import { collectResourceKeys } from "@/lib/object-utils"

import type { Metadata } from "next"

interface EntityPageProps {
  params: Promise<{ slug: string; capability: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: EntityPageProps): Promise<Metadata> {
  const { slug, capability } = await params
  const product = getProduct(slug)
  return { title: `${toTitleCase(capability)} - ${product?.name ?? "Product"}` }
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
  const t = await getTranslations("generic")

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
    return <ChildResourceLinks slug={slug} resources={childResources} endpointsLabel={(count) => t("endpoints", { count })} />
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
        {t("noData")}
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
  const t = await getTranslations("generic")

  const product = getProduct(slug)
  if (!product) notFound()

  // Verify this capability/resource exists in the OpenAPI resource tree
  const resources = getProductResources(slug)
  const allKeys = collectResourceKeys(resources)

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
    <ProductShell
      productId={product.id}
      breadcrumbs={[
        { label: "Freckle", href: "/" },
        { label: product.name, href: `/p/${slug}` },
        { label: title },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {t("manage", { entity: `${capability} for ${product.name}` })}
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
    </ProductShell>
  )
}
