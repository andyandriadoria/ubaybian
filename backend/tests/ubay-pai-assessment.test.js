import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

function makeQuestion(id, topic, difficulty) {
  return { id, topic, semester: '1', difficulty, type: 'text', answerKey: 'ok', choices: [], imageUrl: '' };
}

const groups = [
  { topic: "Kedudukan Al-Qur'an — Fungsi Al-Qur'an", category: 'ubay-pai-quran-function', difficulties: ['Mudah', 'Sedang', 'Sedang'] },
  { topic: 'Sunnah & Hadis — Pengertian dan Kedudukan', category: 'ubay-pai-sunnah-hadith', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: "Hadis terhadap Al-Qur'an — Fungsi dan Penerapan", category: 'ubay-pai-hadith-function', difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'] },
  { topic: "Ulil Amri & Q.S. An-Nisa' 4:59", category: 'ubay-pai-ulil-amri', difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'] },
  { topic: "Pengamalan Al-Qur'an & Hadis — Bukti Keimanan", category: 'ubay-pai-practice-faith', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Tajwid — Alif Lam Qamariyyah', category: 'ubay-pai-qamariyyah', difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'] },
  { topic: 'Tajwid — Alif Lam Syamsiyah', category: 'ubay-pai-syamsiyah', difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'] },
  { topic: 'Tajwid — Qamariyyah vs Syamsiyah', category: 'ubay-pai-qam-syam', difficulties: ['Sedang', 'Sulit'] },
  { topic: "Tajwid — Hukum Bacaan Ra'", category: 'ubay-pai-ra', difficulties: ['Mudah', 'Sedang', 'Sedang'] },
];

function makeBank() {
  const bank = [];
  let id = 1;
  for (const variant of ['A', 'B']) {
    for (const group of groups) {
      for (const difficulty of group.difficulties) {
        bank.push(makeQuestion(`PAI-${variant}-${id++}`, group.topic, difficulty));
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

test('Ubay PAI Assessment S1 uses a 30-question 90-minute Grade 7 blueprint', () => {
  const blueprint = getExamBlueprint('ubay', 'pai');
  assert.equal(blueprint.id, 'ubay-pai-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 30);
  assert.equal(blueprint.durationMinutes, 90);
  assert.equal(blueprint.subtitle, 'Grade 7 · Semester 1 · 2026/2027');
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 30);
});

test('Ubay PAI topic labels map to the intended Mid Semester pointer categories', () => {
  for (const [index, group] of groups.entries()) {
    assert.equal(topicCategory(makeQuestion(String(index), group.topic, 'Sedang')), group.category);
  }
});

test('Ubay PAI selector builds the intended pointer-only topic and difficulty mix', () => {
  const selected = selectExamQuestions(makeBank(), getExamBlueprint('ubay', 'pai'));
  assert.equal(selected.length, 30);
  assert.deepEqual(categoryCounts(selected), {
    'ubay-pai-quran-function': 3,
    'ubay-pai-sunnah-hadith': 3,
    'ubay-pai-hadith-function': 4,
    'ubay-pai-ulil-amri': 4,
    'ubay-pai-practice-faith': 3,
    'ubay-pai-qamariyyah': 4,
    'ubay-pai-syamsiyah': 4,
    'ubay-pai-qam-syam': 2,
    'ubay-pai-ra': 3,
  });
  assert.deepEqual(overallDifficulties(selected), { Mudah: 8, Sedang: 15, Sulit: 7 });
});
