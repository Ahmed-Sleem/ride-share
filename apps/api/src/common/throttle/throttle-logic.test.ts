/* Throttle state transition tests — the semantics the Postgres store depends
   on: sliding window, block at limit+1, block expiry reset, window expiry. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextThrottleState, type ThrottleState } from './throttle-logic.js';

const T0 = 1_000_000_000;
const TTL = 60_000;
const LIMIT = 3;
const BLOCK = 60_000;

function run(prev: ThrottleState | null, now = T0) {
  return nextThrottleState(prev, now, TTL, LIMIT, BLOCK, 'default');
}
const step = (prev: ThrottleState | null, now?: number) => run(prev, now).state;

test('first request opens a window with one hit', () => {
  const r = run(null);
  assert.equal(r.totalHits, 1);
  assert.equal(r.isBlocked, false);
  assert.deepEqual(r.state.hits.default, [T0]);
  assert.equal(r.timeToExpire, 60);
});

test('hits accumulate up to the limit', () => {
  let s: ThrottleState | null = null;
  for (let i = 0; i < LIMIT; i++) s = step(s, T0 + i);
  assert.equal(s!.hits.default!.length, LIMIT);
});

test('the hit after the limit blocks the key', () => {
  let s: ThrottleState | null = null;
  for (let i = 0; i < LIMIT; i++) s = step(s, T0 + i);
  const r = run(s, T0 + LIMIT);
  assert.equal(r.isBlocked, true);
  assert.equal(r.state.blockedUntil, T0 + LIMIT + BLOCK);
  assert.equal(r.timeToBlockExpire, 60);
});

test('requests while blocked are refused and not counted', () => {
  let s: ThrottleState | null = null;
  for (let i = 0; i <= LIMIT; i++) s = step(s, T0 + i); // last one blocks
  const before = s!.hits.default!.length;
  const r = run(s, T0 + LIMIT + 1000); // inside the block
  assert.equal(r.isBlocked, true);
  assert.equal(r.state.hits.default!.length, before); // not counted
});

test('after the block lapses the key resets and counts the new request', () => {
  let s: ThrottleState | null = null;
  for (let i = 0; i <= LIMIT; i++) s = step(s, T0 + i); // block at T0+LIMIT
  const r = run(s, T0 + LIMIT + BLOCK + 1); // block expired
  assert.equal(r.isBlocked, false);
  assert.equal(r.totalHits, 1);
  assert.equal(r.state.blockedUntil, 0);
});

test('old hits fall out of the sliding window', () => {
  let s: ThrottleState | null = step(null, T0); // hit at T0
  const r = run(s, T0 + TTL + 1); // window has fully passed
  assert.equal(r.totalHits, 1); // only the new hit counts
  assert.equal(r.state.hits.default!.length, 1);
});

test('hits inside the window are kept', () => {
  let s: ThrottleState | null = step(null, T0);
  s = step(s, T0 + 10_000);
  const r = run(s, T0 + 20_000); // both still within 60s of their own timestamps
  assert.equal(r.totalHits, 3);
});
