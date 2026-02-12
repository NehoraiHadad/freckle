import {
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
import { toTitleCase } from "@/lib/format";
import { getResourceIcon } from "@/lib/resource-icons";

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

interface StatsGridProps {
  stats: StatsResponse;
}

function buildStatCards(stats: StatsResponse): StatCardData[] {
  const cards: StatCardData[] = [];

  for (const [key, value] of Object.entries(stats)) {
    // Skip metadata fields
    if (key === "generatedAt") continue;

    // Top-level number → card directly
    if (typeof value === "number") {
      cards.push({
        id: key,
        label: toTitleCase(key),
        value,
        icon: getResourceIcon(key),
      });
      continue;
    }

    // Top-level string → card directly
    if (typeof value === "string") {
      cards.push({
        id: key,
        label: toTitleCase(key),
        value,
        icon: getResourceIcon(key),
      });
      continue;
    }

    // Nested object → card per numeric sub-field
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const sectionIcon = getResourceIcon(key);
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        if (typeof subValue === "number" || typeof subValue === "string") {
          cards.push({
            id: `${key}-${subKey}`,
            label: `${toTitleCase(key)} ${toTitleCase(subKey)}`,
            value: subValue,
            icon: sectionIcon,
          });
        }
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

export function StatsGrid({ stats }: StatsGridProps) {
  const cards = buildStatCards(stats);

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
