-- Up Migration
-- 0003: OTP and sessions. OTPs are short-lived (5 min, 5 attempts) and stored
-- hashed; refresh tokens live in sessions so they are individually revocable.
-- PostgreSQL is the only stateful dependency (DEC-186).
CREATE TABLE otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otps_phone_idx ON otps (phone);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- Down Migration
DROP TABLE sessions;
DROP TABLE otps;
