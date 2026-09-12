import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

function makeQuestion(id, topic, difficulty) {
  return { id, topic, semester: '1', difficulty };
}

const groups = [
  {
    topic: 'Reading — Inference',
    category: 'ubay-english-reading',
    difficulties: ['Mudah','Mudah','Sedang','Sedang','Sedang','Sedang','Sedang','Sulit','Sulit'],
  },
  {
    topic: 'Vocabulary & Grammar — Clause Reasoning',
    category: 'ubay-english-vocab-grammar',
    difficulties: ['Mudah','Sedang','Sedang','Sulit'],
  },
  {
    topic: 'Figurative Language — Interpretation',
    category: 'ubay-english-figurative',
    difficulties: ['Mudah','Sedang','Sulit','Sulit'],
  },
  {
    topic: 'Grammar — Present vs Past',
    category: 'ubay-english-tenses',
    difficulties: ['Mudah','Sedang','Sedang','Sulit'],
  },
  {
    topic: 'Writing — Task Fulfilment',
    category: 'ubay-english-writing',
    difficulties: ['Mudah','Mudah','Sedang','Sedang','Sedang','Sedang','Sedang','Sedang','Sulit'],
  },
];

function makeBank() {
  const bank = [];
  let id = 1;
  for (const variant of ['A','B']) {
    for (const group of groups) {
      for (const difficulty of group.difficulties) {
        bank.push(makeQuestion(`U-${variant}-${id++}`, group.topic, difficulty));
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

function difficultyCounts(questions) {
  const counts = { Mudah: 0, Sedang: 0, Sulit: 0 };
  for (const question of questions) counts[question.difficulty] += 1;
  return counts;
}

test('Ubay English Assessment S1 uses a 30-question Grade 7 blueprint', () => {
  const blueprint = getExamBlueprint('ubay', 'english');
  assert.equal(blueprint.id, 'ubay-english-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 30);
  assert.equal(blueprint.durationMinutes, 120);
  assert.equal(blueprint.subtitle, 'Grade 7 · Semester 1 · 2026/2027');
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 30);
});

test('Ubay English topic labels map to dedicated Grade 7 assessment categories', () => {
  assert.equal(topicCategory(makeQuestion('1', 'Reading — Main Idea', 'Mudah')), 'ubay-english-reading');
  assert.equal(topicCategory(makeQuestion('2', 'Vocabulary & Grammar — Punctuation', 'Sedang')), 'ubay-english-vocab-grammar');
  assert.equal(topicCategory(makeQuestion('3', 'Figurative Language — Metaphor', 'Sulit')), 'ubay-english-figurative');
  assert.equal(topicCategory(makeQuestion('4', 'Grammar — Past Simple', 'Mudah')), 'ubay-english-tenses');
  assert.equal(topicCategory(makeQuestion('5', 'Writing — Paragraph Organisation', 'Sedang')), 'ubay-english-writing');
});

test('Ubay English selector assembles exact section and difficulty coverage', () => {
  const selected = selectExamQuestions(makeBank(), getExamBlueprint('ubay', 'english'));
  assert.equal(selected.length, 30);
  assert.deepEqual(categoryCounts(selected), {
    'ubay-english-reading': 9,
    'ubay-english-vocab-grammar': 4,
    'ubay-english-figurative': 4,
    'ubay-english-tenses': 4,
    'ubay-english-writing': 9,
  });
  assert.deepEqual(difficultyCounts(selected), { Mudah: 7, Sedang: 16, Sulit: 7 });
});
