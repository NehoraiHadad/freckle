import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/layout/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllLogs } from "@/lib/db/audit-log";
import { getAllProductsForDisplay } from "@/lib/db/products";
import { AuditLogTable } from "./audit-log-table";

interface AuditLogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function AuditLogSection({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 25;
  const offset = (page - 1) * pageSize;

  const { logs, total } = getAllLogs({
    productId: searchParams.productId,
    action: searchParams.action,
    limit: pageSize,
    offset,
  });

  const products = getAllProductsForDisplay();

  return (
    <AuditLogTable
      logs={logs}
      total={total}
      page={page}
      pageSize={pageSize}
      searchParams={searchParams}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}

export const metadata: Metadata = {
  title: "Audit Log",
};

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  const rawSearchParams = await searchParams;
  const t = await getTranslations("auditLog");
  const tn = await getTranslations("nav");

  const sp: Record<string, string | undefined> = {};
  for (const [key, val] of Object.entries(rawSearchParams)) {
    sp[key] = Array.isArray(val) ? val[0] : val;
  }

  return (
    <Shell breadcrumbs={[{ label: tn("dashboard"), href: "/" }, { label: tn("auditLog") }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
          <AuditLogSection searchParams={sp} />
        </Suspense>
      </div>
    </Shell>
  );
}
