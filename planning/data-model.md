# Freckle Data Model

> What Freckle stores locally to manage the multi-product console.

---

## Storage Choice: SQLite via better-sqlite3

**Decision**: SQLite with `better-sqlite3` (synchronous, fast, zero-config).

**Why not JSON files?**
- Audit log grows unbounded; appending to JSON means rewriting the whole file
- Querying cached stats or filtering products requires loading everything into memory
- No atomic writes; concurrent reads/writes from server actions risk corruption

**Why not PostgreSQL/MySQL?**
- Single admin user, single server instance
- No need for concurrent multi-connection access
- Adds deployment complexity (Docker, connection strings, migrations)

**Why SQLite?**
- Zero config, single file, no daemon
- ACID transactions, proper indexing, SQL queries
- `better-sqlite3` is synchronous (no async overhead for simple reads)
- File lives at `data/freckle.db` (gitignored)
- Easy backup (just copy the file)

**Migration strategy**: Simple versioned SQL scripts in `src/lib/db/migrations/`. Run on app startup. Track applied migrations in a `_migrations` table.

---

## Schema

### 1. products

The product registry. Each row is a product whose Admin API Freckle manages.

```sql
CREATE TABLE products (
  id              TEXT PRIMARY KEY,          -- slug: "story-creator", "podcasto"
  name            TEXT NOT NULL,             -- display name: "Story Creator"
  description     TEXT,                      -- short description
  base_url        TEXT NOT NULL,             -- e.g. "https://story-creator.app/api/v1/admin"
  api_key         TEXT NOT NULL,             -- encrypted ADMIN_API_KEY for this product
  icon_url        TEXT,                      -- product icon/logo URL
  status          TEXT NOT NULL DEFAULT 'active',  -- "active" | "inactive" | "unreachable"
  health_status   TEXT DEFAULT 'unknown',    -- "healthy" | "degraded" | "unhealthy" | "unknown"
  last_health_check TEXT,                    -- ISO 8601 timestamp
  capabilities    TEXT NOT NULL DEFAULT '[]', -- JSON array: ["users","content","analytics"]
  supported_actions TEXT NOT NULL DEFAULT '{}', -- JSON object from /meta
  api_standard_version TEXT,                 -- e.g. "1.1"
  product_version TEXT,                      -- e.g. "1.2.0"
  display_order   INTEGER NOT NULL DEFAULT 0, -- sort order in sidebar
  added_at        TEXT NOT NULL,             -- ISO 8601
  updated_at      TEXT NOT NULL              -- ISO 8601
);
```

**Field notes:**
- `id` is the product slug from the `/meta` endpoint's `product` field
- `api_key` is stored encrypted at rest (AES-256-GCM with a master key from env var `FRECKLE_ENCRYPTION_KEY`)
- `capabilities` and `supported_actions` are JSON strings; SQLite has `json_extract()` for queries
- `status` is Freckle's own state for the product (admin can disable); `health_status` is from the product's `/health` endpoint

### 2. stats_cache

Cached dashboard stats from each product. Avoids hitting product APIs on every page load.

```sql
CREATE TABLE stats_cache (
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stat_type     TEXT NOT NULL,             -- "stats" | "trends_24h" | "trends_7d" | "trends_30d" | "meta"
  data          TEXT NOT NULL,             -- JSON blob (the full response.data)
  fetched_at    TEXT NOT NULL,             -- ISO 8601
  expires_at    TEXT NOT NULL,             -- ISO 8601
  PRIMARY KEY (product_id, stat_type)
);

CREATE INDEX idx_stats_cache_expires ON stats_cache(expires_at);
```

**Cache TTLs by stat_type:**

| stat_type    | TTL      | Rationale                              |
|-------------|----------|----------------------------------------|
| stats       | 5 min    | Dashboard numbers, moderate freshness  |
| trends_*    | 15 min   | Chart data, less volatile              |
| meta        | 1 hour   | Capabilities rarely change             |

### 3. health_checks

Rolling health check history. Useful for uptime tracking and incident review.

```sql
CREATE TABLE health_checks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status        TEXT NOT NULL,             -- "healthy" | "degraded" | "unhealthy" | "unreachable"
  response_ms   INTEGER,                   -- response time in milliseconds (null if unreachable)
  version       TEXT,                      -- product version from health response
  error         TEXT,                      -- error message if unhealthy/unreachable
  checked_at    TEXT NOT NULL              -- ISO 8601
);

CREATE INDEX idx_health_checks_product ON health_checks(product_id, checked_at DESC);
```

**Retention**: Keep last 7 days. A daily cleanup job deletes older rows.

### 4. audit_log

Every admin action taken through Freckle. Append-only.

```sql
CREATE TABLE audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    TEXT NOT NULL,              -- which product was affected
  action        TEXT NOT NULL,              -- "user.update", "content.delete", "product.add", etc.
  entity_type   TEXT,                       -- "user" | "content" | "product" | "config" | null
  entity_id     TEXT,                       -- the ID of the affected entity (user ID, content ID)
  details       TEXT,                       -- JSON: what changed, request body summary
  result        TEXT NOT NULL DEFAULT 'success', -- "success" | "error"
  error_message TEXT,                       -- error details if result = "error"
  ip_address    TEXT,                       -- request IP (for security auditing)
  created_at    TEXT NOT NULL              -- ISO 8601
);

CREATE INDEX idx_audit_log_product ON audit_log(product_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```

**Design choices:**
- No `user_id` column since Freckle is single-admin; the IP address provides audit trail
- `details` is free-form JSON capturing context (e.g., `{"role": "premium", "previousRole": "user"}`)
- Never deleted, only appended
- Future: could add retention policy (archive after 90 days)

### 5. preferences

Admin preferences for the Freckle UI. Key-value store.

```sql
CREATE TABLE preferences (
  key           TEXT PRIMARY KEY,           -- "theme" | "language" | "default_product" | "dashboard_layout" | etc.
  value         TEXT NOT NULL,              -- JSON value
  updated_at    TEXT NOT NULL              -- ISO 8601
);
```

**Known keys:**

| Key                | Type    | Default   | Description                       |
|-------------------|---------|-----------|-----------------------------------|
| theme             | string  | "system"  | "light" / "dark" / "system"       |
| language          | string  | "en"      | "en" / "he"                       |
| default_product   | string  | null      | Product ID to show on login       |
| dashboard_layout  | string  | "grid"    | "grid" / "list"                   |
| sidebar_collapsed | boolean | false     | Sidebar state                     |

### 6. _migrations

Tracks applied database migrations.

```sql
CREATE TABLE _migrations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,       -- "001_initial.sql"
  applied_at    TEXT NOT NULL              -- ISO 8601
);
```

---

## TypeScript Types

These types map directly to the database schema and are used throughout the Freckle app.

```typescript
// ============================================
// Product Registry
// ============================================

type ProductStatus = "active" | "inactive" | "unreachable";
type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

interface Product {
  id: string;
  name: string;
  description: string | null;
  baseUrl: string;
  apiKey: string;               // decrypted in memory, encrypted at rest
  iconUrl: string | null;
  status: ProductStatus;
  healthStatus: HealthStatus;
  lastHealthCheck: string | null;
  capabilities: string[];       // parsed from JSON column
  supportedActions: Record<string, string[]>;
  apiStandardVersion: string | null;
  productVersion: string | null;
  displayOrder: number;
  addedAt: string;
  updatedAt: string;
}

interface ProductInput {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  apiKey: string;
  iconUrl?: string;
  displayOrder?: number;
}

// ============================================
// Stats Cache
// ============================================

type StatType = "stats" | "trends_24h" | "trends_7d" | "trends_30d" | "meta";

interface CachedStat {
  productId: string;
  statType: StatType;
  data: unknown;               // parsed JSON, shape depends on statType
  fetchedAt: string;
  expiresAt: string;
}

// ============================================
// Health Check
// ============================================

interface HealthCheck {
  id: number;
  productId: string;
  status: HealthStatus | "unreachable";
  responseMs: number | null;
  version: string | null;
  error: string | null;
  checkedAt: string;
}

// ============================================
// Audit Log
// ============================================

type AuditResult = "success" | "error";

interface AuditLogEntry {
  id: number;
  productId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  result: AuditResult;
  errorMessage: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogInput {
  productId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  result?: AuditResult;
  errorMessage?: string;
  ipAddress?: string;
}

// ============================================
// Preferences
// ============================================

interface Preferences {
  theme: "light" | "dark" | "system";
  language: "en" | "he";
  defaultProduct: string | null;
  dashboardLayout: "grid" | "list";
  sidebarCollapsed: boolean;
}
```

---

## Database Access Layer

A thin repository pattern around `better-sqlite3`. No ORM -- direct SQL keeps things simple and fast.

```typescript
// src/lib/db/index.ts

import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "data", "freckle.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");      // better concurrent read performance
    db.pragma("foreign_keys = ON");
  }
  return db;
}
```

### Repository example: products

```typescript
// src/lib/db/products.ts

import { getDb } from "./index";
import { encrypt, decrypt } from "../crypto";
import type { Product, ProductInput } from "@/types/product";

export function getAllProducts(): Product[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM products ORDER BY display_order, name").all();
  return rows.map(deserializeProduct);
}

export function getProduct(id: string): Product | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  return row ? deserializeProduct(row) : null;
}

export function addProduct(input: ProductInput): Product {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO products (id, name, description, base_url, api_key, icon_url, display_order, status, added_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    input.id,
    input.name,
    input.description ?? null,
    input.baseUrl,
    encrypt(input.apiKey),
    input.iconUrl ?? null,
    input.displayOrder ?? 0,
    now,
    now,
  );
  return getProduct(input.id)!;
}

export function updateProductHealth(
  id: string,
  healthStatus: string,
  version?: string
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE products
    SET health_status = ?, product_version = COALESCE(?, product_version),
        last_health_check = ?, updated_at = ?
    WHERE id = ?
  `).run(healthStatus, version ?? null, now, now, id);
}

function deserializeProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    baseUrl: row.base_url,
    apiKey: decrypt(row.api_key),
    iconUrl: row.icon_url,
    status: row.status,
    healthStatus: row.health_status,
    lastHealthCheck: row.last_health_check,
    capabilities: JSON.parse(row.capabilities),
    supportedActions: JSON.parse(row.supported_actions),
    apiStandardVersion: row.api_standard_version,
    productVersion: row.product_version,
    displayOrder: row.display_order,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}
```

---

## Encryption for API Keys

API keys are sensitive. They're encrypted before writing to SQLite and decrypted on read.

```typescript
// src/lib/crypto.ts

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.FRECKLE_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("FRECKLE_ENCRYPTION_KEY must be at least 32 characters");
  }
  return Buffer.from(key.slice(0, 32), "utf-8");
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(token: string): string {
  const [ivB64, authTagB64, encryptedB64] = token.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}
```

---

## Relationships & Data Flow

```
products (registry)
  ├── stats_cache (1:many, keyed by stat_type)
  ├── health_checks (1:many, time series)
  └── audit_log (1:many, actions taken via Freckle)

preferences (standalone, key-value)
_migrations (standalone, schema versioning)
```

**Data never duplicated from products**: Freckle does NOT copy user lists, content, or analytics into its own database. It fetches from product APIs on demand (with short-lived caching in `stats_cache`). The only persistent product data is the registry entry and health history.

---

## File Layout

```
data/
  freckle.db                    -- SQLite database (gitignored)

src/lib/db/
  index.ts                      -- Database singleton (getDb)
  migrations/
    001_initial.sql             -- Creates all tables
  products.ts                   -- Product CRUD
  stats-cache.ts                -- Cache read/write/invalidate
  health-checks.ts              -- Health check log
  audit-log.ts                  -- Audit log append/query
  preferences.ts                -- Preferences get/set

src/lib/crypto.ts               -- encrypt/decrypt for API keys
src/types/product.ts            -- Product, HealthCheck, AuditLogEntry types
src/types/preferences.ts        -- Preferences type
```
