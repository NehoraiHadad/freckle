import { TrendsChart } from "@/components/freckle/trends-chart";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { CachedAdminApiClient } from "@/lib/api-client/cached-client";
import { classifyError } from "@/lib/api-client/errors";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { extractItems } from "@/lib/openapi/data-normalizer";
import { detectFields } from "@/lib/openapi/field-detector";
import type { DetectedFields } from "@/lib/openapi/field-detector";
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
  let initialItems: Record<string, unknown>[] | null = null;
  let initialFields: DetectedFields | null = null;
  let errorInfo: { code: string; message: string } | null = null;

  try {
    const rawClient = getClientManager().getClient(productSlug);
    const client = new CachedAdminApiClient(rawClient, productSlug);
    const cacheKey = `trends_${initialPeriod}` as StatType;
    const rawData = await client.fetchCached(cacheKey, `${trendsPath}?period=${initialPeriod}`);

    // Shape-agnostic: extract items and detect fields
    const items = extractItems(rawData);
    if (items && items.length > 0) {
      initialItems = items;
      initialFields = detectFields(items);
    }
  } catch (error) {
    const classified = classifyError(error);
    errorInfo = { code: classified.category, message: classified.userMessage };
  }

  if (errorInfo) {
    return <ErrorBanner error={errorInfo} />;
  }

  // If no time-series data, return null (caller decides what to show)
  if (!initialItems || initialItems.length === 0 || !initialFields?.dateField || initialFields.metricFields.length === 0) {
    return null;
  }

  return (
    <TrendsChart
      productSlug={productSlug}
      initialPeriod={initialPeriod}
      initialItems={initialItems}
      initialFields={initialFields}
      endpointPath={trendsPath}
      className={className}
    />
  );
}
