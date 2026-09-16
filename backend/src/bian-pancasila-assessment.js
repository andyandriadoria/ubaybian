import { HttpError } from './http.js';
import { randomizeChoicePositions } from './questions.js';

export const BIAN_PANCASILA_BLUEPRINT = Object.freeze({
  id: 'bian-pancasila-mid-s1-2026',
  profileSlug: 'bian',
  subjectId: 'pancasila',
  semester: '1',
  title: 'Pancasila Midterm Assessment S1',
  subtitle: 'Grade 2 · Semester 1 · 2026/2027',
  durationMinutes: 90,
  targetQuestions: 26,
  typeTargets: Object.freeze({
    'multiple-choice': 18,
    text: 4,
    'open-response': 4,
  }),
  difficultyTargets: Object.freeze({
    mudah: 16,
    sedang: 10,
  }),
  legacyDifficultyTargets: Object.freeze({
    mudah: 13,
    sedang: 10,
    sulit: 3,
  }),
  topicTargets: Object.freeze({
    'bian-pan-rules-before-school': 1,
    'bian-pan-tidy-toys': 1,
    'bian-pan-personal-belongings': 1,
    'bian-pan-identify-symbol': 1,
    'bian-pan-order-principles': 1,
    'bian-pan-task-before-play': 1,
    'bian-pan-identity-hobby': 1,
    'bian-pan-duty-before-play': 1,
    'bian-pan-first-principle-practice': 1,
    'bian-pan-third-principle-practice': 1,
    'bian-pan-rule-in-text': 1,
    'bian-pan-symbol-principle': 1,
    'bian-pan-identity-info': 1,
    'bian-pan-number-principles': 1,
    'bian-pan-symbol-recall': 1,
    'bian-pan-founders': 1,
    'bian-pan-pancasila-figure': 1,
    'bian-pan-home-rules-duties': 1,
    'bian-pan-self-identity': 1,
    'bian-pan-principle-behaviour': 1,
    'bian-pan-identity-hobby-info': 1,
    'bian-pan-home-rule-examples': 1,
    'bian-pan-why-task-before-play': 1,
    'bian-pan-write-identity-from-text': 1,
    'bian-pan-name-founder': 1,
    'bian-pan-respect-difference-unity': 1,
  }),
});

const TOPIC_ALIASES = Object.freeze({
  'bian-pan-rules-before-school': 'Aturan sebelum berangkat sekolah',
  'bian-pan-tidy-toys': 'Merapikan mainan setelah bermain',
  'bian-pan-personal-belongings': 'Tanggung jawab barang pribadi',
  'bian-pan-identify-symbol': 'Mengidentifikasi lambang sila Pancasila',
  'bian-pan-order-principles': 'Mengurutkan bunyi sila Pancasila',
  'bian-pan-task-before-play': 'Menyelesaikan tugas sebelum bermain',
  'bian-pan-identity-hobby': 'Identitas diri berdasarkan hobi',
  'bian-pan-duty-before-play': 'Melaksanakan kewajiban sebelum bermain',
  'bian-pan-first-principle-practice': 'Contoh pengamalan sila pertama',
  'bian-pan-third-principle-practice': 'Contoh pengamalan sila ketiga',
  'bian-pan-rule-in-text': 'Mengidentifikasi aturan dalam teks',
  'bian-pan-symbol-principle': 'Mengidentifikasi simbol dan sila Pancasila',
  'bian-pan-identity-info': 'Mengidentifikasi informasi identitas diri',
  'bian-pan-number-principles': 'Jumlah sila Pancasila',
  'bian-pan-symbol-recall': Object.freeze(['Simbol sila ketiga', 'Simbol sila kelima']),
  'bian-pan-founders': 'Tokoh perumus Pancasila',
  'bian-pan-pancasila-figure': Object.freeze(['Mengenal tokoh Pancasila', 'Tokoh anggota BPUPKI dan perumus dasar negara']),
  'bian-pan-home-rules-duties': 'Aturan dan kewajiban di rumah',
  'bian-pan-self-identity': 'Identitas diri',
  'bian-pan-principle-behaviour': 'Perilaku sesuai dengan sila Pancasila',
  'bian-pan-identity-hobby-info': 'Informasi identitas diri dan hobi',
  'bian-pan-home-rule-examples': 'Menyebutkan contoh aturan di rumah',
  'bian-pan-why-task-before-play': 'Alasan melaksanakan tugas sebelum bermain',
  'bian-pan-write-identity-from-text': 'Menuliskan identitas diri berdasarkan teks',
  'bian-pan-name-founder': 'Menyebutkan tokoh perumus Pancasila',
  'bian-pan-respect-difference-unity': 'Sikap menghargai perbedaan dan persatuan',
});

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('id-ID')
    .replace(/[–—/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function bianPancasilaTopicCategory(question) {
  const topic = normalize(question?.topic);
  for (const [category, aliases] of Object.entries(TOPIC_ALIASES)) {
    const values = Array.isArray(aliases) ? aliases : [aliases];
    if (values.some((alias) => topic === normalize(alias))) return category;
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
  const match = /^BIAN-G2-PAN-S1-(\d{3})$/i.exec(String(question?.id || '').trim());
  if (!match) return '';
  const number = Number(match[1]);
  if (!Number.isInteger(number) || number < 1) return '';
  return String(Math.floor((number - 1) / BIAN_PANCASILA_BLUEPRINT.targetQuestions));
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

function matchesCountProfile(counts, profile, total) {
  if (!profile) return false;
  const expectedTotal = Object.values(profile).reduce((sum, value) => sum + value, 0);
  if (expectedTotal !== total) return false;
  return Object.entries(profile).every(([key, target]) => (counts[key] || 0) === target);
}

function validateVariant(questions, blueprint) {
  if (questions.length !== blueprint.targetQuestions) return false;

  const topicCounts = countBy(questions, bianPancasilaTopicCategory);
  for (const [category, target] of Object.entries(blueprint.topicTargets)) {
    if ((topicCounts[category] || 0) !== target) return false;
  }
  if (Object.keys(topicCounts).length !== Object.keys(blueprint.topicTargets).length) return false;

  const difficultyCounts = countBy(questions, difficultyKey);
  const difficultyProfiles = [blueprint.difficultyTargets, blueprint.legacyDifficultyTargets].filter(Boolean);
  if (!difficultyProfiles.some((profile) => matchesCountProfile(difficultyCounts, profile, questions.length))) return false;

  const typeCounts = countBy(questions, typeKey);
  for (const [questionType, target] of Object.entries(blueprint.typeTargets)) {
    if ((typeCounts[questionType] || 0) !== target) return false;
  }

  return questions.every((question) => Boolean(bianPancasilaTopicCategory(question)));
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

export function getBianPancasilaBlueprint(requestedId = '') {
  const requested = String(requestedId || '').trim();
  if (requested && requested !== BIAN_PANCASILA_BLUEPRINT.id) {
    throw new HttpError(404, 'EXAM_BLUEPRINT_NOT_FOUND', 'Assessment Pancasila belum tersedia untuk blueprint ini.');
  }
  return BIAN_PANCASILA_BLUEPRINT;
}

export function selectBianPancasilaQuestions(questions, blueprint = BIAN_PANCASILA_BLUEPRINT) {
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
      'Bank Pancasila belum memiliki satu varian 26 soal yang memenuhi seluruh pointer, tipe soal, dan tingkat kesulitan Assessment.',
    );
  }

  const selectedVariant = validVariants[randomIndex(validVariants.length)];
  const selected = shuffleQuestionBlocks(selectedVariant);
  return randomizeChoicePositions(selected);
}
