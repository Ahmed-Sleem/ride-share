-- Up Migration
-- 0014: the slot grid (P3.2). Slots are GENERATED from a route's service window
-- and interval — never hand-typed — and are unique per (route, service day,
-- departure time) so regeneration is idempotent. Times are wall-clock
-- (DEC-118); the service day is a plain date (city-local, DEC-002).
CREATE TABLE slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  departs_at time NOT NULL,
  required_vehicles integer NOT NULL DEFAULT 1 CHECK (required_vehicles BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slots_route_date_time_key UNIQUE (route_id, service_date, departs_at)
);
CREATE INDEX slots_route_date_idx ON slots (route_id, service_date);

-- Down Migration
DROP TABLE slots;
