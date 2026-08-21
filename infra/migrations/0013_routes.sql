-- Up Migration
-- 0013: routes + the ordered stop sequence (P3.1). A route references VERIFIED
-- stops only (checked at insert by trigger AND at retire time from the geo
-- side). position is unique per route and gapless — the service rewrites it
-- atomically on reorder. Money is integer minor units; times are wall-clock.
CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_en text NOT NULL DEFAULT '',
  name_ar text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','retired')),
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound','inbound')),
  fare_minor integer NOT NULL CHECK (fare_minor >= 0),
  window_start time NOT NULL DEFAULT '06:00',
  window_end time NOT NULL DEFAULT '22:00',
  slot_interval_min integer NOT NULL DEFAULT 15 CHECK (slot_interval_min BETWEEN 5 AND 120),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position >= 1),
  distance_from_start_m double precision NOT NULL DEFAULT 0,
  run_minutes integer NOT NULL DEFAULT 0,
  CONSTRAINT route_stops_route_position_key UNIQUE (route_id, position),
  CONSTRAINT route_stops_route_stop_key UNIQUE (route_id, stop_id)
);
CREATE INDEX route_stops_route_idx ON route_stops (route_id, position);

-- A route may only reference a VERIFIED stop — re-checked here because a stop
-- could be retired after the route was drawn; the retire path checks this side
-- too (P3.1 test 2).
CREATE FUNCTION route_stops_require_verified() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stops WHERE id = NEW.stop_id AND status = 'verified') THEN
    RAISE EXCEPTION 'route_stops.stop_id must reference a verified stop';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER route_stops_require_verified
  BEFORE INSERT OR UPDATE OF stop_id ON route_stops
  FOR EACH ROW EXECUTE FUNCTION route_stops_require_verified();

-- Retiring a stop that is used by a PUBLISHED route is refused, naming the
-- route (P3.1 test 2). Enforced here so the geo module never needs to reach
-- into routes (no cross-module cycle — the boundary checker forbids one).
CREATE FUNCTION stops_retire_guard() RETURNS trigger AS $$
DECLARE
  route_names text;
BEGIN
  IF NEW.status = 'retired' AND OLD.status <> 'retired' THEN
    SELECT string_agg(r.name_en, ', ') INTO route_names
    FROM route_stops rs JOIN routes r ON r.id = rs.route_id
    WHERE rs.stop_id = NEW.id AND r.status = 'published';
    IF route_names IS NOT NULL THEN
      RAISE EXCEPTION 'stop used by published route(s): %', route_names USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER stops_retire_guard
  BEFORE UPDATE OF status ON stops
  FOR EACH ROW EXECUTE FUNCTION stops_retire_guard();

-- Down Migration
DROP TRIGGER stops_retire_guard ON stops;
DROP FUNCTION stops_retire_guard();
DROP TRIGGER route_stops_require_verified ON route_stops;
DROP FUNCTION route_stops_require_verified();
DROP TABLE route_stops;
DROP TABLE routes;
