"use server";

import { z } from "zod";
import { AdminApiClient } from "@/lib/api-client/admin-api-client";
import {
  addProduct,
  updateProduct,
  deleteProduct as dbDeleteProduct,
  getProduct,
} from "@/lib/db/products";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { appendLog } from "@/lib/db/audit-log";
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
    baseUrl: formData.get("baseUrl"),
    apiKey: formData.get("apiKey"),
    description: formData.get("description") || undefined,
    iconUrl: formData.get("iconUrl") || undefined,
    displayOrder: formData.get("displayOrder") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, baseUrl, apiKey, description, iconUrl, displayOrder } = parsed.data;

  // Test connectivity
  const tempClient = new AdminApiClient({
    productId: "discovery",
    baseUrl,
    apiKey,
    timeout: 15_000,
  });

  try {
    await tempClient.health();
  } catch {
    return { error: "Could not reach the product. Check the URL and API key." };
  }

  let meta;
  try {
    meta = await tempClient.meta();
  } catch {
    return { error: "Product is reachable but /meta endpoint failed." };
  }

  // Check for duplicate
  const existing = getProduct(meta.product);
  if (existing) {
    return { error: `Product "${meta.product}" is already registered.` };
  }

  try {
    addProduct({
      id: meta.product,
      name: name || meta.displayName,
      description: description || meta.description,
      baseUrl,
      apiKey,
      iconUrl: iconUrl || undefined,
      displayOrder,
    });

    // Update with discovered metadata
    updateProduct(meta.product, {
      capabilities: meta.capabilities,
      supportedActions: meta.supportedActions,
      apiStandardVersion: meta.apiStandardVersion,
      productVersion: meta.version,
    });

    // Attempt OpenAPI spec discovery
    try {
      const rawSpec = await tempClient.fetchOpenApiSpec();
      if (rawSpec) {
        const parsed = parseOpenApiSpec(
          rawSpec as Parameters<typeof parseOpenApiSpec>[0],
          baseUrl,
          meta.product,
        );

        // Store spec and parsed data
        updateProduct(meta.product, {
          openapiSpec: JSON.stringify(rawSpec),
          specFetchedAt: new Date().toISOString(),
          discoveryMode: "openapi",
        });

        storeResources(meta.product, parsed.resources, parsed.allOperations);
      }
    } catch (error) {
      // OpenAPI is optional — log but don't fail registration
      console.warn("[addProduct] OpenAPI spec discovery failed:", error instanceof Error ? error.message : error);
    }

    getClientManager().invalidateAll();

    appendLog({
      productId: meta.product,
      action: "product.add",
      entityType: "product",
      entityId: meta.product,
      details: { name: meta.displayName, baseUrl },
    });

    revalidatePath("/");
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
      await testClient.health();
    } catch {
      return { error: "Could not reach the product with the new configuration." };
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
  return { success: true };
}

export async function testConnection(
  baseUrl: string,
  apiKey: string,
): Promise<{ error?: string; health?: unknown; meta?: unknown }> {
  const client = new AdminApiClient({
    productId: "test",
    baseUrl,
    apiKey,
    timeout: 15_000,
  });

  let health;
  try {
    health = await client.health();
  } catch {
    return { error: "Could not reach the product. Check the URL and API key." };
  }

  let meta;
  try {
    meta = await client.meta();
  } catch {
    return { error: "Product is reachable but /meta endpoint failed.", health };
  }

  return { health, meta };
}

export async function refreshProductMeta(id: string): Promise<{ error?: string; success?: boolean }> {
  const idError = validateProductId(id);
  if (idError) return idError;

  const product = getProduct(id);
  if (!product) {
    return { error: "Product not found" };
  }

  const client = getClientManager().getClient(id);

  try {
    const meta = await client.meta();
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
    return { error: "Failed to fetch product metadata." };
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

