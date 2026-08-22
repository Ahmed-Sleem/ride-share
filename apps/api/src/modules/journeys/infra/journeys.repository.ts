/* Journeys repository — the ONLY place SQL for the journeys table lives
   (DEC-170). Parameterised only. The claim's race-safety is the UNIQUE slot_id
   constraint; the caller maps the 23505 violation to a clear refusal. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { JourneyRow } from '../contracts/types.js';
import type { JourneyStatus } from '../domain/journey.js';

@Injectable()
export class JourneysRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async claim(input: {
    routeId: string; slotId: string; driverUserId: string; vehicleId: string;
    committed: boolean; seatsTotal: number;
  }): Promise<JourneyRow> {
    const { rows } = await this.pool.query<JourneyRow>(
      `INSERT INTO journeys (route_id, slot_id, driver_user_id, vehicle_id, committed, seats_total)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, route_id, slot_id, driver_user_id, vehicle_id, status, committed, seats_total, created_at`,
      [input.routeId, input.slotId, input.driverUserId, input.vehicleId, input.committed, input.seatsTotal]
    );
    return rows[0]!;
  }

  async findById(id: string): Promise<JourneyRow | null> {
    const { rows } = await this.pool.query<JourneyRow>(
      `SELECT j.id, j.route_id, j.slot_id, j.driver_user_id, j.vehicle_id, j.status,
              j.committed, j.seats_total, j.created_at,
              r.code AS route_code, r.name_en AS route_name_en, r.name_ar AS route_name_ar,
              s.service_date::text AS service_date, s.departs_at::text AS departs_at
       FROM journeys j
       JOIN routes r ON r.id = j.route_id
       JOIN slots s ON s.id = j.slot_id
       WHERE j.id = $1`, [id]);
    return rows[0] ?? null;
  }

  async byDriver(driverUserId: string): Promise<JourneyRow[]> {
    const { rows } = await this.pool.query<JourneyRow>(
      `SELECT j.id, j.route_id, j.slot_id, j.driver_user_id, j.vehicle_id, j.status,
              j.committed, j.seats_total, j.created_at,
              r.code AS route_code, r.name_en AS route_name_en, r.name_ar AS route_name_ar,
              s.service_date::text AS service_date, s.departs_at::text AS departs_at
       FROM journeys j
       JOIN routes r ON r.id = j.route_id
       JOIN slots s ON s.id = j.slot_id
       WHERE j.driver_user_id = $1
       ORDER BY s.service_date DESC, s.departs_at DESC`, [driverUserId]);
    return rows;
  }

  async setStatus(id: string, status: JourneyStatus): Promise<void> {
    await this.pool.query('UPDATE journeys SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
  }

  /** Release = CANCELLED before departure (the only "un-claim" in the slice). */
  async cancel(id: string): Promise<void> {
    await this.pool.query("UPDATE journeys SET status = 'CANCELLED', updated_at = now() WHERE id = $1", [id]);
  }

  /** Journeys on a route within a service-date window (joined route + slot). */
  async byRouteAndWindow(routeId: string | null, from: string, to: string): Promise<JourneyRow[]> {
    const params: unknown[] = [];
    let where = 'j.status IN (\'CLAIMED\',\'OPEN_FOR_BOOKING\',\'LOCKED\',\'IN_PROGRESS\') AND s.service_date BETWEEN $1::date AND $2::date';
    params.push(from, to);
    if (routeId) { where += ' AND j.route_id = $3'; params.push(routeId); }
    const { rows } = await this.pool.query<JourneyRow>(
      `SELECT j.id, j.route_id, j.slot_id, j.driver_user_id, j.vehicle_id, j.status,
              j.committed, j.seats_total, j.created_at,
              r.code AS route_code, r.name_en AS route_name_en, r.name_ar AS route_name_ar,
              s.service_date::text AS service_date, s.departs_at::text AS departs_at
       FROM journeys j
       JOIN routes r ON r.id = j.route_id
       JOIN slots s ON s.id = j.slot_id
       WHERE ${where}
       ORDER BY s.service_date ASC, s.departs_at ASC`,
      params
    );
    return rows;
  }

  /** Which of these slots are already claimed (the driver board's "taken" state). */
  async claimedSlotIds(slotIds: string[]): Promise<string[]> {
    if (!slotIds.length) return [];
    const { rows } = await this.pool.query<{ slot_id: string }>(
      `SELECT slot_id FROM journeys WHERE slot_id = ANY($1::uuid[]) AND status <> 'CANCELLED'`,
      [slotIds]
    );
    return rows.map((r) => r.slot_id);
  }
}
