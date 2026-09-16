import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIAN_PAIBP_BLUEPRINT,
  bianPaibpTopicCategory,
  getBianPaibpBlueprint,
  selectBianPaibpQuestions,
} from '../src/bian-paibp-assessment.js';

const slots = [
  ['Surah An-Nās — Jumlah ayat','Mudah','multiple-choice'],
  ['Surah An-Nās — Arti An-Nās','Mudah','text'],
  ['Huruf Hijaiyah — Arah membaca','Mudah','text'],
  ['Asmaul Husna — Al-Hafizh','Mudah','multiple-choice'],
  ['Akhlak Terpuji — Perilaku kepada teman','Mudah','multiple-choice'],
  ["Konsep Dasar PAIBP — An-Nās, Tauhid, Kejujuran, Adab Al-Qur'an & Huruf Hijaiyah",'Sedang','multiple-choice'],
  ['Surah An-Nās — Pesan utama','Sedang','open-response'],
  ['Konsep Dasar PAIBP — Makna dan contoh','Mudah','multiple-choice'],
  ['Adab, Tauhid, Akhlak, An-Nās & Huruf Hijaiyah — Benar/Salah','Sedang','multiple-choice'],
  ['Konsep Dasar PAIBP — Fakta dasar','Sedang','multiple-choice'],
  ['Surah An-Nās, Huruf Hijaiyah, Tauhid & Kejujuran — Pilihan tepat','Sedang','multiple-choice'],
  ['Surah An-Nās — Ayat pertama','Sulit','open-response'],
  ['Asmaul Husna — Arti Asmaul Husna','Mudah','text'],
  ['Akhlak Terpuji — Tiga contoh','Sedang','open-response'],
  ['Huruf Hijaiyah — Menulis tiga huruf','Mudah','open-response'],
  ['Allah SWT — Penjelasan singkat','Sedang','open-response'],
  ['Akhlak, Tauhid & Surah An-Nās — Benar/Salah','Mudah','multiple-choice'],
];

function makeBank() {
  const bank = [];
  let number = 1;
  for (const variant of ['A', 'B', 'C']) {
    for (const [topic, difficulty, type] of slots) {
      bank.push({
        id: `BIAN-G2-PAIBP-S1-${String(number).padStart(3, '0')}`,
        topic,
        semester: '1',
        difficulty,
        type,
        stimulusId: '',
        stimulusOrder: 0,
        answerKey: type === 'multiple-choice' ? 'A' : type === 'text' ? 'x' : '',
        choices: type === 'multiple-choice'
          ? [{ id: 'A', text: 'benar' }, { id: 'B', text: 'salah' }]
          : [],
        variant,
      });
      number += 1;
    }
  }
  return bank;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

test('PAIBP Grade 2 Assessment blueprint is 17 questions and uses operational 60-minute duration', () => {
  const blueprint = getBianPaibpBlueprint();
  assert.equal(blueprint.id, 'bian-paibp-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 17);
  assert.equal(blueprint.durationMinutes, 60);
  assert.deepEqual(blueprint.typeTargets, { 'multiple-choice': 9, text: 3, 'open-response': 5 });
  assert.deepEqual(blueprint.difficultyTargets, { mudah: 9, sedang: 7, sulit: 1 });
  assert.equal(Object.values(blueprint.topicTargets).reduce((a, b) => a + b, 0), 17);
});

test('all 17 MHIS pointer topic labels map to distinct PAIBP categories', () => {
  const categories = slots.map(([topic]) => bianPaibpTopicCategory({ topic }));
  assert.equal(categories.filter(Boolean).length, 17);
  assert.equal(new Set(categories).size, 17);
});

test('51-question three-variant PAIBP bank returns one complete 17-question paper', () => {
  const bank = makeBank();
  for (let run = 0; run < 80; run += 1) {
    const selected = selectBianPaibpQuestions(bank, BIAN_PAIBP_BLUEPRINT);
    assert.equal(selected.length, 17);
    assert.deepEqual(countBy(selected, (q) => q.difficulty), { Mudah: 9, Sedang: 7, Sulit: 1 });
    assert.deepEqual(countBy(selected, (q) => q.type), { 'multiple-choice': 9, text: 3, 'open-response': 5 });

    const categories = countBy(selected, bianPaibpTopicCategory);
    assert.equal(Object.keys(categories).length, 17);
    assert.ok(Object.values(categories).every((count) => count === 1));

    const variantPrefixes = new Set(selected.map((q) => Math.floor((Number(q.id.slice(-3)) - 1) / 17)));
    assert.equal(variantPrefixes.size, 1);
  }
});

test('PAIBP selector rejects broken variants', () => {
  const bank = makeBank().filter((q) => ![
    'BIAN-G2-PAIBP-S1-007',
    'BIAN-G2-PAIBP-S1-024',
    'BIAN-G2-PAIBP-S1-041',
  ].includes(q.id));
  assert.throws(() => selectBianPaibpQuestions(bank), /belum memiliki satu varian 17 soal/i);
});
