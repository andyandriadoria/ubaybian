export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

export async function readJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) throw new HttpError(415, 'JSON_REQUIRED', 'Gunakan Content-Type application/json.');
  try { return await request.json(); } catch { throw new HttpError(400, 'INVALID_JSON', 'JSON tidak valid.'); }
}

export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.FRONTEND_ORIGIN || '').trim();
  if (!origin) return {};
  if (!allowed || origin !== allowed) throw new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origin tidak diizinkan.');
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key, X-Setup-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

export function withCors(response, headers) {
  const next = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) next.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: next });
}

export function bearerToken(request) {
  const header = request.headers.get('Authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || '';
}

export function routeMatch(pathname, pattern) {
  const actual = pathname.split('/').filter(Boolean);
  const expected = pattern.split('/').filter(Boolean);
  if (actual.length !== expected.length) return null;
  const params = {};
  for (let i = 0; i < expected.length; i += 1) {
    const key = expected[i];
    if (key.startsWith(':')) params[key.slice(1)] = decodeURIComponent(actual[i]);
    else if (key !== actual[i]) return null;
  }
  return params;
}
