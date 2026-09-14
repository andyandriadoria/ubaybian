export const EXAM_REWARD_POLICY_START_AT = Date.parse('2026-09-12T11:00:00Z');
export const EXAM_REWARD_V2_START_AT = Date.parse('2026-09-14T23:30:00Z');

const LEGACY_EXAM_REWARD_RULES = Object.freeze({
  correctXp: 5,
  correctCoins: 20,
  completionXp: 50,
  completionAnswerRatio: 0.8,
});

export const EXAM_REWARD_RULES = Object.freeze({
  effortXpMax: 50,
  effortCoinsMax: 100,
  completionXpQualified: 25,
  completionCoinsQualified: 50,
  completionXpFull: 50,
  completionCoinsFull: 100,
  accuracyXpMax: 100,
  accuracyCoinsMax: 400,
  completionAnswerRatio: 0.8,
});

function safeCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function scaledReward(maximum, numerator, denominator) {
  if (!denominator || !maximum) return 0;
  return Math.max(0, Math.round((maximum * numerator) / denominator));
}

function legacyRewardFromExamStats(stats, eligible = true) {
  const total = safeCount(stats?.total);
  const answered = Math.min(total, safeCount(stats?.answered));
  const correct = Math.min(answered, safeCount(stats?.correct));
  const completionThreshold = total ? Math.ceil(total * LEGACY_EXAM_REWARD_RULES.completionAnswerRatio) : 0;
  const completionQualified = total > 0 && answered >= completionThreshold;
  const awardable = Boolean(eligible) && completionQualified;
  const potentialCorrectXp = correct * LEGACY_EXAM_REWARD_RULES.correctXp;
  const potentialCompletionXp = completionQualified ? LEGACY_EXAM_REWARD_RULES.completionXp : 0;
  const potentialCoins = correct * LEGACY_EXAM_REWARD_RULES.correctCoins;

  return {
    policyId: 'assessment-reward-v1',
    policyVersion: 1,
    eligible: awardable,
    firstAttempt: Boolean(eligible),
    xpEarned: awardable ? potentialCorrectXp + potentialCompletionXp : 0,
    coinsEarned: awardable ? potentialCoins : 0,
    correctXp: awardable ? potentialCorrectXp : 0,
    completionXp: awardable ? potentialCompletionXp : 0,
    correctCoins: awardable ? potentialCoins : 0,
    completionCoins: 0,
    effortXp: 0,
    effortCoins: 0,
    accuracyXp: awardable ? potentialCorrectXp : 0,
    accuracyCoins: awardable ? potentialCoins : 0,
    completionQualified,
    completionThreshold,
    answered,
    correct,
    autoTotal: total,
    total,
    rule: { ...LEGACY_EXAM_REWARD_RULES },
  };
}

export function rewardFromExamStats(stats, eligible = true) {
  const total = safeCount(stats?.total);
  const answered = Math.min(total, safeCount(stats?.answered));
  const autoTotal = Math.min(total, safeCount(stats?.autoTotal ?? total));
  const correct = Math.min(autoTotal, safeCount(stats?.correct));
  const completionThreshold = total ? Math.ceil(total * EXAM_REWARD_RULES.completionAnswerRatio) : 0;
  const completionQualified = total > 0 && answered >= completionThreshold;
  const fullCompletion = total > 0 && answered === total;
  const awardable = Boolean(eligible) && completionQualified;

  const potentialEffortXp = scaledReward(EXAM_REWARD_RULES.effortXpMax, answered, total);
  const potentialEffortCoins = scaledReward(EXAM_REWARD_RULES.effortCoinsMax, answered, total);
  const potentialCompletionXp = completionQualified
    ? (fullCompletion ? EXAM_REWARD_RULES.completionXpFull : EXAM_REWARD_RULES.completionXpQualified)
    : 0;
  const potentialCompletionCoins = completionQualified
    ? (fullCompletion ? EXAM_REWARD_RULES.completionCoinsFull : EXAM_REWARD_RULES.completionCoinsQualified)
    : 0;
  const potentialAccuracyXp = scaledReward(EXAM_REWARD_RULES.accuracyXpMax, correct, autoTotal);
  const potentialAccuracyCoins = scaledReward(EXAM_REWARD_RULES.accuracyCoinsMax, correct, autoTotal);

  const effortXp = awardable ? potentialEffortXp : 0;
  const effortCoins = awardable ? potentialEffortCoins : 0;
  const completionXp = awardable ? potentialCompletionXp : 0;
  const completionCoins = awardable ? potentialCompletionCoins : 0;
  const accuracyXp = awardable ? potentialAccuracyXp : 0;
  const accuracyCoins = awardable ? potentialAccuracyCoins : 0;

  return {
    policyId: 'assessment-reward-v2-effort-completion-accuracy',
    policyVersion: 2,
    eligible: awardable,
    firstAttempt: Boolean(eligible),
    xpEarned: effortXp + completionXp + accuracyXp,
    coinsEarned: effortCoins + completionCoins + accuracyCoins,
    effortXp,
    effortCoins,
    completionXp,
    completionCoins,
    accuracyXp,
    accuracyCoins,
    // Compatibility aliases for older clients. In v2 these represent the accuracy component.
    correctXp: accuracyXp,
    correctCoins: accuracyCoins,
    completionQualified,
    completionThreshold,
    fullCompletion,
    answered,
    correct,
    autoTotal,
    total,
    rule: { ...EXAM_REWARD_RULES },
  };
}

function rewardForCompletedAt(stats, eligible, completedAt) {
  return Number(completedAt || 0) >= EXAM_REWARD_V2_START_AT
    ? rewardFromExamStats(stats, eligible)
    : legacyRewardFromExamStats(stats, eligible);
}

function rewardKey(row) {
  return `${String(row.subject_id || '')}::${String(row.blueprint_id || '')}`;
}

async function firstQualifiedAttempt(env, session) {
  return env.DB.prepare(`SELECT es.id
    FROM exam_sessions es
    WHERE es.family_id = ? AND es.profile_id = ? AND es.subject_id = ? AND es.blueprint_id = ?
      AND es.completed_at IS NOT NULL AND es.completed_at >= ?
      AND ((SELECT COUNT(*) FROM exam_answers ea WHERE ea.session_id = es.id) * 5) >= (es.total_questions * 4)
    ORDER BY es.completed_at ASC, es.created_at ASC, es.id ASC
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

async function autoTotalForSession(env, sessionId) {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS count
    FROM exam_session_questions
    WHERE session_id = ? AND question_type <> 'open-response'`)
    .bind(sessionId)
    .first();
  return safeCount(row?.count);
}

export async function examRewardForSession(env, session, stats) {
  const completedAt = Number(session.completed_at || 0);
  if (completedAt < EXAM_REWARD_POLICY_START_AT) {
    return { ...legacyRewardFromExamStats(stats, false), status: 'legacy' };
  }

  const enrichedStats = completedAt >= EXAM_REWARD_V2_START_AT
    ? { ...stats, autoTotal: stats?.autoTotal ?? await autoTotalForSession(env, session.id) }
    : stats;
  const preview = rewardForCompletedAt(enrichedStats, false, completedAt);
  if (!preview.completionQualified) return { ...preview, status: 'incomplete' };

  const first = await firstQualifiedAttempt(env, session);
  const eligible = Boolean(first?.id && String(first.id) === String(session.id));
  return {
    ...rewardForCompletedAt(enrichedStats, eligible, completedAt),
    status: eligible ? 'earned' : 'retake',
  };
}

export async function examRewardTotals(env, familyId, profileId) {
  const result = await env.DB.prepare(`SELECT es.id, es.subject_id, es.blueprint_id, es.total_questions,
      es.correct_count, es.created_at, es.completed_at,
      (SELECT COUNT(*) FROM exam_answers ea WHERE ea.session_id = es.id) AS answered_count,
      (SELECT COUNT(*) FROM exam_session_questions eq
        WHERE eq.session_id = es.id AND eq.question_type <> 'open-response') AS auto_total
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
    const reward = rewardForCompletedAt({
      correct: row.correct_count,
      answered: row.answered_count,
      autoTotal: row.auto_total,
      total: row.total_questions,
    }, true, row.completed_at);
    if (!reward.completionQualified) continue;
    const key = rewardKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
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
