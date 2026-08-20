/* Geo-math + stop domain rules — pure and deterministic. Every assertion has
   been observed failing when the thing it guards was broken (§0.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, boundingBox } from './geo-math.js';
import { isWithinBounds, stopCode, nextStopCode, spacingCheck } from './stop.js';

test('haversine: two points ~111 km apart at the equator are about 111,000 m', () => {
  const d = distanceMeters(0, 0, 0, 1); // one degree of longitude at the equator
  assert.ok(d > 110_000 && d < 112_000, String(d));
});

test('haversine: the same point is 0 m apart', () => {
  assert.equal(distanceMeters(31.2, 29.9, 31.2, 29.9), 0);
});

test('haversine: Alexandria → Cairo is roughly 180 km', () => {
  const d = distanceMeters(31.2001, 29.9187, 30.0444, 31.2357);
  assert.ok(d > 170_000 && d < 190_000, String(d));
});

test('bounding box covers the radius; longitude widens toward the poles', () => {
  const b = boundingBox(0, 0, 1000);
  assert.ok(b.maxLat > 0 && b.minLat < 0 && b.maxLng > 0, 'box spans the point');
  const eqSpan = b.maxLng - b.minLng;            // dLng == dLat at the equator
  const bPole = boundingBox(80, 0, 1000);
  const poleSpan = bPole.maxLng - bPole.minLng;  // cos(80°) ≈ 0.17 → ~5.8× wider
  assert.ok(poleSpan > eqSpan * 3, `pole span ${poleSpan} should be much wider than equator ${eqSpan}`);
});

test('bounds: valid coordinates pass, impossible ones are refused', () => {
  assert.ok(isWithinBounds(31.2, 29.9));
  assert.ok(isWithinBounds(-90, 180));
  assert.ok(!isWithinBounds(91, 0), 'latitude 91');
  assert.ok(!isWithinBounds(0, 181), 'longitude 181');
  assert.ok(!isWithinBounds(NaN, 0), 'NaN');
});

test('stop codes are stable and human-usable (no I/O)', () => {
  assert.equal(stopCode('ALX', 'cor', 14), 'ALX-COR-014');
  assert.equal(stopCode('alx', 'smo', 2), 'ALX-SMO-002');
});

test('nextStopCode increments from the previous code', () => {
  assert.equal(nextStopCode('ALX', 'COR', 'ALX-COR-014'), 'ALX-COR-015');
  assert.equal(nextStopCode('ALX', 'COR', null), 'ALX-COR-001');
});

test('spacing: a stop inside the minimum is refused; outside is fine; override is explicit', () => {
  const existing = [{ id: 'a', lat: 0, lng: 0 }];
  const near = spacingCheck(0, 0.0005, existing, 100); // ~55 m
  assert.equal(near.ok, false);
  assert.equal(near.nearestId, 'a');
  const far = spacingCheck(0, 0.002, existing, 100); // ~222 m
  assert.equal(far.ok, true);
});
