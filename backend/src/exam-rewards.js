export const EXAM_REWARD_POLICY_START_AT = Date.parse('2026-09-12T11:00:00Z');

export const EXAM_REWARD_RULES = Object.freeze({
  correctXp: 5,
  correctCoins: 20,
  completionXp: 50,
  completionAnswerRatio: 0.8,
});

function safeCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function rewardFromExamStats(stats, eligible = true) {
  const total = safeCount(stats?.total);
  const answered = Math.min(total, safeCount(stats?.answered));
  const correct = Math.min(answered, safeCount(stats?.correct));
  const completionThreshold = total ? Math.ceil(total * EXAM_REWARD_RULES.completionAnswerRatio) : 0;
  const completionQualified = total > 0 && answered >= completionThreshold;
  const potentialCorrectXp = correct * EXAM_REWARD_RULES.correctXp;
  const potentialCompletionXp = completionQualified ? EXAM_REWARD_RULES.completionXp : 0;
  const potentialCoins = correct * EXAM_REWARD_RULES.correctCoins;

  return {
    eligible: Boolean(eligible),
    firstAttempt: Boolean(eligible),
    xpEarned: eligible ? potentialCorrectXp + potentialCompletionXp : 0,
    coinsEarned: eligible ? potentialCoins : 0,
    correctXp: eligible ? potentialCorrectXp : 0,
    completionXp: eligible ? potentialCompletionXp : 0,
    correctCoins: eligible ? potentialCoins : 0,
    completionQualified,
    completionThreshold,
    answered,
    correct,
    total,
    rule: {
      correctXp: EXAM_REWARD_RULES.correctXp,
      correctCoins: EXAM_REWARD_RULES.correctCoins,
      completionXp: EXAM_REWARD_RULES.completionXp,
      completionAnswerRatio: EXAM_REWARD_RULES.completionAnswerRatio,
    },
  };
}

function rewardKey(row) {
  return `${String(row.subject_id || '')}::${String(row.blueprint_id || '')}`;
}

async function firstCompletedAttempt(env, session) {
  return env.DB.prepare(`SELECT id
    FROM exam_sessions
    WHERE family_id = ? AND profile_id = ? AND subject_id = ? AND blueprint_id = ?
      AND completed_at IS NOT NULL AND completed_at >= ?
    ORDER BY completed_at ASC, created_at ASC, id ASC
    LIMIT 1`)
    .bind(
      session.family_id,
      session.profile_id,
      session.subject_id,
      session.blueprint_id,
      EXAM_REWARD_POLICY_START_AT,
    )
    .first();
}

export async function examRewardForSession(env, session, stats) {
  const completedAt = Number(session.completed_at || 0);
  if (completedAt < EXAM_REWARD_POLICY_START_AT) return rewardFromExamStats(stats, false);
  const first = await firstCompletedAttempt(env, session);
  const eligible = Boolean(first?.id && String(first.id) === String(session.id));
  return rewardFromExamStats(stats, eligible);
}

export async function examRewardTotals(env, familyId, profileId) {
  const result = await env.DB.prepare(`SELECT es.id, es.subject_id, es.blueprint_id, es.total_questions,
      es.correct_count, es.created_at, es.completed_at,
      (SELECT COUNT(*) FROM exam_answers ea WHERE ea.session_id = es.id) AS answered_count
    FROM exam_sessions es
    WHERE es.family_id = ? AND es.profile_id = ? AND es.completed_at IS NOT NULL AND es.completed_at >= ?
    ORDER BY es.completed_at ASC, es.created_at ASC, es.id ASC`)
    .bind(familyId, profileId, EXAM_REWARD_POLICY_START_AT)
    .all();

  const seen = new Set();
  const rewarded = [];
  let xp = 0;
  let coins = 0;

  for (const row of result.results || []) {
    const key = rewardKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const reward = rewardFromExamStats({
      correct: row.correct_count,
      answered: row.answered_count,
      total: row.total_questions,
    }, true);
    xp += reward.xpEarned;
    coins += reward.coinsEarned;
    rewarded.push({
      sessionId: String(row.id),
      subjectId: String(row.subject_id || ''),
      blueprintId: String(row.blueprint_id || ''),
      completedAt: Number(row.completed_at || 0),
      ...reward,
    });
  }

  return {
    xp,
    coins,
    rewardedExams: rewarded.length,
    sessions: rewarded,
  };
}
