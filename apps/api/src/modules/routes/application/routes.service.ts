/* Routes service — application layer (P3.1 + P3.2). Rules live in domain/;
   persistence in infra/; authority via the single resolver. Distances come
   from geo's contract (one definition, §0.3). */
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONFIG, type Env } from '../../../config/env.js';
import { RoutesRepository } from '../infra/routes.repository.js';
import { AuditService } from '../../audit/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import { appendPosition, isValidInterval, reorderPositions } from '../domain/route.js';
import { generateSlotTimes } from '../domain/slot-grid.js';
import { distanceMeters } from '../../geo/contracts/public.js';
import type { Actor } from '../../identity/contracts/types.js';
import type { RouteRow, RouteStopRow, SlotRow } from '../contracts/types.js';

const ROUTE_CITY = 'ALX';
const KMH_TO_M_PER_MIN = (kmh: number) => (kmh * 1000) / 60;

@Injectable()
export class RoutesService {
  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly routes: RoutesRepository,
    private readonly audit: AuditService
  ) {}

  async createRoute(actor: Actor, input: {
    nameEn?: string; nameAr?: string; direction?: 'outbound' | 'inbound';
    fareMinor: number; windowStart: string; windowEnd: string; slotIntervalMin: number;
  }): Promise<RouteRow> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_ROUTES);
    if (!Number.isInteger(input.fareMinor) || input.fareMinor < 0) {
      throw new BadRequestException({ message_key: 'routes.bad_fare' });
    }
    if (!isValidInterval(input.slotIntervalMin)) {
      throw new BadRequestException({ message_key: 'routes.bad_interval' });
    }
    const grid = generateSlotTimes(input.windowStart, input.windowEnd, input.slotIntervalMin);
    if (!grid.ok) throw new BadRequestException({ message_key: 'routes.bad_window' });
    const codes = (await this.routes.list()).map((r) => r.code).sort();
    const lastSeq = Number(codes.at(-1)?.slice(-3) ?? 0) || 0;
    const code = `${ROUTE_CITY}-R${String(lastSeq + 1).padStart(3, '0')}`;
    const created = await this.routes.create({
      code, nameEn: input.nameEn ?? '', nameAr: input.nameAr ?? '',
      direction: input.direction ?? 'outbound', fareMinor: input.fareMinor,
      windowStart: input.windowStart, windowEnd: input.windowEnd,
      slotIntervalMin: input.slotIntervalMin, createdBy: actor.id,
    });
    await this.audit.record(actor, 'route.create', {
      targetType: 'route', targetId: created.id, after: { code, fareMinor: input.fareMinor },
    });
    return created;
  }

  async list(actor: Actor): Promise<RouteRow[]> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_ROUTES);
    return this.routes.list();
  }

  async get(actor: Actor, id: string): Promise<{ route: RouteRow; stops: RouteStopRow[] }> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_ROUTES);
    const route = await this.routes.findById(id);
    if (!route) throw new NotFoundException({ message_key: 'routes.not_found' });
    return { route, stops: await this.routes.stops(id) };
  }

  async publish(actor: Actor, id: string): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_ROUTES);
    const route = await this.routes.findById(id);
    if (!route) throw new NotFoundException({ message_key: 'routes.not_found' });
    const stops = await this.routes.stops(id);
    if (stops.length < 2) throw new ConflictException({ message_key: 'routes.need_two_stops' });
    await this.routes.setStatus(id, 'published');
    await this.audit.record(actor, 'route.publish', { targetType: 'route', targetId: id });
    return { ok: true };
  }

  /** Append a verified stop to the END (gapless by construction — the only
      writes are append and reorder). */
  async addStop(actor: Actor, routeId: string, stopId: string): Promise<RouteStopRow> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_ROUTES);
    const route = await this.routes.findById(routeId);
    if (!route) throw new NotFoundException({ message_key: 'routes.not_found' });
    if (route.status === 'published') throw new ConflictException({ message_key: 'routes.published_locked' });
    const existing = await this.routes.stops(routeId);
    const position = appendPosition(existing.length);
    const last = existing.at(-1);
    // distance to the new stop is computed by the repository re-join below
    const { distance, runMinutes } = last
      ? await this.distanceToNew(last, stopId)
      : { distance: 0, runMinutes: 0 };
    const added = await this.routes.addStop(routeId, stopId, position, distance, runMinutes);
    await this.recompute(routeId);
    return added;
  }

  /** Reorder: `orderedStopIds` must be exactly the existing stops; positions +
      cumulative distances are rewritten atomically. */
  async reorder(actor: Actor, routeId: string, orderedStopIds: string[]): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_ROUTES);
    const route = await this.routes.findById(routeId);
    if (!route) throw new NotFoundException({ message_key: 'routes.not_found' });
    if (route.status === 'published') throw new ConflictException({ message_key: 'routes.published_locked' });
    const existing = await this.routes.stops(routeId);
    const result = reorderPositions(existing.map((s) => s.stop_id), orderedStopIds);
    if (!result.ok) throw new ConflictException({ message_key: 'routes.not_a_permutation' });
    await this.recompute(routeId, orderedStopIds);
    return { ok: true };
  }

  /** Generate (idempotently) the slot grid for a date range — P3.2. */
  async generateSlots(actor: Actor, routeId: string, fromDate: string, toDate: string): Promise<{ generated: number }> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_ROUTES);
    const route = await this.routes.findById(routeId);
    if (!route) throw new NotFoundException({ message_key: 'routes.not_found' });
    const grid = generateSlotTimes(route.window_start, route.window_end, route.slot_interval_min);
    if (!grid.ok) throw new ConflictException({ message_key: 'routes.bad_window' });

    const today = new Date().toISOString().slice(0, 10);
    if (fromDate < today) throw new BadRequestException({ message_key: 'routes.slot_in_past' });

    const dates = dateRange(fromDate, toDate);
    let generated = 0;
    for (const date of dates) {
      for (const time of grid.times) {
        await this.routes.upsertSlot(routeId, date, time);
        generated++;
      }
    }
    await this.audit.record(actor, 'route.slots_generated', {
      targetType: 'route', targetId: routeId, after: { fromDate, toDate, days: dates.length },
    });
    return { generated };
  }

  async listSlots(actor: Actor, routeId: string, fromDate: string, toDate: string): Promise<SlotRow[]> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_ROUTES);
    return this.routes.listSlots(routeId, fromDate, toDate);
  }

  /** Published routes — the driver's "find work" board needs them; route
      existence is not secret, and claims are protected elsewhere. */
  async publishedRoutes(): Promise<RouteRow[]> {
    return (await this.routes.list()).filter((r) => r.status === 'published');
  }

  /** Slots for a route (driver-facing read — no auth; claims are protected). */
  async slotsForClaim(routeId: string, fromDate: string, toDate: string): Promise<SlotRow[]> {
    return this.routes.listSlots(routeId, fromDate, toDate);
  }

  /** Journeys (P3.3) needs a slot's route + departure. No auth here — this is
      an internal read through the contract, and slot existence is not secret. */
  async getSlotById(slotId: string): Promise<SlotRow | null> {
    return this.routes.findSlotById(slotId);
  }

  /** The departure instant of a slot, in the city's fixed offset (Alexandria =
      UTC+2, no DST — DEC-118 wall-clock). Returns null for a missing slot. */
  async slotDepartureInstant(slotId: string): Promise<Date | null> {
    const slot = await this.routes.findSlotById(slotId);
    if (!slot) return null;
    return new Date(`${slot.service_date}T${slot.departs_at}:00+02:00`);
  }

  // ── internals ───────────────────────────────────────────────────────────
  private speedMpm(): number {
    return KMH_TO_M_PER_MIN(this.env.ROUTE_SPEED_KMH);
  }

  private async distanceToNew(last: RouteStopRow, newStopId: string): Promise<{ distance: number; runMinutes: number }> {
    const newRow = await this.routes.stopLocation(newStopId);
    if (!newRow) throw new ConflictException({ message_key: 'routes.stop_not_found' });
    const d = distanceMeters(last.lat!, last.lng!, newRow.lat, newRow.lng);
    const distance = Math.round(last.distance_from_start_m + d);
    return { distance, runMinutes: Math.max(1, Math.round(distance / this.speedMpm())) };
  }

  /** Rewrite positions + cumulative distance/run-time for the route. With no
      `orderedStopIds`, the natural position order is used (append case). */
  private async recompute(routeId: string, orderedStopIds?: string[]): Promise<void> {
    const rows = await this.routes.stops(routeId);
    const byStop = new Map(rows.map((r) => [r.stop_id, r]));
    const order = orderedStopIds ?? rows.map((r) => r.stop_id);
    let cumulative = 0;
    const updates: Array<{ stopId: string; position: number; distanceM: number; runMinutes: number }> = [];
    order.forEach((stopId, i) => {
      const row = byStop.get(stopId);
      if (!row) return;
      if (i > 0) {
        const prev = byStop.get(order[i - 1]!)!;
        cumulative += distanceMeters(prev.lat!, prev.lng!, row.lat!, row.lng!);
      }
      const distanceM = Math.round(cumulative);
      updates.push({
        stopId,
        position: i + 1,
        distanceM,
        runMinutes: Math.max(1, Math.round(distanceM / this.speedMpm())),
      });
    });
    await this.routes.reorder(routeId, updates);
  }
}

/** Inclusive date range ["2026-08-19", "2026-08-25"] → array of dates. */
function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  if (isNaN(d.getTime()) || isNaN(end.getTime()) || d > end) return out;
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
