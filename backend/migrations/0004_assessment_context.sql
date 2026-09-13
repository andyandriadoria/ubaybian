PRAGMA foreign_keys = ON;

-- Additive Assessment metadata snapshot.
-- Existing rows stay valid; new sessions can persist the academic context that was active
-- when the Assessment was created, so later grade/year changes do not rewrite history.
ALTER TABLE exam_sessions ADD COLUMN assessment_definition_id TEXT;
ALTER TABLE exam_sessions ADD COLUMN academic_year TEXT;
ALTER TABLE exam_sessions ADD COLUMN grade INTEGER;
ALTER TABLE exam_sessions ADD COLUMN semester INTEGER;
ALTER TABLE exam_sessions ADD COLUMN assessment_type TEXT;
ALTER TABLE exam_sessions ADD COLUMN blueprint_version INTEGER;
ALTER TABLE exam_sessions ADD COLUMN selection_strategy TEXT;

CREATE INDEX IF NOT EXISTS idx_exam_sessions_assessment_definition
  ON exam_sessions(assessment_definition_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_academic_context
  ON exam_sessions(profile_id, academic_year, grade, semester, assessment_type, subject_id);
