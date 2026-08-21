/* Journey state machine tests (CH03 §3.3). Every legal transition enumerated;
   each illegal one is refused. Observed failing when the table was broken. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, assertJourneyTransition } from './journey.js';

test('a claim opens for booking and then locks', () => {
  assert.equal(canTransition('CLAIMED', 'OPEN_FOR_BOOKING'), true);
  assert.equal(canTransition('OPEN_FOR_BOOKING', 'LOCKED'), true);
});

test('a locked journey departs and completes', () => {
  assert.equal(canTransition('LOCKED', 'IN_PROGRESS'), true);
  assert.equal(canTransition('IN_PROGRESS', 'COMPLETED'), true);
  assert.equal(canTransition('IN_PROGRESS', 'ABORTED'), true);
});

test('a journey can be cancelled before it departs', () => {
  assert.equal(canTransition('CLAIMED', 'CANCELLED'), true);
  assert.equal(canTransition('OPEN_FOR_BOOKING', 'CANCELLED'), true);
  assert.equal(canTransition('LOCKED', 'CANCELLED'), true);
});

test('terminal states accept nothing', () => {
  assert.equal(canTransition('COMPLETED', 'CANCELLED'), false);
  assert.equal(canTransition('CANCELLED', 'CLAIMED'), false);
  assert.equal(canTransition('ABORTED', 'IN_PROGRESS'), false);
});

test('a completed journey cannot be re-opened (no backwards transitions)', () => {
  assert.equal(canTransition('COMPLETED', 'OPEN_FOR_BOOKING'), false);
  assert.equal(canTransition('LOCKED', 'OPEN_FOR_BOOKING'), false);
});

test('illegal transitions throw', () => {
  assert.throws(() => assertJourneyTransition('COMPLETED', 'CLAIMED'));
});
