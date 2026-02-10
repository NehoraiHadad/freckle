"use client";

import { useState } from "react";
import {
  CreditCard,
  Download,
  Send,
  RefreshCw,
  Trash,
  Ban,
  Globe,
  GlobeLock,
  Star,
  Search,
  Trash2,
  Play,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ActionPanelProps {
  productSlug: string;
  entityType: "users" | "content" | "operations";
  entityId?: string;
  supportedActions: string[];
  onActionComplete?: () => void;
  className?: string;
}

interface ActionConfig {
  icon: LucideIcon;
  variant: "default" | "destructive" | "outline";
  requiresConfirmation: boolean;
}

function getActionConfig(action: string): ActionConfig {
  if (action.startsWith("add_credits") || action === "add_credits")
    return { icon: CreditCard, variant: "default", requiresConfirmation: false };
  if (action.startsWith("export_"))
    return { icon: Download, variant: "outline", requiresConfirmation: false };
  if (action.startsWith("send_"))
    return { icon: Send, variant: "outline", requiresConfirmation: false };
  if (action.startsWith("reset_"))
    return { icon: RefreshCw, variant: "outline", requiresConfirmation: true };
  if (action.startsWith("delete_") || action.startsWith("remove_"))
    return { icon: Trash, variant: "destructive", requiresConfirmation: true };
  if (action === "suspend" || action === "ban")
    return { icon: Ban, variant: "destructive", requiresConfirmation: true };
  if (action === "publish")
    return { icon: Globe, variant: "default", requiresConfirmation: false };
  if (action === "unpublish")
    return { icon: GlobeLock, variant: "outline", requiresConfirmation: true };
  if (action === "feature")
    return { icon: Star, variant: "default", requiresConfirmation: false };
  if (action === "regenerate")
    return { icon: RefreshCw, variant: "default", requiresConfirmation: true };
  if (action.startsWith("cleanup_"))
    return { icon: Trash2, variant: "outline", requiresConfirmation: true };
  if (action.startsWith("reindex_"))
    return { icon: Search, variant: "outline", requiresConfirmation: true };
  return { icon: Play, variant: "default", requiresConfirmation: false };
}

function actionToLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ActionPanel({
  productSlug,
  entityType,
  entityId,
  supportedActions,
  onActionComplete,
  className,
}: ActionPanelProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("actionPanel");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  const executeAction = async (action: string, params?: Record<string, unknown>) => {
    setPendingAction(action);
    setError(null);
    try {
      const path = entityId
        ? `/api/proxy/${productSlug}/${entityType}/${entityId}/actions`
        : `/api/proxy/${productSlug}/${entityType}`;

      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params: params || {} }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || te("actionFailed"));
      } else {
        onActionComplete?.();
      }
    } catch {
      setError(te("network"));
    } finally {
      setPendingAction(null);
      setConfirmAction(null);
    }
  };

  const handleClick = (action: string) => {
    const config = getActionConfig(action);
    if (config.requiresConfirmation) {
      setConfirmAction(action);
    } else {
      executeAction(action);
    }
  };

  if (supportedActions.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap", className)} role="group" aria-label="Actions">
      {supportedActions.map((action) => {
        const config = getActionConfig(action);
        const Icon = config.icon;
        const isLoading = pendingAction === action;

        return (
          <Button
            key={action}
            variant={config.variant}
            size="sm"
            disabled={pendingAction !== null}
            onClick={() => handleClick(action)}
            aria-label={actionToLabel(action)}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Icon className="size-4" aria-hidden="true" />
            )}
            {actionToLabel(action)}
          </Button>
        );
      })}

      {error && (
        <p role="alert" className="w-full text-sm text-destructive">{error}</p>
      )}

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t.rich("confirmDescription", {
                action: confirmAction ? actionToLabel(confirmAction) : "",
                b: (chunks) => <strong>{chunks}</strong>,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={pendingAction !== null}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant={
                confirmAction
                  ? getActionConfig(confirmAction).variant
                  : "default"
              }
              onClick={() => {
                if (confirmAction) executeAction(confirmAction);
              }}
              disabled={pendingAction !== null}
            >
              {pendingAction ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {tc("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
