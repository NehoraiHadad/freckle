"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable, type ColumnDef, type FilterDefinition } from "@/components/freckle/data-table";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { AdminContentItem, PaginationMeta } from "@/types/admin-api";

interface ContentTableProps {
  slug: string;
  data: AdminContentItem[];
  meta: PaginationMeta;
  searchParams: Record<string, string | undefined>;
  filters: FilterDefinition[];
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function ContentTable({ slug, data, meta, searchParams, filters }: ContentTableProps) {
  const router = useRouter();
  const t = useTranslations("content");

  const columns: ColumnDef<AdminContentItem>[] = [
    {
      key: "title",
      header: t("titleColumn"),
      sortable: true,
      render: (c) => <span className="font-medium">{c.title}</span>,
    },
    {
      key: "type",
      header: t("type"),
      render: (c) => <Badge variant="outline">{c.type}</Badge>,
    },
    {
      key: "author",
      header: t("author"),
      render: (c) => c.author.name || <span className="text-muted-foreground">{t("unknown")}</span>,
    },
    {
      key: "status",
      header: t("status"),
      render: (c) => (
        <Badge variant={c.status === "published" ? "default" : "secondary"}>
          {c.status}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      header: t("updatedAt"),
      sortable: true,
      render: (c) => (
        <span className="text-muted-foreground">{timeAgo(c.updatedAt)}</span>
      ),
    },
  ];

  return (
    <DataTable<AdminContentItem>
      data={data}
      meta={meta}
      columns={columns}
      searchParams={searchParams}
      searchPlaceholder={t("searchPlaceholder")}
      baseUrl={`/p/${slug}/content`}
      onRowClick={(item) => router.push(`/p/${slug}/content/${item.id}`)}
      filters={filters}
      emptyState={{
        icon: <FileText className="size-12" />,
        title: t("noContentFound"),
        description: t("noContentDescription"),
      }}
    />
  );
}
