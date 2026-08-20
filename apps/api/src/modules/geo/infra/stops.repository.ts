/* Stops repository — the ONLY place SQL for the geo tables lives (DEC-170).
   Parameterised queries only. The "stops near me" query first narrows to a
   lat/lng bounding box (index-assisted) and the exact distance is computed in
   the domain layer — DEC-197's numeric model, no PostGIS. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import { boundingBox } from '../domain/geo-math.js';
import type { StopPhotoRow, StopRow, StopVerificationRow } from '../contracts/types.js';
import type { StopSource, StopStatus } from '../domain/stop.js';

interface CreateStopInput {
  code: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  source: StopSource;
  createdBy: string | null;
  overrideReason?: string | null;
}

@Injectable()
export class StopsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(input: CreateStopInput): Promise<StopRow> {
    const { rows } = await this.pool.query<StopRow>(
      `INSERT INTO stops (code, name_en, name_ar, lat, lng, source, created_by, override_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, code, name_en, name_ar, lat, lng, status, source, created_by,
                 stand_ok, lit_ok, legal_stop_ok, reachable_ok, walking_to_next_m,
                 override_reason, capture_id, gps_accuracy_m, created_at`,
      [input.code, input.nameEn, input.nameAr, input.lat, input.lng,
       input.source, input.createdBy, input.overrideReason ?? null]
    );
    return rows[0]!;
  }

  async findById(id: string): Promise<StopRow | null> {
    const { rows } = await this.pool.query<StopRow>(
      `SELECT id, code, name_en, name_ar, lat, lng, status, source, created_by,
              stand_ok, lit_ok, legal_stop_ok, reachable_ok, walking_to_next_m,
              override_reason, capture_id, gps_accuracy_m, created_at
       FROM stops WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  /** Every stop whose bounding box could contain a point within `radiusM`
      (the caller then filters by exact distance). */
  async candidatesInBox(
    lat: number, lng: number, radiusM: number
  ): Promise<StopRow[]> {
    const b = boundingBox(lat, lng, radiusM);
    const { rows } = await this.pool.query<StopRow>(
      `SELECT id, code, name_en, name_ar, lat, lng, status, source, created_by,
              stand_ok, lit_ok, legal_stop_ok, reachable_ok, walking_to_next_m,
              override_reason, capture_id, gps_accuracy_m, created_at
       FROM stops
       WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4`,
      [b.minLat, b.maxLat, b.minLng, b.maxLng]
    );
    return rows;
  }

  async listByStatus(statuses: StopStatus[]): Promise<StopRow[]> {
    const { rows } = await this.pool.query<StopRow>(
      `SELECT id, code, name_en, name_ar, lat, lng, status, source, created_by,
              stand_ok, lit_ok, legal_stop_ok, reachable_ok, walking_to_next_m,
              override_reason, capture_id, gps_accuracy_m, created_at
       FROM stops WHERE status = ANY($1::text[]) ORDER BY created_at ASC`,
      [statuses]
    );
    return rows;
  }

  async setStatus(id: string, status: StopStatus): Promise<void> {
    await this.pool.query('UPDATE stops SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
  }

  /** Bulk insert in ONE transaction — all-or-nothing (P2.2 CSV import). A
      partial corridor is worse than no corridor. */
  async createMany(inputs: CreateStopInput[]): Promise<StopRow[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const out: StopRow[] = [];
      for (const input of inputs) {
        const { rows } = await client.query<StopRow>(
          `INSERT INTO stops (code, name_en, name_ar, lat, lng, source, created_by, override_reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, code, name_en, name_ar, lat, lng, status, source, created_by,
                     stand_ok, lit_ok, legal_stop_ok, reachable_ok, walking_to_next_m,
                     override_reason, capture_id, gps_accuracy_m, created_at`,
          [input.code, input.nameEn, input.nameAr, input.lat, input.lng,
           input.source, input.createdBy, input.overrideReason ?? null]
        );
        out.push(rows[0]!);
      }
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /** The public "stops near me" is verified stops ONLY (P2.4). */
  async verifiedInBox(lat: number, lng: number, radiusM: number): Promise<StopRow[]> {
    const b = boundingBox(lat, lng, radiusM);
    const { rows } = await this.pool.query<StopRow>(
      `SELECT id, code, name_en, name_ar, lat, lng, status, source, created_by,
              stand_ok, lit_ok, legal_stop_ok, reachable_ok, walking_to_next_m,
              override_reason, capture_id, gps_accuracy_m, created_at
       FROM stops
       WHERE status = 'verified'
         AND lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4`,
      [b.minLat, b.maxLat, b.minLng, b.maxLng]
    );
    return rows;
  }

  async appendVerification(input: {
    stopId: string; verifierId: string; decision: 'approved' | 'rejected';
    reason?: string | null; device?: string | null; gpsAccuracyM?: number | null;
  }): Promise<StopVerificationRow> {
    const { rows } = await this.pool.query<StopVerificationRow>(
      `INSERT INTO stop_verifications (stop_id, verifier_id, decision, reason, device, gps_accuracy_m)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, stop_id, verifier_id, decision, reason, device, gps_accuracy_m, created_at`,
      [input.stopId, input.verifierId, input.decision, input.reason ?? null,
       input.device ?? null, input.gpsAccuracyM ?? null]
    );
    return rows[0]!;
  }

  /** Idempotency: a field capture is keyed by the client's capture id, so an
      offline queue that retries on reconnect never creates two stops. */
  async findByCaptureId(captureId: string): Promise<StopRow | null> {
    const { rows } = await this.pool.query<StopRow>(
      `SELECT id, code, name_en, name_ar, lat, lng, status, source, created_by,
              stand_ok, lit_ok, legal_stop_ok, reachable_ok, walking_to_next_m,
              override_reason, capture_id, gps_accuracy_m, created_at
       FROM stops WHERE capture_id = $1`,
      [captureId]
    );
    return rows[0] ?? null;
  }

  /** Create a field capture as a stop already in `pending` (it is awaiting desk
      verification, P2.4), carrying the checklist answers and GPS accuracy. */
  async createFieldCapture(input: {
    code: string; captureId: string; lat: number; lng: number;
    gpsAccuracyM: number; createdBy: string;
    checklist: { stand: boolean; lit: boolean; legal: boolean; reachable: boolean };
    nameEn: string; nameAr: string;
  }): Promise<StopRow> {
    const { rows } = await this.pool.query<StopRow>(
      `INSERT INTO stops (code, capture_id, name_en, name_ar, lat, lng, status, source,
                          created_by, stand_ok, lit_ok, legal_stop_ok, reachable_ok, gps_accuracy_m)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'field', $7, $8, $9, $10, $11, $12)
       RETURNING id, code, name_en, name_ar, lat, lng, status, source, created_by,
                 stand_ok, lit_ok, legal_stop_ok, reachable_ok, walking_to_next_m,
                 override_reason, capture_id, gps_accuracy_m, created_at`,
      [input.code, input.captureId, input.nameEn, input.nameAr, input.lat, input.lng,
       input.createdBy, input.checklist.stand, input.checklist.lit,
       input.checklist.legal, input.checklist.reachable, input.gpsAccuracyM]
    );
    return rows[0]!;
  }

  async addPhoto(stopId: string, storageKey: string, mimeType: string): Promise<StopPhotoRow> {
    const { rows } = await this.pool.query<StopPhotoRow>(
      `INSERT INTO stop_photos (stop_id, storage_key, mime_type)
       VALUES ($1, $2, $3)
       RETURNING id, stop_id, storage_key, mime_type, taken_at, created_at`,
      [stopId, storageKey, mimeType]
    );
    return rows[0]!;
  }

  async photoForStop(stopId: string): Promise<StopPhotoRow | null> {
    const { rows } = await this.pool.query<StopPhotoRow>(
      `SELECT id, stop_id, storage_key, mime_type, taken_at, created_at
       FROM stop_photos WHERE stop_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [stopId]
    );
    return rows[0] ?? null;
  }
}
