import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

function makeQuestion(id, topic, difficulty) {
  return { id, topic, semester: '1', difficulty, type: 'text', answerKey: 'ok', choices: [] };
}

const groups = [
  { topic: 'Social Justice — Meaning & Fair Society', category: 'ubay-gc-social-justice', difficulties: ['Mudah', 'Sedang'] },
  { topic: 'Social Justice — Types of Justice', category: 'ubay-gc-types-justice', difficulties: ['Mudah', 'Sedang'] },
  { topic: 'Justice & Injustice — Case Analysis', category: 'ubay-gc-case-analysis', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Human Rights — Discrimination & Bias', category: 'ubay-gc-human-rights', difficulties: ['Sedang', 'Sulit'] },
  { topic: 'Wealth & Poverty — Core Concepts', category: 'ubay-gc-wealth-poverty', difficulties: ['Sedang', 'Sedang'] },
  { topic: 'Wealth & Poverty — Types of Poverty', category: 'ubay-gc-types-poverty', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Wealth & Poverty — Causes, Effects & Life Chances', category: 'ubay-gc-causes-effects', difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'] },
  { topic: 'Wealth & Poverty — Poverty Cycle, Marginalisation & Stereotypes', category: 'ubay-gc-poverty-cycle', difficulties: ['Sedang', 'Sulit'] },
  { topic: 'Equality of Opportunity — Meaning & Importance', category: 'ubay-gc-equal-opportunity', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Equality of Opportunity — Equality, Equity & Formal/Substantive', category: 'ubay-gc-equity', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Equality of Opportunity — Barriers & Support', category: 'ubay-gc-barriers-support', difficulties: ['Mudah', 'Sedang'] },
  { topic: 'Social Justice — Policy & Critical Thinking', category: 'ubay-gc-policy', difficulties: ['Sedang', 'Sedang'] },
];

function makeBank() {
  const bank = [];
  let id = 1;
  for (const variant of ['A', 'B']) {
    for (const group of groups) {
      for (const difficulty of group.difficulties) {
        bank.push(makeQuestion(`GC-${variant}-${id++}`, group.topic, difficulty));
      }
    }
  }
  return bank;
}

function categoryCounts(questions) {
  const counts = {};
  for (const question of questions) {
    const category = topicCategory(question);
    counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
}

function overallDifficulties(questions) {
  const counts = { Mudah: 0, Sedang: 0, Sulit: 0 };
  for (const question of questions) counts[question.difficulty] += 1;
  return counts;
}

test('Ubay Global Citizenship Assessment S1 uses a 30-question 90-minute Grade 7 blueprint', () => {
  const blueprint = getExamBlueprint('ubay', 'global-citizenship');
  assert.equal(blueprint.id, 'ubay-global-citizenship-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 30);
  assert.equal(blueprint.durationMinutes, 90);
  assert.equal(blueprint.subtitle, 'Grade 7 · Semester 1 · 2026/2027');
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 30);
});

test('Ubay Global Citizenship topic labels map to the intended categories', () => {
  for (const [index, group] of groups.entries()) {
    assert.equal(topicCategory(makeQuestion(String(index), group.topic, 'Sedang')), group.category);
  }
});

test('Ubay Global Citizenship selector builds the intended topic and difficulty mix', () => {
  const selected = selectExamQuestions(makeBank(), getExamBlueprint('ubay', 'global-citizenship'));
  assert.equal(selected.length, 30);
  assert.deepEqual(categoryCounts(selected), {
    'ubay-gc-social-justice': 2,
    'ubay-gc-types-justice': 2,
    'ubay-gc-case-analysis': 3,
    'ubay-gc-human-rights': 2,
    'ubay-gc-wealth-poverty': 2,
    'ubay-gc-types-poverty': 3,
    'ubay-gc-causes-effects': 4,
    'ubay-gc-poverty-cycle': 2,
    'ubay-gc-equal-opportunity': 3,
    'ubay-gc-equity': 3,
    'ubay-gc-barriers-support': 2,
    'ubay-gc-policy': 2,
  });
  assert.deepEqual(overallDifficulties(selected), { Mudah: 8, Sedang: 15, Sulit: 7 });
});
