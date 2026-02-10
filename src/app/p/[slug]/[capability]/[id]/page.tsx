import type { ReactNode } from "react"
import { getClientManager } from "@/lib/api-client/product-client-manager"
import { getProduct } from "@/lib/db/products"
import { classifyError } from "@/lib/api-client/errors"
import { notFound } from "next/navigation"
import { EntityDetail } from "@/components/freckle/entity-detail"
import { ActionPanel } from "@/components/freckle/action-panel"
import { ErrorBanner } from "@/components/freckle/error-banner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface EntityDetailPageProps {
  params: Promise<{ slug: string; capability: string; id: string }>
}

interface TabDef {
  id: string
  label: string
  content: ReactNode
  badge?: string | number
}

/** Convert camelCase/slug to Title Case */
function toTitleCase(s: string): string {
  return s
    .replace(/[-_]/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const HIDDEN_FIELDS = new Set(["id", "metadata", "stats", "replies", "pages", "characterTemplates", "adHocCharacters", "characterIds"])
const BADGE_FIELDS = new Set(["status", "type", "role", "tier"])
const DATE_FIELDS = new Set(["createdAt", "updatedAt", "resolvedAt", "lastActiveAt", "expiresAt"])

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

  if (DATE_FIELDS.has(key) && typeof value === "string") {
    return formatDate(value)
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    if ("name" in obj && obj.name) return String(obj.name)
    if ("email" in obj && obj.email) return String(obj.email)
    return <code className="text-xs">{JSON.stringify(value)}</code>
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
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
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
              {typeof value === "number" ? value.toLocaleString() : String(value ?? "—")}
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

  if (!product.capabilities.includes(capability)) {
    notFound()
  }

  try {
    const client = getClientManager().getClient(slug)
    const entity = await client.entity(capability).get(id)

    const entityActions = product.supportedActions?.[capability] ?? []

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

    return (
      <EntityDetail
        title={title}
        subtitle={subtitle}
        backLink={{
          href: `/p/${slug}/${capability}`,
          label: `Back to ${toTitleCase(capability)}`,
        }}
        tabs={tabs}
        actions={
          entityActions.length > 0 ? (
            <ActionPanel
              productSlug={slug}
              entityType={capability as "users" | "content" | "operations"}
              entityId={id}
              supportedActions={entityActions}
            />
          ) : undefined
        }
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
