"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Package,
  Settings,
  Users,
  FileText,
  BarChart3,
  Play,
  Wrench,
  LogOut,
  ScrollText,
  MessageSquare,
  CreditCard,
  LayoutList,
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
import type { Product, ProductForDisplay } from "@/types/product"

interface AppSidebarProps {
  products: ProductForDisplay[]
  currentProduct?: Product | ProductForDisplay | null
}

/** Icon mapping for capabilities */
const CAPABILITY_ICONS: Record<string, typeof Users> = {
  users: Users,
  content: FileText,
  analytics: BarChart3,
  config: Wrench,
  operations: Play,
  feedback: MessageSquare,
  drafts: ScrollText,
  credits: CreditCard,
};

/** Convert slug to Title Case */
function toTitleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getProductNav(
  product: Product | ProductForDisplay,
  t: (key: string) => string,
): NavItem[] {
  const slug = product.id
  const caps = product.capabilities

  const items: NavItem[] = [
    { href: `/p/${slug}`, label: t("dashboard"), icon: LayoutDashboard },
  ]

  // All capabilities get nav items — Next.js static routes take priority
  // for capabilities with dedicated pages (users, content, analytics, config, operations)
  for (const cap of caps) {
    const Icon = CAPABILITY_ICONS[cap] || LayoutList
    const label = t(cap) !== `nav.${cap}` ? t(cap) : toTitleCase(cap)
    items.push({ href: `/p/${slug}/${cap}`, label, icon: Icon })
  }

  return items
}

export function AppSidebar({ products, currentProduct }: AppSidebarProps) {
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
              <SidebarNav items={getProductNav(activeProduct, t)} />
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
