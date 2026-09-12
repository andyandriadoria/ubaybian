import { HttpError } from './http.js';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  randomToken,
  sha256Base64Url,
  verifyPassword,
} from './security.js';

const encoder = new TextEncoder();
const PIN_ITERATIONS = 100000;
const UNLOCK_TTL_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

function requireDb(env) {
  if (!env.DB || typeof env.DB.prepare !== 'function') {
    throw new HttpError(503, 'DB_BINDING_MISSING', 'Binding database DB belum tersedia pada deployment Worker aktif.');
  }
  return env.DB;
}

function normalizePin(value) {
  const pin = String(value ?? '').trim();
  if (!/^\d{4,6}$/.test(pin)) {
    throw new HttpError(422, 'PARENT_PIN_INVALID', 'Parent PIN harus terdiri dari 4–6 angka.');
  }
  return pin;
}

async function derivePin(pin, salt, iterations = PIN_ITERATIONS) {
  const safeIterations = Math.min(100000, Math.max(10000, Number(iterations) || PIN_ITERATIONS));
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(pin)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: base64UrlToBytes(salt),
      iterations: safeIterations,
    },
    material,
    256,
  );
  return {
    salt,
    iterations: safeIterations,
    hash: bytesToBase64Url(new Uint8Array(bits)),
  };
}

async function hashPin(pin) {
  const salt = randomToken(16);
  return derivePin(normalizePin(pin), salt, PIN_ITERATIONS);
}

async function verifyPin(pin, row) {
  let candidate;
  try {
    candidate = await derivePin(normalizePin(pin), row.pin_salt, Number(row.pin_iterations));
  } catch (error) {
    if (error instanceof HttpError) return false;
    throw error;
  }
  const a = base64UrlToBytes(candidate.hash);
  const b = base64UrlToBytes(row.pin_hash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function ensureParentAccessSchema(env) {
  const db = requireDb(env);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS parent_security (
      family_id INTEGER PRIMARY KEY REFERENCES family_accounts(id) ON DELETE CASCADE,
      pin_salt TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      pin_iterations INTEGER NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS parent_unlocks (
      token_hash TEXT PRIMARY KEY,
      family_id INTEGER NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_parent_unlocks_family
      ON parent_unlocks(family_id, expires_at)`),
  ]);
}

async function clearExpiredUnlocks(env, now = Date.now()) {
  const db = requireDb(env);
  await db.prepare('DELETE FROM parent_unlocks WHERE expires_at <= ?').bind(now).run();
}

export async function parentAccessStatus(env, familyId) {
  await ensureParentAccessSchema(env);
  await clearExpiredUnlocks(env);
  const row = await requireDb(env)
    .prepare('SELECT family_id FROM parent_security WHERE family_id = ?')
    .bind(familyId)
    .first();
  return {
    pinConfigured: Boolean(row),
    unlockTtlSeconds: Math.floor(UNLOCK_TTL_MS / 1000),
  };
}

export async function setParentPin(env, familyId, familyPassword, pin) {
  await ensureParentAccessSchema(env);
  const db = requireDb(env);
  const account = await db.prepare('SELECT * FROM family_accounts WHERE id = ?').bind(familyId).first();
  if (!account) throw new HttpError(404, 'FAMILY_NOT_FOUND', 'Akun keluarga tidak ditemukan.');

  let passwordOk = false;
  try {
    passwordOk = await verifyPassword(String(familyPassword ?? ''), account);
  } catch {
    passwordOk = false;
  }
  if (!passwordOk) {
    throw new HttpError(403, 'PARENT_PASSWORD_INVALID', 'Password keluarga tidak cocok.');
  }

  const pinData = await hashPin(pin);
  const now = Date.now();
  await db.prepare(`INSERT INTO parent_security
      (family_id, pin_salt, pin_hash, pin_iterations, failed_attempts, locked_until, updated_at)
      VALUES (?, ?, ?, ?, 0, 0, ?)
      ON CONFLICT(family_id) DO UPDATE SET
        pin_salt = excluded.pin_salt,
        pin_hash = excluded.pin_hash,
        pin_iterations = excluded.pin_iterations,
        failed_attempts = 0,
        locked_until = 0,
        updated_at = excluded.updated_at`)
    .bind(familyId, pinData.salt, pinData.hash, pinData.iterations, now)
    .run();

  // Changing the PIN invalidates every previously unlocked parent session.
  await db.prepare('DELETE FROM parent_unlocks WHERE family_id = ?').bind(familyId).run();
  return { ok: true, pinConfigured: true };
}

export async function unlockParentAccess(env, familyId, pin) {
  await ensureParentAccessSchema(env);
  const db = requireDb(env);
  const now = Date.now();
  await clearExpiredUnlocks(env, now);

  const row = await db.prepare('SELECT * FROM parent_security WHERE family_id = ?').bind(familyId).first();
  if (!row) {
    throw new HttpError(409, 'PARENT_PIN_NOT_SET', 'Parent PIN belum dibuat.');
  }
  if (Number(row.locked_until || 0) > now) {
    const seconds = Math.ceil((Number(row.locked_until) - now) / 1000);
    throw new HttpError(429, 'PARENT_PIN_LOCKED', `Terlalu banyak percobaan. Coba lagi dalam ${seconds} detik.`);
  }

  const ok = await verifyPin(pin, row);
  if (!ok) {
    const attempts = Number(row.failed_attempts || 0) + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : 0;
    const storedAttempts = attempts >= MAX_FAILED_ATTEMPTS ? 0 : attempts;
    await db.prepare('UPDATE parent_security SET failed_attempts = ?, locked_until = ? WHERE family_id = ?')
      .bind(storedAttempts, lockedUntil, familyId)
      .run();
    if (lockedUntil) {
      throw new HttpError(429, 'PARENT_PIN_LOCKED', 'Terlalu banyak percobaan PIN. Parent Access dikunci selama 5 menit.');
    }
    throw new HttpError(403, 'PARENT_PIN_WRONG', `PIN belum tepat. Sisa percobaan: ${MAX_FAILED_ATTEMPTS - attempts}.`);
  }

  await db.prepare('UPDATE parent_security SET failed_attempts = 0, locked_until = 0 WHERE family_id = ?')
    .bind(familyId)
    .run();

  const token = randomToken(32);
  const tokenHash = await sha256Base64Url(token);
  const expiresAt = now + UNLOCK_TTL_MS;
  await db.prepare('INSERT INTO parent_unlocks (token_hash, family_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, familyId, now, expiresAt)
    .run();

  return { parentToken: token, expiresAt, ttlSeconds: Math.floor(UNLOCK_TTL_MS / 1000) };
}

export async function requireParentAccess(request, env, familyId) {
  await ensureParentAccessSchema(env);
  const token = String(request.headers.get('X-Parent-Token') || '').trim();
  if (!token) {
    throw new HttpError(403, 'PARENT_ACCESS_REQUIRED', 'Buka Parent Access dengan PIN terlebih dahulu.');
  }

  const now = Date.now();
  const tokenHash = await sha256Base64Url(token);
  const row = await requireDb(env)
    .prepare('SELECT expires_at FROM parent_unlocks WHERE token_hash = ? AND family_id = ?')
    .bind(tokenHash, familyId)
    .first();

  if (!row || Number(row.expires_at || 0) <= now) {
    if (row) await requireDb(env).prepare('DELETE FROM parent_unlocks WHERE token_hash = ?').bind(tokenHash).run();
    throw new HttpError(403, 'PARENT_ACCESS_EXPIRED', 'Parent Access sudah terkunci lagi. Masukkan PIN kembali.');
  }
  return { expiresAt: Number(row.expires_at) };
}
