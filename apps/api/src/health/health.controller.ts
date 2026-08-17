/* ══════════════════════════════════════════════════════════════════════
   Health (§14, P0.6). Reports process and database status. Returns 503
   when the database is unreachable — a health check that reports healthy
   while the database is down disables the platform's own restart logic,
   which is worse than none. Checks are short-lived and time-boxed.

   PostgreSQL is the ONLY stateful dependency (DEC-186): realtime is
   LISTEN/NOTIFY, queues are SKIP LOCKED, sessions/read models are tables.
   ══════════════════════════════════════════════════════════════════════ */
import { Controller, Get, Inject, Res } from '@nestjs/common';
import { Client } from 'pg';
import { CONFIG, type Env } from '../config/env.js';
import type { FastifyReply } from 'fastify';

async function dbUp(url: string): Promise<boolean> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

@Controller()
export class HealthController {
  constructor(@Inject(CONFIG) private readonly env: Env) {}

  @Get(['health', 'healthz'])
  async check(@Res() res: FastifyReply): Promise<void> {
    const db = await dbUp(this.env.DATABASE_URL);
    void res.status(db ? 200 : 503).send({
      ok: db,
      service: 'api',
      db: db ? 'up' : 'down',
    });
  }
}
