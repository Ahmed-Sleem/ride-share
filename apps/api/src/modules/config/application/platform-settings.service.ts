import { BadRequestException, ForbiddenException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CONFIG, type Env } from '../../../config/env.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import { AuditService } from '../../audit/contracts/public.js';
import type { Actor } from '../../identity/contracts/types.js';
import { applyOverrides, sanitizePatch, type OwnerSettingPatch } from '../domain/owner-settings.js';
import { PlatformSettingsRepository } from '../infra/platform-settings.repository.js';

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  /** Snapshot of Railway/env values at process start — before DB overwrite. */
  private readonly boot: {
    commission_percent: number;
    notify_behavioural_max_day: number;
    notify_behavioural_gap_hours: number;
    notify_promo_max_day: number;
    notify_promo_max_week: number;
    notify_non_tx_max_day: number;
    paymob_enabled: boolean;
    auth_otp_bypass: boolean;
  };

  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly repo: PlatformSettingsRepository,
    private readonly audit: AuditService
  ) {
    this.boot = {
      commission_percent: env.COMMISSION_PERCENT,
      notify_behavioural_max_day: env.NOTIFY_BEHAVIOURAL_MAX_DAY,
      notify_behavioural_gap_hours: env.NOTIFY_BEHAVIOURAL_GAP_HOURS,
      notify_promo_max_day: env.NOTIFY_PROMO_MAX_DAY,
      notify_promo_max_week: env.NOTIFY_PROMO_MAX_WEEK,
      notify_non_tx_max_day: env.NOTIFY_NON_TX_MAX_DAY,
      paymob_enabled: env.PAYMOB_ENABLED === 'true',
      auth_otp_bypass: env.AUTH_OTP_BYPASS === 'true',
    };
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.reapply();
    } catch {
      /* table may not exist yet during first migrate-on-boot; env stays */
    }
  }

  private async reapply(): Promise<void> {
    this.env.COMMISSION_PERCENT = this.boot.commission_percent;
    this.env.NOTIFY_BEHAVIOURAL_MAX_DAY = this.boot.notify_behavioural_max_day;
    this.env.NOTIFY_BEHAVIOURAL_GAP_HOURS = this.boot.notify_behavioural_gap_hours;
    this.env.NOTIFY_PROMO_MAX_DAY = this.boot.notify_promo_max_day;
    this.env.NOTIFY_PROMO_MAX_WEEK = this.boot.notify_promo_max_week;
    this.env.NOTIFY_NON_TX_MAX_DAY = this.boot.notify_non_tx_max_day;
    this.env.PAYMOB_ENABLED = this.boot.paymob_enabled ? 'true' : 'false';
    this.env.AUTH_OTP_BYPASS = this.boot.auth_otp_bypass ? 'true' : 'false';
    const row = await this.repo.get();
    applyOverrides(this.env as unknown as Record<string, unknown>, row);
  }

  async get(actor: Actor) {
    await this.assertOwner(actor);
    const row = await this.repo.get();
    const envSnapshot = {
      commission_percent: this.env.COMMISSION_PERCENT,
      notify_behavioural_max_day: this.env.NOTIFY_BEHAVIOURAL_MAX_DAY,
      notify_behavioural_gap_hours: this.env.NOTIFY_BEHAVIOURAL_GAP_HOURS,
      notify_promo_max_day: this.env.NOTIFY_PROMO_MAX_DAY,
      notify_promo_max_week: this.env.NOTIFY_PROMO_MAX_WEEK,
      notify_non_tx_max_day: this.env.NOTIFY_NON_TX_MAX_DAY,
      paymob_enabled: this.env.PAYMOB_ENABLED === 'true',
      auth_otp_bypass: this.env.AUTH_OTP_BYPASS === 'true',
    };
    return {
      env: this.boot,
      override: {
        commission_percent: row.commission_percent,
        notify_behavioural_max_day: row.notify_behavioural_max_day,
        notify_behavioural_gap_hours: row.notify_behavioural_gap_hours,
        notify_promo_max_day: row.notify_promo_max_day,
        notify_promo_max_week: row.notify_promo_max_week,
        notify_non_tx_max_day: row.notify_non_tx_max_day,
        paymob_enabled: row.paymob_enabled,
        auth_otp_bypass: row.auth_otp_bypass,
      },
      effective: envSnapshot,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
    };
  }

  async update(actor: Actor, patch: OwnerSettingPatch) {
    await this.assertOwner(actor);
    const before = await this.repo.get();
    let clean;
    try {
      clean = sanitizePatch(patch);
    } catch (e) {
      const key = (e as { message_key?: string }).message_key || 'config.bad_value';
      throw new BadRequestException({ message_key: key });
    }
    const after = await this.repo.save(clean, actor.id);
    await this.reapply();
    await this.audit.record(actor, 'config.update', {
      targetType: 'platform_settings',
      targetId: '1',
      before,
      after,
    });
    return this.get(actor);
  }

  private async assertOwner(actor: Actor): Promise<void> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_CONFIG);
    if (!(await this.repo.isSystemAdmin(actor.id))) {
      throw new ForbiddenException({ message_key: 'auth.owner_only' });
    }
  }
}
