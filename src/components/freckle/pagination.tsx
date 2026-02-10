"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaginationMeta } from "@/types/admin-api";

interface PaginationProps {
  meta: PaginationMeta;
  baseUrl: string;
  searchParams: Record<string, string>;
}

const PAGE_SIZES = [10, 20, 50, 100];

function buildUrl(
  baseUrl: string,
  searchParams: Record<string, string>,
  overrides: Record<string, string>
): string {
  const params = new URLSearchParams(searchParams);
  for (const [key, value] of Object.entries(overrides)) {
    params.set(key, value);
  }
  return `${baseUrl}?${params.toString()}`;
}

function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export function Pagination({ meta, baseUrl, searchParams }: PaginationProps) {
  const router = useRouter();
  const t = useTranslations("pagination");
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  const pages = getPageNumbers(meta.page, totalPages);

  const goTo = (page: number) => {
    router.push(
      buildUrl(baseUrl, searchParams, { page: String(page) })
    );
  };

  const changePageSize = (size: string) => {
    router.push(
      buildUrl(baseUrl, searchParams, { pageSize: size, page: "1" })
    );
  };

  return (
    <nav aria-label="Pagination" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("showing")}{" "}
        <span className="font-medium text-foreground">
          {from.toLocaleString()}
        </span>
        {"-"}
        <span className="font-medium text-foreground">
          {to.toLocaleString()}
        </span>{" "}
        {t("of")}{" "}
        <span className="font-medium text-foreground">
          {meta.total.toLocaleString()}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={meta.page <= 1}
            onClick={() => goTo(meta.page - 1)}
            aria-label={t("previousPage")}
          >
            <ChevronLeft className="size-4" />
          </Button>

          {/* Page numbers hidden on mobile, visible on sm+ */}
          <div className="hidden items-center gap-1 sm:flex">
            {pages.map((page, i) =>
              page === "ellipsis" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="flex size-8 items-center justify-center text-sm text-muted-foreground"
                  aria-hidden="true"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === meta.page ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => goTo(page)}
                  aria-label={t("page", { page })}
                  aria-current={page === meta.page ? "page" : undefined}
                >
                  {page}
                </Button>
              )
            )}
          </div>

          {/* Compact page indicator on mobile */}
          <span className="px-2 text-sm text-muted-foreground sm:hidden">
            {meta.page}/{totalPages}
          </span>

          <Button
            variant="outline"
            size="icon-sm"
            disabled={meta.page >= totalPages}
            onClick={() => goTo(meta.page + 1)}
            aria-label={t("nextPage")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <Select
          value={String(meta.pageSize)}
          onValueChange={changePageSize}
        >
          <SelectTrigger size="sm" className="w-auto" aria-label={t("pageSize")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {t("perPage", { size })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
}
