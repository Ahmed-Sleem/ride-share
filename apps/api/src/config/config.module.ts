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
      useFactory: (env: Env) => new Pool({ connectionString: env.DATABASE_URL, max: 10 }),
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
