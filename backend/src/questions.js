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

function cell(row, index) { return String(row?.[index] ?? '').trim(); }
function safeHttpsUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try { const url = new URL(raw); return url.protocol === 'https:' ? url.toString() : ''; } catch { return ''; }
}
function normalizeText(value) { return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID'); }

export function sheetConfig(env, profileSlug, subjectId) {
  const sheetName = SUBJECT_TABS[profileSlug]?.[subjectId];
  if (!sheetName) throw new HttpError(403, 'SUBJECT_FORBIDDEN', 'Pelajaran tidak tersedia untuk profil ini.');
  const spreadsheetId = profileSlug === 'ubay' ? env.UBAY_SHEET_ID : env.BIAN_SHEET_ID;
  return { spreadsheetId, sheetName };
}

export function parsePublishedQuestions(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const published = [];
  const errors = [];
  const ids = new Set();
  rows.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    const status = cell(row, 17).toLowerCase();
    if (status !== 'published') return;
    try {
      const id = cell(row, 0); const semester = cell(row, 2); const rawType = cell(row, 3).toLowerCase(); const prompt = cell(row, 4);
      const type = typeMap.get(rawType); const difficulty = cell(row, 16);
      if (!id) throw new Error('ID Soal kosong');
      if (ids.has(id)) throw new Error(`ID Soal duplikat: ${id}`);
      if (!prompt) throw new Error('Pertanyaan kosong');
      if (!['1', '2'].includes(semester)) throw new Error('Semester harus 1 atau 2');
      if (!type) throw new Error(`Jenis Soal tidak dikenali: ${cell(row, 3)}`);
      if (!['mudah', 'sedang', 'sulit'].includes(difficulty.toLowerCase())) throw new Error('Kesulitan harus Mudah, Sedang, atau Sulit');
      const answerKey = cell(row, 14);
      if (!answerKey) throw new Error('Kunci Jawaban kosong');
      const question = {
        id, topic: cell(row, 1), semester, type, prompt, imageUrl: safeHttpsUrl(cell(row, 5)), difficulty,
        explanation: cell(row, 15), answerKey, choices: [],
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
  if (errors.length) throw new HttpError(422, 'INVALID_PUBLISHED_BANK', `Bank soal Published belum valid: ${errors.slice(0, 5).join('; ')}`);
  return published;
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
