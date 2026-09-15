import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIAN_SCIENCE_BLUEPRINT,
  bianScienceTopicCategory,
  getBianScienceBlueprint,
  selectBianScienceQuestions,
} from '../src/bian-science-assessment.js';

const topicCounts = [
  ['B2.1E Exercise and Health', 3],
  ['B2.1D Food Groups and Classification', 8],
  ['B2.1B Different Diets', 2],
  ['B2.1H Medicines and Safety', 8],
  ['B2.1G Personal and Food Hygiene', 5],
  ['B2.1A Food and Water for Survival', 3],
  ['B2.1F Parental Care for Offspring', 6],
  ['B2.1C Balanced Diet', 1],
  ['B2.2C Habitat Features', 1],
  ['B2.2A Habitats', 4],
  ['B2.2B Microhabitats', 2],
  ['B2.2A+B2.2C Habitat and Survival Features', 1],
];

function makeQuestion(id, topic, difficulty, type, visual) {
  return {
    id,
    topic,
    semester: '1',
    type,
    prompt: `Question ${id}`,
    answerKey: type === 'open-response' ? '' : 'answer',
    difficulty,
    imageUrl: visual ? `https://example.test/${id}.svg` : '',
    choices: type === 'multiple-choice'
      ? [{ id: 'A', text: 'answer' }, { id: 'B', text: 'other' }]
      : [],
  };
}

function makeVariant(startNumber) {
  const topics = [];
  for (const [topic, count] of topicCounts) {
    for (let i = 0; i < count; i += 1) topics.push(topic);
  }

  return topics.map((topic, index) => {
    const number = startNumber + index;
    const difficulty = index < 26 ? 'Mudah' : index < 39 ? 'Sedang' : 'Sulit';
    const type = index < 37 ? 'multiple-choice' : index < 43 ? 'text' : 'open-response';
    const visual = index < 19;
    return makeQuestion(
      `BIAN-G2-SCI-MID-${String(number).padStart(3, '0')}`,
      topic,
      difficulty,
      type,
      visual,
    );
  });
}

function makeThreeVariantBank() {
  return [...makeVariant(1), ...makeVariant(45), ...makeVariant(89)];
}

function countBy(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

test('Bian Science recalibrated Assessment is 44 questions and 60 minutes', () => {
  const blueprint = getBianScienceBlueprint();
  assert.equal(blueprint.id, 'bian-science-mid-s1-2026');
  assert.equal(blueprint.profileSlug, 'bian');
  assert.equal(blueprint.subjectId, 'science');
  assert.equal(blueprint.targetQuestions, 44);
  assert.equal(blueprint.durationMinutes, 60);
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 44);
});

test('Science calibration favors short objective questions with one open response', () => {
  assert.deepEqual(BIAN_SCIENCE_BLUEPRINT.typeTargets, {
    'multiple-choice': 37,
    text: 6,
    'open-response': 1,
  });
  assert.deepEqual(BIAN_SCIENCE_BLUEPRINT.difficultyTargets, {
    mudah: 26,
    sedang: 13,
    sulit: 5,
  });
  assert.equal(BIAN_SCIENCE_BLUEPRINT.visualTarget, 19);
});

test('Science calibration keeps about 60/30/10 difficulty and over 40% visual items', () => {
  const total = BIAN_SCIENCE_BLUEPRINT.targetQuestions;
  assert.ok(BIAN_SCIENCE_BLUEPRINT.difficultyTargets.mudah / total >= 0.58);
  assert.ok(BIAN_SCIENCE_BLUEPRINT.difficultyTargets.sedang / total >= 0.29);
  assert.ok(BIAN_SCIENCE_BLUEPRINT.difficultyTargets.sulit / total <= 0.12);
  assert.ok(BIAN_SCIENCE_BLUEPRINT.visualTarget / total >= 0.40);
});

test('Bian Science topic aliases match the live sheet labels', () => {
  for (const [topic] of topicCounts) {
    assert.notEqual(
      bianScienceTopicCategory(makeQuestion('x', topic, 'Mudah', 'multiple-choice', false)),
      '',
      topic,
    );
  }
});

test('132-question Science bank always returns one complete 44-question parallel form', () => {
  const bank = makeThreeVariantBank();
  for (let run = 0; run < 120; run += 1) {
    const selected = selectBianScienceQuestions(bank);
    assert.equal(selected.length, 44);
    assert.deepEqual(countBy(selected, (q) => q.difficulty), { Mudah: 26, Sedang: 13, Sulit: 5 });
    assert.deepEqual(countBy(selected, (q) => q.type), {
      'multiple-choice': 37,
      text: 6,
      'open-response': 1,
    });
    assert.equal(selected.filter((q) => q.imageUrl).length, 19);
    assert.deepEqual(countBy(selected, bianScienceTopicCategory), BIAN_SCIENCE_BLUEPRINT.topicTargets);

    const variants = new Set(selected.map((q) => Math.floor((Number(q.id.slice(-3)) - 1) / 44)));
    assert.equal(variants.size, 1);
  }
});

test('Bian Science rejects an unknown assessment blueprint', () => {
  assert.throws(() => getBianScienceBlueprint('bian-science-final-s1-2026'), /belum tersedia/i);
});

test('Bian Science rejects old or incomplete banks outside the recalibrated ID range', () => {
  const old = [makeQuestion('BIAN-G2-SCI-OLD-001', 'B2.1E Exercise and Health', 'Mudah', 'multiple-choice', false)];
  assert.throws(() => selectBianScienceQuestions(old), /Bank soal belum cukup/i);

  const broken = makeThreeVariantBank().filter((q) => !q.id.endsWith('044') && !q.id.endsWith('088') && !q.id.endsWith('132'));
  assert.throws(() => selectBianScienceQuestions(broken), /belum memiliki satu varian 44 soal/i);
});
