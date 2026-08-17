/* Health endpoint (P0.6): returns 503 — not 200 — when its database is
   unreachable. Uses Fastify's inject() so no network is needed. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { HealthController } from './health.controller.js';
import { CONFIG } from '../config/env.js';

async function boot(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      {
        provide: CONFIG,
        useValue: {
          DATABASE_URL: 'postgres://127.0.0.1:1/none',
        },
      },
    ],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  return app;
}

test('health reports 503 with db down when unreachable', async () => {
  const app = await boot();
  const res = await app.inject({ method: 'GET', url: '/healthz' });
  assert.equal(res.statusCode, 503);
  const body = res.json();
  assert.equal(body.ok, false);
  assert.equal(body.service, 'api');
  assert.equal(body.db, 'down');
  await app.close();
});

test('health and healthz both answer', async () => {
  const app = await boot();
  for (const path of ['/health', '/healthz']) {
    const res = await app.inject({ method: 'GET', url: path });
    assert.equal([200, 503].includes(res.statusCode), true, `${path} → ${res.statusCode}`);
  }
  await app.close();
});
