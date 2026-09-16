import { HttpError } from './http.js';
import { examRewardTotals } from './exam-rewards.js';
import { randomToken } from './security.js';

const GAME_DAILY_XP_CAP = 50;
const GAME_RULES = Object.freeze({
  'speed-math': Object.freeze({ maxScore: 60, xpFromScore: (score) => score }),
  'memory-grid': Object.freeze({ maxScore: 5, xpFromScore: (score) => score }),
});

export function gameRewardForScore(gameId, scoreValue) {
  const rule = GAME_RULES[gameId];
  if (!rule) return null;
  const score = Math.max(0, Math.min(rule.maxScore, Math.floor(Number(scoreValue) || 0)));
  const rawXp = Math.max(0, Math.floor(Number(rule.xpFromScore(score)) || 0));
  return { score, rawXp };
}

export const REWARDS = Object.freeze([
  { id: 'snack', name: 'Snack Spesial & Uang Rp 5.000', cost: 5000, desc: 'Boleh pilih 1 snack favorit di toko dan mendapat uang Rp 5.000.' },
  { id: 'book', name: 'Buku Baru & Uang Rp 10.000', cost: 10000, desc: '1 buku baru yang dipilih bersama dan mendapat uang Rp 10.000.' },
  { id: 'toy', name: 'Mainan Baru & Uang Rp 50.000', cost: 50000, desc: '1 mainan baru yang dipilih bersama dan mendapat uang Rp 50.000.' },
]);

export async function ensureEngagementSchema(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      score INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_game_sessions_profile ON game_sessions(family_id, profile_id, game_id, completed_at)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS reward_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      reward_id TEXT NOT NULL,
      reward_name TEXT NOT NULL,
      cost INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      requested_at INTEGER NOT NULL,
      resolved_at INTEGER
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_reward_requests_profile ON reward_requests(family_id, profile_id, status, requested_at)`),
  ]);
}

function jakartaDayBounds(now = Date.now()) {
  const shifted = new Date(now + (7 * 60 * 60 * 1000));
  const localMidnightAsUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  const start = localMidnightAsUtc - (7 * 60 * 60 * 1000);
  return { start, end: start + 86400000 };
}

async function gameXpToday(env, familyId, profileId, now = Date.now()) {
  const { start, end } = jakartaDayBounds(now);
  const row = await env.DB.prepare(`SELECT COALESCE(SUM(xp_earned),0) AS xp
    FROM game_sessions WHERE family_id = ? AND profile_id = ? AND completed_at >= ? AND completed_at < ?`)
    .bind(familyId, profileId, start, end).first();
  return Number(row?.xp || 0);
}

async function quizCoinsEarned(env, familyId, profileId) {
  const correctRow = await env.DB.prepare(`SELECT COUNT(*) AS count
    FROM quiz_answers qa JOIN quiz_sessions qs ON qs.id = qa.session_id
    WHERE qs.family_id = ? AND qs.profile_id = ? AND qa.correct = 1`)
    .bind(familyId, profileId).first();
  const perfectRow = await env.DB.prepare(`SELECT COUNT(*) AS count
    FROM quiz_sessions WHERE family_id = ? AND profile_id = ? AND completed_at IS NOT NULL
      AND total_questions > 0 AND correct_count = total_questions`)
    .bind(familyId, profileId).first();
  return (Number(correctRow?.count || 0) * 50) + (Number(perfectRow?.count || 0) * 100);
}

async function rewardTotals(env, familyId, profileId) {
  const result = await env.DB.prepare(`SELECT status, COALESCE(SUM(cost),0) AS total
    FROM reward_requests WHERE family_id = ? AND profile_id = ? GROUP BY status`)
    .bind(familyId, profileId).all();
  const totals = { approved: 0, pending: 0, rejected: 0 };
  for (const row of result.results || []) totals[row.status] = Number(row.total || 0);
  return totals;
}

export async function engagementTotals(env, familyId, profileId) {
  await ensureEngagementSchema(env);
  const [gameRow, reward] = await Promise.all([
    env.DB.prepare(`SELECT COALESCE(SUM(xp_earned),0) AS xp FROM game_sessions
      WHERE family_id = ? AND profile_id = ? AND completed_at IS NOT NULL`).bind(familyId, profileId).first(),
    rewardTotals(env, familyId, profileId),
  ]);
  return {
    gameXp: Number(gameRow?.xp || 0),
    rewardSpent: reward.approved,
    rewardReserved: reward.pending,
  };
}

export async function gameStatus(env, familyId, profile) {
  await ensureEngagementSchema(env);
  const [rows, dailyXp] = await Promise.all([
    env.DB.prepare(`SELECT game_id, MAX(score) AS best, COUNT(*) AS plays, COALESCE(SUM(score),0) AS totalScore
      FROM game_sessions WHERE family_id = ? AND profile_id = ? AND completed_at IS NOT NULL GROUP BY game_id`)
      .bind(familyId, profile.id).all(),
    gameXpToday(env, familyId, profile.id),
  ]);
  const games = {
    'speed-math': { best: 0, plays: 0, totalScore: 0 },
    'memory-grid': { best: 0, plays: 0, totalScore: 0 },
  };
  for (const row of rows.results || []) {
    if (!(row.game_id in GAME_RULES)) continue;
    games[row.game_id] = {
      best: Number(row.best || 0),
      plays: Number(row.plays || 0),
      totalScore: Number(row.totalScore || 0),
    };
  }
  return { games, dailyXp, dailyXpCap: GAME_DAILY_XP_CAP, remainingDailyXp: Math.max(0, GAME_DAILY_XP_CAP - dailyXp) };
}

export async function startGame(env, familyId, profile, gameId) {
  await ensureEngagementSchema(env);
  if (!(gameId in GAME_RULES)) throw new HttpError(422, 'GAME_INVALID', 'Game tidak tersedia.');
  const id = randomToken(24);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO game_sessions (id, family_id, profile_id, game_id, started_at)
    VALUES (?, ?, ?, ?, ?)`).bind(id, familyId, profile.id, gameId, now).run();
  const dailyXp = await gameXpToday(env, familyId, profile.id, now);
  return { sessionId: id, gameId, startedAt: now, remainingDailyXp: Math.max(0, GAME_DAILY_XP_CAP - dailyXp) };
}

export async function finishGame(env, familyId, profile, sessionId, scoreValue) {
  await ensureEngagementSchema(env);
  const row = await env.DB.prepare(`SELECT * FROM game_sessions WHERE id = ? AND family_id = ? AND profile_id = ?`)
    .bind(sessionId, familyId, profile.id).first();
  if (!row) throw new HttpError(404, 'GAME_SESSION_NOT_FOUND', 'Sesi game tidak ditemukan.');
  if (row.completed_at) return { gameId: row.game_id, score: Number(row.score), xpEarned: Number(row.xp_earned), alreadySaved: true };
  const reward = gameRewardForScore(row.game_id, scoreValue);
  if (!reward) throw new HttpError(422, 'GAME_INVALID', 'Game tidak tersedia.');
  const { score, rawXp } = reward;
  const now = Date.now();
  const dailyXp = await gameXpToday(env, familyId, profile.id, now);
  const xpEarned = Math.min(rawXp, Math.max(0, GAME_DAILY_XP_CAP - dailyXp));
  await env.DB.prepare(`UPDATE game_sessions SET completed_at = ?, score = ?, xp_earned = ? WHERE id = ? AND completed_at IS NULL`)
    .bind(now, score, xpEarned, sessionId).run();
  const status = await gameStatus(env, familyId, profile);
  return { gameId: row.game_id, score, xpEarned, ...status };
}

export async function rewardShop(env, familyId, profile) {
  await ensureEngagementSchema(env);
  const [quizEarned, examRewards, totals, history] = await Promise.all([
    quizCoinsEarned(env, familyId, profile.id),
    examRewardTotals(env, familyId, profile.id),
    rewardTotals(env, familyId, profile.id),
    env.DB.prepare(`SELECT id, reward_id AS rewardId, reward_name AS rewardName, cost, status,
      requested_at AS requestedAt, resolved_at AS resolvedAt
      FROM reward_requests WHERE family_id = ? AND profile_id = ? ORDER BY requested_at DESC LIMIT 20`)
      .bind(familyId, profile.id).all(),
  ]);
  const earned = quizEarned + examRewards.coins;
  const balance = Math.max(0, earned - totals.approved);
  const available = Math.max(0, balance - totals.pending);
  return {
    earnedCoins: earned,
    quizCoins: quizEarned,
    examCoins: examRewards.coins,
    balance,
    reserved: totals.pending,
    available,
    rewards: REWARDS.map((reward) => ({ ...reward, canRequest: available >= reward.cost })),
    requests: (history.results || []).map((row) => ({ ...row, cost: Number(row.cost), requestedAt: Number(row.requestedAt), resolvedAt: row.resolvedAt ? Number(row.resolvedAt) : null })),
  };
}

export async function requestReward(env, familyId, profile, rewardId) {
  await ensureEngagementSchema(env);
  const reward = REWARDS.find((item) => item.id === rewardId);
  if (!reward) throw new HttpError(422, 'REWARD_INVALID', 'Reward tidak tersedia.');
  const shop = await rewardShop(env, familyId, profile);
  if (shop.available < reward.cost) throw new HttpError(422, 'COINS_NOT_ENOUGH', 'Coins yang tersedia belum cukup untuk reward ini.');
  const now = Date.now();
  const result = await env.DB.prepare(`INSERT INTO reward_requests
    (family_id, profile_id, reward_id, reward_name, cost, status, requested_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)`)
    .bind(familyId, profile.id, reward.id, reward.name, reward.cost, now).run();
  return { ok: true, requestId: Number(result.meta?.last_row_id || 0), status: 'pending', reward, shop: await rewardShop(env, familyId, profile) };
}

export async function resolveReward(env, familyId, profile, requestId, decision) {
  await ensureEngagementSchema(env);
  if (!['approved', 'rejected'].includes(decision)) throw new HttpError(422, 'REWARD_DECISION_INVALID', 'Keputusan reward tidak valid.');
  const row = await env.DB.prepare(`SELECT * FROM reward_requests WHERE id = ? AND family_id = ? AND profile_id = ?`)
    .bind(Number(requestId), familyId, profile.id).first();
  if (!row) throw new HttpError(404, 'REWARD_REQUEST_NOT_FOUND', 'Permintaan reward tidak ditemukan.');
  if (row.status !== 'pending') throw new HttpError(409, 'REWARD_ALREADY_RESOLVED', 'Permintaan reward ini sudah diproses.');
  if (decision === 'approved') {
    const shop = await rewardShop(env, familyId, profile);
    const otherReserved = Math.max(0, shop.reserved - Number(row.cost));
    if ((shop.balance - otherReserved) < Number(row.cost)) throw new HttpError(409, 'COINS_CHANGED', 'Saldo coins berubah dan tidak lagi cukup untuk menyetujui reward ini.');
  }
  const now = Date.now();
  await env.DB.prepare(`UPDATE reward_requests SET status = ?, resolved_at = ? WHERE id = ? AND status = 'pending'`)
    .bind(decision, now, Number(requestId)).run();
  return { ok: true, status: decision, shop: await rewardShop(env, familyId, profile) };
}
