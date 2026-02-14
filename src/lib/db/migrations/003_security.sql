-- Security hardening: persistent login rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  last_attempt INTEGER NOT NULL,
  blocked_until INTEGER
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked ON login_attempts(blocked_until);
