import { HttpError } from './http.js';
import { randomizeChoicePositions } from './questions.js';

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
  'bian-math-mid-s1-2026': Object.freeze({
    id: 'bian-math-mid-s1-2026',
    profileSlug: 'bian',
    subjectId: 'math',
    semester: '1',
    title: 'Math Mid Exam S1',
    subtitle: 'Grade 2 · Semester 1 · 2026/2027',
    durationMinutes: 90,
    targetQuestions: 30,
    topicTargets: Object.freeze({
      'math-mental-subtraction': 5,
      'math-number-words': 2,
      'math-add-three': 2,
      'math-number-line': 1,
      'math-compare-order': 4,
      'math-statements': 2,
      'math-place-value': 2,
      'math-mental-addition': 2,
      'math-rounding': 1,
      'math-number-bonds': 2,
      'math-ordinal': 2,
      'math-patterns': 2,
      'math-extension-mental-3digit': 1,
      'math-extension-algorithm-3digit': 1,
      'math-extension-number-words': 1,
    }),
    topicDifficultyTargets: Object.freeze({
      'math-mental-subtraction': Object.freeze({ mudah: 3, sedang: 2 }),
      'math-number-words': Object.freeze({ mudah: 2 }),
      'math-add-three': Object.freeze({ mudah: 2 }),
      'math-number-line': Object.freeze({ mudah: 1 }),
      'math-compare-order': Object.freeze({ mudah: 1, sedang: 3 }),
      'math-statements': Object.freeze({ sedang: 2 }),
      'math-place-value': Object.freeze({ mudah: 1, sedang: 1 }),
      'math-mental-addition': Object.freeze({ mudah: 1, sedang: 1 }),
      'math-rounding': Object.freeze({ sedang: 1 }),
      'math-number-bonds': Object.freeze({ mudah: 2 }),
      'math-ordinal': Object.freeze({ sedang: 2 }),
      'math-patterns': Object.freeze({ mudah: 1, sedang: 1 }),
      'math-extension-mental-3digit': Object.freeze({ sulit: 1 }),
      'math-extension-algorithm-3digit': Object.freeze({ sulit: 1 }),
      'math-extension-number-words': Object.freeze({ sulit: 1 }),
    }),
  }),
  'ubay-english-mid-s1-2026': Object.freeze({
    id: 'ubay-english-mid-s1-2026',
    profileSlug: 'ubay',
    subjectId: 'english',
    semester: '1',
    title: 'English Mid Exam S1',
    subtitle: 'Grade 7 · Semester 1 · 2026/2027',
    durationMinutes: 120,
    targetQuestions: 30,
    topicTargets: Object.freeze({
      'ubay-english-reading-set': 6,
      'ubay-english-reading': 3,
      'ubay-english-vocab-grammar': 4,
      'ubay-english-figurative': 4,
      'ubay-english-tenses': 3,
      'ubay-english-productive-tenses': 2,
      'ubay-english-writing': 8,
    }),
    topicDifficultyTargets: Object.freeze({
      'ubay-english-reading': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
      'ubay-english-vocab-grammar': Object.freeze({ mudah: 1, sedang: 2, sulit: 1 }),
      'ubay-english-figurative': Object.freeze({ mudah: 1, sedang: 1, sulit: 2 }),
      'ubay-english-tenses': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
      'ubay-english-productive-tenses': Object.freeze({ sedang: 1, sulit: 1 }),
      'ubay-english-writing': Object.freeze({ mudah: 2, sedang: 5, sulit: 1 }),
    }),
  }),
  'ubay-math-mid-s1-2026': Object.freeze({
    id: 'ubay-math-mid-s1-2026',
    profileSlug: 'ubay',
    subjectId: 'math',
    semester: '1',
    title: 'Math Mid Exam S1',
    subtitle: 'Grade 7 · Semester 1 · 2026/2027',
    durationMinutes: 120,
    targetQuestions: 30,
    topicTargets: Object.freeze({
      'ubay-math-divisibility-prime': 2,
      'ubay-math-hcf-lcm': 2,
      'ubay-math-integers': 3,
      'ubay-math-bidmas': 3,
      'ubay-math-powers-roots': 2,
      'ubay-math-fractions': 4,
      'ubay-math-decimals': 2,
      'ubay-math-fdp': 2,
      'ubay-math-percentage-change': 2,
      'ubay-math-simple-interest': 1,
      'ubay-math-ratio-sharing': 2,
      'ubay-math-direct-proportion': 2,
      'ubay-math-significant-figures': 1,
      'ubay-math-money-problems': 2,
    }),
    topicDifficultyTargets: Object.freeze({
      'ubay-math-divisibility-prime': Object.freeze({ mudah: 1, sedang: 1 }),
      'ubay-math-hcf-lcm': Object.freeze({ mudah: 1, sedang: 1 }),
      'ubay-math-integers': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
      'ubay-math-bidmas': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
      'ubay-math-powers-roots': Object.freeze({ mudah: 1, sedang: 1 }),
      'ubay-math-fractions': Object.freeze({ mudah: 1, sedang: 2, sulit: 1 }),
      'ubay-math-decimals': Object.freeze({ mudah: 1, sedang: 1 }),
      'ubay-math-fdp': Object.freeze({ mudah: 1, sedang: 1 }),
      'ubay-math-percentage-change': Object.freeze({ sedang: 1, sulit: 1 }),
      'ubay-math-simple-interest': Object.freeze({ sedang: 1 }),
      'ubay-math-ratio-sharing': Object.freeze({ sedang: 1, sulit: 1 }),
      'ubay-math-direct-proportion': Object.freeze({ mudah: 1, sedang: 1 }),
      'ubay-math-significant-figures': Object.freeze({ sedang: 1 }),
      'ubay-math-money-problems': Object.freeze({ sedang: 1, sulit: 1 }),
    }),
  }),
  'ubay-pancasila-mid-s1-2026': Object.freeze({
    id: 'ubay-pancasila-mid-s1-2026',
    profileSlug: 'ubay',
    subjectId: 'pancasila',
    semester: '1',
    title: 'Pancasila Mid Exam S1',
    subtitle: 'Grade 7 · Semester 1 · 2026/2027',
    durationMinutes: 90,
    targetQuestions: 30,
    topicTargets: Object.freeze({
      'ubay-pancasila-bpupki': 4,
      'ubay-pancasila-panitia-sembilan': 4,
      'ubay-pancasila-ppki': 4,
      'ubay-pancasila-timeline': 3,
      'ubay-pancasila-foundation': 3,
      'ubay-pancasila-tolerance': 3,
      'ubay-pancasila-unity': 3,
      'ubay-pancasila-deliberation': 3,
      'ubay-pancasila-cyberbullying': 2,
      'ubay-pancasila-creative': 1,
    }),
    topicDifficultyTargets: Object.freeze({
      'ubay-pancasila-bpupki': Object.freeze({ mudah: 1, sedang: 2, sulit: 1 }),
      'ubay-pancasila-panitia-sembilan': Object.freeze({ mudah: 1, sedang: 2, sulit: 1 }),
      'ubay-pancasila-ppki': Object.freeze({ mudah: 1, sedang: 2, sulit: 1 }),
      'ubay-pancasila-timeline': Object.freeze({ mudah: 2, sedang: 1 }),
      'ubay-pancasila-foundation': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
      'ubay-pancasila-tolerance': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
      'ubay-pancasila-unity': Object.freeze({ mudah: 1, sedang: 1, sulit: 1 }),
      'ubay-pancasila-deliberation': Object.freeze({ sedang: 2, sulit: 1 }),
      'ubay-pancasila-cyberbullying': Object.freeze({ sedang: 2 }),
      'ubay-pancasila-creative': Object.freeze({ sedang: 1 }),
    }),
  }),
});

const TOPIC_ALIASES = Object.freeze({
  'ubay-english-reading-set': ['reading set'],
  'ubay-english-reading': [
    'reading main idea', 'reading inference', 'reading evidence', "reading writer's purpose",
    'reading language effect', 'reading character response', 'reading detail', 'reading sequence',
    "reading writer's choice", 'reading cause and effect',
  ],
  'ubay-english-vocab-grammar': [
    'vocabulary & grammar vocabulary in context', 'vocabulary & grammar synonym',
    'vocabulary & grammar punctuation', 'vocabulary & grammar semicolon',
    'vocabulary & grammar standard english', 'vocabulary & grammar sentence structure',
    'vocabulary & grammar independent clause', 'vocabulary & grammar adverb',
    'vocabulary & grammar apostrophe', 'vocabulary & grammar paraphrase',
    'vocabulary & grammar clause reasoning', 'vocabulary & grammar editing',
  ],
  'ubay-english-figurative': [
    'figurative language metaphor', 'figurative language simile', 'figurative language personification',
    'figurative language hyperbole', 'figurative language onomatopoeia', 'figurative language alliteration',
    'figurative language idiom', 'figurative language metaphor vs hyperbole', 'figurative language effect',
    'figurative language interpretation', 'figurative language distinguishing devices',
    "figurative language writer's choice",
  ],
  'ubay-english-productive-tenses': ['grammar controlled production', 'grammar productive tense'],
  'ubay-english-tenses': [
    'grammar present simple', 'grammar past simple', 'grammar present vs past', 'grammar error correction',
    'grammar verb form', 'grammar meaning and tense', 'grammar context', 'grammar editing in context',
    'grammar tense consistency',
  ],
  'ubay-english-writing': [
    'writing task fulfilment', 'writing topic sentence', 'writing supporting detail', 'writing linking words',
    'writing conclusion', 'writing paragraph organisation', 'writing relevance', 'writing audience and tone',
    'writing cohesion', 'writing supporting reasoning', 'writing avoiding repetition',
    'writing logical development', 'writing editing for clarity', 'writing evidence and explanation',
  ],
  'ubay-math-divisibility-prime': ['number properties divisibility & prime factors'],
  'ubay-math-hcf-lcm': ['number properties hcf & lcm'],
  'ubay-math-integers': ['integers positive & negative integers'],
  'ubay-math-bidmas': ['arithmetic rules bidmas'],
  'ubay-math-powers-roots': ['powers & roots'],
  'ubay-math-fractions': ['fractions fraction operations'],
  'ubay-math-decimals': ['decimals decimal calculations'],
  'ubay-math-fdp': ['percentages fdp conversions'],
  'ubay-math-percentage-change': ['percentages percentage changes'],
  'ubay-math-simple-interest': ['percentages simple interest'],
  'ubay-math-ratio-sharing': ['ratio & proportion ratio sharing'],
  'ubay-math-direct-proportion': ['ratio & proportion direct proportion'],
  'ubay-math-significant-figures': ['rounding & estimation significant figures'],
  'ubay-math-money-problems': ['rounding & estimation money & real life problems'],
  'ubay-pancasila-bpupki': ['sejarah lahirnya pancasila bpupki & peran tokoh pendiri bangsa'],
  'ubay-pancasila-panitia-sembilan': ['sejarah lahirnya pancasila hari lahir pancasila & panitia sembilan'],
  'ubay-pancasila-ppki': ['sejarah lahirnya pancasila perubahan sila pertama & penetapan resmi ppki'],
  'ubay-pancasila-timeline': ['sejarah lahirnya pancasila timeline sejarah lahirnya pancasila'],
  'ubay-pancasila-foundation': ['dasar pancasila bunyi, lambang & fungsi'],
  'ubay-pancasila-tolerance': ['penerapan nilai nilai pancasila toleransi beragama & kemanusiaan'],
  'ubay-pancasila-unity': ['penerapan nilai nilai pancasila persatuan, gotong royong & keadilan sosial'],
  'ubay-pancasila-deliberation': ['penerapan nilai nilai pancasila musyawarah & demokrasi'],
  'ubay-pancasila-cyberbullying': ['studi kasus penyelesaian konflik & cyberbullying di media sosial'],
  'ubay-pancasila-creative': ['studi kasus menyajikan nilai pancasila secara kreatif & sikap toleransi'],
  'math-extension-mental-3digit': ['extension (s) 3-digit mental calculation', 'extension s 3 digit mental calculation'],
  'math-extension-algorithm-3digit': ['extension (s) 3-digit algorithm', 'extension s 3 digit algorithm'],
  'math-extension-number-words': ['extension (s) number words to 1000', 'extension s number words to 1000'],
  'math-mental-subtraction': ['n2.2d mental subtraction', 'mental subtraction'],
  'math-number-words': ['n2.1d number words', 'number words'],
  'math-add-three': ['n2.2e add three 1-digit numbers', 'add three 1-digit numbers', 'add three 1 digit numbers'],
  'math-number-line': ['n2.1b number line and zero', 'number line and zero', 'number line'],
  'math-compare-order': ['n2.1f compare and order', 'compare and order'],
  'math-statements': ['n2.2f mathematical statements', 'mathematical statements'],
  'math-place-value': ['n2.1e place value and expanded form', 'place value and expanded form'],
  'math-mental-addition': ['n2.2c mental addition', 'mental addition'],
  'math-rounding': ['n2.1g rounding to nearest 10', 'rounding to nearest 10'],
  'math-number-bonds': ['n2.2a number bonds to 20', 'number bonds to 20'],
  'math-ordinal': ['n2.1h ordinal numbers', 'ordinal numbers'],
  'math-patterns': ['n2.1c number patterns', 'number patterns'],
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

function difficultyKey(question) {
  return String(question?.difficulty || '').trim().toLowerCase();
}

function difficultyCoverage(questions) {
  const counts = {};
  for (const question of questions) {
    const difficulty = difficultyKey(question);
    if (!difficulty) continue;
    counts[difficulty] = (counts[difficulty] || 0) + 1;
  }
  return counts;
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

function difficultyMismatches(questions, blueprint) {
  if (!blueprint.topicDifficultyTargets) return [];
  const mismatches = [];
  for (const [category, targets] of Object.entries(blueprint.topicDifficultyTargets)) {
    const categoryQuestions = questions.filter((question) => topicCategory(question) === category);
    const counts = difficultyCoverage(categoryQuestions);
    for (const [difficulty, target] of Object.entries(targets)) {
      const actual = counts[difficulty] || 0;
      if (actual !== target) mismatches.push({ category, difficulty, target, actual });
    }
    const expectedTotal = Object.values(targets).reduce((sum, value) => sum + value, 0);
    if (categoryQuestions.length !== expectedTotal) {
      mismatches.push({ category, difficulty: 'total', target: expectedTotal, actual: categoryQuestions.length });
    }
  }
  return mismatches;
}

function addCoverage(base, extra) {
  const next = { ...base };
  for (const [category, count] of Object.entries(extra)) next[category] = (next[category] || 0) + count;
  return next;
}

function exceedsTargets(counts, blueprint) {
  return Object.entries(counts).some(([category, count]) => count > (blueprint.topicTargets[category] || 0));
}

function standalonePools(standaloneBlocks) {
  const pools = new Map();
  for (const block of standaloneBlocks) {
    const question = block[0];
    const category = topicCategory(question);
    if (!category) continue;
    if (!pools.has(category)) pools.set(category, []);
    pools.get(category).push(question);
  }
  return pools;
}

function canFinishWithStandalone(counts, pools, blueprint) {
  for (const [category, target] of Object.entries(blueprint.topicTargets)) {
    const current = counts[category] || 0;
    const need = target - current;
    if (need < 0 || (pools.get(category)?.length || 0) < need) return false;
  }
  return true;
}

function findStimulusBlocks(stimulusBlocks, pools, blueprint) {
  const ordered = shuffle(stimulusBlocks);
  let visited = 0;
  const maxVisited = 50000;

  function search(index, counts, selected) {
    visited += 1;
    if (visited > maxVisited) return null;
    if (exceedsTargets(counts, blueprint)) return null;
    if (canFinishWithStandalone(counts, pools, blueprint)) return selected;
    if (index >= ordered.length) return null;

    const block = ordered[index];
    const blockCoverage = coverageFor(block);
    const includedCounts = addCoverage(counts, blockCoverage);
    if (!exceedsTargets(includedCounts, blueprint)) {
      const included = search(index + 1, includedCounts, [...selected, block]);
      if (included) return included;
    }
    return search(index + 1, counts, selected);
  }

  return search(0, {}, []);
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

  const missing = missingCoverage(eligible, blueprint);
  if (missing.length) {
    const detail = missing.map((item) => `${item.category} ${item.actual}/${item.target}`).join(', ');
    throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Mid Exam belum terpenuhi: ${detail}.`);
  }

  const blocks = groupedBlocks(eligible)
    .filter((block) => block.length <= blueprint.targetQuestions)
    .filter((block) => block.every((question) => Boolean(topicCategory(question))));
  const stimulusBlocks = blocks.filter((block) => Boolean(block[0]?.stimulusId));
  const standaloneBlocks = blocks.filter((block) => !block[0]?.stimulusId && block.length === 1);
  const pools = standalonePools(standaloneBlocks);
  const selectedStimulusBlocks = findStimulusBlocks(stimulusBlocks, pools, blueprint);

  if (!selectedStimulusBlocks) {
    throw new HttpError(
      422,
      'EXAM_BLUEPRINT_INCOMPLETE',
      'Blueprint Mid Exam belum dapat dibentuk tanpa memecah Question Set. Tambahkan variasi soal atau stimulus untuk kompetensi yang masih terkunci dalam satu set.',
    );
  }

  const selectedStimulusQuestions = selectedStimulusBlocks.flat();
  const selectedCoverage = coverageFor(selectedStimulusQuestions);
  const selectedBlocks = [...selectedStimulusBlocks];
  for (const [category, target] of Object.entries(blueprint.topicTargets)) {
    const need = target - (selectedCoverage[category] || 0);
    if (need <= 0) continue;
    const candidates = shuffle(pools.get(category) || []);
    const difficultyTargets = blueprint.topicDifficultyTargets?.[category];

    if (!difficultyTargets) {
      if (candidates.length < need) {
        throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Mid Exam kekurangan ${category}: butuh ${need}, tersedia ${candidates.length}.`);
      }
      candidates.slice(0, need).forEach((question) => selectedBlocks.push([question]));
      continue;
    }

    const alreadySelected = selectedStimulusQuestions.filter((question) => topicCategory(question) === category);
    const alreadyByDifficulty = difficultyCoverage(alreadySelected);
    let picked = 0;
    for (const [difficulty, difficultyTarget] of Object.entries(difficultyTargets)) {
      const difficultyNeed = difficultyTarget - (alreadyByDifficulty[difficulty] || 0);
      if (difficultyNeed < 0) {
        throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Mid Exam melebihi target ${category}/${difficulty}.`);
      }
      const matching = shuffle(candidates.filter((question) => difficultyKey(question) === difficulty));
      if (matching.length < difficultyNeed) {
        throw new HttpError(
          422,
          'EXAM_BLUEPRINT_INCOMPLETE',
          `Blueprint Mid Exam kekurangan ${category}/${difficulty}: butuh ${difficultyNeed}, tersedia ${matching.length}.`,
        );
      }
      matching.slice(0, difficultyNeed).forEach((question) => selectedBlocks.push([question]));
      picked += difficultyNeed;
    }
    if (picked !== need) {
      throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Target tingkat kesulitan ${category} tidak cocok dengan target topik (${picked}/${need}).`);
    }
  }

  const selected = shuffle(selectedBlocks).flat();
  const finalMissing = missingCoverage(selected, blueprint);
  const finalDifficultyMismatches = difficultyMismatches(selected, blueprint);
  if (selected.length !== blueprint.targetQuestions || finalMissing.length || finalDifficultyMismatches.length) {
    const detail = finalMissing.length
      ? finalMissing.map((item) => `${item.category} ${item.actual}/${item.target}`).join(', ')
      : finalDifficultyMismatches.length
        ? finalDifficultyMismatches.map((item) => `${item.category}/${item.difficulty} ${item.actual}/${item.target}`).join(', ')
        : `jumlah soal ${selected.length}/${blueprint.targetQuestions}`;
    throw new HttpError(422, 'EXAM_BLUEPRINT_INCOMPLETE', `Blueprint Mid Exam belum terpenuhi: ${detail}.`);
  }
  return randomizeChoicePositions(selected);
}
