import { HttpError } from './http.js';
import { randomizeChoicePositions } from './questions.js';

export const BIAN_SCIENCE_BLUEPRINT = Object.freeze({
  id: 'bian-science-mid-s1-2026',
  profileSlug: 'bian',
  subjectId: 'science',
  semester: '1',
  title: 'Science Mid Exam S1',
  subtitle: 'Grade 2 · Semester 1 · 2026/2027',
  durationMinutes: 60,
  targetQuestions: 44,
  typeTargets: Object.freeze({
    'multiple-choice': 29,
    text: 12,
    'open-response': 3,
  }),
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
  topicDifficultyTargets: Object.freeze({
    'science-exercise-health': Object.freeze({ mudah: 2, sedang: 1 }),
    'science-food-groups': Object.freeze({ mudah: 5, sedang: 3 }),
    'science-different-diets': Object.freeze({ mudah: 1, sedang: 1 }),
    'science-medicines-safety': Object.freeze({ mudah: 4, sedang: 3, sulit: 1 }),
    'science-hygiene': Object.freeze({ mudah: 3, sedang: 2 }),
    'science-food-water-survival': Object.freeze({ mudah: 2, sedang: 1 }),
    'science-parental-care': Object.freeze({ mudah: 2, sedang: 3, sulit: 1 }),
    'science-balanced-diet': Object.freeze({ sedang: 1 }),
    'science-habitat-features': Object.freeze({ sulit: 1 }),
    'science-habitats': Object.freeze({ mudah: 2, sedang: 2 }),
    'science-microhabitats': Object.freeze({ mudah: 1, sedang: 1 }),
    'science-habitat-integrated': Object.freeze({ sulit: 1 }),
  }),
  topicDifficultyTypeTargets: Object.freeze({
    'science-exercise-health': Object.freeze({
      mudah: Object.freeze({ 'multiple-choice': 2 }),
      sedang: Object.freeze({ 'multiple-choice': 1 }),
    }),
    'science-food-groups': Object.freeze({
      mudah: Object.freeze({ 'multiple-choice': 5 }),
      sedang: Object.freeze({ 'multiple-choice': 2, text: 1 }),
    }),
    'science-different-diets': Object.freeze({
      mudah: Object.freeze({ 'multiple-choice': 1 }),
      sedang: Object.freeze({ 'multiple-choice': 1 }),
    }),
    'science-medicines-safety': Object.freeze({
      mudah: Object.freeze({ 'multiple-choice': 3, text: 1 }),
      sedang: Object.freeze({ 'multiple-choice': 3 }),
      sulit: Object.freeze({ 'open-response': 1 }),
    }),
    'science-hygiene': Object.freeze({
      mudah: Object.freeze({ 'multiple-choice': 2, text: 1 }),
      sedang: Object.freeze({ 'multiple-choice': 2 }),
    }),
    'science-food-water-survival': Object.freeze({
      mudah: Object.freeze({ text: 2 }),
      sedang: Object.freeze({ text: 1 }),
    }),
    'science-parental-care': Object.freeze({
      mudah: Object.freeze({ 'multiple-choice': 1, text: 1 }),
      sedang: Object.freeze({ 'multiple-choice': 3 }),
      sulit: Object.freeze({ 'open-response': 1 }),
    }),
    'science-balanced-diet': Object.freeze({
      sedang: Object.freeze({ text: 1 }),
    }),
    'science-habitat-features': Object.freeze({
      sulit: Object.freeze({ 'multiple-choice': 1 }),
    }),
    'science-habitats': Object.freeze({
      mudah: Object.freeze({ 'multiple-choice': 1, text: 1 }),
      sedang: Object.freeze({ 'multiple-choice': 1, text: 1 }),
    }),
    'science-microhabitats': Object.freeze({
      mudah: Object.freeze({ text: 1 }),
      sedang: Object.freeze({ text: 1 }),
    }),
    'science-habitat-integrated': Object.freeze({
      sulit: Object.freeze({ 'open-response': 1 }),
    }),
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

export function getBianScienceBlueprint(requestedId = '') {
  const requested = String(requestedId || '').trim();
  if (requested && requested !== BIAN_SCIENCE_BLUEPRINT.id) {
    throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Assessment Science belum tersedia untuk blueprint ini.');
  }
  return BIAN_SCIENCE_BLUEPRINT;
}

export function selectBianScienceQuestions(questions, blueprint = BIAN_SCIENCE_BLUEPRINT) {
  const eligible = questions.filter((question) => String(question.semester) === String(blueprint.semester));
  if (eligible.length < blueprint.targetQuestions) {
    throw new HttpError(
      422,
      'EXAM_BANK_INCOMPLETE',
      `Bank soal belum cukup untuk ${blueprint.title}. Dibutuhkan ${blueprint.targetQuestions} soal, tersedia ${eligible.length}.`,
    );
  }

  const selected = [];
  for (const [category, target] of Object.entries(blueprint.topicTargets)) {
    const categoryPool = eligible.filter((question) => bianScienceTopicCategory(question) === category);
    if (categoryPool.length < target) {
      throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Assessment kekurangan ${category}: butuh ${target}, tersedia ${categoryPool.length}.`);
    }

    const difficultyTargets = blueprint.topicDifficultyTargets[category] || {};
    const typeTargetsByDifficulty = blueprint.topicDifficultyTypeTargets[category] || {};
    let picked = 0;
    for (const [difficulty, difficultyTarget] of Object.entries(difficultyTargets)) {
      const difficultyPool = categoryPool.filter((question) => difficultyKey(question) === difficulty);
      const typeTargets = typeTargetsByDifficulty[difficulty] || {};
      const typeTargetTotal = Object.values(typeTargets).reduce((sum, value) => sum + value, 0);
      if (typeTargetTotal !== difficultyTarget) {
        throw new HttpError(
          422,
          'EXAM_BLUEPRINT_INCOMPLETE',
          `Target tipe ${category}/${difficulty} tidak sama dengan target difficulty (${typeTargetTotal}/${difficultyTarget}).`,
        );
      }
      for (const [questionType, typeTarget] of Object.entries(typeTargets)) {
        const matching = shuffle(difficultyPool.filter((question) => typeKey(question) === questionType));
        if (matching.length < typeTarget) {
          throw new HttpError(
            422,
            'EXAM_BLUEPRINT_INCOMPLETE',
            `Blueprint Assessment kekurangan ${category}/${difficulty}/${questionType}: butuh ${typeTarget}, tersedia ${matching.length}.`,
          );
        }
        selected.push(...matching.slice(0, typeTarget));
        picked += typeTarget;
      }
    }
    if (picked !== target) {
      throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Target selection ${category} tidak sama dengan target topik (${picked}/${target}).`);
    }
  }

  if (selected.length !== blueprint.targetQuestions) {
    throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Jumlah soal Assessment tidak sesuai (${selected.length}/${blueprint.targetQuestions}).`);
  }

  const selectedTypeCounts = selected.reduce((counts, question) => {
    const key = typeKey(question);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  for (const [questionType, target] of Object.entries(blueprint.typeTargets)) {
    if ((selectedTypeCounts[questionType] || 0) !== target) {
      throw new HttpError(
        422,
        'EXAM_BLUEPRINT_INCOMPLETE',
        `Komposisi tipe soal ${questionType} tidak sesuai (${selectedTypeCounts[questionType] || 0}/${target}).`,
      );
    }
  }

  return randomizeChoicePositions(shuffle(selected));
}
