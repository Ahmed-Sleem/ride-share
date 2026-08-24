/* SQL for the single owner-settings row. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import { emptyOverrides, type OwnerSettingPatch, type OwnerSettingRow } from '../domain/owner-settings.js';

@Injectable()
export class PlatformSettingsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async get(): Promise<OwnerSettingRow> {
    const { rows } = await this.pool.query(
      `SELECT commission_percent, notify_behavioural_max_day, notify_behavioural_gap_hours,
              notify_promo_max_day, notify_promo_max_week, notify_non_tx_max_day,
              paymob_enabled, auth_otp_bypass, updated_at, updated_by
         FROM platform_settings WHERE id = 1`
    );
    if (!rows[0]) return emptyOverrides();
    const r = rows[0];
    return {
      commission_percent: (r.commission_percent === null || r.commission_percent === undefined) ? null : Number(r.commission_percent),
      notify_behavioural_max_day: (r.notify_behavioural_max_day === null || r.notify_behavioural_max_day === undefined) ? null : Number(r.notify_behavioural_max_day),
      notify_behavioural_gap_hours: (r.notify_behavioural_gap_hours === null || r.notify_behavioural_gap_hours === undefined) ? null : Number(r.notify_behavioural_gap_hours),
      notify_promo_max_day: (r.notify_promo_max_day === null || r.notify_promo_max_day === undefined) ? null : Number(r.notify_promo_max_day),
      notify_promo_max_week: (r.notify_promo_max_week === null || r.notify_promo_max_week === undefined) ? null : Number(r.notify_promo_max_week),
      notify_non_tx_max_day: (r.notify_non_tx_max_day === null || r.notify_non_tx_max_day === undefined) ? null : Number(r.notify_non_tx_max_day),
      paymob_enabled: (r.paymob_enabled === null || r.paymob_enabled === undefined) ? null : Boolean(r.paymob_enabled),
      auth_otp_bypass: (r.auth_otp_bypass === null || r.auth_otp_bypass === undefined) ? null : Boolean(r.auth_otp_bypass),
      updated_at: r.updated_at ?? null,
      updated_by: r.updated_by ?? null,
    };
  }

  async save(patch: OwnerSettingPatch, actorId: string): Promise<OwnerSettingRow> {
    const current = await this.get();
    const next = {
      commission_percent: 'commission_percent' in patch ? patch.commission_percent ?? null : current.commission_percent,
      notify_behavioural_max_day: 'notify_behavioural_max_day' in patch ? patch.notify_behavioural_max_day ?? null : current.notify_behavioural_max_day,
      notify_behavioural_gap_hours: 'notify_behavioural_gap_hours' in patch ? patch.notify_behavioural_gap_hours ?? null : current.notify_behavioural_gap_hours,
      notify_promo_max_day: 'notify_promo_max_day' in patch ? patch.notify_promo_max_day ?? null : current.notify_promo_max_day,
      notify_promo_max_week: 'notify_promo_max_week' in patch ? patch.notify_promo_max_week ?? null : current.notify_promo_max_week,
      notify_non_tx_max_day: 'notify_non_tx_max_day' in patch ? patch.notify_non_tx_max_day ?? null : current.notify_non_tx_max_day,
      paymob_enabled: 'paymob_enabled' in patch ? patch.paymob_enabled ?? null : current.paymob_enabled,
      auth_otp_bypass: 'auth_otp_bypass' in patch ? patch.auth_otp_bypass ?? null : current.auth_otp_bypass,
    };
    await this.pool.query(
      `INSERT INTO platform_settings (
          id, commission_percent, notify_behavioural_max_day, notify_behavioural_gap_hours,
          notify_promo_max_day, notify_promo_max_week, notify_non_tx_max_day,
          paymob_enabled, auth_otp_bypass, updated_at, updated_by
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, now(), $9)
        ON CONFLICT (id) DO UPDATE SET
          commission_percent = EXCLUDED.commission_percent,
          notify_behavioural_max_day = EXCLUDED.notify_behavioural_max_day,
          notify_behavioural_gap_hours = EXCLUDED.notify_behavioural_gap_hours,
          notify_promo_max_day = EXCLUDED.notify_promo_max_day,
          notify_promo_max_week = EXCLUDED.notify_promo_max_week,
          notify_non_tx_max_day = EXCLUDED.notify_non_tx_max_day,
          paymob_enabled = EXCLUDED.paymob_enabled,
          auth_otp_bypass = EXCLUDED.auth_otp_bypass,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by`,
      [
        next.commission_percent, next.notify_behavioural_max_day, next.notify_behavioural_gap_hours,
        next.notify_promo_max_day, next.notify_promo_max_week, next.notify_non_tx_max_day,
        next.paymob_enabled, next.auth_otp_bypass, actorId,
      ]
    );
    return this.get();
  }

  async isSystemAdmin(userId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ is_system_admin: boolean }>(
      `SELECT is_system_admin FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    return !!rows[0]?.is_system_admin;
  }
}
