import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { getProduct } from "@/lib/db/products";
import { classifyError } from "@/lib/api-client/errors";
import { notFound } from "next/navigation";
import { UsersTable } from "./users-table";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaginationMeta } from "@/types/admin-api";
import type { AdminUser } from "@/types/admin-api";

interface UsersPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function UsersTableSection({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Record<string, string | undefined>;
}) {
  let data: AdminUser[] = [];
  let meta: PaginationMeta = { total: 0, page: 1, pageSize: 20, hasMore: false };
  let errorInfo: { code: string; message: string } | null = null;

  try {
    const client = getClientManager().getClient(slug);
    const result = await client.users.list({
      page: searchParams.page ? Number(searchParams.page) : undefined,
      pageSize: searchParams.pageSize ? Number(searchParams.pageSize) : undefined,
      search: searchParams.search,
      sort: searchParams.sort,
      order: searchParams.order as "asc" | "desc" | undefined,
      status: searchParams.status,
      role: searchParams.role,
    });
    data = result.data;
    meta = result.meta;
  } catch (error) {
    const classified = classifyError(error);
    errorInfo = { code: classified.category, message: classified.userMessage };
  }

  if (errorInfo) {
    return <ErrorBanner error={errorInfo} />;
  }

  return (
    <UsersTable
      slug={slug}
      data={data}
      meta={meta}
      searchParams={searchParams}
    />
  );
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { slug } = await params;
  const rawSearchParams = await searchParams;

  const product = getProduct(slug);
  if (!product) notFound();

  const sp: Record<string, string | undefined> = {};
  for (const [key, val] of Object.entries(rawSearchParams)) {
    sp[key] = Array.isArray(val) ? val[0] : val;
  }

  const t = await getTranslations("users");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("description", { product: product.name })}
        </p>
      </div>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTableSection slug={slug} searchParams={sp} />
      </Suspense>
    </div>
  );
}
