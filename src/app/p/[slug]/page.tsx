import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StatsGrid } from "@/components/freckle/stats-grid";
import { ActivityFeed } from "@/components/freckle/activity-feed";
import { HealthBadge } from "@/components/freckle/health-badge";
import { TrendsChart } from "@/components/freckle/trends-chart";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { getProduct } from "@/lib/db/products";
import { getProductResources } from "@/lib/db/api-resources";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { CachedAdminApiClient } from "@/lib/api-client/cached-client";
import { classifyError } from "@/lib/api-client/errors";
import type { StatsResponse } from "@/types/admin-api";

interface Props {
  params: Promise<{ slug: string }>;
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

export default async function ProductDashboardPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  // Check if product has an activity resource in OpenAPI tree
  const resourceTree = getProductResources(slug);
  const hasActivity = resourceTree.some(
    (r) => /analytic|activity/i.test(r.pathSegment)
  );

  return (
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
        <TrendsChart productSlug={product.id} />
        {hasActivity && (
          <ActivityFeed
            productSlug={product.id}
            compact
            limit={8}
            showLoadMore={false}
          />
        )}
      </div>
    </div>
  );
}
