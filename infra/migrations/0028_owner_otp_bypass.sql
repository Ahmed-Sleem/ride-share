-- Up Migration
-- 0028 (Path B, even): owner can overwrite AUTH_OTP_BYPASS from Settings.
-- true = skip email codes (testing). false / null = env fallback.

ALTER TABLE platform_settings
  ADD COLUMN auth_otp_bypass boolean;

-- Down Migration
ALTER TABLE platform_settings DROP COLUMN IF EXISTS auth_otp_bypass;
