import { Inject, Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../infra/notifications.repository.js';
import { sendFcm } from '../infra/fcm.sender.js';
import { allowsSend, sanitizePreview, tierOf } from '../domain/tiers.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import { CONFIG, type Env } from '../../../config/env.js';
import type { Actor } from '../../identity/contracts/types.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notes: NotificationsRepository,
    @Inject(CONFIG) private readonly env: Env,
  ) {}

  async notify(input: {
    userId: string; kind: string;
    titleEn: string; titleAr: string; bodyEn: string; bodyAr: string;
    refType?: string; refId?: string; page?: string;
  }) {
    const row = await this.notes.create(input);
    const tier = tierOf(input.kind);
    const recent = await this.notes.recentForCaps(input.userId);
    const prior = recent.map((r) => ({ tier: tierOf(r.kind), createdAt: new Date(r.created_at) }));
    const allowed = allowsSend(tier, new Date(), prior, {
      behaviouralMaxDay: this.env.NOTIFY_BEHAVIOURAL_MAX_DAY,
      behaviouralGapHours: this.env.NOTIFY_BEHAVIOURAL_GAP_HOURS,
      promoMaxDay: this.env.NOTIFY_PROMO_MAX_DAY,
      promoMaxWeek: this.env.NOTIFY_PROMO_MAX_WEEK,
      nonTxMaxDay: this.env.NOTIFY_NON_TX_MAX_DAY,
    });
    if (!allowed) {
      await this.notes.markPush(row.id, 'capped');
      return row;
    }
    const device = await this.notes.deviceOf(input.userId);
    const preview = sanitizePreview(input.titleEn);
    const body = sanitizePreview(input.bodyEn);
    if (!device) {
      await this.notes.markPush(row.id, 'no_device');
      return row;
    }
    const sent = await sendFcm({
      serverKey: this.env.FCM_SERVER_KEY,
      token: device.token,
      title: preview,
      body,
      data: { kind: input.kind, page: input.page || '', refId: input.refId || '' },
    });
    await this.notes.markPush(row.id, sent.status);
    return row;
  }

  async registerDevice(actor: Actor, token: string, platform: string) {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_OWN_ACCOUNT);
    const t = String(token || '').trim();
    if (t.length < 8) return { ok: false as const };
    await this.notes.setDevice(actor.id, t, platform || 'web');
    return { ok: true as const };
  }

  async mine(actor: Actor) {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_OWN_ACCOUNT);
    return this.notes.forUser(actor.id);
  }
}
