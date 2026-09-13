import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAchievementCandidates } from '../src/achievements.js';

const profile = { id: 2, slug: 'bian', grade: 2 };
const dashboard = (overrides = {}) => ({
  stats: {
    streak: { current: 3, longest: 3 },
    totalAnswered: 0,
    reviewTotal: 1,
    ...overrides,
  },
});

function practice(id, subject, total, correct, completedAt) {
  return { id, subject_id: subject, total_questions: total, correct_count: correct, completed_at: completedAt };
}
function assessment(id, subject, blueprintId, total, correct, completedAt, openResponseTotal = 0) {
  return {
    id,
    subject_id: subject,
    blueprint_id: blueprintId,
    total_questions: total,
    correct_count: correct,
    completed_at: completedAt,
    open_response_total: openResponseTotal,
  };
}

const day = (n) => Date.parse(`2026-09-${String(n).padStart(2, '0')}T01:00:00Z`);

test('tiered badges expose only the highest Perfect, Study and Questions tier', () => {
  const practiceSessions = Array.from({ length: 10 }, (_, index) => practice(
    `p${index}`,
    'math',
    5,
    5,
    day(index + 1),
  ));
  const answerEvents = Array.from({ length: 1000 }, (_, index) => ({ event_at: day(1) + index }));
  const badges = buildAchievementCandidates({
    profile,
    dashboard: dashboard({ longest: 10, totalAnswered: 1000 }),
    practiceSessions,
    assessments: [],
    answerEvents,
    recoveryEvents: [],
  });
  const perfect = badges.find((item) => item.badgeId === 'perfect-score');
  const questions = badges.find((item) => item.badgeId === 'questions-answered');
  const study = badges.find((item) => item.badgeId === 'study-habit');
  assert.equal(perfect?.name, 'Perfect Legend');
  assert.equal(perfect?.tier, 4);
  assert.equal(questions?.name, '1,000 Questions');
  assert.equal(questions?.tier, 4);
  assert.equal(study?.name, 'Study Habit');
  assert.equal(study?.tier, 1);
  assert.equal(badges.filter((item) => item.badgeId === 'perfect-score').length, 1);
});

test('subject mastery upgrades Star to Master only from a final-scored Assessment', () => {
  const badges = buildAchievementCandidates({
    profile,
    dashboard: dashboard(),
    practiceSessions: [practice('p1', 'math', 5, 5, day(1))],
    assessments: [assessment('a1', 'math', 'bian-math-mid-s1-2026', 30, 28, day(2), 0)],
    answerEvents: [],
    recoveryEvents: [],
  });
  const mastery = badges.find((item) => item.badgeId === 'subject-mastery' && item.scopeKey === 'math');
  assert.equal(mastery?.name, 'Math Master');
  assert.equal(mastery?.tier, 2);

  const openResponseBadges = buildAchievementCandidates({
    profile,
    dashboard: dashboard(),
    practiceSessions: [],
    assessments: [assessment('a2', 'science', 'bian-science-mid-s1-2026', 44, 40, day(3), 3)],
    answerEvents: [],
    recoveryEvents: [],
  });
  assert.equal(openResponseBadges.some((item) => item.badgeId === 'subject-mastery' && item.scopeKey === 'science'), false);
  assert.equal(openResponseBadges.some((item) => item.badgeId === 'assessment-performance'), false);
});

test('Assessment wrong followed by Practice/Review correct counts toward recovery badges', () => {
  const recoveryEvents = [];
  for (let index = 0; index < 10; index += 1) {
    recoveryEvents.push({ subject_id: 'math', question_id: `q${index}`, correct: 0, event_at: day(1) + index, source: 'exam' });
    recoveryEvents.push({ subject_id: 'math', question_id: `q${index}`, correct: 1, event_at: day(2) + index, source: 'practice' });
  }
  const badges = buildAchievementCandidates({
    profile,
    dashboard: dashboard({ reviewTotal: 0 }),
    practiceSessions: [],
    assessments: [],
    answerEvents: [],
    recoveryEvents,
  });
  assert.equal(badges.find((item) => item.badgeId === 'recovery')?.name, 'Comeback');
  assert.ok(badges.some((item) => item.badgeId === 'review-clear'));
});

test('Assessment journey and performance are separate durable achievements', () => {
  const badges = buildAchievementCandidates({
    profile,
    dashboard: dashboard(),
    practiceSessions: [],
    assessments: [assessment('a1', 'math', 'bian-math-mid-s1-2026', 30, 30, day(1), 0)],
    answerEvents: [],
    recoveryEvents: [],
  });
  assert.equal(badges.find((item) => item.badgeId === 'assessment-journey')?.name, 'First Assessment');
  assert.equal(badges.find((item) => item.badgeId === 'assessment-performance')?.name, 'Assessment Perfect');
  assert.equal(badges.find((item) => item.badgeId === 'assessment-performance')?.tier, 2);
});
