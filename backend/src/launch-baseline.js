export const LAUNCH_BASELINE_KEY = 'production-launch-2026-09-13-v1';

const OPTIONAL_PROGRESS_TABLES = Object.freeze([
  'game_sessions',
  'reward_requests',
  'achievements',
]);

async function ensureLaunchResetSchema(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS launch_resets (
    reset_key TEXT PRIMARY KEY,
    reset_at INTEGER NOT NULL,
    profiles_json TEXT NOT NULL DEFAULT '[]'
  )`).run();
}

async function existingOptionalTables(env) {
  const result = await env.DB.prepare(`SELECT name FROM sqlite_master
    WHERE type = 'table' AND name IN ('game_sessions','reward_requests','achievements')`).all();
  return new Set((result.results || []).map((row) => String(row.name || '')));
}

export async function ensureProductionLaunchBaseline(env) {
  if (!env?.DB || typeof env.DB.prepare !== 'function') {
    return { applied: false, ready: false, reason: 'db-unavailable' };
  }

  await ensureLaunchResetSchema(env);

  const previous = await env.DB.prepare(`SELECT reset_at, profiles_json
    FROM launch_resets WHERE reset_key = ?`).bind(LAUNCH_BASELINE_KEY).first();
  if (previous) {
    return {
      applied: false,
      ready: true,
      alreadyApplied: true,
      resetAt: Number(previous.reset_at || 0),
    };
  }

  const profiles = await env.DB.prepare(`SELECT id, slug
    FROM profiles
    WHERE slug IN ('ubay','bian')
    ORDER BY id`).all();
  const targetProfiles = profiles.results || [];

  // Do not burn the one-time marker before the family/profile setup exists.
  if (!targetProfiles.length) {
    return { applied: false, ready: true, reason: 'profiles-not-ready' };
  }

  const profileIds = targetProfiles.map((row) => Number(row.id)).filter(Number.isFinite);
  const placeholders = profileIds.map(() => '?').join(',');
  const optionalTables = await existingOptionalTables(env);
  const statements = [];
  const bindIds = (sql) => env.DB.prepare(sql).bind(...profileIds);

  // Delete child rows explicitly so the reset remains correct even if a D1
  // connection does not inherit a previous PRAGMA foreign_keys setting.
  statements.push(bindIds(`DELETE FROM quiz_answers
    WHERE session_id IN (SELECT id FROM quiz_sessions WHERE profile_id IN (${placeholders}))`));
  statements.push(bindIds(`DELETE FROM quiz_session_questions
    WHERE session_id IN (SELECT id FROM quiz_sessions WHERE profile_id IN (${placeholders}))`));
  statements.push(bindIds(`DELETE FROM quiz_sessions WHERE profile_id IN (${placeholders})`));
  statements.push(bindIds(`DELETE FROM progress_summary WHERE profile_id IN (${placeholders})`));

  statements.push(bindIds(`DELETE FROM exam_answers
    WHERE session_id IN (SELECT id FROM exam_sessions WHERE profile_id IN (${placeholders}))`));
  statements.push(bindIds(`DELETE FROM exam_session_questions
    WHERE session_id IN (SELECT id FROM exam_sessions WHERE profile_id IN (${placeholders}))`));
  statements.push(bindIds(`DELETE FROM exam_sessions WHERE profile_id IN (${placeholders})`));

  if (optionalTables.has('game_sessions')) {
    statements.push(bindIds(`DELETE FROM game_sessions WHERE profile_id IN (${placeholders})`));
  }
  if (optionalTables.has('reward_requests')) {
    statements.push(bindIds(`DELETE FROM reward_requests WHERE profile_id IN (${placeholders})`));
  }
  if (optionalTables.has('achievements')) {
    statements.push(bindIds(`DELETE FROM achievements WHERE profile_id IN (${placeholders})`));
  }

  const resetAt = Date.now();
  statements.push(env.DB.prepare(`INSERT INTO launch_resets (reset_key, reset_at, profiles_json)
    VALUES (?, ?, ?)`).bind(
    LAUNCH_BASELINE_KEY,
    resetAt,
    JSON.stringify(targetProfiles.map((row) => ({ id: Number(row.id), slug: String(row.slug || '') }))),
  ));

  await env.DB.batch(statements);

  return {
    applied: true,
    ready: true,
    resetAt,
    profiles: targetProfiles.map((row) => String(row.slug || '')),
    cleared: {
      practice: true,
      assessment: true,
      progressSummary: true,
      games: optionalTables.has('game_sessions'),
      rewards: optionalTables.has('reward_requests'),
      achievements: optionalTables.has('achievements'),
    },
  };
}
