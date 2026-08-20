-- Up Migration
-- 0012: field captures (P2.3). A field capture creates a stop directly in
-- `pending` with the surveyor's GPS accuracy and a client idempotency key, so
-- an offline queue that retries on reconnect can never create two stops for
-- one capture. Photos carry their mime type.
ALTER TABLE stops ADD COLUMN capture_id text;
ALTER TABLE stops ADD CONSTRAINT stops_capture_id_key UNIQUE (capture_id);
ALTER TABLE stops ADD COLUMN gps_accuracy_m double precision;

ALTER TABLE stop_photos ADD COLUMN mime_type text NOT NULL DEFAULT 'image/jpeg';

-- Down Migration
ALTER TABLE stop_photos DROP COLUMN mime_type;
ALTER TABLE stops DROP COLUMN gps_accuracy_m;
ALTER TABLE stops DROP CONSTRAINT stops_capture_id_key;
ALTER TABLE stops DROP COLUMN capture_id;
