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
import type { Actor } from '../../identity/contracts/types.js';
import type { JourneyRow } from '../contracts/types.js';

@Injectable()
export class JourneysService {
  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly journeys: JourneysRepository,
    private readonly routes: RoutesService,
    private readonly drivers: DriversService,
    private readonly audit: AuditService
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
}

/** PostgreSQL UNIQUE violation (23505) → the slot is already claimed. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
}
