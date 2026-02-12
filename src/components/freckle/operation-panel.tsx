"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { SchemaForm } from "./schema-form";
import type { ApiOperation, HttpMethod } from "@/types/openapi";

interface OperationPanelProps {
  productSlug: string;
  operations: ApiOperation[];
  /** Map of path parameter names to their values, e.g., { feedbackId: "abc123" } */
  pathParams: Record<string, string>;
  /** Current entity/resource data for pre-populating edit forms */
  currentData?: Record<string, unknown>;
  onActionComplete?: () => void;
  className?: string;
}

/** Get variant based on HTTP method */
function getMethodVariant(method: HttpMethod): "default" | "destructive" | "outline" {
  if (method === "DELETE") return "destructive";
  if (method === "GET") return "outline";
  return "default";
}

/** Build display label for an operation */
function getOperationLabel(op: ApiOperation): string {
  if (op.summary) return op.summary;

  // Build from operation type and resource
  const parts = op.resourceKey.split(".");
  const lastPart = parts[parts.length - 1];
  const label = lastPart.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  switch (op.operationType) {
    case "update": return "Update";
    case "delete": return "Delete";
    case "action": return label;
    case "sub-action": return label;
    default: return `${op.httpMethod} ${label}`;
  }
}

/** Resolve path template by substituting parameters */
function resolvePath(template: string, params: Record<string, string>): string {
  let resolved = template;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`{${key}}`, encodeURIComponent(value));
  }
  return resolved;
}

/** Should this operation require confirmation? */
function requiresConfirmation(op: ApiOperation): boolean {
  return op.httpMethod === "DELETE" || op.operationType === "action" || op.operationType === "sub-action";
}

/**
 * Extract initial form values from current data based on schema.
 * Searches the data object for keys matching schema property names.
 */
function extractInitialValues(
  schema: import("@/types/openapi").JsonSchema | undefined,
  currentData: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!schema?.properties || !currentData) return {};

  const values: Record<string, unknown> = {};

  // Search for each schema property in the current data
  for (const key of Object.keys(schema.properties)) {
    const found = findValueByKey(currentData, key);
    if (found !== undefined) {
      values[key] = found;
    }
  }

  return values;
}

/** Recursively search an object for a key, returning its value */
function findValueByKey(data: Record<string, unknown>, targetKey: string): unknown {
  // Direct match at current level
  if (targetKey in data) return data[targetKey];

  // Search one level deeper in nested objects
  for (const value of Object.values(data)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if (targetKey in nested) return nested[targetKey];
    }
  }

  return undefined;
}

/** Filter operations suitable for display as action buttons on an entity detail page.
 * Excludes list/detail/sub-list operations (those are for navigation, not actions). */
function getActionOperations(operations: ApiOperation[]): ApiOperation[] {
  return operations.filter(op => {
    // Exclude read-only operations
    if (op.httpMethod === "GET") return false;
    // Exclude list/detail operations
    if (op.operationType === "list" || op.operationType === "detail" || op.operationType === "sub-list" || op.operationType === "sub-detail") return false;
    return true;
  });
}

export function OperationPanel({
  productSlug,
  operations,
  pathParams,
  currentData,
  onActionComplete,
  className,
}: OperationPanelProps) {
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [confirmOp, setConfirmOp] = useState<ApiOperation | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("operationPanel");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  const actionOps = getActionOperations(operations);

  const executeOperation = async (op: ApiOperation, body?: Record<string, unknown>) => {
    setPendingOp(op.id);
    setError(null);
    try {
      const resolvedPath = resolvePath(op.pathTemplate, pathParams);
      const proxyUrl = `/api/proxy/${productSlug}${resolvedPath}`;

      const res = await fetch(proxyUrl, {
        method: op.httpMethod,
        headers: { "Content-Type": "application/json" },
        ...(body && Object.keys(body).length > 0 ? { body: JSON.stringify(body) } : {}),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || (json && json.success === false)) {
        setError(json?.error?.message || te("actionFailed"));
      } else {
        onActionComplete?.();
        router.refresh();
      }
    } catch {
      setError(te("network"));
    } finally {
      setPendingOp(null);
      setConfirmOp(null);
      setFormValues({});
    }
  };

  const handleClick = (op: ApiOperation) => {
    if (op.requestBodySchema || requiresConfirmation(op)) {
      setConfirmOp(op);
      // Pre-populate form with current data values matching the schema
      setFormValues(extractInitialValues(op.requestBodySchema, currentData));
    } else {
      executeOperation(op);
    }
  };

  if (actionOps.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap", className)} role="group" aria-label={t("actions")}>
      {actionOps.map((op) => {
        const isLoading = pendingOp === op.id;
        return (
          <Button
            key={op.id}
            variant={getMethodVariant(op.httpMethod)}
            size="sm"
            disabled={pendingOp !== null}
            onClick={() => handleClick(op)}
            aria-label={getOperationLabel(op)}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            {getOperationLabel(op)}
          </Button>
        );
      })}

      {error && (
        <p role="alert" className="w-full text-sm text-destructive">{error}</p>
      )}

      <Dialog
        open={confirmOp !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOp(null);
            setFormValues({});
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {confirmOp ? getOperationLabel(confirmOp) : ""}
            </DialogTitle>
            <DialogDescription>
              {confirmOp?.description || t("confirmDescription", { method: confirmOp?.httpMethod ?? "", path: confirmOp?.pathTemplate ?? "" })}
            </DialogDescription>
          </DialogHeader>

          {confirmOp?.requestBodySchema && (
            <div className="min-h-0 flex-1 overflow-y-auto -mx-6 px-6">
              <SchemaForm
                schema={confirmOp.requestBodySchema}
                values={formValues}
                onChange={setFormValues}
                disabled={pendingOp !== null}
              />
            </div>
          )}

          <DialogFooter className="shrink-0">
            <Button
              variant="outline"
              onClick={() => { setConfirmOp(null); setFormValues({}); }}
              disabled={pendingOp !== null}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant={confirmOp ? getMethodVariant(confirmOp.httpMethod) : "default"}
              onClick={() => {
                if (confirmOp) executeOperation(confirmOp, formValues);
              }}
              disabled={pendingOp !== null}
            >
              {pendingOp ? <Loader2 className="size-4 animate-spin" /> : null}
              {tc("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
