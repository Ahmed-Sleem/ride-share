-- Up Migration
-- 0015: journeys (P3.3). Claiming a slot creates a Journey in CLAIMED state —
-- the claim IS the journey (DEC-132). slot_id is UNIQUE: two drivers tapping
-- the same last slot race in the DATABASE, and the loser gets a clear refusal,
-- never a double claim. committed is the honesty flag behind INV-33 (only
-- committed claims may carry subscriptions).
CREATE TABLE journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'CLAIMED'
    CHECK (status IN
      ('CLAIMED','OPEN_FOR_BOOKING','LOCKED','IN_PROGRESS','COMPLETED','CANCELLED','ABORTED')),
  committed boolean NOT NULL DEFAULT true,
  seats_total integer NOT NULL DEFAULT 14 CHECK (seats_total BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX journeys_driver_idx ON journeys (driver_user_id, created_at DESC);
CREATE INDEX journeys_slot_idx ON journeys (slot_id);

-- Down Migration
DROP TABLE journeys;
