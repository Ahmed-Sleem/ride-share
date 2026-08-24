import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exceedsMaxSlip, nextStopAfter, plannedArrival, slipMinutes } from './slip.js';
import { canTransition } from './journey.js';

test('slip is minutes behind timetable (positive = late)', () => {
  const planned = new Date('2026-08-24T08:10:00Z');
  assert.equal(slipMinutes(planned, new Date('2026-08-24T08:10:00Z')), 0);
  assert.equal(slipMinutes(planned, new Date('2026-08-24T08:20:00Z')), 10);
  assert.equal(slipMinutes(planned, new Date('2026-08-24T08:00:00Z')), -10);
});

test('over-slip is strictly greater than the cap (BUILD_PLAN sign)', () => {
  assert.equal(exceedsMaxSlip(10, 10), false);
  assert.equal(exceedsMaxSlip(11, 10), true);
  assert.equal(exceedsMaxSlip(9, 10), false);
});

test('next stop is the first stop after arrived_stop_index', () => {
  const stops = [
    { stopId: 'a', position: 1, runMinutes: 0, nameEn: 'A', nameAr: 'أ' },
    { stopId: 'b', position: 2, runMinutes: 8, nameEn: 'B', nameAr: 'ب' },
    { stopId: 'c', position: 3, runMinutes: 15, nameEn: 'C', nameAr: 'ج' },
  ];
  assert.equal(nextStopAfter(stops, 0)?.stopId, 'a');
  assert.equal(nextStopAfter(stops, 1)?.stopId, 'b');
  assert.equal(nextStopAfter(stops, 3), null);
});

test('planned arrival is departs + run_minutes', () => {
  const d = new Date('2026-08-24T08:00:00Z');
  assert.equal(plannedArrival(d, 12).toISOString(), '2026-08-24T08:12:00.000Z');
});

test('completed → boarding (IN_PROGRESS) is illegal', () => {
  assert.equal(canTransition('COMPLETED', 'IN_PROGRESS'), false);
  assert.equal(canTransition('LOCKED', 'IN_PROGRESS'), true);
});
