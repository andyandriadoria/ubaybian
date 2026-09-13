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
    let picked = 0;
    for (const [difficulty, difficultyTarget] of Object.entries(difficultyTargets)) {
      const matching = shuffle(categoryPool.filter((question) => difficultyKey(question) === difficulty));
      if (matching.length < difficultyTarget) {
        throw new HttpError(
          422,
          'EXAM_BLUEPRINT_INCOMPLETE',
          `Blueprint Assessment kekurangan ${category}/${difficulty}: butuh ${difficultyTarget}, tersedia ${matching.length}.`,
        );
      }
      selected.push(...matching.slice(0, difficultyTarget));
      picked += difficultyTarget;
    }
    if (picked !== target) {
      throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Target difficulty ${category} tidak sama dengan target topik (${picked}/${target}).`);
    }
  }

  if (selected.length !== blueprint.targetQuestions) {
    throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Jumlah soal Assessment tidak sesuai (${selected.length}/${blueprint.targetQuestions}).`);
  }

  return randomizeChoicePositions(shuffle(selected));
}
