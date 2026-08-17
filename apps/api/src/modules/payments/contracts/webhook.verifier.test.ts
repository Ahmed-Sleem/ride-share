/* Paymob webhook verification tests. The HMAC logic is real in sandbox and
   live; these prove it against independently-computed digests. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyPaymobWebhook } from './webhook.verifier.js';

const SECRET = 'test-webhook-secret';

function sign(obj: unknown): string {
  return createHmac('sha512', SECRET).update(JSON.stringify(obj)).digest('hex');
}

test('accepts a correctly-signed webhook', () => {
  const obj = { id: 12345, order: { id: 'ORD-1' }, amount_cents: 1500, success: true };
  assert.equal(verifyPaymobWebhook({ obj, hmac: sign(obj) }, SECRET), true);
});

test('rejects a webhook signed with the wrong secret', () => {
  const obj = { id: 12345, amount_cents: 1500, success: true };
  assert.equal(verifyPaymobWebhook({ obj, hmac: sign(obj) }, 'wrong-secret'), false);
});

test('rejects a tampered payload', () => {
  const obj = { id: 12345, amount_cents: 1500, success: true };
  const hmac = sign(obj);
  assert.equal(verifyPaymobWebhook({ obj: { ...obj, amount_cents: 1 }, hmac }, SECRET), false);
});

test('rejects missing signature or object', () => {
  assert.equal(verifyPaymobWebhook({}, SECRET), false);
  assert.equal(verifyPaymobWebhook({ obj: { id: 1 } }, SECRET), false);
  assert.equal(verifyPaymobWebhook({ hmac: 'deadbeef' }, SECRET), false);
});
