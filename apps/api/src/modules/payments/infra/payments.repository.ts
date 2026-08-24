/* Payments repository — the ONLY place SQL for ledger_entries and
   payment_orders lives (DEC-170). Parameterised only. The ledger write is a
   single transaction: rows + the order's success update commit together or
   not at all. provider_txn_id UNIQUE is the webhook idempotency key — the
   23505 mapping happens in the application layer. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { LedgerRowInput } from '../domain/ledger.js';

export interface PaymentOrderRow {
  id: string;
  rider_user_id: string;
  kind: 'topup' | 'booking';
  amount_minor: number;
  status: 'created' | 'pending' | 'succeeded' | 'failed';
  provider: string;
  provider_order_id: string | null;
  provider_txn_id: string | null;
  booking_id: string | null;
  raw: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface LedgerEntryRow {
  id: string;
  txn_id: string;
  debit_account: string;
  credit_account: string;
  amount_minor: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: Date;
}

export interface AccountBalanceRow { account: string; balance_minor: string }

@Injectable()
export class PaymentsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ── payment orders ────────────────────────────────────────────────────

  async createOrder(input: {
    id: string; riderUserId: string; kind: 'topup' | 'booking';
    amountMinor: number; bookingId?: string;
  }): Promise<PaymentOrderRow> {
    const { rows } = await this.pool.query<PaymentOrderRow>(
      `INSERT INTO payment_orders (id, rider_user_id, kind, amount_minor, booking_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, rider_user_id, kind, amount_minor, status, provider,
                 provider_order_id, provider_txn_id, booking_id, raw, created_at, updated_at`,
      [input.id, input.riderUserId, input.kind, input.amountMinor, input.bookingId ?? null],
    );
    return rows[0]!;
  }

  async findOrder(id: string): Promise<PaymentOrderRow | null> {
    const { rows } = await this.pool.query<PaymentOrderRow>(
      `SELECT id, rider_user_id, kind, amount_minor, status, provider,
              provider_order_id, provider_txn_id, booking_id, raw, created_at, updated_at
       FROM payment_orders WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  /** Marks an order pending with the provider's order id (checkout created). */
  async markOrderPending(id: string, providerOrderId: string): Promise<void> {
    await this.pool.query(
      'UPDATE payment_orders SET status = \'pending\', provider_order_id = $2, updated_at = now() WHERE id = $1',
      [id, providerOrderId]);
  }

  async markOrderFailed(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE payment_orders SET status = \'failed\', updated_at = now() WHERE id = $1 AND status <> \'succeeded\'',
      [id]);
  }

  /** THE money write: order → succeeded + ledger rows, in ONE transaction.
      The UNIQUE(provider_txn_id) makes a concurrent duplicate webhook fail
      with 23505 inside the transaction — nothing commits. */
  async applySucceededOrder(input: {
    orderId: string; providerTxnId: string; raw: unknown;
    rows: LedgerRowInput[];
  }): Promise<'applied' | 'duplicate'> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const claimed = await client.query(
        `UPDATE payment_orders
            SET status = 'succeeded', provider_txn_id = $2, raw = $3, updated_at = now()
          WHERE id = $1 AND status <> 'succeeded'
          RETURNING id`,
        [input.orderId, input.providerTxnId, JSON.stringify(input.raw)],
      );
      if (claimed.rowCount === 0) {
        await client.query('ROLLBACK');
        return 'duplicate';
      }
      for (const r of input.rows) {
        await client.query(
          `INSERT INTO ledger_entries (txn_id, debit_account, credit_account, amount_minor, reason, ref_type, ref_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [r.txnId, r.debit, r.credit, r.amountMinor, r.reason, r.refType ?? null, r.refId ?? null],
        );
      }
      await client.query('COMMIT');
      return 'applied';
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  // ── ledger reads ──────────────────────────────────────────────────────

  /** Raw net balances (credits − debits) for the given accounts, from the
      derived view — a balance is NEVER stored. */
  async balancesFor(accounts: string[]): Promise<Map<string, number>> {
    if (accounts.length === 0) return new Map();
    const { rows } = await this.pool.query<AccountBalanceRow>(
      `SELECT account, balance_minor FROM account_balances WHERE account = ANY($1::text[])`,
      [accounts]);
    return new Map(rows.map((r) => [r.account, Number(r.balance_minor)]));
  }

  /** Entries touching one account (either side), newest first. */
  async entriesForAccount(account: string, limit: number): Promise<((LedgerEntryRow & { side: 'debit' | 'credit' })[])> {
    const { rows } = await this.pool.query<LedgerEntryRow & { side: 'debit' | 'credit' }>(
      `SELECT id, txn_id, debit_account, credit_account, amount_minor, reason, ref_type, ref_id, created_at,
              CASE WHEN debit_account = $1 THEN 'debit' ELSE 'credit' END AS side
         FROM ledger_entries
        WHERE debit_account = $1 OR credit_account = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2`,
      [account, limit]);
    return rows;
  }

  /** Whole-table closed-system invariant: Σ raw net over every account = 0. */
  async totalNetMinor(): Promise<number> {
    const { rows } = await this.pool.query<{ total: string | null }>(
      `SELECT COALESCE(SUM(balance_minor), 0)::bigint AS total FROM account_balances`);
    return Number(rows[0]?.total ?? 0);
  }

  /** Has a given business event (ref) already been posted? — idempotency
      for the cash-collected tap. */
  async txnExistsForRef(refType: string, refId: string, reason: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ n: string }>(
      `SELECT count(*)::int AS n FROM ledger_entries WHERE ref_type = $1 AND ref_id = $2 AND reason = $3`,
      [refType, refId, reason]);
    return Number(rows[0]?.n ?? 0) > 0;
  }

  /** Atomic wallet spend: takes a per-account advisory lock, re-derives the
      balance INSIDE the transaction, inserts the rows only when it covers
      the spend. Concurrent spends on the same wallet serialize here — the
      ledger is append-only, so the lock (not a mutable column) is what makes
      "balance >= amount" safe (P3.7 concurrency test proves it). */
  async postRowsIfWalletCovers(input: {
    walletAccount: string; amountMinor: number; rows: LedgerRowInput[];
  }): Promise<'posted' | 'insufficient'> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.walletAccount]);
      const bal = await client.query<{ balance_minor: string | null }>(
        `SELECT COALESCE(SUM(
            CASE WHEN credit_account = $1 THEN amount_minor
                 WHEN debit_account  = $1 THEN -amount_minor ELSE 0 END), 0)::bigint AS balance_minor
           FROM ledger_entries`, [input.walletAccount]);
      const raw = Number(bal.rows[0]?.balance_minor ?? 0);
      // wallet is credit-normal: raw net IS the spendable balance
      if (raw < input.amountMinor) {
        await client.query('ROLLBACK');
        return 'insufficient';
      }
      for (const r of input.rows) {
        await client.query(
          `INSERT INTO ledger_entries (txn_id, debit_account, credit_account, amount_minor, reason, ref_type, ref_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [r.txnId, r.debit, r.credit, r.amountMinor, r.reason, r.refType ?? null, r.refId ?? null],
        );
      }
      await client.query('COMMIT');
      return 'posted';
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  /** Reconciliation reads (CH06 §6.9). Every check REPORTS — nothing here
      ever writes a correction. */
  async reconciliationFacts(): Promise<{
    totalNetMinor: number;
    succeededOrders: number;
    ordersWithPostings: number;
    postingsWithoutSucceededOrder: number;
    viewMatchesRecompute: boolean;
  }> {
    const total = await this.totalNetMinor();
    const orders = await this.pool.query<{ n: string }>(
      `SELECT count(*)::int AS n FROM payment_orders WHERE status = 'succeeded'`);
    const withPostings = await this.pool.query<{ n: string }>(
      `SELECT count(DISTINCT le.ref_id)::int AS n FROM ledger_entries le
         JOIN payment_orders po ON po.id = le.ref_id AND le.ref_type = 'payment_order'
        WHERE po.status = 'succeeded' AND le.reason = 'topup'`);
    const orphans = await this.pool.query<{ n: string }>(
      `SELECT count(*)::int AS n FROM ledger_entries le
        WHERE le.ref_type = 'payment_order'
          AND NOT EXISTS (SELECT 1 FROM payment_orders po
                            WHERE po.id = le.ref_id AND po.status = 'succeeded')`);
    const recompute = await this.pool.query<{ ok: boolean }>(`
      WITH recompute AS (
        SELECT account, SUM(delta_minor)::bigint AS balance_minor FROM (
          SELECT credit_account AS account,  amount_minor AS delta_minor FROM ledger_entries
          UNION ALL
          SELECT debit_account, -amount_minor FROM ledger_entries) legs GROUP BY account)
      SELECT NOT EXISTS (
        SELECT 1 FROM account_balances v JOIN recompute r USING (account)
         WHERE v.balance_minor <> r.balance_minor) AS ok`);
    return {
      totalNetMinor: total,
      succeededOrders: Number(orders.rows[0]?.n ?? 0),
      ordersWithPostings: Number(withPostings.rows[0]?.n ?? 0),
      postingsWithoutSucceededOrder: Number(orphans.rows[0]?.n ?? 0),
      viewMatchesRecompute: recompute.rows[0]?.ok === true,
    };
  }

  /** Posts a plain posting set (refunds, manual credits) in one transaction. */
  async postRows(rows: LedgerRowInput[]): Promise<void> {
    if (rows.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of rows) {
        await client.query(
          `INSERT INTO ledger_entries (txn_id, debit_account, credit_account, amount_minor, reason, ref_type, ref_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [r.txnId, r.debit, r.credit, r.amountMinor, r.reason, r.refType ?? null, r.refId ?? null],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  // ── read-only cross-table reads (billing data + cash-booking context) ─

  /** Rider profile for provider billing_data (R20 §2.3). */
  async riderProfile(userId: string): Promise<{ id: string; name: string; email: string | null; phone: string | null } | null> {
    const { rows } = await this.pool.query<{ id: string; name: string; email: string | null; phone: string | null }>(
      'SELECT id, name, email, phone FROM users WHERE id = $1', [userId]);
    return rows[0] ?? null;
  }

  /** The booking context the cash-collected tap needs (read-only; Path B
      owns the bookings module — the service contract lands with P3.8 and
      this read moves behind it then). */
  async bookingForCashCollected(bookingId: string): Promise<{
    id: string; rider_user_id: string; status: string; fare_minor: number;
    journey_driver_id: string | null; journey_status: string | null;
  } | null> {
    const { rows } = await this.pool.query<{
      id: string; rider_user_id: string; status: string; fare_minor: number;
      journey_driver_id: string | null; journey_status: string | null;
    }>(
      `SELECT b.id, b.rider_user_id, b.status, b.fare_minor,
              j.driver_user_id AS journey_driver_id, j.status AS journey_status
         FROM bookings b
         JOIN journeys j ON j.id = b.journey_id
        WHERE b.id = $1`, [bookingId]);
    return rows[0] ?? null;
  }
}
