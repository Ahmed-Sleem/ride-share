-- Up Migration
-- 0002: users. One table for every role (CH02 — the universal model). Riders
-- are phone+OTP (password_hash null); staff are email+password. Roles are the
-- CH2 §2.4 set; super_admin is the seeded bootstrap role (DEC-186 domain).
-- id is uuidv7 (time-sortable); money is integer minor units everywhere.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text UNIQUE,
  name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN
    ('rider','driver','operations','manager','support','super_admin')),
  password_hash text,               -- null for OTP-only riders
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','pending_verification')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE users;
