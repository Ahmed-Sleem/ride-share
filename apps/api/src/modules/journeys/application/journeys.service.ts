/* Journeys service — application layer (P3.3). The claim is the act that
   creates a journey (DEC-132). Race-safety lives in the database (UNIQUE
   slot_id); the service maps the 23505 violation to a clear refusal. The
   two-taps rule is honoured: pick a route → pick a slot → confirm. */
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONFIG, type Env } from '../../../config/env.js';
import { JourneysRepository } from '../infra/journeys.repository.js';
import { RoutesService } from '../../routes/contracts/public.js';
import { DriversService } from '../../drivers/contracts/public.js';
import { AuditService } from '../../audit/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import { assertJourneyTransition } from '../domain/journey.js';
import { exceedsMaxSlip, nextStopAfter, plannedArrival, slipMinutes, type PlannedStop } from '../domain/slip.js';
import type { Actor } from '../../identity/contracts/types.js';
import type { JourneyRow } from '../contracts/types.js';

@Injectable()
export class JourneysService {
  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly journeys: JourneysRepository,
    private readonly routes: RoutesService,
    private readonly drivers: DriversService,
    private readonly audit: AuditService,
  ) {}

  /** Claim a published slot (creates the journey in CLAIMED). Requires an
      approved driver + their own approved vehicle (P1.8). Race-safe: two
      drivers on the same slot → one claim, one clear refusal. */
  async claimSlot(actor: Actor, slotId: string, vehicleId: string, committed = true): Promise<JourneyRow> {
    assertCan(actor.role as unknown as Role, Capability.CLAIM_SLOT);
    await this.drivers.assertApprovedDriverWithVehicle(actor.id, vehicleId);

    const slot = await this.routes.getSlotById(slotId);
    if (!slot) throw new NotFoundException({ message_key: 'journeys.slot_not_found' });
    const departs = await this.routes.slotDepartureInstant(slotId);
    if (departs && departs.getTime() < Date.now()) {
      throw new ConflictException({ message_key: 'journeys.slot_in_past' });
    }

    try {
      const journey = await this.journeys.claim({
        routeId: slot.route_id, slotId, driverUserId: actor.id, vehicleId,
        committed, seatsTotal: this.env.VEHICLE_SEATS,
      });
      await this.audit.record(actor, 'journey.claim', {
        targetType: 'journey', targetId: journey.id, after: { slotId, committed },
      });
      return this.journeys.findById(journey.id) as Promise<JourneyRow>;
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException({ message_key: 'journeys.slot_claimed' });
      }
      throw e;
    }
  }

  /** Release a claim (→ CANCELLED). Refused inside the lock window before
      departure (MinClaimLeadMinutes) — P3.3 test 4. */
  async releaseClaim(actor: Actor, journeyId: string): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.CLAIM_SLOT);
    const journey = await this.journeys.findById(journeyId);
    if (!journey) throw new NotFoundException({ message_key: 'journeys.not_found' });
    if (journey.driver_user_id !== actor.id) {
      throw new ForbiddenException({ message_key: 'journeys.not_yours' });
    }
    if (journey.status !== 'CLAIMED' && journey.status !== 'OPEN_FOR_BOOKING') {
      throw new ConflictException({ message_key: 'journeys.cannot_release', details: { status: journey.status } });
    }
    const departs = await this.routes.slotDepartureInstant(journey.slot_id);
    if (departs) {
      const leadMs = this.env.MIN_CLAIM_LEAD_MINUTES * 60_000;
      if (departs.getTime() - Date.now() < leadMs) {
        throw new ConflictException({ message_key: 'journeys.lock_window_closed' });
      }
    }
    await this.journeys.cancel(journeyId);
    await this.audit.record(actor, 'journey.release', { targetType: 'journey', targetId: journeyId });
    return { ok: true };
  }

  /** Rider-facing departures (P3.6): bookable journeys on a route with their
      departure instant, filtered to those that have not departed. */
  async upcomingForRiders(routeId: string | null, from: string, to: string): Promise<Array<JourneyRow & { departs: string }>> {
    const rows = await this.journeys.byRouteAndWindow(routeId, from, to);
    const out: Array<JourneyRow & { departs: string }> = [];
    for (const row of rows) {
      const departs = await this.routes.slotDepartureInstant(row.slot_id);
      if (!departs || departs.getTime() <= Date.now()) continue;
      if (row.status !== 'CLAIMED' && row.status !== 'OPEN_FOR_BOOKING') continue;
      out.push({ ...row, departs: departs.toISOString() });
    }
    return out;
  }

  /** A journey a rider may book (P3.6): exists, bookable status, in the future. */
  async getForBooking(journeyId: string): Promise<JourneyRow> {
    const journey = await this.journeys.findById(journeyId);
    if (!journey) throw new NotFoundException({ message_key: 'journeys.not_found' });
    if (journey.status !== 'CLAIMED' && journey.status !== 'OPEN_FOR_BOOKING') {
      throw new ConflictException({ message_key: 'journeys.not_bookable', details: { status: journey.status } });
    }
    const departs = await this.routes.slotDepartureInstant(journey.slot_id);
    if (departs && departs.getTime() <= Date.now()) {
      throw new ConflictException({ message_key: 'journeys.departed' });
    }
    return journey;
  }

  async getById(id: string): Promise<JourneyRow | null> {
    return this.journeys.findById(id);
  }

  /** The driver's own journeys (duty board). */
  async myJourneys(actor: Actor): Promise<JourneyRow[]> {
    assertCan(actor.role as unknown as Role, Capability.CLAIM_SLOT);
    return this.journeys.byDriver(actor.id);
  }

  /** The "find work" board: published routes, their future slots, and which
      are claimed / claimed-by-me — the driver's two-taps entry point. */
  async availableWork(actor: Actor, fromDate: string, toDate: string): Promise<Array<{
    route: { id: string; code: string; nameEn: string; nameAr: string; fareMinor: number };
    slots: Array<{ id: string; serviceDate: string; departsAt: string; claimed: boolean; mine: boolean }>;
  }>> {
    assertCan(actor.role as unknown as Role, Capability.CLAIM_SLOT);
    const routes = await this.routes.publishedRoutes();
    const mine = (await this.journeys.byDriver(actor.id))
      .filter((j) => j.status !== 'CANCELLED')
      .map((j) => j.slot_id);
    const out = [];
    for (const route of routes) {
      const slots = await this.routes.slotsForClaim(route.id, fromDate, toDate);
      const claimed = new Set(await this.journeys.claimedSlotIds(slots.map((s) => s.id)));
      out.push({
        route: { id: route.id, code: route.code, nameEn: route.name_en, nameAr: route.name_ar, fareMinor: route.fare_minor },
        slots: slots.map((s) => ({
          id: s.id, serviceDate: s.service_date, departsAt: s.departs_at,
          claimed: claimed.has(s.id), mine: mine.includes(s.id),
        })),
      });
    }
    return out;
  }

  /** Open a claimed journey for booking (the driver signals readiness). */
  async openForBooking(actor: Actor, journeyId: string): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.CLAIM_SLOT);
    const journey = await this.journeys.findById(journeyId);
    if (!journey) throw new NotFoundException({ message_key: 'journeys.not_found' });
    if (journey.driver_user_id !== actor.id) throw new ForbiddenException({ message_key: 'journeys.not_yours' });
    assertJourneyTransition(journey.status, 'OPEN_FOR_BOOKING');
    await this.journeys.setStatus(journeyId, 'OPEN_FOR_BOOKING');
    await this.audit.record(actor, 'journey.open', { targetType: 'journey', targetId: journeyId });
    return { ok: true };
  }

  private async ownDuty(actor: Actor, journeyId: string) {
    assertCan(actor.role as unknown as Role, Capability.RUN_DUTY);
    const journey = await this.journeys.findById(journeyId);
    if (!journey) throw new NotFoundException({ message_key: 'journeys.not_found' });
    if (journey.driver_user_id !== actor.id) {
      throw new ForbiddenException({ message_key: 'journeys.not_yours' });
    }
    return journey;
  }

  async start(actor: Actor, journeyId: string): Promise<{ ok: true }> {
    const journey = await this.ownDuty(actor, journeyId);
    let from = journey.status;
    if (from === 'OPEN_FOR_BOOKING') {
      assertJourneyTransition('OPEN_FOR_BOOKING', 'LOCKED');
      await this.journeys.setStatus(journeyId, 'LOCKED');
      from = 'LOCKED';
    }
    assertJourneyTransition(from, 'IN_PROGRESS');
    await this.journeys.setStatus(journeyId, 'IN_PROGRESS');
    await this.audit.record(actor, 'journey.start', { targetType: 'journey', targetId: journeyId });
    return { ok: true };
  }

  async complete(actor: Actor, journeyId: string): Promise<{ ok: true }> {
    const journey = await this.ownDuty(actor, journeyId);
    assertJourneyTransition(journey.status, 'COMPLETED');
    await this.journeys.setStatus(journeyId, 'COMPLETED');
    await this.audit.record(actor, 'journey.complete', { targetType: 'journey', targetId: journeyId });
    return { ok: true };
  }

  async abort(actor: Actor, journeyId: string, reason: string): Promise<{ ok: true }> {
    const journey = await this.ownDuty(actor, journeyId);
    const to = journey.status === 'IN_PROGRESS' ? 'ABORTED' : 'CANCELLED';
    assertJourneyTransition(journey.status, to);
    await this.journeys.setStatus(journeyId, to);
    await this.audit.record(actor, 'journey.abort', {
      targetType: 'journey', targetId: journeyId, after: { to, reason },
    });
    return { ok: true };
  }

  async position(
    actor: Actor,
    journeyId: string,
    input: number | { lat?: number; lng?: number; points?: Array<{ lat?: number; lng?: number }> },
    lngMaybe?: number,
  ): Promise<{ ok: true; applied: number }> {
    const journey = await this.ownDuty(actor, journeyId);
    if (journey.status !== 'IN_PROGRESS') {
      throw new ConflictException({ message_key: 'journeys.not_in_progress' });
    }
    const pts: Array<{ lat: number; lng: number }> = [];
    if (typeof input === 'number') {
      if (Number.isFinite(input) && Number.isFinite(lngMaybe)) pts.push({ lat: input, lng: lngMaybe as number });
    } else {
      const extra = Array.isArray(input?.points) ? input.points : [];
      for (const p of extra) {
        if (p && Number.isFinite(p.lat) && Number.isFinite(p.lng)) pts.push({ lat: p.lat as number, lng: p.lng as number });
      }
      if (!pts.length && Number.isFinite(input?.lat) && Number.isFinite(input?.lng)) {
        pts.push({ lat: input.lat as number, lng: input.lng as number });
      }
    }
    const last = pts[pts.length - 1];
    if (!last) throw new ConflictException({ message_key: 'journeys.bad_position' });
    await this.journeys.setPosition(journeyId, last.lat, last.lng);
    return { ok: true, applied: pts.length };
  }

  async arriveNext(actor: Actor, journeyId: string): Promise<{ ok: true; arrivedIndex: number }> {
    const journey = await this.ownDuty(actor, journeyId);
    if (journey.status !== 'IN_PROGRESS') {
      throw new ConflictException({ message_key: 'journeys.not_in_progress' });
    }
    const next = await this.nextStopInfo(journey);
    if (next.exceedsSlip) {
      throw new ConflictException({ message_key: 'journeys.over_slip' });
    }
    const idx = next.stop ? next.stop.position : (journey.arrived_stop_index ?? 0);
    await this.journeys.setArrivedIndex(journeyId, idx);
    await this.audit.record(actor, 'journey.arrive', { targetType: 'journey', targetId: journeyId, after: { idx } });
    return { ok: true, arrivedIndex: idx };
  }

  async progress(actor: Actor, journeyId: string) {
    const journey = await this.ownDuty(actor, journeyId);
    return this.nextStopInfo(journey);
  }

  async progressForRider(booking: { journey_id: string; boarding_stop_id: string; code: string; status: string }) {
    const journey = await this.journeys.findById(booking.journey_id);
    if (!journey) throw new NotFoundException({ message_key: 'journeys.not_found' });
    const info = await this.nextStopInfo(journey);
    const arriving = journey.status === 'IN_PROGRESS' && info.stop?.stopId === booking.boarding_stop_id;
    return { journey, ...info, arriving, code: booking.code, bookingStatus: booking.status };
  }

  private async nextStopInfo(journey: JourneyRow) {
    const rows = await this.routes.stopsOnRoute(journey.route_id);
    const planned: PlannedStop[] = rows.map((s) => ({
      stopId: s.stop_id, position: s.position, runMinutes: s.run_minutes,
      nameEn: s.stop_name_en ?? '', nameAr: s.stop_name_ar ?? '',
    }));
    const stop = nextStopAfter(planned, journey.arrived_stop_index ?? 0);
    const departs = await this.routes.slotDepartureInstant(journey.slot_id);
    let slip = 0;
    if (stop && departs) {
      slip = slipMinutes(plannedArrival(departs, stop.runMinutes), new Date());
    }
    const max = this.env.MAX_SCHEDULE_SLIP_MIN;
    const lastAt = journey.last_position_at ? new Date(journey.last_position_at).getTime() : NaN;
    const gapSeconds = Number.isFinite(lastAt) ? Math.max(0, Math.round((Date.now() - lastAt) / 1000)) : null;
    const staleAfter = this.env.POSITION_STALE_SEC ?? 90;
    return {
      stop,
      slipMinutes: slip,
      maxSlip: max,
      exceedsSlip: exceedsMaxSlip(slip, max),
      status: journey.status,
      lastLat: journey.last_lat ?? null,
      lastLng: journey.last_lng ?? null,
      lastPositionAt: journey.last_position_at ?? null,
      gapSeconds,
      stale: gapSeconds !== null && gapSeconds > staleAfter,
      staleAfter,
    };
  }
}

/** PostgreSQL UNIQUE violation (23505) → the slot is already claimed. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
}
