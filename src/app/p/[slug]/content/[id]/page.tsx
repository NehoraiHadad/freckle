import { getClientManager } from "@/lib/api-client/product-client-manager";
import { getProduct } from "@/lib/db/products";
import { classifyError } from "@/lib/api-client/errors";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EntityDetail } from "@/components/freckle/entity-detail";
import { ActionPanel } from "@/components/freckle/action-panel";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminContentItem } from "@/types/admin-api";

interface ContentDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-border/50 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-end">{children}</span>
    </div>
  );
}

function InfoTab({ content, labels }: { content: AdminContentItem; labels: Record<string, string> }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <InfoRow label={labels.contentId}>
          <code className="text-xs">{content.id}</code>
        </InfoRow>
        <InfoRow label={labels.titleColumn}>{content.title}</InfoRow>
        <InfoRow label={labels.type}>
          <Badge variant="outline">{content.type}</Badge>
        </InfoRow>
        <InfoRow label={labels.status}>
          <Badge variant={content.status === "published" ? "default" : "secondary"}>
            {content.status}
          </Badge>
        </InfoRow>
        <InfoRow label={labels.author}>{content.author.name || labels.unknown}</InfoRow>
        <InfoRow label={labels.created}>{formatDate(content.createdAt)}</InfoRow>
        <InfoRow label={labels.updated}>{formatDate(content.updatedAt)}</InfoRow>
      </CardContent>
    </Card>
  );
}

function StatsTab({ stats, noStatsMessage }: { stats: Record<string, unknown>; noStatsMessage: string }) {
  const entries = Object.entries(stats);
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {noStatsMessage}
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <Card key={key}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {typeof value === "number" ? value.toLocaleString() : String(value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MetadataTab({ metadata, noMetadataMessage }: { metadata: Record<string, unknown>; noMetadataMessage: string }) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {noMetadataMessage}
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

export default async function ContentDetailPage({ params }: ContentDetailPageProps) {
  const { slug, id } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const t = await getTranslations("content");

  const infoLabels = {
    contentId: t("contentId"),
    titleColumn: t("titleColumn"),
    type: t("type"),
    status: t("status"),
    author: t("author"),
    unknown: t("unknown"),
    created: t("created"),
    updated: t("updated"),
  };

  try {
    const client = getClientManager().getClient(slug);
    const content = await client.content.get(id);

    const contentActions = product.supportedActions?.content ?? [];

    return (
      <EntityDetail
        title={content.title}
        subtitle={t("byAuthor", { type: content.type, author: content.author.name || t("unknown") })}
        backLink={{ href: `/p/${slug}/content`, label: t("backToContent") }}
        tabs={[
          { id: "info", label: t("info"), content: <InfoTab content={content} labels={infoLabels} /> },
          { id: "stats", label: t("stats"), content: <StatsTab stats={content.stats} noStatsMessage={t("noStats")} /> },
          {
            id: "metadata",
            label: t("metadata"),
            content: <MetadataTab metadata={content.metadata} noMetadataMessage={t("noMetadata")} />,
          },
        ]}
        actions={
          contentActions.length > 0 ? (
            <ActionPanel
              productSlug={slug}
              entityType="content"
              entityId={id}
              supportedActions={contentActions}
            />
          ) : undefined
        }
      />
    );
  } catch (error) {
    const classified = classifyError(error);
    if (classified.category === "not_found") {
      notFound();
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">{t("contentDetail")}</h1>
        <ErrorBanner
          error={{ code: classified.category, message: classified.userMessage }}
        />
      </div>
    );
  }
}
