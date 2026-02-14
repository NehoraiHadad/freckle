import type { JsonSchema } from "@/types/openapi"
import { detectFields, type DetectedFields } from "./field-detector"
import { extractItems } from "./data-normalizer"

export type DataShape = "summary" | "time-series" | "event-log" | "list" | "scalar" | "empty"

export interface ClassifiedData {
  shape: DataShape
  fields: DetectedFields
  data: unknown
  items?: Record<string, unknown>[]
  title?: string
}

const EMPTY_FIELDS: DetectedFields = {
  dateField: null,
  descriptionField: null,
  typeField: null,
  idField: null,
  actorField: null,
  metricFields: [],
  allFields: [],
}

/**
 * Classify a response into a shape suitable for rendering.
 * Uses field detection + heuristics to determine the best visualization.
 */
export function classifyResponse(
  data: unknown,
  schema?: JsonSchema,
  operationSummary?: string,
): ClassifiedData {
  // null / undefined / empty array
  if (data == null) {
    return { shape: "empty", fields: EMPTY_FIELDS, data }
  }

  if (Array.isArray(data) && data.length === 0) {
    return { shape: "empty", fields: EMPTY_FIELDS, data }
  }

  // Primitive / scalar
  if (typeof data !== "object") {
    return { shape: "scalar", fields: EMPTY_FIELDS, data }
  }

  // Try to extract items from wrapper
  const items = extractItems(data)

  // No extractable items and not an array → summary object
  if (!items || items.length === 0) {
    if (!Array.isArray(data)) {
      return { shape: "summary", fields: EMPTY_FIELDS, data, title: operationSummary }
    }
    return { shape: "empty", fields: EMPTY_FIELDS, data }
  }

  // Single-item "array" that was actually a plain object → summary
  if (items.length === 1 && !Array.isArray(data)) {
    return { shape: "summary", fields: EMPTY_FIELDS, data, title: operationSummary }
  }

  // Detect fields
  const fields = detectFields(items, schema)

  // Time-series: has date field + at least 1 metric field, and metrics outnumber text fields
  if (fields.dateField && fields.metricFields.length >= 1) {
    const textFieldCount = fields.allFields.filter(
      f => f !== fields.dateField && !fields.metricFields.includes(f),
    ).length
    if (fields.metricFields.length >= textFieldCount) {
      return { shape: "time-series", fields, data, items, title: operationSummary }
    }
  }

  // Event-log: has date field + description field
  if (fields.dateField && fields.descriptionField) {
    return { shape: "event-log", fields, data, items, title: operationSummary }
  }

  // Default: list
  return { shape: "list", fields, data, items, title: operationSummary }
}
