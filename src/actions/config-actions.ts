"use server"

import { getClientManager } from "@/lib/api-client/product-client-manager"
import { appendLog } from "@/lib/db/audit-log"
import { classifyError } from "@/lib/api-client/errors"
import { revalidatePath } from "next/cache"

export async function updateConfig(
  productId: string,
  settings: Record<string, unknown>,
): Promise<{ success: boolean; error?: string; updatedAt?: string }> {
  try {
    const client = getClientManager().getClient(productId)
    const result = await client.config.update(settings)

    appendLog({
      productId,
      action: "config.update",
      entityType: "config",
      details: { settingsKeys: Object.keys(settings) },
    })

    revalidatePath(`/p/${productId}/config`)
    return { success: true, updatedAt: result.updatedAt }
  } catch (e) {
    const classified = classifyError(e)

    appendLog({
      productId,
      action: "config.update",
      entityType: "config",
      details: { settingsKeys: Object.keys(settings) },
      result: "error",
      errorMessage: classified.userMessage,
    })

    return { success: false, error: classified.userMessage }
  }
}
