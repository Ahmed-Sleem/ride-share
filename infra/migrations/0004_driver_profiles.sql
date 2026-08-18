-- Up Migration
-- 0004: driver applications. A driver is a rider account that applied and was
-- APPROVED by Operations (DEC-035, CH02 Door 1). The facet lives here; the
-- users.role becomes 'driver' on approval (M1 driver model, DEC-188).
CREATE TABLE driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','under_review','approved','rejected')),
  submitted_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE driver_profiles;
