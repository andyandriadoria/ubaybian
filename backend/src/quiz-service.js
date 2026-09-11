import { HttpError } from './http.js';
import { readSheetValues } from './google.js';
import { isCorrectAnswer, parsePublishedQuestions, publicQuestion, sheetConfig, shuffleQuestions } from './questions.js';
import { randomToken } from './security.js';

function questionFromDb(row) {
  return {
    id: row.question_id, type: row.question_type, prompt: row.prompt, imageUrl: row.image_url || '', difficulty: row.difficulty,
    explanation: row.explanation || '', answerKey: row.answer_key, choices: JSON.parse(row.choices_json || '[]'),
  };
}

async function dbQuestion(env, sessionId, position) {
  return env.DB.prepare('SELECT * FROM quiz_session_questions WHERE session_id = ? AND position = ?').bind(sessionId, position).first();
}

export async function startQuiz(env, familyId, profile, subjectId, requestedLimit) {
  const { spreadsheetId, sheetName } = sheetConfig(env, profile.slug, subjectId);
  const rows = await readSheetValues(env, spreadsheetId, sheetName);
  const available = parsePublishedQuestions(rows);
  if (!available.length) throw new HttpError(422, 'NO_PUBLISHED_QUESTIONS', 'Belum ada soal Published yang siap untuk pelajaran ini.');
  const limit = Math.min(20, Math.max(1, Number(requestedLimit) || 10));
  const selected = shuffleQuestions(available).slice(0, limit);
  const sessionId = randomToken(24); const now = Date.now();
  const statements = [
    env.DB.prepare(`INSERT INTO quiz_sessions (id, family_id, profile_id, subject_id, current_index, total_questions, correct_count, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?)`).bind(sessionId, familyId, profile.id, subjectId, selected.length, now, now),
  ];
  selected.forEach((question, index) => statements.push(
    env.DB.prepare(`INSERT INTO quiz_session_questions
      (session_id, position, question_id, question_type, prompt, image_url, choices_json, answer_key, explanation, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        sessionId, index, question.id, question.type, question.prompt, question.imageUrl || '', JSON.stringify(question.choices), question.answerKey, question.explanation || '', question.difficulty,
      ),
  ));
  await env.DB.batch(statements);
  return { sessionId, progress: { current: 1, total: selected.length }, question: publicQuestion(selected[0]) };
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
  const answer = String(body?.answer ?? '').trim();
  if (!answer) throw new HttpError(422, 'ANSWER_REQUIRED', 'Jawaban belum diisi.');
  const question = questionFromDb(row); const correct = isCorrectAnswer(question, answer); const now = Date.now();
  const nextIndex = position + 1; const complete = nextIndex >= Number(session.total_questions);
  const nextRow = complete ? null : await dbQuestion(env, sessionId, nextIndex);
  const response = {
    correct, explanation: question.explanation, xpEarned: 0, sessionComplete: complete,
    progress: { current: complete ? Number(session.total_questions) : nextIndex + 1, total: Number(session.total_questions) },
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
  try { await env.DB.batch(statements); } catch (error) {
    const raced = await env.DB.prepare('SELECT response_json FROM quiz_answers WHERE session_id = ? AND idempotency_key = ?').bind(sessionId, idempotencyKey).first();
    if (raced?.response_json) return JSON.parse(raced.response_json);
    throw error;
  }
  return response;
}
