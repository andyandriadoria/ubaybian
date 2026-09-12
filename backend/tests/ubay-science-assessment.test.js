import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

function makeQuestion(id, topic, difficulty) {
  return { id, topic, semester: '1', difficulty, type: 'text', answerKey: 'ok', choices: [] };
}

const groups = [
  { topic: 'Life Processes & Levels of Organisation', category: 'ubay-science-life-organisation', difficulties: ['Sedang', 'Sedang'] },
  { topic: 'Cells & Organelles', category: 'ubay-science-cells', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Microscope & Scientific Observation', category: 'ubay-science-microscope', difficulties: ['Mudah', 'Sedang'] },
  { topic: 'Human Organ Systems', category: 'ubay-science-organ-systems', difficulties: ['Sedang'] },
  { topic: 'Plant Structure, Function & Grouping', category: 'ubay-science-plants', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Human Skeleton & Antagonistic Muscles', category: 'ubay-science-skeleton-muscles', difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'] },
  { topic: 'Habitats, Food Chains & Biotic/Abiotic Factors', category: 'ubay-science-ecology', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Particles, Solutions & Suspensions', category: 'ubay-science-particles', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Separation Methods', category: 'ubay-science-separation', difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'] },
  { topic: 'Hazard Symbols, Acids & Alkalis', category: 'ubay-science-hazards-acids', difficulties: ['Mudah', 'Sedang'] },
  { topic: 'Metals & Non-metals', category: 'ubay-science-metals', difficulties: ['Sedang', 'Sedang', 'Sulit'] },
];

function makeBank() {
  const bank = [];
  let id = 1;
  for (const variant of ['A', 'B']) {
    for (const group of groups) {
      for (const difficulty of group.difficulties) {
        bank.push(makeQuestion(`SCI-${variant}-${id++}`, group.topic, difficulty));
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

test('Ubay Science Assessment S1 uses a 30-question 120-minute Grade 7 blueprint', () => {
  const blueprint = getExamBlueprint('ubay', 'science');
  assert.equal(blueprint.id, 'ubay-science-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 30);
  assert.equal(blueprint.durationMinutes, 120);
  assert.equal(blueprint.subtitle, 'Grade 7 · Semester 1 · 2026/2027');
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 30);
});

test('Ubay Science topic labels map to the intended categories', () => {
  for (const [index, group] of groups.entries()) {
    assert.equal(topicCategory(makeQuestion(String(index), group.topic, 'Sedang')), group.category);
  }
});

test('Ubay Science selector builds the intended topic and difficulty mix', () => {
  const selected = selectExamQuestions(makeBank(), getExamBlueprint('ubay', 'science'));
  assert.equal(selected.length, 30);
  assert.deepEqual(categoryCounts(selected), {
    'ubay-science-life-organisation': 2,
    'ubay-science-cells': 3,
    'ubay-science-microscope': 2,
    'ubay-science-organ-systems': 1,
    'ubay-science-plants': 3,
    'ubay-science-skeleton-muscles': 4,
    'ubay-science-ecology': 3,
    'ubay-science-particles': 3,
    'ubay-science-separation': 4,
    'ubay-science-hazards-acids': 2,
    'ubay-science-metals': 3,
  });
  assert.deepEqual(overallDifficulties(selected), { Mudah: 8, Sedang: 15, Sulit: 7 });
});
