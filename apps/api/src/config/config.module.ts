/* ══════════════════════════════════════════════════════════════════════
   Config module — global providers for configuration, the PostgreSQL pool,
   and the one structured logger. loadEnv() remains the single reader of
   process.env (P0.3), enforced by lint.
   ══════════════════════════════════════════════════════════════════════ */
import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { CONFIG, loadEnv, type Env } from './env.js';
import { PinoLoggerService, createLogger } from '../common/logging/logger.js';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    { provide: CONFIG, useFactory: () => loadEnv() },
    {
      provide: PG_POOL,
      // connectionTimeoutMillis makes an unreachable database FAIL FAST (a
      // 500/503) instead of hanging every request forever — the throttle
      // store and every repository share this pool, so a DB outage can never
      // wedge the whole process into "application failed to respond".
      useFactory: (env: Env) => new Pool({
        connectionString: env.DATABASE_URL,
        max: 10,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      }),
      inject: [CONFIG],
    },
    {
      provide: PinoLoggerService,
      useFactory: (env: Env) => new PinoLoggerService(createLogger(env.LOG_LEVEL)),
      inject: [CONFIG],
    },
  ],
  exports: [CONFIG, PG_POOL, PinoLoggerService],
})
export class ConfigModule {}
