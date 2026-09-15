import { HttpError } from './http.js';
import { randomizeChoicePositions } from './questions.js';

export const BIAN_BAHASA_INDONESIA_BLUEPRINT = Object.freeze({
  id: 'bian-bahasa-indonesia-mid-s1-2026',
  profileSlug: 'bian',
  subjectId: 'bahasa-indonesia',
  semester: '1',
  title: 'Bahasa Indonesia Assessment S1',
  subtitle: 'Grade 2 · Semester 1 · 2026/2027',
  durationMinutes: 90,
  targetQuestions: 34,
  typeTargets: Object.freeze({
    'multiple-choice': 26,
    text: 6,
    'open-response': 2,
  }),
  difficultyTargets: Object.freeze({
    mudah: 20,
    sedang: 11,
    sulit: 3,
  }),
  topicTargets: Object.freeze({
    'bian-bi-feeling-situation': 1,
    'bian-bi-feeling-cause': 1,
    'bian-bi-info-who': 1,
    'bian-bi-info-what': 1,
    'bian-bi-info-where': 1,
    'bian-bi-info-when': 1,
    'bian-bi-sequence': 1,
    'bian-bi-story-cause': 1,
    'bian-bi-retell': 1,
    'bian-bi-vocab-context': 1,
    'bian-bi-vocab-meaning': 1,
    'bian-bi-vocab-use': 1,
    'bian-bi-capital-start': 1,
    'bian-bi-capital-name': 1,
    'bian-bi-period': 1,
    'bian-bi-question-mark': 1,
    'bian-bi-exclamation': 1,
    'bian-bi-comma-list': 1,
    'bian-bi-spacing': 1,
    'bian-bi-subject': 1,
    'bian-bi-predicate': 1,
    'bian-bi-object': 1,
    'bian-bi-adverbial': 1,
    'bian-bi-spo': 1,
    'bian-bi-spok': 1,
    'bian-bi-di-preposition': 1,
    'bian-bi-di-prefix': 1,
    'bian-bi-di-fix': 1,
    'bian-bi-imperative-identify': 1,
    'bian-bi-prohibition': 1,
    'bian-bi-imperative-complete': 1,
    'bian-bi-safety-situation': 1,
    'bian-bi-safety-application': 1,
    'bian-bi-imperative-write': 1,
  }),
});

const TOPIC_ALIASES = Object.freeze({
  'bian-bi-feeling-situation': 'Mengenal Perasaan dari Situasi',
  'bian-bi-feeling-cause': 'Penyebab Perasaan',
  'bian-bi-info-who': 'Informasi Eksplisit: Siapa',
  'bian-bi-info-what': 'Informasi Eksplisit: Apa',
  'bian-bi-info-where': 'Informasi Eksplisit: Di Mana',
  'bian-bi-info-when': 'Informasi Eksplisit: Kapan',
  'bian-bi-sequence': 'Urutan Kejadian',
  'bian-bi-story-cause': 'Sebab-Akibat dalam Cerita',
  'bian-bi-retell': 'Menceritakan Kembali Singkat',
  'bian-bi-vocab-context': 'Kosakata dari Konteks',
  'bian-bi-vocab-meaning': 'Arti Kosakata',
  'bian-bi-vocab-use': 'Menggunakan Kosakata',
  'bian-bi-capital-start': 'Huruf Kapital Awal Kalimat',
  'bian-bi-capital-name': 'Huruf Kapital Nama Orang',
  'bian-bi-period': 'Tanda Titik',
  'bian-bi-question-mark': 'Tanda Tanya',
  'bian-bi-exclamation': 'Tanda Seru',
  'bian-bi-comma-list': 'Tanda Koma dalam Pemerincian',
  'bian-bi-spacing': 'Spasi Antar Kata',
  'bian-bi-subject': 'Mengenal Subjek',
  'bian-bi-predicate': 'Mengenal Predikat',
  'bian-bi-object': 'Mengenal Objek',
  'bian-bi-adverbial': 'Mengenal Keterangan',
  'bian-bi-spo': 'Kalimat Berpola SPO',
  'bian-bi-spok': 'Kalimat Berpola SPOK',
  'bian-bi-di-preposition': 'di sebagai Kata Depan',
  'bian-bi-di-prefix': 'di- sebagai Awalan',
  'bian-bi-di-fix': 'Memperbaiki Penulisan di dan di-',
  'bian-bi-imperative-identify': 'Mengidentifikasi Kalimat Perintah',
  'bian-bi-prohibition': 'Mengenal Kalimat Larangan',
  'bian-bi-imperative-complete': 'Melengkapi Kalimat Perintah',
  'bian-bi-safety-situation': 'Keselamatan dalam Situasi Sehari-hari',
  'bian-bi-safety-application': 'Menerapkan Aturan Keselamatan',
  'bian-bi-imperative-write': 'Menulis Kalimat Perintah',
});

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('id-ID')
    .replace(/[–—/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function bianBahasaIndonesiaTopicCategory(question) {
  const topic = normalize(question?.topic);
  for (const [category, alias] of Object.entries(TOPIC_ALIASES)) {
    if (topic === normalize(alias)) return category;
  }
  return '';
}

function difficultyKey(question) {
  return String(question?.difficulty || '').trim().toLowerCase();
}

function typeKey(question) {
  return String(question?.type || '').trim().toLowerCase();
}

function variantKey(question) {
  const match = /^BIAN-G2-BI-S1-(\d{3})$/i.exec(String(question?.id || '').trim());
  if (!match) return '';
  const number = Number(match[1]);
  if (!Number.isInteger(number) || number < 1) return '';
  return String(Math.floor((number - 1) / BIAN_BAHASA_INDONESIA_BLUEPRINT.targetQuestions));
}

function randomIndex(max) {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % max;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function validateVariant(questions, blueprint) {
  if (questions.length !== blueprint.targetQuestions) return false;

  const topicCounts = countBy(questions, bianBahasaIndonesiaTopicCategory);
  for (const [category, target] of Object.entries(blueprint.topicTargets)) {
    if ((topicCounts[category] || 0) !== target) return false;
  }
  if (Object.keys(topicCounts).length !== Object.keys(blueprint.topicTargets).length) return false;

  const difficultyCounts = countBy(questions, difficultyKey);
  for (const [difficulty, target] of Object.entries(blueprint.difficultyTargets)) {
    if ((difficultyCounts[difficulty] || 0) !== target) return false;
  }

  const typeCounts = countBy(questions, typeKey);
  for (const [questionType, target] of Object.entries(blueprint.typeTargets)) {
    if ((typeCounts[questionType] || 0) !== target) return false;
  }

  return questions.every((question) => Boolean(bianBahasaIndonesiaTopicCategory(question)));
}

function shuffleQuestionBlocks(questions) {
  const blocks = new Map();
  for (const question of questions) {
    const key = question.stimulusId ? `stimulus:${question.stimulusId}` : `question:${question.id}`;
    if (!blocks.has(key)) blocks.set(key, []);
    blocks.get(key).push(question);
  }
  const orderedBlocks = [...blocks.values()].map((block) => (
    block.sort((a, b) => Number(a.stimulusOrder || 0) - Number(b.stimulusOrder || 0))
  ));
  return shuffle(orderedBlocks).flat();
}

export function getBianBahasaIndonesiaBlueprint(requestedId = '') {
  const requested = String(requestedId || '').trim();
  if (requested && requested !== BIAN_BAHASA_INDONESIA_BLUEPRINT.id) {
    throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Assessment Bahasa Indonesia belum tersedia untuk blueprint ini.');
  }
  return BIAN_BAHASA_INDONESIA_BLUEPRINT;
}

export function selectBianBahasaIndonesiaQuestions(questions, blueprint = BIAN_BAHASA_INDONESIA_BLUEPRINT) {
  const eligible = questions.filter((question) => String(question.semester) === String(blueprint.semester));
  if (eligible.length < blueprint.targetQuestions) {
    throw new HttpError(
      422,
      'EXAM_BANK_INCOMPLETE',
      `Bank soal belum cukup untuk ${blueprint.title}. Dibutuhkan ${blueprint.targetQuestions} soal, tersedia ${eligible.length}.`,
    );
  }

  const variants = new Map();
  for (const question of eligible) {
    const key = variantKey(question);
    if (!key) continue;
    if (!variants.has(key)) variants.set(key, []);
    variants.get(key).push(question);
  }

  const validVariants = [...variants.values()].filter((variant) => validateVariant(variant, blueprint));
  if (!validVariants.length) {
    throw new HttpError(
      422,
      'EXAM_BLUEPRINT_INCOMPLETE',
      'Bank Bahasa Indonesia belum memiliki satu varian 34 soal yang memenuhi kalibrasi modul MHIS, tipe soal, dan tingkat kesulitan Assessment.',
    );
  }

  const selectedVariant = validVariants[randomIndex(validVariants.length)];
  const selected = shuffleQuestionBlocks(selectedVariant);
  return randomizeChoicePositions(selected);
}
