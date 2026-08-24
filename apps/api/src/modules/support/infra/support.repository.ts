/* Support repository — the ONLY SQL for incidents / share links. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { IncidentKind, IncidentSeverity, IncidentStatus } from '../domain/incidents.js';

export interface IncidentRow {
  id: string;
  kind: IncidentKind;
  category: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reporter_user_id: string;
  subject_user_id: string | null;
  booking_id: string | null;
  journey_id: string | null;
  body: string | null;
  silent: boolean;
  lat: number | null;
  lng: number | null;
  decision: string | null;
  decision_reason: string | null;
  decided_by: string | null;
  decided_at: Date | null;
  precautionary_recommended: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ShareLinkRow {
  id: string;
  token: string;
  booking_id: string;
  rider_user_id: string;
  expires_at: Date;
  created_at: Date;
}

@Injectable()
export class SupportRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async insertIncident(input: {
    kind: IncidentKind;
    category: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    reporterUserId: string;
    subjectUserId: string | null;
    bookingId: string | null;
    journeyId: string | null;
    body: string | null;
    silent: boolean;
    lat: number | null;
    lng: number | null;
    precautionary: boolean;
  }): Promise<IncidentRow> {
    const { rows } = await this.pool.query<IncidentRow>(
      `INSERT INTO incidents
         (kind, category, severity, status, reporter_user_id, subject_user_id,
          booking_id, journey_id, body, silent, lat, lng, precautionary_recommended)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        input.kind, input.category, input.severity, input.status,
        input.reporterUserId, input.subjectUserId, input.bookingId, input.journeyId,
        input.body, input.silent, input.lat, input.lng, input.precautionary,
      ],
    );
    return rows[0]!;
  }

  async appendEvent(incidentId: string, type: string, payload: unknown, actorId: string | null) {
    await this.pool.query(
      `INSERT INTO incident_events (incident_id, type, payload, actor_id)
       VALUES ($1,$2,$3::jsonb,$4)`,
      [incidentId, type, JSON.stringify(payload ?? {}), actorId],
    );
  }

  async get(id: string): Promise<IncidentRow | null> {
    const { rows } = await this.pool.query<IncidentRow>(
      'SELECT * FROM incidents WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async listOpen(): Promise<IncidentRow[]> {
    const { rows } = await this.pool.query<IncidentRow>(
      `SELECT * FROM incidents
       WHERE status <> 'FOLLOWED_UP'
       ORDER BY
         CASE severity WHEN 'severe' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         created_at ASC
       LIMIT 200`,
    );
    return rows;
  }

  async mine(userId: string): Promise<IncidentRow[]> {
    const { rows } = await this.pool.query<IncidentRow>(
      `SELECT * FROM incidents WHERE reporter_user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    return rows;
  }

  async decide(id: string, decision: string, reason: string, actorId: string): Promise<IncidentRow | null> {
    const { rows } = await this.pool.query<IncidentRow>(
      `UPDATE incidents
          SET status = 'DECIDED', decision = $2, decision_reason = $3,
              decided_by = $4, decided_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'INVESTIGATING'
        RETURNING *`,
      [id, decision, reason, actorId],
    );
    return rows[0] ?? null;
  }

  async move(id: string, from: IncidentStatus, to: IncidentStatus): Promise<IncidentRow | null> {
    const { rows } = await this.pool.query<IncidentRow>(
      `UPDATE incidents SET status = $3, updated_at = now()
        WHERE id = $1 AND status = $2
        RETURNING *`,
      [id, from, to],
    );
    return rows[0] ?? null;
  }

  async bookingOwner(bookingId: string): Promise<{
    id: string; rider_user_id: string; journey_id: string; status: string;
    route_name_en: string | null; service_date: string | null; departs_at: string | null;
    driver_user_id: string | null;
  } | null> {
    const { rows } = await this.pool.query(
      `SELECT b.id, b.rider_user_id, b.journey_id, b.status,
              r.name_en AS route_name_en, sl.service_date::text AS service_date,
              sl.departs_at::text AS departs_at,
              j.driver_user_id
         FROM bookings b
         JOIN journeys j ON j.id = b.journey_id
         JOIN routes r ON r.id = j.route_id
         JOIN slots sl ON sl.id = j.slot_id
        WHERE b.id = $1`,
      [bookingId],
    );
    return rows[0] ?? null;
  }

  async insertShare(token: string, bookingId: string, riderId: string, expiresAt: Date): Promise<ShareLinkRow> {
    const { rows } = await this.pool.query<ShareLinkRow>(
      `INSERT INTO ride_share_links (token, booking_id, rider_user_id, expires_at)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [token, bookingId, riderId, expiresAt],
    );
    return rows[0]!;
  }

  async shareByToken(token: string): Promise<(ShareLinkRow & {
    route_name_en: string | null; service_date: string | null;
    last_lat: number | null; last_lng: number | null; journey_status: string | null;
    driver_first: string | null;
  }) | null> {
    const { rows } = await this.pool.query(
      `SELECT s.*, r.name_en AS route_name_en, j.service_date,
              j.last_lat, j.last_lng, j.status AS journey_status,
              split_part(u.display_name, ' ', 1) AS driver_first
         FROM ride_share_links s
         JOIN bookings b ON b.id = s.booking_id
         JOIN journeys j ON j.id = b.journey_id
         JOIN routes r ON r.id = j.route_id
         LEFT JOIN users u ON u.id = j.driver_user_id
        WHERE s.token = $1`,
      [token],
    );
    return rows[0] ?? null;
  }
}
