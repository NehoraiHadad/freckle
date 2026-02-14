"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  User,
  FileText,
  CreditCard,
  Shield,
  Server,
  Activity,
  PlusCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/freckle/error-banner";
import { extractItems } from "@/lib/openapi/data-normalizer";
import { detectFields, type DetectedFields } from "@/lib/openapi/field-detector";

interface ActivityFeedProps {
  productSlug: string;
  endpointPath?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showLoadMore?: boolean;
  compact?: boolean;
  className?: string;
  /** Pre-detected field mapping from server-side classification */
  fieldMapping?: DetectedFields;
}

interface EventIconConfig {
  icon: LucideIcon;
  color: string;
}

const EVENT_ICON_PATTERNS: Array<[RegExp, EventIconConfig]> = [
  [/create|add|new/i, { icon: PlusCircle, color: "text-green-500" }],
  [/update|edit|modify|change/i, { icon: Pencil, color: "text-blue-500" }],
  [/delete|remove|destroy/i, { icon: Trash2, color: "text-red-500" }],
  [/error|fail/i, { icon: AlertTriangle, color: "text-red-500" }],
  [/notification|alert/i, { icon: Bell, color: "text-yellow-500" }],
  [/user|account|member|profile/i, { icon: User, color: "text-blue-500" }],
  [/content|post|article|story|page|document/i, { icon: FileText, color: "text-purple-500" }],
  [/credit|payment|billing/i, { icon: CreditCard, color: "text-green-500" }],
  [/admin|auth|permission/i, { icon: Shield, color: "text-orange-500" }],
  [/system|server|deploy/i, { icon: Server, color: "text-gray-500" }],
];

function getEventIcon(type: string): EventIconConfig {
  for (const [pattern, config] of EVENT_ICON_PATTERNS) {
    if (pattern.test(type)) return config;
  }
  return { icon: Activity, color: "text-gray-500" };
}

function timeAgo(timestamp: string, tTime: (key: string, params?: Record<string, string | number | Date>) => string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  if (isNaN(then)) return timestamp;
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return tTime("justNow");
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return tTime("minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tTime("hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return tTime("daysAgo", { count: days });
  const months = Math.floor(days / 30);
  return tTime("monthsAgo", { count: months });
}

/** Extract the actor display name from various shapes */
function getActorName(actorValue: unknown): string | null {
  if (!actorValue) return null;
  if (typeof actorValue === "string") return actorValue;
  if (typeof actorValue === "object" && actorValue !== null) {
    const obj = actorValue as Record<string, unknown>;
    const name = obj.name ?? obj.displayName ?? obj.username ?? obj.email;
    if (typeof name === "string") return name;
  }
  return null;
}

export function ActivityFeed({
  productSlug,
  endpointPath = "/analytics/activity",
  limit = 10,
  autoRefresh = true,
  refreshInterval = 30000,
  showLoadMore = true,
  compact = false,
  className,
  fieldMapping,
}: ActivityFeedProps) {
  const t = useTranslations("activity");
  const tTime = useTranslations("time");
  const tErrors = useTranslations("errors");
  const tc = useTranslations("common");
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [fields, setFields] = useState<DetectedFields | null>(fieldMapping ?? null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetch(
          `/api/proxy/${productSlug}${endpointPath}?pageSize=${limit}&page=${pageNum}`
        );
        const json = await res.json();
        if (json.success) {
          const rawData = json.data;
          const items = extractItems(rawData) ?? (Array.isArray(rawData) ? rawData : []);

          // Auto-detect fields on first successful load
          if (!fields && items.length > 0) {
            setFields(detectFields(items as Record<string, unknown>[]));
          }

          if (append) {
            setEvents((prev) => {
              const idField = fields?.idField ?? "id";
              const existingIds = new Set(prev.map((e) => String(e[idField] ?? "")));
              const unique = (items as Record<string, unknown>[]).filter(
                (e) => !existingIds.has(String(e[idField] ?? ""))
              );
              return [...prev, ...unique];
            });
          } else {
            setEvents(items as Record<string, unknown>[]);
          }
          setHasMore(json.meta?.hasMore ?? false);
          setError(null);
          hasLoadedOnce.current = true;
        } else if (!hasLoadedOnce.current) {
          setError(json.error?.message || tErrors("failedToLoadActivity"));
        }
      } catch {
        if (!hasLoadedOnce.current) {
          setError(tErrors("networkError"));
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [productSlug, endpointPath, limit, tErrors, fields]
  );

  useEffect(() => {
    fetchEvents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSlug, endpointPath, limit]);

  useEffect(() => {
    if (!autoRefresh) return;

    const startPolling = () => {
      intervalRef.current = setInterval(() => {
        fetchEvents(1);
      }, refreshInterval);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchEvents(1);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefresh, refreshInterval, fetchEvents]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  // Field accessors using detected or default field names
  const idKey = fields?.idField ?? "id";
  const dateKey = fields?.dateField ?? "timestamp";
  const descKey = fields?.descriptionField ?? "description";
  const typeKey = fields?.typeField ?? "type";
  const actorKey = fields?.actorField ?? "actor";

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div role="status" className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
            <span className="sr-only">{tc("loading")}</span>
          </div>
        ) : error ? (
          <ErrorBanner
            error={{ code: "FETCH_ERROR", message: error }}
            onRetry={() => fetchEvents(1)}
          />
        ) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("noActivity")}
          </p>
        ) : (
          <div role="feed" aria-label="Activity feed" className="space-y-0">
            {events.map((event, i) => {
              const eventType = String(event[typeKey] ?? "");
              const { icon: Icon, color } = getEventIcon(eventType);
              const description = String(event[descKey] ?? "");
              const timestamp = event[dateKey] ? String(event[dateKey]) : null;
              const actorName = getActorName(event[actorKey]);
              const eventId = event[idKey] ? String(event[idKey]) : String(i);

              return (
                <article
                  key={eventId}
                  aria-label={description}
                  className={cn(
                    "flex items-start gap-3 py-2",
                    i < events.length - 1 && "border-b border-border/50"
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-muted",
                      compact ? "size-5" : "size-5 sm:size-7",
                      color
                    )}
                  >
                    <Icon className={compact ? "size-3" : "size-3 sm:size-3.5"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {description && (
                      <p
                        className={cn(
                          "leading-snug",
                          compact ? "text-xs" : "text-xs sm:text-sm"
                        )}
                      >
                        {description}
                      </p>
                    )}
                    {!compact && actorName && (
                      <p className="text-xs text-muted-foreground">
                        by {actorName}
                      </p>
                    )}
                  </div>
                  {timestamp && (
                    <span
                      className={cn(
                        "shrink-0 text-muted-foreground",
                        compact ? "text-[10px]" : "text-xs"
                      )}
                    >
                      <time dateTime={timestamp}>{timeAgo(timestamp, tTime)}</time>
                    </span>
                  )}
                </article>
              );
            })}

            {showLoadMore && hasMore && !compact && (
              <div className="pt-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t("loadingMore") : t("loadMore")}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
