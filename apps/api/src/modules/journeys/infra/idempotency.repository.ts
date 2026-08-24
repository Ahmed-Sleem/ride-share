/* Idempotency receipts — the ONLY SQL for this table (P7.2). Parameterised. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';

export type IdempotencyRow = { key: string; actor_id: string; body: unknown; created_at: Date };

@Injectable()
export class IdempotencyRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async find(key: string): Promise<IdempotencyRow | null> {
    const { rows } = await this.pool.query<IdempotencyRow>(
      `SELECT key, actor_id, body, created_at FROM idempotency_receipts WHERE key = $1`,
      [key],
    );
    return rows[0] ?? null;
  }

  async insert(key: string, actorId: string, body: unknown): Promise<'ok' | 'exists'> {
    try {
      await this.pool.query(
        `INSERT INTO idempotency_receipts (key, actor_id, body) VALUES ($1, $2, $3::jsonb)`,
        [key, actorId, JSON.stringify(body ?? {})],
      );
      return 'ok';
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === '23505') return 'exists';
      throw e;
    }
  }
}
