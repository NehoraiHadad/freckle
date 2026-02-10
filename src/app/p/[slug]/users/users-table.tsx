"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable, type ColumnDef } from "@/components/freckle/data-table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import type { AdminUser, PaginationMeta } from "@/types/admin-api";

interface UsersTableProps {
  slug: string;
  data: AdminUser[];
  meta: PaginationMeta;
  searchParams: Record<string, string | undefined>;
}

function timeAgo(dateStr: string | null, neverLabel: string): string {
  if (!dateStr) return neverLabel;
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

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
};

export function UsersTable({ slug, data, meta, searchParams }: UsersTableProps) {
  const router = useRouter();
  const t = useTranslations("users");

  const columns: ColumnDef<AdminUser>[] = [
    {
      key: "email",
      header: t("email"),
      sortable: true,
      render: (u) => <span className="font-medium">{u.email}</span>,
    },
    {
      key: "name",
      header: t("name"),
      sortable: true,
      render: (u) => u.name || <span className="text-muted-foreground">-</span>,
    },
    {
      key: "role",
      header: t("role"),
      render: (u) => <Badge variant="outline">{u.role}</Badge>,
    },
    {
      key: "status",
      header: t("status"),
      render: (u) => (
        <Badge variant={statusVariant[u.status] ?? "outline"}>{u.status}</Badge>
      ),
    },
    {
      key: "lastActiveAt",
      header: t("lastActive"),
      sortable: true,
      render: (u) => (
        <span className="text-muted-foreground">{timeAgo(u.lastActiveAt, t("never"))}</span>
      ),
    },
  ];

  return (
    <DataTable<AdminUser>
      data={data}
      meta={meta}
      columns={columns}
      searchParams={searchParams}
      searchPlaceholder={t("searchPlaceholder")}
      baseUrl={`/p/${slug}/users`}
      onRowClick={(user) => router.push(`/p/${slug}/users/${user.id}`)}
      filters={[
        {
          key: "status",
          label: t("status"),
          options: [
            { value: "active", label: t("filterActive") },
            { value: "inactive", label: t("filterInactive") },
            { value: "suspended", label: t("filterSuspended") },
          ],
        },
      ]}
      emptyState={{
        icon: <Users className="size-12" />,
        title: t("noUsersFound"),
        description: t("noUsersDescription"),
      }}
    />
  );
}
