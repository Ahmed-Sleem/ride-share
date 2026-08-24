-- Up Migration
-- 0017: payments — the double-entry ledger + payment orders (P3.7, Path A).
--
-- THE LEDGER (CH06 §6.1): every row is one balanced transfer
-- (debit_account ─amount→ credit_account). A business transaction (a top-up,
-- a cash collection, a refund) is a GROUP of rows sharing a txn_id. Balances
-- are DERIVED (view account_balances) — a mutable balance column is
-- forbidden (BUILD_PLAN P3.7 break test 4). The table is APPEND-ONLY:
-- corrections are new compensating rows, never edits (INV-27; the trigger
-- refuses UPDATE/DELETE the same way the seat guard refuses overselling).
-- Money is integer minor units (piastres, INV-30); amount > 0 always.
--
-- PAYMENT ORDERS: one row per money-in intent. id IS the merchant_order_id
-- sent to Paymob (R20 §2.2) — the webhook's obj.order.merchant_order_id
-- joins back to it. provider_txn_id is UNIQUE: it is the webhook
-- idempotency key (providers retry by design; five replays must produce
-- ONE ledger effect). raw keeps the VERIFIED webhook payload for audit.

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id uuid NOT NULL,
  debit_account text NOT NULL,
  credit_account text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  reason text NOT NULL,
  ref_type text,
  ref_id uuid,
  config_version text NOT NULL DEFAULT '1',
  created_at timestamptz NOT NULL DEFAULT now(),
  -- a row must move value BETWEEN two different accounts
  CONSTRAINT ledger_entries_accounts_diff CHECK (debit_account <> credit_account)
);
CREATE INDEX ledger_entries_txn_idx ON ledger_entries (txn_id);
CREATE INDEX ledger_entries_debit_idx ON ledger_entries (debit_account, created_at DESC);
CREATE INDEX ledger_entries_credit_idx ON ledger_entries (credit_account, created_at DESC);
CREATE INDEX ledger_entries_ref_idx ON ledger_entries (ref_type, ref_id)
  WHERE ref_type IS NOT NULL;

-- Append-only, enforced IN the database (a trigger cannot be forgotten by
-- an application bug the way a convention can).
CREATE FUNCTION ledger_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger entries are append-only' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER ledger_append_only
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();

CREATE TABLE payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('topup','booking')),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','pending','succeeded','failed')),
  provider text NOT NULL DEFAULT 'paymob',
  provider_order_id text,
  provider_txn_id text UNIQUE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_orders_rider_idx ON payment_orders (rider_user_id, created_at DESC);

-- Derived balances — the ONLY wallet/earnings/liability balance in the
-- system. Sign convention (classic normalcy): the view exposes the RAW net
-- `credits − debits`; credit-normal accounts (wallet, driver_earnings,
-- platform_revenue, promotion_budget — liabilities and revenue) read as-is,
-- debit-normal accounts (driver_cash, provider_clearing — assets held for
-- the platform) read negated. The payments domain owns that interpretation
-- (accountNormalSide/displayBalance) — no consumer re-derives it.
CREATE VIEW account_balances AS
SELECT account, SUM(delta_minor)::bigint AS balance_minor
FROM (
  SELECT credit_account AS account,  amount_minor AS delta_minor FROM ledger_entries
  UNION ALL
  SELECT debit_account, -amount_minor FROM ledger_entries
) legs
GROUP BY account;

-- Down Migration
DROP VIEW account_balances;
DROP TABLE payment_orders;
DROP TRIGGER ledger_append_only ON ledger_entries;
DROP FUNCTION ledger_append_only();
DROP TABLE ledger_entries;
