-- Up Migration
-- 0010: staff lifecycle + the protected system admin (owner decision).
--   is_system_admin  — exactly one account (the env-seeded bootstrap admin)
--                      is the main admin: it cannot be edited or deleted by
--                      anyone (including itself), and no second super_admin
--                      can be created.
--   deleted_at       — soft delete for accounts: staff are deactivated, not
--                      hard-deleted, so the audit log and history stay intact.
ALTER TABLE users ADD COLUMN is_system_admin boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN deleted_at timestamptz;

-- Down Migration
ALTER TABLE users DROP COLUMN deleted_at;
ALTER TABLE users DROP COLUMN is_system_admin;
