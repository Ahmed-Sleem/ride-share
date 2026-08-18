-- Up Migration
-- 0009: PostgreSQL-backed rate limiting (closes G-062 first clause). The
-- global throttler was in-memory; with this table the per-IP/per-key hit
-- counts survive restarts and are shared across instances — everything stays
-- in the one stateful dependency (DEC-186). One row per throttle key; the
-- hits map holds a count per named throttler.
CREATE TABLE throttle_records (
  key text PRIMARY KEY,
  hits jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  blocked_until timestamptz
);
CREATE INDEX throttle_records_expires_idx ON throttle_records (expires_at);

-- Down Migration
DROP TABLE throttle_records;
