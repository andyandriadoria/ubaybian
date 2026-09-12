PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  deadline_at INTEGER NOT NULL,
  submitted_at INTEGER,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_profile ON exam_sessions(profile_id, created_at);

CREATE TABLE IF NOT EXISTS exam_session_questions (
  session_id TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS exam_answers (
  session_id TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  correct INTEGER NOT NULL CHECK(correct IN (0,1)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_answers_session ON exam_answers(session_id);
