import type { Metadata } from "next"
import type { ReactNode } from "react"
import { getClientManager } from "@/lib/api-client/product-client-manager"
import { getProduct } from "@/lib/db/products"
import { classifyError } from "@/lib/api-client/errors"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { EntityDetail } from "@/components/freckle/entity-detail"
import { OperationPanel } from "@/components/freckle/operation-panel"
import { ErrorBanner } from "@/components/freckle/error-banner"
import { ProductShell } from "@/components/layout/product-shell"
import { Card, CardContent } from "@/components/ui/card"
import { getResourceOperations, getProductResources } from "@/lib/db/api-resources"
import type { ApiResource } from "@/types/openapi"
import { SubResourceTab } from "@/components/freckle/sub-resource-tab"
import { toTitleCase, formatDate } from "@/lib/format"
import { HIDDEN_FIELDS } from "@/lib/entity-fields"
import { findResource } from "@/lib/openapi/find-resource"
import { renderValue } from "@/components/freckle/value-renderer"

interface EntityDetailPageProps {
  params: Promise<{ slug: string; capability: string; id: string }>
}

export async function generateMetadata({ params }: EntityDetailPageProps): Promise<Metadata> {
  const { slug, capability, id } = await params
  const product = getProduct(slug)
  try {
    const client = getClientManager().getClient(slug)
    const entity = await client.entity(capability).get(id)
    const title = String(
      entity.title || entity.name || entity.email || `${toTitleCase(capability)} ${id.slice(0, 8)}`
    )
    return { title }
  } catch {
    return { title: `${toTitleCase(capability)} - ${product?.name ?? "Product"}` }
  }
}

interface TabDef {
  id: string
  label: string
  content: ReactNode
  badge?: string | number
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-border/50 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-end max-w-[60%] break-words">{children}</span>
    </div>
  )
}

function InfoTab({ entity, labels }: { entity: Record<string, unknown>; labels: { yes: string; no: string; items: string; fields: string } }) {
  const entries = Object.entries(entity).filter(([key]) => !HIDDEN_FIELDS.has(key))

  return (
    <Card>
      <CardContent className="pt-6">
        <InfoRow label="ID">
          <code className="text-xs">{String(entity.id)}</code>
        </InfoRow>
        {entries.map(([key, value]) => (
          <InfoRow key={key} label={toTitleCase(key)}>
            {renderValue(key, value, labels)}
          </InfoRow>
        ))}
      </CardContent>
    </Card>
  )
}

function MetadataTab({ data, labels }: { data: Record<string, unknown>; labels: { yes: string; no: string; items: string; fields: string; noMetadata: string } }) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {labels.noMetadata}
      </p>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {entries.map(([key, value]) => (
          <InfoRow key={key} label={toTitleCase(key)}>
            {renderValue(key, value, labels)}
          </InfoRow>
        ))}
      </CardContent>
    </Card>
  )
}

function StatsTab({ stats, labels }: { stats: Record<string, unknown>; labels: { yes: string; no: string; noStats: string } }) {
  const entries = Object.entries(stats)
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {labels.noStats}
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <Card key={key}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{toTitleCase(key)}</p>
            <p className="mt-1 text-2xl font-bold">
              {typeof value === "number"
                ? value.toLocaleString()
                : typeof value === "string" && /^\d+(\.\d+)?$/.test(value)
                  ? Number(value).toLocaleString()
                  : typeof value === "boolean"
                    ? (value ? labels.yes : labels.no)
                    : String(value ?? "—")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function GenericEntityDetailPage({ params }: EntityDetailPageProps) {
  const { slug, capability, id } = await params
  const t = await getTranslations("generic")
  const product = getProduct(slug)
  if (!product) notFound()

  // Shared labels for sub-components
  const labels = {
    yes: t("yes"),
    no: t("no"),
    items: t("items"),
    fields: t("fields"),
    noMetadata: t("noMetadata"),
    noStats: t("noStats"),
  }

  // Verify this capability/resource exists in the OpenAPI resource tree
  const allResources = getProductResources(slug)
  const allKeys = new Set<string>()
  function collectKeys(rs: ApiResource[]) {
    for (const r of rs) {
      allKeys.add(r.key)
      collectKeys(r.children)
    }
  }
  collectKeys(allResources)
  if (!allKeys.has(capability)) {
    notFound()
  }

  try {
    const client = getClientManager().getClient(slug)
    const entity = await client.entity(capability).get(id)

    // Determine title from entity data
    const title = String(
      entity.title || entity.name || entity.email || entity.message?.toString().slice(0, 50) || `${toTitleCase(capability)} ${id.slice(0, 8)}`
    )
    const subtitle = entity.type ? String(entity.type) : undefined

    // Build tabs
    const tabs: TabDef[] = [
      { id: "info", label: t("info"), content: <InfoTab entity={entity} labels={labels} /> },
    ]

    if (entity.stats && typeof entity.stats === "object") {
      tabs.push({
        id: "stats",
        label: t("stats"),
        content: <StatsTab stats={entity.stats as Record<string, unknown>} labels={labels} />,
      })
    }

    if (entity.metadata && typeof entity.metadata === "object") {
      tabs.push({
        id: "metadata",
        label: t("metadata"),
        content: <MetadataTab data={entity.metadata as Record<string, unknown>} labels={labels} />,
      })
    }

    // If there are replies (like feedback), show them
    if (Array.isArray(entity.replies) && entity.replies.length > 0) {
      const repliesCount = entity.replies.length
      tabs.push({
        id: "replies",
        label: t("replies"),
        badge: repliesCount,
        content: (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {(entity.replies as Array<Record<string, unknown>>).map((reply, i) => (
                <div key={i} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <p className="text-sm">{String(reply.message)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {reply.respondedBy ? `${reply.respondedBy} · ` : ""}
                    {reply.createdAt ? formatDate(String(reply.createdAt)) : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ),
      })
    }

    // Fetch resource tree for tabs and actions
    const currentResource = findResource(allResources, capability)

    // Add sub-resource tabs from OpenAPI spec
    if (currentResource) {
      for (const child of currentResource.children) {
        // Only add tabs for sub-resources that have GET operations
        const getOp = child.operations.find(op => op.httpMethod === "GET" && (op.operationType === "sub-list" || op.operationType === "sub-detail"))
        if (!getOp) continue

        // Resolve path parameters
        let fetchPath = getOp.pathTemplate
        for (const param of getOp.pathParameters) {
          fetchPath = fetchPath.replace(`{${param}}`, encodeURIComponent(id))
        }

        tabs.push({
          id: child.key,
          label: child.name,
          content: (
            <SubResourceTab
              productSlug={slug}
              fetchPath={fetchPath}
            />
          ),
        })
      }
    }

    // Build actions panel from OpenAPI operations
    let actionsElement: React.ReactNode = null

    const resourceOps = getResourceOperations(slug, capability)
    const childOps = currentResource?.children.flatMap(child =>
      child.operations.filter(op => op.httpMethod !== "GET")
    ) ?? []

    const allOps = [...resourceOps, ...childOps]

    // Build path params — map all path parameter names to the entity ID
    const pathParams: Record<string, string> = {}
    for (const op of allOps) {
      for (const param of op.pathParameters) {
        pathParams[param] = id
      }
    }

    if (allOps.length > 0) {
      actionsElement = (
        <OperationPanel
          productSlug={slug}
          operations={allOps}
          pathParams={pathParams}
          currentData={entity as Record<string, unknown>}
        />
      )
    }

    return (
      <ProductShell
        productId={product.id}
        breadcrumbs={[
          { label: "Freckle", href: "/" },
          { label: product.name, href: `/p/${slug}` },
          { label: toTitleCase(capability), href: `/p/${slug}/${capability}` },
          { label: title },
        ]}
      >
        <EntityDetail
          title={title}
          subtitle={subtitle}
          backLink={{
            href: `/p/${slug}/${capability}`,
            label: t("backTo", { entity: toTitleCase(capability) }),
          }}
          tabs={tabs}
          actions={actionsElement}
        />
      </ProductShell>
    )
  } catch (error) {
    const classified = classifyError(error)
    if (classified.category === "not_found") {
      notFound()
    }
    return (
      <ProductShell
        productId={product.id}
        breadcrumbs={[
          { label: "Freckle", href: "/" },
          { label: product.name, href: `/p/${slug}` },
          { label: toTitleCase(capability), href: `/p/${slug}/${capability}` },
        ]}
      >
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">{toTitleCase(capability)} Detail</h1>
          <ErrorBanner
            error={{ code: classified.category, message: classified.userMessage }}
          />
        </div>
      </ProductShell>
    )
  }
}
