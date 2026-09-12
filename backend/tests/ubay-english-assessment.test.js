import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

function makeQuestion(id, topic, difficulty, { stimulusId = '', stimulusOrder = 0 } = {}) {
  return { id, topic, semester: '1', difficulty, stimulusId, stimulusOrder };
}

const standaloneGroups = [
  {
    topic: 'Reading — Inference',
    category: 'ubay-english-reading',
    difficulties: ['Mudah','Sedang','Sulit'],
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
    difficulties: ['Mudah','Sedang','Sulit'],
  },
  {
    topic: 'Grammar — Controlled Production',
    category: 'ubay-english-productive-tenses',
    difficulties: ['Sedang','Sulit'],
  },
  {
    topic: 'Writing — Task Fulfilment',
    category: 'ubay-english-writing',
    difficulties: ['Mudah','Mudah','Sedang','Sedang','Sedang','Sedang','Sedang','Sulit'],
  },
];

const readingSetTopics = ['Reading Set — Evidence','Reading Set — Inference',"Reading Set — Writer's Purpose"];

function makeBank() {
  const bank = [];
  let id = 1;

  for (const setId of ['A','B','C','D']) {
    readingSetTopics.forEach((topic, index) => bank.push(makeQuestion(
      `RS-${setId}-${index + 1}`,
      topic,
      ['Sedang','Sedang','Sulit'][index],
      { stimulusId: `ST-${setId}`, stimulusOrder: index + 1 },
    )));
  }

  for (const variant of ['A','B']) {
    for (const group of standaloneGroups) {
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

function difficultiesFor(questions, category) {
  const counts = { Mudah: 0, Sedang: 0, Sulit: 0 };
  for (const question of questions.filter((item) => topicCategory(item) === category)) counts[question.difficulty] += 1;
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

test('Ubay English topic labels map to linked reading and controlled-production categories', () => {
  assert.equal(topicCategory(makeQuestion('1', 'Reading Set — Evidence', 'Sedang')), 'ubay-english-reading-set');
  assert.equal(topicCategory(makeQuestion('2', 'Reading — Main Idea', 'Mudah')), 'ubay-english-reading');
  assert.equal(topicCategory(makeQuestion('3', 'Vocabulary & Grammar — Punctuation', 'Sedang')), 'ubay-english-vocab-grammar');
  assert.equal(topicCategory(makeQuestion('4', 'Figurative Language — Metaphor', 'Sulit')), 'ubay-english-figurative');
  assert.equal(topicCategory(makeQuestion('5', 'Grammar — Past Simple', 'Mudah')), 'ubay-english-tenses');
  assert.equal(topicCategory(makeQuestion('6', 'Grammar — Controlled Production', 'Sedang')), 'ubay-english-productive-tenses');
  assert.equal(topicCategory(makeQuestion('7', 'Writing — Paragraph Organisation', 'Sedang')), 'ubay-english-writing');
});

test('Ubay English selector forces two complete reading sets and two controlled tense items', () => {
  const selected = selectExamQuestions(makeBank(), getExamBlueprint('ubay', 'english'));
  assert.equal(selected.length, 30);
  assert.deepEqual(categoryCounts(selected), {
    'ubay-english-reading-set': 6,
    'ubay-english-reading': 3,
    'ubay-english-vocab-grammar': 4,
    'ubay-english-figurative': 4,
    'ubay-english-tenses': 3,
    'ubay-english-productive-tenses': 2,
    'ubay-english-writing': 8,
  });

  const stimulusIds = [...new Set(selected.map((question) => question.stimulusId).filter(Boolean))];
  assert.equal(stimulusIds.length, 2);
  for (const stimulusId of stimulusIds) {
    const positions = selected.map((question, index) => question.stimulusId === stimulusId ? index : -1).filter((index) => index >= 0);
    assert.equal(positions.length, 3);
    assert.equal(positions[1], positions[0] + 1);
    assert.equal(positions[2], positions[1] + 1);
  }

  assert.deepEqual(difficultiesFor(selected, 'ubay-english-reading'), { Mudah: 1, Sedang: 1, Sulit: 1 });
  assert.deepEqual(difficultiesFor(selected, 'ubay-english-vocab-grammar'), { Mudah: 1, Sedang: 2, Sulit: 1 });
  assert.deepEqual(difficultiesFor(selected, 'ubay-english-figurative'), { Mudah: 1, Sedang: 1, Sulit: 2 });
  assert.deepEqual(difficultiesFor(selected, 'ubay-english-tenses'), { Mudah: 1, Sedang: 1, Sulit: 1 });
  assert.deepEqual(difficultiesFor(selected, 'ubay-english-productive-tenses'), { Mudah: 0, Sedang: 1, Sulit: 1 });
  assert.deepEqual(difficultiesFor(selected, 'ubay-english-writing'), { Mudah: 2, Sedang: 5, Sulit: 1 });
});
