"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/freckle/data-table";
import { ScrollText } from "lucide-react";
import type { AuditLogEntry } from "@/types/product";
import type { PaginationMeta } from "@/types/admin-api";

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  searchParams: Record<string, string | undefined>;
  products: { id: string; name: string }[];
}

type AuditRow = Omit<AuditLogEntry, "id"> & { id: string };

function buildFilterUrl(
  params: Record<string, string | undefined>,
  overrides: Record<string, string>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === "__all__") {
      sp.delete(k);
    } else {
      sp.set(k, v);
    }
  }
  return `/audit-log?${sp.toString()}`;
}

export function AuditLogTable({
  logs,
  total,
  page,
  pageSize,
  searchParams,
  products,
}: AuditLogTableProps) {
  const router = useRouter();
  const t = useTranslations("auditLog");

  const productMap = new Map(products.map((p) => [p.id, p.name]));

  // Map numeric id to string for DataTable compatibility
  const data: AuditRow[] = logs.map(({ id, ...rest }) => ({
    ...rest,
    id: String(id),
  }));

  const meta: PaginationMeta = {
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };

  const columns: ColumnDef<AuditRow>[] = [
    {
      key: "createdAt",
      header: t("timestamp"),
      sortable: true,
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "productId",
      header: t("product"),
      render: (row) => (
        <span className="text-sm">{productMap.get(row.productId) ?? row.productId}</span>
      ),
    },
    {
      key: "action",
      header: t("action"),
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="text-xs font-mono">
          {row.action}
        </Badge>
      ),
    },
    {
      key: "entity",
      header: t("entity"),
      render: (row) => (
        <span className="text-xs">
          {row.entityType && row.entityId
            ? `${row.entityType}:${row.entityId}`
            : "\u2014"}
        </span>
      ),
    },
    {
      key: "result",
      header: t("result"),
      render: (row) => (
        <Badge
          variant={row.result === "success" ? "secondary" : "destructive"}
          className="text-xs"
        >
          {row.result}
        </Badge>
      ),
    },
    {
      key: "details",
      header: t("details"),
      render: (row) => (
        <span className="max-w-[200px] truncate text-xs text-muted-foreground block">
          {row.details ? JSON.stringify(row.details).slice(0, 80) : "\u2014"}
        </span>
      ),
    },
  ];

  const emptyIcon: ReactNode = <ScrollText className="size-12" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select
          value={searchParams.productId || "__all__"}
          onValueChange={(v) =>
            router.push(buildFilterUrl(searchParams, { productId: v, page: "1" }))
          }
        >
          <SelectTrigger size="sm" className="w-auto" aria-label={t("filterByProduct")}>
            <SelectValue placeholder={t("filterByProduct")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("allProducts")}</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.action || "__all__"}
          onValueChange={(v) =>
            router.push(buildFilterUrl(searchParams, { action: v, page: "1" }))
          }
        >
          <SelectTrigger size="sm" className="w-auto" aria-label={t("filterByAction")}>
            <SelectValue placeholder={t("filterByAction")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("allActions")}</SelectItem>
            <SelectItem value="product.">product.*</SelectItem>
            <SelectItem value="health.">health.*</SelectItem>
            <SelectItem value="config.">config.*</SelectItem>
            <SelectItem value="operation.">operation.*</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={data}
        meta={meta}
        columns={columns}
        searchParams={searchParams}
        baseUrl="/audit-log"
        emptyState={{
          icon: emptyIcon,
          title: t("noLogs"),
          description: t("noLogs"),
        }}
      />
    </div>
  );
}
