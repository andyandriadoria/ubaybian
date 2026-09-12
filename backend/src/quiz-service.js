import { HttpError } from './http.js';
import { readSheetValues } from './google.js';
import {
  attachStimuli,
  isCorrectAnswer,
  parsePublishedQuestions,
  parsePublishedStimuli,
  publicQuestion,
  questionForSnapshot,
  selectGroupedQuestions,
  sheetConfig,
} from './questions.js';
import { randomToken } from './security.js';

const ALLOWED_LIMITS = new Set([5, 10, 15]);
const ALLOWED_MODES = new Set(['normal', 'challenge', 'review']);

function questionFromDb(row) {
  return {
    id: row.question_id,
    type: row.question_type,
    prompt: row.prompt,
    imageUrl: row.image_url || '',
    difficulty: row.difficulty,
    explanation: row.explanation || '',
    answerKey: row.answer_key,
    choices: JSON.parse(row.choices_json || '[]'),
  };
}

async function dbQuestion(env, sessionId, position) {
  return env.DB.prepare('SELECT * FROM quiz_session_questions WHERE session_id = ? AND position = ?').bind(sessionId, position).first();
}

function normalizedLimit(requestedLimit, profileSlug) {
  const parsed = Number(requestedLimit);
  if (ALLOWED_LIMITS.has(parsed)) return parsed;
  return profileSlug === 'bian' ? 5 : 10;
}

function normalizedMode(value) {
  const mode = String(value || 'normal').toLowerCase();
  return ALLOWED_MODES.has(mode) ? mode : 'normal';
}

async function reviewQuestionIds(env, familyId, profileId, subjectId) {
  const result = await env.DB.prepare(`
    SELECT qa.question_id, qa.correct
    FROM quiz_answers qa
    JOIN quiz_sessions qs ON qs.id = qa.session_id
    WHERE qs.family_id = ? AND qs.profile_id = ? AND qs.subject_id = ?
    ORDER BY qa.answered_at DESC
  `).bind(familyId, profileId, subjectId).all();
  const latest = new Map();
  for (const row of result.results || []) {
    if (!latest.has(row.question_id)) latest.set(row.question_id, Number(row.correct));
  }
  return new Set([...latest.entries()].filter(([, correct]) => correct !== 1).map(([id]) => id));
}

function correctAnswerFor(question) {
  if (question.type === 'text') return String(question.answerKey || '').split('||')[0]?.trim() || '';
  return String(question.answerKey || '').trim().toUpperCase();
}

export async function startQuiz(env, familyId, profile, subjectId, requestedLimit, requestedMode = 'normal') {
  const { profileSlug, sheetName } = sheetConfig(profile.slug, subjectId);
  const rows = await readSheetValues(env, profileSlug, sheetName);
  let available = parsePublishedQuestions(rows);
  if (!available.length) throw new HttpError(422, 'NO_PUBLISHED_QUESTIONS', 'Belum ada soal Aktif/Published yang siap untuk pelajaran ini.');

  if (available.some((question) => question.stimulusId)) {
    const stimulusRows = await readSheetValues(env, profileSlug, 'STIMULUS');
    const stimuli = parsePublishedStimuli(stimulusRows);
    available = attachStimuli(available, stimuli, sheetName);
  }

  // Open-response/writing is intentionally excluded from daily practice until a manual
  // review workflow exists. Exam Simulation can still include and safely store it.
  available = available.filter((question) => question.type !== 'open-response');
  if (!available.length) throw new HttpError(422, 'NO_AUTO_SCORED_PRACTICE', 'Belum ada soal auto-scored yang siap untuk latihan harian ini.');

  const limit = normalizedLimit(requestedLimit, profile.slug);
  const mode = normalizedMode(requestedMode);
  if (mode === 'review') {
    const ids = await reviewQuestionIds(env, familyId, profile.id, subjectId);
    available = available.filter((question) => ids.has(question.id));
    if (!available.length) throw new HttpError(422, 'NO_REVIEW_QUESTIONS', 'Belum ada soal yang perlu diulang untuk pelajaran ini.');
  }

  const selected = selectGroupedQuestions(available, limit, profile.slug, mode).map(questionForSnapshot);
  if (!selected.length) throw new HttpError(422, 'NO_SESSION_QUESTIONS', 'Belum ada kombinasi soal yang dapat membentuk sesi ini.');

  const sessionId = randomToken(24);
  const now = Date.now();
  const statements = [
    env.DB.prepare(`INSERT INTO quiz_sessions (id, family_id, profile_id, subject_id, current_index, total_questions, correct_count, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?)`).bind(sessionId, familyId, profile.id, subjectId, selected.length, now, now),
  ];
  selected.forEach((question, index) => statements.push(
    env.DB.prepare(`INSERT INTO quiz_session_questions
      (session_id, position, question_id, question_type, prompt, image_url, choices_json, answer_key, explanation, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        sessionId,
        index,
        question.id,
        question.type,
        question.prompt,
        question.imageUrl || '',
        JSON.stringify(question.choices),
        question.answerKey,
        question.explanation || '',
        question.difficulty,
      ),
  ));
  await env.DB.batch(statements);
  return {
    sessionId,
    subjectId,
    mode,
    progress: { current: 1, total: selected.length },
    question: publicQuestion(selected[0]),
  };
}

export async function submitAnswer(env, familyId, sessionId, body, idempotencyKey) {
  if (!idempotencyKey || idempotencyKey.length > 200) throw new HttpError(422, 'IDEMPOTENCY_REQUIRED', 'Idempotency-Key wajib diisi.');
  const session = await env.DB.prepare('SELECT * FROM quiz_sessions WHERE id = ? AND family_id = ?').bind(sessionId, familyId).first();
  if (!session) throw new HttpError(404, 'SESSION_NOT_FOUND', 'Sesi latihan tidak ditemukan.');
  if (session.completed_at) throw new HttpError(409, 'SESSION_COMPLETE', 'Sesi latihan sudah selesai.');

  const duplicate = await env.DB.prepare('SELECT response_json FROM quiz_answers WHERE session_id = ? AND idempotency_key = ?').bind(sessionId, idempotencyKey).first();
  if (duplicate?.response_json) return JSON.parse(duplicate.response_json);

  const position = Number(session.current_index);
  const row = await dbQuestion(env, sessionId, position);
  if (!row) throw new HttpError(409, 'QUESTION_STATE_INVALID', 'Posisi soal pada sesi tidak valid.');
  if (String(body?.questionId || '') !== row.question_id) throw new HttpError(409, 'QUESTION_MISMATCH', 'Soal yang dijawab bukan soal aktif.');

  const skipped = Boolean(body?.skip);
  const answer = skipped ? '__SKIP__' : String(body?.answer ?? '').trim();
  if (!skipped && !answer) throw new HttpError(422, 'ANSWER_REQUIRED', 'Jawaban belum diisi.');

  const question = questionFromDb(row);
  if (question.type === 'open-response') throw new HttpError(409, 'WRITING_NOT_AVAILABLE_IN_PRACTICE', 'Writing digunakan di Exam Simulation dan belum dinilai otomatis di latihan harian.');
  const correct = skipped ? false : isCorrectAnswer(question, answer);
  const now = Date.now();
  const nextIndex = position + 1;
  const complete = nextIndex >= Number(session.total_questions);
  const nextRow = complete ? null : await dbQuestion(env, sessionId, nextIndex);
  const finalCorrect = Number(session.correct_count) + (correct ? 1 : 0);

  let summary = null;
  if (complete) {
    const previousSkipped = await env.DB.prepare(`SELECT COUNT(*) AS count FROM quiz_answers WHERE session_id = ? AND answer = '__SKIP__'`).bind(sessionId).first();
    const skippedCount = Number(previousSkipped?.count || 0) + (skipped ? 1 : 0);
    const total = Number(session.total_questions);
    const wrong = Math.max(0, total - finalCorrect - skippedCount);
    const score = total ? Math.round((finalCorrect / total) * 100) : 0;
    const perfectBonusCoins = score === 100 ? 100 : 0;
    summary = {
      score,
      correct: finalCorrect,
      wrong,
      skipped: skippedCount,
      total,
      xpEarned: (finalCorrect * 10) + 20,
      coinsEarned: (finalCorrect * 50) + perfectBonusCoins,
      completionXp: 20,
      perfectBonusCoins,
    };
  }

  const response = {
    correct,
    skipped,
    correctAnswer: correctAnswerFor(question),
    explanation: question.explanation,
    xpEarned: correct ? 10 : 0,
    coinEarned: correct ? 50 : 0,
    sessionComplete: complete,
    progress: { current: complete ? Number(session.total_questions) : nextIndex + 1, total: Number(session.total_questions) },
    ...(summary ? { summary } : {}),
    ...(nextRow ? { nextQuestion: publicQuestion(questionFromDb(nextRow)) } : {}),
  };

  const statements = [
    env.DB.prepare(`INSERT INTO quiz_answers (session_id, question_id, answer, correct, answered_at, idempotency_key, response_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(sessionId, row.question_id, answer.slice(0, 1000), correct ? 1 : 0, now, idempotencyKey, JSON.stringify(response)),
    env.DB.prepare(`UPDATE quiz_sessions SET current_index = ?, correct_count = correct_count + ?, updated_at = ?, completed_at = ? WHERE id = ? AND family_id = ?`)
      .bind(nextIndex, correct ? 1 : 0, now, complete ? now : null, sessionId, familyId),
    env.DB.prepare(`INSERT INTO progress_summary (family_id, profile_id, subject_id, attempted, correct, last_practiced_at)
                    VALUES (?, ?, ?, 1, ?, ?)
                    ON CONFLICT(family_id, profile_id, subject_id) DO UPDATE SET
                      attempted = attempted + 1,
                      correct = correct + excluded.correct,
                      last_practiced_at = excluded.last_practiced_at`)
      .bind(familyId, session.profile_id, session.subject_id, correct ? 1 : 0, now),
  ];

  try {
    await env.DB.batch(statements);
  } catch (error) {
    const raced = await env.DB.prepare('SELECT response_json FROM quiz_answers WHERE session_id = ? AND idempotency_key = ?').bind(sessionId, idempotencyKey).first();
    if (raced?.response_json) return JSON.parse(raced.response_json);
    throw error;
  }
  return response;
}
