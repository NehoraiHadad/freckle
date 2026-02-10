import { getDb } from "./index";
import type { Preferences } from "@/types/preferences";

const DEFAULTS: Preferences = {
  theme: "system",
  language: "en",
  defaultProduct: null,
  dashboardLayout: "grid",
  sidebarCollapsed: false,
};

export function getPreference<K extends keyof Preferences>(key: K): Preferences[K] {
  const db = getDb();
  const row = db.prepare("SELECT value FROM preferences WHERE key = ?").get(key) as
    | { value: string }
    | undefined;

  if (!row) return DEFAULTS[key];
  return JSON.parse(row.value) as Preferences[K];
}

export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO preferences (key, value, updated_at)
    VALUES (?, ?, ?)
  `).run(key, JSON.stringify(value), now);
}

export function getAllPreferences(): Preferences {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM preferences").all() as {
    key: string;
    value: string;
  }[];

  const prefs = { ...DEFAULTS };
  for (const row of rows) {
    const key = row.key as keyof Preferences;
    if (key in prefs) {
      (prefs as Record<string, unknown>)[key] = JSON.parse(row.value);
    }
  }
  return prefs;
}
