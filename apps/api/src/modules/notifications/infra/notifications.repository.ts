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
         (user_id, kind, title_en, title_ar, body_en, body_ar, ref_type, ref_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, user_id, kind, title_en, title_ar, body_en, body_ar, ref_type, ref_id, read_at, created_at`,
      [input.userId, input.kind, input.titleEn, input.titleAr, input.bodyEn, input.bodyAr, input.refType ?? null, input.refId ?? null],
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
}
