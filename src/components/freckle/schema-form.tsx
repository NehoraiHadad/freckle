"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { JsonSchema } from "@/types/openapi";

interface SchemaFormProps {
  schema: JsonSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function SchemaForm({ schema, values, onChange, disabled }: SchemaFormProps) {
  if (!schema.properties) return null;

  const requiredFields = new Set(schema.required ?? []);

  return (
    <div className="space-y-4">
      {Object.entries(schema.properties).map(([key, fieldSchema]) => (
        <SchemaField
          key={key}
          name={key}
          schema={fieldSchema}
          value={values[key]}
          required={requiredFields.has(key)}
          disabled={disabled}
          onChange={(val) => onChange({ ...values, [key]: val })}
        />
      ))}
    </div>
  );
}

interface SchemaFieldProps {
  name: string;
  schema: JsonSchema;
  value: unknown;
  required: boolean;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}

function SchemaField({ name, schema, value, required, disabled, onChange }: SchemaFieldProps) {
  const label = schema.description || toLabel(name);
  const fieldId = `schema-field-${name}`;

  // Nested object with properties → render as a group of sub-fields
  if (schema.type === "object" && schema.properties) {
    const objValue = (value && typeof value === "object" && !Array.isArray(value))
      ? value as Record<string, unknown>
      : {};
    const nestedRequired = new Set(schema.required ?? []);

    return (
      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium">
          {toLabel(name)}
          {required && <span className="text-destructive ms-1">*</span>}
        </legend>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        {Object.entries(schema.properties).map(([subKey, subSchema]) => (
          <SchemaField
            key={subKey}
            name={subKey}
            schema={subSchema}
            value={objValue[subKey]}
            required={nestedRequired.has(subKey)}
            disabled={disabled}
            onChange={(subVal) => {
              const updated = { ...objValue };
              if (subVal === undefined) {
                delete updated[subKey];
              } else {
                updated[subKey] = subVal;
              }
              onChange(Object.keys(updated).length > 0 ? updated : undefined);
            }}
          />
        ))}
      </fieldset>
    );
  }

  // Object with additionalProperties (dynamic key-value map) but no fixed properties
  if (schema.type === "object" && schema.additionalProperties && typeof schema.additionalProperties === "object" && !schema.properties) {
    const mapValue = (value && typeof value === "object" && !Array.isArray(value))
      ? value as Record<string, unknown>
      : {};
    const entries = Object.entries(mapValue);
    const valueSchema = schema.additionalProperties;

    return (
      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium">
          {toLabel(name)}
          {required && <span className="text-destructive ms-1">*</span>}
        </legend>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        {entries.map(([entryKey, entryValue]) => (
          <div key={entryKey} className="flex items-end gap-2">
            <div className="flex-1">
              <MapEntryField
                entryKey={entryKey}
                entryValue={entryValue}
                valueSchema={valueSchema}
                disabled={disabled}
                onChangeValue={(newVal) => {
                  const updated = { ...mapValue, [entryKey]: newVal };
                  onChange(updated);
                }}
                onChangeKey={(newKey) => {
                  if (newKey === entryKey || !newKey) return;
                  const updated: Record<string, unknown> = {};
                  for (const [k, v] of Object.entries(mapValue)) {
                    updated[k === entryKey ? newKey : k] = v;
                  }
                  onChange(updated);
                }}
              />
            </div>
            <button
              type="button"
              className="mb-0.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                const updated = { ...mapValue };
                delete updated[entryKey];
                onChange(Object.keys(updated).length > 0 ? updated : undefined);
              }}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          onClick={() => {
            const newKey = `new_${entries.length + 1}`;
            const defaultVal = valueSchema.type === "boolean" ? false
              : valueSchema.type === "number" || valueSchema.type === "integer" ? 0
              : valueSchema.type === "object" ? {}
              : "";
            onChange({ ...mapValue, [newKey]: defaultVal });
          }}
          disabled={disabled}
        >
          + Add entry
        </button>
      </fieldset>
    );
  }

  // Array of items → render with add/remove capability
  if (schema.type === "array" && schema.items) {
    const arrValue = Array.isArray(value) ? value : [];
    const itemSchema = schema.items;

    return (
      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium">
          {toLabel(name)}
          {required && <span className="text-destructive ms-1">*</span>}
        </legend>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        {arrValue.map((item, idx) => (
          <div key={idx} className="flex items-end gap-2">
            <div className="flex-1">
              <SchemaField
                name={`${name}[${idx}]`}
                schema={itemSchema}
                value={item}
                required={false}
                disabled={disabled}
                onChange={(val) => {
                  const updated = [...arrValue];
                  updated[idx] = val;
                  onChange(updated);
                }}
              />
            </div>
            <button
              type="button"
              className="mb-0.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                const updated = arrValue.filter((_, i) => i !== idx);
                onChange(updated.length > 0 ? updated : undefined);
              }}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          onClick={() => onChange([...arrValue, itemSchema.type === "object" ? {} : ""])}
          disabled={disabled}
        >
          + Add {toLabel(name).replace(/s$/, "")}
        </button>
      </fieldset>
    );
  }

  // Enum → Select/dropdown
  if (schema.enum && schema.enum.length > 0) {
    return (
      <div className="space-y-2">
        <label htmlFor={fieldId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ms-1">*</span>}
        </label>
        <Select
          value={value != null ? String(value) : ""}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger id={fieldId}>
            <SelectValue placeholder={`Select ${toLabel(name).toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((opt) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Boolean → Switch
  if (schema.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={fieldId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
        <Switch
          id={fieldId}
          checked={value === true}
          onCheckedChange={(v) => onChange(v)}
          disabled={disabled}
        />
      </div>
    );
  }

  // Number/Integer → Number input
  if (schema.type === "number" || schema.type === "integer") {
    return (
      <div className="space-y-2">
        <label htmlFor={fieldId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ms-1">*</span>}
        </label>
        <Input
          id={fieldId}
          type="number"
          value={value != null ? String(value) : ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : schema.type === "integer" ? parseInt(v) : parseFloat(v));
          }}
          min={schema.minimum}
          max={schema.maximum}
          disabled={disabled}
          placeholder={schema.description || toLabel(name)}
        />
      </div>
    );
  }

  // String with format: date-time → datetime-local input
  if (schema.type === "string" && schema.format === "date-time") {
    return (
      <div className="space-y-2">
        <label htmlFor={fieldId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ms-1">*</span>}
        </label>
        <Input
          id={fieldId}
          type="datetime-local"
          value={value ? String(value).slice(0, 16) : ""}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          disabled={disabled}
        />
      </div>
    );
  }

  // Long strings → Textarea
  if (schema.type === "string" && (schema.maxLength ? schema.maxLength > 200 : false)) {
    return (
      <div className="space-y-2">
        <label htmlFor={fieldId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ms-1">*</span>}
        </label>
        <textarea
          id={fieldId}
          value={value != null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          minLength={schema.minLength}
          maxLength={schema.maxLength}
          disabled={disabled}
          placeholder={schema.description || toLabel(name)}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    );
  }

  // Default string → Input
  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ms-1">*</span>}
      </label>
      <Input
        id={fieldId}
        type="text"
        value={value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        minLength={schema.minLength}
        maxLength={schema.maxLength}
        pattern={schema.pattern}
        disabled={disabled}
        placeholder={schema.description || toLabel(name)}
      />
    </div>
  );
}

/** Renders a single key-value entry for a map/dictionary field */
function MapEntryField({
  entryKey,
  entryValue,
  valueSchema,
  disabled,
  onChangeValue,
  onChangeKey,
}: {
  entryKey: string;
  entryValue: unknown;
  valueSchema: JsonSchema;
  disabled?: boolean;
  onChangeValue: (value: unknown) => void;
  onChangeKey: (key: string) => void;
}) {
  // Nested object value → render sub-fields under the key label
  if (valueSchema.type === "object" && valueSchema.properties) {
    const objVal = (entryValue && typeof entryValue === "object" && !Array.isArray(entryValue))
      ? entryValue as Record<string, unknown>
      : {};
    const nestedRequired = new Set(valueSchema.required ?? []);

    return (
      <fieldset className="space-y-2 rounded-md border border-border/50 p-3">
        <legend className="px-1 text-xs font-medium">{toLabel(entryKey)}</legend>
        {Object.entries(valueSchema.properties).map(([subKey, subSchema]) => (
          <SchemaField
            key={subKey}
            name={subKey}
            schema={subSchema}
            value={objVal[subKey]}
            required={nestedRequired.has(subKey)}
            disabled={disabled}
            onChange={(subVal) => {
              const updated = { ...objVal };
              if (subVal === undefined) delete updated[subKey];
              else updated[subKey] = subVal;
              onChangeValue(Object.keys(updated).length > 0 ? updated : undefined);
            }}
          />
        ))}
      </fieldset>
    );
  }

  // Simple value types → inline key label + value input
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{toLabel(entryKey)}</label>
      {valueSchema.type === "boolean" ? (
        <div className="flex items-center gap-2">
          <Switch
            checked={entryValue === true}
            onCheckedChange={(v) => onChangeValue(v)}
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground">{entryValue ? "Enabled" : "Disabled"}</span>
        </div>
      ) : valueSchema.type === "number" || valueSchema.type === "integer" ? (
        <Input
          type="number"
          value={entryValue != null ? String(entryValue) : ""}
          onChange={(e) => {
            const v = e.target.value;
            onChangeValue(v === "" ? undefined : valueSchema.type === "integer" ? parseInt(v) : parseFloat(v));
          }}
          min={valueSchema.minimum}
          max={valueSchema.maximum}
          disabled={disabled}
          placeholder={toLabel(entryKey)}
        />
      ) : (
        <Input
          type="text"
          value={entryValue != null ? String(entryValue) : ""}
          onChange={(e) => onChangeValue(e.target.value || undefined)}
          disabled={disabled}
          placeholder={toLabel(entryKey)}
        />
      )}
    </div>
  );
}

function toLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
