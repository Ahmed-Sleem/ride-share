/* ══════════════════════════════════════════════════════════════════════
   Entry point (M0). Validates configuration and refuses to start — with a
   message naming the missing variable — before any other module loads.
   Then starts the minimal health server (P0.4); the NestJS application
   replaces it in P0.6.
   ══════════════════════════════════════════════════════════════════════ */
import { loadEnv } from './config/env.js';
import { start } from './server.js';

try {
  // loadEnv() defaults to process.env internally — the only module allowed
  // to touch it (see eslint.config.mjs). This file never reads process.env.
  const env = loadEnv();
  start(env);
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
