const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 150000;

export function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBytes(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(value)));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password, salt = randomToken(16), iterations = PASSWORD_ITERATIONS) {
  const input = String(password);
  if (input.length < 10) throw new Error('Password minimal 10 karakter.');
  if (input.length > 200) throw new Error('Password terlalu panjang.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(input), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: base64UrlToBytes(salt), iterations },
    material,
    256,
  );
  return { salt, iterations, hash: bytesToBase64Url(new Uint8Array(bits)) };
}

export async function verifyPassword(password, record) {
  const candidate = await hashPassword(password, record.password_salt, Number(record.password_iterations));
  const a = base64UrlToBytes(candidate.hash);
  const b = base64UrlToBytes(record.password_hash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function sessionExpiry(ttlDays = 30) {
  const days = Math.min(90, Math.max(1, Number(ttlDays) || 30));
  return Date.now() + days * 24 * 60 * 60 * 1000;
}
