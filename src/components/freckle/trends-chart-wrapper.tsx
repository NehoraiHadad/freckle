import { TrendsChart } from "@/components/freckle/trends-chart";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { CachedAdminApiClient } from "@/lib/api-client/cached-client";
import { classifyError } from "@/lib/api-client/errors";
import { ErrorBanner } from "@/components/freckle/error-banner";
import type { TrendsResponse } from "@/types/admin-api";
import type { StatType } from "@/types/product";

interface TrendsChartWrapperProps {
  productSlug: string;
  trendsPath?: string;
  initialPeriod?: "24h" | "7d" | "30d" | "90d";
  className?: string;
}

export async function TrendsChartWrapper({
  productSlug,
  trendsPath = "/stats/trends",
  initialPeriod = "7d",
  className,
}: TrendsChartWrapperProps) {
  let initialData: TrendsResponse | null = null;
  let errorInfo: { code: string; message: string } | null = null;

  try {
    const rawClient = getClientManager().getClient(productSlug);
    const client = new CachedAdminApiClient(rawClient, productSlug);
    const cacheKey = `trends_${initialPeriod}` as StatType;
    initialData = (await client.fetchCached(cacheKey, `${trendsPath}?period=${initialPeriod}`)) as TrendsResponse;
  } catch (error) {
    const classified = classifyError(error);
    errorInfo = { code: classified.category, message: classified.userMessage };
  }

  if (errorInfo) {
    return <ErrorBanner error={errorInfo} />;
  }

  return (
    <TrendsChart
      productSlug={productSlug}
      initialPeriod={initialPeriod}
      initialData={initialData ?? undefined}
      endpointPath={trendsPath}
      className={className}
    />
  );
}
