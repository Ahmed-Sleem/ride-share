/* Unit tests for the M0 health server (P0.4). The handler is exercised
   directly — no port, no network — so the proof is deterministic. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './server.js';
import type { Env } from './config/env.js';

const env = {
  NODE_ENV: 'test',
  PORT: 3000,
  LOG_LEVEL: 'info',
  DATABASE_URL: 'postgres://localhost:5432/rideshare',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'a'.repeat(32),
} as unknown as Env;

type FakeRes = {
  _code: number;
  body: string;
  writeHead(_code: number): void;
  end(_data: string): void;
};

function run(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const res: FakeRes = {
      _code: 200,
      body: '',
      writeHead(code: number) { this._code = code; },
      end(data: string) { this.body = data; resolve({ status: this._code, body: this.body }); },
    };
    handler(env)({ url } as never, res as never);
  });
}

test('health endpoint reports ok', async () => {
  const r = await run('/healthz');
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(r.body).ok, true);
});

test('unknown path is a 404 with the standard shape', async () => {
  const r = await run('/nope');
  assert.equal(r.status, 404);
  assert.equal(JSON.parse(r.body).code, 'NOT_FOUND');
});
