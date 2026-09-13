import { familyProfiles, login, logout, requireProfile, requireSession, setupFamily } from './auth.js';
import { finishGame, gameStatus, requestReward, resolveReward, rewardShop, startGame } from './engagement.js';
import { finishExam, getExamQuestion, saveExamAnswer, startExam } from './exam-service.js';
import { HttpError, corsHeaders, json, readJson, routeMatch, withCors } from './http.js';
import { lockParentAccess, parentAccessStatus, requireParentAccess, setParentPin, unlockParentAccess } from './parent-access.js';
import { dashboardForProfile, progressForFamily } from './progress.js';
import { startQuiz, submitAnswer } from './quiz-service.js';

async function health(env) {
  const result = {
    ok: true,
    service: 'ubaybian-api',
    version: '0.5.82',
    db: { bound: Boolean(env.DB), schemaReady: false, examSchemaReady: false },
    gateway: {
      urlConfigured: Boolean(env.APPS_SCRIPT_URL),
      secretConfigured: Boolean(env.APPS_SCRIPT_SECRET),
    },
    setupTokenConfigured: Boolean(env.SETUP_TOKEN),
  };

  if (!env.DB || typeof env.DB.prepare !== 'function') return result;

  try {
    const tables = await env.DB.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN (
          'family_accounts', 'profiles', 'sessions', 'quiz_sessions', 'quiz_session_questions', 'quiz_answers', 'progress_summary',
          'exam_sessions', 'exam_session_questions', 'exam_answers'
        )
    `).all();
    const names = new Set((tables.results || []).map((row) => row.name));
    result.db.schemaReady = ['family_accounts', 'profiles', 'sessions', 'quiz_sessions', 'quiz_session_questions', 'quiz_answers', 'progress_summary']
      .every((name) => names.has(name));
    result.db.examSchemaReady = ['exam_sessions', 'exam_session_questions', 'exam_answers'].every((name) => names.has(name));
  } catch (error) {
    console.error('HEALTH_DB_CHECK_FAILED', error);
  }
  return result;
}

async function handler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method === 'GET' && path === '/v1/health') return json(await health(env));

  if (request.method === 'POST' && path === '/v1/setup') {
    const body = await readJson(request);
    const result = await setupFamily(env, body, request.headers.get('X-Setup-Token') || '');
    return json({ ok: true, family: result }, 201);
  }
  if (request.method === 'POST' && path === '/v1/auth/login') {
    const result = await login(env, await readJson(request));
    const profiles = await familyProfiles(env, result.family.id);
    return json({ token: result.token, expiresAt: result.expiresAt, family: result.family, profiles });
  }
  if (request.method === 'POST' && path === '/v1/auth/logout') {
    await logout(request, env);
    return json({ ok: true });
  }
  if (request.method === 'GET' && path === '/v1/auth/me') {
    const session = await requireSession(request, env);
    return json({ family: session.family, profiles: await familyProfiles(env, session.familyId) });
  }
  if (request.method === 'GET' && path === '/v1/progress') {
    const session = await requireSession(request, env);
    return json({ items: await progressForFamily(env, session.familyId) });
  }

  if (request.method === 'GET' && path === '/v1/parent/status') {
    const session = await requireSession(request, env);
    return json(await parentAccessStatus(env, session.familyId));
  }
  if (request.method === 'POST' && path === '/v1/parent/pin') {
    const session = await requireSession(request, env);
    const body = await readJson(request);
    return json(await setParentPin(env, session.familyId, body?.familyPassword, body?.pin));
  }
  if (request.method === 'POST' && path === '/v1/parent/unlock') {
    const session = await requireSession(request, env);
    const body = await readJson(request);
    return json(await unlockParentAccess(env, session.familyId, body?.pin));
  }
  if (request.method === 'POST' && path === '/v1/parent/lock') {
    const session = await requireSession(request, env);
    return json(await lockParentAccess(request, env, session.familyId));
  }

  const dashboardParams = routeMatch(path, '/v1/dashboard/:profileId');
  if (request.method === 'GET' && dashboardParams) {
    const session = await requireSession(request, env);
    const profile = await requireProfile(env, session.familyId, dashboardParams.profileId);
    return json(await dashboardForProfile(env, session.familyId, profile));
  }

  const progressParams = routeMatch(path, '/v1/progress/:profileId');
  if (request.method === 'GET' && progressParams) {
    const session = await requireSession(request, env);
    const profile = await requireProfile(env, session.familyId, progressParams.profileId);
    return json({ items: await progressForFamily(env, session.familyId, profile.id) });
  }

  const gameStatusParams = routeMatch(path, '/v1/games/:profileId/status');
  if (request.method === 'GET' && gameStatusParams) {
    const session = await requireSession(request, env);
    const profile = await requireProfile(env, session.familyId, gameStatusParams.profileId);
    return json(await gameStatus(env, session.familyId, profile));
  }
  const gameStartParams = routeMatch(path, '/v1/games/:profileId/start');
  if (request.method === 'POST' && gameStartParams) {
    const session = await requireSession(request, env);
    const profile = await requireProfile(env, session.familyId, gameStartParams.profileId);
    const body = await readJson(request);
    return json(await startGame(env, session.familyId, profile, String(body?.gameId || '')), 201);
  }
  const gameFinishParams = routeMatch(path, '/v1/games/:profileId/finish');
  if (request.method === 'POST' && gameFinishParams) {
    const session = await requireSession(request, env);
    const profile = await requireProfile(env, session.familyId, gameFinishParams.profileId);
    const body = await readJson(request);
    return json(await finishGame(env, session.familyId, profile, String(body?.sessionId || ''), body?.score));
  }

  const rewardParams = routeMatch(path, '/v1/rewards/:profileId');
  if (request.method === 'GET' && rewardParams) {
    const session = await requireSession(request, env);
    const profile = await requireProfile(env, session.familyId, rewardParams.profileId);
    return json(await rewardShop(env, session.familyId, profile));
  }
  const rewardRequestParams = routeMatch(path, '/v1/rewards/:profileId/requests');
  if (request.method === 'POST' && rewardRequestParams) {
    const session = await requireSession(request, env);
    const profile = await requireProfile(env, session.familyId, rewardRequestParams.profileId);
    const body = await readJson(request);
    return json(await requestReward(env, session.familyId, profile, String(body?.rewardId || '')), 201);
  }
  const rewardResolveParams = routeMatch(path, '/v1/rewards/:profileId/requests/:requestId/resolve');
  if (request.method === 'POST' && rewardResolveParams) {
    const session = await requireSession(request, env);
    const profile = await requireProfile(env, session.familyId, rewardResolveParams.profileId);
    await requireParentAccess(request, env, session.familyId);
    const body = await readJson(request);
    return json(await resolveReward(env, session.familyId, profile, rewardResolveParams.requestId, String(body?.decision || '')));
  }

  if (request.method === 'POST' && path === '/v1/quiz/sessions') {
    const session = await requireSession(request, env);
    const body = await readJson(request);
    const profile = await requireProfile(env, session.familyId, String(body?.profileId || ''));
    return json(await startQuiz(
      env,
      session.familyId,
      profile,
      String(body?.subjectId || ''),
      body?.limit,
      body?.mode,
    ), 201);
  }
  const answerParams = routeMatch(path, '/v1/quiz/sessions/:sessionId/answers');
  if (request.method === 'POST' && answerParams) {
    const session = await requireSession(request, env);
    const body = await readJson(request);
    return json(await submitAnswer(env, session.familyId, answerParams.sessionId, body, request.headers.get('Idempotency-Key') || ''));
  }

  if (request.method === 'POST' && path === '/v1/exam/sessions') {
    const session = await requireSession(request, env);
    const body = await readJson(request);
    const profile = await requireProfile(env, session.familyId, String(body?.profileId || ''));
    return json(await startExam(
      env,
      session.familyId,
      profile,
      String(body?.subjectId || ''),
      String(body?.blueprintId || ''),
    ), 201);
  }
  const examQuestionParams = routeMatch(path, '/v1/exam/sessions/:sessionId/questions/:position');
  if (request.method === 'GET' && examQuestionParams) {
    const session = await requireSession(request, env);
    return json(await getExamQuestion(env, session.familyId, examQuestionParams.sessionId, examQuestionParams.position));
  }
  const examAnswerParams = routeMatch(path, '/v1/exam/sessions/:sessionId/answers');
  if (request.method === 'POST' && examAnswerParams) {
    const session = await requireSession(request, env);
    return json(await saveExamAnswer(env, session.familyId, examAnswerParams.sessionId, await readJson(request)));
  }
  const examFinishParams = routeMatch(path, '/v1/exam/sessions/:sessionId/finish');
  if (request.method === 'POST' && examFinishParams) {
    const session = await requireSession(request, env);
    return json(await finishExam(env, session.familyId, examFinishParams.sessionId));
  }

  throw new HttpError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan.');
}

export default {
  async fetch(request, env) {
    let cors = {};
    try {
      cors = corsHeaders(request, env);
      if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), cors);
      return withCors(await handler(request, env), cors);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
      const message = error instanceof HttpError ? error.message : 'Terjadi kesalahan pada layanan belajar.';
      console.error(code, error);
      return withCors(json({ code, message }, status), cors);
    }
  },
};
