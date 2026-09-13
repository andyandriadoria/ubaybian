PRAGMA foreign_keys = ON;

-- Last-known-good cache for the Google Sheets question-bank gateway.
-- This is infrastructure resilience only: the Google Sheets bank remains the source of truth.
CREATE TABLE IF NOT EXISTS question_bank_cache (
  profile_slug TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  values_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY(profile_slug, sheet_name)
);

CREATE INDEX IF NOT EXISTS idx_question_bank_cache_fetched
  ON question_bank_cache(fetched_at);
