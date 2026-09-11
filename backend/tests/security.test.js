import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, randomToken, sha256Base64Url, verifyPassword } from '../src/security.js';

test('password hashing verifies the right password', async () => {
  const record = await hashPassword('contoh-password-keluarga', 'YWJjZGVmZ2hpamtsbW5vcA', 1000);
  const row = { password_salt: record.salt, password_hash: record.hash, password_iterations: record.iterations };
  assert.equal(await verifyPassword('contoh-password-keluarga', row), true);
  assert.equal(await verifyPassword('password-yang-salah', row), false);
});

test('opaque session tokens are random and stored as hashes', async () => {
  const first = randomToken(); const second = randomToken();
  assert.notEqual(first, second);
  assert.notEqual(await sha256Base64Url(first), first);
});
