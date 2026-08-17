import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password.js';

test('hash and verify round-trip', () => {
  const h = hashPassword('correct horse battery staple');
  assert.equal(verifyPassword('correct horse battery staple', h), true);
});

test('wrong password is rejected', () => {
  const h = hashPassword('secret');
  assert.equal(verifyPassword('not-secret', h), false);
});

test('hashes are salted (two hashes differ)', () => {
  assert.notEqual(hashPassword('same'), hashPassword('same'));
});

test('malformed stored values are rejected, not thrown', () => {
  assert.equal(verifyPassword('x', ''), false);
  assert.equal(verifyPassword('x', 'not-a-hash'), false);
  assert.equal(verifyPassword('x', 'scrypt$abc$r$p$salt$hash'), false);
});
