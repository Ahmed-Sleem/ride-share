/* Audit repository — append-only. Only INSERT and SELECT exist here. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';

export interface AuditEntry {
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
}

@Injectable()
export class AuditRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async append(entry: AuditEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log (actor_id, action, target_type, target_id, before, after, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.actor_id,
        entry.action,
        entry.target_type,
        entry.target_id,
        entry.before ? JSON.stringify(entry.before) : null,
        entry.after ? JSON.stringify(entry.after) : null,
        entry.reason,
      ]
    );
  }

  async list(limit = 25, offset = 0): Promise<{ items: unknown[]; total: number }> {
    const lim = Math.min(Math.max(1, Math.floor(limit)), 100);
    const off = Math.max(0, Math.floor(offset));
    const { rows } = await this.pool.query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.reason,
              a.created_at, u.email, u.name AS actor_name
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
      [lim, off]
    );
    const count = await this.pool.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM audit_log`);
    return { items: rows, total: Number(count.rows[0]?.n || 0) };
  }
}
