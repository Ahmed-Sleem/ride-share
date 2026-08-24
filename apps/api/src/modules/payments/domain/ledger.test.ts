/* Ledger domain tests (P3.7). Expectations are computed INDEPENDENTLY of
   the implementation (hand-written expected account maps), so a defect in
   the posting builders cannot also hide inside a mirrored expectation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type LedgerRowInput,
  postTopup, postCashCollected, postFareFromWallet, postRefundCredit,
  assertRefundWithinCapture, splitCommission, assertValidPosting,
  postingDeltas, deltasSumToZero, displayBalance, isDebitNormal, walletAccount, driverCashAccount,
  driverEarningsAccount, PLATFORM_REVENUE, PAYMOB_CLEARING,
} from './ledger.js';

const RIDER = '11111111-1111-1111-1111-111111111111';
const DRIVER = '22222222-2222-2222-2222-222222222222';
const ORDER = '33333333-3333-3333-3333-333333333333';
const BOOKING = '44444444-4444-4444-4444-444444444444';

/** All rows from all scenarios, for the closed-system assertion. */
const allRows: ReturnType<typeof postTopup> = [];

/** Validates a posting, remembers it for the closed-system assertion, returns it. */
function collect(rows: LedgerRowInput[]): LedgerRowInput[] {
  assertValidPosting(rows);
  allRows.push(...rows);
  return rows;
}

test('topup credits the rider wallet from provider clearing', () => {
  const rows = collect(postTopup('t1', RIDER, 15000, ORDER));
  assert.equal(rows.length, 1);
  const r = rows[0]!;
  assert.equal(r.debit, PAYMOB_CLEARING);
  assert.equal(r.credit, walletAccount(RIDER));
  assert.equal(r.amountMinor, 15000);
  assert.equal(r.reason, 'topup');
});

test('cash collected (DEC-078): driver_cash holds the fare; split recognised', () => {
  // fare 5000 piastres, 20% commission → commission 1000, driver share 4000
  const rows = collect(postCashCollected('t2', DRIVER, 5000, 20, BOOKING));
  assert.equal(rows.length, 2);
  const byReason = new Map(rows.map((r) => [r.reason, r]));
  assert.equal(byReason.get('cash_collected_commission')!.debit, driverCashAccount(DRIVER));
  assert.equal(byReason.get('cash_collected_commission')!.credit, PLATFORM_REVENUE);
  assert.equal(byReason.get('cash_collected_commission')!.amountMinor, 1000);
  assert.equal(byReason.get('cash_collected_driver_share')!.credit, driverEarningsAccount(DRIVER));
  assert.equal(byReason.get('cash_collected_driver_share')!.amountMinor, 4000);
  // driver_cash is DEBIT-normal (an asset the driver holds for us):
  // raw net is -5000, displayed liability +5000 (held until settlement).
  const deltas = postingDeltas(rows);
  assert.equal(deltas.get(driverCashAccount(DRIVER)), -5000);
  assert.equal(displayBalance(driverCashAccount(DRIVER), deltas.get(driverCashAccount(DRIVER))!), 5000);
});

test('zero commission produces a single driver-share row (no zero-amount rows)', () => {
  const rows = collect(postCashCollected('t3', DRIVER, 5000, 0, BOOKING));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.amountMinor, 5000);
});

test('wallet-paid fare debits the wallet for the full fare across both legs', () => {
  const rows = collect(postFareFromWallet('t4', RIDER, DRIVER, 3000, 20, BOOKING));
  const deltas = postingDeltas(rows);
  assert.equal(deltas.get(walletAccount(RIDER)), -3000);
  assert.equal(deltas.get(driverEarningsAccount(DRIVER)), 2400);
  assert.equal(deltas.get(PLATFORM_REVENUE), 600);
});

test('refund credit draws from platform revenue into the wallet (DEC-055)', () => {
  const rows = collect(postRefundCredit('t5', RIDER, 1250, BOOKING));
  const deltas = postingDeltas(rows);
  assert.equal(deltas.get(PLATFORM_REVENUE), -1250);
  assert.equal(deltas.get(walletAccount(RIDER)), 1250);
});

test('refund may never exceed the capture (P3.7 TEST 5)', () => {
  assert.throws(() => assertRefundWithinCapture(1000, 1001), /exceeds/);
  assert.doesNotThrow(() => assertRefundWithinCapture(1000, 1000));
  assert.throws(() => assertRefundWithinCapture(1000, 0));
});

test('money invariants: positive integers only; commission 0..90 integer', () => {
  assert.throws(() => postTopup('tx', RIDER, 0, ORDER));
  assert.throws(() => postTopup('tx', RIDER, 10.5, ORDER)); // float — INV-30
  assert.throws(() => postTopup('tx', RIDER, -5, ORDER));
  assert.throws(() => postCashCollected('tx', DRIVER, 5000, 20.5, BOOKING));
  assert.throws(() => postCashCollected('tx', DRIVER, 5000, 91, BOOKING));
  assert.equal(splitCommission(999, 20), 199); // floor, never exceeds fare
  assert.equal(splitCommission(100, 90), 90);
});

test('posting validity: one txn_id, both accounts, debit ≠ credit', () => {
  assertValidPosting(postTopup('t', RIDER, 100, ORDER));
  assert.throws(() => assertValidPosting([]));
  assert.throws(() => assertValidPosting([
    { txnId: 'a', debit: 'x', credit: 'y', amountMinor: 1, reason: 'topup' },
    { txnId: 'b', debit: 'y', credit: 'x', amountMinor: 1, reason: 'topup' },
  ]));
  assert.throws(() => assertValidPosting([
    { txnId: 'a', debit: 'x', credit: 'x', amountMinor: 1, reason: 'topup' } as never,
  ]));
});

test('CLOSED SYSTEM: every scenario above kept Σ(all account deltas) == 0', () => {
  assert.ok(allRows.length >= 7, 'the scenarios above actually posted rows');
  const deltas = postingDeltas(allRows);
  assert.ok(deltasSumToZero(deltas), `ledger leaked value: ${[...deltas.entries()].filter(([, v]) => v !== 0)}`);
});

test('normal sides: assets debit-normal, liabilities/revenue credit-normal', () => {
  assert.ok(isDebitNormal(driverCashAccount(DRIVER)));
  assert.ok(isDebitNormal(PAYMOB_CLEARING));
  assert.ok(!isDebitNormal(walletAccount(RIDER)));
  assert.ok(!isDebitNormal(driverEarningsAccount(DRIVER)));
  assert.ok(!isDebitNormal(PLATFORM_REVENUE));
  assert.equal(displayBalance(driverCashAccount(DRIVER), -700), 700);
  assert.equal(displayBalance(walletAccount(RIDER), 700), 700);
});

test('PROPERTY: 1,000 random histories keep the whole ledger at zero (P3.7 TEST 4)', () => {
  // deterministic LCG so a failure reproduces exactly
  let seed = 20260824;
  const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const rows: ReturnType<typeof postTopup> = [];
  for (let i = 0; i < 1000; i++) {
    const fare = 100 + rnd(10000);
    const pct = rnd(91);
    switch (rnd(4)) {
      case 0: rows.push(...postTopup(`p${i}`, RIDER, 100 + rnd(50000), ORDER)); break;
      case 1: rows.push(...postCashCollected(`p${i}`, DRIVER, fare, pct, BOOKING)); break;
      case 2: rows.push(...postFareFromWallet(`p${i}`, RIDER, DRIVER, fare, pct, BOOKING)); break;
      default: rows.push(...postRefundCredit(`p${i}`, RIDER, 1 + rnd(fare), BOOKING)); break;
    }
  }
  assert.ok(deltasSumToZero(postingDeltas(rows)), 'random histories must sum to zero everywhere');
});
