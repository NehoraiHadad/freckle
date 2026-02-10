"use server";

import { revalidatePath } from "next/cache";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { appendLog } from "@/lib/db/audit-log";
import { classifyError } from "@/lib/api-client/errors";

export async function updateContent(
  productId: string,
  contentId: string,
  data: { status?: string; title?: string; metadata?: Record<string, unknown> },
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClientManager().getClient(productId);
    await client.content.update(contentId, data);

    appendLog({
      productId,
      action: "content.update",
      entityType: "content",
      entityId: contentId,
      details: { updatedFields: Object.keys(data) },
    });

    revalidatePath(`/p/${productId}/content`);
    revalidatePath(`/p/${productId}/content/${contentId}`);
    return { success: true };
  } catch (error) {
    const classified = classifyError(error);
    appendLog({
      productId,
      action: "content.update",
      entityType: "content",
      entityId: contentId,
      details: { updatedFields: Object.keys(data) },
      result: "error",
      errorMessage: classified.userMessage,
    });
    return { success: false, error: classified.userMessage };
  }
}

export async function deleteContent(
  productId: string,
  contentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClientManager().getClient(productId);
    await client.content.delete(contentId);

    appendLog({
      productId,
      action: "content.delete",
      entityType: "content",
      entityId: contentId,
    });

    revalidatePath(`/p/${productId}/content`);
    return { success: true };
  } catch (error) {
    const classified = classifyError(error);
    appendLog({
      productId,
      action: "content.delete",
      entityType: "content",
      entityId: contentId,
      result: "error",
      errorMessage: classified.userMessage,
    });
    return { success: false, error: classified.userMessage };
  }
}

export async function executeContentAction(
  productId: string,
  contentId: string,
  action: string,
  params?: Record<string, unknown>,
): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    const client = getClientManager().getClient(productId);
    const response = await client.content.action(contentId, action, params);

    appendLog({
      productId,
      action: `content.action.${action}`,
      entityType: "content",
      entityId: contentId,
      details: { action, params, result: response.result },
    });

    revalidatePath(`/p/${productId}/content/${contentId}`);
    return {
      success: true,
      result: typeof response.result === "string" ? response.result : JSON.stringify(response.result),
    };
  } catch (error) {
    const classified = classifyError(error);
    appendLog({
      productId,
      action: `content.action.${action}`,
      entityType: "content",
      entityId: contentId,
      details: { action, params },
      result: "error",
      errorMessage: classified.userMessage,
    });
    return { success: false, error: classified.userMessage };
  }
}
