"use client";

import { AlertCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  error: { code: string; message: string };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  error,
  onRetry,
  onDismiss,
  className,
}: ErrorBannerProps) {
  const t = useTranslations("common");
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/5",
        className
      )}
    >
      <AlertCircle className="size-4 shrink-0" />
      <p className="flex-1">{error.message}</p>
      <div className="flex items-center gap-2">
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            {t("retry")}
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label={t("dismiss")}
            className="text-destructive hover:bg-destructive/10"
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
