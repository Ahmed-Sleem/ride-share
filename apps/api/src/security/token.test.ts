import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signAccessToken, verifyAccessToken } from './token.js';

const SECRET = 'a'.repeat(32);

test('access token round-trips with sub and role', async () => {
  const t = await signAccessToken(SECRET, 'user-1', 'super_admin');
  const claims = await verifyAccessToken(SECRET, t);
  assert.equal(claims.sub, 'user-1');
  assert.equal(claims.role, 'super_admin');
});

test('a token signed with a different secret is rejected', async () => {
  const t = await signAccessToken('b'.repeat(32), 'user-1', 'rider');
  await assert.rejects(() => verifyAccessToken(SECRET, t));
});

test('a tampered token is rejected', async () => {
  const t = await signAccessToken(SECRET, 'user-1', 'rider');
  await assert.rejects(() => verifyAccessToken(SECRET, t.slice(0, -4) + 'xxxx'));
});
