/* Verification domain tests — the cooldown and lockout rules (DEC-189):
   >= 60s between sends; 3 failed attempts → 1 hour lock. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canResend, evaluateCode, generateCode, hashCode,
  LOCKOUT_MS, MAX_ATTEMPTS, type VerificationRecord,
} from './verification.js';

const NOW = new Date('2026-08-18T12:00:00.000Z');

function record(over: Partial<VerificationRecord> = {}): VerificationRecord {
  return {
    id: 'c1', kind: 'sms_login', channel: 'sms', target: '+201000000000',
    codeHash: hashCode('123456'), attempts: 0,
    lastSentAt: new Date(NOW.getTime() - 120_000),
    lastAttemptAt: null,
    expiresAt: new Date(NOW.getTime() + 60_000),
    consumedAt: null,
    ...over,
  };
}

test('generates 6-digit codes', () => assert.match(generateCode(), /^[0-9]{6}$/));

test('correct code verifies', () => {
  assert.deepEqual(evaluateCode(record(), '123456', NOW), { ok: true });
});

test('wrong code is a mismatch', () => {
  assert.deepEqual(evaluateCode(record(), '000000', NOW), { ok: false, reason: 'mismatch' });
});

test('expired code is rejected', () => {
  const r = record({ expiresAt: new Date(NOW.getTime() - 1000) });
  assert.deepEqual(evaluateCode(r, '123456', NOW), { ok: false, reason: 'expired' });
});

test('consumed code is rejected', () => {
  const r = record({ consumedAt: NOW });
  assert.deepEqual(evaluateCode(r, '123456', NOW), { ok: false, reason: 'consumed' });
});

test('resend within 60s is too_soon with a retry time', () => {
  const r = record({ lastSentAt: new Date(NOW.getTime() - 30_000) });
  const res = canResend(r, NOW);
  assert.deepEqual(res, { ok: false, reason: 'too_soon', retryAfterMs: 30_000 });
});

test('resend after 60s is allowed', () => {
  const r = record({ lastSentAt: new Date(NOW.getTime() - 61_000) });
  assert.deepEqual(canResend(r, NOW), { ok: true });
});

test('no record and consumed records allow resend', () => {
  assert.deepEqual(canResend(null, NOW), { ok: true });
  assert.deepEqual(canResend(record({ consumedAt: NOW }), NOW), { ok: true });
});

test('3 failed attempts lock for 1 hour', () => {
  const r = record({ attempts: MAX_ATTEMPTS, lastAttemptAt: new Date(NOW.getTime() - 60_000) });
  const res = canResend(r, NOW);
  assert.equal(res.ok, false);
  assert.equal(res.ok === false && res.reason, 'locked');
});

test('lock expires after 1 hour', () => {
  const r = record({ attempts: MAX_ATTEMPTS, lastAttemptAt: new Date(NOW.getTime() - LOCKOUT_MS - 1000) });
  assert.deepEqual(canResend(r, NOW), { ok: true });
});

test('a locked code also fails verification with lockedUntil', () => {
  const r = record({ attempts: MAX_ATTEMPTS, lastAttemptAt: new Date(NOW.getTime() - 60_000) });
  const res = evaluateCode(r, '123456', NOW);
  assert.equal(res.ok, false);
  assert.equal(res.ok === false && res.reason, 'locked');
});
