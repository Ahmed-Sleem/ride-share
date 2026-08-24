import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newBookingCode } from './booking.js';
import { isBoardingOpen, scanOutcome } from './boarding.js';

test('boarding window is T−before … T+after inclusive', () => {
  const t0 = new Date('2026-08-24T08:00:00Z');
  assert.equal(isBoardingOpen(t0, new Date('2026-08-24T07:44:59Z'), 15, 30), false);
  assert.equal(isBoardingOpen(t0, new Date('2026-08-24T07:45:00Z'), 15, 30), true);
  assert.equal(isBoardingOpen(t0, new Date('2026-08-24T08:00:00Z'), 15, 30), true);
  assert.equal(isBoardingOpen(t0, new Date('2026-08-24T08:30:00Z'), 15, 30), true);
  assert.equal(isBoardingOpen(t0, new Date('2026-08-24T08:30:01Z'), 15, 30), false);
});

test('scan is single-use: ON_BOARD is already_boarded', () => {
  assert.equal(scanOutcome('RESERVED'), 'ok');
  assert.equal(scanOutcome('CONFIRMED'), 'ok');
  assert.equal(scanOutcome('ON_BOARD'), 'already_boarded');
  assert.equal(scanOutcome('CANCELLED'), 'cannot_board');
  assert.equal(scanOutcome('COMPLETED'), 'cannot_board');
});

test('1,000 boarding codes are 6 digits and not a sequence', () => {
  const codes = Array.from({ length: 1000 }, () => newBookingCode());
  assert.ok(codes.every((c) => /^[0-9]{6}$/.test(c)));
  const unique = new Set(codes);
  assert.ok(unique.size > 900, `expected high uniqueness, got ${unique.size}`);
  let sequential = 0;
  for (let i = 1; i < codes.length; i++) {
    if (Number(codes[i]) === Number(codes[i - 1]) + 1) sequential++;
  }
  assert.ok(sequential < 5, `codes looked sequential (${sequential} steps)`);
});
