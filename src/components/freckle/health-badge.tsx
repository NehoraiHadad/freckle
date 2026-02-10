"use client";

import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { HealthStatus } from "@/types/admin-api";

interface HealthBadgeProps {
  status: HealthStatus;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const iconConfig: Record<
  HealthStatus,
  { color: string; icon: typeof CheckCircle2 }
> = {
  healthy: { color: "text-green-500", icon: CheckCircle2 },
  degraded: { color: "text-yellow-500", icon: AlertTriangle },
  unhealthy: { color: "text-red-500", icon: XCircle },
  unknown: { color: "text-gray-400", icon: HelpCircle },
};

export function HealthBadge({
  status,
  showLabel = true,
  size = "md",
}: HealthBadgeProps) {
  const t = useTranslations("health");
  const { color, icon: Icon } = iconConfig[status];
  const label = t(status);
  const iconSize = size === "sm" ? "size-3" : "size-4";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", color)}
      aria-label={t("statusLabel", { status: label })}
    >
      <Icon className={iconSize} />
      {showLabel && (
        <span className={cn("font-medium", size === "sm" ? "text-xs" : "text-sm")}>
          {label}
        </span>
      )}
    </span>
  );
}
