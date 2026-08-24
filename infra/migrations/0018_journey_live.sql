-- Up Migration
-- 0018 (Path B, even): live journey — last known position, last arrived stop,
-- rider alight signal, in-app notifications for abort (and later events).

ALTER TABLE journeys
  ADD COLUMN last_lat double precision,
  ADD COLUMN last_lng double precision,
  ADD COLUMN last_position_at timestamptz,
  ADD COLUMN arrived_stop_index integer NOT NULL DEFAULT 0
    CHECK (arrived_stop_index >= 0);

ALTER TABLE bookings
  ADD COLUMN alight_requested_at timestamptz;

CREATE TABLE in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  body_en text NOT NULL,
  body_ar text NOT NULL,
  ref_type text,
  ref_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX in_app_notifications_user_idx ON in_app_notifications (user_id, created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS in_app_notifications;
ALTER TABLE bookings DROP COLUMN IF EXISTS alight_requested_at;
ALTER TABLE journeys
  DROP COLUMN IF EXISTS last_lat,
  DROP COLUMN IF EXISTS last_lng,
  DROP COLUMN IF EXISTS last_position_at,
  DROP COLUMN IF EXISTS arrived_stop_index;
