-- Up Migration
-- 0020 (Path B, even): incidents + share-my-ride tokens (M4 / DEC-092).

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('sos', 'report')),
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'severe')),
  status text NOT NULL CHECK (status IN ('OPEN', 'TRIAGE', 'INVESTIGATING', 'DECIDED', 'FOLLOWED_UP')),
  reporter_user_id uuid NOT NULL REFERENCES users(id),
  subject_user_id uuid REFERENCES users(id),
  booking_id uuid REFERENCES bookings(id),
  journey_id uuid REFERENCES journeys(id),
  body text,
  silent boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  decision text,
  decision_reason text,
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz,
  precautionary_recommended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incidents_status_idx ON incidents (status, created_at DESC);
CREATE INDEX incidents_reporter_idx ON incidents (reporter_user_id, created_at DESC);

CREATE TABLE incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES users(id),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incident_events_incident_idx ON incident_events (incident_id, occurred_at);

CREATE TABLE ride_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  rider_user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ride_share_links_token_idx ON ride_share_links (token);

-- Down Migration
DROP TABLE IF EXISTS ride_share_links;
DROP TABLE IF EXISTS incident_events;
DROP TABLE IF EXISTS incidents;
