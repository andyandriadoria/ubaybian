import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

function makeQuestion(id, topic, difficulty) {
  return { id, topic, semester: '1', difficulty, type: 'text', answerKey: 'ok', choices: [], imageUrl: '' };
}

const groups = [
  { topic: 'Berpikir Komputasional — Konsep & Tujuan', category: 'ubay-inf-ct-concept', difficulties: ['Mudah', 'Sedang'] },
  { topic: 'Berpikir Komputasional — Empat Pilar', category: 'ubay-inf-ct-pillars', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Berpikir Komputasional — Penerapan', category: 'ubay-inf-ct-application', difficulties: ['Sedang', 'Sulit'] },
  { topic: 'Algoritma & Optimasi Penjadwalan', category: 'ubay-inf-algorithm', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Antarmuka Grafis (GUI)', category: 'ubay-inf-gui', difficulties: ['Mudah', 'Sedang'] },
  { topic: 'Sistem Komputer — Hardware, Software & Cara Kerja', category: 'ubay-inf-system', difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'] },
  { topic: 'Sistem Komputer — Kodifikasi Data', category: 'ubay-inf-data-code', difficulties: ['Sedang', 'Sulit'] },
  { topic: 'Manajemen Folder, File & Ekstensi', category: 'ubay-inf-file', difficulties: ['Mudah', 'Sedang', 'Sulit'] },
  { topic: 'Jaringan Komputer — Internet, LAN, Wi-Fi & Bluetooth', category: 'ubay-inf-network', difficulties: ['Mudah', 'Sedang', 'Sedang'] },
  { topic: 'Keamanan Data & Enkripsi Dasar', category: 'ubay-inf-security', difficulties: ['Sedang', 'Sulit'] },
  { topic: 'Browser & Search Engine', category: 'ubay-inf-search', difficulties: ['Sedang', 'Sedang'] },
  { topic: 'Surel & Komunikasi Digital', category: 'ubay-inf-email', difficulties: ['Mudah', 'Sedang'] },
];

function makeBank() {
  const bank = [];
  let id = 1;
  for (const variant of ['A', 'B']) {
    for (const group of groups) {
      for (const difficulty of group.difficulties) {
        bank.push(makeQuestion(`INF-${variant}-${id++}`, group.topic, difficulty));
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

test('Ubay Informatika Assessment S1 uses a 30-question 90-minute Grade 7 blueprint', () => {
  const blueprint = getExamBlueprint('ubay', 'informatika');
  assert.equal(blueprint.id, 'ubay-informatika-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 30);
  assert.equal(blueprint.durationMinutes, 90);
  assert.equal(blueprint.subtitle, 'Grade 7 · Semester 1 · 2026/2027');
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 30);
});

test('Ubay Informatika topic labels map to the intended categories', () => {
  for (const [index, group] of groups.entries()) {
    assert.equal(topicCategory(makeQuestion(String(index), group.topic, 'Sedang')), group.category);
  }
});

test('Ubay Informatika selector builds the intended topic and difficulty mix', () => {
  const selected = selectExamQuestions(makeBank(), getExamBlueprint('ubay', 'informatika'));
  assert.equal(selected.length, 30);
  assert.deepEqual(categoryCounts(selected), {
    'ubay-inf-ct-concept': 2,
    'ubay-inf-ct-pillars': 3,
    'ubay-inf-ct-application': 2,
    'ubay-inf-algorithm': 3,
    'ubay-inf-gui': 2,
    'ubay-inf-system': 4,
    'ubay-inf-data-code': 2,
    'ubay-inf-file': 3,
    'ubay-inf-network': 3,
    'ubay-inf-security': 2,
    'ubay-inf-search': 2,
    'ubay-inf-email': 2,
  });
  assert.deepEqual(overallDifficulties(selected), { Mudah: 8, Sedang: 15, Sulit: 7 });
});
