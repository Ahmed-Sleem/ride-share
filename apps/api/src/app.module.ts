/* ══════════════════════════════════════════════════════════════════════
   Root module. Wires the cross-cutting guard-rails ONCE (§0.3): the one
   exception filter, the one strict validation pipe, global rate limiting,
   and the validated configuration (CONFIG token). Feature modules only
   import what they use; nothing re-implements these.
   ══════════════════════════════════════════════════════════════════════ */
import { BadRequestException, Module, ValidationPipe, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware.js';
import { loadEnv } from './config/env.js';
import { ConfigModule, PG_POOL } from './config/config.module.js';
import { PostgresThrottlerStorage } from './common/throttle/postgres-throttler-storage.js';
import { ThrottleRepository } from './common/throttle/infra/throttle.repository.js';
import { HealthModule } from './health/health.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { DriversModule } from './modules/drivers/drivers.module.js';
import { GeoModule } from './modules/geo/geo.module.js';
import { RoutesModule } from './modules/routes/routes.module.js';
import { JourneysModule } from './modules/journeys/journeys.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { SecurityModule } from './security/security.module.js';
import type { Pool } from 'pg';

const env = loadEnv(); // throws with the missing variable's name — by design (P0.3)

@Module({
  imports: [
    ConfigModule,
    // Rate limiting keeps its state in PostgreSQL (DEC-186, G-062): limits
    // survive restarts and are shared across instances. Health checks are
    // exempt: they must answer fast (with their own 2s DB timeout) so the
    // platform's restart logic keeps working even when the DB is down.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [PG_POOL],
      useFactory: (pool: Pool) => ({
        storage: new PostgresThrottlerStorage(new ThrottleRepository(pool)),
        throttlers: [{ name: 'default', ttl: env.THROTTLE_TTL, limit: env.THROTTLE_LIMIT }],
        skipIf: (context) => {
          const url = (context.switchToHttp().getRequest() as { url?: string })?.url ?? '';
          return url === '/health' || url === '/healthz';
        },
      }),
    }),
    HealthModule,
    IdentityModule,
    DriversModule,
    GeoModule,
    RoutesModule,
    JourneysModule,
    AuditModule,
    SecurityModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true, // strip unknown properties
          forbidNonWhitelisted: true, // reject them (blocks mass assignment)
          transform: true,
          exceptionFactory: (errors) =>
            new BadRequestException({
              message_key: 'validation.failed',
              details: errors.map((e) => ({ field: e.property, constraints: e.constraints })),
            }),
        }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
