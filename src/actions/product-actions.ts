"use server";

import { z } from "zod";
import { AdminApiClient } from "@/lib/api-client/admin-api-client";
import {
  addProduct,
  updateProduct,
  deleteProduct as dbDeleteProduct,
  getProduct,
} from "@/lib/db/products";
import { getDb } from "@/lib/db";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { appendLog } from "@/lib/db/audit-log";
import type { HealthResponse, MetaResponse } from "@/types/admin-api";
import { revalidatePath } from "next/cache";
import { parseOpenApiSpec } from "@/lib/openapi/spec-parser";
import { storeResources } from "@/lib/db/api-resources";

const PRODUCT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function validateProductId(id: string): { error?: string } | null {
  if (!id || !PRODUCT_ID_PATTERN.test(id)) {
    return { error: "Invalid product ID" };
  }
  return null;
}

const productFormSchema = z.object({
  name: z.string().optional(),
  productId: z.string().regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, dashes, and underscores").optional(),
  baseUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string().min(1, "API key is required"),
  description: z.string().optional(),
  iconUrl: z.string().url().optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

export async function addProductAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = productFormSchema.safeParse({
    name: formData.get("name") || undefined,
    productId: formData.get("productId") || undefined,
    baseUrl: formData.get("baseUrl"),
    apiKey: formData.get("apiKey"),
    description: formData.get("description") || undefined,
    iconUrl: formData.get("iconUrl") || undefined,
    displayOrder: formData.get("displayOrder") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, productId: manualProductId, baseUrl, apiKey, description, iconUrl, displayOrder } = parsed.data;

  // Test connectivity
  const tempClient = new AdminApiClient({
    productId: "discovery",
    baseUrl,
    apiKey,
    timeout: 15_000,
  });

  // Try /health — soft fail
  try {
    await tempClient.fetchJson("/health");
  } catch {
    // Health endpoint is optional — continue
  }

  // Try /meta — soft fail
  let meta: MetaResponse | null = null;
  try {
    meta = await tempClient.fetchJson<MetaResponse>("/meta");
  } catch {
    // Meta endpoint is optional — continue
  }

  // Determine product ID from meta or manual input
  const resolvedProductId = meta?.product ?? manualProductId;
  if (!resolvedProductId) {
    return { error: "Product ID is required when /meta endpoint is unavailable." };
  }

  // Check for duplicate
  const existing = getProduct(resolvedProductId);
  if (existing) {
    return { error: `Product "${resolvedProductId}" is already registered.` };
  }

  try {
    const db = getDb();
    db.transaction(() => {
      addProduct({
        id: resolvedProductId,
        name: name || (meta?.displayName as string | undefined) || resolvedProductId,
        description: description || (meta?.description as string | undefined),
        baseUrl,
        apiKey,
        iconUrl: iconUrl || undefined,
        displayOrder,
      });

      // Update with discovered metadata if available
      if (meta) {
        updateProduct(resolvedProductId, {
          capabilities: meta.capabilities,
          supportedActions: meta.supportedActions,
          apiStandardVersion: meta.apiStandardVersion,
          productVersion: meta.version,
        });
      }
    })();

    // Attempt OpenAPI spec discovery
    try {
      const rawSpec = await tempClient.fetchOpenApiSpec();
      if (rawSpec) {
        const specParsed = parseOpenApiSpec(
          rawSpec as Parameters<typeof parseOpenApiSpec>[0],
          baseUrl,
          resolvedProductId,
        );

        // Store spec and parsed data
        updateProduct(resolvedProductId, {
          openapiSpec: JSON.stringify(rawSpec),
          specFetchedAt: new Date().toISOString(),
          discoveryMode: "openapi",
        });

        storeResources(resolvedProductId, specParsed.resources, specParsed.allOperations);
      }
    } catch (error) {
      // OpenAPI is optional — log but don't fail registration
      console.warn("[addProduct] OpenAPI spec discovery failed:", error instanceof Error ? error.message : error);
    }

    getClientManager().invalidateAll();

    appendLog({
      productId: resolvedProductId,
      action: "product.add",
      entityType: "product",
      entityId: resolvedProductId,
      details: { name: name || meta?.displayName || resolvedProductId, baseUrl },
    });

    revalidatePath("/");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to add product" };
  }
}

export async function updateProductAction(
  id: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const idError = validateProductId(id);
  if (idError) return idError;

  const parsed = productFormSchema.partial().safeParse({
    name: formData.get("name") || undefined,
    baseUrl: formData.get("baseUrl") || undefined,
    apiKey: formData.get("apiKey") || undefined,
    description: formData.get("description") || undefined,
    iconUrl: formData.get("iconUrl") || undefined,
    displayOrder: formData.get("displayOrder") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const updates = parsed.data;
  const needsRetest = updates.baseUrl || updates.apiKey;

  if (needsRetest) {
    const current = getProduct(id);
    if (!current) return { error: "Product not found" };

    const testClient = new AdminApiClient({
      productId: id,
      baseUrl: updates.baseUrl || current.baseUrl,
      apiKey: updates.apiKey || current.apiKey,
      timeout: 15_000,
    });

    try {
      await testClient.fetchJson("/health");
    } catch {
      // Soft-fail: warn but don't block the update
      console.warn(`[updateProduct] Health check failed for ${id} with new config`);
    }
  }

  const status = formData.get("status") as string | null;

  updateProduct(id, {
    name: updates.name,
    description: updates.description,
    baseUrl: updates.baseUrl,
    apiKey: updates.apiKey,
    iconUrl: updates.iconUrl || undefined,
    displayOrder: updates.displayOrder,
    ...(status && { status }),
  });

  getClientManager().invalidate(id);

  appendLog({
    productId: id,
    action: "product.update",
    entityType: "product",
    entityId: id,
    details: { updatedFields: Object.keys(updates) },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/p/${id}`);
  return { success: true };
}

export async function deleteProductAction(id: string): Promise<{ error?: string; success?: boolean }> {
  const idError = validateProductId(id);
  if (idError) return idError;

  const product = getProduct(id);
  if (!product) {
    return { error: "Product not found" };
  }

  dbDeleteProduct(id);
  getClientManager().invalidate(id);

  appendLog({
    productId: id,
    action: "product.delete",
    entityType: "product",
    entityId: id,
    details: { name: product.name },
  });

  revalidatePath("/");
  revalidatePath("/products");
  return { success: true };
}

export async function testConnection(
  baseUrl: string,
  apiKey: string,
): Promise<{ error?: string; health?: unknown; meta?: unknown; healthFailed?: boolean; metaFailed?: boolean }> {
  const client = new AdminApiClient({
    productId: "test",
    baseUrl,
    apiKey,
    timeout: 15_000,
  });

  let health;
  let healthFailed = false;
  try {
    health = await client.fetchJson<HealthResponse>("/health");
  } catch {
    healthFailed = true;
  }

  let meta;
  let metaFailed = false;
  try {
    meta = await client.fetchJson<MetaResponse>("/meta");
  } catch {
    metaFailed = true;
  }

  // If both fail, the product is truly unreachable
  if (healthFailed && metaFailed) {
    return { error: "Could not reach the product. Check the URL and API key." };
  }

  // Also try fetching OpenAPI spec as a connectivity signal if both endpoints failed
  return { health, meta, healthFailed, metaFailed };
}

export async function refreshProductMeta(id: string): Promise<{ error?: string; warning?: string; success?: boolean }> {
  const idError = validateProductId(id);
  if (idError) return idError;

  const product = getProduct(id);
  if (!product) {
    return { error: "Product not found" };
  }

  const client = getClientManager().getClient(id);

  try {
    const meta = await client.fetchJson<MetaResponse>("/meta");
    updateProduct(id, {
      capabilities: meta.capabilities,
      supportedActions: meta.supportedActions,
      apiStandardVersion: meta.apiStandardVersion,
      productVersion: meta.version,
    });

    getClientManager().invalidate(id);
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: true, warning: "Product /meta endpoint is not available. Metadata was not updated." };
  }
}

export async function refreshOpenApiSpec(
  productId: string,
  customUrl?: string,
): Promise<{ error?: string; success?: boolean; operationCount?: number }> {
  const idError = validateProductId(productId);
  if (idError) return idError;

  const product = getProduct(productId);
  if (!product) {
    return { error: "Product not found" };
  }

  const client = getClientManager().getClient(productId);

  try {
    const rawSpec = await client.fetchOpenApiSpec(customUrl);
    if (!rawSpec) {
      return { error: "Could not find an OpenAPI spec. Try providing a URL manually." };
    }

    const parsed = parseOpenApiSpec(
      rawSpec as Parameters<typeof parseOpenApiSpec>[0],
      product.baseUrl,
      productId,
    );

    // Store spec and parsed data
    updateProduct(productId, {
      openapiSpec: JSON.stringify(rawSpec),
      openapiUrl: customUrl || null,
      specFetchedAt: new Date().toISOString(),
      discoveryMode: "openapi",
    });

    storeResources(productId, parsed.resources, parsed.allOperations);

    appendLog({
      productId,
      action: "openapi.refresh",
      entityType: "product",
      entityId: productId,
      details: { operationCount: parsed.allOperations.length, resourceCount: parsed.resources.length },
    });

    revalidatePath("/");
    return { success: true, operationCount: parsed.allOperations.length };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch/parse OpenAPI spec" };
  }
}

