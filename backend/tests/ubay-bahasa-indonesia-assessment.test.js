import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

function makeQuestion(id, topic, difficulty) {
  return { id, topic, semester: '1', difficulty };
}

const groups = [
  { topic: 'Teks Deskripsi — Pengertian, Tujuan & Ciri', category: 'ubay-bi-desc-concept', difficulties: ['Sedang', 'Sedang'] },
  { topic: 'Teks Deskripsi — Informasi & Objek', category: 'ubay-bi-desc-info', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Teks Deskripsi — Kata Konkret & Pancaindra', category: 'ubay-bi-desc-concrete', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Teks Deskripsi — Kalimat Perincian & Kepaduan', category: 'ubay-bi-desc-detail', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Teks Deskripsi — Majas Personifikasi', category: 'ubay-bi-desc-personification', difficulties: ['Sedang', 'Sulit'] },
  { topic: 'Teks Deskripsi — Kata Sapaan', category: 'ubay-bi-desc-address', difficulties: ['Sedang'] },
  { topic: 'Teks Deskripsi — Imbuhan meN- & Peluluhan', category: 'ubay-bi-desc-morphology', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Teks Prosedur — Informasi, Tujuan & Struktur', category: 'ubay-bi-proc-structure', difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'] },
  { topic: 'Teks Prosedur — Urutan Langkah & Kejelasan', category: 'ubay-bi-proc-order', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Teks Prosedur — Kalimat Ajakan & Larangan', category: 'ubay-bi-proc-invitation', difficulties: ['Mudah', 'Sedang'] },
  { topic: 'Teks Prosedur — Inversi & Adverbia', category: 'ubay-bi-proc-adverb', difficulties: ['Sedang', 'Sedang'] },
  { topic: 'Integratif — Deskripsi vs Prosedur', category: 'ubay-bi-integrative', difficulties: ['Mudah', 'Sedang'] },
];

function makeBank() {
  const bank = [];
  let id = 1;
  for (const variant of ['A', 'B']) {
    for (const group of groups) {
      for (const difficulty of group.difficulties) {
        bank.push(makeQuestion(`BI-${variant}-${id++}`, group.topic, difficulty));
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

test('Ubay Bahasa Indonesia Assessment S1 uses a 30-question 90-minute Grade 7 blueprint', () => {
  const blueprint = getExamBlueprint('ubay', 'bahasa-indonesia');
  assert.equal(blueprint.id, 'ubay-bahasa-indonesia-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 30);
  assert.equal(blueprint.durationMinutes, 90);
  assert.equal(blueprint.subtitle, 'Grade 7 · Semester 1 · 2026/2027');
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 30);
});

test('Ubay Bahasa Indonesia bank topic labels map to the intended categories', () => {
  for (const [index, group] of groups.entries()) {
    assert.equal(topicCategory(makeQuestion(String(index), group.topic, 'Sedang')), group.category);
  }
});

test('Ubay Bahasa Indonesia selector builds the intended topic and difficulty mix', () => {
  const selected = selectExamQuestions(makeBank(), getExamBlueprint('ubay', 'bahasa-indonesia'));
  assert.equal(selected.length, 30);
  assert.deepEqual(categoryCounts(selected), {
    'ubay-bi-desc-concept': 2,
    'ubay-bi-desc-info': 3,
    'ubay-bi-desc-concrete': 3,
    'ubay-bi-desc-detail': 3,
    'ubay-bi-desc-personification': 2,
    'ubay-bi-desc-address': 1,
    'ubay-bi-desc-morphology': 3,
    'ubay-bi-proc-structure': 4,
    'ubay-bi-proc-order': 3,
    'ubay-bi-proc-invitation': 2,
    'ubay-bi-proc-adverb': 2,
    'ubay-bi-integrative': 2,
  });
  assert.deepEqual(overallDifficulties(selected), { Mudah: 8, Sedang: 15, Sulit: 7 });
});
