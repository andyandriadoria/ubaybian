import { familyProfiles, login, logout, requireProfile, requireSession, setupFamily } from './auth.js';
import { HttpError, corsHeaders, json, readJson, routeMatch, withCors } from './http.js';
import { dashboardForProfile, progressForFamily } from './progress.js';
import { startQuiz, submitAnswer } from './quiz-service.js';

async function health(env) {
  const result = {
    ok: true,
    service: 'ubaybian-api',
    version: '0.4.0',
    db: { bound: Boolean(env.DB), schemaReady: false },
    gateway: {
      urlConfigured: Boolean(env.APPS_SCRIPT_URL),
      secretConfigured: Boolean(env.APPS_SCRIPT_SECRET),
    },
    setupTokenConfigured: Boolean(env.SETUP_TOKEN),
  };

  if (!env.DB || typeof env.DB.prepare !== 'function') return result;

  try {
    const tables = await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('family_accounts', 'profiles', 'sessions', 'quiz_sessions', 'quiz_session_questions', 'quiz_answers', 'progress_summary')
    `).first();
    result.db.schemaReady = Number(tables?.count || 0) === 7;
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
