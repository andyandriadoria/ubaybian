import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeReviewEvents } from '../src/review-queue.js';

test('latest practice correction clears an older exam miss', () => {
  const states = mergeReviewEvents([
    { subject_id:'math', question_id:'q1', correct:0, event_at:100, source:'exam' },
    { subject_id:'math', question_id:'q1', correct:1, event_at:200, source:'practice' },
  ]);
  assert.equal(states.length, 1);
  assert.equal(states[0].correct, 1);
  assert.equal(states[0].source, 'practice');
});

test('later exam miss reopens a question that practice had mastered', () => {
  const states = mergeReviewEvents([
    { subject_id:'math', question_id:'q1', correct:1, event_at:100, source:'practice' },
    { subject_id:'math', question_id:'q1', correct:0, event_at:200, source:'exam' },
  ]);
  assert.equal(states.length, 1);
  assert.equal(states[0].correct, 0);
  assert.equal(states[0].source, 'exam');
});

test('review state stays separate by subject and question', () => {
  const states = mergeReviewEvents([
    { subject_id:'math', question_id:'q1', correct:0, event_at:100, source:'exam' },
    { subject_id:'english', question_id:'q1', correct:1, event_at:200, source:'practice' },
    { subject_id:'math', question_id:'q2', correct:0, event_at:150, source:'practice' },
  ]);
  assert.equal(states.length, 3);
  assert.equal(states.find((row) => row.subject_id === 'math' && row.question_id === 'q1')?.correct, 0);
  assert.equal(states.find((row) => row.subject_id === 'english' && row.question_id === 'q1')?.correct, 1);
});

test('practice wins deterministic ties so a review answer can clear an exam state', () => {
  const states = mergeReviewEvents([
    { subject_id:'math', question_id:'q1', correct:0, event_at:100, source:'exam' },
    { subject_id:'math', question_id:'q1', correct:1, event_at:100, source:'practice' },
  ]);
  assert.equal(states[0].correct, 1);
  assert.equal(states[0].source, 'practice');
});
