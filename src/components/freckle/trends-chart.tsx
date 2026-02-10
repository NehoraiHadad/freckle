"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/freckle/error-banner";
import type { TrendsResponse } from "@/types/admin-api";

interface TrendsChartProps {
  productSlug: string;
  initialPeriod?: "24h" | "7d" | "30d" | "90d";
  className?: string;
}

const PERIODS = ["24h", "7d", "30d", "90d"] as const;

const LINE_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(160, 60%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(340, 75%, 55%)",
  "hsl(262, 83%, 58%)",
  "hsl(12, 76%, 61%)",
];

function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function TrendsChart({
  productSlug,
  initialPeriod = "7d",
  className,
}: TrendsChartProps) {
  const t = useTranslations("trends");
  const te = useTranslations("errors");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(initialPeriod);
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/proxy/${productSlug}/stats/trends?period=${period}`
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || { code: "UNKNOWN", message: te("failedToLoad") });
      } else {
        setData(json.data);
      }
    } catch {
      setError({ code: "NETWORK_ERROR", message: te("failedToLoad") });
    } finally {
      setLoading(false);
    }
  }, [productSlug, period, te]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metricKeys =
    data && Array.isArray(data.points) && data.points.length > 0
      ? Object.keys(data.points[0]).filter((k) => k !== "date")
      : [];

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
        ) : data && Array.isArray(data.points) && data.points.length > 0 ? (
          <div role="img" aria-label={`Trends chart showing ${metricKeys.map(camelToTitle).join(", ")} over the last ${period}`}>
            <p className="sr-only">
              Line chart displaying {metricKeys.map(camelToTitle).join(", ")} trends with {data.points.length} data points over the last {period}.
            </p>
            {/* Shorter chart on mobile (200px), taller on sm+ (300px) */}
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.points}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
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
                      name={camelToTitle(key)}
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
