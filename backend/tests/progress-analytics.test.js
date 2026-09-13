import test from 'node:test';
import assert from 'node:assert/strict';

import { assessmentReportEntry, mergeLearningReport } from '../src/progress.js';

test('closed Assessment is reported as a final score', () => {
  const row = assessmentReportEntry({
    id: 'exam-1',
    subject_id: 'math',
    blueprint_id: 'bian-math-mid-s1-2026',
    title: 'Math Mid Exam S1',
    total_questions: 30,
    correct_count: 24,
    answered_count: 30,
    auto_total: 30,
    auto_answered_count: 30,
    open_response_total: 0,
    open_response_answered: 0,
    completed_at: 2000,
  });

  assert.equal(row.kind, 'assessment');
  assert.equal(row.score, 80);
  assert.equal(row.scoreStatus, 'final');
  assert.equal(row.correct, 24);
  assert.equal(row.total, 30);
});

test('Assessment with open response is clearly marked as auto-score', () => {
  const row = assessmentReportEntry({
    id: 'exam-2',
    subject_id: 'science',
    blueprint_id: 'bian-science-mid-s1-2026',
    title: 'Science Mid Exam S1',
    total_questions: 44,
    correct_count: 31,
    answered_count: 44,
    auto_total: 41,
    auto_answered_count: 41,
    open_response_total: 3,
    open_response_answered: 3,
    completed_at: 3000,
  });

  assert.equal(row.score, 76);
  assert.equal(row.scoreStatus, 'auto');
  assert.equal(row.total, 41);
  assert.equal(row.questionTotal, 44);
  assert.equal(row.reviewPending, 3);
});

test('recent report merges Practice and Assessment chronologically', () => {
  const practice = [{
    id: 'quiz-1',
    subject_id: 'english',
    total_questions: 10,
    correct_count: 9,
    completed_at: 1000,
  }];
  const assessment = [assessmentReportEntry({
    id: 'exam-3',
    subject_id: 'math',
    total_questions: 30,
    correct_count: 27,
    answered_count: 30,
    auto_total: 30,
    auto_answered_count: 30,
    open_response_total: 0,
    open_response_answered: 0,
    completed_at: 2000,
  })];

  const report = mergeLearningReport(practice, assessment, 10);
  assert.deepEqual(report.map((row) => row.sessionId), ['exam-3', 'quiz-1']);
  assert.deepEqual(report.map((row) => row.kind), ['assessment', 'practice']);
});
