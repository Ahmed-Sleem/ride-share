-- Up Migration
-- 0005: vehicles. One registry, two doors (CH02 §2.3): a driver adds their
-- vehicle, or an admin creates it for a fleet (fleet_label). Only APPROVED
-- vehicles driven by APPROVED drivers may ever appear on a journey.
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate text NOT NULL UNIQUE,
  model text NOT NULL DEFAULT '',
  colour text NOT NULL DEFAULT '',
  fleet_label text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','under_review','approved','rejected','suspended','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE vehicles;
