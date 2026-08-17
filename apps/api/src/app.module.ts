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
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { SecurityModule } from './security/security.module.js';

const env = loadEnv(); // throws with the missing variable's name — by design (P0.3)

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: env.THROTTLE_TTL, limit: env.THROTTLE_LIMIT }]),
    HealthModule,
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
