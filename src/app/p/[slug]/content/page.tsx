import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { getProduct } from "@/lib/db/products";
import { classifyError } from "@/lib/api-client/errors";
import { notFound } from "next/navigation";
import { ContentTable } from "./content-table";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import type { FilterDefinition } from "@/components/freckle/data-table";
import type { PaginationMeta, AdminContentItem } from "@/types/admin-api";

interface ContentPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function ContentTableSection({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Record<string, string | undefined>;
}) {
  const tc = await getTranslations("content");
  const contentFilters: FilterDefinition[] = [
    {
      key: "status",
      label: tc("status"),
      options: [
        { value: "published", label: tc("published") },
        { value: "draft", label: tc("draft") },
        { value: "archived", label: tc("archived") },
      ],
    },
  ];

  let data: AdminContentItem[] = [];
  let meta: PaginationMeta = { total: 0, page: 1, pageSize: 20, hasMore: false };
  let errorInfo: { code: string; message: string } | null = null;

  try {
    const client = getClientManager().getClient(slug);
    const result = await client.content.list({
      page: searchParams.page ? Number(searchParams.page) : undefined,
      pageSize: searchParams.pageSize ? Number(searchParams.pageSize) : undefined,
      search: searchParams.search,
      sort: searchParams.sort,
      order: searchParams.order as "asc" | "desc" | undefined,
      status: searchParams.status,
      type: searchParams.type,
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
    <ContentTable
      slug={slug}
      data={data}
      meta={meta}
      searchParams={searchParams}
      filters={contentFilters}
    />
  );
}

function ContentTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

export default async function ContentPage({ params, searchParams }: ContentPageProps) {
  const { slug } = await params;
  const rawSearchParams = await searchParams;

  const product = getProduct(slug);
  if (!product) notFound();

  const sp: Record<string, string | undefined> = {};
  for (const [key, val] of Object.entries(rawSearchParams)) {
    sp[key] = Array.isArray(val) ? val[0] : val;
  }

  const t = await getTranslations("content");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("description", { product: product.name })}
        </p>
      </div>
      <Suspense fallback={<ContentTableSkeleton />}>
        <ContentTableSection slug={slug} searchParams={sp} />
      </Suspense>
    </div>
  );
}
