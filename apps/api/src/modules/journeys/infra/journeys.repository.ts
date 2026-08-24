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
              j.committed, j.seats_total, j.created_at, j.arrived_stop_index,
              j.last_lat, j.last_lng, j.last_position_at,
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
              j.committed, j.seats_total, j.created_at, j.arrived_stop_index,
              j.last_lat, j.last_lng, j.last_position_at,
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

  async setPosition(id: string, lat: number, lng: number): Promise<void> {
    await this.pool.query(
      `UPDATE journeys SET last_lat = $2, last_lng = $3, last_position_at = now(), updated_at = now()
       WHERE id = $1`, [id, lat, lng]);
  }

  async setArrivedIndex(id: string, index: number): Promise<void> {
    await this.pool.query(
      `UPDATE journeys SET arrived_stop_index = $2, updated_at = now() WHERE id = $1`, [id, index]);
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
              j.committed, j.seats_total, j.created_at, j.arrived_stop_index,
              j.last_lat, j.last_lng, j.last_position_at,
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

  /** Live fleet for the ops map (DEC-205 Path A): in-progress journeys with
      their route, ordered stops and last known position. Read-only. */
  async liveJourneys(): Promise<Array<{
    id: string; status: string; driver_user_id: string;
    last_lat: number | null; last_lng: number | null; last_position_at: Date | null;
    arrived_stop_index: number | null;
    route_id: string; route_code: string; route_name_en: string; route_name_ar: string;
    slot_date: string; slot_departs: string;
    stops: Array<{ stop_id: string; position: number; name_en: string; name_ar: string; lat: number; lng: number }>;
  }>> {
    const { rows } = await this.pool.query(`
      SELECT j.id, j.status, j.driver_user_id, j.last_lat, j.last_lng, j.last_position_at,
             j.arrived_stop_index, r.id AS route_id, r.code AS route_code,
             r.name_en AS route_name_en, r.name_ar AS route_name_ar,
             s.service_date::text AS slot_date, s.departs_at::text AS slot_departs
        FROM journeys j
        JOIN slots s ON s.id = j.slot_id
        JOIN routes r ON r.id = j.route_id
       WHERE j.status = 'IN_PROGRESS'
       ORDER BY s.service_date, s.departs_at`);
    const out = [];
    for (const j of rows) {
      const stops = await this.pool.query(`
        SELECT rs.stop_id, rs.position, st.name_en, st.name_ar, st.lat, st.lng
          FROM route_stops rs JOIN stops st ON st.id = rs.stop_id
         WHERE rs.route_id = $1 ORDER BY rs.position`, [j.route_id]);
      out.push({ ...j, stops: stops.rows });
    }
    return out;
  }
}
