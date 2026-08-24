/* Pure owner-settings merge (DEC-208). Env is the fallback; a non-null
   override wins. Secrets are never part of this object. */

export interface OwnerSettingPatch {
  commission_percent?: number | null;
  notify_behavioural_max_day?: number | null;
  notify_behavioural_gap_hours?: number | null;
  notify_promo_max_day?: number | null;
  notify_promo_max_week?: number | null;
  notify_non_tx_max_day?: number | null;
  paymob_enabled?: boolean | null;
  auth_otp_bypass?: boolean | null;
}

export interface OwnerSettingRow {
  commission_percent: number | null;
  notify_behavioural_max_day: number | null;
  notify_behavioural_gap_hours: number | null;
  notify_promo_max_day: number | null;
  notify_promo_max_week: number | null;
  notify_non_tx_max_day: number | null;
  paymob_enabled: boolean | null;
  auth_otp_bypass: boolean | null;
  updated_at: Date | string | null;
  updated_by: string | null;
}

export function emptyOverrides(): OwnerSettingRow {
  return {
    commission_percent: null,
    notify_behavioural_max_day: null,
    notify_behavioural_gap_hours: null,
    notify_promo_max_day: null,
    notify_promo_max_week: null,
    notify_non_tx_max_day: null,
    paymob_enabled: null,
    auth_otp_bypass: null,
    updated_at: null,
    updated_by: null,
  };
}

export function assertIntRange(name: string, value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw Object.assign(new Error('config.bad_value'), { message_key: 'config.bad_value', field: name });
  }
  return value;
}

export function sanitizePatch(input: OwnerSettingPatch): OwnerSettingPatch {
  const out: OwnerSettingPatch = {};
  if ('commission_percent' in input) {
    out.commission_percent = (input.commission_percent === null || input.commission_percent === undefined)
      ? null
      : assertIntRange('commission_percent', input.commission_percent, 0, 90);
  }
  if ('notify_behavioural_max_day' in input) {
    out.notify_behavioural_max_day = (input.notify_behavioural_max_day === null || input.notify_behavioural_max_day === undefined)
      ? null
      : assertIntRange('notify_behavioural_max_day', input.notify_behavioural_max_day, 0, 20);
  }
  if ('notify_behavioural_gap_hours' in input) {
    out.notify_behavioural_gap_hours = (input.notify_behavioural_gap_hours === null || input.notify_behavioural_gap_hours === undefined)
      ? null
      : assertIntRange('notify_behavioural_gap_hours', input.notify_behavioural_gap_hours, 0, 24);
  }
  if ('notify_promo_max_day' in input) {
    out.notify_promo_max_day = (input.notify_promo_max_day === null || input.notify_promo_max_day === undefined)
      ? null
      : assertIntRange('notify_promo_max_day', input.notify_promo_max_day, 0, 10);
  }
  if ('notify_promo_max_week' in input) {
    out.notify_promo_max_week = (input.notify_promo_max_week === null || input.notify_promo_max_week === undefined)
      ? null
      : assertIntRange('notify_promo_max_week', input.notify_promo_max_week, 0, 20);
  }
  if ('notify_non_tx_max_day' in input) {
    out.notify_non_tx_max_day = (input.notify_non_tx_max_day === null || input.notify_non_tx_max_day === undefined)
      ? null
      : assertIntRange('notify_non_tx_max_day', input.notify_non_tx_max_day, 0, 20);
  }
  if ('paymob_enabled' in input) {
    if ((input.paymob_enabled !== null && (input.paymob_enabled !== undefined) && typeof input.paymob_enabled !== 'boolean') {
      throw Object.assign(new Error('config.bad_value'), { message_key: 'config.bad_value', field: 'paymob_enabled' });
    }
    out.paymob_enabled = input.paymob_enabled ?? null;
  }
  if ('auth_otp_bypass' in input) {
    if ((input.auth_otp_bypass !== null && (input.auth_otp_bypass !== undefined) && typeof input.auth_otp_bypass !== 'boolean') {
      throw Object.assign(new Error('config.bad_value'), { message_key: 'config.bad_value', field: 'auth_otp_bypass' });
    }
    out.auth_otp_bypass = input.auth_otp_bypass ?? null;
  }
  return out;
}

/** Apply non-null overrides onto a mutable env-shaped object. */
export function applyOverrides(env: Record<string, unknown>, row: OwnerSettingRow): Record<string, unknown> {
  if ((row.commission_percent !== null && (row.commission_percent !== undefined)) env.COMMISSION_PERCENT = row.commission_percent;
  if ((row.notify_behavioural_max_day !== null && (row.notify_behavioural_max_day !== undefined)) env.NOTIFY_BEHAVIOURAL_MAX_DAY = row.notify_behavioural_max_day;
  if ((row.notify_behavioural_gap_hours !== null && (row.notify_behavioural_gap_hours !== undefined)) env.NOTIFY_BEHAVIOURAL_GAP_HOURS = row.notify_behavioural_gap_hours;
  if ((row.notify_promo_max_day !== null && (row.notify_promo_max_day !== undefined)) env.NOTIFY_PROMO_MAX_DAY = row.notify_promo_max_day;
  if ((row.notify_promo_max_week !== null && (row.notify_promo_max_week !== undefined)) env.NOTIFY_PROMO_MAX_WEEK = row.notify_promo_max_week;
  if ((row.notify_non_tx_max_day !== null && (row.notify_non_tx_max_day !== undefined)) env.NOTIFY_NON_TX_MAX_DAY = row.notify_non_tx_max_day;
  if ((row.paymob_enabled !== null && (row.paymob_enabled !== undefined)) env.PAYMOB_ENABLED = row.paymob_enabled ? 'true' : 'false';
  if ((row.auth_otp_bypass !== null && (row.auth_otp_bypass !== undefined)) env.AUTH_OTP_BYPASS = row.auth_otp_bypass ? 'true' : 'false';
  return env;
}
