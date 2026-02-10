"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBar } from "@/components/freckle/search-bar";
import { Pagination } from "@/components/freckle/pagination";
import { EmptyState } from "@/components/freckle/empty-state";
import { ErrorBanner } from "@/components/freckle/error-banner";
import type { PaginationMeta } from "@/types/admin-api";

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (item: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  /** Show this column in mobile card view (default: false, first 3 columns shown if none specified) */
  mobileVisible?: boolean;
}

export interface FilterDefinition {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<T> {
  data: T[];
  meta: PaginationMeta;
  columns: ColumnDef<T>[];
  searchParams: Record<string, string | undefined>;
  onRowClick?: (item: T) => void;
  baseUrl: string;
  searchPlaceholder?: string;
  filters?: FilterDefinition[];
  emptyState?: {
    icon: ReactNode;
    title: string;
    description: string;
  };
  loading?: boolean;
  error?: { code: string; message: string } | null;
  onRetry?: () => void;
}

function buildUrl(
  baseUrl: string,
  currentParams: Record<string, string | undefined>,
  overrides: Record<string, string>
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams)) {
    if (value !== undefined) params.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    params.set(key, value);
  }
  return `${baseUrl}?${params.toString()}`;
}

function getCleanParams(
  searchParams: Record<string, string | undefined>
): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) clean[key] = value;
  }
  return clean;
}

export function DataTable<T extends { id: string }>({
  data,
  meta,
  columns,
  searchParams,
  onRowClick,
  baseUrl,
  searchPlaceholder,
  filters,
  emptyState,
  loading,
  error,
  onRetry,
}: DataTableProps<T>) {
  const router = useRouter();
  const tErrors = useTranslations("errors");
  const currentSort = searchParams.sort;
  const currentOrder = searchParams.order || "desc";

  const handleSort = (key: string) => {
    let newOrder = "asc";
    if (currentSort === key && currentOrder === "asc") {
      newOrder = "desc";
    }
    router.push(
      buildUrl(baseUrl, searchParams, {
        sort: key,
        order: newOrder,
        page: "1",
      })
    );
  };

  const handleFilterChange = (key: string, value: string) => {
    const overrides: Record<string, string> = { page: "1" };
    if (value === "__all__") {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(searchParams)) {
        if (v !== undefined && k !== key) params.set(k, v);
      }
      params.set("page", "1");
      router.push(`${baseUrl}?${params.toString()}`);
      return;
    }
    overrides[key] = value;
    router.push(buildUrl(baseUrl, searchParams, overrides));
  };

  if (error) {
    return <ErrorBanner error={error} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {searchPlaceholder && (
          <SearchBar
            placeholder={searchPlaceholder}
            defaultValue={searchParams.search}
            className="sm:max-w-sm"
          />
        )}
        {filters && filters.length > 0 && (
          <div className="flex items-center gap-2">
            {filters.map((filter) => (
              <Select
                key={filter.key}
                value={searchParams[filter.key] || "__all__"}
                onValueChange={(value) =>
                  handleFilterChange(filter.key, value)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-auto"
                  aria-label={filter.label}
                >
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {filter.label}
                  </SelectItem>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        emptyState ? (
          <EmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
          />
        ) : (
          <EmptyState
            icon={<Loader2 className="size-12" />}
            title={tErrors("noResults")}
            description={tErrors("noResultsDescription")}
          />
        )
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-3 md:hidden">
            {data.map((item) => {
              const mobileColumns = columns.some((c) => c.mobileVisible)
                ? columns.filter((c) => c.mobileVisible)
                : columns.slice(0, 3);
              return (
                <Card
                  key={item.id}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(item)}
                  {...(onRowClick ? {
                    tabIndex: 0,
                    role: "link",
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(item);
                      }
                    },
                  } : {})}
                >
                  <CardContent className="space-y-1.5 p-4">
                    {mobileColumns.map((col) => (
                      <div key={col.key} className="flex items-center justify-between gap-2">
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">
                          {col.header}
                        </span>
                        <div className="min-w-0 text-end text-sm">{col.render(item)}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block">
            <Table aria-label="Data table">
              <TableHeader>
                <TableRow>
                  {columns.map((col) => {
                    const isSorted = col.sortable && currentSort === col.key;
                    const ariaSortValue = isSorted
                      ? (currentOrder === "asc" ? "ascending" as const : "descending" as const)
                      : undefined;
                    return (
                      <TableHead
                        key={col.key}
                        scope="col"
                        className={cn(
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                        style={col.width ? { width: col.width } : undefined}
                        aria-sort={ariaSortValue}
                      >
                        {col.sortable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ms-3 h-8"
                            onClick={() => handleSort(col.key)}
                            aria-label={`Sort by ${col.header}`}
                          >
                            {col.header}
                            {currentSort === col.key ? (
                              currentOrder === "asc" ? (
                                <ArrowUp className="ms-1 size-3" aria-hidden="true" />
                              ) : (
                                <ArrowDown className="ms-1 size-3" aria-hidden="true" />
                              )
                            ) : (
                              <ArrowUpDown className="ms-1 size-3" aria-hidden="true" />
                            )}
                          </Button>
                        ) : (
                          col.header
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(onRowClick && "cursor-pointer")}
                    onClick={() => onRowClick?.(item)}
                    {...(onRowClick ? {
                      tabIndex: 0,
                      role: "link",
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(item);
                        }
                      },
                    } : {})}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.render(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            meta={
              !meta.hasMore && data.length < meta.pageSize
                ? { ...meta, total: (meta.page - 1) * meta.pageSize + data.length }
                : meta
            }
            baseUrl={baseUrl}
            searchParams={getCleanParams(searchParams)}
          />
        </>
      )}
    </div>
  );
}
