/* ══════════════════════════════════════════════════════════════════════
   Ledger domain rules (P3.7, Path A). Pure and tested — no infra imports.
   Every posting is a set of BALANCED rows sharing one txn_id: each row moves
   amount_minor from debit_account to credit_account (CH06 §6.1). The whole
   system is closed: across all rows ever, Σ(debits) == Σ(credits), so the
   sum of every account balance is always zero — asserted in tests after
   every scenario and by the invariant test over 1,000 random histories.

   Account keys (CH06 §6.1 account table):
     wallet:<userId>            rider prepaid balance (credit refunds land here)
     driver_earnings:<userId>   accrued fares owed to the driver
     driver_cash:<userId>       cash the driver collected that is ours
     platform_revenue           commission earned (and where refunds draw from)
     provider_clearing:paymob   money in transit at the provider
     promotion_budget           campaign funds (M5; defined now so keys are stable)

   Money is integer minor units (piastres, INV-30); every amount > 0.        */
import { randomUUID } from 'node:crypto';

export const PLATFORM_REVENUE = 'platform_revenue';
export const PAYMOB_CLEARING = 'provider_clearing:paymob';
export const PROMOTION_BUDGET = 'promotion_budget';

export function walletAccount(userId: string): string {
  return `wallet:${userId}`;
}
export function driverEarningsAccount(driverUserId: string): string {
  return `driver_earnings:${driverUserId}`;
}
export function driverCashAccount(driverUserId: string): string {
  return `driver_cash:${driverUserId}`;
}

export interface LedgerRowInput {
  txnId: string;
  debit: string;
  credit: string;
  amountMinor: number;
  reason: LedgerReason;
  refType?: string;
  refId?: string;
}

export type LedgerReason =
  | 'topup'
  | 'cash_collected_commission'
  | 'cash_collected_driver_share'
  | 'fare_paid_commission'
  | 'fare_paid_driver_share'
  | 'refund_credit';

/** Top-up succeeded at the provider: provider clearing → rider wallet. */
export function postTopup(txnId: string, riderUserId: string, amountMinor: number, paymentOrderId: string): LedgerRowInput[] {
  assertAmount(amountMinor);
  return [{
    txnId, debit: PAYMOB_CLEARING, credit: walletAccount(riderUserId),
    amountMinor, reason: 'topup', refType: 'payment_order', refId: paymentOrderId,
  }];
}

/**
 * Driver collected CASH at boarding (DEC-078 §6.3, exact sequence). The fare
 * the driver physically holds becomes a driver_cash liability; the fare is
 * recognised immediately with the commission split applied:
 *   commission  → platform_revenue
 *   driver share → driver_earnings
 * Both legs are FUNDED by the driver's cash liability, so driver_cash ends
 * the transaction holding exactly `fareMinor` (settled later at payout).
 */
export function postCashCollected(txnId: string, driverUserId: string, fareMinor: number, commissionPercent: number, bookingId: string): LedgerRowInput[] {
  assertAmount(fareMinor);
  assertCommission(commissionPercent);
  const commission = splitCommission(fareMinor, commissionPercent);
  const driverShare = fareMinor - commission;
  const rows: LedgerRowInput[] = [];
  if (commission > 0) {
    rows.push({
      txnId, debit: driverCashAccount(driverUserId), credit: PLATFORM_REVENUE,
      amountMinor: commission, reason: 'cash_collected_commission',
      refType: 'booking', refId: bookingId,
    });
  }
  rows.push({
    txnId, debit: driverCashAccount(driverUserId), credit: driverEarningsAccount(driverUserId),
    amountMinor: driverShare, reason: 'cash_collected_driver_share',
    refType: 'booking', refId: bookingId,
  });
  return rows;
}

/**
 * Wallet-paid fare (the preferred path, DEC-204): rider wallet funds the
 * same recognition split. `postFareFromWallet` debits the wallet for the
 * full fare across the two legs (commission + driver share).
 */
export function postFareFromWallet(txnId: string, riderUserId: string, driverUserId: string, fareMinor: number, commissionPercent: number, bookingId: string): LedgerRowInput[] {
  assertAmount(fareMinor);
  assertCommission(commissionPercent);
  const commission = splitCommission(fareMinor, commissionPercent);
  const driverShare = fareMinor - commission;
  const rows: LedgerRowInput[] = [];
  if (commission > 0) {
    rows.push({
      txnId, debit: walletAccount(riderUserId), credit: PLATFORM_REVENUE,
      amountMinor: commission, reason: 'fare_paid_commission',
      refType: 'booking', refId: bookingId,
    });
  }
  rows.push({
    txnId, debit: walletAccount(riderUserId), credit: driverEarningsAccount(driverUserId),
    amountMinor: driverShare, reason: 'fare_paid_driver_share',
    refType: 'booking', refId: bookingId,
  });
  return rows;
}

/** A refund is ALWAYS wallet credit (DEC-055), drawn from platform revenue. */
export function postRefundCredit(txnId: string, riderUserId: string, amountMinor: number, bookingId?: string): LedgerRowInput[] {
  assertAmount(amountMinor);
  return [{
    txnId, debit: PLATFORM_REVENUE, credit: walletAccount(riderUserId),
    amountMinor, reason: 'refund_credit',
    refType: bookingId ? 'booking' : undefined, refId: bookingId,
  }];
}

/** A refund may never exceed the original capture (P3.7 TEST 5). */
export function assertRefundWithinCapture(capturedMinor: number, refundMinor: number): void {
  if (!Number.isInteger(refundMinor) || refundMinor <= 0) {
    throw new Error('refund must be a positive integer of minor units');
  }
  if (refundMinor > capturedMinor) {
    throw new Error(`refund ${refundMinor} exceeds the captured ${capturedMinor}`);
  }
}

/** Commission is floor(fare × pct / 100) — integer minor units only, and it
    can never exceed the fare. */
export function splitCommission(fareMinor: number, commissionPercent: number): number {
  assertAmount(fareMinor);
  assertCommission(commissionPercent);
  return Math.min(fareMinor, Math.floor((fareMinor * commissionPercent) / 100));
}

export function newTxnId(): string {
  return randomUUID();
}

/** Validity of one posting set: every row well-formed, amounts positive,
    debit ≠ credit, and every row of a transaction is internally consistent. */
export function assertValidPosting(rows: LedgerRowInput[]): void {
  if (rows.length === 0) throw new Error('a posting needs at least one row');
  const txnId = rows[0]!.txnId;
  for (const r of rows) {
    assertAmount(r.amountMinor);
    if (r.txnId !== txnId) throw new Error('all rows of a posting share one txn_id');
    if (!r.debit || !r.credit) throw new Error('every row names both accounts');
    if (r.debit === r.credit) throw new Error('a row must move value between two accounts');
  }
}

/** Signed RAW net deltas of a posting set (credits − debits) — matches the
    account_balances view. Interpretation per account normal side is
    displayBalance() below; nobody else re-derives it. */
export function postingDeltas(rows: LedgerRowInput[]): Map<string, number> {
  const deltas = new Map<string, number>();
  for (const r of rows) {
    deltas.set(r.credit, (deltas.get(r.credit) ?? 0) + r.amountMinor);
    deltas.set(r.debit, (deltas.get(r.debit) ?? 0) - r.amountMinor);
  }
  return deltas;
}

/** Account normal side (classic accounting). Assets the platform holds or
    is owed are DEBIT-normal: the cash a driver collected for us, and money
    in transit at the provider. Liabilities (what we owe riders/drivers) and
    revenue are CREDIT-normal. */
export function isDebitNormal(account: string): boolean {
  return account.startsWith('driver_cash:') || account.startsWith('provider_clearing:');
}

/** The human/economic balance of an account from its raw net. */
export function displayBalance(account: string, rawNetMinor: number): number {
  return isDebitNormal(account) ? -rawNetMinor : rawNetMinor;
}

/** The closed-system invariant: the sum of ALL account deltas is zero. */
export function deltasSumToZero(deltas: Map<string, number>): boolean {
  let sum = 0;
  for (const v of deltas.values()) sum += v;
  return sum === 0;
}

function assertAmount(amountMinor: number): void {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('money is a positive integer of minor units (INV-30)');
  }
}
function assertCommission(commissionPercent: number): void {
  if (!Number.isInteger(commissionPercent) || commissionPercent < 0 || commissionPercent > 90) {
    throw new Error('commission percent is an integer 0..90');
  }
}
