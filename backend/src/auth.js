import { HttpError, bearerToken } from './http.js';
import { hashPassword, randomToken, sessionExpiry, sha256Base64Url, verifyPassword } from './security.js';

function normalizeUsername(value) {
  const username = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new HttpError(422, 'INVALID_USERNAME', 'Username 3–40 karakter: huruf kecil, angka, titik, garis bawah, atau tanda minus.');
  return username;
}

function validatePassword(value) {
  const password = String(value ?? '');
  if (password.length < 10) throw new HttpError(422, 'PASSWORD_TOO_SHORT', 'Password minimal 10 karakter.');
  if (password.length > 200) throw new HttpError(422, 'PASSWORD_TOO_LONG', 'Password terlalu panjang.');
  return password;
}

function requireDb(env) {
  if (!env.DB || typeof env.DB.prepare !== 'function') {
    throw new HttpError(503, 'DB_BINDING_MISSING', 'Binding database DB belum tersedia pada deployment Worker aktif.');
  }
  return env.DB;
}

function mapDbError(error, fallbackCode = 'DB_UNAVAILABLE') {
  const message = String(error?.message || '');
  if (/no such table/i.test(message)) return new HttpError(503, 'DB_SCHEMA_MISSING', 'Struktur database belum lengkap.');
  if (/unique constraint/i.test(message)) return new HttpError(409, 'ACCOUNT_EXISTS', 'Akun keluarga sudah ada.');
  console.error(fallbackCode, error);
  return new HttpError(503, fallbackCode, 'Database UbayBian belum dapat diakses oleh Worker.');
}

async function ensureDefaultProfiles(env, familyId) {
  const db = requireDb(env);
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO profiles (family_id, slug, display_name, grade, level)
                VALUES (?, 'ubay', 'Ubay', 7, 'Junior High')`).bind(familyId),
    db.prepare(`INSERT OR IGNORE INTO profiles (family_id, slug, display_name, grade, level)
                VALUES (?, 'bian', 'Bian', 2, 'Primary')`).bind(familyId),
  ]);
}

export async function setupFamily(env, body, setupToken) {
  if (!env.SETUP_TOKEN || setupToken !== env.SETUP_TOKEN) throw new HttpError(403, 'SETUP_FORBIDDEN', 'Setup token tidak valid.');

  const username = normalizeUsername(body?.username);
  const displayName = String(body?.displayName ?? 'Keluarga UbayBian').trim().slice(0, 80) || 'Keluarga UbayBian';
  const password = validatePassword(body?.password);
  let passwordData;
  try {
    passwordData = await hashPassword(password);
  } catch (error) {
    console.error('PASSWORD_HASH_FAILED', error);
    throw new HttpError(500, 'PASSWORD_HASH_FAILED', 'Password belum dapat diproses oleh Worker.');
  }
  const now = Date.now();
  const db = requireDb(env);

  let accounts;
  try {
    accounts = await db.prepare('SELECT id, username FROM family_accounts ORDER BY id').all();
  } catch (error) {
    throw mapDbError(error, 'SETUP_DB_READ_FAILED');
  }
  const existing = Array.isArray(accounts.results) ? accounts.results : [];

  if (existing.length > 1) throw new HttpError(409, 'ALREADY_SETUP', 'Akun keluarga sudah dibuat.');

  if (existing.length === 1) {
    const account = existing[0];
    if (String(account.username).toLowerCase() !== username) throw new HttpError(409, 'ALREADY_SETUP', 'Akun keluarga sudah dibuat.');

    let profileCount;
    try {
      profileCount = await db.prepare('SELECT COUNT(*) AS count FROM profiles WHERE family_id = ?').bind(account.id).first();
    } catch (error) {
      throw mapDbError(error, 'SETUP_PROFILE_READ_FAILED');
    }
    if (Number(profileCount?.count || 0) >= 2) throw new HttpError(409, 'ALREADY_SETUP', 'Akun keluarga sudah dibuat.');

    try {
      await db.prepare(`UPDATE family_accounts
                        SET display_name = ?, password_salt = ?, password_hash = ?, password_iterations = ?
                        WHERE id = ?`)
        .bind(displayName, passwordData.salt, passwordData.hash, passwordData.iterations, account.id).run();
      await ensureDefaultProfiles(env, Number(account.id));
      return { familyId: Number(account.id), username, displayName, repaired: true };
    } catch (error) {
      throw mapDbError(error, 'SETUP_REPAIR_FAILED');
    }
  }

  try {
    await db.prepare(`
      INSERT INTO family_accounts (username, display_name, password_salt, password_hash, password_iterations, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(username, displayName, passwordData.salt, passwordData.hash, passwordData.iterations, now).run();

    const account = await db.prepare('SELECT id FROM family_accounts WHERE username = ? COLLATE NOCASE').bind(username).first();
    const familyId = Number(account?.id || 0);
    if (!familyId) throw new Error('Family account ID tidak ditemukan setelah insert.');

    await ensureDefaultProfiles(env, familyId);
    return { familyId, username, displayName, repaired: false };
  } catch (error) {
    try {
      await db.prepare('DELETE FROM family_accounts WHERE username = ? COLLATE NOCASE').bind(username).run();
    } catch (cleanupError) {
      console.error('SETUP_CLEANUP_FAILED', cleanupError);
    }
    throw mapDbError(error, 'SETUP_DB_FAILED');
  }
}

export async function login(env, body) {
  const db = requireDb(env);
  const username = normalizeUsername(body?.username);
  const account = await db.prepare('SELECT * FROM family_accounts WHERE username = ? COLLATE NOCASE').bind(username).first();
  if (!account || !(await verifyPassword(body?.password ?? '', account))) throw new HttpError(401, 'INVALID_LOGIN', 'Username atau password tidak cocok.');
  const token = randomToken(32);
  const tokenHash = await sha256Base64Url(token);
  const expiresAt = sessionExpiry(env.SESSION_TTL_DAYS);
  await db.prepare('INSERT INTO sessions (token_hash, family_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, account.id, Date.now(), expiresAt).run();
  return { token, expiresAt, family: { id: account.id, username: account.username, displayName: account.display_name } };
}

export async function requireSession(request, env) {
  const db = requireDb(env);
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, 'LOGIN_REQUIRED', 'Silakan login terlebih dahulu.');
  const tokenHash = await sha256Base64Url(token);
  const session = await db.prepare(`
    SELECT s.token_hash, s.family_id, s.expires_at, f.username, f.display_name
    FROM sessions s JOIN family_accounts f ON f.id = s.family_id
    WHERE s.token_hash = ?
  `).bind(tokenHash).first();
  if (!session || Number(session.expires_at) <= Date.now()) {
    if (session) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    throw new HttpError(401, 'SESSION_EXPIRED', 'Sesi login sudah berakhir.');
  }
  return { tokenHash, familyId: Number(session.family_id), family: { username: session.username, displayName: session.display_name } };
}

export async function logout(request, env) {
  const db = requireDb(env);
  const token = bearerToken(request);
  if (!token) return;
  const tokenHash = await sha256Base64Url(token);
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export async function familyProfiles(env, familyId) {
  const db = requireDb(env);
  const rows = await db.prepare('SELECT slug, display_name, grade, level FROM profiles WHERE family_id = ? ORDER BY id').bind(familyId).all();
  return (rows.results || []).map((row) => ({ id: row.slug, name: row.display_name, grade: row.grade, level: row.level }));
}

export async function requireProfile(env, familyId, slug) {
  const db = requireDb(env);
  const profile = await db.prepare('SELECT id, slug, display_name, grade, level FROM profiles WHERE family_id = ? AND slug = ?').bind(familyId, slug).first();
  if (!profile) throw new HttpError(403, 'PROFILE_FORBIDDEN', 'Profil tidak tersedia untuk keluarga ini.');
  return profile;
}
