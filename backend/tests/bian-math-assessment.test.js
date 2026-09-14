import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIAN_MATH_BLUEPRINT,
  bianMathTopicCategory,
  getBianMathBlueprint,
  selectBianMathQuestions,
} from '../src/bian-math-assessment.js';
import { resolveAssessmentDefinition } from '../src/assessment/registry.js';

const slots = [
  ['Number Sense, Number Words & Place Value', 'Mudah', 'text', false],
  ['Number Sense, Number Words & Place Value', 'Sedang', 'text', false],
  ['Number Sense, Number Words & Place Value', 'Mudah', 'text', false],
  ['Number Sense, Number Words & Place Value', 'Sedang', 'text', false],
  ['Number Sense, Number Words & Place Value', 'Sedang', 'multiple-choice', true],
  ['Number Sense, Number Words & Place Value', 'Sedang', 'text', false],
  ['Number Sense, Number Words & Place Value', 'Sulit', 'multiple-choice', false],
  ['Number Patterns & Number Line', 'Mudah', 'text', false],
  ['Number Patterns & Number Line', 'Mudah', 'text', false],
  ['Number Patterns & Number Line', 'Sedang', 'text', false],
  ['Number Patterns & Number Line', 'Sedang', 'multiple-choice', true],
  ['Compare & Order', 'Mudah', 'multiple-choice', false],
  ['Compare & Order', 'Sedang', 'multiple-choice', false],
  ['Compare & Order', 'Mudah', 'multiple-choice', false],
  ['Compare & Order', 'Sedang', 'multiple-choice', false],
  ['Mental Addition, Subtraction & Difference', 'Mudah', 'text', false],
  ['Mental Addition, Subtraction & Difference', 'Mudah', 'text', false],
  ['Mental Addition, Subtraction & Difference', 'Sedang', 'text', false],
  ['Mental Addition, Subtraction & Difference', 'Sedang', 'text', false],
  ['Mental Addition, Subtraction & Difference', 'Sulit', 'text', false],
  ['Number Bonds, Bar Model & Number Facts', 'Mudah', 'text', false],
  ['Number Bonds, Bar Model & Number Facts', 'Mudah', 'multiple-choice', true],
  ['Number Bonds, Bar Model & Number Facts', 'Mudah', 'text', false],
  ['Rounding, Odd & Even', 'Mudah', 'text', false],
  ['Rounding, Odd & Even', 'Sedang', 'multiple-choice', false],
  ['Rounding, Odd & Even', 'Mudah', 'multiple-choice', false],
  ['Word Problems, Money & Application', 'Sedang', 'text', false],
  ['Word Problems, Money & Application', 'Sulit', 'text', false],
  ['Word Problems, Money & Application', 'Sedang', 'multiple-choice', false],
  ['Ordinal Numbers', 'Mudah', 'multiple-choice', true],
];

function makeBank() {
  const bank = [];
  let number = 1;
  for (const variant of ['A', 'B', 'C']) {
    for (const [topic, difficulty, type, visual] of slots) {
      bank.push({
        id: `BIAN-G2-MATH-WS-S1-${String(number).padStart(3, '0')}`,
        topic,
        semester: '1',
        difficulty,
        type,
        imageUrl: visual ? `https://example.test/${number}.svg` : '',
        answerKey: type === 'multiple-choice' ? 'A' : '1',
        choices: type === 'multiple-choice'
          ? [{ id: 'A', text: '1' }, { id: 'B', text: '2' }]
          : [],
        variant,
      });
      number += 1;
    }
  }
  return bank;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

test('Assessment registry resolves Bian Math through the validated worksheet variant adapter', () => {
  const resolved = resolveAssessmentDefinition({ profileSlug: 'bian', grade: 2 }, 'math');
  assert.equal(resolved.blueprint.id, 'bian-math-mid-s1-2026');
  assert.equal(resolved.definition.selectionStrategy.type, 'validated-variant');
  assert.equal(resolved.definition.selectionStrategy.adapter, 'bian-math-v1');
});

test('Math Grade 2 worksheet blueprint locks 30 questions and 90 minutes', () => {
  const blueprint = getBianMathBlueprint();
  assert.equal(blueprint.id, 'bian-math-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 30);
  assert.equal(blueprint.durationMinutes, 90);
  assert.deepEqual(blueprint.typeTargets, { 'multiple-choice': 12, text: 18 });
  assert.deepEqual(blueprint.difficultyTargets, { mudah: 14, sedang: 13, sulit: 3 });
  assert.equal(blueprint.visualTarget, 4);
  assert.equal(Object.values(blueprint.topicTargets).reduce((a, b) => a + b, 0), 30);
});

test('all worksheet topic labels map to eight distinct categories', () => {
  const topics = [...new Set(slots.map(([topic]) => topic))];
  const categories = topics.map((topic) => bianMathTopicCategory({ topic }));
  assert.equal(categories.filter(Boolean).length, 8);
  assert.equal(new Set(categories).size, 8);
});

test('90-question bank returns one complete 30-question parallel form', () => {
  const bank = makeBank();
  for (let run = 0; run < 80; run += 1) {
    const selected = selectBianMathQuestions(bank, BIAN_MATH_BLUEPRINT);
    assert.equal(selected.length, 30);
    assert.deepEqual(countBy(selected, (q) => q.difficulty), { Mudah: 14, Sedang: 13, Sulit: 3 });
    assert.deepEqual(countBy(selected, (q) => q.type), { text: 18, 'multiple-choice': 12 });
    assert.equal(selected.filter((q) => q.imageUrl).length, 4);
    const categories = countBy(selected, bianMathTopicCategory);
    assert.deepEqual(categories, {
      'bian-math-number-sense-place-value': 7,
      'bian-math-patterns-number-line': 4,
      'bian-math-compare-order': 4,
      'bian-math-mental-operations-difference': 5,
      'bian-math-number-bonds-bar-model': 3,
      'bian-math-rounding-odd-even': 3,
      'bian-math-word-problems-money': 3,
      'bian-math-ordinal': 1,
    });
    const groups = new Set(selected.map((q) => Math.floor((Number(q.id.slice(-3)) - 1) / 30)));
    assert.equal(groups.size, 1);
  }
});

test('selector ignores superseded MID ids and rejects broken worksheet variants', () => {
  const old = slots.map((slot, index) => ({
    id: `BIAN-G2-MATH-MID-${String(index + 1).padStart(3, '0')}`,
    topic: slot[0],
    semester: '1',
    difficulty: slot[1],
    type: slot[2],
    imageUrl: slot[3] ? 'https://example.test/old.svg' : '',
    answerKey: '1',
    choices: [],
  }));
  assert.throws(() => selectBianMathQuestions(old), /belum cukup/i);

  const broken = makeBank().filter((q) => ![7, 37, 67].some((n) => q.id.endsWith(String(n).padStart(3, '0'))));
  assert.throws(() => selectBianMathQuestions(broken), /belum memiliki satu varian 30 soal/i);
});
