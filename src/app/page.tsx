import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/layout/shell";
import { HealthBadge } from "@/components/freckle/health-badge";
import { EmptyState } from "@/components/freckle/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllProducts, getAllProductsForDisplay } from "@/lib/db/products";
import { getPreference } from "@/lib/db/preferences";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { CachedAdminApiClient } from "@/lib/api-client/cached-client";
import { toTitleCase } from "@/lib/format";
import type { StatsResponse } from "@/types/admin-api";
import type { Product } from "@/types/product";

interface ProductStats {
  product: Product;
  stats: StatsResponse | null;
  error: string | null;
}

/** Extract the first few numeric stats from a generic StatsResponse */
function extractStatSummary(stats: StatsResponse): Array<{ label: string; value: number }> {
  const result: Array<{ label: string; value: number }> = [];
  for (const [key, value] of Object.entries(stats)) {
    if (key === "generatedAt") continue;
    if (typeof value === "number") {
      result.push({ label: toTitleCase(key), value });
      if (result.length >= 3) break;
      continue;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        if (typeof subValue === "number") {
          result.push({ label: `${toTitleCase(key)} ${toTitleCase(subKey)}`, value: subValue });
          if (result.length >= 3) break;
        }
      }
      if (result.length >= 3) break;
    }
  }
  return result;
}

async function fetchAllProductStats(products: Product[]): Promise<ProductStats[]> {
  const activeProducts = products.filter((p) => p.status === "active");

  const results = await Promise.allSettled(
    activeProducts.map(async (product) => {
      const rawClient = getClientManager().getClient(product.id);
      const client = new CachedAdminApiClient(rawClient, product.id);
      const stats = (await client.stats()) as StatsResponse;
      return { product, stats, error: null };
    }),
  );

  return activeProducts.map((product, i) => {
    const result = results[i];
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      product,
      stats: null,
      error: result.reason instanceof Error ? result.reason.message : "Failed to fetch stats",
    };
  });
}

async function ProductStatsGrid({ products, layout }: { products: Product[]; layout?: string }) {
  const productStats = await fetchAllProductStats(products);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("description", { count: products.length })}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/products/new">{t("addProduct")}</Link>
        </Button>
      </div>

      {layout === "list" ? (
        <ProductListView productStats={productStats} tn={tn} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productStats.map(({ product, stats, error }) => {
            const statSummary = stats ? extractStatSummary(stats) : [];
            return (
              <Link key={product.id} href={`/p/${product.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium">
                      {product.name}
                    </CardTitle>
                    <HealthBadge status={product.healthStatus} size="sm" />
                  </CardHeader>
                  <CardContent>
                    {error ? (
                      <p className="text-sm text-destructive">{error}</p>
                    ) : statSummary.length > 0 ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {statSummary.map((s) => (
                          <span key={s.label}>{s.value.toLocaleString()} {s.label.toLowerCase()}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{tc("connected")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {product.capabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function ProductStatsSkeleton({ count }: { count: number }) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-1 h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-full sm:w-28" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}

function ProductListView({ productStats, tn }: {
  productStats: ProductStats[];
  tn: (key: string) => string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{tn("products")}</TableHead>
          <TableHead className="text-right">Stats</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productStats.map(({ product, stats, error }) => {
          const firstStat = stats ? extractStatSummary(stats)[0] : null;
          return (
            <TableRow key={product.id}>
              <TableCell>
                <Link href={`/p/${product.id}`} className="font-medium hover:underline">
                  <span className="flex items-center gap-2">
                    {product.name}
                    <HealthBadge status={product.healthStatus} size="sm" />
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-right">
                {error ? "—" : firstStat ? `${firstStat.value.toLocaleString()} ${firstStat.label.toLowerCase()}` : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const displayProducts = getAllProductsForDisplay();
  const products = getAllProducts();
  const dashboardLayout = getPreference("dashboardLayout");
  const t = await getTranslations("dashboard");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  if (displayProducts.length === 0) {
    return (
      <Shell breadcrumbs={[{ label: tn("dashboard") }]}>
        <EmptyState
          icon={<Package />}
          title={t("noProducts")}
          description={t("noProductsDescription")}
          action={
            <Button asChild>
              <Link href="/products/new">{t("registerProduct")}</Link>
            </Button>
          }
        />
      </Shell>
    );
  }

  const activeCount = displayProducts.filter((p) => p.status === "active").length;

  return (
    <Shell breadcrumbs={[{ label: tn("dashboard") }]}>
      <div className="space-y-6">
        <Suspense fallback={<ProductStatsSkeleton count={activeCount || 1} />}>
          <ProductStatsGrid products={products} layout={dashboardLayout} />
        </Suspense>

        {displayProducts.filter((p) => p.status === "inactive").length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              {t("inactiveProducts")}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayProducts
                .filter((p) => p.status === "inactive")
                .map((product) => (
                  <Link key={product.id} href={`/p/${product.id}`} className="block">
                    <Card className="opacity-60 transition-colors hover:bg-muted/50">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">
                          {product.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {tc("inactive")}
                        </Badge>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
