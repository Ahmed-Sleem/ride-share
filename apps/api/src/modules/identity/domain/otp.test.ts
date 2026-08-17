import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOtp, generateOtp, hashOtp, OTP_MAX_ATTEMPTS, type OtpRecord } from './otp.js';

function record(over: Partial<OtpRecord> = {}): OtpRecord {
  return {
    id: 'o1',
    phone: '+201000000000',
    codeHash: hashOtp('123456'),
    attempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
    ...over,
  };
}

test('generates 6-digit codes', () => {
  assert.match(generateOtp(), /^[0-9]{6}$/);
});

test('correct code verifies', () => {
  assert.deepEqual(evaluateOtp(record(), '123456', new Date()), { ok: true });
});

test('wrong code is a mismatch', () => {
  assert.deepEqual(evaluateOtp(record(), '000000', new Date()), { ok: false, reason: 'mismatch' });
});

test('expired code is rejected', () => {
  const r = record({ expiresAt: new Date(Date.now() - 1000) });
  assert.deepEqual(evaluateOtp(r, '123456', new Date()), { ok: false, reason: 'expired' });
});

test('too many attempts is rejected', () => {
  const r = record({ attempts: OTP_MAX_ATTEMPTS });
  assert.deepEqual(evaluateOtp(r, '123456', new Date()), { ok: false, reason: 'too_many_attempts' });
});
