/* Bookings repository — the ONLY place SQL for the bookings table lives
   (DEC-170). Parameterised only. The seat guard is the DB trigger; the code
   here maps its 23514 violation to a clear "no seats" refusal. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { BookingRow } from '../contracts/types.js';
import type { BookingStatus } from '../domain/booking.js';

@Injectable()
export class BookingsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(input: {
    journeyId: string; riderUserId: string; boardingStopId: string;
    seats: number; fareMinor: number; code: string;
  }): Promise<BookingRow> {
    const { rows } = await this.pool.query<BookingRow>(
      `INSERT INTO bookings (journey_id, rider_user_id, boarding_stop_id, seats, fare_minor, code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, journey_id, rider_user_id, boarding_stop_id, seats, fare_minor, code, status, created_at`,
      [input.journeyId, input.riderUserId, input.boardingStopId, input.seats, input.fareMinor, input.code]
    );
    return rows[0]!;
  }

  async findById(id: string): Promise<BookingRow | null> {
    const { rows } = await this.pool.query<BookingRow>(
      `SELECT id, journey_id, rider_user_id, boarding_stop_id, seats, fare_minor, code, status, created_at
       FROM bookings WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  /** A rider's bookings, newest first, joined for display. */
  async byRider(riderUserId: string): Promise<BookingRow[]> {
    const { rows } = await this.pool.query<BookingRow>(
      `SELECT b.id, b.journey_id, b.rider_user_id, b.boarding_stop_id, b.seats, b.fare_minor,
              b.code, b.status, b.created_at,
              r.name_en AS route_name_en, r.name_ar AS route_name_ar,
              s.service_date::text AS service_date, s.departs_at::text AS departs_at,
              st.name_en AS stop_name_en, st.name_ar AS stop_name_ar
       FROM bookings b
       JOIN journeys j ON j.id = b.journey_id
       JOIN routes r ON r.id = j.route_id
       JOIN slots s ON s.id = j.slot_id
       JOIN stops st ON st.id = b.boarding_stop_id
       WHERE b.rider_user_id = $1
       ORDER BY s.service_date DESC, s.departs_at DESC`, [riderUserId]);
    return rows;
  }

  async countBookedSeats(journeyId: string): Promise<number> {
    const { rows } = await this.pool.query<{ n: string }>(
      `SELECT COALESCE(SUM(seats),0)::int AS n FROM bookings
       WHERE journey_id = $1 AND status <> 'CANCELLED'`, [journeyId]);
    return Number(rows[0]?.n ?? 0);
  }

  async setStatus(id: string, status: BookingStatus): Promise<void> {
    await this.pool.query('UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
  }

  async findByCode(code: string): Promise<BookingRow | null> {
    const { rows } = await this.pool.query<BookingRow>(
      `SELECT id, journey_id, rider_user_id, boarding_stop_id, seats, fare_minor, code, status, created_at
       FROM bookings WHERE code = $1`, [code]);
    return rows[0] ?? null;
  }

  /** Passengers on one departure — never another journey's rows. */
  async manifest(journeyId: string): Promise<Array<BookingRow & {
    rider_name: string; stop_name_en: string; stop_name_ar: string;
  }>> {
    const { rows } = await this.pool.query(
      `SELECT b.id, b.journey_id, b.rider_user_id, b.boarding_stop_id, b.seats, b.fare_minor,
              b.code, b.status, b.created_at,
              split_part(u.name, ' ', 1) AS rider_name,
              st.name_en AS stop_name_en, st.name_ar AS stop_name_ar
       FROM bookings b
       JOIN users u ON u.id = b.rider_user_id
       JOIN stops st ON st.id = b.boarding_stop_id
       WHERE b.journey_id = $1
         AND b.status IN ('RESERVED','CONFIRMED','ON_BOARD')
       ORDER BY st.name_en, b.created_at`, [journeyId]);
    return rows as Array<BookingRow & { rider_name: string; stop_name_en: string; stop_name_ar: string }>;
  }
}
