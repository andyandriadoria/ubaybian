PRAGMA foreign_keys = ON;

-- Persistent achievement history. Badges used to be derived on every dashboard load;
-- this ledger keeps an unlock permanently even after the learner changes grade/year.
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  scope_key TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  tier_label TEXT NOT NULL DEFAULT '',
  rarity TEXT NOT NULL DEFAULT 'common',
  priority INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  academic_year TEXT,
  grade INTEGER,
  semester INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  unlocked_at INTEGER NOT NULL,
  upgraded_at INTEGER NOT NULL,
  UNIQUE(profile_id, badge_id, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_achievements_profile
  ON achievements(profile_id, priority DESC, upgraded_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_context
  ON achievements(profile_id, academic_year, grade, semester, category);
