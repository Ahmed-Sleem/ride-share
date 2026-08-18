-- Up Migration
-- 0006: audit log (CH02 §2.4.2). Append-only: every privileged action (A/L in
-- the permission matrix) writes who/what/before/after/reason. No deletes, ever.
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_created_idx ON audit_log (created_at DESC);

-- Down Migration
DROP TABLE audit_log;
