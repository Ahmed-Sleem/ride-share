/* ══════════════════════════════════════════════════════════════════════
   PostgreSQL-backed throttler storage (closes G-062 first clause). The
   global rate limiter keeps its hit counts in the one stateful dependency
   (DEC-186), so IP/route limits survive restarts and are shared across
   instances — the in-memory store was single-instance and reset on boot.

   This class is the thin @nestjs/throttler adapter; all SQL lives in
   infra/throttle.repository.ts (DEC-170) and the transition in
   throttle-logic.ts. Expired rows are pruned lazily on an interval.
   ══════════════════════════════════════════════════════════════════════ */
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottleRecord } from './throttle-logic.js';
import { ThrottleRepository } from './infra/throttle.repository.js';

const PRUNE_INTERVAL_MS = 10 * 60_000;

@Injectable()
export class PostgresThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly repo: ThrottleRepository) {
    this.timer = setInterval(() => { void this.repo.prune().catch(() => {}); }, PRUNE_INTERVAL_MS);
    this.timer.unref();
  }

  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottleRecord> {
    return this.repo.increment(key, ttl, limit, blockDuration, throttlerName);
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }
}
