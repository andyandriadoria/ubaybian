import { HttpError } from './http.js';

const encoder = new TextEncoder();
let tokenCache = null;

function toBase64Url(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToBytes(pem) {
  const clean = String(pem).replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(clean);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function serviceAccountToken(env) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY) throw new HttpError(503, 'GOOGLE_NOT_CONFIGURED', 'Akses bank soal belum dikonfigurasi.');
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToBytes(env.GOOGLE_PRIVATE_KEY), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput));
  const assertion = `${signingInput}.${toBase64Url(signature)}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) throw new HttpError(503, 'GOOGLE_AUTH_FAILED', 'Tidak dapat mengakses bank soal Google.');
  tokenCache = { value: data.access_token, expiresAt: Date.now() + Math.min(Number(data.expires_in || 3600), 3600) * 1000 };
  return tokenCache.value;
}

export async function readSheetValues(env, spreadsheetId, sheetName) {
  if (!spreadsheetId) throw new HttpError(503, 'SHEET_NOT_CONFIGURED', 'Bank soal profil belum dikonfigurasi.');
  const token = await serviceAccountToken(env);
  const range = encodeURIComponent(`'${String(sheetName).replace(/'/g, "''")}'!A1:S1000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new HttpError(503, 'SHEET_READ_FAILED', 'Bank soal sementara tidak dapat dibaca.');
  return Array.isArray(data?.values) ? data.values : [];
}
