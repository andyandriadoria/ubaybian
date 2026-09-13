import { HttpError } from './http.js';

const GATEWAY_ATTEMPTS = 3;
const GATEWAY_TIMEOUT_MS = 10000;
const RETRY_DELAYS_MS = Object.freeze([250, 700]);
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
let cacheSchemaReady = false;

function gatewayUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new HttpError(503, 'GATEWAY_NOT_CONFIGURED', 'Gateway bank soal belum dikonfigurasi.');
  let url;
  try { url = new URL(raw); } catch { throw new HttpError(503, 'GATEWAY_URL_INVALID', 'URL gateway bank soal tidak valid.'); }
  if (url.protocol !== 'https:') throw new HttpError(503, 'GATEWAY_URL_INVALID', 'Gateway bank soal harus menggunakan HTTPS.');
  return url.toString();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryableGatewayFailure(status, code) {
  const normalized = String(code || '').toUpperCase();
  if (status === 429 || status >= 500) return true;
  return [
    'GATEWAY_READ_FAILED',
    'TEMPORARY_UNAVAILABLE',
    'SERVICE_UNAVAILABLE',
    'INTERNAL_ERROR',
    'TIMEOUT',
  ].includes(normalized);
}

async function ensureQuestionBankCacheSchema(env) {
  if (cacheSchemaReady || !env.DB?.prepare) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS question_bank_cache (
    profile_slug TEXT NOT NULL,
    sheet_name TEXT NOT NULL,
    values_json TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    PRIMARY KEY(profile_slug, sheet_name)
  )`).run();
  cacheSchemaReady = true;
}

async function cacheSuccessfulRead(env, profileSlug, sheetName, values) {
  try {
    await ensureQuestionBankCacheSchema(env);
    if (!env.DB?.prepare) return;
    await env.DB.prepare(`INSERT INTO question_bank_cache (profile_slug, sheet_name, values_json, fetched_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(profile_slug, sheet_name) DO UPDATE SET
        values_json = excluded.values_json,
        fetched_at = excluded.fetched_at`)
      .bind(profileSlug, sheetName, JSON.stringify(values), Date.now()).run();
  } catch (error) {
    // A cache write must never block learning. The live gateway response is still authoritative.
    console.error('QUESTION_BANK_CACHE_WRITE_FAILED', {
      profileSlug,
      sheetName,
      message: error?.message || String(error),
    });
  }
}

async function cachedSheetValues(env, profileSlug, sheetName) {
  try {
    await ensureQuestionBankCacheSchema(env);
    if (!env.DB?.prepare) return null;
    const row = await env.DB.prepare(`SELECT values_json, fetched_at
      FROM question_bank_cache WHERE profile_slug = ? AND sheet_name = ?`)
      .bind(profileSlug, sheetName).first();
    if (!row) return null;
    const fetchedAt = Number(row.fetched_at || 0);
    const ageMs = Date.now() - fetchedAt;
    if (!fetchedAt || ageMs < 0 || ageMs > CACHE_MAX_AGE_MS) return null;
    const values = JSON.parse(String(row.values_json || '[]'));
    if (!Array.isArray(values)) return null;
    return { values, fetchedAt, ageMs };
  } catch (error) {
    console.error('QUESTION_BANK_CACHE_READ_FAILED', {
      profileSlug,
      sheetName,
      message: error?.message || String(error),
    });
    return null;
  }
}

async function gatewayAttempt(url, env, profileSlug, sheetName) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        action: 'readSheet',
        secret: env.APPS_SCRIPT_SECRET,
        profileSlug,
        sheetName,
      }),
      redirect: 'follow',
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data?.ok) {
      return { ok: true, values: Array.isArray(data.values) ? data.values : [] };
    }

    const code = typeof data?.code === 'string' ? data.code : 'GATEWAY_READ_FAILED';
    const detail = typeof data?.detail === 'string' ? data.detail : '';
    return {
      ok: false,
      status: response.status,
      code,
      detail,
      retryable: retryableGatewayFailure(response.status, code),
    };
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      code: timedOut ? 'TIMEOUT' : 'GATEWAY_READ_FAILED',
      detail: error?.message || String(error),
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function readSheetValues(env, profileSlug, sheetName) {
  if (!env.APPS_SCRIPT_SECRET) throw new HttpError(503, 'GATEWAY_NOT_CONFIGURED', 'Secret gateway bank soal belum dikonfigurasi.');

  const url = gatewayUrl(env.APPS_SCRIPT_URL);
  let failure = null;

  for (let attempt = 1; attempt <= GATEWAY_ATTEMPTS; attempt += 1) {
    const result = await gatewayAttempt(url, env, profileSlug, sheetName);
    if (result.ok) {
      await cacheSuccessfulRead(env, profileSlug, sheetName, result.values);
      return result.values;
    }

    failure = result;
    console.error('SHEETS_GATEWAY_READ_ATTEMPT_FAILED', {
      profileSlug,
      sheetName,
      attempt,
      attempts: GATEWAY_ATTEMPTS,
      status: result.status,
      code: result.code,
      detail: result.detail,
    });

    if (!result.retryable || attempt === GATEWAY_ATTEMPTS) break;
    await wait(RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)] || 250);
  }

  // Network-first, last-known-good fallback. Google Sheets remains the source of truth;
  // the D1 copy is used only when the gateway is temporarily unavailable.
  if (failure?.retryable) {
    const cached = await cachedSheetValues(env, profileSlug, sheetName);
    if (cached) {
      console.warn('QUESTION_BANK_CACHE_FALLBACK', {
        profileSlug,
        sheetName,
        fetchedAt: cached.fetchedAt,
        ageMs: cached.ageMs,
        gatewayCode: failure.code,
      });
      return cached.values;
    }
  }

  const code = failure?.code || 'GATEWAY_READ_FAILED';
  throw new HttpError(503, code, 'Bank soal sedang terhubung ulang. Coba lagi beberapa detik.');
}
