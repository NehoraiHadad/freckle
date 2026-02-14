"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTranslations } from "next-intl";
import { toTitleCase } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { extractItems } from "@/lib/openapi/data-normalizer";
import { detectFields } from "@/lib/openapi/field-detector";
import type { DetectedFields } from "@/lib/openapi/field-detector";

interface TrendsChartProps {
  productSlug: string;
  initialPeriod?: "24h" | "7d" | "30d" | "90d";
  /** Pre-classified items with detected fields (from server) */
  initialItems?: Record<string, unknown>[];
  initialFields?: DetectedFields;
  /** Legacy: raw TrendsResponse data */
  initialData?: { period?: string; points?: Array<Record<string, unknown>> };
  endpointPath?: string;
  className?: string;
}

const PERIODS = ["24h", "7d", "30d", "90d"] as const;

const LINE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-1))",
];

export function TrendsChart({
  productSlug,
  initialPeriod = "7d",
  initialItems,
  initialFields,
  initialData,
  endpointPath = "/stats/trends",
  className,
}: TrendsChartProps) {
  const t = useTranslations("trends");
  const te = useTranslations("errors");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(initialPeriod);

  // Compute initial chart state from either new or legacy props
  const computedInitial = computeInitialState(initialItems, initialFields, initialData);
  const [chartItems, setChartItems] = useState<Record<string, unknown>[] | null>(computedInitial.items);
  const [fields, setFields] = useState<DetectedFields | null>(computedInitial.fields);
  const [loading, setLoading] = useState(!computedInitial.items);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/proxy/${productSlug}${endpointPath}?period=${period}`
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || { code: "UNKNOWN", message: te("failedToLoad") });
      } else {
        const items = extractItems(json.data);
        if (items && items.length > 0) {
          const detected = detectFields(items);
          setChartItems(items);
          setFields(detected);
        } else {
          setChartItems([]);
          setFields(null);
        }
      }
    } catch {
      setError({ code: "NETWORK_ERROR", message: te("failedToLoad") });
    } finally {
      setLoading(false);
    }
  }, [productSlug, endpointPath, period, te]);

  // Fetch on period change, but skip the initial mount if we have server-provided data
  const initialFetchSkipped = useRef(!!computedInitial.items);
  useEffect(() => {
    if (initialFetchSkipped.current) {
      initialFetchSkipped.current = false;
      return;
    }
    fetchData();
  }, [fetchData]);

  const dateKey = fields?.dateField ?? "date";
  const metricKeys = fields?.metricFields ?? [];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <div className="flex items-center gap-1" role="group" aria-label="Time period">
          {PERIODS.map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="xs"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              aria-label={`Show ${p} trends`}
            >
              {p}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[200px] w-full sm:h-[300px]" />
        ) : error ? (
          <ErrorBanner error={error} onRetry={fetchData} />
        ) : chartItems && chartItems.length > 0 && metricKeys.length > 0 ? (
          <div role="img" aria-label={`Trends chart showing ${metricKeys.map(toTitleCase).join(", ")} over the last ${period}`}>
            <p className="sr-only">
              Line chart displaying {metricKeys.map(toTitleCase).join(", ")} trends with {chartItems.length} data points over the last {period}.
            </p>
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartItems}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey={dateKey}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                  {metricKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={toTitleCase(key)}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground sm:h-[300px]">
            {te("noTrendData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Compute initial state from either new (classified) or legacy (TrendsResponse) props */
function computeInitialState(
  initialItems?: Record<string, unknown>[],
  initialFields?: DetectedFields,
  initialData?: { period?: string; points?: Array<Record<string, unknown>> },
): { items: Record<string, unknown>[] | null; fields: DetectedFields | null } {
  // New props take priority
  if (initialItems && initialItems.length > 0) {
    return {
      items: initialItems,
      fields: initialFields ?? detectFields(initialItems),
    };
  }

  // Legacy: extract from TrendsResponse shape
  if (initialData) {
    const items = extractItems(initialData);
    if (items && items.length > 0) {
      return { items, fields: detectFields(items) };
    }
  }

  return { items: null, fields: null };
}
