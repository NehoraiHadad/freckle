import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatsGrid } from "@/components/freckle/stats-grid";
import { ActivityFeed } from "@/components/freckle/activity-feed";
import { HealthBadge } from "@/components/freckle/health-badge";
import { TrendsChartWrapper } from "@/components/freckle/trends-chart-wrapper";
import { DashboardWidget } from "@/components/freckle/dashboard-widget";
import { EntityCountCards } from "@/components/freckle/entity-count-cards";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ProductShell } from "@/components/layout/product-shell";
import { getProduct } from "@/lib/db/products";
import { getProductResources } from "@/lib/db/api-resources";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { CachedAdminApiClient } from "@/lib/api-client/cached-client";
import { classifyError } from "@/lib/api-client/errors";
import { discoverAllEndpoints, discoverDashboardEndpoints } from "@/lib/openapi/dashboard-endpoints";
import { getResourceIcon } from "@/lib/resource-icons";
import type { StatsResponse } from "@/types/admin-api";
import type { ApiResource } from "@/types/openapi";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  return { title: product?.name ?? "Product" };
}

// ──────────────────────────────────
// Stats Section (server component with Suspense)
// ──────────────────────────────────

async function StatsSection({ productId, statsPath }: { productId: string; statsPath: string }) {
  const rawClient = getClientManager().getClient(productId);
  const client = new CachedAdminApiClient(rawClient, productId);

  let stats: StatsResponse | null = null;
  let errorInfo: { code: string; message: string } | null = null;

  try {
    stats = (await client.fetchCached("stats", statsPath)) as StatsResponse;
  } catch (error) {
    const classified = classifyError(error);
    errorInfo = { code: classified.category, message: classified.userMessage };
  }

  if (errorInfo) {
    return <ErrorBanner error={errorInfo} />;
  }

  return <StatsGrid stats={stats!} />;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[104px] w-full rounded-lg" />
      ))}
    </div>
  );
}

// ──────────────────────────────────
// Resource Quick Links (kept at bottom)
// ──────────────────────────────────

function ResourceQuickLinks({
  slug,
  resources,
  tNav,
  tGeneric,
}: {
  slug: string;
  resources: ApiResource[];
  tNav: Awaited<ReturnType<typeof getTranslations>>;
  tGeneric: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const topLevel = resources.filter(
    (r) => !r.requiresParentId && r.key !== "health"
  );

  if (topLevel.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        {tGeneric("resources")}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {topLevel.map((resource) => {
          const Icon = getResourceIcon(resource.pathSegment);
          const label = tNav.has(resource.pathSegment)
            ? tNav(resource.pathSegment)
            : resource.name;
          return (
            <Link key={resource.key} href={`/p/${slug}/${resource.key}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {tGeneric("endpoints", { count: resource.operations.length })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────
// Main Page
// ──────────────────────────────────

export default async function ProductDashboardPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  const tNav = await getTranslations("nav");
  const tGeneric = await getTranslations("generic");

  const resourceTree = getProductResources(slug);

  // Use new discovery for endpoint classification
  const allEndpoints = discoverAllEndpoints(resourceTree);

  // Split into dashboard-type (priority < 10) and entity-type (priority >= 10)
  const dashboardEndpoints = allEndpoints.filter((ep) => !ep.isEntityCollection).slice(0, 8);
  const entityEndpoints = allEndpoints.filter((ep) => ep.isEntityCollection);

  // Also use legacy discovery for backward-compatible rendering
  const legacyEndpoints = discoverDashboardEndpoints(resourceTree);

  return (
    <ProductShell
      productId={product.id}
      breadcrumbs={[
        { label: "Freckle", href: "/" },
        { label: product.name },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {product.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-3">
            <HealthBadge status={product.healthStatus} size="sm" />
            {product.productVersion && <span>v{product.productVersion}</span>}
            {product.apiStandardVersion && (
              <span className="hidden sm:inline">API Standard v{product.apiStandardVersion}</span>
            )}
          </div>
        </div>

        {/* Stats section — use legacy statsPath for direct stats, or first summary endpoint */}
        {legacyEndpoints.statsPath && (
          <Suspense fallback={<StatsSkeleton />}>
            <StatsSection productId={product.id} statsPath={legacyEndpoints.statsPath} />
          </Suspense>
        )}

        {/* Dashboard widgets: trends, activity, and other discovered endpoints */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {legacyEndpoints.trendsPath && (
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}>
              <TrendsChartWrapper productSlug={product.id} trendsPath={legacyEndpoints.trendsPath} />
            </Suspense>
          )}
          {legacyEndpoints.activityPath && (
            <ActivityFeed
              productSlug={product.id}
              endpointPath={legacyEndpoints.activityPath}
              compact
              limit={8}
              showLoadMore={false}
            />
          )}
          {/* Extra dashboard-type endpoints that weren't caught by legacy patterns */}
          {dashboardEndpoints
            .filter((ep) =>
              ep.path !== legacyEndpoints.statsPath &&
              ep.path !== legacyEndpoints.trendsPath &&
              ep.path !== legacyEndpoints.activityPath
            )
            .map((ep) => (
              <Suspense key={ep.resourceKey} fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
                <DashboardWidget productSlug={product.id} endpoint={ep} />
              </Suspense>
            ))}
        </div>

        {/* Entity count cards */}
        {entityEndpoints.length > 0 && (
          <Suspense fallback={<Skeleton className="h-[80px] w-full rounded-lg" />}>
            <EntityCountCards productSlug={product.id} endpoints={entityEndpoints} />
          </Suspense>
        )}

        <ResourceQuickLinks
          slug={slug}
          resources={resourceTree}
          tNav={tNav}
          tGeneric={tGeneric}
        />
      </div>
    </ProductShell>
  );
}
