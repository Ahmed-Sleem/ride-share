import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { SupportRepository } from '../infra/support.repository.js';
import { AuditService } from '../../audit/contracts/public.js';
import { NotificationsService } from '../../notifications/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import type { Actor } from '../../identity/contracts/types.js';
import {
  canTransitionIncident, isIncidentCategory, recommendsPrecautionary, severityFor,
  type IncidentCategory,
} from '../domain/incidents.js';

@Injectable()
export class SupportService {
  constructor(
    private readonly repo: SupportRepository,
    private readonly audit: AuditService,
    private readonly notes: NotificationsService,
  ) {}

  async raiseSos(actor: Actor, input: {
    silent?: boolean; lat?: number; lng?: number; bookingId?: string;
  }) {
    assertCan(actor.role as unknown as Role, Capability.TRIGGER_SOS);
    const ctx = input.bookingId ? await this.repo.bookingOwner(input.bookingId) : null;
    if (input.bookingId && (!ctx || (ctx.rider_user_id !== actor.id && ctx.driver_user_id !== actor.id))) {
      throw new NotFoundException({ message_key: 'support.booking_not_found' });
    }
    const row = await this.repo.insertIncident({
      kind: 'sos', category: 'sos', severity: severityFor('sos'), status: 'OPEN',
      reporterUserId: actor.id,
      subjectUserId: ctx?.driver_user_id ?? null,
      bookingId: ctx?.id ?? null,
      journeyId: ctx?.journey_id ?? null,
      body: null,
      silent: !!input.silent,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      precautionary: false,
    });
    await this.repo.appendEvent(row.id, 'opened', { kind: 'sos', silent: !!input.silent }, actor.id);
    await this.audit.record(actor, 'support.sos', { targetType: 'incident', targetId: row.id });
    if (!input.silent) {
      await this.notes.notify({
        userId: actor.id, kind: 'sos',
        titleEn: 'Help is on the way', titleAr: 'المساعدة في الطريق',
        bodyEn: 'Your SOS reached the on-call team. Stay where you are if you can.',
        bodyAr: 'وصلت استغاثتك لفريق المناوبة. ابقَ حيث أنت إن استطعت.',
        refType: 'incident', refId: row.id,
      });
    }
    return this.toPublic(row);
  }

  async report(actor: Actor, input: { category: string; body: string; bookingId?: string }) {
    assertCan(actor.role as unknown as Role, Capability.REPORT_PROBLEM);
    if (!isIncidentCategory(input.category) || input.category === 'sos') {
      throw new BadRequestException({ message_key: 'support.bad_category' });
    }
    const body = (input.body || '').trim();
    if (body.length < 4) throw new BadRequestException({ message_key: 'support.body_required' });
    const cat = input.category as IncidentCategory;
    const ctx = input.bookingId ? await this.repo.bookingOwner(input.bookingId) : null;
    const row = await this.repo.insertIncident({
      kind: 'report', category: cat, severity: severityFor(cat), status: 'OPEN',
      reporterUserId: actor.id,
      subjectUserId: ctx?.driver_user_id ?? null,
      bookingId: ctx?.id ?? null,
      journeyId: ctx?.journey_id ?? null,
      body,
      silent: false,
      lat: null, lng: null,
      precautionary: recommendsPrecautionary(cat),
    });
    await this.repo.appendEvent(row.id, 'opened', { category: cat }, actor.id);
    await this.audit.record(actor, 'support.report', { targetType: 'incident', targetId: row.id });
    await this.notes.notify({
      userId: actor.id, kind: 'report',
      titleEn: 'We received your report', titleAr: 'استلمنا بلاغك',
      bodyEn: 'A ticket was opened. We will tell you the outcome.',
      bodyAr: 'فُتح تذكرة. سنبلغك بالنتيجة.',
      refType: 'incident', refId: row.id,
    });
    return this.toPublic(row);
  }

  async createShare(actor: Actor, bookingId: string) {
    assertCan(actor.role as unknown as Role, Capability.SHARE_RIDE);
    const ctx = await this.repo.bookingOwner(bookingId);
    if (!ctx || ctx.rider_user_id !== actor.id) {
      throw new NotFoundException({ message_key: 'support.booking_not_found' });
    }
    const token = randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 12 * 3600_000);
    const row = await this.repo.insertShare(token, bookingId, actor.id, expires);
    await this.audit.record(actor, 'support.share', { targetType: 'booking', targetId: bookingId });
    return { token: row.token, expiresAt: row.expires_at.toISOString() };
  }

  async publicShare(token: string) {
    const row = await this.repo.shareByToken(token);
    if (!row || row.expires_at.getTime() < Date.now()) {
      throw new NotFoundException({ message_key: 'support.share_expired' });
    }
    const ended = row.journey_status === 'COMPLETED' || row.journey_status === 'CANCELLED'
      || row.journey_status === 'ABORTED';
    return {
      routeName: row.route_name_en,
      serviceDate: row.service_date,
      driverFirst: row.driver_first,
      lat: ended ? null : row.last_lat,
      lng: ended ? null : row.last_lng,
      ended,
    };
  }

  async queue(actor: Actor) {
    assertCan(actor.role as unknown as Role, Capability.SUPPORT_TICKETS);
    return (await this.repo.listOpen()).map((r) => this.toStaff(r));
  }

  async myTickets(actor: Actor) {
    assertCan(actor.role as unknown as Role, Capability.REPORT_PROBLEM);
    return (await this.repo.mine(actor.id)).map((r) => this.toPublic(r));
  }

  async startInvestigation(actor: Actor, id: string) {
    assertCan(actor.role as unknown as Role, Capability.SUPPORT_TICKETS);
    const cur = await this.repo.get(id);
    if (!cur) throw new NotFoundException({ message_key: 'support.not_found' });
    if (!canTransitionIncident(cur.status, 'INVESTIGATING')) {
      throw new ConflictException({ message_key: 'support.illegal_transition' });
    }
    const next = await this.repo.move(id, cur.status, 'INVESTIGATING');
    if (!next) throw new ConflictException({ message_key: 'support.illegal_transition' });
    await this.repo.appendEvent(id, 'investigating', {}, actor.id);
    await this.audit.record(actor, 'support.investigate', { targetType: 'incident', targetId: id });
    return this.toStaff(next);
  }

  async decide(actor: Actor, id: string, decision: string, reason: string) {
    assertCan(actor.role as unknown as Role, Capability.SUPPORT_TICKETS);
    const why = (reason || '').trim();
    if (why.length < 4) throw new BadRequestException({ message_key: 'support.reason_required' });
    const allowed = new Set(['no_action', 'warning', 'training', 'suspension', 'removal']);
    if (!allowed.has(decision)) throw new BadRequestException({ message_key: 'support.bad_decision' });
    const next = await this.repo.decide(id, decision, why, actor.id);
    if (!next) throw new ConflictException({ message_key: 'support.illegal_transition' });
    await this.repo.appendEvent(id, 'decided', { decision }, actor.id);
    await this.audit.record(actor, 'support.decide', {
      targetType: 'incident', targetId: id, after: { decision },
    });
    await this.notes.notify({
      userId: next.reporter_user_id, kind: 'incident_outcome',
      titleEn: 'Update on your report', titleAr: 'تحديث على بلاغك',
      bodyEn: 'A decision was recorded. Open Safety for the outcome.',
      bodyAr: 'سُجّل قرار. افتح الأمان لمعرفة النتيجة.',
      refType: 'incident', refId: next.id,
    });
    return this.toStaff(next);
  }

  private toPublic(r: {
    id: string; kind: string; category: string; severity: string; status: string;
    silent: boolean; created_at: Date; decision: string | null;
  }) {
    return {
      id: r.id, kind: r.kind, category: r.category, severity: r.severity,
      status: r.status, silent: r.silent, createdAt: r.created_at,
      decision: r.decision,
    };
  }

  private toStaff(r: Awaited<ReturnType<SupportRepository['get']>> & object) {
    if (!r) return r;
    return {
      ...this.toPublic(r),
      bookingId: r.booking_id,
      journeyId: r.journey_id,
      precautionary: r.precautionary_recommended,
      body: r.body,
      decisionReason: r.decision_reason,
    };
  }
}
