import type { ReactNode } from "react"
import { getClientManager } from "@/lib/api-client/product-client-manager"
import { getProduct } from "@/lib/db/products"
import { classifyError } from "@/lib/api-client/errors"
import { notFound } from "next/navigation"
import { EntityDetail } from "@/components/freckle/entity-detail"
import { OperationPanel } from "@/components/freckle/operation-panel"
import { ErrorBanner } from "@/components/freckle/error-banner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getResourceOperations, getProductResources } from "@/lib/db/api-resources"
import type { ApiResource } from "@/types/openapi"
import { SubResourceTab } from "@/components/freckle/sub-resource-tab"
import { toTitleCase, formatDate } from "@/lib/format"
import { HIDDEN_FIELDS, BADGE_FIELDS, isDateField } from "@/lib/entity-fields"
import { findResource } from "@/lib/openapi/find-resource"

interface EntityDetailPageProps {
  params: Promise<{ slug: string; capability: string; id: string }>
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

function renderValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>
  }

  if (BADGE_FIELDS.has(key)) {
    return <Badge variant="outline">{String(value)}</Badge>
  }

  if (isDateField(key, value) && typeof value === "string") {
    return formatDate(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>
    if (value.every(v => typeof v === "string" || typeof v === "number")) {
      const shown = value.slice(0, 5)
      return (
        <div className="flex flex-wrap gap-1">
          {shown.map((v, i) => <Badge key={i} variant="secondary" className="text-xs font-normal">{String(v)}</Badge>)}
          {value.length > 5 && <span className="text-xs text-muted-foreground">+{value.length - 5}</span>}
        </div>
      )
    }
    return <span className="text-xs text-muted-foreground">{value.length} items</span>
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    if ("name" in obj && obj.name) return String(obj.name)
    if ("email" in obj && obj.email) return String(obj.email)
    const entries = Object.entries(obj).slice(0, 3)
    if (entries.length > 0 && entries.every(([, v]) => typeof v !== "object")) {
      return <span className="text-xs text-muted-foreground">{entries.map(([k, v]) => `${toTitleCase(k)}: ${v}`).join(", ")}</span>
    }
    return <span className="text-xs text-muted-foreground">{Object.keys(obj).length} fields</span>
  }

  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
  }

  if (typeof value === "number") {
    return value.toLocaleString()
  }

  return String(value)
}

function InfoTab({ entity }: { entity: Record<string, unknown> }) {
  const entries = Object.entries(entity).filter(([key]) => !HIDDEN_FIELDS.has(key))

  return (
    <Card>
      <CardContent className="pt-6">
        <InfoRow label="ID">
          <code className="text-xs">{String(entity.id)}</code>
        </InfoRow>
        {entries.map(([key, value]) => (
          <InfoRow key={key} label={toTitleCase(key)}>
            {renderValue(key, value)}
          </InfoRow>
        ))}
      </CardContent>
    </Card>
  )
}

function MetadataTab({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No metadata available.
      </p>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {entries.map(([key, value]) => (
          <InfoRow key={key} label={toTitleCase(key)}>
            {renderValue(key, value)}
          </InfoRow>
        ))}
      </CardContent>
    </Card>
  )
}

function StatsTab({ stats }: { stats: Record<string, unknown> }) {
  const entries = Object.entries(stats)
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No stats available.
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
                    ? (value ? "Yes" : "No")
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
  const product = getProduct(slug)
  if (!product) notFound()

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
      { id: "info", label: "Info", content: <InfoTab entity={entity} /> },
    ]

    if (entity.stats && typeof entity.stats === "object") {
      tabs.push({
        id: "stats",
        label: "Stats",
        content: <StatsTab stats={entity.stats as Record<string, unknown>} />,
      })
    }

    if (entity.metadata && typeof entity.metadata === "object") {
      tabs.push({
        id: "metadata",
        label: "Metadata",
        content: <MetadataTab data={entity.metadata as Record<string, unknown>} />,
      })
    }

    // If there are replies (like feedback), show them
    if (Array.isArray(entity.replies) && entity.replies.length > 0) {
      const repliesCount = entity.replies.length
      tabs.push({
        id: "replies",
        label: "Replies",
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
      <EntityDetail
        title={title}
        subtitle={subtitle}
        backLink={{
          href: `/p/${slug}/${capability}`,
          label: `Back to ${toTitleCase(capability)}`,
        }}
        tabs={tabs}
        actions={actionsElement}
      />
    )
  } catch (error) {
    const classified = classifyError(error)
    if (classified.category === "not_found") {
      notFound()
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">{toTitleCase(capability)} Detail</h1>
        <ErrorBanner
          error={{ code: classified.category, message: classified.userMessage }}
        />
      </div>
    )
  }
}
