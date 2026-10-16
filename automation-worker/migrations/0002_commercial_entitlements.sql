-- ET-0E P0-1. Apply exactly once to a pre-existing D1 database.
-- Do NOT run against a DB freshly initialized with schema.sql, which already
-- declares account_id on access_sessions. Do not apply in production yet.
-- Backfill legacy purchases into grants (after audit) BEFORE enabling access
-- enforcement. Migration itself intentionally does not activate legacy orders.
CREATE TABLE IF NOT EXISTS access_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_code TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_code, email_hash)
);

CREATE TABLE IF NOT EXISTS access_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL UNIQUE,
  product_code TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  starts_at TEXT,
  ends_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('approved','refunded','chargeback')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(account_id) REFERENCES access_accounts(id),
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

ALTER TABLE access_sessions ADD COLUMN account_id INTEGER REFERENCES access_accounts(id);

CREATE INDEX IF NOT EXISTS idx_access_grants_account
  ON access_grants(account_id, status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_access_sessions_account
  ON access_sessions(account_id, revoked_at, expires_at);
