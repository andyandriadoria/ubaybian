import { HttpError } from './http.js';
import { readSheetValues } from './google.js';
import {
  attachStimuli,
  isCorrectAnswer,
  parsePublishedQuestions,
  parsePublishedStimuli,
  publicQuestion,
  questionForSnapshot,
  sheetConfig,
} from './questions.js';
import { getExamBlueprint, publicExamBlueprint, selectExamQuestions } from './exam-blueprints.js';
import { getBianScienceBlueprint, selectBianScienceQuestions } from './bian-science-assessment.js';
import {
  getBianBahasaIndonesiaBlueprint,
  selectBianBahasaIndonesiaQuestions,
} from './bian-bahasa-indonesia-assessment.js';
import {
  getBianPancasilaBlueprint,
  selectBianPancasilaQuestions,
} from './bian-pancasila-assessment.js';
import {
  getBianPaibpBlueprint,
  selectBianPaibpQuestions,
} from './bian-paibp-assessment.js';
import { examRewardForSession } from './exam-rewards.js';
import { randomToken } from './security.js';

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

function correctAnswerFor(question) {
  if (question.type === 'open-response') return '';
  if (question.type === 'text') return String(question.answerKey || '').split('||')[0]?.trim() || '';
  return String(question.answerKey || '').trim().toUpperCase();
}

async function examSession(env, familyId, sessionId) {
  const session = await env.DB.prepare(
    'SELECT * FROM exam_sessions WHERE id = ? AND family_id = ?',
  ).bind(sessionId, familyId).first();
  if (!session) throw new HttpError(404, 'EXAM_SESSION_NOT_FOUND', 'Sesi simulasi ujian tidak ditemukan.');
  return session;
}

async function examQuestionRow(env, sessionId, position) {
  return env.DB.prepare(
    'SELECT * FROM exam_session_questions WHERE session_id = ? AND position = ?',
  ).bind(sessionId, position).first();
}

async function answeredCount(env, sessionId) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM exam_answers WHERE session_id = ?').bind(sessionId).first();
  return Number(row?.count || 0);
}

function timing(session) {
  const deadlineAt = Number(session.deadline_at || 0);
  return {
    deadlineAt,
    remainingSeconds: Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)),
    expired: deadlineAt > 0 && Date.now() >= deadlineAt,
  };
}

async function publicExamState(env, session, position) {
  const safePosition = Math.max(0, Math.min(Number(session.total_questions) - 1, Number(position) || 0));
  const row = await examQuestionRow(env, session.id, safePosition);
  if (!row) throw new HttpError(409, 'EXAM_QUESTION_STATE_INVALID', 'Posisi soal simulasi tidak valid.');
  const answer = await env.DB.prepare(
    'SELECT answer FROM exam_answers WHERE session_id = ? AND question_id = ?',
  ).bind(session.id, row.question_id).first();
  return {
    sessionId: session.id,
    subjectId: session.subject_id,
    blueprintId: session.blueprint_id,
    title: session.title,
    durationMinutes: Number(session.duration_minutes),
    progress: { current: safePosition + 1, total: Number(session.total_questions) },
    answeredCount: await answeredCount(env, session.id),
    savedAnswer: String(answer?.answer || ''),
    question: publicQuestion(questionFromDb(row)),
    ...timing(session),
  };
}

async function loadQuestionBank(env, profileSlug, subjectId) {
  const { sheetName } = sheetConfig(profileSlug, subjectId);
  const rows = await readSheetValues(env, profileSlug, sheetName);
  let available = parsePublishedQuestions(rows);
  if (!available.length) throw new HttpError(422, 'NO_PUBLISHED_QUESTIONS', 'Belum ada soal Aktif/Published yang siap untuk pelajaran ini.');

  if (available.some((question) => question.stimulusId)) {
    const stimulusRows = await readSheetValues(env, profileSlug, 'STIMULUS');
    available = attachStimuli(available, parsePublishedStimuli(stimulusRows), sheetName);
  }
  return available;
}

export async function startExam(env, familyId, profile, subjectId, requestedBlueprintId = '') {
  const isBianScience = profile.slug === 'bian' && subjectId === 'science';
  const isBianBahasaIndonesia = profile.slug === 'bian' && subjectId === 'bahasa-indonesia';
  const isBianPancasila = profile.slug === 'bian' && subjectId === 'pancasila';
  const isBianPaibp = profile.slug === 'bian' && subjectId === 'paibp';
  const blueprint = isBianScience
    ? getBianScienceBlueprint(requestedBlueprintId)
    : isBianBahasaIndonesia
      ? getBianBahasaIndonesiaBlueprint(requestedBlueprintId)
      : isBianPancasila
        ? getBianPancasilaBlueprint(requestedBlueprintId)
        : isBianPaibp
          ? getBianPaibpBlueprint(requestedBlueprintId)
          : getExamBlueprint(profile.slug, subjectId, requestedBlueprintId);
  const available = await loadQuestionBank(env, profile.slug, subjectId);
  const selected = (
    isBianScience
      ? selectBianScienceQuestions(available, blueprint)
      : isBianBahasaIndonesia
        ? selectBianBahasaIndonesiaQuestions(available, blueprint)
        : isBianPancasila
          ? selectBianPancasilaQuestions(available, blueprint)
          : isBianPaibp
            ? selectBianPaibpQuestions(available, blueprint)
            : selectExamQuestions(available, blueprint)
  ).map(questionForSnapshot);

  const sessionId = randomToken(24);
  const now = Date.now();
  const deadlineAt = now + (blueprint.durationMinutes * 60 * 1000);
  const statements = [
    env.DB.prepare(`INSERT INTO exam_sessions
      (id, family_id, profile_id, subject_id, blueprint_id, title, duration_minutes, total_questions, correct_count, created_at, deadline_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`)
      .bind(sessionId, familyId, profile.id, subjectId, blueprint.id, blueprint.title, blueprint.durationMinutes, selected.length, now, deadlineAt),
  ];

  selected.forEach((question, index) => statements.push(
    env.DB.prepare(`INSERT INTO exam_session_questions
      (session_id, position, question_id, question_type, prompt, image_url, choices_json, answer_key, explanation, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        sessionId,
        index,
        question.id,
        question.type,
        question.prompt,
        question.imageUrl || '',
        JSON.stringify(question.choices || []),
        question.answerKey || '',
        question.explanation || '',
        question.difficulty,
      ),
  ));

  await env.DB.batch(statements);
  const session = await examSession(env, familyId, sessionId);
  return {
    ...(await publicExamState(env, session, 0)),
    blueprint: publicExamBlueprint(blueprint),
  };
}

export async function getExamQuestion(env, familyId, sessionId, requestedPosition) {
  const session = await examSession(env, familyId, sessionId);
  const position = Number(requestedPosition);
  if (!Number.isInteger(position) || position < 0 || position >= Number(session.total_questions)) {
    throw new HttpError(422, 'EXAM_POSITION_INVALID', 'Nomor soal simulasi tidak valid.');
  }
  if (session.completed_at) throw new HttpError(409, 'EXAM_ALREADY_SUBMITTED', 'Simulasi ujian sudah disubmit.');
  return publicExamState(env, session, position);
}

export async function saveExamAnswer(env, familyId, sessionId, body) {
  const session = await examSession(env, familyId, sessionId);
  if (session.completed_at) throw new HttpError(409, 'EXAM_ALREADY_SUBMITTED', 'Simulasi ujian sudah disubmit.');
  if (timing(session).expired) throw new HttpError(409, 'EXAM_TIME_EXPIRED', 'Waktu simulasi sudah habis. Submit ujian untuk melihat hasil.');

  const questionId = String(body?.questionId || '').trim();
  const answer = String(body?.answer ?? '').trim();
  if (!questionId) throw new HttpError(422, 'QUESTION_REQUIRED', 'Question ID wajib diisi.');
  if (!answer) throw new HttpError(422, 'ANSWER_REQUIRED', 'Jawaban belum diisi.');

  const row = await env.DB.prepare(
    'SELECT * FROM exam_session_questions WHERE session_id = ? AND question_id = ?',
  ).bind(sessionId, questionId).first();
  if (!row) throw new HttpError(409, 'EXAM_QUESTION_MISMATCH', 'Soal tidak termasuk dalam simulasi ini.');

  const question = questionFromDb(row);
  const needsReview = question.type === 'open-response';
  const autoResult = needsReview ? null : isCorrectAnswer(question, answer);
  const correct = autoResult === true;
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO exam_answers (session_id, question_id, answer, correct, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(session_id, question_id) DO UPDATE SET
      answer = excluded.answer,
      correct = excluded.correct,
      updated_at = excluded.updated_at`)
    .bind(sessionId, questionId, answer.slice(0, 1000), correct ? 1 : 0, now)
    .run();

  return {
    saved: true,
    needsReview,
    answeredCount: await answeredCount(env, sessionId),
    ...timing(session),
  };
}

async function completedExamResult(env, session) {
  const rows = await env.DB.prepare(`SELECT q.position, q.question_id, q.question_type, q.prompt, q.answer_key, q.explanation,
      a.answer, a.correct
    FROM exam_session_questions q
    LEFT JOIN exam_answers a ON a.session_id = q.session_id AND a.question_id = q.question_id
    WHERE q.session_id = ?
    ORDER BY q.position`).bind(session.id).all();

  const items = rows.results || [];
  const total = Number(session.total_questions);
  const isAnswered = (item) => item.answer !== null && item.answer !== undefined && String(item.answer).length > 0;
  const answered = items.reduce((sum, item) => sum + (isAnswered(item) ? 1 : 0), 0);
  const unanswered = Math.max(0, total - answered);

  const autoItems = items.filter((item) => item.question_type !== 'open-response');
  const writingItems = items.filter((item) => item.question_type === 'open-response');
  const autoTotal = autoItems.length;
  const autoAnswered = autoItems.reduce((sum, item) => sum + (isAnswered(item) ? 1 : 0), 0);
  const autoCorrect = autoItems.reduce((sum, item) => sum + (Number(item.correct) === 1 ? 1 : 0), 0);
  const autoWrong = Math.max(0, autoAnswered - autoCorrect);
  const autoUnanswered = Math.max(0, autoTotal - autoAnswered);
  const autoScore = autoTotal ? Math.round((autoCorrect / autoTotal) * 100) : null;

  const writingTotal = writingItems.length;
  const writingAnswered = writingItems.reduce((sum, item) => sum + (isAnswered(item) ? 1 : 0), 0);
  const writingUnanswered = Math.max(0, writingTotal - writingAnswered);
  const reviewPending = writingAnswered;
  const score = writingTotal ? null : autoScore;
  const summary = {
    score,
    autoScore,
    correct: autoCorrect,
    wrong: autoWrong,
    unanswered,
    answered,
    total,
    autoTotal,
    autoAnswered,
    autoUnanswered,
    writingTotal,
    writingAnswered,
    writingUnanswered,
    reviewPending,
  };
  const reward = await examRewardForSession(env, session, {
    correct: autoCorrect,
    answered,
    total,
  });

  return {
    sessionId: session.id,
    title: session.title,
    blueprintId: session.blueprint_id,
    summary,
    reward,
    results: items.map((item) => {
      const manualReview = item.question_type === 'open-response';
      const answeredItem = isAnswered(item);
      const question = { type: item.question_type, answerKey: item.answer_key };
      return {
        position: Number(item.position) + 1,
        questionId: item.question_id,
        prompt: String(item.prompt || ''),
        answer: String(item.answer || ''),
        manualReview,
        needsReview: manualReview && answeredItem,
        correct: manualReview ? null : Number(item.correct) === 1,
        correctAnswer: manualReview ? '' : correctAnswerFor(question),
        explanation: String(item.explanation || ''),
      };
    }),
  };
}

export async function finishExam(env, familyId, sessionId) {
  const session = await examSession(env, familyId, sessionId);
  if (session.completed_at) return completedExamResult(env, session);

  const counts = await env.DB.prepare(`SELECT COALESCE(SUM(a.correct), 0) AS correct
    FROM exam_answers a
    JOIN exam_session_questions q ON q.session_id = a.session_id AND q.question_id = a.question_id
    WHERE a.session_id = ? AND q.question_type <> 'open-response'`).bind(sessionId).first();
  const correct = Number(counts?.correct || 0);
  const now = Date.now();
  await env.DB.prepare(`UPDATE exam_sessions
    SET correct_count = ?, submitted_at = ?, completed_at = ?
    WHERE id = ? AND family_id = ?`)
    .bind(correct, now, now, sessionId, familyId)
    .run();

  const completed = await examSession(env, familyId, sessionId);
  return completedExamResult(env, completed);
}
