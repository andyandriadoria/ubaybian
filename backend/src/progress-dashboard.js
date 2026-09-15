import {
  assessmentReportEntry,
  dashboardForProfile as legacyDashboardForProfile,
  mergeLearningReport,
  progressForFamily,
} from './progress.js';
import { achievementsForDashboard } from './achievements.js';

export { assessmentReportEntry, mergeLearningReport, progressForFamily };

const achievementFingerprints = new Map();
const achievementRefreshInflight = new Map();

function safeCount(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
function profileCacheKey(familyId, profileId) { return `${String(familyId)}::${String(profileId)}`; }
function dashboardFingerprint(dashboard) {
  const stats = dashboard?.stats || {};
  const latest = dashboard?.report?.[0] || {};
  return JSON.stringify([
    safeCount(stats.totalSessions),
    safeCount(stats.totalAnswered),
    safeCount(stats.totalCorrect),
    safeCount(stats.perfectSessions),
    safeCount(stats.reviewTotal),
    safeCount(stats.streak?.longest),
    safeCount(stats.assessmentSessions),
    safeCount(stats.practiceSessions),
    safeCount(latest.completedAt),
    String(latest.sessionId || ''),
  ]);
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

function statsForBadges(badges, ledgerReady = true) {
  const categories = badges.reduce((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {});
  return { total: badges.length, categories, ledgerReady };
}

async function readAchievementLedger(env, familyId, profileId) {
  try {
    const rows = await env.DB.prepare(`SELECT * FROM achievements
      WHERE family_id = ? AND profile_id = ?
      ORDER BY priority DESC, tier DESC, upgraded_at DESC, unlocked_at DESC`)
      .bind(familyId, profileId)
      .all();
    const badges = (rows.results || []).map(ledgerRow);
    return { ready: true, badges, stats: statsForBadges(badges, true) };
  } catch (error) {
    // Rolling deploys before migration 0005 still fall back to the derived achievement path.
    console.error('ACHIEVEMENT_LEDGER_FAST_READ_FAILED', error);
    return { ready: false, badges: [], stats: statsForBadges([], false) };
  }
}

function scheduleAchievementRefresh(env, familyId, profile, dashboard, fingerprint, ctx) {
  const key = profileCacheKey(familyId, profile.id);
  if (achievementFingerprints.get(key) === fingerprint || achievementRefreshInflight.has(key)) return;

  const refresh = achievementsForDashboard(env, familyId, profile, dashboard)
    .then(() => achievementFingerprints.set(key, fingerprint))
    .catch((error) => console.error('ACHIEVEMENT_BACKGROUND_REFRESH_FAILED', error))
    .finally(() => achievementRefreshInflight.delete(key));
  achievementRefreshInflight.set(key, refresh);
  if (ctx?.waitUntil) ctx.waitUntil(refresh);
}

export async function dashboardForProfile(env, familyId, profile, ctx = null) {
  const dashboard = await legacyDashboardForProfile(env, familyId, profile);
  const fingerprint = dashboardFingerprint(dashboard);
  const ledger = await readAchievementLedger(env, familyId, profile.id);

  if (ledger.ready && ledger.badges.length) {
    scheduleAchievementRefresh(env, familyId, profile, dashboard, fingerprint, ctx);
    return {
      ...dashboard,
      badges: ledger.badges,
      achievementStats: ledger.stats,
    };
  }

  // Empty ledgers after a clean launch are cheap when there is no activity. Once activity exists,
  // compute synchronously once so a first achievement is never hidden from the child.
  if (safeCount(dashboard?.stats?.totalSessions) === 0 && safeCount(dashboard?.stats?.totalAnswered) === 0) {
    achievementFingerprints.set(profileCacheKey(familyId, profile.id), fingerprint);
    return {
      ...dashboard,
      badges: [],
      achievementStats: ledger.stats,
    };
  }

  const achievements = await achievementsForDashboard(env, familyId, profile, dashboard);
  achievementFingerprints.set(profileCacheKey(familyId, profile.id), fingerprint);
  return {
    ...dashboard,
    badges: achievements.badges,
    achievementStats: achievements.stats,
  };
}
