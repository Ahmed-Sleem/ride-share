/* ══════════════════════════════════════════════════════════════════════
   DI-graph smoke test (regression guard). Unit tests exercise each service
   in isolation with fakes — which is exactly why a broken module wiring
   (e.g. a service injected from a non-@Global module) shipped and crashed
   every real boot in a silent loop. This test compiles the REAL AppModule:
   if any provider cannot be resolved, compile() throws and CI fails here
   instead of the container crash-looping in production.
   Env is set before the (dynamic) import, because app.module.ts reads
   process.env at module scope. No database connection is made: `pg.Pool`
   is lazy, and compile() does not run lifecycle hooks.
   ══════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('the full DI graph compiles (no unresolved providers)', async () => {
  // Dummy values only — the pool is never queried (pg.Pool connects lazily and
  // compile() runs no lifecycle hooks). No credentials shape here: the secret
  // scanner rejects connection strings that embed a user-and-password pair.
  process.env.DATABASE_URL = 'postgres://localhost/rideshare_graph_test';
  process.env.JWT_SECRET = 'graph-test-jwt-signing-key-0000000000';
  process.env.NODE_ENV = 'test';
  // Dynamic import AFTER env is set — app.module reads process.env at load.
  const { Test } = await import('@nestjs/testing');
  const { AppModule } = await import('./app.module.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  assert.ok(moduleRef, 'AppModule must compile');
  await moduleRef.close();
});
