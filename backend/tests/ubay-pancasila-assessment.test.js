import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

function makeQuestion(id, topic, difficulty) {
  return { id, topic, semester: '1', difficulty };
}

const groups = [
  {
    topic: 'Sejarah Lahirnya Pancasila — BPUPKI & Peran Tokoh Pendiri Bangsa',
    category: 'ubay-pancasila-bpupki',
    difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'],
  },
  {
    topic: 'Sejarah Lahirnya Pancasila — Hari Lahir Pancasila & Panitia Sembilan',
    category: 'ubay-pancasila-panitia-sembilan',
    difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'],
  },
  {
    topic: 'Sejarah Lahirnya Pancasila — Perubahan Sila Pertama & Penetapan Resmi PPKI',
    category: 'ubay-pancasila-ppki',
    difficulties: ['Mudah', 'Sedang', 'Sedang', 'Sulit'],
  },
  {
    topic: 'Sejarah Lahirnya Pancasila — Timeline Sejarah Lahirnya Pancasila',
    category: 'ubay-pancasila-timeline',
    difficulties: ['Mudah', 'Mudah', 'Sedang'],
  },
  {
    topic: 'Dasar Pancasila — Bunyi, Lambang & Fungsi',
    category: 'ubay-pancasila-foundation',
    difficulties: ['Mudah', 'Sedang', 'Sulit'],
  },
  {
    topic: 'Penerapan Nilai-Nilai Pancasila — Toleransi Beragama & Kemanusiaan',
    category: 'ubay-pancasila-tolerance',
    difficulties: ['Mudah', 'Sedang', 'Sulit'],
  },
  {
    topic: 'Penerapan Nilai-Nilai Pancasila — Persatuan, Gotong Royong & Keadilan Sosial',
    category: 'ubay-pancasila-unity',
    difficulties: ['Mudah', 'Sedang', 'Sulit'],
  },
  {
    topic: 'Penerapan Nilai-Nilai Pancasila — Musyawarah & Demokrasi',
    category: 'ubay-pancasila-deliberation',
    difficulties: ['Sedang', 'Sedang', 'Sulit'],
  },
  {
    topic: 'Studi Kasus — Penyelesaian Konflik & Cyberbullying di Media Sosial',
    category: 'ubay-pancasila-cyberbullying',
    difficulties: ['Sedang', 'Sedang'],
  },
  {
    topic: 'Studi Kasus — Menyajikan Nilai Pancasila Secara Kreatif & Sikap Toleransi',
    category: 'ubay-pancasila-creative',
    difficulties: ['Sedang'],
  },
];

function makeBank() {
  const bank = [];
  let id = 1;
  for (const variant of ['A', 'B']) {
    for (const group of groups) {
      for (const difficulty of group.difficulties) {
        bank.push(makeQuestion(`P-${variant}-${id++}`, group.topic, difficulty));
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

test('Ubay Pancasila Assessment S1 uses a 30-question 90-minute Grade 7 blueprint', () => {
  const blueprint = getExamBlueprint('ubay', 'pancasila');
  assert.equal(blueprint.id, 'ubay-pancasila-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 30);
  assert.equal(blueprint.durationMinutes, 90);
  assert.equal(blueprint.subtitle, 'Grade 7 · Semester 1 · 2026/2027');
  assert.equal(Object.values(blueprint.topicTargets).reduce((sum, value) => sum + value, 0), 30);
});

test('Ubay Pancasila bank topic labels map to the PTS categories', () => {
  for (const [index, group] of groups.entries()) {
    assert.equal(topicCategory(makeQuestion(String(index), group.topic, 'Sedang')), group.category);
  }
});

test('Ubay Pancasila selector builds the intended topic and difficulty mix', () => {
  const selected = selectExamQuestions(makeBank(), getExamBlueprint('ubay', 'pancasila'));
  assert.equal(selected.length, 30);
  assert.deepEqual(categoryCounts(selected), {
    'ubay-pancasila-bpupki': 4,
    'ubay-pancasila-panitia-sembilan': 4,
    'ubay-pancasila-ppki': 4,
    'ubay-pancasila-timeline': 3,
    'ubay-pancasila-foundation': 3,
    'ubay-pancasila-tolerance': 3,
    'ubay-pancasila-unity': 3,
    'ubay-pancasila-deliberation': 3,
    'ubay-pancasila-cyberbullying': 2,
    'ubay-pancasila-creative': 1,
  });
  assert.deepEqual(overallDifficulties(selected), { Mudah: 8, Sedang: 15, Sulit: 7 });
});
