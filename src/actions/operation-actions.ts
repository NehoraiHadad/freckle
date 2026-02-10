"use server"

import { getClientManager } from "@/lib/api-client/product-client-manager"
import { appendLog } from "@/lib/db/audit-log"
import { classifyError } from "@/lib/api-client/errors"
import type { ActionResponse } from "@/types/admin-api"

export async function executeOperation(
  productId: string,
  action: string,
  params?: Record<string, unknown>,
): Promise<{ success: boolean; data?: ActionResponse; error?: string }> {
  try {
    const client = getClientManager().getClient(productId)
    const result = await client.runOperation(action, params)

    appendLog({
      productId,
      action: `operation.${action}`,
      entityType: "operation",
      details: { action, params, result },
    })

    return { success: true, data: result }
  } catch (e) {
    const classified = classifyError(e)

    appendLog({
      productId,
      action: `operation.${action}`,
      entityType: "operation",
      details: { action, params },
      result: "error",
      errorMessage: classified.userMessage,
    })

    return { success: false, error: classified.userMessage }
  }
}
