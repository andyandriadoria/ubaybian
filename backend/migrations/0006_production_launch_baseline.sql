PRAGMA foreign_keys = ON;

-- One-time launch marker only. The destructive cleanup itself is performed by
-- src/launch-baseline.js so production becomes clean even when migrations are
-- deployed separately from the Worker.
CREATE TABLE IF NOT EXISTS launch_resets (
  reset_key TEXT PRIMARY KEY,
  reset_at INTEGER NOT NULL,
  profiles_json TEXT NOT NULL DEFAULT '[]'
);
