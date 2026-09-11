import { HttpError } from './http.js';

function gatewayUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new HttpError(503, 'GATEWAY_NOT_CONFIGURED', 'Gateway bank soal belum dikonfigurasi.');
  let url;
  try { url = new URL(raw); } catch { throw new HttpError(503, 'GATEWAY_URL_INVALID', 'URL gateway bank soal tidak valid.'); }
  if (url.protocol !== 'https:') throw new HttpError(503, 'GATEWAY_URL_INVALID', 'Gateway bank soal harus menggunakan HTTPS.');
  return url.toString();
}

export async function readSheetValues(env, profileSlug, sheetName) {
  if (!env.APPS_SCRIPT_SECRET) throw new HttpError(503, 'GATEWAY_NOT_CONFIGURED', 'Secret gateway bank soal belum dikonfigurasi.');

  const response = await fetch(gatewayUrl(env.APPS_SCRIPT_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      action: 'readSheet',
      secret: env.APPS_SCRIPT_SECRET,
      profileSlug,
      sheetName,
    }),
    redirect: 'follow',
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    const code = typeof data?.code === 'string' ? data.code : 'GATEWAY_READ_FAILED';
    throw new HttpError(503, code, 'Bank soal sementara tidak dapat dibaca.');
  }
  return Array.isArray(data.values) ? data.values : [];
}
