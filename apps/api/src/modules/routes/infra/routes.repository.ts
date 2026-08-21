/* Routes repository — the ONLY place SQL for routes/route_stops/slots lives
   (DEC-170). Parameterised queries only. Reordering rewrites positions in one
   transaction so a failure mid-way can never leave a gap. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { RouteDirection, RouteRow, RouteStopRow, RouteStatus, SlotRow } from '../contracts/types.js';

@Injectable()
export class RoutesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(input: {
    code: string; nameEn: string; nameAr: string; direction: RouteDirection;
    fareMinor: number; windowStart: string; windowEnd: string; slotIntervalMin: number;
    createdBy: string | null;
  }): Promise<RouteRow> {
    const { rows } = await this.pool.query<RouteRow>(
      `INSERT INTO routes (code, name_en, name_ar, direction, fare_minor, window_start, window_end, slot_interval_min, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, code, name_en, name_ar, status, direction, fare_minor, window_start, window_end, slot_interval_min, created_by, created_at`,
      [input.code, input.nameEn, input.nameAr, input.direction, input.fareMinor,
       input.windowStart, input.windowEnd, input.slotIntervalMin, input.createdBy]
    );
    return rows[0]!;
  }

  async findById(id: string): Promise<RouteRow | null> {
    const { rows } = await this.pool.query<RouteRow>(
      `SELECT id, code, name_en, name_ar, status, direction, fare_minor, window_start, window_end, slot_interval_min, created_by, created_at
       FROM routes WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async list(): Promise<RouteRow[]> {
    const { rows } = await this.pool.query<RouteRow>(
      `SELECT id, code, name_en, name_ar, status, direction, fare_minor, window_start, window_end, slot_interval_min, created_by, created_at
       FROM routes ORDER BY created_at DESC`);
    return rows;
  }

  async setStatus(id: string, status: RouteStatus): Promise<void> {
    await this.pool.query('UPDATE routes SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
  }

  async countStops(routeId: string): Promise<number> {
    const { rows } = await this.pool.query<{ n: string }>(
      'SELECT count(*)::int AS n FROM route_stops WHERE route_id = $1', [routeId]);
    return Number(rows[0]?.n ?? 0);
  }

  async addStop(routeId: string, stopId: string, position: number,
    distanceFromStartM: number, runMinutes: number): Promise<RouteStopRow> {
    const { rows } = await this.pool.query<RouteStopRow>(
      `INSERT INTO route_stops (route_id, stop_id, position, distance_from_start_m, run_minutes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, route_id, stop_id, position, distance_from_start_m, run_minutes`,
      [routeId, stopId, position, distanceFromStartM, runMinutes]);
    return rows[0]!;
  }

  /** The ordered, joined stop sequence of a route (with coordinates). */
  async stops(routeId: string): Promise<RouteStopRow[]> {
    const { rows } = await this.pool.query<RouteStopRow>(
      `SELECT rs.id, rs.route_id, rs.stop_id, rs.position, rs.distance_from_start_m, rs.run_minutes,
              s.code AS stop_code, s.name_en AS stop_name_en, s.name_ar AS stop_name_ar,
              s.lat, s.lng
       FROM route_stops rs JOIN stops s ON s.id = rs.stop_id
       WHERE rs.route_id = $1 ORDER BY rs.position ASC`, [routeId]);
    return rows;
  }

  /** The coordinates of one verified stop (for cumulative-distance math). */
  async stopLocation(stopId: string): Promise<{ lat: number; lng: number } | null> {
    const { rows } = await this.pool.query<{ lat: number; lng: number }>(
      'SELECT lat, lng FROM stops WHERE id = $1', [stopId]);
    return rows[0] ?? null;
  }

  /** Rewrite positions + cumulative distance/run-time in ONE transaction. */
  async reorder(routeId: string, positions: Array<{ stopId: string; position: number; distanceM: number; runMinutes: number }>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const p of positions) {
        await client.query(
          `UPDATE route_stops SET position = $1, distance_from_start_m = $2, run_minutes = $3
           WHERE route_id = $4 AND stop_id = $5`,
          [p.position, p.distanceM, p.runMinutes, routeId, p.stopId]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /** Idempotent slot upsert — regenerating a day never duplicates. */
  async upsertSlot(routeId: string, serviceDate: string, departsAt: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO slots (route_id, service_date, departs_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (route_id, service_date, departs_at) DO NOTHING`,
      [routeId, serviceDate, departsAt]
    );
  }

  async listSlots(routeId: string, fromDate: string, toDate: string): Promise<SlotRow[]> {
    const { rows } = await this.pool.query<SlotRow>(
      `SELECT id, route_id, service_date::text AS service_date, departs_at::text AS departs_at, required_vehicles, created_at
       FROM slots
       WHERE route_id = $1 AND service_date BETWEEN $2::date AND $3::date
       ORDER BY service_date ASC, departs_at ASC`,
      [routeId, fromDate, toDate]
    );
    return rows;
  }

  /** For the retire guard on the geo side: is this stop on a published route? */
  async publishedRoutesForStop(stopId: string): Promise<RouteRow[]> {
    const { rows } = await this.pool.query<RouteRow>(
      `SELECT DISTINCT r.id, r.code, r.name_en, r.name_ar, r.status, r.direction, r.fare_minor,
              r.window_start, r.window_end, r.slot_interval_min, r.created_by, r.created_at
       FROM route_stops rs JOIN routes r ON r.id = rs.route_id
       WHERE rs.stop_id = $1 AND r.status = 'published'`, [stopId]);
    return rows;
  }
}
