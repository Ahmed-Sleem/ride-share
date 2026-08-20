-- Up Migration
-- 0011: geography — stops (numeric lat/lng, DEC-197), stop photos, and an
-- append-only verification ledger. A stop is never hard-deleted (CH04 §4.1.2);
-- it moves draft → pending → verified → rejected/retired. The public code is
-- stable and human-usable (support/drivers read it out loud).
CREATE TABLE stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_en text NOT NULL DEFAULT '',
  name_ar text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','verified','rejected','retired')),
  source text NOT NULL DEFAULT 'desk'
    CHECK (source IN ('desk','field')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  -- physical checklist answers (field mode, P2.3); null until a surveyor fills them
  stand_ok boolean, lit_ok boolean, legal_stop_ok boolean, reachable_ok boolean,
  walking_to_next_m double precision,
  override_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stops_lat_bounds CHECK (lat >= -90 AND lat <= 90),
  CONSTRAINT stops_lng_bounds CHECK (lng >= -180 AND lng <= 180)
);
-- nearest-stop queries scan a lat/lng bounding box (DEC-197 numeric model)
CREATE INDEX stops_lat_lng_idx ON stops (lat, lng);
CREATE INDEX stops_status_idx ON stops (status) WHERE status = 'verified';

CREATE TABLE stop_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  -- photo bytes are stored off-row by the app; this is the metadata
  storage_key text NOT NULL,
  taken_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stop_photos_stop_idx ON stop_photos (stop_id);

CREATE TABLE stop_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  verifier_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  reason text,
  device text,
  gps_accuracy_m double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stop_verifications_stop_idx ON stop_verifications (stop_id);

-- Append-only ledger: the two-person rule's evidence must never be editable.
CREATE FUNCTION stop_verifications_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'stop_verifications is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER stop_verifications_no_update
  BEFORE UPDATE OR DELETE ON stop_verifications
  FOR EACH ROW EXECUTE FUNCTION stop_verifications_append_only();

-- Down Migration
DROP TRIGGER stop_verifications_no_update ON stop_verifications;
DROP FUNCTION stop_verifications_append_only();
DROP TABLE stop_verifications;
DROP TABLE stop_photos;
DROP TABLE stops;
