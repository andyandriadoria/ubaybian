import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIAN_SCIENCE_BLUEPRINT,
  bianScienceTopicCategory,
  getBianScienceBlueprint,
  selectBianScienceQuestions,
} from '../src/bian-science-assessment.js';

const topicProfiles = [
  ['B2.1E Exercise and Health', ['Mudah', 'Mudah', 'Sedang']],
  ['B2.1D Food Groups and Classification', ['Mudah', 'Mudah', 'Mudah', 'Mudah', 'Mudah', 'Sedang', 'Sedang', 'Sedang']],
  ['B2.1B Different Diets', ['Mudah', 'Sedang']],
  ['B2.1H Medicines and Safety', ['Mudah', 'Mudah', 'Mudah', 'Mudah', 'Sedang', 'Sedang', 'Sedang', 'Sulit']],
  ['B2.1G Personal and Food Hygiene', ['Mudah', 'Mudah', 'Mudah', 'Sedang', 'Sedang']],
  ['B2.1A Food and Water for Survival', ['Mudah', 'Mudah', 'Sedang']],
  ['B2.1F Parental Care for Offspring', ['Mudah', 'Mudah', 'Sedang', 'Sedang', 'Sedang', 'Sulit']],
  ['B2.1C Balanced Diet', ['Sedang']],
  ['B2.2C Habitat Features', ['Sulit']],
  ['B2.2A Habitats', ['Mudah', 'Mudah', 'Sedang', 'Sedang']],
  ['B2.2B Microhabitats', ['Mudah', 'Sedang']],
  ['B2.2A+B2.2C Habitat and Survival Features', ['Sulit']],
];

function makeQuestion(id, topic, difficulty) {
  return {
    id,
    topic,
    semester: '1',
    type: 'text',
    prompt: `Question ${id}`,
    answerKey: 'answer',
    difficulty,
    choices: [],
  };
}

function makeThreeVariantBank() {
  const bank = [];
  for (const variant of ['A', 'B', 'C']) {
    let index = 1;
    for (const [topic, difficulties] of topicProfiles) {
      difficulties.forEach((difficulty) => {
        bank.push(makeQuestion(`${variant}-${index++}`, topic, difficulty));
      });
    }
  }
  return bank;
}

function difficultyCounts(questions) {
  const result = { Mudah: 0, Sedang: 0, Sulit: 0 };
  questions.forEach((question) => { result[question.difficulty] += 1; });
  return result;
}

function categoryCounts(questions) {
  const result = {};
  questions.forEach((question) => {
    const category = bianScienceTopicCategory(question);
    result[category] = (result[category] || 0) + 1;
  });
  return result;
}

test('Bian Science S1 assessment is 44 questions and 60 minutes', () => {
  const blueprint = getBianScienceBlueprint();
  assert.equal(blueprint.id, 'bian-science-mid-s1-2026');
  assert.equal(blueprint.profileSlug, 'bian');
  assert.equal(blueprint.subjectId, 'science');
  assert.equal(blueprint.targetQuestions, 44);
  assert.equal(blueprint.durationMinutes, 60);
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 44);
});

test('Bian Science difficulty blueprint totals 22 easy, 18 medium, 4 hard', () => {
  const totals = { mudah: 0, sedang: 0, sulit: 0 };
  for (const [category, topicTarget] of Object.entries(BIAN_SCIENCE_BLUEPRINT.topicTargets)) {
    const difficultyTargets = BIAN_SCIENCE_BLUEPRINT.topicDifficultyTargets[category];
    assert.ok(difficultyTargets, `missing difficulty target for ${category}`);
    assert.equal(Object.values(difficultyTargets).reduce((sum, value) => sum + value, 0), topicTarget);
    Object.entries(difficultyTargets).forEach(([difficulty, value]) => { totals[difficulty] += value; });
  }
  assert.deepEqual(totals, { mudah: 22, sedang: 18, sulit: 4 });
});

test('Bian Science topic aliases match the live sheet labels', () => {
  for (const [topic] of topicProfiles) {
    assert.notEqual(bianScienceTopicCategory(makeQuestion('x', topic, 'Mudah')), '', topic);
  }
});

test('Bian Science 132-question bank always assembles exact 44-question assessment', () => {
  const bank = makeThreeVariantBank();
  const expectedCategories = { ...BIAN_SCIENCE_BLUEPRINT.topicTargets };
  for (let run = 0; run < 120; run += 1) {
    const selected = selectBianScienceQuestions(bank);
    assert.equal(selected.length, 44);
    assert.deepEqual(categoryCounts(selected), expectedCategories);
    assert.deepEqual(difficultyCounts(selected), { Mudah: 22, Sedang: 18, Sulit: 4 });
  }
});

test('Bian Science rejects an unknown assessment blueprint', () => {
  assert.throws(() => getBianScienceBlueprint('bian-science-final-s1-2026'), /belum tersedia/i);
});

test('Bian Science rejects an incomplete question bank', () => {
  assert.throws(
    () => selectBianScienceQuestions([makeQuestion('1', 'B2.1E Exercise and Health', 'Mudah')]),
    /Bank soal belum cukup/i,
  );
});
