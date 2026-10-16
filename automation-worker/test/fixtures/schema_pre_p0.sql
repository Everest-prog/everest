CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  status TEXT NOT NULL,
  error_code TEXT,
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  provider_order_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  status TEXT NOT NULL,
  gross_value INTEGER,
  currency TEXT DEFAULT 'BRL',
  contact_ref TEXT,
  email_hash TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  approved_at TEXT,
  refunded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_order_id)
);

CREATE TABLE IF NOT EXISTS email_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_event_id TEXT NOT NULL UNIQUE,
  contact_ref TEXT,
  email_type TEXT,
  event_type TEXT NOT NULL,
  occurred_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_received
  ON webhook_events(provider, received_at);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status);


CREATE TABLE IF NOT EXISTS access_activation_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  email_hash TEXT NOT NULL,
  product_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS access_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  product_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_access_activation_email
  ON access_activation_tokens(email_hash, product_code, created_at);

CREATE INDEX IF NOT EXISTS idx_access_sessions_order
  ON access_sessions(order_id, revoked_at, expires_at);
