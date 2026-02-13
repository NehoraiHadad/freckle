"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
  badge?: string | number;
}

interface EntityDetailProps {
  title: string;
  subtitle?: string;
  backLink: { href: string; label: string };
  tabs: TabDef[];
  defaultTab?: string;
  actions?: ReactNode;
  className?: string;
}

export function EntityDetail({
  title,
  subtitle,
  backLink,
  tabs,
  defaultTab,
  actions,
  className,
}: EntityDetailProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tabFromUrl = searchParams.get("tab");
  const validTabIds = new Set(tabs.map((t) => t.id));
  const activeTab =
    (tabFromUrl && validTabIds.has(tabFromUrl) ? tabFromUrl : null) ||
    defaultTab ||
    (tabs.length > 0 ? tabs[0].id : undefined);

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Button variant="ghost" size="sm" asChild className="-ms-2">
        <Link href={backLink.href}>
          <ArrowLeft className="size-4" />
          {backLink.label}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:shrink-0">
            {actions}
          </div>
        )}
      </div>

      {tabs.length > 0 && (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                {tab.label}
                {tab.badge !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
