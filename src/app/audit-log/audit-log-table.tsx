"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditLogEntry } from "@/types/product";

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  searchParams: Record<string, string | undefined>;
  products: { id: string; name: string }[];
}

function buildUrl(
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
  const tp = useTranslations("pagination");

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select
          value={searchParams.productId || "__all__"}
          onValueChange={(v) =>
            router.push(buildUrl(searchParams, { productId: v, page: "1" }))
          }
        >
          <SelectTrigger size="sm" className="w-auto">
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
            router.push(buildUrl(searchParams, { action: v, page: "1" }))
          }
        >
          <SelectTrigger size="sm" className="w-auto">
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

      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("noLogs")}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("timestamp")}</TableHead>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("action")}</TableHead>
                  <TableHead>{t("entity")}</TableHead>
                  <TableHead>{t("result")}</TableHead>
                  <TableHead className="max-w-[200px]">{t("details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{log.productId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.entityType && log.entityId
                        ? `${log.entityType}:${log.entityId}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={log.result === "success" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {log.result}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {tp("showing")} {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, total)} {tp("of")} {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-xs"
                disabled={page <= 1}
                onClick={() =>
                  router.push(
                    buildUrl(searchParams, { page: String(page - 1) }),
                  )
                }
                aria-label={tp("previousPage")}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-sm">
                {tp("page", { page })}
              </span>
              <Button
                variant="outline"
                size="icon-xs"
                disabled={page >= totalPages}
                onClick={() =>
                  router.push(
                    buildUrl(searchParams, { page: String(page + 1) }),
                  )
                }
                aria-label={tp("nextPage")}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
