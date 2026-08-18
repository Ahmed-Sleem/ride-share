import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTransition, canTransition,
  DRIVER_TRANSITIONS, VEHICLE_TRANSITIONS,
} from './state-machine.js';

test('driver: every legal transition is accepted', () => {
  assert.equal(canTransition(DRIVER_TRANSITIONS, 'draft', 'submitted'), true);
  assert.equal(canTransition(DRIVER_TRANSITIONS, 'submitted', 'under_review'), true);
  assert.equal(canTransition(DRIVER_TRANSITIONS, 'under_review', 'approved'), true);
  assert.equal(canTransition(DRIVER_TRANSITIONS, 'under_review', 'rejected'), true);
  assert.equal(canTransition(DRIVER_TRANSITIONS, 'rejected', 'submitted'), true);
});

test('driver: illegal transitions are rejected', () => {
  assert.equal(canTransition(DRIVER_TRANSITIONS, 'draft', 'approved'), false);
  assert.equal(canTransition(DRIVER_TRANSITIONS, 'approved', 'rejected'), false);
  assert.equal(canTransition(DRIVER_TRANSITIONS, 'submitted', 'approved'), false);
});

test('driver: assertTransition throws on illegal moves', () => {
  assert.throws(() => assertTransition(DRIVER_TRANSITIONS, 'approved', 'draft', 'driver'));
});

test('vehicle: approval flow works and approved can suspend/retire', () => {
  assert.equal(canTransition(VEHICLE_TRANSITIONS, 'submitted', 'under_review'), true);
  assert.equal(canTransition(VEHICLE_TRANSITIONS, 'under_review', 'approved'), true);
  assert.equal(canTransition(VEHICLE_TRANSITIONS, 'approved', 'suspended'), true);
  assert.equal(canTransition(VEHICLE_TRANSITIONS, 'approved', 'retired'), true);
  assert.equal(canTransition(VEHICLE_TRANSITIONS, 'suspended', 'approved'), true);
});

test('vehicle: retired is terminal', () => {
  assert.equal(canTransition(VEHICLE_TRANSITIONS, 'retired', 'approved'), false);
});
