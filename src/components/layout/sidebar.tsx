"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { SidebarNav, type NavItem } from "@/components/layout/sidebar-nav"
import { ProductSwitcher } from "@/components/freckle/product-switcher"
import { Button } from "@/components/ui/button"
import { logout } from "@/actions/auth-actions"
import { getResourceIcon } from "@/lib/resource-icons"
import type { Product, ProductForDisplay } from "@/types/product"
import type { ApiResource } from "@/types/openapi"

interface AppSidebarProps {
  products: ProductForDisplay[]
  currentProduct?: Product | ProductForDisplay | null
  resourceTree?: ApiResource[]
}

function getProductNav(
  product: Product | ProductForDisplay,
  t: ReturnType<typeof useTranslations>,
  resourceTree: ApiResource[],
): NavItem[] {
  const slug = product.id
  const items: NavItem[] = [
    { href: `/p/${slug}`, label: t("dashboard"), icon: LayoutDashboard },
  ]

  // Build from OpenAPI resource tree
  for (const resource of resourceTree) {
    if (resource.requiresParentId) continue
    if (resource.key === "health") continue

    const Icon = getResourceIcon(resource.pathSegment)
    const label = t.has(resource.pathSegment) ? t(resource.pathSegment) : resource.name
    items.push({ href: `/p/${slug}/${resource.key}`, label, icon: Icon })

    // Add navigable children (those that don't require parent ID and have a GET endpoint)
    for (const child of resource.children) {
      if (child.requiresParentId) continue
      const hasGet = child.operations.some(op => op.httpMethod === "GET")
      if (!hasGet) continue
      const childIcon = getResourceIcon(child.pathSegment)
      const childLabel = t.has(child.pathSegment) ? t(child.pathSegment) : child.name
      items.push({ href: `/p/${slug}/${child.key}`, label: `  ${childLabel}`, icon: childIcon })
    }
  }

  return items
}

export function AppSidebar({ products, currentProduct, resourceTree }: AppSidebarProps) {
  const t = useTranslations("nav")
  const tAuth = useTranslations("auth")
  const params = useParams()
  const slug = params?.slug as string | undefined

  const activeProduct = currentProduct ?? products.find((p) => p.id === slug) ?? null

  const globalNav: NavItem[] = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/products", label: t("products"), icon: Package },
    { href: "/audit-log", label: t("auditLog"), icon: ScrollText },
  ]

  const switcherProducts = products.map((p) => ({
    slug: p.id,
    displayName: p.name,
    healthStatus: p.healthStatus,
    version: p.productVersion ?? "",
    lastCheckedAt: p.lastHealthCheck ?? "",
  }))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            F
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Freckle
          </span>
        </Link>
        {activeProduct && products.length > 0 && (
          <div className="group-data-[collapsible=icon]:hidden">
            <ProductSwitcher
              products={switcherProducts}
              currentProduct={activeProduct.id}
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("global")}</SidebarGroupLabel>
          <SidebarNav items={globalNav} />
        </SidebarGroup>

        {activeProduct && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>{activeProduct.name}</SidebarGroupLabel>
              <SidebarNav items={getProductNav(activeProduct, t, resourceTree ?? [])} />
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarNav
          items={[{ href: "/settings", label: t("settings"), icon: Settings }]}
        />
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <LogOut className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">{tAuth("logout")}</span>
          </Button>
        </form>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
