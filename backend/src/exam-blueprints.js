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

const GLOBAL_ALIASES = Object.freeze({
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
});

function normalize(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[–—/_-]+/g, ' ').replace(/[()]/g, (match) => ` ${match} `).replace(/\s+/g, ' ').trim();
}

function globalTopicCategory(question) {
  const topic = normalize(question?.topic);
  if (!topic) return '';
  for (const [category, aliases] of Object.entries(GLOBAL_ALIASES)) {
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

function selectGlobalQuestions(questions, blueprint) {
  const eligible = questions.filter((question) => String(question.semester) === String(blueprint.semester));
  if (eligible.length < blueprint.targetQuestions) {
    throw new HttpError(422, 'EXAM_BANK_INCOMPLETE', `Bank soal belum cukup untuk simulasi ${blueprint.title}. Dibutuhkan ${blueprint.targetQuestions} soal, tersedia ${eligible.length}.`);
  }

  const selected = [];
  for (const [category, target] of Object.entries(blueprint.topicTargets)) {
    const pool = eligible.filter((question) => globalTopicCategory(question) === category);
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

  if (selected.length !== blueprint.targetQuestions) {
    throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Mid Exam belum terpenuhi: jumlah soal ${selected.length}/${blueprint.targetQuestions}.`);
  }
  return randomizeChoicePositions(shuffle(selected));
}

export function getExamBlueprint(profileSlug, subjectId, requestedId = '') {
  const requested = String(requestedId || '').trim();
  if (profileSlug === GLOBAL_BLUEPRINT.profileSlug && subjectId === GLOBAL_BLUEPRINT.subjectId) {
    if (requested && requested !== GLOBAL_BLUEPRINT.id) {
      throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Simulasi ujian belum tersedia untuk pelajaran ini.');
    }
    return GLOBAL_BLUEPRINT;
  }
  return base.getExamBlueprint(profileSlug, subjectId, requestedId);
}

export const publicExamBlueprint = base.publicExamBlueprint;

export function topicCategory(question) {
  return globalTopicCategory(question) || base.topicCategory(question);
}

export function selectExamQuestions(questions, blueprint) {
  if (blueprint?.id === GLOBAL_BLUEPRINT.id) return selectGlobalQuestions(questions, blueprint);
  return base.selectExamQuestions(questions, blueprint);
}
