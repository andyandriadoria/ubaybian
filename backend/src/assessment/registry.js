import { HttpError } from '../http.js';
import { getExamBlueprint } from '../exam-blueprints.js';
import { getBianMathBlueprint } from '../bian-math-assessment.js';
import { getBianScienceBlueprint } from '../bian-science-assessment.js';
import { getBianBahasaIndonesiaBlueprint } from '../bian-bahasa-indonesia-assessment.js';
import { getBianPancasilaBlueprint } from '../bian-pancasila-assessment.js';
import { getBianPaibpBlueprint } from '../bian-paibp-assessment.js';

function strategy(type, adapter) {
  return Object.freeze({ type, adapter });
}

function definition(spec) {
  return Object.freeze({
    status: 'active',
    blueprintVersion: 1,
    ...spec,
    selectionStrategy: strategy(spec.selectionStrategy.type, spec.selectionStrategy.adapter),
  });
}

const DEFAULT_ADAPTER = 'legacy-exam-blueprints-v1';

export const ASSESSMENT_DEFINITIONS = Object.freeze([
  definition({
    id: 'bian-g2-2026-2027-s1-midterm-english',
    profileSlug: 'bian', grade: 2, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'english', blueprintId: 'bian-english-mid-s1-2026',
    blueprintSource: 'exam-blueprints',
    selectionStrategy: { type: 'topic-stimulus-quota', adapter: DEFAULT_ADAPTER },
  }),
  definition({
    id: 'bian-g2-2026-2027-s1-midterm-math',
    profileSlug: 'bian', grade: 2, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'math', blueprintId: 'bian-math-mid-s1-2026',
    blueprintSource: 'bian-math',
    selectionStrategy: { type: 'validated-variant', adapter: 'bian-math-v1' },
  }),
  definition({
    id: 'bian-g2-2026-2027-s1-midterm-science',
    profileSlug: 'bian', grade: 2, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'science', blueprintId: 'bian-science-mid-s1-2026',
    blueprintSource: 'bian-science',
    selectionStrategy: { type: 'topic-difficulty-type-quota', adapter: 'bian-science-v1' },
  }),
  definition({
    id: 'bian-g2-2026-2027-s1-midterm-bahasa-indonesia',
    profileSlug: 'bian', grade: 2, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'bahasa-indonesia', blueprintId: 'bian-bahasa-indonesia-mid-s1-2026',
    blueprintSource: 'bian-bahasa-indonesia',
    selectionStrategy: { type: 'validated-variant', adapter: 'bian-bahasa-indonesia-v1' },
  }),
  definition({
    id: 'bian-g2-2026-2027-s1-midterm-pancasila',
    profileSlug: 'bian', grade: 2, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'pancasila', blueprintId: 'bian-pancasila-mid-s1-2026',
    blueprintSource: 'bian-pancasila',
    selectionStrategy: { type: 'validated-variant', adapter: 'bian-pancasila-v1' },
  }),
  definition({
    id: 'bian-g2-2026-2027-s1-midterm-paibp',
    profileSlug: 'bian', grade: 2, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'paibp', blueprintId: 'bian-paibp-mid-s1-2026',
    blueprintSource: 'bian-paibp',
    selectionStrategy: { type: 'validated-variant', adapter: 'bian-paibp-v1' },
  }),

  definition({
    id: 'ubay-g7-2026-2027-s1-midterm-english',
    profileSlug: 'ubay', grade: 7, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'english', blueprintId: 'ubay-english-mid-s1-2026',
    blueprintSource: 'exam-blueprints',
    selectionStrategy: { type: 'topic-stimulus-quota', adapter: DEFAULT_ADAPTER },
  }),
  definition({
    id: 'ubay-g7-2026-2027-s1-midterm-math',
    profileSlug: 'ubay', grade: 7, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'math', blueprintId: 'ubay-math-mid-s1-2026',
    blueprintSource: 'exam-blueprints',
    selectionStrategy: { type: 'topic-difficulty-quota', adapter: DEFAULT_ADAPTER },
  }),
  definition({
    id: 'ubay-g7-2026-2027-s1-midterm-pancasila',
    profileSlug: 'ubay', grade: 7, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'pancasila', blueprintId: 'ubay-pancasila-mid-s1-2026',
    blueprintSource: 'exam-blueprints',
    selectionStrategy: { type: 'topic-difficulty-quota', adapter: DEFAULT_ADAPTER },
  }),
  definition({
    id: 'ubay-g7-2026-2027-s1-midterm-bahasa-indonesia',
    profileSlug: 'ubay', grade: 7, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'bahasa-indonesia', blueprintId: 'ubay-bahasa-indonesia-mid-s1-2026',
    blueprintSource: 'exam-blueprints',
    selectionStrategy: { type: 'topic-difficulty-quota', adapter: DEFAULT_ADAPTER },
  }),
  definition({
    id: 'ubay-g7-2026-2027-s1-midterm-global-citizenship',
    profileSlug: 'ubay', grade: 7, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'global-citizenship', blueprintId: 'ubay-global-citizenship-mid-s1-2026',
    blueprintSource: 'exam-blueprints',
    selectionStrategy: { type: 'topic-difficulty-quota', adapter: DEFAULT_ADAPTER },
  }),
  definition({
    id: 'ubay-g7-2026-2027-s1-midterm-science',
    profileSlug: 'ubay', grade: 7, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'science', blueprintId: 'ubay-science-mid-s1-2026',
    blueprintSource: 'exam-blueprints',
    selectionStrategy: { type: 'topic-difficulty-visual-quota', adapter: DEFAULT_ADAPTER },
  }),
  definition({
    id: 'ubay-g7-2026-2027-s1-midterm-informatika',
    profileSlug: 'ubay', grade: 7, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'informatika', blueprintId: 'ubay-informatika-mid-s1-2026',
    blueprintSource: 'exam-blueprints',
    selectionStrategy: { type: 'topic-difficulty-quota', adapter: DEFAULT_ADAPTER },
  }),
  definition({
    id: 'ubay-g7-2026-2027-s1-midterm-pai',
    profileSlug: 'ubay', grade: 7, academicYear: '2026/2027', semester: 1,
    assessmentType: 'midterm', subjectId: 'pai', blueprintId: 'ubay-pai-mid-s1-2026',
    blueprintSource: 'exam-blueprints',
    selectionStrategy: { type: 'topic-difficulty-quota', adapter: DEFAULT_ADAPTER },
  }),
]);

const BLUEPRINT_LOADERS = Object.freeze({
  'exam-blueprints': (item, requestedId) => getExamBlueprint(item.profileSlug, item.subjectId, requestedId),
  'bian-math': (_item, requestedId) => getBianMathBlueprint(requestedId),
  'bian-science': (_item, requestedId) => getBianScienceBlueprint(requestedId),
  'bian-bahasa-indonesia': (_item, requestedId) => getBianBahasaIndonesiaBlueprint(requestedId),
  'bian-pancasila': (_item, requestedId) => getBianPancasilaBlueprint(requestedId),
  'bian-paibp': (_item, requestedId) => getBianPaibpBlueprint(requestedId),
});

export function listAssessmentDefinitions({ profileSlug = '', status = 'active' } = {}) {
  return ASSESSMENT_DEFINITIONS.filter((item) => (
    (!profileSlug || item.profileSlug === profileSlug)
    && (!status || item.status === status)
  ));
}

export function assessmentDefinitionForBlueprint(blueprintId) {
  const id = String(blueprintId || '').trim();
  return ASSESSMENT_DEFINITIONS.find((item) => item.blueprintId === id) || null;
}

export function publicAssessmentDefinition(item) {
  if (!item) return null;
  return Object.freeze({
    id: item.id,
    profile: item.profileSlug,
    grade: item.grade,
    academicYear: item.academicYear,
    semester: item.semester,
    assessmentType: item.assessmentType,
    subjectId: item.subjectId,
    blueprintId: item.blueprintId,
    blueprintVersion: item.blueprintVersion,
    selectionStrategy: item.selectionStrategy.type,
    status: item.status,
  });
}

function resolveContext(profileOrContext) {
  if (profileOrContext && typeof profileOrContext === 'object') {
    return {
      profileSlug: String(profileOrContext.profileSlug || profileOrContext.profile || '').trim(),
      grade: Number(profileOrContext.grade) || null,
      academicYear: String(profileOrContext.academicYear || '').trim(),
      semester: Number(profileOrContext.semester) || null,
      assessmentType: String(profileOrContext.assessmentType || '').trim(),
    };
  }
  return { profileSlug: String(profileOrContext || '').trim(), grade: null, academicYear: '', semester: null, assessmentType: '' };
}

export function resolveAssessmentDefinition(profileOrContext, subjectId, requestedId = '') {
  const context = resolveContext(profileOrContext);
  const subject = String(subjectId || '').trim();
  const requested = String(requestedId || '').trim();
  const candidates = ASSESSMENT_DEFINITIONS.filter((item) => (
    item.status === 'active'
    && item.profileSlug === context.profileSlug
    && item.subjectId === subject
    && (!context.grade || Number(item.grade) === context.grade)
    && (!context.academicYear || item.academicYear === context.academicYear)
    && (!context.semester || Number(item.semester) === context.semester)
    && (!context.assessmentType || item.assessmentType === context.assessmentType)
  ));
  const item = requested
    ? candidates.find((candidate) => candidate.blueprintId === requested || candidate.id === requested)
    : candidates[0];

  if (!item) {
    if (requested) throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Assessment belum tersedia untuk blueprint dan academic context ini.');
    throw new HttpError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment belum tersedia untuk profil, grade, semester, dan pelajaran ini.');
  }

  const loader = BLUEPRINT_LOADERS[item.blueprintSource];
  if (!loader) throw new HttpError(500, 'ASSESSMENT_BLUEPRINT_SOURCE_INVALID', 'Sumber blueprint Assessment tidak dikenali.');
  const blueprint = loader(item, item.blueprintId);
  return Object.freeze({ definition: item, blueprint });
}
