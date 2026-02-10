"use client"

import { createContext, useContext } from "react"
import type { Product } from "@/types/product"

export interface ProductContextValue {
  product: Product
  capabilities: string[]
  supportedActions: Record<string, string[]>
  hasCapability: (cap: string) => boolean
}

export const ProductContext = createContext<ProductContextValue | null>(null)

export function useProductContext(): ProductContextValue {
  const ctx = useContext(ProductContext)
  if (!ctx) {
    throw new Error("useProductContext must be used within a ProductProvider")
  }
  return ctx
}
