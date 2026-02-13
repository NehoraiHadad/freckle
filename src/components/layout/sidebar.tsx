"use client"

import Link from "next/link"
import Image from "next/image"
import logo from "../../../public/logo.png"
import { useParams, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { SidebarNav, type NavItem } from "@/components/layout/sidebar-nav"
import { ProductSwitcher } from "@/components/freckle/product-switcher"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { logout } from "@/actions/auth-actions"
import { getResourceIcon } from "@/lib/resource-icons"
import type { Product, ProductForDisplay } from "@/types/product"
import type { ApiResource } from "@/types/openapi"

interface AppSidebarProps {
  products: ProductForDisplay[]
  currentProduct?: Product | ProductForDisplay | null
  resourceTree?: ApiResource[]
}

export function AppSidebar({ products, currentProduct, resourceTree }: AppSidebarProps) {
  const t = useTranslations("nav")
  const tAuth = useTranslations("auth")
  const params = useParams()
  const pathname = usePathname()
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
          <div className="relative flex size-6 items-center justify-center">
            <Image
              src={logo}
              alt="Freckle Logo"
              fill
              className="object-contain"
            />
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
              <ProductResourceNav
                productId={activeProduct.id}
                resourceTree={resourceTree ?? []}
                pathname={pathname}
                t={t}
              />
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

function ProductResourceNav({
  productId,
  resourceTree,
  pathname,
  t,
}: {
  productId: string
  resourceTree: ApiResource[]
  pathname: string
  t: ReturnType<typeof useTranslations>
}) {
  const dashboardHref = `/p/${productId}`
  const isDashboardActive = pathname === dashboardHref

  // Filter navigable children (don't require parent ID and have a GET endpoint)
  function getNavigableChildren(resource: ApiResource): ApiResource[] {
    return resource.children.filter(
      (child) => !child.requiresParentId && child.operations.some((op) => op.httpMethod === "GET")
    )
  }

  return (
    <SidebarMenu>
      {/* Dashboard item */}
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isDashboardActive} tooltip={t("dashboard")}>
          <Link href={dashboardHref}>
            <LayoutDashboard />
            <span>{t("dashboard")}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Resource items */}
      {resourceTree.map((resource) => {
        if (resource.requiresParentId) return null
        if (resource.key === "health") return null

        const Icon = getResourceIcon(resource.pathSegment)
        const label = t.has(resource.pathSegment) ? t(resource.pathSegment) : resource.name
        const href = `/p/${productId}/${resource.key}`
        const isActive = pathname === href || pathname.startsWith(href + "/")
        const navigableChildren = getNavigableChildren(resource)

        // Resource with navigable children → collapsible group
        if (navigableChildren.length > 0) {
          const isChildActive = navigableChildren.some((child) => {
            const childHref = `/p/${productId}/${child.key}`
            return pathname === childHref || pathname.startsWith(childHref + "/")
          })

          return (
            <Collapsible key={resource.key} defaultOpen={isActive || isChildActive} className="group/collapsible">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                  <Link href={href}>
                    <Icon />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="absolute end-1 top-1.5 flex size-5 items-center justify-center rounded-md p-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    aria-label={`Toggle ${label}`}
                  >
                    <ChevronRight className="size-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {navigableChildren.map((child) => {
                      const ChildIcon = getResourceIcon(child.pathSegment)
                      const childLabel = t.has(child.pathSegment) ? t(child.pathSegment) : child.name
                      const childHref = `/p/${productId}/${child.key}`
                      const childActive = pathname === childHref || pathname.startsWith(childHref + "/")

                      return (
                        <SidebarMenuSubItem key={child.key}>
                          <SidebarMenuSubButton asChild isActive={childActive}>
                            <Link href={childHref}>
                              <ChildIcon className="size-3.5" />
                              <span>{childLabel}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        }

        // Resource without navigable children → simple item
        return (
          <SidebarMenuItem key={resource.key}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
              <Link href={href}>
                <Icon />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
