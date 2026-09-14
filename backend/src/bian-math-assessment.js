import { HttpError } from './http.js';
import { randomizeChoicePositions } from './questions.js';

export const BIAN_MATH_BLUEPRINT = Object.freeze({
  id: 'bian-math-mid-s1-2026',
  profileSlug: 'bian',
  subjectId: 'math',
  semester: '1',
  title: 'Math Assessment S1',
  subtitle: 'Grade 2 · Semester 1 · 2026/2027',
  durationMinutes: 90,
  targetQuestions: 30,
  typeTargets: Object.freeze({
    'multiple-choice': 12,
    text: 18,
  }),
  difficultyTargets: Object.freeze({
    mudah: 14,
    sedang: 13,
    sulit: 3,
  }),
  visualTarget: 4,
  topicTargets: Object.freeze({
    'number-sense-place-value': 7,
    'patterns-number-line': 4,
    'compare-order': 4,
    'mental-operations-difference': 5,
    'number-bonds-bar-model': 3,
    'rounding-odd-even': 3,
    'word-problems-money': 3,
    'ordinal-numbers': 1,
  }),
});

const TOPIC_ALIASES = Object.freeze({
  'number-sense-place-value': 'Number Sense, Number Words & Place Value',
  'patterns-number-line': 'Number Patterns & Number Line',
  'compare-order': 'Compare & Order',
  'mental-operations-difference': 'Mental Addition, Subtraction & Difference',
  'number-bonds-bar-model': 'Number Bonds, Bar Model & Number Facts',
  'rounding-odd-even': 'Rounding, Odd & Even',
  'word-problems-money': 'Word Problems, Money & Application',
  'ordinal-numbers': 'Ordinal Numbers',
});

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[–—/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function bianMathTopicCategory(question) {
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
  const match = /^BIAN-G2-MATH-WS-S1-(\d{3})$/i.exec(String(question?.id || '').trim());
  if (!match) return '';
  const number = Number(match[1]);
  if (!Number.isInteger(number) || number < 1) return '';
  return String(Math.floor((number - 1) / BIAN_MATH_BLUEPRINT.targetQuestions));
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

  const topicCounts = countBy(questions, bianMathTopicCategory);
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

  const visualCount = questions.filter((question) => String(question?.imageUrl || '').trim()).length;
  if (visualCount !== blueprint.visualTarget) return false;

  return questions.every((question) => Boolean(bianMathTopicCategory(question)));
}

export function getBianMathBlueprint(requestedId = '') {
  const requested = String(requestedId || '').trim();
  if (requested && requested !== BIAN_MATH_BLUEPRINT.id) {
    throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Assessment Math belum tersedia untuk blueprint ini.');
  }
  return BIAN_MATH_BLUEPRINT;
}

export function selectBianMathQuestions(questions, blueprint = BIAN_MATH_BLUEPRINT) {
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
      'Bank Math belum memiliki satu varian 30 soal yang memenuhi coverage worksheet, tipe soal, visual, dan tingkat kesulitan Assessment.',
    );
  }

  const selectedVariant = validVariants[randomIndex(validVariants.length)];
  return randomizeChoicePositions(shuffle(selectedVariant));
}
