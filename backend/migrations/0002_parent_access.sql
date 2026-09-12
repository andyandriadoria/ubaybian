CREATE TABLE IF NOT EXISTS parent_security (
  family_id INTEGER PRIMARY KEY REFERENCES family_accounts(id) ON DELETE CASCADE,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_iterations INTEGER NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS parent_unlocks (
  token_hash TEXT PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parent_unlocks_family
  ON parent_unlocks(family_id, expires_at);
