-- Up Migration
-- 0008: email sign-in (replaces phone/SMS login — owner decision 2026-08-18).
-- verification_codes gains the 'email_login' kind and drops 'sms_login'.
-- The channel column keeps 'sms' (future notifications may reuse it), but no
-- login code is ever sent over SMS again.
ALTER TABLE verification_codes DROP CONSTRAINT verification_codes_kind_check;
ALTER TABLE verification_codes ADD CONSTRAINT verification_codes_kind_check
  CHECK (kind IN ('email_login','email_verify','password_reset'));

-- Down Migration
ALTER TABLE verification_codes DROP CONSTRAINT verification_codes_kind_check;
ALTER TABLE verification_codes ADD CONSTRAINT verification_codes_kind_check
  CHECK (kind IN ('sms_login','email_verify','password_reset'));
