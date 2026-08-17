/* OTP repository — one pending code per phone; codes are stored hashed. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { OtpRecord } from '../domain/otp.js';

@Injectable()
export class OtpRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async upsert(phone: string, codeHash: string, expiresAt: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM otps WHERE phone = $1', [phone]);
      await client.query(
        'INSERT INTO otps (phone, code_hash, expires_at) VALUES ($1, $2, $3)',
        [phone, codeHash, expiresAt]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async findByPhone(phone: string): Promise<OtpRecord | null> {
    const { rows } = await this.pool.query<OtpRecord>(
      'SELECT id, phone, code_hash AS "codeHash", attempts, expires_at AS "expiresAt" FROM otps WHERE phone = $1',
      [phone]
    );
    return rows[0] ?? null;
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.pool.query('UPDATE otps SET attempts = attempts + 1 WHERE id = $1', [id]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM otps WHERE id = $1', [id]);
  }
}
