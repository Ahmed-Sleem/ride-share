/* Field-capture domain rules (P2.3) — accuracy gate + checklist. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accuracyGate, checklistComplete } from './field-capture.js';

test('an 8 m fix passes the gate; an 80 m fix is refused', () => {
  assert.deepEqual(accuracyGate(8, 20), { ok: true });
  assert.equal(accuracyGate(80, 20).ok, false);
});

test('a missing or non-finite accuracy is refused', () => {
  assert.equal(accuracyGate(NaN, 20).ok, false);
  assert.equal(accuracyGate(-1, 20).ok, false);
});

test('the checklist is complete only when every answer is true', () => {
  assert.equal(checklistComplete({ stand: true, lit: true, legal: true, reachable: true }), true);
  assert.equal(checklistComplete({ stand: true, lit: true, legal: true, reachable: false }), false);
  assert.equal(checklistComplete({ stand: false, lit: true, legal: true, reachable: true }), false);
});
