/* ══════════════════════════════════════════════════════════════════════
   Health (§14, P0.6). Reports process, database and Redis status. Returns
   503 when either dependency is down — a health check that reports healthy
   while the database is unreachable disables the platform's own restart
   logic, which is worse than none. Checks are short-lived and time-boxed.
   ══════════════════════════════════════════════════════════════════════ */
import { Controller, Get, Inject, Res } from '@nestjs/common';
import { Client } from 'pg';
import Redis from 'ioredis';
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

async function redisUp(url: string): Promise<boolean> {
  const redis = new Redis(url, { lazyConnect: true, connectTimeout: 2000, maxRetriesPerRequest: 0 });
  try {
    await redis.connect();
    await redis.ping();
    return true;
  } catch {
    return false;
  } finally {
    redis.disconnect();
  }
}

@Controller()
export class HealthController {
  constructor(@Inject(CONFIG) private readonly env: Env) {}

  @Get(['health', 'healthz'])
  async check(@Res() res: FastifyReply): Promise<void> {
    const db = await dbUp(this.env.DATABASE_URL);
    const redis = await redisUp(this.env.REDIS_URL);
    const ok = db && redis;
    void res.status(ok ? 200 : 503).send({
      ok,
      service: 'api',
      db: db ? 'up' : 'down',
      redis: redis ? 'up' : 'down',
    });
  }
}
