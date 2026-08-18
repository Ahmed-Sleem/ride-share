/* ══════════════════════════════════════════════════════════════════════
   Throttle repository — the ONLY place SQL for throttle_records lives
   (DEC-170 mitigation 2; enforced by scripts/check-sql-location.sh).

   One row per throttle key, updated atomically inside a transaction
   (SELECT … FOR UPDATE → compute the next state with the pure
   throttle-logic transition → upsert). Pruning drops rows whose window has
   ended and which are not blocked.                                     */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import { nextThrottleState, type ThrottleRecord, type ThrottleState } from '../throttle-logic.js';

interface Row {
  hits: Record<string, number[]>;
  blocked_until: Date | null;
}

@Injectable()
export class ThrottleRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottleRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<Row>(
        'SELECT hits, blocked_until FROM throttle_records WHERE key = $1 FOR UPDATE',
        [key]
      );
      const prev: ThrottleState | null = rows[0]
        ? { hits: rows[0].hits ?? {}, blockedUntil: rows[0].blocked_until ? rows[0].blocked_until.getTime() : 0 }
        : null;
      const result = nextThrottleState(prev, Date.now(), ttl, limit, blockDuration, throttlerName);

      const nameHits = result.state.hits[throttlerName] ?? [];
      const lastHit = nameHits.length ? nameHits[nameHits.length - 1]! : Date.now();
      await client.query(
        `INSERT INTO throttle_records (key, hits, expires_at, blocked_until)
         VALUES ($1, $2::jsonb, $3, $4)
         ON CONFLICT (key) DO UPDATE SET
           hits = EXCLUDED.hits,
           expires_at = EXCLUDED.expires_at,
           blocked_until = EXCLUDED.blocked_until`,
        [
          key,
          JSON.stringify(result.state.hits),
          new Date(lastHit + ttl),
          result.state.blockedUntil ? new Date(result.state.blockedUntil) : null,
        ]
      );
      await client.query('COMMIT');
      return {
        totalHits: result.totalHits,
        timeToExpire: result.timeToExpire,
        isBlocked: result.isBlocked,
        timeToBlockExpire: result.timeToBlockExpire,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /** Remove rows whose window has ended and which are not blocked. */
  async prune(): Promise<void> {
    await this.pool.query(
      'DELETE FROM throttle_records WHERE blocked_until IS NULL AND expires_at < now()'
    );
  }
}
