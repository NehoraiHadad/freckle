import type { ApiResource } from "@/types/openapi";

export function collectResourceKeys(resources: ApiResource[]): Set<string> {
  const keys = new Set<string>();
  function walk(rs: ApiResource[]) {
    for (const r of rs) {
      keys.add(r.key);
      walk(r.children);
    }
  }
  walk(resources);
  return keys;
}
