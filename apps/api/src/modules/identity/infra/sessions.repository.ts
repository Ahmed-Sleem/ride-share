/* Sessions repository — refresh tokens stored hashed; individually revocable. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { UserRow } from '../contracts/types.js';

interface SessionJoinRow {
  s_id: string;
  s_expires_at: Date;
  s_revoked_at: Date | null;
  u_id: string;
  u_email: string | null;
  u_phone: string | null;
  u_name: string;
  u_role: UserRow['role'];
  u_password_hash: string | null;
  u_status: UserRow['status'];
  u_created_at: Date;
}

export interface ValidSession {
  id: string;
  user: UserRow;
}

@Injectable()
export class SessionsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.pool.query(
      'INSERT INTO sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
  }

  /** Session joined with its user, if valid (not revoked, not expired). */
  async findValid(tokenHash: string): Promise<ValidSession | null> {
    const { rows } = await this.pool.query<SessionJoinRow>(
      `SELECT s.id AS s_id, s.expires_at AS s_expires_at, s.revoked_at AS s_revoked_at,
              u.id AS u_id, u.email AS u_email, u.phone AS u_phone, u.name AS u_name,
              u.role AS u_role, u.password_hash AS u_password_hash,
              u.status AS u_status, u.created_at AS u_created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.deleted_at IS NULL`,
      [tokenHash]
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.s_id,
      user: {
        id: r.u_id,
        email: r.u_email,
        phone: r.u_phone,
        name: r.u_name,
        role: r.u_role,
        password_hash: r.u_password_hash,
        status: r.u_status,
        is_system_admin: false,
        deleted_at: null,
        created_at: r.u_created_at,
      },
    };
  }

  async revoke(id: string): Promise<void> {
    await this.pool.query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [id]);
  }

  /** Revoke every session for a user — used on password change/reset. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.pool.query(
      'UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
  }
}
