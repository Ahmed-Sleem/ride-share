import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../config/config.module.js';

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  ref_type: string | null;
  ref_id: string | null;
  read_at: Date | null;
  created_at: Date;
}

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(input: {
    userId: string; kind: string;
    titleEn: string; titleAr: string; bodyEn: string; bodyAr: string;
    refType?: string; refId?: string;
  }): Promise<NotificationRow> {
    const { rows } = await this.pool.query<NotificationRow>(
      `INSERT INTO in_app_notifications
         (user_id, kind, title_en, title_ar, body_en, body_ar, ref_type, ref_id, push_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, user_id, kind, title_en, title_ar, body_en, body_ar, ref_type, ref_id, read_at, created_at, push_status`,
      [input.userId, input.kind, input.titleEn, input.titleAr, input.bodyEn, input.bodyAr, input.refType ?? null, input.refId ?? null, null],
    );
    return rows[0]!;
  }

  async forUser(userId: string): Promise<NotificationRow[]> {
    const { rows } = await this.pool.query<NotificationRow>(
      `SELECT id, user_id, kind, title_en, title_ar, body_en, body_ar, ref_type, ref_id, read_at, created_at
       FROM in_app_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    return rows;
  }

  async setDevice(userId: string, token: string, platform: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET push_token = $2, push_platform = $3, updated_at = now() WHERE id = $1`,
      [userId, token, platform],
    );
  }

  async deviceOf(userId: string): Promise<{ token: string; platform: string } | null> {
    const { rows } = await this.pool.query<{ push_token: string | null; push_platform: string | null }>(
      `SELECT push_token, push_platform FROM users WHERE id = $1`,
      [userId],
    );
    const t = rows[0]?.push_token;
    if (!t) return null;
    return { token: t, platform: rows[0]?.push_platform || 'web' };
  }

  async recentForCaps(userId: string): Promise<Array<{ kind: string; created_at: Date }>> {
    const { rows } = await this.pool.query<{ kind: string; created_at: Date }>(
      `SELECT kind, created_at FROM in_app_notifications
        WHERE user_id = $1 AND created_at > now() - interval '7 days'
        ORDER BY created_at DESC`,
      [userId],
    );
    return rows;
  }

  async markPush(id: string, status: string): Promise<void> {
    await this.pool.query(`UPDATE in_app_notifications SET push_status = $2 WHERE id = $1`, [id, status]);
  }
}
