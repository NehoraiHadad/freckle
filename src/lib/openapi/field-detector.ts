import type { JsonSchema } from "@/types/openapi"
import { isDateField } from "@/lib/entity-fields"

export interface DetectedFields {
  dateField: string | null
  descriptionField: string | null
  typeField: string | null
  idField: string | null
  actorField: string | null
  metricFields: string[]
  allFields: string[]
}

const ID_PATTERN = /^id$|_id$|^uuid$|Id$/
const TYPE_PATTERN = /^type$|^kind$|^category$|^status$|^event_type$|^event$/i
const DESCRIPTION_PATTERN = /description|message|text|summary|content/i
const ACTOR_PATTERN = /^actor$|^user$|^author$|^by$|^created_by$|^createdBy$/i

/**
 * Detect field roles from data items and optional OpenAPI response schema.
 * Priority: schema hints > name patterns > value heuristics.
 */
export function detectFields(
  items: Record<string, unknown>[],
  schema?: JsonSchema,
): DetectedFields {
  if (items.length === 0) {
    return { dateField: null, descriptionField: null, typeField: null, idField: null, actorField: null, metricFields: [], allFields: [] }
  }

  const allFields = collectAllFields(items)
  const result: DetectedFields = {
    dateField: null,
    descriptionField: null,
    typeField: null,
    idField: null,
    actorField: null,
    metricFields: [],
    allFields,
  }

  // Phase 1: Schema hints
  if (schema?.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (!allFields.includes(key)) continue

      if (!result.dateField && prop.format === "date-time") {
        result.dateField = key
      }
      if (!result.idField && prop.description?.toLowerCase().includes("identifier")) {
        result.idField = key
      }
      if (!result.typeField && prop.enum && prop.enum.length <= 20) {
        result.typeField = key
      }
    }
  }

  // Phase 2: Name patterns
  for (const key of allFields) {
    const sampleValue = items[0][key]

    if (!result.dateField && isDateField(key, sampleValue)) {
      result.dateField = key
    }
    if (!result.idField && ID_PATTERN.test(key)) {
      result.idField = key
    }
    if (!result.typeField && TYPE_PATTERN.test(key)) {
      result.typeField = key
    }
    if (!result.descriptionField && DESCRIPTION_PATTERN.test(key)) {
      result.descriptionField = key
    }
    if (!result.actorField && ACTOR_PATTERN.test(key)) {
      result.actorField = key
    }
  }

  // Phase 3: Value heuristics
  // Detect metric fields: consistently numeric values
  for (const key of allFields) {
    if (key === result.dateField || key === result.idField) continue
    const numericCount = items.filter(item => typeof item[key] === "number").length
    if (numericCount >= items.length * 0.8) {
      result.metricFields.push(key)
    }
  }

  // Fallback: description = longest avg string field (if not yet detected)
  if (!result.descriptionField) {
    let longestAvg = 0
    let longestKey: string | null = null
    for (const key of allFields) {
      if (key === result.dateField || key === result.idField || key === result.typeField || key === result.actorField) continue
      if (result.metricFields.includes(key)) continue
      const lengths = items
        .map(item => (typeof item[key] === "string" ? (item[key] as string).length : 0))
        .filter(l => l > 0)
      if (lengths.length === 0) continue
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
      if (avg > longestAvg && avg > 10) {
        longestAvg = avg
        longestKey = key
      }
    }
    result.descriptionField = longestKey
  }

  // Fallback: type = field with few unique values relative to row count
  if (!result.typeField) {
    for (const key of allFields) {
      if (key === result.dateField || key === result.idField || key === result.descriptionField || key === result.actorField) continue
      if (result.metricFields.includes(key)) continue
      const values = new Set(items.map(item => String(item[key] ?? "")))
      if (values.size <= 20 && values.size <= items.length * 0.2 && values.size >= 2) {
        result.typeField = key
        break
      }
    }
  }

  return result
}

function collectAllFields(items: Record<string, unknown>[]): string[] {
  const keys = new Set<string>()
  for (const item of items.slice(0, 10)) {
    for (const key of Object.keys(item)) {
      keys.add(key)
    }
  }
  return Array.from(keys)
}
