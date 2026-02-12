import type { ApiResource } from "@/types/openapi"

/** Recursively find a resource in a resource tree by key */
export function findResource(resources: ApiResource[], key: string): ApiResource | undefined {
  for (const r of resources) {
    if (r.key === key) return r
    const found = findResource(r.children, key)
    if (found) return found
  }
  return undefined
}
