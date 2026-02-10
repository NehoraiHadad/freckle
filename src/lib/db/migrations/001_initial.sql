CREATE TABLE products (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  base_url        TEXT NOT NULL,
  api_key         TEXT NOT NULL,
  icon_url        TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  health_status   TEXT DEFAULT 'unknown',
  last_health_check TEXT,
  capabilities    TEXT NOT NULL DEFAULT '[]',
  supported_actions TEXT NOT NULL DEFAULT '{}',
  api_standard_version TEXT,
  product_version TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  added_at        TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE stats_cache (
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stat_type     TEXT NOT NULL,
  data          TEXT NOT NULL,
  fetched_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  PRIMARY KEY (product_id, stat_type)
);

CREATE INDEX idx_stats_cache_expires ON stats_cache(expires_at);

CREATE TABLE health_checks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status        TEXT NOT NULL,
  response_ms   INTEGER,
  version       TEXT,
  error         TEXT,
  checked_at    TEXT NOT NULL
);

CREATE INDEX idx_health_checks_product ON health_checks(product_id, checked_at DESC);

CREATE TABLE audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    TEXT NOT NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  details       TEXT,
  result        TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  ip_address    TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX idx_audit_log_product ON audit_log(product_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

CREATE TABLE preferences (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
