-- Up Migration
-- 0026 (Path B, even): owner settings row. Env stays the fallback;
-- non-null columns overwrite the live process config (DEC-208).
-- Secrets never live here.

CREATE TABLE platform_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  commission_percent integer CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 90)),
  notify_behavioural_max_day integer CHECK (notify_behavioural_max_day IS NULL OR (notify_behavioural_max_day >= 0 AND notify_behavioural_max_day <= 20)),
  notify_behavioural_gap_hours integer CHECK (notify_behavioural_gap_hours IS NULL OR (notify_behavioural_gap_hours >= 0 AND notify_behavioural_gap_hours <= 24)),
  notify_promo_max_day integer CHECK (notify_promo_max_day IS NULL OR (notify_promo_max_day >= 0 AND notify_promo_max_day <= 10)),
  notify_promo_max_week integer CHECK (notify_promo_max_week IS NULL OR (notify_promo_max_week >= 0 AND notify_promo_max_week <= 20)),
  notify_non_tx_max_day integer CHECK (notify_non_tx_max_day IS NULL OR (notify_non_tx_max_day >= 0 AND notify_non_tx_max_day <= 20)),
  paymob_enabled boolean,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO platform_settings (id) VALUES (1);

-- Down Migration
DROP TABLE IF EXISTS platform_settings;
