PRAGMA foreign_keys = ON;

ALTER TABLE exam_answers
ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0 CHECK(needs_review IN (0,1));

CREATE INDEX IF NOT EXISTS idx_exam_answers_review
ON exam_answers(session_id, needs_review);
