/* Verification codes repository — one pending code per (kind, channel, target).
   SQL for this table lives ONLY here (DEC-170). */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { VerificationChannel, VerificationKind, VerificationRecord } from '../domain/verification.js';

interface Row {
  id: string;
  kind: VerificationKind;
  channel: VerificationChannel;
  target: string;
  code_hash: string;
  attempts: number;
  last_sent_at: Date;
  last_attempt_at: Date | null;
  expires_at: Date;
  consumed_at: Date | null;
}

function toRecord(r: Row): VerificationRecord {
  return {
    id: r.id,
    kind: r.kind,
    channel: r.channel,
    target: r.target,
    codeHash: r.code_hash,
    attempts: r.attempts,
    lastSentAt: r.last_sent_at,
    lastAttemptAt: r.last_attempt_at,
    expiresAt: r.expires_at,
    consumedAt: r.consumed_at,
  };
}

@Injectable()
export class VerificationsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Upsert = replace any pending code for the same target (one at a time). */
  async upsert(input: {
    kind: VerificationKind;
    channel: VerificationChannel;
    target: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM verification_codes WHERE kind = $1 AND channel = $2 AND target = $3 AND consumed_at IS NULL`,
        [input.kind, input.channel, input.target]
      );
      await client.query(
        `INSERT INTO verification_codes (kind, channel, target, code_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [input.kind, input.channel, input.target, input.codeHash, input.expiresAt]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async findActive(kind: VerificationKind, channel: VerificationChannel, target: string): Promise<VerificationRecord | null> {
    const { rows } = await this.pool.query<Row>(
      `SELECT id, kind, channel, target, code_hash, attempts, last_sent_at, last_attempt_at, expires_at, consumed_at
       FROM verification_codes
       WHERE kind = $1 AND channel = $2 AND target = $3 AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [kind, channel, target]
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE verification_codes SET attempts = attempts + 1, last_attempt_at = now() WHERE id = $1',
      [id]
    );
  }

  async markConsumed(id: string): Promise<void> {
    await this.pool.query('UPDATE verification_codes SET consumed_at = now() WHERE id = $1', [id]);
  }

  async deleteFor(kind: VerificationKind, channel: VerificationChannel, target: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM verification_codes WHERE kind = $1 AND channel = $2 AND target = $3',
      [kind, channel, target]
    );
  }
}
