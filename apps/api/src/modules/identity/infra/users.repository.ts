/* Users repository — the ONLY place SQL for the users table lives
   (DEC-170 mitigation 2). Parameterised queries only. */
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';
import type { UserRole, UserRow } from '../contracts/types.js';

@Injectable()
export class UsersRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query<UserRow>(
      'SELECT id, email, phone, name, role, password_hash, status, email_verified_at, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return rows[0] ?? null;
  }

  /** Staff sign-in identifier: phone OR email (the owner chose "either"). */
  async findByIdentifier(identifier: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT id, email, phone, name, role, password_hash, status, email_verified_at, created_at
       FROM users WHERE phone = $1 OR email = lower($1)`,
      [identifier]
    );
    return rows[0] ?? null;
  }

  async findByPhone(phone: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query<UserRow>(
      'SELECT id, email, phone, name, role, password_hash, status, email_verified_at, created_at FROM users WHERE phone = $1',
      [phone]
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query<UserRow>(
      'SELECT id, email, phone, name, role, password_hash, status, email_verified_at, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }

  async create(input: {
    email?: string | null;
    phone?: string | null;
    name?: string;
    role: UserRole;
    passwordHash?: string | null;
  }): Promise<UserRow> {
    const { rows } = await this.pool.query<UserRow>(
      `INSERT INTO users (email, phone, name, role, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, phone, name, role, password_hash, status, email_verified_at, created_at`,
      [
        input.email ? input.email.toLowerCase() : null,
        input.phone ?? null,
        input.name ?? '',
        input.role,
        input.passwordHash ?? null,
      ]
    );
    return rows[0]!;
  }

  async setPassword(id: string, passwordHash: string): Promise<void> {
    await this.pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
      passwordHash,
      id,
    ]);
  }

  /** Set the email (unverified) — verification is a separate step. */
  async setEmail(id: string, email: string): Promise<void> {
    await this.pool.query(
      "UPDATE users SET email = $1, email_verified_at = NULL, updated_at = now() WHERE id = $2",
      [email.toLowerCase(), id]
    );
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1',
      [id]
    );
  }

  async list(): Promise<UserRow[]> {
    const { rows } = await this.pool.query<UserRow>(
      'SELECT id, email, phone, name, role, password_hash, status, email_verified_at, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  }

  async countByRole(role: UserRole): Promise<number> {
    const { rows } = await this.pool.query<{ n: string }>(
      'SELECT count(*)::int AS n FROM users WHERE role = $1',
      [role]
    );
    return Number(rows[0]?.n ?? 0);
  }
}
