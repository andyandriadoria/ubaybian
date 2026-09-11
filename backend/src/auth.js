import { HttpError, bearerToken } from './http.js';
import { hashPassword, randomToken, sessionExpiry, sha256Base64Url, verifyPassword } from './security.js';

function normalizeUsername(value) {
  const username = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new HttpError(422, 'INVALID_USERNAME', 'Username 3–40 karakter: huruf kecil, angka, titik, garis bawah, atau tanda minus.');
  return username;
}

export async function setupFamily(env, body, setupToken) {
  if (!env.SETUP_TOKEN || setupToken !== env.SETUP_TOKEN) throw new HttpError(403, 'SETUP_FORBIDDEN', 'Setup token tidak valid.');
  const existing = await env.DB.prepare('SELECT COUNT(*) AS count FROM family_accounts').first();
  if (Number(existing?.count || 0) > 0) throw new HttpError(409, 'ALREADY_SETUP', 'Akun keluarga sudah dibuat.');

  const username = normalizeUsername(body?.username);
  const displayName = String(body?.displayName ?? 'Keluarga UbayBian').trim().slice(0, 80) || 'Keluarga UbayBian';
  const passwordData = await hashPassword(body?.password ?? '');

  const familyInsert = await env.DB.prepare(`
    INSERT INTO family_accounts (username, display_name, password_salt, password_hash, password_iterations, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(username, displayName, passwordData.salt, passwordData.hash, passwordData.iterations, Date.now()).run();
  const familyId = Number(familyInsert.meta.last_row_id);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO profiles (family_id, slug, display_name, grade, level) VALUES (?, ?, ?, ?, ?)').bind(familyId, 'ubay', 'Ubay', 7, 'Junior High'),
    env.DB.prepare('INSERT INTO profiles (family_id, slug, display_name, grade, level) VALUES (?, ?, ?, ?, ?)').bind(familyId, 'bian', 'Bian', 2, 'Primary'),
  ]);
  return { familyId, username, displayName };
}

export async function login(env, body) {
  const username = normalizeUsername(body?.username);
  const account = await env.DB.prepare('SELECT * FROM family_accounts WHERE username = ? COLLATE NOCASE').bind(username).first();
  if (!account || !(await verifyPassword(body?.password ?? '', account))) throw new HttpError(401, 'INVALID_LOGIN', 'Username atau password tidak cocok.');
  const token = randomToken(32);
  const tokenHash = await sha256Base64Url(token);
  const expiresAt = sessionExpiry(env.SESSION_TTL_DAYS);
  await env.DB.prepare('INSERT INTO sessions (token_hash, family_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, account.id, Date.now(), expiresAt).run();
  return { token, expiresAt, family: { id: account.id, username: account.username, displayName: account.display_name } };
}

export async function requireSession(request, env) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, 'LOGIN_REQUIRED', 'Silakan login terlebih dahulu.');
  const tokenHash = await sha256Base64Url(token);
  const session = await env.DB.prepare(`
    SELECT s.token_hash, s.family_id, s.expires_at, f.username, f.display_name
    FROM sessions s JOIN family_accounts f ON f.id = s.family_id
    WHERE s.token_hash = ?
  `).bind(tokenHash).first();
  if (!session || Number(session.expires_at) <= Date.now()) {
    if (session) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    throw new HttpError(401, 'SESSION_EXPIRED', 'Sesi login sudah berakhir.');
  }
  return { tokenHash, familyId: Number(session.family_id), family: { username: session.username, displayName: session.display_name } };
}

export async function logout(request, env) {
  const token = bearerToken(request);
  if (!token) return;
  const tokenHash = await sha256Base64Url(token);
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export async function familyProfiles(env, familyId) {
  const rows = await env.DB.prepare('SELECT slug, display_name, grade, level FROM profiles WHERE family_id = ? ORDER BY id').bind(familyId).all();
  return (rows.results || []).map((row) => ({ id: row.slug, name: row.display_name, grade: row.grade, level: row.level }));
}

export async function requireProfile(env, familyId, slug) {
  const profile = await env.DB.prepare('SELECT id, slug, display_name, grade, level FROM profiles WHERE family_id = ? AND slug = ?').bind(familyId, slug).first();
  if (!profile) throw new HttpError(403, 'PROFILE_FORBIDDEN', 'Profil tidak tersedia untuk keluarga ini.');
  return profile;
}
