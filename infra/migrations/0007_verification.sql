-- Up Migration
-- 0007: verification & recovery (DEC-189). A single verification_codes table
-- replaces `otps` and serves three purposes: sms_login, email_verify and
-- password_reset. Every code is hashed at rest; cooldown (>= 60s between
-- sends) and lockout (3 failed attempts -> 1 hour) are enforced in the
-- domain layer against last_sent_at / last_attempt_at / attempts.
CREATE TABLE verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('sms_login','email_verify','password_reset')),
  channel text NOT NULL CHECK (channel IN ('sms','email')),
  target text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_codes_target_idx ON verification_codes (kind, channel, target);

ALTER TABLE users ADD COLUMN email_verified_at timestamptz;

DROP TABLE otps;

-- Down Migration
CREATE TABLE otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otps_phone_idx ON otps (phone);
ALTER TABLE users DROP COLUMN email_verified_at;
DROP TABLE verification_codes;
