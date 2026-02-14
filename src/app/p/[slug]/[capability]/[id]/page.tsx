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
import { collectResourceKeys } from "@/lib/object-utils"
import { SubResourceTab } from "@/components/freckle/sub-resource-tab"
import { toTitleCase } from "@/lib/format"
import { HIDDEN_FIELDS } from "@/lib/entity-fields"
import { findResource } from "@/lib/openapi/find-resource"
import { renderValue } from "@/components/freckle/value-renderer"
import { detectFields } from "@/lib/openapi/field-detector"

interface EntityDetailPageProps {
  params: Promise<{ slug: string; capability: string; id: string }>
}

/**
 * Detect a display title from entity data using schema-driven heuristics.
 * Priority: x-display-name fields, name/title/email patterns, first short string, fallback.
 */
function detectEntityTitle(entity: Record<string, unknown>, capability: string, id: string): string {
  // Check common title-like fields
  const titleCandidates = ["title", "name", "displayName", "display_name", "label", "email", "subject", "username"]
  for (const key of titleCandidates) {
    const val = entity[key]
    if (typeof val === "string" && val.length > 0 && val.length < 200) {
      return val
    }
  }

  // Try message field (truncated)
  if (typeof entity.message === "string" && entity.message.length > 0) {
    return entity.message.slice(0, 50) + (entity.message.length > 50 ? "..." : "")
  }

  // Fallback: first short string field
  for (const [key, val] of Object.entries(entity)) {
    if (HIDDEN_FIELDS.has(key)) continue
    if (typeof val === "string" && val.length > 0 && val.length < 100) {
      return val
    }
  }

  return `${toTitleCase(capability)} ${id.slice(0, 8)}`
}

/**
 * Detect the ID field from entity data.
 */
function detectIdField(entity: Record<string, unknown>): string {
  const fields = detectFields([entity])
  return fields.idField ?? "id"
}

export async function generateMetadata({ params }: EntityDetailPageProps): Promise<Metadata> {
  const { slug, capability, id } = await params
  const product = getProduct(slug)
  try {
    const client = getClientManager().getClient(slug)
    const entity = await client.entity(capability).get(id)
    const title = detectEntityTitle(entity, capability, id)
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

function InfoTab({ entity, idField, labels }: { entity: Record<string, unknown>; idField: string; labels: { yes: string; no: string; items: string; fields: string } }) {
  // Fields to show: exclude hidden, exclude those that will become their own tabs
  const entries = Object.entries(entity).filter(([key, value]) => {
    if (HIDDEN_FIELDS.has(key)) return false
    // Exclude object/array fields — they get their own tabs
    if (typeof value === "object" && value !== null) return false
    return true
  })

  return (
    <Card>
      <CardContent className="pt-6">
        {entity[idField] !== undefined && (
          <InfoRow label="ID">
            <code className="text-xs">{String(entity[idField])}</code>
          </InfoRow>
        )}
        {entries.map(([key, value]) => (
          <InfoRow key={key} label={toTitleCase(key)}>
            {renderValue(key, value, labels)}
          </InfoRow>
        ))}
      </CardContent>
    </Card>
  )
}

function ObjectTab({ data, labels }: { data: Record<string, unknown>; labels: { yes: string; no: string; items: string; fields: string; noData: string } }) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {labels.noData}
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

function ArrayTab({ items, labels }: { items: Array<Record<string, unknown>>; labels: { yes: string; no: string; items: string; fields: string; noData: string } }) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {labels.noData}
      </p>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {items.map((item, i) => {
          // Each array item rendered as a block of key-value pairs
          const entries = Object.entries(item).filter(([key]) => !HIDDEN_FIELDS.has(key))
          return (
            <div key={item.id ? String(item.id) : i} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
              {entries.map(([key, value]) => {
                if (typeof value === "object" && value !== null) {
                  return (
                    <div key={key} className="mb-1">
                      <span className="text-xs text-muted-foreground">{toTitleCase(key)}: </span>
                      <span className="text-sm">{renderValue(key, value, labels)}</span>
                    </div>
                  )
                }
                return (
                  <div key={key} className="mb-1">
                    <span className="text-xs text-muted-foreground">{toTitleCase(key)}: </span>
                    <span className="text-sm">{renderValue(key, value, labels)}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </CardContent>
    </Card>
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
    noData: t("noData"),
  }

  // Verify this capability/resource exists in the OpenAPI resource tree
  const allResources = getProductResources(slug)
  const allKeys = collectResourceKeys(allResources)
  if (!allKeys.has(capability)) {
    notFound()
  }

  try {
    const client = getClientManager().getClient(slug)
    const entity = await client.entity(capability).get(id)

    // Schema-driven title detection
    const title = detectEntityTitle(entity, capability, id)
    const idField = detectIdField(entity)
    const subtitle = entity.type ? String(entity.type) : undefined

    // Build tabs — Info tab always first
    const tabs: TabDef[] = [
      { id: "info", label: t("info"), content: <InfoTab entity={entity} idField={idField} labels={labels} /> },
    ]

    // Auto-generate tabs for all object-typed and array-typed fields
    const infoShownFields = new Set([...HIDDEN_FIELDS])
    for (const [key, value] of Object.entries(entity)) {
      if (HIDDEN_FIELDS.has(key)) continue
      if (typeof value !== "object" || value === null) continue

      if (Array.isArray(value)) {
        // Array field → list tab
        if (value.length > 0) {
          const arrayItems = value.filter(
            (v): v is Record<string, unknown> => typeof v === "object" && v !== null,
          )
          if (arrayItems.length > 0) {
            tabs.push({
              id: key,
              label: toTitleCase(key),
              badge: arrayItems.length,
              content: <ArrayTab items={arrayItems} labels={labels} />,
            })
            infoShownFields.add(key)
          }
        }
      } else {
        // Object field → key-value tab
        const objData = value as Record<string, unknown>
        if (Object.keys(objData).length > 0) {
          tabs.push({
            id: key,
            label: toTitleCase(key),
            content: <ObjectTab data={objData} labels={labels} />,
          })
          infoShownFields.add(key)
        }
      }
    }

    // Add sub-resource tabs from OpenAPI spec
    const currentResource = findResource(allResources, capability)
    if (currentResource) {
      for (const child of currentResource.children) {
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
