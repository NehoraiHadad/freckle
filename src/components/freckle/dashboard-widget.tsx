import { getClientManager } from "@/lib/api-client/product-client-manager";
import { CachedAdminApiClient } from "@/lib/api-client/cached-client";
import { classifyError } from "@/lib/api-client/errors";
import { classifyResponse } from "@/lib/openapi/data-classifier";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { StatsGrid } from "@/components/freckle/stats-grid";
import { TrendsChartWrapper } from "@/components/freckle/trends-chart-wrapper";
import { ActivityFeed } from "@/components/freckle/activity-feed";
import { CompactList } from "@/components/freckle/compact-list";
import type { DiscoveredEndpoint } from "@/lib/openapi/dashboard-endpoints";
import type { StatsResponse } from "@/types/admin-api";
import type { StatType } from "@/types/product";

interface DashboardWidgetProps {
  productSlug: string;
  endpoint: DiscoveredEndpoint;
  className?: string;
}

export async function DashboardWidget({
  productSlug,
  endpoint,
  className,
}: DashboardWidgetProps) {
  let rawData: unknown = null;
  let errorInfo: { code: string; message: string } | null = null;

  try {
    const rawClient = getClientManager().getClient(productSlug);
    const client = new CachedAdminApiClient(rawClient, productSlug);
    const cacheKey = `stats` as StatType;
    rawData = await client.fetchCached(cacheKey, endpoint.path);
  } catch (error) {
    const classified = classifyError(error);
    errorInfo = { code: classified.category, message: classified.userMessage };
  }

  if (errorInfo) {
    return <ErrorBanner error={errorInfo} />;
  }

  const classified = classifyResponse(rawData, endpoint.responseSchema, endpoint.operationSummary);

  switch (classified.shape) {
    case "summary":
      return <StatsGrid stats={classified.data as StatsResponse} />;

    case "time-series":
      return (
        <TrendsChartWrapper
          productSlug={productSlug}
          trendsPath={endpoint.path}
          className={className}
        />
      );

    case "event-log":
      return (
        <ActivityFeed
          productSlug={productSlug}
          endpointPath={endpoint.path}
          fieldMapping={classified.fields}
          compact
          limit={8}
          showLoadMore={false}
          className={className}
        />
      );

    case "list":
      if (classified.items && classified.items.length > 0) {
        return (
          <CompactList
            title={endpoint.resourceName}
            items={classified.items.slice(0, 5)}
            className={className}
          />
        );
      }
      return null;

    case "empty":
    case "scalar":
    default:
      return null;
  }
}
