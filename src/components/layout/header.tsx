"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"
import { Moon, Sun } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { CommandPalette } from "@/components/freckle/command-palette"
import type { ApiResource } from "@/types/openapi"

export interface BreadcrumbSegment {
  label: string
  href?: string
}

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbSegment[]
  products?: { id: string; name: string }[]
  currentProductId?: string | null
  resourceTree?: ApiResource[]
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations("common")

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? t("switchToLight") : t("switchToDark")}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

export function AppHeader({ breadcrumbs, products, currentProductId, resourceTree }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ms-1" />
      <Separator orientation="vertical" className="me-2 h-4" />

      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1

              return (
                <span key={crumb.label} className="contents">
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem className="min-w-0">
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href} className="truncate">{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="ms-auto flex items-center gap-2">
        <CommandPalette
          products={products ?? []}
          currentProductId={currentProductId}
          resourceTree={resourceTree}
        />
        <ThemeToggle />
      </div>
    </header>
  )
}
