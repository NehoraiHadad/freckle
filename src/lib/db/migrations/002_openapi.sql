-- Add OpenAPI columns to products
ALTER TABLE products ADD COLUMN openapi_spec TEXT;
ALTER TABLE products ADD COLUMN openapi_url TEXT;
ALTER TABLE products ADD COLUMN spec_fetched_at TEXT;
ALTER TABLE products ADD COLUMN discovery_mode TEXT NOT NULL DEFAULT 'meta';

-- Parsed API resources (tree structure stored flat with parent_key)
CREATE TABLE api_resources (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,       -- dot-separated: "users.credits.history"
  name            TEXT NOT NULL,       -- display name: "Credit History"
  parent_key      TEXT,                -- parent resource key or null
  path_segment    TEXT NOT NULL,       -- "history"
  requires_parent_id INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  UNIQUE(product_id, key)
);

CREATE INDEX idx_api_resources_product ON api_resources(product_id);
CREATE INDEX idx_api_resources_parent ON api_resources(product_id, parent_key);

-- Parsed API operations
CREATE TABLE api_operations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id            TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  resource_key          TEXT NOT NULL,
  operation_type        TEXT NOT NULL,     -- list, detail, create, update, delete, action, etc.
  http_method           TEXT NOT NULL,     -- GET, POST, PATCH, PUT, DELETE
  path_template         TEXT NOT NULL,     -- "/feedback/{feedbackId}" (admin prefix stripped)
  summary               TEXT,
  description           TEXT,
  path_parameters       TEXT NOT NULL DEFAULT '[]',    -- JSON array of param names
  request_body_schema   TEXT,              -- JSON schema (resolved, no $ref)
  response_schema       TEXT,              -- JSON schema
  tags                  TEXT NOT NULL DEFAULT '[]',    -- JSON array
  created_at            TEXT NOT NULL,
  UNIQUE(product_id, http_method, path_template)
);

CREATE INDEX idx_api_operations_product ON api_operations(product_id);
CREATE INDEX idx_api_operations_resource ON api_operations(product_id, resource_key);
