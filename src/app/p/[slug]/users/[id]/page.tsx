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
import type { AdminUserDetail } from "@/types/admin-api";

interface UserDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
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

function InfoTab({ user, labels }: { user: AdminUserDetail; labels: Record<string, string> }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <InfoRow label={labels.userId}>
          <code className="text-xs">{user.id}</code>
        </InfoRow>
        <InfoRow label={labels.email}>{user.email}</InfoRow>
        <InfoRow label={labels.name}>{user.name || "-"}</InfoRow>
        <InfoRow label={labels.role}>
          <Badge variant="outline">{user.role}</Badge>
        </InfoRow>
        <InfoRow label={labels.status}>
          <Badge
            variant={
              user.status === "active"
                ? "default"
                : user.status === "suspended"
                  ? "destructive"
                  : "secondary"
            }
          >
            {user.status}
          </Badge>
        </InfoRow>
        <InfoRow label={labels.created}>{formatDate(user.createdAt)}</InfoRow>
        <InfoRow label={labels.lastActive}>{user.lastActiveAt ? formatDate(user.lastActiveAt) : labels.never}</InfoRow>
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

function ActivityTab({ activity, noActivityMessage }: { activity: AdminUserDetail["recentActivity"]; noActivityMessage: string }) {
  if (activity.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {noActivityMessage}
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {activity.map((event, i) => (
          <div
            key={event.id}
            className={`flex items-start justify-between py-2.5 ${i < activity.length - 1 ? "border-b border-border/50" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm">{event.description}</p>
              <p className="text-xs text-muted-foreground">{event.type}</p>
            </div>
            <span className="ms-4 shrink-0 text-xs text-muted-foreground">
              {timeAgo(event.timestamp)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { slug, id } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const t = await getTranslations("users");
  const tActivity = await getTranslations("activity");

  const infoLabels = {
    userId: t("userId"),
    email: t("email"),
    name: t("name"),
    role: t("role"),
    status: t("status"),
    created: t("created"),
    lastActive: t("lastActive"),
    never: t("never"),
  };

  try {
    const client = getClientManager().getClient(slug);
    const user = await client.users.get(id);

    const userActions = product.supportedActions?.users ?? [];

    return (
      <EntityDetail
        title={user.name || user.email}
        subtitle={user.name ? user.email : undefined}
        backLink={{ href: `/p/${slug}/users`, label: t("backToUsers") }}
        tabs={[
          { id: "info", label: t("info"), content: <InfoTab user={user} labels={infoLabels} /> },
          { id: "stats", label: t("stats"), content: <StatsTab stats={user.stats} noStatsMessage={t("noStats")} /> },
          {
            id: "activity",
            label: tActivity("title"),
            badge: user.recentActivity.length || undefined,
            content: <ActivityTab activity={user.recentActivity} noActivityMessage={t("noRecentActivity")} />,
          },
        ]}
        actions={
          userActions.length > 0 ? (
            <ActionPanel
              productSlug={slug}
              entityType="users"
              entityId={id}
              supportedActions={userActions}
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
        <h1 className="text-2xl font-semibold">{t("userDetail")}</h1>
        <ErrorBanner
          error={{ code: classified.category, message: classified.userMessage }}
        />
      </div>
    );
  }
}
