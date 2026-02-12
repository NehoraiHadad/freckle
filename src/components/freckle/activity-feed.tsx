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
import type { ActivityEvent } from "@/types/admin-api";

interface ActivityFeedProps {
  productSlug: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showLoadMore?: boolean;
  compact?: boolean;
  className?: string;
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

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return "just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function ActivityFeed({
  productSlug,
  limit = 10,
  autoRefresh = true,
  refreshInterval = 30000,
  showLoadMore = true,
  compact = false,
  className,
}: ActivityFeedProps) {
  const t = useTranslations("activity");
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetch(
          `/api/proxy/${productSlug}/analytics/activity?pageSize=${limit}&page=${pageNum}`
        );
        const json = await res.json();
        if (json.success) {
          const newEvents: ActivityEvent[] = json.data;
          if (append) {
            setEvents((prev) => {
              const existingIds = new Set(prev.map((e) => e.id));
              const unique = newEvents.filter((e) => !existingIds.has(e.id));
              return [...prev, ...unique];
            });
          } else {
            setEvents(newEvents);
          }
          setHasMore(json.meta?.hasMore ?? false);
        }
      } catch {
        // Silently fail on auto-refresh; initial load shows empty
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [productSlug, limit]
  );

  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  useEffect(() => {
    if (!autoRefresh) return;
    intervalRef.current = setInterval(() => {
      fetchEvents(1);
    }, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refreshInterval, fetchEvents]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("noActivity")}
          </p>
        ) : (
          <div role="feed" aria-label="Activity feed" className="space-y-0">
            {events.map((event, i) => {
              const { icon: Icon, color } = getEventIcon(event.type);
              return (
                <article
                  key={event.id}
                  aria-label={event.description}
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
                    <p
                      className={cn(
                        "leading-snug",
                        compact ? "text-xs" : "text-xs sm:text-sm"
                      )}
                    >
                      {event.description}
                    </p>
                    {!compact && event.actor?.name && (
                      <p className="text-xs text-muted-foreground">
                        by {event.actor.name}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-muted-foreground",
                      compact ? "text-[10px]" : "text-xs"
                    )}
                  >
                    <time dateTime={event.timestamp}>{timeAgo(event.timestamp)}</time>
                  </span>
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
