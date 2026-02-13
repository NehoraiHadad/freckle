"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  Search,
} from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { getResourceIcon } from "@/lib/resource-icons"
import type { ApiResource } from "@/types/openapi"

interface CommandProduct {
  id: string
  name: string
}

interface CommandPaletteProps {
  products: CommandProduct[]
  currentProductId?: string | null
  resourceTree?: ApiResource[]
}

export function CommandPalette({ products, currentProductId, resourceTree }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const t = useTranslations("commandPalette")

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      setOpen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const navItems = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/products", label: t("products"), icon: Package },
    { href: "/audit-log", label: t("auditLog"), icon: ScrollText },
    { href: "/settings", label: t("settings"), icon: Settings },
  ]

  // Build resource items for the current product
  const resourceItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = []
  if (currentProductId && resourceTree) {
    for (const resource of resourceTree) {
      if (resource.requiresParentId) continue
      if (resource.key === "health") continue
      const Icon = getResourceIcon(resource.pathSegment)
      resourceItems.push({
        href: `/p/${currentProductId}/${resource.key}`,
        label: resource.name,
        icon: Icon,
      })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        aria-label={t("placeholder")}
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">{t("placeholder")}</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title={t("navigation")} description={t("placeholder")}>
        <CommandInput placeholder={t("placeholder")} />
        <CommandList>
          <CommandEmpty>{t("noResults")}</CommandEmpty>

          <CommandGroup heading={t("navigation")}>
            {navItems.map((item) => (
              <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                <item.icon className="me-2 size-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {products.length > 0 && (
            <CommandGroup heading={t("products")}>
              {products.map((product) => (
                <CommandItem key={product.id} onSelect={() => navigate(`/p/${product.id}`)}>
                  <Package className="me-2 size-4" />
                  <span>{product.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {resourceItems.length > 0 && (
            <CommandGroup heading={t("resources")}>
              {resourceItems.map((item) => (
                <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                  <item.icon className="me-2 size-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
