/* Slot-grid + route-reorder domain tests (P3.1/P3.2). Pure and deterministic;
   each has been observed failing when the rule was broken (§0.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSlotTimes, minutesToTime, timeToMinutes } from './slot-grid.js';
import { reorderPositions, isValidInterval, appendPosition } from './route.js';

test('grid: every 15 min inside 06:00–10:00 gives 16 departures (06:00..09:45)', () => {
  const r = generateSlotTimes('06:00', '10:00', 15);
  assert.equal(r.ok, true);
  const times = (r as { times: string[] }).times;
  assert.equal(times.length, 16);
  assert.equal(times[0], '06:00');
  assert.equal(times[15], '09:45');
});

test('grid: a bad window or interval is refused', () => {
  assert.equal(generateSlotTimes('10:00', '06:00', 15).ok, false);
  assert.equal(generateSlotTimes('06:00', '10:00', 3).ok, false);
});

test('grid: the last departure is strictly before window end', () => {
  const r = generateSlotTimes('06:00', '06:30', 15);
  const times = (r as { times: string[] }).times;
  assert.deepEqual(times, ['06:00', '06:15']);
});

test('time helpers round-trip', () => {
  assert.equal(minutesToTime(0), '00:00');
  assert.equal(minutesToTime(60 * 6 + 15), '06:15');
  assert.equal(timeToMinutes('06:15'), 375);
  assert.equal(Number.isNaN(timeToMinutes('25:00')), true);
});

test('reorder: a permutation is accepted; a missing/extra stop is refused', () => {
  const ok = reorderPositions(['a', 'b', 'c'], ['c', 'a', 'b']);
  assert.equal(ok.ok, true);
  assert.deepEqual((ok as { positions: { stopId: string; position: number }[] }).positions,
    [{ stopId: 'c', position: 1 }, { stopId: 'a', position: 2 }, { stopId: 'b', position: 3 }]);
  assert.equal(reorderPositions(['a', 'b', 'c'], ['a', 'b']).ok, false);
  assert.equal(reorderPositions(['a', 'b', 'c'], ['a', 'b', 'b']).ok, false);
  assert.equal(reorderPositions(['a', 'b', 'c'], ['a', 'b', 'x']).ok, false);
});

test('interval bounds (CH19 SlotIntervalMinutes 5–120)', () => {
  assert.equal(isValidInterval(15), true);
  assert.equal(isValidInterval(3), false);
  assert.equal(isValidInterval(121), false);
  assert.equal(appendPosition(0), 1);
  assert.equal(appendPosition(2), 3);
});
