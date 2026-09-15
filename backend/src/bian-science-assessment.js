import { HttpError } from './http.js';
import { randomizeChoicePositions } from './questions.js';

export const BIAN_SCIENCE_BLUEPRINT = Object.freeze({
  id: 'bian-science-mid-s1-2026',
  profileSlug: 'bian',
  subjectId: 'science',
  semester: '1',
  title: 'Science Assessment S1',
  subtitle: 'Grade 2 · Semester 1 · 2026/2027',
  durationMinutes: 60,
  targetQuestions: 44,
  typeTargets: Object.freeze({
    'multiple-choice': 37,
    text: 6,
    'open-response': 1,
  }),
  difficultyTargets: Object.freeze({
    mudah: 26,
    sedang: 13,
    sulit: 5,
  }),
  visualTarget: 19,
  topicTargets: Object.freeze({
    'science-exercise-health': 3,
    'science-food-groups': 8,
    'science-different-diets': 2,
    'science-medicines-safety': 8,
    'science-hygiene': 5,
    'science-food-water-survival': 3,
    'science-parental-care': 6,
    'science-balanced-diet': 1,
    'science-habitat-features': 1,
    'science-habitats': 4,
    'science-microhabitats': 2,
    'science-habitat-integrated': 1,
  }),
});

const TOPIC_ALIASES = Object.freeze({
  'science-exercise-health': 'B2.1E Exercise and Health',
  'science-food-groups': 'B2.1D Food Groups and Classification',
  'science-different-diets': 'B2.1B Different Diets',
  'science-medicines-safety': 'B2.1H Medicines and Safety',
  'science-hygiene': 'B2.1G Personal and Food Hygiene',
  'science-food-water-survival': 'B2.1A Food and Water for Survival',
  'science-parental-care': 'B2.1F Parental Care for Offspring',
  'science-balanced-diet': 'B2.1C Balanced Diet',
  'science-habitat-features': 'B2.2C Habitat Features',
  'science-habitats': 'B2.2A Habitats',
  'science-microhabitats': 'B2.2B Microhabitats',
  'science-habitat-integrated': 'B2.2A+B2.2C Habitat and Survival Features',
});

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[–—/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function bianScienceTopicCategory(question) {
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
  const match = /^BIAN-G2-SCI-MID-(\d{3})$/i.exec(String(question?.id || '').trim());
  if (!match) return '';
  const number = Number(match[1]);
  if (!Number.isInteger(number) || number < 1 || number > 132) return '';
  return String(Math.floor((number - 1) / BIAN_SCIENCE_BLUEPRINT.targetQuestions));
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

  const topicCounts = countBy(questions, bianScienceTopicCategory);
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

  const visualCount = questions.filter((question) => Boolean(String(question?.imageUrl || '').trim())).length;
  if (visualCount !== blueprint.visualTarget) return false;

  return questions.every((question) => Boolean(bianScienceTopicCategory(question)));
}

export function getBianScienceBlueprint(requestedId = '') {
  const requested = String(requestedId || '').trim();
  if (requested && requested !== BIAN_SCIENCE_BLUEPRINT.id) {
    throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Assessment Science belum tersedia untuk blueprint ini.');
  }
  return BIAN_SCIENCE_BLUEPRINT;
}

export function selectBianScienceQuestions(questions, blueprint = BIAN_SCIENCE_BLUEPRINT) {
  const eligible = questions.filter((question) => (
    String(question.semester) === String(blueprint.semester)
    && Boolean(variantKey(question))
  ));
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
    if (!variants.has(key)) variants.set(key, []);
    variants.get(key).push(question);
  }

  const validVariants = [...variants.values()].filter((variant) => validateVariant(variant, blueprint));
  if (!validVariants.length) {
    throw new HttpError(
      422,
      'EXAM_BLUEPRINT_INCOMPLETE',
      'Bank Science belum memiliki satu varian 44 soal yang memenuhi coverage, tipe soal, visual, dan tingkat kesulitan Assessment Grade 2.',
    );
  }

  const selectedVariant = validVariants[randomIndex(validVariants.length)];
  return randomizeChoicePositions(shuffle(selectedVariant));
}
