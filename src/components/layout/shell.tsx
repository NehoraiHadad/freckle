import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/sidebar"
import { AppHeader, type BreadcrumbSegment } from "@/components/layout/header"
import { getAllProductsForDisplay, getProduct } from "@/lib/db/products"
import type { ReactNode } from "react"
import type { ApiResource } from "@/types/openapi"

interface ShellProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbSegment[]
  currentProductId?: string
  resourceTree?: ApiResource[]  // OpenAPI resource tree for the current product
}

export function Shell({ children, breadcrumbs, currentProductId, resourceTree }: ShellProps) {
  const products = getAllProductsForDisplay()
  const currentProduct = currentProductId ? getProduct(currentProductId) : null

  return (
    <SidebarProvider>
      <AppSidebar products={products} currentProduct={currentProduct} resourceTree={resourceTree} />
      <SidebarInset>
        <AppHeader breadcrumbs={breadcrumbs} />
        <main id="main-content" className="flex-1 p-3 sm:p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
