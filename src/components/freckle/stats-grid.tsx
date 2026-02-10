import {
  Users,
  UserCheck,
  UserPlus,
  FileText,
  FileCheck,
  FilePlus,
  Blocks,
  type LucideIcon,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StatsResponse } from "@/types/admin-api";

interface StatCardData {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    direction: "up" | "down" | "flat";
    percentage: number;
    label: string;
  };
}

interface StatsLabels {
  totalUsers: string;
  activeUsers: string;
  newUsers30d: string;
  totalContent: string;
  published: string;
  created30d: string;
}

interface StatsGridProps {
  stats: StatsResponse;
  productCapabilities: string[];
  labels: StatsLabels;
}

function buildStatCards(
  stats: StatsResponse,
  capabilities: string[],
  labels: StatsLabels
): StatCardData[] {
  const cards: StatCardData[] = [];

  if (capabilities.includes("users") && stats.users) {
    cards.push(
      {
        id: "users-total",
        label: labels.totalUsers,
        value: stats.users.total,
        icon: Users,
      },
      {
        id: "users-active",
        label: labels.activeUsers,
        value: stats.users.active,
        icon: UserCheck,
      },
      {
        id: "users-new",
        label: labels.newUsers30d,
        value: stats.users.newLast30d,
        icon: UserPlus,
      }
    );
  }

  if (capabilities.includes("content") && stats.content) {
    cards.push(
      {
        id: "content-total",
        label: labels.totalContent,
        value: stats.content.total,
        icon: FileText,
      },
      {
        id: "content-published",
        label: labels.published,
        value: stats.content.publishedTotal,
        icon: FileCheck,
      },
      {
        id: "content-new",
        label: labels.created30d,
        value: stats.content.createdLast30d,
        icon: FilePlus,
      }
    );
  }

  if (stats.custom) {
    for (const [key, value] of Object.entries(stats.custom)) {
      if (typeof value === "number" || typeof value === "string") {
        cards.push({
          id: `custom-${key}`,
          label: key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase())
            .trim(),
          value,
          icon: Blocks,
        });
      }
    }
  }

  return cards;
}

function formatValue(value: number | string): string {
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return value;
}

function StatCard({ card }: { card: StatCardData }) {
  const Icon = card.icon;

  return (
    <Card aria-label={`${card.label}: ${formatValue(card.value)}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {card.label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(card.value)}</div>
        {card.trend && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              card.trend.direction === "up" && "text-green-500",
              card.trend.direction === "down" && "text-red-500",
              card.trend.direction === "flat" && "text-muted-foreground"
            )}
          >
            {card.trend.direction === "up" && <TrendingUp className="size-3" aria-hidden="true" />}
            {card.trend.direction === "down" && (
              <TrendingDown className="size-3" aria-hidden="true" />
            )}
            {card.trend.direction === "flat" && <Minus className="size-3" aria-hidden="true" />}
            <span>
              {card.trend.direction !== "flat" && `${card.trend.percentage}%`}{" "}
              {card.trend.label}
            </span>
          </p>
        )}
        {card.description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {card.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsGrid({ stats, productCapabilities, labels }: StatsGridProps) {
  const cards = buildStatCards(stats, productCapabilities, labels);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.id} card={card} />
      ))}
    </div>
  );
}
