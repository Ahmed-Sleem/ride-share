-- Up Migration
-- 0022 (Path B, even): idempotency receipts for the driver outbox (P7.2).

CREATE TABLE idempotency_receipts (
  key text PRIMARY KEY,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  body jsonb NOT NULL
);
CREATE INDEX idempotency_receipts_actor_idx ON idempotency_receipts (actor_id, created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS idempotency_receipts;
