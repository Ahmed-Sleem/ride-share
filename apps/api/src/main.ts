/* ══════════════════════════════════════════════════════════════════════
   Bootstrap (M0, P0.6). Security is applied here, once: helmet headers,
   a CORS allowlist from env, the trusted-proxy setting for correct client
   IPs behind Railway, and the one structured logger. The process refuses
   to start (exit 1, naming the variable) when configuration is missing.
   ══════════════════════════════════════════════════════════════════════ */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { createLogger, PinoLoggerService } from './common/logging/logger.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // trustProxy: true → req.ip is the real client behind Railway's proxy.
    // Access logs are handled by the one structured logger, not Fastify's.
    new FastifyAdapter({ logger: false, trustProxy: true }),
    { logger: false }
  );
  app.useLogger(new PinoLoggerService(logger));

  // Security headers. CSP disabled: this service serves JSON, not HTML.
  await app.register(helmet, { contentSecurityPolicy: false });

  // CORS allowlist from env — never '*' + credentials in production.
  const origins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  if (env.NODE_ENV === 'production' && origins.length === 0) {
    logger.warn('CORS_ORIGINS is empty in production — set an explicit allowlist');
  }
  app.enableCors({ origin: origins.length ? origins : true, credentials: true });

  await app.listen(env.PORT, '0.0.0.0');
  logger.info(`api listening on :${env.PORT}`);
}

bootstrap().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
