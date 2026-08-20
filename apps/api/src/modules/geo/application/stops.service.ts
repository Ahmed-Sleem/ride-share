/* Stops service — application layer. Business rules (bounds, spacing, the
   two-person rule) live in domain/ and here; persistence in infra/. Authority
   is checked against the single resolver (§8.2). */
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONFIG, type Env } from '../../../config/env.js';
import { StopsRepository } from '../infra/stops.repository.js';
import { AuditService } from '../../audit/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import { isWithinBounds, nextStopCode, spacingCheck, type StopStatus } from '../domain/stop.js';
import { distanceMeters } from '../domain/geo-math.js';
import type { Actor } from '../../identity/contracts/types.js';
import type { StopRow } from '../contracts/types.js';

const STOP_CITY = 'ALX';
const STOP_ZONE = 'COR'; // the launch corridor — a real zone per corridor comes with P2.5

@Injectable()
export class StopsService {
  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly stops: StopsRepository,
    private readonly audit: AuditService
  ) {}

  /** Create a candidate stop (desk or field). Only operations/manager/super
      admin may create stops; a second stop within MinStopSpacing requires an
      explicit override + reason (P2.2 duplicate guard). */
  async createStop(actor: Actor, input: {
    nameEn?: string; nameAr?: string; lat: number; lng: number;
    source: 'desk' | 'field'; overrideReason?: string | null;
  }): Promise<StopRow> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    if (!isWithinBounds(input.lat, input.lng)) {
      throw new ConflictException({ message_key: 'geo.coordinates_out_of_bounds' });
    }
    const box = await this.stops.candidatesInBox(input.lat, input.lng, this.env.STOP_MIN_SPACING_M * 2);
    const check = spacingCheck(input.lat, input.lng, box.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng })), this.env.STOP_MIN_SPACING_M);
    if (!check.ok && !input.overrideReason) {
      throw new ConflictException({
        message_key: 'geo.stop_too_close',
        details: { nearestId: check.nearestId, distanceM: Math.round(check.nearestDistanceM ?? 0) },
      });
    }
    const last = (await this.stops.listByStatus(['draft', 'pending', 'verified', 'rejected', 'retired']))
      .map((s) => s.code).sort().pop() ?? null;
    const code = nextStopCode(STOP_CITY, STOP_ZONE, last);
    const created = await this.stops.create({
      code,
      nameEn: input.nameEn ?? '',
      nameAr: input.nameAr ?? '',
      lat: input.lat,
      lng: input.lng,
      source: input.source,
      createdBy: actor.id,
      overrideReason: input.overrideReason ?? null,
    });
    await this.audit.record(actor, 'stop.create', {
      targetType: 'stop', targetId: created.id,
      after: { code: created.code, lat: created.lat, lng: created.lng, source: created.source },
      reason: input.overrideReason,
    });
    return created;
  }

  /** Public nearest verified stops, sorted by distance (P2.4 — verified only). */
  async verifiedNear(lat: number, lng: number, radiusM: number, limit = 20): Promise<Array<StopRow & { distanceM: number }>> {
    const candidates = await this.stops.verifiedInBox(lat, lng, radiusM);
    return candidates
      .map((s) => ({ ...s, distanceM: distanceMeters(lat, lng, s.lat, s.lng) }))
      .filter((s) => s.distanceM <= radiusM)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, limit);
  }

  async list(actor: Actor, statuses?: StopStatus[]): Promise<StopRow[]> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    return this.stops.listByStatus(statuses ?? ['draft', 'pending', 'verified', 'rejected', 'retired']);
  }

  /** Desk review → verified/rejected. Two-person rule (P2.4): the author of
      the stop may never verify it themselves. */
  async reviewStop(actor: Actor, id: string, decision: 'approved' | 'rejected', reason?: string | null): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    const stop = await this.stops.findById(id);
    if (!stop) throw new NotFoundException({ message_key: 'geo.stop_not_found' });
    if (decision === 'rejected' && !reason) {
      throw new ForbiddenException({ message_key: 'geo.rejection_requires_reason' });
    }
    if (stop.created_by === actor.id && decision === 'approved') {
      throw new ForbiddenException({ message_key: 'geo.cannot_self_verify' });
    }
    await this.stops.setStatus(id, decision === 'approved' ? 'verified' : 'rejected');
    await this.stops.appendVerification({
      stopId: id, verifierId: actor.id, decision, reason,
    });
    await this.audit.record(actor, `stop.${decision}`, {
      targetType: 'stop', targetId: id, after: { status: decision === 'approved' ? 'verified' : 'rejected' }, reason,
    });
    return { ok: true };
  }
}
