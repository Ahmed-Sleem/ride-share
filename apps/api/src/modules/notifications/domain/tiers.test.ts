import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowsSend, sanitizePreview, tierOf, type CapConfig, type PriorSend } from './tiers.js';

const cfg: CapConfig = {
  behaviouralMaxDay: 2, behaviouralGapHours: 4, promoMaxDay: 1, promoMaxWeek: 5, nonTxMaxDay: 3,
};

test('transactional is never capped', () => {
  const now = new Date('2026-08-24T12:00:00Z');
  const prior: PriorSend[] = Array.from({ length: 20 }, (_, i) => ({
    tier: 'behavioural' as const, createdAt: new Date(now.getTime() - i * 60_000),
  }));
  assert.equal(allowsSend('transactional', now, prior, cfg), true);
  assert.equal(tierOf('N-R05'), 'transactional');
});

test('behavioural respects 2/day and 4h gap', () => {
  const now = new Date('2026-08-24T12:00:00Z');
  assert.equal(allowsSend('behavioural', now, [], cfg), true);
  const one: PriorSend[] = [{ tier: 'behavioural', createdAt: new Date(now.getTime() - 2 * 3600_000) }];
  assert.equal(allowsSend('behavioural', now, one, cfg), false);
  const old: PriorSend[] = [{ tier: 'behavioural', createdAt: new Date(now.getTime() - 5 * 3600_000) }];
  assert.equal(allowsSend('behavioural', now, old, cfg), true);
  const two: PriorSend[] = [
    { tier: 'behavioural', createdAt: new Date(now.getTime() - 5 * 3600_000) },
    { tier: 'behavioural', createdAt: new Date(now.getTime() - 10 * 3600_000) },
  ];
  assert.equal(allowsSend('behavioural', now, two, cfg), false);
});

test('preview strips email and phone (lock screen is public)', () => {
  assert.equal(sanitizePreview('Leave now for Gate 2'), 'Leave now for Gate 2');
  assert.equal(sanitizePreview('Call Ahmed +201001112233'), 'Update');
  assert.equal(sanitizePreview('hi nour@x.com'), 'Update');
});
