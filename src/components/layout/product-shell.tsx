import { Shell } from "@/components/layout/shell"
import { getProductResources } from "@/lib/db/api-resources"
import type { BreadcrumbSegment } from "@/components/layout/header"
import type { ReactNode } from "react"

interface ProductShellProps {
  children: ReactNode
  productId: string
  breadcrumbs: BreadcrumbSegment[]
}

export function ProductShell({ children, productId, breadcrumbs }: ProductShellProps) {
  const resourceTree = getProductResources(productId)

  return (
    <Shell
      currentProductId={productId}
      resourceTree={resourceTree}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </Shell>
  )
}
