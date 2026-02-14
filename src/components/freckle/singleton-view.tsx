import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toTitleCase } from "@/lib/format"
import { renderValue } from "@/components/freckle/value-renderer"

/** Check if a value is a "simple" primitive (not object/array) */
function isPrimitive(v: unknown): boolean {
  return v === null || v === undefined || typeof v === "string" || typeof v === "number" || typeof v === "boolean"
}

/** Check if an object is flat (all values are primitives) */
function isFlatObject(obj: Record<string, unknown>): boolean {
  return Object.values(obj).every(isPrimitive)
}

/** Render a flat key-value row */
export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-border/50 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-end max-w-[60%] break-words">{value}</span>
    </div>
  )
}

/** Render a flat object as key-value rows in a card */
export function FlatObjectCard({ title, data }: { title?: string; data: Record<string, unknown> }) {
  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-6"}>
        {Object.entries(data).map(([key, value]) => (
          <InfoRow key={key} label={toTitleCase(key)} value={renderValue(key, value, undefined, { truncate: 200 })} />
        ))}
      </CardContent>
    </Card>
  )
}

/** Render an array of strings as a comma-separated list or badges */
export function StringList({ items }: { items: string[] }) {
  if (items.length <= 5) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className="font-normal">{item}</Badge>
        ))}
      </div>
    )
  }
  return <span className="text-sm">{items.join(", ")}</span>
}

/** Render a nested object as a structured card with sub-sections */
export function NestedObjectCard({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data)

  // If it's a flat object, just render as key-value
  if (isFlatObject(data)) {
    return <FlatObjectCard title={title} data={data} />
  }

  // Separate primitives from complex values
  const primitives = entries.filter(([, v]) => isPrimitive(v))
  const complex = entries.filter(([, v]) => !isPrimitive(v))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Render primitive fields as rows */}
        {primitives.length > 0 && (
          <div>
            {primitives.map(([key, value]) => (
              <InfoRow key={key} label={toTitleCase(key)} value={renderValue(key, value, undefined, { truncate: 200 })} />
            ))}
          </div>
        )}

        {/* Render complex sub-fields */}
        {complex.map(([key, value]) => {
          if (Array.isArray(value)) {
            // Array of primitives
            if (value.length === 0) {
              return <InfoRow key={key} label={toTitleCase(key)} value={<span className="text-muted-foreground">—</span>} />
            }
            if (value.every(isPrimitive)) {
              return (
                <div key={key} className="border-b border-border/50 py-3 last:border-0">
                  <p className="text-sm text-muted-foreground mb-2">{toTitleCase(key)}</p>
                  <StringList items={value.map(String)} />
                </div>
              )
            }
            // Array of objects
            return (
              <div key={key} className="border-b border-border/50 py-3 last:border-0">
                <p className="text-sm text-muted-foreground mb-2">{toTitleCase(key)}</p>
                <div className="space-y-2">
                  {value.map((item, i) => (
                    typeof item === "object" && item !== null
                      ? <div key={i} className="rounded-lg border bg-muted/30 p-3">
                          {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                            isPrimitive(v)
                              ? <InfoRow key={k} label={toTitleCase(k)} value={renderValue(k, v, undefined, { truncate: 200 })} />
                              : Array.isArray(v) && v.every(isPrimitive)
                                ? <div key={k} className="py-2"><p className="text-sm text-muted-foreground mb-1">{toTitleCase(k)}</p><StringList items={v.map(String)} /></div>
                                : <InfoRow key={k} label={toTitleCase(k)} value={<code className="text-xs">{JSON.stringify(v)}</code>} />
                          ))}
                        </div>
                      : <span key={i} className="text-sm">{String(item)}</span>
                  ))}
                </div>
              </div>
            )
          }

          if (typeof value === "object" && value !== null) {
            const obj = value as Record<string, unknown>
            // Check if this is a "dictionary" — object where keys are IDs/names and values are objects
            const vals = Object.values(obj)
            const isDictionary = vals.length > 0 && vals.every(v => typeof v === "object" && v !== null && !Array.isArray(v))

            if (isDictionary) {
              return (
                <div key={key} className="space-y-3 border-b border-border/50 py-3 last:border-0">
                  <p className="text-sm font-medium text-muted-foreground">{toTitleCase(key)}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(obj).map(([subKey, subValue]) => (
                      <div key={subKey} className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-sm font-semibold mb-2">{toTitleCase(subKey)}</p>
                        {Object.entries(subValue as Record<string, unknown>).map(([k, v]) => (
                          isPrimitive(v)
                            ? <InfoRow key={k} label={toTitleCase(k)} value={renderValue(k, v, undefined, { truncate: 200 })} />
                            : Array.isArray(v) && v.every(isPrimitive)
                              ? <div key={k} className="py-2"><p className="text-sm text-muted-foreground mb-1">{toTitleCase(k)}</p><StringList items={v.map(String)} /></div>
                              : <InfoRow key={k} label={toTitleCase(k)} value={<code className="text-xs">{JSON.stringify(v)}</code>} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            // Regular nested object — render as flat rows
            if (isFlatObject(obj)) {
              return (
                <div key={key} className="border-b border-border/50 py-3 last:border-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{toTitleCase(key)}</p>
                  {Object.entries(obj).map(([k, v]) => (
                    <InfoRow key={k} label={toTitleCase(k)} value={renderValue(k, v, undefined, { truncate: 200 })} />
                  ))}
                </div>
              )
            }

            // Mixed or deep nesting — recurse
            return (
              <div key={key} className="border-b border-border/50 py-3 last:border-0">
                <NestedObjectCard title={toTitleCase(key)} data={obj} />
              </div>
            )
          }

          return null
        })}
      </CardContent>
    </Card>
  )
}

export function SingletonView({ data, actions }: { data: Record<string, unknown>; actions?: React.ReactNode }) {
  const entries = Object.entries(data)

  // Separate by type: numbers (stat cards), primitives (info card), complex (nested sections)
  const numericEntries = entries.filter(([, v]) => typeof v === "number")
  const primitiveEntries = entries.filter(([, v]) => isPrimitive(v) && typeof v !== "number")
  const complexEntries = entries.filter(([, v]) => !isPrimitive(v))

  return (
    <div className="space-y-6">
      {/* Numeric stats as cards */}
      {numericEntries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {numericEntries.map(([key, value]) => (
            <Card key={key}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{toTitleCase(key)}</p>
                <p className="mt-1 text-2xl font-bold">{(value as number).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Simple primitive fields */}
      {primitiveEntries.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            {primitiveEntries.map(([key, value]) => (
              <InfoRow key={key} label={toTitleCase(key)} value={renderValue(key, value, undefined, { truncate: 200 })} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Nested objects and arrays as separate sections */}
      {complexEntries.map(([key, value]) => {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return <NestedObjectCard key={key} title={toTitleCase(key)} data={value as Record<string, unknown>} />
        }
        if (Array.isArray(value)) {
          if (value.length === 0) return null
          if (value.every(isPrimitive)) {
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{toTitleCase(key)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <StringList items={value.map(String)} />
                </CardContent>
              </Card>
            )
          }
          // Array of objects
          return (
            <NestedObjectCard key={key} title={toTitleCase(key)} data={Object.fromEntries(value.map((item, i) => [String(i), item]))} />
          )
        }
        return null
      })}

      {actions}
    </div>
  )
}
