import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIAN_SCIENCE_BLUEPRINT,
  bianScienceTopicCategory,
  getBianScienceBlueprint,
  selectBianScienceQuestions,
} from '../src/bian-science-assessment.js';

const topicProfiles = [
  ['B2.1E Exercise and Health', [['Mudah','multiple-choice'],['Mudah','multiple-choice'],['Sedang','multiple-choice']]],
  ['B2.1D Food Groups and Classification', [['Mudah','multiple-choice'],['Mudah','multiple-choice'],['Mudah','multiple-choice'],['Mudah','multiple-choice'],['Mudah','multiple-choice'],['Sedang','multiple-choice'],['Sedang','multiple-choice'],['Sedang','text']]],
  ['B2.1B Different Diets', [['Mudah','multiple-choice'],['Sedang','multiple-choice']]],
  ['B2.1H Medicines and Safety', [['Mudah','multiple-choice'],['Mudah','multiple-choice'],['Mudah','multiple-choice'],['Mudah','text'],['Sedang','multiple-choice'],['Sedang','multiple-choice'],['Sedang','multiple-choice'],['Sulit','open-response']]],
  ['B2.1G Personal and Food Hygiene', [['Mudah','multiple-choice'],['Mudah','multiple-choice'],['Mudah','text'],['Sedang','multiple-choice'],['Sedang','multiple-choice']]],
  ['B2.1A Food and Water for Survival', [['Mudah','text'],['Mudah','text'],['Sedang','text']]],
  ['B2.1F Parental Care for Offspring', [['Mudah','multiple-choice'],['Mudah','text'],['Sedang','multiple-choice'],['Sedang','multiple-choice'],['Sedang','multiple-choice'],['Sulit','open-response']]],
  ['B2.1C Balanced Diet', [['Sedang','text']]],
  ['B2.2C Habitat Features', [['Sulit','multiple-choice']]],
  ['B2.2A Habitats', [['Mudah','multiple-choice'],['Mudah','text'],['Sedang','multiple-choice'],['Sedang','text']]],
  ['B2.2B Microhabitats', [['Mudah','text'],['Sedang','text']]],
  ['B2.2A+B2.2C Habitat and Survival Features', [['Sulit','open-response']]],
];

function makeQuestion(id, topic, difficulty, type = 'text') {
  return {
    id,
    topic,
    semester: '1',
    type,
    prompt: `Question ${id}`,
    answerKey: type === 'open-response' ? '' : 'answer',
    difficulty,
    choices: [],
  };
}

function makeThreeVariantBank() {
  const bank = [];
  for (const variant of ['A', 'B', 'C']) {
    let index = 1;
    for (const [topic, slots] of topicProfiles) {
      slots.forEach(([difficulty, type]) => {
        bank.push(makeQuestion(`${variant}-${index++}`, topic, difficulty, type));
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

function typeCounts(questions) {
  const result = { 'multiple-choice': 0, text: 0, 'open-response': 0 };
  questions.forEach((question) => { result[question.type] += 1; });
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
  assert.deepEqual(blueprint.typeTargets, { 'multiple-choice': 29, text: 12, 'open-response': 3 });
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
  for (const [topic, slots] of topicProfiles) {
    assert.notEqual(bianScienceTopicCategory(makeQuestion('x', topic, slots[0][0], slots[0][1])), '', topic);
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
    assert.deepEqual(typeCounts(selected), { 'multiple-choice': 29, text: 12, 'open-response': 3 });
  }
});

test('Bian Science rejects an unknown assessment blueprint', () => {
  assert.throws(() => getBianScienceBlueprint('bian-science-final-s1-2026'), /belum tersedia/i);
});

test('Bian Science rejects an incomplete question bank', () => {
  assert.throws(
    () => selectBianScienceQuestions([makeQuestion('1', 'B2.1E Exercise and Health', 'Mudah', 'multiple-choice')]),
    /Bank soal belum cukup/i,
  );
});
