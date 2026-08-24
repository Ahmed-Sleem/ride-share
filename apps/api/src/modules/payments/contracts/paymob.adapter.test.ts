/* Paymob adapter tests (P3.7): the honest-sandbox contract and the
   G-078 regression guard — a verified webhook maps OUR merchant_order_id
   into PaymentEvent.orderId, never Paymob's numeric order id. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaymobAdapter } from './paymob.adapter.js';

const FULL = { apiKey: 'k', hmacSecret: 's', integrationId: '123', iframeId: '45', mode: 'live' as const };

test('sandbox mode (no keys): checkout and refund are HONEST refusals', async () => {
  const a = new PaymobAdapter({});
  assert.equal(a.mode, 'sandbox');
  await assert.rejects(() => a.createCheckout({ orderId: 'o', amountMinor: 100, currency: 'EGP' }), (e: { response?: { message_key?: string } }) =>
    e.response?.message_key === 'payments.provider_not_configured');
  await assert.rejects(() => a.refund({ transactionId: '1', amountMinor: 100 }), (e: { response?: { message_key?: string } }) =>
    e.response?.message_key === 'payments.provider_not_configured');
});

test('live mode with keys but missing integration/iframe still refuses checkout', async () => {
  const a = new PaymobAdapter({ apiKey: 'k', hmacSecret: 's', mode: 'live' });
  assert.equal(a.mode, 'live');
  await assert.rejects(() => a.createCheckout({ orderId: 'o', amountMinor: 100, currency: 'EGP' }), (e: { response?: { message_key?: string } }) =>
    e.response?.message_key === 'payments.provider_not_configured');
});

test('G-078 regression: orderId is OUR merchant_order_id, not the provider numeric id', () => {
  const a = new PaymobAdapter(FULL);
  const event = a.normalizeWebhook({
    obj: {
      id: 999, amount_cents: 5000, success: true, pending: false,
      order: { id: 123456789, merchant_order_id: 'b7e6-order-uuid', amount_cents: 5000 },
    },
    hmac: 'x',
  });
  assert.equal(event.orderId, 'b7e6-order-uuid');
  assert.equal(event.providerOrderId, '123456789');
  assert.equal(event.amountMinor, 5000);
  assert.equal(event.status, 'succeeded');
});

test('normalizeWebhook: pending maps to pending; failure maps to failed', () => {
  const a = new PaymobAdapter(FULL);
  const pend = a.normalizeWebhook({ obj: { id: 1, pending: true, order: { merchant_order_id: 'm' } } });
  assert.equal(pend.status, 'pending');
  const fail = a.normalizeWebhook({ obj: { id: 2, pending: false, success: false, order: { merchant_order_id: 'm' } } });
  assert.equal(fail.status, 'failed');
});

test('verifyWebhook without a configured secret is always false', () => {
  const a = new PaymobAdapter({});
  assert.equal(a.verifyWebhook({ obj: { id: 1 }, hmac: 'ab'.repeat(64) }), false);
});
