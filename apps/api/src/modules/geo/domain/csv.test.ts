/* Stop CSV parsing tests — all-or-nothing import (P2.2). Each assertion has
   been observed failing when the parser was broken (§0.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStopsCsv } from './csv.js';

test('parses 50 valid rows', () => {
  const csv = Array.from({ length: 50 }, (_, i) => `31.2${i},29.9${i},Stop ${i}`).join('\n');
  const r = parseStopsCsv(csv);
  assert.equal(r.ok, true);
  assert.equal((r as { rows: unknown[] }).rows.length, 50);
});

test('a malformed row aborts the whole import and reports its line number', () => {
  const csv = '31.20,29.90,Good stop\nnot-a-number,29.9,Bad stop\n31.22,29.92,Another';
  const r = parseStopsCsv(csv);
  assert.equal(r.ok, false);
  assert.equal((r as { row: number }).row, 2);
});

test('a missing name fails the import', () => {
  const r = parseStopsCsv('31.2,29.9,');
  assert.equal(r.ok, false);
  assert.equal((r as { error: string }).error, 'missing_name');
});

test('an optional header line is skipped; empty lines are fine', () => {
  const r = parseStopsCsv('lat,lng,name_en,name_ar\n\n31.2,29.9,Gate 2,بوابة\n31.3,29.8,Gate 3,');
  assert.equal(r.ok, true);
  assert.equal((r as { rows: { nameEn: string }[] }).rows[0]!.nameEn, 'Gate 2');
  assert.equal((r as { rows: { nameAr: string }[] }).rows[0]!.nameAr, 'بوابة');
});

test('an empty document is refused', () => {
  const r = parseStopsCsv('   \n\n');
  assert.equal(r.ok, false);
});
