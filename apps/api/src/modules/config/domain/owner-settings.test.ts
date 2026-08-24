import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOverrides, emptyOverrides, sanitizePatch } from './owner-settings.js';

test('null overrides leave env values alone', () => {
  const env = { COMMISSION_PERCENT: 0, PAYMOB_ENABLED: 'false' };
  applyOverrides(env, emptyOverrides());
  assert.equal(env.COMMISSION_PERCENT, 0);
  assert.equal(env.PAYMOB_ENABLED, 'false');
});

test('a page value overwrites env (DEC-208)', () => {
  const env = { COMMISSION_PERCENT: 0, PAYMOB_ENABLED: 'false', AUTH_OTP_BYPASS: 'false', NOTIFY_PROMO_MAX_DAY: 1 };
  applyOverrides(env, { ...emptyOverrides(), commission_percent: 15, paymob_enabled: true, auth_otp_bypass: true });
  assert.equal(env.COMMISSION_PERCENT, 15);
  assert.equal(env.PAYMOB_ENABLED, 'true');
  assert.equal(env.AUTH_OTP_BYPASS, 'true');
  assert.equal(env.NOTIFY_PROMO_MAX_DAY, 1);
});

test('sanitize rejects commission outside 0..90', () => {
  assert.throws(() => sanitizePatch({ commission_percent: 91 }));
  assert.throws(() => sanitizePatch({ commission_percent: 12.5 }));
});

test('sanitize accepts clearing a field back to env (null)', () => {
  const p = sanitizePatch({ commission_percent: null });
  assert.equal(p.commission_percent, null);
});
