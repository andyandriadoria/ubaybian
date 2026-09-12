import { HttpError } from './http.js';

export const SUBJECT_TABS = Object.freeze({
  ubay: Object.freeze({
    'bahasa-indonesia': 'BAHASA INDONESIA', math: 'MATH', pancasila: 'PANCASILA', english: 'ENGLISH', science: 'SCIENCE', informatika: 'INFORMATIKA', 'global-citizenship': 'GLOBAL CITIZENSHIP', pai: 'PAI',
  }),
  bian: Object.freeze({
    'bahasa-indonesia': 'BAHASA INDONESIA', paibp: 'PAIBP', english: 'ENGLISH', science: 'SCIENCE', math: 'MATH', pancasila: 'PANCASILA',
  }),
});

const typeMap = new Map([
  ['pilihan ganda', 'multiple-choice'],
  ['isian', 'text'],
  ['isian singkat', 'text'],
  ['pilihan gambar', 'image-choice'],
]);
const liveStatuses = new Set(['published', 'aktif']);

function cell(row, index) { return String(row?.[index] ?? '').trim(); }
function safeHttpsUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try { const url = new URL(raw); return url.protocol === 'https:' ? url.toString() : ''; } catch { return ''; }
}
function normalizeText(value) { return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID'); }
function isLive(value) { return liveStatuses.has(String(value || '').trim().toLowerCase()); }

export function sheetConfig(profileSlug, subjectId) {
  const sheetName = SUBJECT_TABS[profileSlug]?.[subjectId];
  if (!sheetName) throw new HttpError(403, 'SUBJECT_FORBIDDEN', 'Pelajaran tidak tersedia untuk profil ini.');
  return { profileSlug, sheetName };
}

export function parsePublishedQuestions(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const published = [];
  const errors = [];
  const ids = new Set();
  rows.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    if (!isLive(cell(row, 17))) return;
    try {
      const id = cell(row, 0); const semester = cell(row, 2); const rawType = cell(row, 3).toLowerCase(); const prompt = cell(row, 4);
      const type = typeMap.get(rawType); const difficulty = cell(row, 16);
      const stimulusId = cell(row, 19); const rawStimulusOrder = cell(row, 20);
      if (!id) throw new Error('ID Soal kosong');
      if (ids.has(id)) throw new Error(`ID Soal duplikat: ${id}`);
      if (!prompt) throw new Error('Pertanyaan kosong');
      if (!['1', '2'].includes(semester)) throw new Error('Semester harus 1 atau 2');
      if (!type) throw new Error(`Jenis Soal tidak dikenali: ${cell(row, 3)}`);
      if (!['mudah', 'sedang', 'sulit'].includes(difficulty.toLowerCase())) throw new Error('Kesulitan harus Mudah, Sedang, atau Sulit');
      let stimulusOrder = 0;
      if (stimulusId) {
        stimulusOrder = Number(rawStimulusOrder);
        if (!Number.isInteger(stimulusOrder) || stimulusOrder < 1) throw new Error('Urutan Dalam Set harus bilangan bulat mulai 1');
      } else if (rawStimulusOrder) {
        throw new Error('Urutan Dalam Set hanya boleh diisi jika Stimulus ID diisi');
      }
      const answerKey = cell(row, 14);
      if (!answerKey) throw new Error('Kunci Jawaban kosong');
      const question = {
        id, topic: cell(row, 1), semester, type, prompt, imageUrl: safeHttpsUrl(cell(row, 5)), difficulty,
        explanation: cell(row, 15), answerKey, choices: [], stimulusId, stimulusOrder,
      };
      if (type === 'multiple-choice' || type === 'image-choice') {
        const choices = [];
        for (let i = 0; i < 4; i += 1) {
          const choiceText = cell(row, 6 + i); const imageUrl = safeHttpsUrl(cell(row, 10 + i));
          if (choiceText || imageUrl) choices.push({ id: String.fromCharCode(65 + i), text: choiceText, imageUrl });
          else if (choices.length) break;
        }
        if (choices.length < 2) throw new Error('Pilihan jawaban minimal 2');
        if (choices.some((choice, index) => choice.id !== String.fromCharCode(65 + index))) throw new Error('Pilihan harus berurutan mulai A');
        if (!choices.some((choice) => choice.id === answerKey.toUpperCase())) throw new Error('Kunci Jawaban tidak menunjuk pilihan yang tersedia');
        if (type === 'image-choice' && choices.some((choice) => !choice.imageUrl)) throw new Error('Pilihan Gambar wajib memiliki URL gambar HTTPS');
        question.choices = choices;
      } else {
        const variants = answerKey.split('||').map((value) => value.trim()).filter(Boolean);
        if (!variants.length) throw new Error('Kunci isian kosong');
      }
      ids.add(id); published.push(question);
    } catch (error) { errors.push(`Baris ${rowNumber}: ${error.message}`); }
  });
  if (errors.length) throw new HttpError(422, 'INVALID_PUBLISHED_BANK', `Bank soal Aktif/Published belum valid: ${errors.slice(0, 5).join('; ')}`);
  return published;
}

export function parsePublishedStimuli(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const stimuli = [];
  const errors = [];
  const ids = new Set();
  rows.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    if (!isLive(cell(row, 6))) return;
    try {
      const id = cell(row, 0); const subject = cell(row, 1); const semester = cell(row, 2);
      const title = cell(row, 3); const body = cell(row, 4); const imageUrl = safeHttpsUrl(cell(row, 5));
      if (!id) throw new Error('Stimulus ID kosong');
      if (ids.has(id)) throw new Error(`Stimulus ID duplikat: ${id}`);
      if (!subject) throw new Error('Mapel stimulus kosong');
      if (!['1', '2'].includes(semester)) throw new Error('Semester stimulus harus 1 atau 2');
      if (!body && !imageUrl) throw new Error('Stimulus harus memiliki teks/passage atau gambar HTTPS');
      ids.add(id);
      stimuli.push({ id, subject, semester, title, text: body, imageUrl, source: cell(row, 7) });
    } catch (error) { errors.push(`STIMULUS baris ${rowNumber}: ${error.message}`); }
  });
  if (errors.length) throw new HttpError(422, 'INVALID_STIMULUS_BANK', `Bank stimulus Aktif/Published belum valid: ${errors.slice(0, 5).join('; ')}`);
  return stimuli;
}

export function attachStimuli(questions, stimuli, sheetName) {
  const stimulusMap = new Map(stimuli.map((stimulus) => [stimulus.id, stimulus]));
  const groups = new Map();
  const attached = questions.map((question) => {
    if (!question.stimulusId) return { ...question, stimulus: null };
    const stimulus = stimulusMap.get(question.stimulusId);
    if (!stimulus) throw new HttpError(422, 'STIMULUS_NOT_FOUND', `Stimulus ${question.stimulusId} untuk soal ${question.id} tidak ditemukan atau belum Aktif.`);
    if (stimulus.subject !== sheetName) throw new HttpError(422, 'STIMULUS_SUBJECT_MISMATCH', `Stimulus ${stimulus.id} tidak cocok dengan mapel ${sheetName}.`);
    if (stimulus.semester !== question.semester) throw new HttpError(422, 'STIMULUS_SEMESTER_MISMATCH', `Semester stimulus ${stimulus.id} tidak cocok dengan soal ${question.id}.`);
    const next = { ...question, stimulus: { ...stimulus, order: question.stimulusOrder, total: 0 } };
    if (!groups.has(stimulus.id)) groups.set(stimulus.id, []);
    groups.get(stimulus.id).push(next);
    return next;
  });

  for (const [stimulusId, group] of groups) {
    const ordered = [...group].sort((a, b) => a.stimulusOrder - b.stimulusOrder);
    ordered.forEach((question, index) => {
      if (question.stimulusOrder !== index + 1) throw new HttpError(422, 'STIMULUS_ORDER_INVALID', `Urutan soal untuk stimulus ${stimulusId} harus lengkap mulai 1 tanpa duplikat/lompatan.`);
    });
    const total = ordered.length;
    for (const question of group) question.stimulus.total = total;
  }
  return attached;
}

export function questionForSnapshot(question) {
  if (!question?.stimulus) return question;
  const stimulus = question.stimulus;
  const parts = [];
  parts.push(stimulus.title ? `📖 ${stimulus.title}` : '📖 Read the text');
  if (stimulus.text) parts.push(stimulus.text);
  if (stimulus.total > 1) parts.push(`Question ${stimulus.order} of ${stimulus.total}`);
  parts.push(question.prompt);
  return { ...question, prompt: parts.join('\n\n'), imageUrl: question.imageUrl || stimulus.imageUrl || '' };
}

export function publicQuestion(question) {
  return {
    id: question.id, type: question.type, prompt: question.prompt, imageUrl: question.imageUrl || '', difficulty: question.difficulty,
    choices: question.choices.map(({ id, text, imageUrl }) => ({ id, text, imageUrl: imageUrl || '' })),
  };
}

export function isCorrectAnswer(question, answer) {
  if (question.type === 'text') {
    const candidate = normalizeText(answer);
    return question.answerKey.split('||').some((variant) => normalizeText(variant) === candidate);
  }
  return String(answer ?? '').trim().toUpperCase() === String(question.answerKey).trim().toUpperCase();
}

export function shuffleQuestions(questions) {
  const copy = [...questions];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const random = new Uint32Array(1); crypto.getRandomValues(random);
    const j = random[0] % (i + 1); [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function difficultyRatios(profileSlug, mode) {
  if (mode === 'challenge') return profileSlug === 'bian'
    ? { mudah: 0.40, sedang: 0.45, sulit: 0.15 }
    : { mudah: 0.15, sedang: 0.45, sulit: 0.40 };
  return profileSlug === 'bian'
    ? { mudah: 0.60, sedang: 0.35, sulit: 0.05 }
    : { mudah: 0.30, sedang: 0.50, sulit: 0.20 };
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

function selectionPenalty(items, target, ratios) {
  const counts = { mudah: 0, sedang: 0, sulit: 0 };
  for (const item of items) {
    const key = String(item.difficulty || '').toLowerCase();
    if (key in counts) counts[key] += 1;
  }
  const missing = Math.max(0, target - items.length);
  return (missing * 100) + Object.keys(counts).reduce((sum, key) => sum + Math.abs(counts[key] - (target * ratios[key])), 0);
}

export function selectGroupedQuestions(questions, limit, profileSlug, mode = 'normal') {
  const target = Math.min(Math.max(0, Number(limit) || 0), questions.length);
  if (!target) return [];
  if (mode === 'review') return shuffleQuestions(questions).slice(0, target);
  const blocks = groupedBlocks(questions);
  const ratios = difficultyRatios(profileSlug, mode);
  let best = [];
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    const orderedBlocks = shuffleQuestions(blocks);
    const chosenBlocks = [];
    let size = 0;
    for (const block of orderedBlocks) {
      if (size + block.length > target) continue;
      chosenBlocks.push(block); size += block.length;
      if (size === target) break;
    }
    const flat = chosenBlocks.flat();
    const score = selectionPenalty(flat, target, ratios);
    if (score < bestScore) { best = chosenBlocks; bestScore = score; }
    if (flat.length === target && score < 1) break;
  }

  if (!best.length && blocks.length) {
    const smallest = [...blocks].sort((a, b) => a.length - b.length)[0];
    return [...smallest];
  }
  return best.flat();
}
