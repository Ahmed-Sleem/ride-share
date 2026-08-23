/* Paymob webhook verification tests (official algorithm, R20/G-076). The
   expected signatures are built INDEPENDENTLY here — the signed string for
   the card sample is written out as a literal, character by character from
   the official field list — so a defect in the implementation cannot also
   hide inside a mirrored test construction. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyPaymobWebhook, paymobSignedString } from './webhook.verifier.js';

const SECRET = 'test-webhook-secret';

function sign(s: string): string {
  return createHmac('sha512', SECRET).update(s).digest('hex');
}

/** A realistic card-transaction callback object (official field set). */
const CARD_OBJ = {
  id: 987654321,
  pending: false,
  amount_cents: 150000,
  currency: 'EGP',
  error_occured: false,
  owner: 42,
  order: { id: 123456789, merchant_order_id: 'b7e6…-order-uuid', amount_cents: 150000 },
  is_3d_secure: true,
  source_data: { type: 'CARD', sub_type: 'MASTERCARD', pan: '512345******2346' },
  is_auth: false,
  is_capture: true,
  is_refunded: false,
  is_standalone_payment: true,
  is_voided: false,
  success: true,
  has_parent_transaction: false,
  integration_id: 345678,
  created_at: '2026-08-24T10:05:00+00:00' /* Accept-style timestamp string */,
};

/* The literal concatenation of the 20 official field VALUES, in official
   order, exactly as Paymob builds it. Independent of the implementation. */
const CARD_SIGNED_LITERAL =
  '150000' +                // amount_cents
  '2026-08-24T10:05:00+00:00' + // created_at
  'EGP' +                   // currency
  'false' +                 // error_occured
  'false' +                 // has_parent_transaction
  '987654321' +             // id
  '345678' +                // integration_id
  'true' +                  // is_3d_secure
  'false' +                 // is_auth
  'true' +                  // is_capture
  'false' +                 // is_refunded
  'true' +                  // is_standalone_payment
  'false' +                 // is_voided
  '123456789' +             // order.id
  '42' +                    // owner
  'false' +                 // pending
  '512345******2346' +      // source_data.pan
  'MASTERCARD' +            // source_data.sub_type
  'CARD' +                  // source_data.type
  'true';                   // success

test('the implementation builds the official signed string (card sample)', () => {
  assert.equal(paymobSignedString(CARD_OBJ), CARD_SIGNED_LITERAL);
});

test('accepts a correctly-signed webhook (card sample)', () => {
  assert.equal(verifyPaymobWebhook({ obj: CARD_OBJ, hmac: sign(CARD_SIGNED_LITERAL) }, SECRET), true);
});

test('wallet sample: missing source_data.pan contributes an empty string', () => {
  const walletObj = {
    id: 11, pending: false, amount_cents: 5000, currency: 'EGP',
    error_occured: false, owner: 7, order: { id: 22, merchant_order_id: 'x' },
    is_3d_secure: false, source_data: { type: 'WALLET', sub_type: 'VODAFONE' },
    is_auth: false, is_capture: true, is_refunded: false, is_standalone_payment: true,
    is_voided: false, success: true, has_parent_transaction: false,
    integration_id: 99, created_at: '2026-08-24T11:00:00+00:00',
  };
  const expected =
    '5000' + '2026-08-24T11:00:00+00:00' + 'EGP' + 'false' + 'false' +
    '11' + '99' + 'false' + 'false' + 'true' + 'false' + 'true' + 'false' +
    '22' + '7' + 'false' + '' /* pan absent */ + 'VODAFONE' + 'WALLET' + 'true';
  assert.equal(paymobSignedString(walletObj), expected);
  assert.equal(verifyPaymobWebhook({ obj: walletObj, hmac: sign(expected) }, SECRET), true);
});

test('rejects a tampered amount (signature no longer matches)', () => {
  const hmac = sign(CARD_SIGNED_LITERAL);
  const tampered = { ...CARD_OBJ, amount_cents: 1 };
  assert.equal(verifyPaymobWebhook({ obj: tampered, hmac }, SECRET), false);
});

test('rejects a webhook signed with the wrong secret', () => {
  const wrong = createHmac('sha512', 'wrong-secret').update(CARD_SIGNED_LITERAL).digest('hex');
  assert.equal(verifyPaymobWebhook({ obj: CARD_OBJ, hmac: wrong }, SECRET), false);
});

test('rejects the OLD whole-JSON signature scheme (regression guard, G-076)', () => {
  // A signature computed over JSON.stringify(obj) — the wrong algorithm this
  // module used before G-076 — must NOT validate. Guards against regressions
  // and against copying the (incorrect) community examples.
  const wholeJsonHmac = createHmac('sha512', SECRET).update(JSON.stringify(CARD_OBJ)).digest('hex');
  assert.equal(verifyPaymobWebhook({ obj: CARD_OBJ, hmac: wholeJsonHmac }, SECRET), false);
});

test('rejects missing signature, missing object, or malformed hmac', () => {
  assert.equal(verifyPaymobWebhook({}, SECRET), false);
  assert.equal(verifyPaymobWebhook({ obj: { id: 1 } }, SECRET), false);
  assert.equal(verifyPaymobWebhook({ hmac: 'deadbeef' }, SECRET), false);
  assert.equal(verifyPaymobWebhook({ obj: CARD_OBJ, hmac: 'zz-not-hex' }, SECRET), false);
});
