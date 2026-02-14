import { getDb } from "./index";
import { encrypt, decrypt } from "../crypto";
import { safeJsonParse } from "./utils";
import type { Product, ProductInput, ProductForDisplay } from "@/types/product";
import type { DiscoveryMode } from "@/types/openapi";

export function getAllProducts(): Product[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM products ORDER BY display_order, name").all();
  return rows.map(deserializeProduct);
}

export function getAllProductsForDisplay(): ProductForDisplay[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM products ORDER BY display_order, name").all();
  return rows.map(deserializeProductForDisplay);
}

export function getProduct(id: string): Product | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  return row ? deserializeProduct(row as Record<string, unknown>) : null;
}

export function addProduct(input: ProductInput): Product {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO products (id, name, description, base_url, api_key, icon_url, display_order, status, added_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    input.id,
    input.name,
    input.description ?? null,
    input.baseUrl,
    encrypt(input.apiKey),
    input.iconUrl ?? null,
    input.displayOrder ?? 0,
    now,
    now,
  );
  return getProduct(input.id)!;
}

const UPDATE_FIELD_MAP: Record<string, { column: string; transform?: (v: unknown) => unknown }> = {
  name: { column: "name" },
  description: { column: "description" },
  baseUrl: { column: "base_url" },
  apiKey: { column: "api_key", transform: (v) => encrypt(v as string) },
  iconUrl: { column: "icon_url" },
  displayOrder: { column: "display_order" },
  capabilities: { column: "capabilities", transform: (v) => JSON.stringify(v) },
  supportedActions: { column: "supported_actions", transform: (v) => JSON.stringify(v) },
  apiStandardVersion: { column: "api_standard_version" },
  productVersion: { column: "product_version" },
  status: { column: "status" },
  openapiSpec: { column: "openapi_spec" },
  openapiUrl: { column: "openapi_url" },
  specFetchedAt: { column: "spec_fetched_at" },
  discoveryMode: { column: "discovery_mode" },
};

export function updateProduct(
  id: string,
  updates: Partial<Pick<ProductInput, "name" | "description" | "baseUrl" | "apiKey" | "iconUrl" | "displayOrder">> & {
    capabilities?: string[];
    supportedActions?: Record<string, string[]>;
    apiStandardVersion?: string;
    productVersion?: string;
    status?: string;
    openapiSpec?: string | null;
    openapiUrl?: string | null;
    specFetchedAt?: string | null;
    discoveryMode?: DiscoveryMode;
  },
): Product | null {
  const db = getDb();
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  for (const [key, mapping] of Object.entries(UPDATE_FIELD_MAP)) {
    const value = (updates as Record<string, unknown>)[key];
    if (value !== undefined) {
      sets.push(`${mapping.column} = ?`);
      values.push(mapping.transform ? mapping.transform(value) : value);
    }
  }

  values.push(id);
  db.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getProduct(id);
}

export function deleteProduct(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
  return result.changes > 0;
}

export function updateProductHealth(
  id: string,
  healthStatus: string,
  version?: string,
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE products
    SET health_status = ?, product_version = COALESCE(?, product_version),
        last_health_check = ?, updated_at = ?
    WHERE id = ?
  `).run(healthStatus, version ?? null, now, now, id);
}

function deserializeProduct(row: unknown): Product {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    baseUrl: r.base_url as string,
    apiKey: decrypt(r.api_key as string),
    iconUrl: (r.icon_url as string) ?? null,
    status: (r.status as Product["status"]) ?? "active",
    healthStatus: (r.health_status as Product["healthStatus"]) ?? "unknown",
    lastHealthCheck: (r.last_health_check as string) ?? null,
    capabilities: safeJsonParse<string[]>(r.capabilities, []),
    supportedActions: safeJsonParse<Record<string, string[]>>(r.supported_actions, {}),
    apiStandardVersion: (r.api_standard_version as string) ?? null,
    productVersion: (r.product_version as string) ?? null,
    displayOrder: (r.display_order as number) ?? 0,
    addedAt: r.added_at as string,
    updatedAt: r.updated_at as string,
    openapiSpec: (r.openapi_spec as string) ?? null,
    openapiUrl: (r.openapi_url as string) ?? null,
    specFetchedAt: (r.spec_fetched_at as string) ?? null,
    discoveryMode: (r.discovery_mode as DiscoveryMode) || "openapi",
  };
}

function deserializeProductForDisplay(row: unknown): ProductForDisplay {
  const product = deserializeProduct(row);
  const { apiKey, openapiSpec, ...display } = product;
  void apiKey; void openapiSpec;
  return display;
}
