"use client"

import type { ReactNode } from "react"
import { ProductContext, type ProductContextValue } from "@/hooks/use-product-context"
import type { Product } from "@/types/product"

interface ProductProviderProps {
  product: Product
  children: ReactNode
}

export function ProductProvider({ product, children }: ProductProviderProps) {
  const value: ProductContextValue = {
    product,
    capabilities: product.capabilities,
    supportedActions: product.supportedActions,
  }

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  )
}
