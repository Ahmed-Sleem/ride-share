-- Up Migration
-- 0016: bookings (P3.6). A booking is a seat on a JOURNEY (a claimed slot),
-- boarding at one stop on that route, alighting free (DEC-140). fare_minor is
-- LOCKED at booking (DEC-056) — a later fare change never rewrites it. Seat
-- inventory is enforced IN THE DATABASE (the seat guard trigger), so parallel
-- bookings can never oversell a journey.
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  rider_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boarding_stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE RESTRICT,
  seats integer NOT NULL CHECK (seats BETWEEN 1 AND 4),
  fare_minor integer NOT NULL CHECK (fare_minor >= 0),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'RESERVED'
    CHECK (status IN ('RESERVED','CONFIRMED','ON_BOARD','COMPLETED','CANCELLED','NO_SHOW')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_journey_idx ON bookings (journey_id);
CREATE INDEX bookings_rider_idx ON bookings (rider_user_id, created_at DESC);

CREATE FUNCTION bookings_seat_guard() RETURNS trigger AS $$
DECLARE
  cap integer;
  total integer;
BEGIN
  SELECT seats_total INTO cap FROM journeys WHERE id = NEW.journey_id;
  SELECT COALESCE(SUM(seats), 0) INTO total
    FROM bookings
   WHERE journey_id = NEW.journey_id AND status <> 'CANCELLED' AND id <> NEW.id;
  IF total + NEW.seats > cap THEN
    RAISE EXCEPTION 'journey has no seats left' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER bookings_seat_guard
  BEFORE INSERT OR UPDATE OF seats ON bookings
  FOR EACH ROW EXECUTE FUNCTION bookings_seat_guard();

-- Down Migration
DROP TRIGGER bookings_seat_guard ON bookings;
DROP FUNCTION bookings_seat_guard();
DROP TABLE bookings;
