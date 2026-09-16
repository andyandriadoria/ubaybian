import { HttpError } from './http.js';
import { randomizeChoicePositions } from './questions.js';

export const BIAN_PAIBP_BLUEPRINT = Object.freeze({
  id: 'bian-paibp-mid-s1-2026',
  profileSlug: 'bian',
  subjectId: 'paibp',
  semester: '1',
  title: 'PAIBP Midterm Assessment S1',
  subtitle: 'Grade 2 · Semester 1 · 2026/2027',
  // The pointer screenshots do not show an Assessment duration. We use the
  // 60-minute Unit Test duration operationally until an official duration is supplied.
  durationMinutes: 60,
  targetQuestions: 17,
  typeTargets: Object.freeze({
    'multiple-choice': 9,
    text: 3,
    'open-response': 5,
  }),
  // Final calibration against the supplied MHIS pointer + classroom modules:
  // the first-verse writing task is the only hard item; conceptual explanations
  // remain medium for Grade 2.
  difficultyTargets: Object.freeze({
    mudah: 9,
    sedang: 7,
    sulit: 1,
  }),
  topicTargets: Object.freeze({
    'bian-paibp-annas-verses': 1,
    'bian-paibp-annas-meaning': 1,
    'bian-paibp-hijaiyah-direction': 1,
    'bian-paibp-al-hafizh': 1,
    'bian-paibp-good-friend-behaviour': 1,
    'bian-paibp-basic-integrated': 1,
    'bian-paibp-annas-messages': 1,
    'bian-paibp-concept-meaning-example': 1,
    'bian-paibp-true-false-integrated': 1,
    'bian-paibp-basic-facts': 1,
    'bian-paibp-appropriate-choice': 1,
    'bian-paibp-annas-first-verse': 1,
    'bian-paibp-asmaul-husna-meaning': 1,
    'bian-paibp-good-character-examples': 1,
    'bian-paibp-write-hijaiyah': 1,
    'bian-paibp-who-is-allah': 1,
    'bian-paibp-akhlaq-tauhid-annas': 1,
  }),
});

const TOPIC_ALIASES = Object.freeze({
  'bian-paibp-annas-verses': 'Surah An-Nās — Jumlah ayat',
  'bian-paibp-annas-meaning': 'Surah An-Nās — Arti An-Nās',
  'bian-paibp-hijaiyah-direction': 'Huruf Hijaiyah — Arah membaca',
  'bian-paibp-al-hafizh': 'Asmaul Husna — Al-Hafizh',
  'bian-paibp-good-friend-behaviour': 'Akhlak Terpuji — Perilaku kepada teman',
  'bian-paibp-basic-integrated': "Konsep Dasar PAIBP — An-Nās, Tauhid, Kejujuran, Adab Al-Qur'an & Huruf Hijaiyah",
  'bian-paibp-annas-messages': 'Surah An-Nās — Pesan utama',
  'bian-paibp-concept-meaning-example': 'Konsep Dasar PAIBP — Makna dan contoh',
  'bian-paibp-true-false-integrated': 'Adab, Tauhid, Akhlak, An-Nās & Huruf Hijaiyah — Benar/Salah',
  'bian-paibp-basic-facts': 'Konsep Dasar PAIBP — Fakta dasar',
  'bian-paibp-appropriate-choice': 'Surah An-Nās, Huruf Hijaiyah, Tauhid & Kejujuran — Pilihan tepat',
  'bian-paibp-annas-first-verse': 'Surah An-Nās — Ayat pertama',
  'bian-paibp-asmaul-husna-meaning': 'Asmaul Husna — Arti Asmaul Husna',
  'bian-paibp-good-character-examples': 'Akhlak Terpuji — Tiga contoh',
  'bian-paibp-write-hijaiyah': 'Huruf Hijaiyah — Menulis tiga huruf',
  'bian-paibp-who-is-allah': 'Allah SWT — Penjelasan singkat',
  'bian-paibp-akhlaq-tauhid-annas': 'Akhlak, Tauhid & Surah An-Nās — Benar/Salah',
});

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('id-ID')
    .replace(/[–—/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function bianPaibpTopicCategory(question) {
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
  const match = /^BIAN-G2-PAIBP-S1-(\d{3})$/i.exec(String(question?.id || '').trim());
  if (!match) return '';
  const number = Number(match[1]);
  if (!Number.isInteger(number) || number < 1) return '';
  return String(Math.floor((number - 1) / BIAN_PAIBP_BLUEPRINT.targetQuestions));
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

  const topicCounts = countBy(questions, bianPaibpTopicCategory);
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

  return questions.every((question) => Boolean(bianPaibpTopicCategory(question)));
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

export function getBianPaibpBlueprint(requestedId = '') {
  const requested = String(requestedId || '').trim();
  if (requested && requested !== BIAN_PAIBP_BLUEPRINT.id) {
    throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Assessment PAIBP belum tersedia untuk blueprint ini.');
  }
  return BIAN_PAIBP_BLUEPRINT;
}

export function selectBianPaibpQuestions(questions, blueprint = BIAN_PAIBP_BLUEPRINT) {
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
      'Bank PAIBP belum memiliki satu varian 17 soal yang memenuhi seluruh pointer, tipe soal, dan tingkat kesulitan Assessment.',
    );
  }

  const selectedVariant = validVariants[randomIndex(validVariants.length)];
  const selected = shuffleQuestionBlocks(selectedVariant);
  return randomizeChoicePositions(selected);
}
