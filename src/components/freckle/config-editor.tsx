"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Save, Loader2, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { updateConfig } from "@/actions/config-actions"

interface ConfigEditorProps {
  productId: string
  initialSettings: Record<string, unknown>
  updatedAt: string
  updatedBy: string
}

/** camelCase/snake_case → Title Case */
function toLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Ms$/, " (ms)")
    .trim()
}

type FlatEntry = {
  path: string[]
  value: string | number | boolean
}

/** Flatten a nested object into path+value pairs (only leaves) */
function flattenSettings(obj: Record<string, unknown>, prefix: string[] = []): FlatEntry[] {
  const entries: FlatEntry[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = [...prefix, key]
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...flattenSettings(value as Record<string, unknown>, path))
    } else {
      entries.push({ path, value: value as string | number | boolean })
    }
  }
  return entries
}

/** Group flat entries by their top-level key */
function groupBySection(entries: FlatEntry[]): Record<string, FlatEntry[]> {
  const groups: Record<string, FlatEntry[]> = {}
  for (const entry of entries) {
    const section = entry.path[0]
    if (!groups[section]) groups[section] = []
    groups[section].push(entry)
  }
  return groups
}

/** Rebuild a nested object from flat entries */
function unflattenEntries(entries: FlatEntry[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const { path, value } of entries) {
    let current = result
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]] || typeof current[path[i]] !== "object") {
        current[path[i]] = {}
      }
      current = current[path[i]] as Record<string, unknown>
    }
    current[path[path.length - 1]] = value
  }
  return result
}

export function ConfigEditor({
  productId,
  initialSettings,
  updatedAt,
  updatedBy,
}: ConfigEditorProps) {
  const safeSettings = initialSettings ?? {}
  const [entries, setEntries] = useState<FlatEntry[]>(() => flattenSettings(safeSettings))
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("config")

  const sections = groupBySection(entries)

  function updateEntry(path: string[], newValue: string | number | boolean) {
    setEntries((prev) =>
      prev.map((e) =>
        e.path.join(".") === path.join(".") ? { ...e, value: newValue } : e
      )
    )
  }

  function handleSave() {
    startTransition(async () => {
      const parsed = unflattenEntries(entries)
      const res = await updateConfig(productId, parsed)
      if (res.success) {
        toast.success(t("configSaved"))
      } else {
        toast.error(res.error || t("configSaveFailed"))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("productSettings")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("lastUpdated", { date: new Date(updatedAt).toLocaleString() })}
          {updatedBy && t("lastUpdatedBy", { user: updatedBy })}
        </p>
      </CardHeader>
      <CardContent>
        {Object.keys(sections).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSettings")}</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(sections).map(([section, sectionEntries]) => (
              <ConfigSection
                key={section}
                section={section}
                entries={sectionEntries}
                onUpdate={updateEntry}
                disabled={isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
      {entries.length > 0 && (
        <CardFooter>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="me-1 size-3.5 animate-spin" />
            ) : (
              <Save className="me-1 size-3.5" />
            )}
            {t("saveChanges")}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

function ConfigSection({
  section,
  entries,
  onUpdate,
  disabled,
}: {
  section: string
  entries: FlatEntry[]
  onUpdate: (path: string[], value: string | number | boolean) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium hover:bg-muted">
        <div className="flex items-center gap-2">
          {toLabel(section)}
          <Badge variant="secondary" className="text-xs font-normal">
            {entries.length}
          </Badge>
        </div>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-3 ps-3 border-s-2 border-muted ms-2">
          {entries.map((entry) => {
            const fieldKey = entry.path.slice(1).join(".")
            const label = entry.path.length > 2
              ? entry.path.slice(1).map(toLabel).join(" / ")
              : toLabel(entry.path[entry.path.length - 1])

            return (
              <ConfigField
                key={fieldKey}
                id={`config-${entry.path.join("-")}`}
                label={label}
                value={entry.value}
                onChange={(v) => onUpdate(entry.path, v)}
                disabled={disabled}
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ConfigField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string | number | boolean
  onChange: (v: string | number | boolean) => void
  disabled: boolean
}) {
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between py-1">
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        <Switch
          id={id}
          checked={value}
          onCheckedChange={(checked) => onChange(checked)}
          disabled={disabled}
        />
      </div>
    )
  }

  if (typeof value === "number") {
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          disabled={disabled}
          className="max-w-xs"
        />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <Input
        id={id}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  )
}
