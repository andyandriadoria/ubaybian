import { HttpError } from './http.js';

const BLUEPRINTS = Object.freeze({
  'bian-english-mid-s1-2026': Object.freeze({
    id: 'bian-english-mid-s1-2026',
    profileSlug: 'bian',
    subjectId: 'english',
    semester: '1',
    title: 'English Mid Exam S1',
    subtitle: 'Grade 2 · Semester 1 · 2026/2027',
    durationMinutes: 90,
    targetQuestions: 30,
    topicTargets: Object.freeze({
      'identifying-animals': 2,
      'colour-vocabulary': 2,
      'reading-place': 1,
      'main-idea': 1,
      'animal-behaviour': 1,
      feelings: 2,
      prediction: 1,
      punctuation: 2,
      sequence: 1,
      'vocabulary-context': 3,
      nouns: 1,
      'reading-counting': 1,
      'reading-detail': 1,
      'text-evidence': 2,
      'sentence-structure': 1,
      alphabet: 2,
      writing: 2,
      'character-identification': 1,
      verbs: 2,
      'reading-reasoning': 1,
    }),
  }),
});

const TOPIC_ALIASES = Object.freeze({
  'identifying-animals': ['identifying animals', 'animal identification'],
  'colour-vocabulary': ['colour vocabulary', 'vocabulary colours', 'vocabulary (colours)', 'color vocabulary'],
  'reading-place': ['reading comprehension place', 'reading comprehension (place)', 'setting details', 'setting'],
  'main-idea': ['reading comprehension main idea', 'reading comprehension (main idea)', 'main idea'],
  'animal-behaviour': ['animal behaviour', 'animal behavior'],
  feelings: ['feelings', 'character feelings'],
  prediction: ['prediction'],
  punctuation: ['punctuation', 'full stops', 'full stop'],
  sequence: ['sequence of events', 'sequence'],
  'vocabulary-context': ['vocabulary meaning', 'vocabulary naming', 'vocabulary (naming)', 'vocabulary in context'],
  nouns: ['grammar nouns', 'grammar (nouns)', 'nouns'],
  'reading-counting': ['reading comprehension counting', 'reading comprehension (counting)', 'counting'],
  'reading-detail': ['reading comprehension detail', 'reading comprehension (detail)', 'detail recognition'],
  'text-evidence': ['text evidence', 'evidence from text'],
  'sentence-structure': ['grammar sentence structure', 'grammar (sentence structure)', 'sentence structure'],
  alphabet: ['alphabet', 'uppercase lowercase', 'lowercase letters'],
  writing: ['writing', 'picture writing', 'descriptive writing'],
  'character-identification': ['character identification', 'main character'],
  verbs: ['grammar verbs', 'grammar (verbs)', 'grammar verbs in context', 'grammar (verbs in context)', 'verbs'],
  'reading-reasoning': ['reading comprehension reasoning', 'reading comprehension (reasoning)', 'reasoning'],
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

function groupedBlocks(questions) {
  const groups = new Map();
  for (const question of questions) {
    const key = question.stimulusId ? `stimulus:${question.stimulusId}` : `question:${question.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(question);
  }
  return [...groups.values()].map((block) => block.sort((a, b) => (a.stimulusOrder || 0) - (b.stimulusOrder || 0)));
}

export function topicCategory(question) {
  const topic = normalize(question?.topic);
  if (!topic) return '';
  for (const [category, aliases] of Object.entries(TOPIC_ALIASES)) {
    if (aliases.some((alias) => topic === normalize(alias) || topic.includes(normalize(alias)))) return category;
  }
  return '';
}

function coverageFor(questions) {
  const counts = {};
  for (const question of questions) {
    const category = topicCategory(question);
    if (!category) continue;
    counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
}

function missingCoverage(questions, blueprint) {
  const counts = coverageFor(questions);
  return Object.entries(blueprint.topicTargets)
    .map(([category, target]) => ({ category, target, actual: counts[category] || 0 }))
    .filter((item) => item.actual < item.target);
}

function coveragePenalty(questions, blueprint) {
  const counts = coverageFor(questions);
  return Object.entries(blueprint.topicTargets).reduce((sum, [category, target]) => sum + Math.abs((counts[category] || 0) - target), 0);
}

export function getExamBlueprint(profileSlug, subjectId, requestedId = '') {
  const requested = String(requestedId || '').trim();
  const candidates = Object.values(BLUEPRINTS).filter((blueprint) => blueprint.profileSlug === profileSlug && blueprint.subjectId === subjectId);
  const blueprint = requested ? BLUEPRINTS[requested] : candidates[0];
  if (!blueprint || blueprint.profileSlug !== profileSlug || blueprint.subjectId !== subjectId) {
    throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Simulasi ujian belum tersedia untuk pelajaran ini.');
  }
  return blueprint;
}

export function publicExamBlueprint(blueprint) {
  return {
    id: blueprint.id,
    title: blueprint.title,
    subtitle: blueprint.subtitle,
    semester: Number(blueprint.semester),
    durationMinutes: blueprint.durationMinutes,
    targetQuestions: blueprint.targetQuestions,
  };
}

export function selectExamQuestions(questions, blueprint) {
  const eligible = questions.filter((question) => String(question.semester) === String(blueprint.semester));
  if (eligible.length < blueprint.targetQuestions) {
    throw new HttpError(
      422,
      'EXAM_BANK_INCOMPLETE',
      `Bank soal belum cukup untuk simulasi ${blueprint.title}. Dibutuhkan ${blueprint.targetQuestions} soal, tersedia ${eligible.length}.`,
    );
  }

  const blocks = groupedBlocks(eligible).filter((block) => block.length <= blueprint.targetQuestions);
  let best = [];
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 1800; attempt += 1) {
    const ordered = shuffle(blocks);
    const selectedBlocks = [];
    let size = 0;

    for (const block of ordered) {
      if (size + block.length > blueprint.targetQuestions) continue;
      selectedBlocks.push(block);
      size += block.length;
      if (size === blueprint.targetQuestions) break;
    }

    const selected = selectedBlocks.flat();
    if (selected.length !== blueprint.targetQuestions) continue;
    const penalty = coveragePenalty(selected, blueprint);
    if (penalty < bestPenalty) {
      best = selected;
      bestPenalty = penalty;
    }
    if (penalty === 0) return selected;
  }

  const missing = missingCoverage(best, blueprint);
  const detail = missing.length
    ? missing.map((item) => `${item.category} ${item.actual}/${item.target}`).join(', ')
    : 'kombinasi Question Set belum dapat membentuk paper lengkap';
  throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Mid Exam belum terpenuhi: ${detail}.`);
}
