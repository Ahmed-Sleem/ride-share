-- Up Migration
-- 0024 (Path B, even): P7.5 device token + delivery status (DEC-147).

ALTER TABLE users ADD COLUMN push_token text;
ALTER TABLE users ADD COLUMN push_platform text;
ALTER TABLE in_app_notifications ADD COLUMN push_status text;

-- Down Migration
ALTER TABLE in_app_notifications DROP COLUMN IF EXISTS push_status;
ALTER TABLE users DROP COLUMN IF EXISTS push_platform;
ALTER TABLE users DROP COLUMN IF EXISTS push_token;
