/* Unit tests for configuration (P0.3). A missing or malformed required
   variable must be named at startup, not crash later as undefined. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from './env.js';

// Dummy values only — no credentials, nothing that resembles one (§10.1:
// the secret scanner must stay clean on this tree).
const valid = {
  DATABASE_URL: 'postgres://localhost:5432/rideshare',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'a'.repeat(32),
};

test('loads valid configuration with defaults', () => {
  const env = loadEnv(valid);
  assert.equal(env.PORT, 3000);
  assert.equal(env.NODE_ENV, 'development');
  assert.equal(env.LOG_LEVEL, 'info');
});

test('missing required variables are named, all of them', () => {
  assert.throws(
    () => loadEnv({}),
    (err: Error) => {
      const msg = err.message;
      return /DATABASE_URL/.test(msg) && /REDIS_URL/.test(msg) && /JWT_SECRET/.test(msg);
    }
  );
});

test('a short JWT secret is rejected and named', () => {
  assert.throws(
    () => loadEnv({ ...valid, JWT_SECRET: 'short' }),
    (err: Error) => /JWT_SECRET/.test(err.message)
  );
});
