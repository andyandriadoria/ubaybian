import { HttpError } from './http.js';
import { randomizeChoicePositions } from './questions.js';
import * as base from './exam-blueprints-base.js';

const GLOBAL_BLUEPRINT = Object.freeze({
  id: 'ubay-global-citizenship-mid-s1-2026',
  profileSlug: 'ubay',
  subjectId: 'global-citizenship',
  semester: '1',
  title: 'Global Citizenship Mid Exam S1',
  subtitle: 'Grade 7 · Semester 1 · 2026/2027',
  durationMinutes: 90,
  targetQuestions: 30,
  topicTargets: Object.freeze({
    'ubay-gc-social-justice': 2,
    'ubay-gc-types-justice': 2,
    'ubay-gc-case-analysis': 3,
    'ubay-gc-human-rights': 2,
    'ubay-gc-wealth-poverty': 2,
    'ubay-gc-types-poverty': 3,
    'ubay-gc-causes-effects': 4,
    'ubay-gc-poverty-cycle': 2,
    'ubay-gc-equal-opportunity': 3,
    'ubay-gc-equity': 3,
    'ubay-gc-barriers-support': 2,
    'ubay-gc-policy': 2,
  }),
  topicDifficultyTargets: Object.freeze({
    'ubay-gc-social-justice': Object.freeze({ mudah: 1, sedang: 1 }),
    'ubay-gc-types-justice': Object.freeze({ mudah: 1, sedang: 1 }),
    'ubay-gc-case-analysis': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
    'ubay-gc-human-rights': Object.freeze({ sedang: 1, sulit: 1 }),
    'ubay-gc-wealth-poverty': Object.freeze({ sedang: 2 }),
    'ubay-gc-types-poverty': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
    'ubay-gc-causes-effects': Object.freeze({ mudah: 1, sedang: 2, sulit: 1 }),
    'ubay-gc-poverty-cycle': Object.freeze({ sedang: 1, sulit: 1 }),
    'ubay-gc-equal-opportunity': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
    'ubay-gc-equity': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
    'ubay-gc-barriers-support': Object.freeze({ mudah: 1, sedang: 1 }),
    'ubay-gc-policy': Object.freeze({ sedang: 2 }),
  }),
});

const SCIENCE_BLUEPRINT = Object.freeze({
  id: 'ubay-science-mid-s1-2026',
  profileSlug: 'ubay',
  subjectId: 'science',
  semester: '1',
  title: 'Science Mid Exam S1',
  subtitle: 'Grade 7 · Semester 1 · 2026/2027',
  durationMinutes: 120,
  targetQuestions: 30,
  visualTarget: 7,
  topicTargets: Object.freeze({
    'ubay-science-life-organisation': 2,
    'ubay-science-cells': 3,
    'ubay-science-microscope': 2,
    'ubay-science-organ-systems': 1,
    'ubay-science-plants': 3,
    'ubay-science-skeleton-muscles': 4,
    'ubay-science-ecology': 3,
    'ubay-science-particles': 3,
    'ubay-science-separation': 4,
    'ubay-science-hazards-acids': 2,
    'ubay-science-metals': 3,
  }),
  topicDifficultyTargets: Object.freeze({
    'ubay-science-life-organisation': Object.freeze({ sedang: 2 }),
    'ubay-science-cells': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
    'ubay-science-microscope': Object.freeze({ mudah: 1, sedang: 1 }),
    'ubay-science-organ-systems': Object.freeze({ sedang: 1 }),
    'ubay-science-plants': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
    'ubay-science-skeleton-muscles': Object.freeze({ mudah: 1, sedang: 2, sulit: 1 }),
    'ubay-science-ecology': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
    'ubay-science-particles': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
    'ubay-science-separation': Object.freeze({ mudah: 1, sedang: 2, sulit: 1 }),
    'ubay-science-hazards-acids': Object.freeze({ mudah: 1, sedang: 1 }),
    'ubay-science-metals': Object.freeze({ sedang: 2, sulit: 1 }),
  }),
});

const CUSTOM_BLUEPRINTS = Object.freeze([GLOBAL_BLUEPRINT, SCIENCE_BLUEPRINT]);

const TOPIC_ALIASES = Object.freeze({
  'ubay-gc-social-justice': ['social justice meaning & fair society'],
  'ubay-gc-types-justice': ['social justice types of justice'],
  'ubay-gc-case-analysis': ['justice & injustice case analysis'],
  'ubay-gc-human-rights': ['human rights discrimination & bias'],
  'ubay-gc-wealth-poverty': ['wealth & poverty core concepts'],
  'ubay-gc-types-poverty': ['wealth & poverty types of poverty'],
  'ubay-gc-causes-effects': ['wealth & poverty causes, effects & life chances'],
  'ubay-gc-poverty-cycle': ['wealth & poverty poverty cycle, marginalisation & stereotypes'],
  'ubay-gc-equal-opportunity': ['equality of opportunity meaning & importance'],
  'ubay-gc-equity': ['equality of opportunity equality, equity & formal/substantive'],
  'ubay-gc-barriers-support': ['equality of opportunity barriers & support'],
  'ubay-gc-policy': ['social justice policy & critical thinking'],

  'ubay-science-life-organisation': ['life processes & levels of organisation'],
  'ubay-science-cells': ['cells & organelles'],
  'ubay-science-microscope': ['microscope & scientific observation'],
  'ubay-science-organ-systems': ['human organ systems'],
  'ubay-science-plants': ['plant structure, function & grouping'],
  'ubay-science-skeleton-muscles': ['human skeleton & antagonistic muscles'],
  'ubay-science-ecology': ['habitats, food chains & biotic/abiotic factors'],
  'ubay-science-particles': ['particles, solutions & suspensions'],
  'ubay-science-separation': ['separation methods'],
  'ubay-science-hazards-acids': ['hazard symbols, acids & alkalis'],
  'ubay-science-metals': ['metals & non-metals'],
});

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[–—/_-]+/g, ' ')
    .replace(/[()]/g, (match) => ` ${match} `)
    .replace(/\s+/g, ' ')
    .trim();
}

function customTopicCategory(question) {
  const topic = normalize(question?.topic);
  if (!topic) return '';
  for (const [category, aliases] of Object.entries(TOPIC_ALIASES)) {
    if (aliases.some((alias) => topic === normalize(alias))) return category;
  }
  return '';
}

function difficultyKey(question) {
  return String(question?.difficulty || '').trim().toLowerCase();
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function hasVisual(question) {
  return Boolean(String(question?.imageUrl || '').trim());
}

function buildCustomSelection(eligible, blueprint) {
  const selected = [];
  for (const [category, target] of Object.entries(blueprint.topicTargets)) {
    const pool = eligible.filter((question) => customTopicCategory(question) === category);
    if (pool.length < target) {
      throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Mid Exam kekurangan ${category}: butuh ${target}, tersedia ${pool.length}.`);
    }

    const targets = blueprint.topicDifficultyTargets?.[category] || {};
    let categoryPicked = 0;
    for (const [difficulty, difficultyTarget] of Object.entries(targets)) {
      const matching = shuffle(pool.filter((question) => difficultyKey(question) === difficulty));
      if (matching.length < difficultyTarget) {
        throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Mid Exam kekurangan ${category}/${difficulty}: butuh ${difficultyTarget}, tersedia ${matching.length}.`);
      }
      selected.push(...matching.slice(0, difficultyTarget));
      categoryPicked += difficultyTarget;
    }

    if (categoryPicked !== target) {
      throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Target tingkat kesulitan ${category} tidak cocok dengan target topik (${categoryPicked}/${target}).`);
    }
  }
  return selected;
}

function ensureVisualTarget(selected, eligible, target) {
  if (!target) return selected;
  const result = [...selected];
  let visualCount = result.filter(hasVisual).length;
  if (visualCount >= target) return result;

  const selectedIds = new Set(result.map((question) => question.id));
  const replaceableIndexes = shuffle(result
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => !hasVisual(question))
    .map(({ index }) => index));

  for (const index of replaceableIndexes) {
    const current = result[index];
    const category = customTopicCategory(current);
    const difficulty = difficultyKey(current);
    const replacements = shuffle(eligible.filter((question) => (
      hasVisual(question)
      && !selectedIds.has(question.id)
      && customTopicCategory(question) === category
      && difficultyKey(question) === difficulty
    )));

    if (!replacements.length) continue;
    const replacement = replacements[0];
    selectedIds.delete(current.id);
    selectedIds.add(replacement.id);
    result[index] = replacement;
    visualCount += 1;
    if (visualCount >= target) return result;
  }

  throw new HttpError(
    422,
    'EXAM_BLUEPRINT_INCOMPLETE',
    `Blueprint Mid Exam membutuhkan minimal ${target} soal visual; bank yang sesuai topik dan kesulitan hanya dapat menyediakan ${visualCount}.`,
  );
}

function selectCustomQuestions(questions, blueprint) {
  const eligible = questions.filter((question) => String(question.semester) === String(blueprint.semester));
  if (eligible.length < blueprint.targetQuestions) {
    throw new HttpError(422, 'EXAM_BANK_INCOMPLETE', `Bank soal belum cukup untuk simulasi ${blueprint.title}. Dibutuhkan ${blueprint.targetQuestions} soal, tersedia ${eligible.length}.`);
  }

  let selected = buildCustomSelection(eligible, blueprint);
  if (selected.length !== blueprint.targetQuestions) {
    throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Mid Exam belum terpenuhi: jumlah soal ${selected.length}/${blueprint.targetQuestions}.`);
  }

  selected = ensureVisualTarget(selected, eligible, blueprint.visualTarget || 0);
  return randomizeChoicePositions(shuffle(selected));
}

export function getExamBlueprint(profileSlug, subjectId, requestedId = '') {
  const requested = String(requestedId || '').trim();
  const custom = CUSTOM_BLUEPRINTS.find((blueprint) => (
    profileSlug === blueprint.profileSlug && subjectId === blueprint.subjectId
  ));

  if (custom) {
    if (requested && requested !== custom.id) {
      throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Simulasi ujian belum tersedia untuk pelajaran ini.');
    }
    return custom;
  }

  return base.getExamBlueprint(profileSlug, subjectId, requestedId);
}

export const publicExamBlueprint = base.publicExamBlueprint;

export function topicCategory(question) {
  return customTopicCategory(question) || base.topicCategory(question);
}

export function selectExamQuestions(questions, blueprint) {
  if (CUSTOM_BLUEPRINTS.some((custom) => custom.id === blueprint?.id)) {
    return selectCustomQuestions(questions, blueprint);
  }
  return base.selectExamQuestions(questions, blueprint);
}
