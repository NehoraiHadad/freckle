"use server";

import { revalidatePath } from "next/cache";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { appendLog } from "@/lib/db/audit-log";
import { classifyError } from "@/lib/api-client/errors";

export async function updateUser(
  productId: string,
  userId: string,
  data: { role?: string; status?: string; name?: string; metadata?: Record<string, unknown> },
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClientManager().getClient(productId);
    await client.users.update(userId, data);

    appendLog({
      productId,
      action: "user.update",
      entityType: "user",
      entityId: userId,
      details: { updatedFields: Object.keys(data) },
    });

    revalidatePath(`/p/${productId}/users`);
    revalidatePath(`/p/${productId}/users/${userId}`);
    return { success: true };
  } catch (error) {
    const classified = classifyError(error);
    appendLog({
      productId,
      action: "user.update",
      entityType: "user",
      entityId: userId,
      details: { updatedFields: Object.keys(data) },
      result: "error",
      errorMessage: classified.userMessage,
    });
    return { success: false, error: classified.userMessage };
  }
}

export async function deleteUser(
  productId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClientManager().getClient(productId);
    await client.users.delete(userId);

    appendLog({
      productId,
      action: "user.delete",
      entityType: "user",
      entityId: userId,
    });

    revalidatePath(`/p/${productId}/users`);
    return { success: true };
  } catch (error) {
    const classified = classifyError(error);
    appendLog({
      productId,
      action: "user.delete",
      entityType: "user",
      entityId: userId,
      result: "error",
      errorMessage: classified.userMessage,
    });
    return { success: false, error: classified.userMessage };
  }
}

export async function executeUserAction(
  productId: string,
  userId: string,
  action: string,
  params?: Record<string, unknown>,
): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    const client = getClientManager().getClient(productId);
    const response = await client.users.action(userId, action, params);

    appendLog({
      productId,
      action: `user.action.${action}`,
      entityType: "user",
      entityId: userId,
      details: { action, params, result: response.result },
    });

    revalidatePath(`/p/${productId}/users/${userId}`);
    return {
      success: true,
      result: typeof response.result === "string" ? response.result : JSON.stringify(response.result),
    };
  } catch (error) {
    const classified = classifyError(error);
    appendLog({
      productId,
      action: `user.action.${action}`,
      entityType: "user",
      entityId: userId,
      details: { action, params },
      result: "error",
      errorMessage: classified.userMessage,
    });
    return { success: false, error: classified.userMessage };
  }
}
