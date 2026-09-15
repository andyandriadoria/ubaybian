import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIAN_BAHASA_INDONESIA_BLUEPRINT,
  bianBahasaIndonesiaTopicCategory,
  getBianBahasaIndonesiaBlueprint,
  selectBianBahasaIndonesiaQuestions,
} from '../src/bian-bahasa-indonesia-assessment.js';

const slots = [
  ['Mengenal Perasaan dari Situasi','Mudah','multiple-choice','ST1'],
  ['Penyebab Perasaan','Mudah','multiple-choice','ST1'],
  ['Informasi Eksplisit: Siapa','Mudah','multiple-choice','ST1'],
  ['Informasi Eksplisit: Apa','Mudah','multiple-choice','ST1'],
  ['Informasi Eksplisit: Di Mana','Mudah','multiple-choice','ST1'],
  ['Informasi Eksplisit: Kapan','Mudah','text','ST1'],
  ['Urutan Kejadian','Sedang','multiple-choice','ST1'],
  ['Sebab-Akibat dalam Cerita','Sedang','multiple-choice','ST1'],
  ['Menceritakan Kembali Singkat','Sulit','open-response','ST1'],
  ['Kosakata dari Konteks','Mudah','multiple-choice','ST2'],
  ['Arti Kosakata','Mudah','multiple-choice','ST2'],
  ['Menggunakan Kosakata','Sedang','text','ST2'],
  ['Huruf Kapital Awal Kalimat','Mudah','multiple-choice',''],
  ['Huruf Kapital Nama Orang','Mudah','multiple-choice',''],
  ['Tanda Titik','Mudah','text',''],
  ['Tanda Tanya','Mudah','text',''],
  ['Tanda Seru','Mudah','multiple-choice',''],
  ['Tanda Koma dalam Pemerincian','Sedang','multiple-choice',''],
  ['Spasi Antar Kata','Mudah','multiple-choice',''],
  ['Mengenal Subjek','Mudah','multiple-choice',''],
  ['Mengenal Predikat','Mudah','multiple-choice',''],
  ['Mengenal Objek','Sedang','multiple-choice',''],
  ['Mengenal Keterangan','Sedang','multiple-choice',''],
  ['Kalimat Berpola SPO','Sedang','multiple-choice',''],
  ['Kalimat Berpola SPOK','Sedang','multiple-choice',''],
  ['di sebagai Kata Depan','Mudah','multiple-choice',''],
  ['di- sebagai Awalan','Sedang','multiple-choice',''],
  ['Memperbaiki Penulisan di dan di-','Sulit','text',''],
  ['Mengidentifikasi Kalimat Perintah','Mudah','multiple-choice','ST3'],
  ['Mengenal Kalimat Larangan','Mudah','multiple-choice','ST3'],
  ['Melengkapi Kalimat Perintah','Sedang','text','ST3'],
  ['Keselamatan dalam Situasi Sehari-hari','Mudah','multiple-choice','ST3'],
  ['Menerapkan Aturan Keselamatan','Sedang','multiple-choice','ST3'],
  ['Menulis Kalimat Perintah','Sulit','open-response','ST3']
];

function makeBank() {
  const bank = [];
  let number = 1;
  for (const variant of ['A', 'B', 'C']) {
    const stimulusOrders = new Map();
    for (const [topic, difficulty, type, stimulusCode] of slots) {
      let stimulusId = '';
      let stimulusOrder = 0;
      if (stimulusCode) {
        stimulusId = `BIAN-BI-S1-CAL-${variant}${stimulusCode.slice(-1)}`;
        stimulusOrder = (stimulusOrders.get(stimulusId) || 0) + 1;
        stimulusOrders.set(stimulusId, stimulusOrder);
      }
      bank.push({
        id: `BIAN-G2-BI-S1-${String(number).padStart(3, '0')}`,
        topic,
        semester: '1',
        difficulty,
        type,
        stimulusId,
        stimulusOrder,
        answerKey: type === 'multiple-choice' ? 'A' : type === 'text' ? 'x' : '',
        choices: type === 'multiple-choice' ? [{ id: 'A', text: 'benar' }, { id: 'B', text: 'salah' }] : [],
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

test('Bahasa Indonesia Grade 2 final calibration is 34 questions and 90 minutes', () => {
  const blueprint = getBianBahasaIndonesiaBlueprint();
  assert.equal(blueprint.id, 'bian-bahasa-indonesia-mid-s1-2026');
  assert.equal(blueprint.targetQuestions, 34);
  assert.equal(blueprint.durationMinutes, 90);
  assert.deepEqual(blueprint.typeTargets, { 'multiple-choice': 26, text: 6, 'open-response': 2 });
  assert.deepEqual(blueprint.difficultyTargets, { mudah: 20, sedang: 11, sulit: 3 });
  assert.equal(Object.values(blueprint.topicTargets).reduce((a, b) => a + b, 0), 34);
});

test('all 34 final module-calibrated topic labels map to distinct categories', () => {
  const categories = slots.map(([topic]) => bianBahasaIndonesiaTopicCategory({ topic }));
  assert.equal(categories.filter(Boolean).length, 34);
  assert.equal(new Set(categories).size, 34);
});

test('102-question bank returns one complete calibrated 34-question variant with intact stimulus blocks', () => {
  const bank = makeBank();
  for (let run = 0; run < 80; run += 1) {
    const selected = selectBianBahasaIndonesiaQuestions(bank, BIAN_BAHASA_INDONESIA_BLUEPRINT);
    assert.equal(selected.length, 34);
    assert.deepEqual(countBy(selected, (q) => q.difficulty), { Mudah: 20, Sedang: 11, Sulit: 3 });
    assert.deepEqual(countBy(selected, (q) => q.type), { 'multiple-choice': 26, text: 6, 'open-response': 2 });

    const categories = countBy(selected, bianBahasaIndonesiaTopicCategory);
    assert.equal(Object.keys(categories).length, 34);
    assert.ok(Object.values(categories).every((count) => count === 1));

    const variantPrefixes = new Set(selected.map((q) => Math.floor((Number(q.id.slice(-3)) - 1) / 34)));
    assert.equal(variantPrefixes.size, 1);

    const stimulusIds = [...new Set(selected.map((q) => q.stimulusId).filter(Boolean))];
    assert.equal(stimulusIds.length, 3);
    for (const stimulusId of stimulusIds) {
      const group = selected.filter((q) => q.stimulusId === stimulusId);
      const positions = group.map((q) => selected.indexOf(q));
      for (let i = 1; i < positions.length; i += 1) assert.equal(positions[i], positions[i - 1] + 1);
      assert.deepEqual(group.map((q) => q.stimulusOrder), Array.from({ length: group.length }, (_, i) => i + 1));
    }
  }
});

test('selector rejects a bank when every variant is missing a calibrated slot', () => {
  const bank = makeBank().filter((q) => !['BIAN-G2-BI-S1-028', 'BIAN-G2-BI-S1-062', 'BIAN-G2-BI-S1-096'].includes(q.id));
  assert.throws(() => selectBianBahasaIndonesiaQuestions(bank), /belum memiliki satu varian 34 soal/i);
});
