PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS family_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  level TEXT NOT NULL,
  UNIQUE(family_id, slug)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_family ON sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_profile ON quiz_sessions(profile_id, created_at);

CREATE TABLE IF NOT EXISTS quiz_session_questions (
  session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  question_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  choices_json TEXT NOT NULL DEFAULT '[]',
  answer_key TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL,
  PRIMARY KEY(session_id, position),
  UNIQUE(session_id, question_id)
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  correct INTEGER NOT NULL CHECK(correct IN (0,1)),
  answered_at INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  response_json TEXT NOT NULL,
  UNIQUE(session_id, question_id),
  UNIQUE(session_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS progress_summary (
  family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  attempted INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  last_practiced_at INTEGER NOT NULL,
  PRIMARY KEY(family_id, profile_id, subject_id)
);
