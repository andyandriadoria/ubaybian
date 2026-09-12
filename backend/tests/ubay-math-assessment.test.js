import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

function makeQuestion(id, topic, difficulty) {
  return { id, topic, semester: '1', difficulty, stimulusId: '', stimulusOrder: 0 };
}

const groups = [
  { topic: 'Number Properties — Divisibility & Prime Factors', category: 'ubay-math-divisibility-prime', difficulties: ['Mudah','Sedang'] },
  { topic: 'Number Properties — HCF & LCM', category: 'ubay-math-hcf-lcm', difficulties: ['Mudah','Sedang'] },
  { topic: 'Integers — Positive & Negative Integers', category: 'ubay-math-integers', difficulties: ['Mudah','Sedang','Sulit'] },
  { topic: 'Arithmetic Rules — BIDMAS', category: 'ubay-math-bidmas', difficulties: ['Mudah','Sedang','Sulit'] },
  { topic: 'Powers & Roots', category: 'ubay-math-powers-roots', difficulties: ['Mudah','Sedang'] },
  { topic: 'Fractions — Fraction Operations', category: 'ubay-math-fractions', difficulties: ['Mudah','Sedang','Sedang','Sulit'] },
  { topic: 'Decimals — Decimal Calculations', category: 'ubay-math-decimals', difficulties: ['Mudah','Sedang'] },
  { topic: 'Percentages — FDP Conversions', category: 'ubay-math-fdp', difficulties: ['Mudah','Sedang'] },
  { topic: 'Percentages — Percentage Changes', category: 'ubay-math-percentage-change', difficulties: ['Sedang','Sulit'] },
  { topic: 'Percentages — Simple Interest', category: 'ubay-math-simple-interest', difficulties: ['Sedang'] },
  { topic: 'Ratio & Proportion — Ratio Sharing', category: 'ubay-math-ratio-sharing', difficulties: ['Sedang','Sulit'] },
  { topic: 'Ratio & Proportion — Direct Proportion', category: 'ubay-math-direct-proportion', difficulties: ['Mudah','Sedang'] },
  { topic: 'Rounding & Estimation — Significant Figures', category: 'ubay-math-significant-figures', difficulties: ['Sedang'] },
  { topic: 'Rounding & Estimation — Money & Real-Life Problems', category: 'ubay-math-money-problems', difficulties: ['Sedang','Sulit'] },
];

function makeBank() {
  const bank = [];
  let id = 1;
  for (const variant of ['A', 'B']) {
    for (const group of groups) {
      for (const difficulty of group.difficulties) {
        bank.push(makeQuestion(`M-${variant}-${id++}`, group.topic, difficulty));
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

function aggregateDifficulties(questions) {
  const counts = { Mudah: 0, Sedang: 0, Sulit: 0 };
  for (const question of questions) counts[question.difficulty] += 1;
  return counts;
}

test('Ubay Math Assessment S1 uses a 30-question 120-minute Grade 7 blueprint', () => {
  const blueprint = getExamBlueprint('ubay', 'math');
  assert.equal(blueprint.id, 'ubay-math-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 30);
  assert.equal(blueprint.durationMinutes, 120);
  assert.equal(blueprint.subtitle, 'Grade 7 · Semester 1 · 2026/2027');
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 30);
});

test('Ubay Math curriculum labels map to all 14 Mid Semester categories', () => {
  for (const group of groups) {
    assert.equal(topicCategory(makeQuestion('X', group.topic, group.difficulties[0])), group.category);
  }
});

test('Ubay Math selector builds the intended topic and difficulty mix', () => {
  const selected = selectExamQuestions(makeBank(), getExamBlueprint('ubay', 'math'));
  assert.equal(selected.length, 30);
  assert.deepEqual(categoryCounts(selected), {
    'ubay-math-divisibility-prime': 2,
    'ubay-math-hcf-lcm': 2,
    'ubay-math-integers': 3,
    'ubay-math-bidmas': 3,
    'ubay-math-powers-roots': 2,
    'ubay-math-fractions': 4,
    'ubay-math-decimals': 2,
    'ubay-math-fdp': 2,
    'ubay-math-percentage-change': 2,
    'ubay-math-simple-interest': 1,
    'ubay-math-ratio-sharing': 2,
    'ubay-math-direct-proportion': 2,
    'ubay-math-significant-figures': 1,
    'ubay-math-money-problems': 2,
  });
  assert.deepEqual(aggregateDifficulties(selected), { Mudah: 9, Sedang: 15, Sulit: 6 });
});
