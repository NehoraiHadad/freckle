import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatsGrid } from "@/components/freckle/stats-grid";
import { ActivityFeed } from "@/components/freckle/activity-feed";
import { HealthBadge } from "@/components/freckle/health-badge";
import { TrendsChartWrapper } from "@/components/freckle/trends-chart-wrapper";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ProductShell } from "@/components/layout/product-shell";
import { getProduct } from "@/lib/db/products";
import { getProductResources } from "@/lib/db/api-resources";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { CachedAdminApiClient } from "@/lib/api-client/cached-client";
import { classifyError } from "@/lib/api-client/errors";
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

async function StatsSection({ productId }: { productId: string }) {
  const rawClient = getClientManager().getClient(productId);
  const client = new CachedAdminApiClient(rawClient, productId);

  let stats: StatsResponse | null = null;
  let errorInfo: { code: string; message: string } | null = null;

  try {
    stats = (await client.stats()) as StatsResponse;
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

export default async function ProductDashboardPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  const tNav = await getTranslations("nav");
  const tGeneric = await getTranslations("generic");

  // Check if product has an activity resource in OpenAPI tree
  const resourceTree = getProductResources(slug);
  const hasActivity = resourceTree.some(
    (r) => /analytic|activity/i.test(r.pathSegment)
  );

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

        <Suspense fallback={<StatsSkeleton />}>
          <StatsSection productId={product.id} />
        </Suspense>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}>
            <TrendsChartWrapper productSlug={product.id} />
          </Suspense>
          {hasActivity && (
            <ActivityFeed
              productSlug={product.id}
              compact
              limit={8}
              showLoadMore={false}
            />
          )}
        </div>

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
