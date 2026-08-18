/* Drivers + vehicles repositories — the ONLY places SQL for these tables
   lives (DEC-170). Parameterised queries only. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { DriverStatus, VehicleStatus } from '../domain/state-machine.js';

export interface DriverProfileRow {
  id: string;
  user_id: string;
  status: DriverStatus;
  submitted_at: Date | null;
  review_note: string | null;
}

export interface VehicleRow {
  id: string;
  owner_user_id: string;
  plate: string;
  model: string;
  colour: string;
  fleet_label: string | null;
  status: VehicleStatus;
}

export interface DriverApplicationRow extends DriverProfileRow {
  name: string;
  phone: string | null;
}

@Injectable()
export class DriversRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByUserId(userId: string): Promise<DriverProfileRow | null> {
    const { rows } = await this.pool.query<DriverProfileRow>(
      `SELECT id, user_id, status, submitted_at, review_note
       FROM driver_profiles WHERE user_id = $1`,
      [userId]
    );
    return rows[0] ?? null;
  }

  async createApplication(userId: string): Promise<DriverProfileRow> {
    const { rows } = await this.pool.query<DriverProfileRow>(
      `INSERT INTO driver_profiles (user_id, status, submitted_at)
       VALUES ($1, 'submitted', now())
       RETURNING id, user_id, status, submitted_at, review_note`,
      [userId]
    );
    return rows[0]!;
  }

  async setStatus(id: string, status: DriverStatus, reviewNote: string | null): Promise<void> {
    await this.pool.query(
      `UPDATE driver_profiles SET status = $1, review_note = $2, updated_at = now() WHERE id = $3`,
      [status, reviewNote, id]
    );
  }

  /** Atomic approval: profile → approved AND the account becomes a driver. */
  async approveApplication(profileId: string, userId: string, reviewNote: string | null): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE driver_profiles SET status = 'approved', review_note = $1, updated_at = now() WHERE id = $2`,
        [reviewNote, profileId]
      );
      await client.query("UPDATE users SET role = 'driver', updated_at = now() WHERE id = $1", [userId]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async listApplications(): Promise<DriverApplicationRow[]> {
    const { rows } = await this.pool.query<DriverApplicationRow>(
      `SELECT p.id, p.user_id, p.status, p.submitted_at, p.review_note,
              u.name, u.phone
       FROM driver_profiles p JOIN users u ON u.id = p.user_id
       WHERE p.status IN ('submitted','under_review')
       ORDER BY p.submitted_at ASC`
    );
    return rows;
  }

  async addVehicle(ownerUserId: string, plate: string, model: string, colour: string): Promise<VehicleRow> {
    const { rows } = await this.pool.query<VehicleRow>(
      `INSERT INTO vehicles (owner_user_id, plate, model, colour, status)
       VALUES ($1, $2, $3, $4, 'submitted')
       RETURNING id, owner_user_id, plate, model, colour, fleet_label, status`,
      [ownerUserId, plate, model, colour]
    );
    return rows[0]!;
  }

  async listVehicles(): Promise<(VehicleRow & { owner_name: string })[]> {
    const { rows } = await this.pool.query<VehicleRow & { owner_name: string }>(
      `SELECT v.id, v.owner_user_id, v.plate, v.model, v.colour, v.fleet_label, v.status,
              u.name AS owner_name
       FROM vehicles v JOIN users u ON u.id = v.owner_user_id
       ORDER BY v.created_at DESC`
    );
    return rows;
  }

  async setVehicleStatus(id: string, status: VehicleStatus): Promise<void> {
    await this.pool.query('UPDATE vehicles SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
  }

  async findVehicle(id: string): Promise<VehicleRow | null> {
    const { rows } = await this.pool.query<VehicleRow>(
      `SELECT id, owner_user_id, plate, model, colour, fleet_label, status FROM vehicles WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }
}
