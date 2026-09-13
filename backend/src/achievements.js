import { ASSESSMENT_DEFINITIONS, assessmentDefinitionForBlueprint } from './assessment/registry.js';
import { EXAM_REVIEW_POLICY_START_AT } from './review-queue.js';

const SUBJECT_NAMES = Object.freeze({
  'bahasa-indonesia': 'Bahasa Indonesia',
  english: 'English',
  math: 'Math',
  science: 'Science',
  pancasila: 'Pancasila',
  paibp: 'PAIBP',
  pai: 'PAI',
  informatika: 'Informatika',
  'global-citizenship': 'Global Citizenship',
});

const RARITY_PRIORITY = Object.freeze({ common: 35, uncommon: 50, rare: 70, legendary: 90 });

function safeCount(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
function score(correct, total) { return total > 0 ? Math.round((safeCount(correct) / total) * 100) : 0; }
function subjectName(subjectId) {
  const id = String(subjectId || '').trim();
  return SUBJECT_NAMES[id] || id.split('-').filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ') || 'Subject';
}
function dayKey(timestamp) {
  return new Date(Number(timestamp) + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}
function dayNumber(key) { return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000); }
function sortedNumbers(values) { return [...values].map(Number).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b); }

function currentAcademicContext(profile) {
  const matches = ASSESSMENT_DEFINITIONS
    .filter((item) => item.status === 'active' && item.profileSlug === profile.slug && Number(item.grade) === Number(profile.grade))
    .sort((a, b) => String(b.academicYear).localeCompare(String(a.academicYear)) || Number(b.semester) - Number(a.semester));
  const active = matches[0] || null;
  return {
    academicYear: active?.academicYear || '',
    grade: Number(active?.grade ?? profile.grade ?? 0) || null,
    semester: Number(active?.semester || 0) || null,
  };
}

function makeCandidate({
  badgeId,
  scopeKey = '',
  category,
  tier = 1,
  tierLabel = '',
  rarity = 'common',
  name,
  description,
  emoji,
  context,
  unlockedAt,
  upgradedAt = unlockedAt,
  priority = null,
  metadata = {},
}) {
  return Object.freeze({
    badgeId,
    scopeKey: String(scopeKey || ''),
    category,
    tier: Math.max(1, safeCount(tier)),
    tierLabel,
    rarity,
    priority: priority ?? RARITY_PRIORITY[rarity] ?? 0,
    name,
    description,
    emoji,
    academicYear: String(context?.academicYear || ''),
    grade: Number(context?.grade || 0) || null,
    semester: Number(context?.semester || 0) || null,
    unlockedAt: Number(unlockedAt || Date.now()),
    upgradedAt: Number(upgradedAt || unlockedAt || Date.now()),
    metadata: Object.freeze({ ...metadata }),
  });
}

function milestoneCandidate(value, events, levels, spec) {
  const achieved = levels.filter((level) => value >= level.threshold);
  if (!achieved.length) return null;
  const first = achieved[0];
  const current = achieved[achieved.length - 1];
  const eventAt = (threshold) => {
    const index = Math.max(0, threshold - 1);
    return Number(events[index] || events[events.length - 1] || Date.now());
  };
  return makeCandidate({
    ...spec,
    tier: current.tier,
    tierLabel: current.tierLabel,
    rarity: current.rarity,
    name: current.name,
    description: current.description,
    emoji: current.emoji || spec.emoji,
    unlockedAt: eventAt(first.threshold),
    upgradedAt: eventAt(current.threshold),
    metadata: { ...(spec.metadata || {}), value, threshold: current.threshold },
  });
}

function streakMilestoneTimes(completedAtValues) {
  const perDay = new Map();
  for (const timestamp of sortedNumbers(completedAtValues)) {
    const key = dayKey(timestamp);
    if (!perDay.has(key)) perDay.set(key, timestamp);
  }
  const days = [...perDay.keys()].sort((a, b) => dayNumber(a) - dayNumber(b));
  const reached = new Map();
  let run = 0;
  let previous = null;
  for (const key of days) {
    const day = dayNumber(key);
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    previous = day;
    for (const threshold of [3, 14, 30]) {
      if (run >= threshold && !reached.has(threshold)) reached.set(threshold, perDay.get(key));
    }
  }
  return reached;
}

function recoveryStats(events) {
  const ordered = [...events].sort((a, b) => {
    const diff = Number(a.event_at || 0) - Number(b.event_at || 0);
    if (diff) return diff;
    // At equal timestamps treat Assessment state before Practice/Review correction.
    return String(a.source) === 'exam' ? -1 : 1;
  });
  const state = new Map();
  const recovered = [];
  const everWrong = new Set();
  for (const event of ordered) {
    const key = `${String(event.subject_id || '')}::${String(event.question_id || '')}`;
    if (!event.subject_id || !event.question_id) continue;
    const item = state.get(key) || { hadWrong: false, recovered: false };
    if (Number(event.correct) === 1) {
      if (item.hadWrong && !item.recovered) {
        item.recovered = true;
        recovered.push({ key, eventAt: Number(event.event_at || 0), subjectId: event.subject_id });
      }
    } else {
      item.hadWrong = true;
      everWrong.add(key);
    }
    state.set(key, item);
  }
  return { recovered: recovered.sort((a, b) => a.eventAt - b.eventAt), everWrongCount: everWrong.size };
}

function definitionContext(definition, fallback) {
  return definition ? {
    academicYear: definition.academicYear,
    grade: definition.grade,
    semester: definition.semester,
  } : fallback;
}

export function buildAchievementCandidates({ profile, dashboard, practiceSessions = [], assessments = [], answerEvents = [], recoveryEvents = [] }) {
  const context = currentAcademicContext(profile);
  const candidates = [];
  const practiceCompleted = [...practiceSessions].filter((row) => Number(row.completed_at) > 0);
  const assessmentCompleted = [...assessments].filter((row) => Number(row.completed_at) > 0);
  const allSessionTimes = sortedNumbers([
    ...practiceCompleted.map((row) => row.completed_at),
    ...assessmentCompleted.map((row) => row.completed_at),
  ]);

  // CONSISTENCY — one badge that upgrades rather than stacking three similar badges.
  const streakTimes = streakMilestoneTimes(allSessionTimes);
  const longest = safeCount(dashboard?.stats?.streak?.longest);
  const streakLevels = [
    { threshold: 3, tier: 1, tierLabel: 'Bronze', rarity: 'common', name: 'On Fire', description: 'Belajar pada 3 hari berturut-turut.', emoji: '🔥' },
    { threshold: 14, tier: 2, tierLabel: 'Gold', rarity: 'rare', name: 'Steady Learner', description: 'Menjaga kebiasaan belajar selama 14 hari berturut-turut.', emoji: '🗓️' },
    { threshold: 30, tier: 3, tierLabel: 'Crown', rarity: 'legendary', name: 'Unstoppable', description: 'Menjaga kebiasaan belajar selama 30 hari berturut-turut.', emoji: '💎' },
  ];
  const reachedStreak = streakLevels.filter((item) => longest >= item.threshold);
  if (reachedStreak.length) {
    const first = reachedStreak[0];
    const current = reachedStreak[reachedStreak.length - 1];
    candidates.push(makeCandidate({
      badgeId: 'learning-streak', category: 'consistency', context,
      tier: current.tier, tierLabel: current.tierLabel, rarity: current.rarity,
      name: current.name, description: current.description, emoji: current.emoji,
      unlockedAt: streakTimes.get(first.threshold) || allSessionTimes[0] || Date.now(),
      upgradedAt: streakTimes.get(current.threshold) || allSessionTimes[allSessionTimes.length - 1] || Date.now(),
      metadata: { longestStreak: longest, threshold: current.threshold },
    }));
  }

  // PRACTICE — Perfect Score progression.
  const perfectTimes = sortedNumbers(practiceCompleted.filter((row) => score(row.correct_count, safeCount(row.total_questions)) === 100).map((row) => row.completed_at));
  const perfectBadge = milestoneCandidate(perfectTimes.length, perfectTimes, [
    { threshold: 1, tier: 1, tierLabel: 'Bronze', rarity: 'common', name: 'Perfect Starter', description: 'Mendapat 100% pada 1 sesi Practice.', emoji: '🌟' },
    { threshold: 3, tier: 2, tierLabel: 'Silver', rarity: 'uncommon', name: 'Perfect Pro', description: 'Mendapat 100% pada 3 sesi Practice.', emoji: '🌟' },
    { threshold: 5, tier: 3, tierLabel: 'Gold', rarity: 'rare', name: 'Perfect Expert', description: 'Mendapat 100% pada 5 sesi Practice.', emoji: '✨' },
    { threshold: 10, tier: 4, tierLabel: 'Crown', rarity: 'legendary', name: 'Perfect Legend', description: 'Mendapat 100% pada 10 sesi Practice.', emoji: '👑' },
  ], { badgeId: 'perfect-score', category: 'practice', context, emoji: '🌟' });
  if (perfectBadge) candidates.push(perfectBadge);

  // PRACTICE — session habit progression.
  const studyBadge = milestoneCandidate(allSessionTimes.length, allSessionTimes, [
    { threshold: 10, tier: 1, tierLabel: 'Bronze', rarity: 'common', name: 'Study Habit', description: 'Menyelesaikan 10 sesi Practice atau Assessment.', emoji: '📚' },
    { threshold: 25, tier: 2, tierLabel: 'Silver', rarity: 'uncommon', name: 'Dedicated Learner', description: 'Menyelesaikan 25 sesi belajar.', emoji: '📚' },
    { threshold: 50, tier: 3, tierLabel: 'Gold', rarity: 'rare', name: 'Study Champion', description: 'Menyelesaikan 50 sesi belajar.', emoji: '🏅' },
    { threshold: 100, tier: 4, tierLabel: 'Crown', rarity: 'legendary', name: 'Learning Legend', description: 'Menyelesaikan 100 sesi belajar.', emoji: '🌟' },
  ], { badgeId: 'study-habit', category: 'practice', context, emoji: '📚' });
  if (studyBadge) candidates.push(studyBadge);

  // PRACTICE — answered-question progression. Skips count as answered Practice questions;
  // unanswered Assessment items do not, matching dashboard totalAnswered semantics.
  const answerTimes = sortedNumbers(answerEvents.map((row) => row.event_at));
  const answeredValue = safeCount(dashboard?.stats?.totalAnswered);
  const questionBadge = milestoneCandidate(answeredValue, answerTimes, [
    { threshold: 100, tier: 1, tierLabel: 'Bronze', rarity: 'common', name: '100 Questions', description: 'Menjawab 100 soal Practice atau Assessment.', emoji: '🧠' },
    { threshold: 250, tier: 2, tierLabel: 'Silver', rarity: 'uncommon', name: '250 Questions', description: 'Menjawab 250 soal Practice atau Assessment.', emoji: '🧠' },
    { threshold: 500, tier: 3, tierLabel: 'Gold', rarity: 'rare', name: '500 Questions', description: 'Menjawab 500 soal Practice atau Assessment.', emoji: '🧠' },
    { threshold: 1000, tier: 4, tierLabel: 'Crown', rarity: 'legendary', name: '1,000 Questions', description: 'Menjawab 1.000 soal Practice atau Assessment.', emoji: '🧠' },
  ], { badgeId: 'questions-answered', category: 'practice', context, emoji: '🧠' });
  if (questionBadge) candidates.push(questionBadge);

  const challenge = practiceCompleted.filter((row) => safeCount(row.total_questions) >= 15).sort((a, b) => Number(a.completed_at) - Number(b.completed_at))[0];
  if (challenge) candidates.push(makeCandidate({
    badgeId: 'challenge-accepted', category: 'practice', context, rarity: 'uncommon',
    name: 'Challenge Accepted', description: 'Menyelesaikan sesi Practice 15 soal.', emoji: '🚀',
    unlockedAt: challenge.completed_at, metadata: { totalQuestions: safeCount(challenge.total_questions) },
  }));

  // MASTERY — each subject has one badge that upgrades Star -> Master.
  const practiceStars = new Map();
  for (const row of practiceCompleted.sort((a, b) => Number(a.completed_at) - Number(b.completed_at))) {
    const subjectId = String(row.subject_id || '');
    if (!subjectId || subjectId === 'mix' || score(row.correct_count, safeCount(row.total_questions)) < 90) continue;
    if (!practiceStars.has(subjectId)) practiceStars.set(subjectId, Number(row.completed_at));
  }

  const assessmentMasters = new Map();
  for (const row of assessmentCompleted.sort((a, b) => Number(a.completed_at) - Number(b.completed_at))) {
    const subjectId = String(row.subject_id || '');
    const openResponseTotal = safeCount(row.open_response_total);
    const total = safeCount(row.total_questions);
    if (!subjectId || subjectId === 'mix' || openResponseTotal > 0 || score(row.correct_count, total) < 90) continue;
    if (!assessmentMasters.has(subjectId)) assessmentMasters.set(subjectId, row);
  }

  const masterySubjects = new Set([...practiceStars.keys(), ...assessmentMasters.keys()]);
  const masterUnlockTimes = [];
  for (const subjectId of masterySubjects) {
    const starAt = practiceStars.get(subjectId) || 0;
    const masterRow = assessmentMasters.get(subjectId) || null;
    const masterAt = Number(masterRow?.completed_at || 0);
    const isMaster = Boolean(masterAt);
    const definition = masterRow ? assessmentDefinitionForBlueprint(masterRow.blueprint_id) : null;
    const label = subjectName(subjectId);
    candidates.push(makeCandidate({
      badgeId: 'subject-mastery', scopeKey: subjectId, category: 'mastery',
      tier: isMaster ? 2 : 1,
      tierLabel: isMaster ? 'Master' : 'Star',
      rarity: isMaster ? 'rare' : 'uncommon',
      priority: isMaster ? 82 : 52,
      name: `${label} ${isMaster ? 'Master' : 'Star'}`,
      description: isMaster
        ? `Mencapai nilai final minimal 90% pada Assessment ${label}.`
        : `Mencapai minimal 90% pada Practice ${label}.`,
      emoji: isMaster ? '🏆' : '⭐',
      context: definitionContext(definition, context),
      unlockedAt: starAt || masterAt,
      upgradedAt: masterAt || starAt,
      metadata: { subjectId, assessmentBlueprintId: masterRow?.blueprint_id || '' },
    }));
    if (isMaster) masterUnlockTimes.push(masterAt);
  }

  // MASTERY — multi-subject progression based only on true Subject Masters.
  masterUnlockTimes.sort((a, b) => a - b);
  const multiMaster = milestoneCandidate(masterUnlockTimes.length, masterUnlockTimes, [
    { threshold: 2, tier: 1, tierLabel: 'Silver', rarity: 'uncommon', name: 'Dual Master', description: 'Meraih Subject Master pada 2 mata pelajaran.', emoji: '🏆' },
    { threshold: 3, tier: 2, tierLabel: 'Gold', rarity: 'rare', name: 'All-Rounder', description: 'Meraih Subject Master pada 3 mata pelajaran.', emoji: '🌈' },
    { threshold: 5, tier: 3, tierLabel: 'Crown', rarity: 'legendary', name: 'Multi-Subject Master', description: 'Meraih Subject Master pada 5 mata pelajaran.', emoji: '👑' },
  ], { badgeId: 'multi-subject-mastery', category: 'mastery', context, emoji: '🏆', priority: 88 });
  if (multiMaster) candidates.push(multiMaster);

  // GROWTH — recovery counts Practice and Assessment wrong/unanswered events followed by a later correct Practice/Review answer.
  const recovery = recoveryStats(recoveryEvents);
  const recoveryTimes = recovery.recovered.map((item) => item.eventAt);
  const recoveryBadge = milestoneCandidate(recoveryTimes.length, recoveryTimes, [
    { threshold: 10, tier: 1, tierLabel: 'Silver', rarity: 'uncommon', name: 'Comeback', description: 'Menguasai 10 soal yang sebelumnya masih salah atau dilewati.', emoji: '🔁' },
    { threshold: 25, tier: 2, tierLabel: 'Gold', rarity: 'rare', name: 'Never Give Up', description: 'Menguasai 25 soal yang sebelumnya masih salah atau dilewati.', emoji: '💪' },
  ], { badgeId: 'recovery', category: 'growth', context, emoji: '🔁' });
  if (recoveryBadge) candidates.push(recoveryBadge);

  if (recoveryTimes.length >= 5 && safeCount(dashboard?.stats?.reviewTotal) === 0) {
    candidates.push(makeCandidate({
      badgeId: 'review-clear', category: 'growth', context, rarity: 'rare', priority: 74,
      name: 'Review Clear', description: 'Memperbaiki setidaknya 5 soal dan membersihkan seluruh antrean Review.', emoji: '🎯',
      unlockedAt: recoveryTimes[Math.min(4, recoveryTimes.length - 1)] || Date.now(),
      upgradedAt: recoveryTimes[recoveryTimes.length - 1] || Date.now(),
      metadata: { recoveredQuestions: recoveryTimes.length, everWrongQuestions: recovery.everWrongCount },
    }));
  }

  // ASSESSMENT — journey and performance.
  const assessmentsByTime = [...assessmentCompleted].sort((a, b) => Number(a.completed_at) - Number(b.completed_at));
  const firstAssessment = assessmentsByTime[0];
  if (firstAssessment) {
    const definition = assessmentDefinitionForBlueprint(firstAssessment.blueprint_id);
    candidates.push(makeCandidate({
      badgeId: 'assessment-journey', category: 'assessment', context: definitionContext(definition, context), rarity: 'common',
      name: 'First Assessment', description: 'Menyelesaikan Assessment pertama di UbayBian.', emoji: '📝',
      unlockedAt: firstAssessment.completed_at, metadata: { blueprintId: firstAssessment.blueprint_id },
    }));
  }

  const finalScored = assessmentsByTime.filter((row) => safeCount(row.open_response_total) === 0 && safeCount(row.total_questions) > 0);
  const aceRows = finalScored.filter((row) => score(row.correct_count, safeCount(row.total_questions)) >= 90);
  const perfectAssessmentRows = finalScored.filter((row) => score(row.correct_count, safeCount(row.total_questions)) === 100);
  if (aceRows.length) {
    const perfect = perfectAssessmentRows[0] || null;
    const ace = aceRows[0];
    const current = perfect || ace;
    const definition = assessmentDefinitionForBlueprint(current.blueprint_id);
    candidates.push(makeCandidate({
      badgeId: 'assessment-performance', category: 'assessment',
      tier: perfect ? 2 : 1,
      tierLabel: perfect ? 'Crown' : 'Gold',
      rarity: perfect ? 'legendary' : 'rare',
      priority: perfect ? 96 : 78,
      name: perfect ? 'Assessment Perfect' : 'Assessment Ace',
      description: perfect ? 'Mendapat nilai final 100% pada sebuah Assessment.' : 'Mendapat nilai final minimal 90% pada sebuah Assessment.',
      emoji: perfect ? '💯' : '🎯',
      context: definitionContext(definition, context),
      unlockedAt: ace.completed_at,
      upgradedAt: perfect?.completed_at || ace.completed_at,
      metadata: { blueprintId: current.blueprint_id, score: score(current.correct_count, safeCount(current.total_questions)) },
    }));
  }

  // ASSESSMENT — semester completion becomes active automatically once Final definitions exist in the registry.
  const finalDefinitions = ASSESSMENT_DEFINITIONS.filter((item) => item.profileSlug === profile.slug && item.assessmentType === 'final');
  const finalGroups = new Map();
  for (const definition of finalDefinitions) {
    const key = `${definition.academicYear}::g${definition.grade}::s${definition.semester}`;
    if (!finalGroups.has(key)) finalGroups.set(key, []);
    finalGroups.get(key).push(definition);
  }
  for (const [scopeKey, definitions] of finalGroups) {
    const completionTimes = [];
    let complete = true;
    for (const definition of definitions) {
      const row = assessmentsByTime.find((assessment) => assessment.blueprint_id === definition.blueprintId);
      if (!row) { complete = false; break; }
      completionTimes.push(Number(row.completed_at));
    }
    if (!complete || !completionTimes.length) continue;
    const definition = definitions[0];
    candidates.push(makeCandidate({
      badgeId: 'semester-finisher', scopeKey, category: 'assessment', rarity: 'legendary', priority: 94,
      name: `Semester ${definition.semester} Finisher`,
      description: `Menyelesaikan seluruh Final Assessment Grade ${definition.grade} Semester ${definition.semester}.`,
      emoji: '🏅', context: definitionContext(definition, context),
      unlockedAt: Math.max(...completionTimes),
      metadata: { assessmentCount: definitions.length, assessmentType: 'final' },
    }));
  }

  return candidates.sort((a, b) => b.priority - a.priority || b.tier - a.tier || b.upgradedAt - a.upgradedAt);
}

async function loadAchievementHistory(env, familyId, profileId) {
  const [practiceResult, assessmentResult, answerEventResult, recoveryEventResult] = await Promise.all([
    env.DB.prepare(`SELECT id, subject_id, total_questions, correct_count, completed_at
      FROM quiz_sessions
      WHERE family_id = ? AND profile_id = ? AND completed_at IS NOT NULL
      ORDER BY completed_at`).bind(familyId, profileId).all(),
    env.DB.prepare(`SELECT es.id, es.subject_id, es.blueprint_id, es.title, es.total_questions, es.correct_count, es.completed_at,
        (SELECT COUNT(*) FROM exam_session_questions eq WHERE eq.session_id = es.id AND eq.question_type = 'open-response') AS open_response_total
      FROM exam_sessions es
      WHERE es.family_id = ? AND es.profile_id = ? AND es.completed_at IS NOT NULL
      ORDER BY es.completed_at`).bind(familyId, profileId).all(),
    env.DB.prepare(`SELECT qa.answered_at AS event_at
      FROM quiz_answers qa JOIN quiz_sessions qs ON qs.id = qa.session_id
      WHERE qs.family_id = ? AND qs.profile_id = ?
      UNION ALL
      SELECT ea.updated_at AS event_at
      FROM exam_answers ea JOIN exam_sessions es ON es.id = ea.session_id
      WHERE es.family_id = ? AND es.profile_id = ?`).bind(familyId, profileId, familyId, profileId).all(),
    env.DB.prepare(`SELECT qs.subject_id, qa.question_id, qa.correct, qa.answered_at AS event_at, 'practice' AS source
      FROM quiz_answers qa JOIN quiz_sessions qs ON qs.id = qa.session_id
      WHERE qs.family_id = ? AND qs.profile_id = ?
      UNION ALL
      SELECT es.subject_id, eq.question_id,
        CASE WHEN ea.question_id IS NULL THEN 0 ELSE ea.correct END AS correct,
        es.completed_at AS event_at, 'exam' AS source
      FROM exam_sessions es
      JOIN exam_session_questions eq ON eq.session_id = es.id
      LEFT JOIN exam_answers ea ON ea.session_id = eq.session_id AND ea.question_id = eq.question_id
      WHERE es.family_id = ? AND es.profile_id = ?
        AND es.completed_at IS NOT NULL AND es.completed_at >= ?
        AND eq.question_type <> 'open-response'`).bind(familyId, profileId, familyId, profileId, EXAM_REVIEW_POLICY_START_AT).all(),
  ]);
  return {
    practiceSessions: practiceResult.results || [],
    assessments: assessmentResult.results || [],
    answerEvents: answerEventResult.results || [],
    recoveryEvents: recoveryEventResult.results || [],
  };
}

async function ledgerReady(env) {
  try {
    const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'achievements'").first();
    return Boolean(row?.name);
  } catch {
    return false;
  }
}

function displayCandidate(candidate, persisted = false) {
  return {
    id: candidate.scopeKey ? `${candidate.badgeId}:${candidate.scopeKey}` : candidate.badgeId,
    badgeId: candidate.badgeId,
    scopeKey: candidate.scopeKey,
    category: candidate.category,
    tier: candidate.tier,
    tierLabel: candidate.tierLabel,
    rarity: candidate.rarity,
    priority: candidate.priority,
    name: candidate.name,
    description: candidate.description,
    emoji: candidate.emoji,
    academicYear: candidate.academicYear,
    grade: candidate.grade,
    semester: candidate.semester,
    unlockedAt: candidate.unlockedAt,
    upgradedAt: candidate.upgradedAt,
    persisted,
    subjectKey: String(candidate.metadata?.subjectId || ''),
  };
}

function ledgerRow(row) {
  let metadata = {};
  try { metadata = JSON.parse(String(row.metadata_json || '{}')); } catch { metadata = {}; }
  return {
    id: String(row.scope_key || '') ? `${row.badge_id}:${row.scope_key}` : String(row.badge_id || ''),
    badgeId: String(row.badge_id || ''),
    scopeKey: String(row.scope_key || ''),
    category: String(row.category || ''),
    tier: safeCount(row.tier) || 1,
    tierLabel: String(row.tier_label || ''),
    rarity: String(row.rarity || 'common'),
    priority: Number(row.priority || 0),
    name: String(row.name || ''),
    description: String(row.description || ''),
    emoji: String(row.emoji || '🏅'),
    academicYear: String(row.academic_year || ''),
    grade: Number(row.grade || 0) || null,
    semester: Number(row.semester || 0) || null,
    unlockedAt: Number(row.unlocked_at || 0),
    upgradedAt: Number(row.upgraded_at || 0),
    persisted: true,
    subjectKey: String(metadata.subjectId || ''),
  };
}

async function syncLedger(env, familyId, profileId, candidates) {
  const statements = candidates.map((item) => env.DB.prepare(`INSERT INTO achievements
    (family_id, profile_id, badge_id, scope_key, category, tier, tier_label, rarity, priority, name, description, emoji,
      academic_year, grade, semester, metadata_json, unlocked_at, upgraded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id, badge_id, scope_key) DO UPDATE SET
      category = excluded.category,
      tier = MAX(achievements.tier, excluded.tier),
      tier_label = CASE WHEN excluded.tier >= achievements.tier THEN excluded.tier_label ELSE achievements.tier_label END,
      rarity = CASE WHEN excluded.tier >= achievements.tier THEN excluded.rarity ELSE achievements.rarity END,
      priority = MAX(achievements.priority, excluded.priority),
      name = CASE WHEN excluded.tier >= achievements.tier THEN excluded.name ELSE achievements.name END,
      description = CASE WHEN excluded.tier >= achievements.tier THEN excluded.description ELSE achievements.description END,
      emoji = CASE WHEN excluded.tier >= achievements.tier THEN excluded.emoji ELSE achievements.emoji END,
      academic_year = COALESCE(achievements.academic_year, excluded.academic_year),
      grade = COALESCE(achievements.grade, excluded.grade),
      semester = COALESCE(achievements.semester, excluded.semester),
      metadata_json = CASE WHEN excluded.tier >= achievements.tier THEN excluded.metadata_json ELSE achievements.metadata_json END,
      unlocked_at = MIN(achievements.unlocked_at, excluded.unlocked_at),
      upgraded_at = CASE WHEN excluded.tier > achievements.tier THEN excluded.upgraded_at ELSE achievements.upgraded_at END`)
    .bind(
      familyId, profileId, item.badgeId, item.scopeKey, item.category, item.tier, item.tierLabel,
      item.rarity, item.priority, item.name, item.description, item.emoji,
      item.academicYear || null, item.grade, item.semester, JSON.stringify(item.metadata || {}), item.unlockedAt, item.upgradedAt,
    ));
  if (statements.length) await env.DB.batch(statements);
  const rows = await env.DB.prepare(`SELECT * FROM achievements
    WHERE family_id = ? AND profile_id = ?
    ORDER BY priority DESC, tier DESC, upgraded_at DESC, unlocked_at DESC`).bind(familyId, profileId).all();
  return (rows.results || []).map(ledgerRow);
}

export async function achievementsForDashboard(env, familyId, profile, dashboard) {
  const history = await loadAchievementHistory(env, familyId, profile.id);
  const candidates = buildAchievementCandidates({ profile, dashboard, ...history });
  const ready = await ledgerReady(env);
  let badges = candidates.map((item) => displayCandidate(item, false));
  if (ready) {
    try {
      badges = await syncLedger(env, familyId, profile.id, candidates);
    } catch (error) {
      // Dashboard must remain available during rolling deploys or temporary D1 issues.
      console.error('ACHIEVEMENT_LEDGER_SYNC_FAILED', error);
    }
  }
  const categories = badges.reduce((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {});
  return {
    badges,
    stats: {
      total: badges.length,
      categories,
      ledgerReady: ready,
    },
  };
}
