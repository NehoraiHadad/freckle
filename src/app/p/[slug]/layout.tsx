import { notFound } from "next/navigation"
import { getProduct } from "@/lib/db/products"
import { getProductResources } from "@/lib/db/api-resources"
import { ProductProvider } from "@/components/layout/product-provider"
import { Shell } from "@/components/layout/shell"
import type { ReactNode } from "react"

interface ProductLayoutProps {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function ProductLayout({
  children,
  params,
}: ProductLayoutProps) {
  const { slug } = await params
  const product = getProduct(slug)

  if (!product) {
    notFound()
  }

  // Fetch OpenAPI resource tree
  const resourceTree = getProductResources(slug)

  return (
    <ProductProvider product={product}>
      <Shell
        currentProductId={product.id}
        resourceTree={resourceTree}
        breadcrumbs={[
          { label: "Freckle", href: "/" },
          { label: product.name },
        ]}
      >
        {children}
      </Shell>
    </ProductProvider>
  )
}
