import { HttpError } from './http.js';
import { randomizeChoicePositions } from './questions.js';

export const BIAN_BAHASA_INDONESIA_BLUEPRINT = Object.freeze({
  id: 'bian-bahasa-indonesia-mid-s1-2026',
  profileSlug: 'bian',
  subjectId: 'bahasa-indonesia',
  semester: '1',
  title: 'Bahasa Indonesia Midterm Assessment S1',
  subtitle: 'Grade 2 · Semester 1 · 2026/2027',
  durationMinutes: 90,
  targetQuestions: 34,
  typeTargets: Object.freeze({
    'multiple-choice': 25,
    text: 5,
    'open-response': 4,
  }),
  difficultyTargets: Object.freeze({
    mudah: 17,
    sedang: 14,
    sulit: 3,
  }),
  topicTargets: Object.freeze({
    'bian-bi-family-reading': 1,
    'bian-bi-family-activity': 1,
    'bian-bi-family-info': 1,
    'bian-bi-family-feeling': 1,
    'bian-bi-hobby-reading': 1,
    'bian-bi-hobby-info': 1,
    'bian-bi-hobby-attitude': 1,
    'bian-bi-hobby-perseverance': 1,
    'bian-bi-story-character-author': 1,
    'bian-bi-story-title-info': 1,
    'bian-bi-story-trait': 1,
    'bian-bi-family-helping': 1,
    'bian-bi-simple-info': 1,
    'bian-bi-question-punctuation': 1,
    'bian-bi-di-preposition': 1,
    'bian-bi-di-prefix': 1,
    'bian-bi-imperative-text': 1,
    'bian-bi-story-illustrator': 1,
    'bian-bi-story-character': 1,
    'bian-bi-story-setting': 1,
    'bian-bi-story-author': 1,
    'bian-bi-story-sentence': 1,
    'bian-bi-punctuation': 1,
    'bian-bi-comma-list': 1,
    'bian-bi-question-mark': 1,
    'bian-bi-exclamation': 1,
    'bian-bi-period': 1,
    'bian-bi-spo-identify': 1,
    'bian-bi-spo-write': 1,
    'bian-bi-feelings-vocab': 1,
    'bian-bi-imperative-identify': 1,
    'bian-bi-imperative-write': 1,
    'bian-bi-di-preposition-distinguish': 1,
    'bian-bi-di-prefix-distinguish': 1,
  }),
});

const TOPIC_ALIASES = Object.freeze({
  'bian-bi-family-reading': 'Membaca Teks Keluarga',
  'bian-bi-family-activity': 'Informasi Kegiatan Keluarga',
  'bian-bi-family-info': 'Informasi Keluarga',
  'bian-bi-family-feeling': 'Perasaan terhadap Keluarga',
  'bian-bi-hobby-reading': 'Hobi dan Kegemaran',
  'bian-bi-hobby-info': 'Informasi tentang Hobi',
  'bian-bi-hobby-attitude': 'Sikap terhadap Hobi',
  'bian-bi-hobby-perseverance': 'Pantang Menyerah dalam Hobi',
  'bian-bi-story-character-author': 'Tokoh dan Penulis Cerita',
  'bian-bi-story-title-info': 'Judul dan Informasi Cerita',
  'bian-bi-story-trait': 'Watak Tokoh dalam Cerita',
  'bian-bi-family-helping': 'Sikap Membantu Keluarga',
  'bian-bi-simple-info': 'Informasi Kalimat Sederhana',
  'bian-bi-question-punctuation': 'Tanda Baca Kalimat Tanya',
  'bian-bi-di-preposition': 'di sebagai Kata Depan',
  'bian-bi-di-prefix': 'di- sebagai Awalan',
  'bian-bi-imperative-text': 'Kalimat Perintah',
  'bian-bi-story-illustrator': 'Unsur Cerita: Ilustrator',
  'bian-bi-story-character': 'Unsur Cerita: Tokoh',
  'bian-bi-story-setting': 'Unsur Cerita: Latar',
  'bian-bi-story-author': 'Unsur Cerita: Penulis',
  'bian-bi-story-sentence': 'Unsur Cerita dan Kalimat',
  'bian-bi-punctuation': 'Tanda Baca',
  'bian-bi-comma-list': 'Tanda Koma dalam Pemerincian',
  'bian-bi-question-mark': 'Tanda Tanya',
  'bian-bi-exclamation': 'Tanda Seru',
  'bian-bi-period': 'Tanda Titik',
  'bian-bi-spo-identify': 'Kalimat Berpola SPO',
  'bian-bi-spo-write': 'Menulis Kalimat Berpola SPO',
  'bian-bi-feelings-vocab': 'Macam-macam Perasaan',
  'bian-bi-imperative-identify': 'Mengidentifikasi Kalimat Perintah',
  'bian-bi-imperative-write': 'Menuliskan Kalimat Perintah',
  'bian-bi-di-preposition-distinguish': 'Membedakan di sebagai Kata Depan',
  'bian-bi-di-prefix-distinguish': 'Membedakan di- sebagai Awalan',
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
      'Bank Bahasa Indonesia belum memiliki satu varian 34 soal yang memenuhi seluruh pointer, tipe soal, dan tingkat kesulitan Assessment.',
    );
  }

  const selectedVariant = validVariants[randomIndex(validVariants.length)];
  const selected = shuffleQuestionBlocks(selectedVariant);
  return randomizeChoicePositions(selected);
}
