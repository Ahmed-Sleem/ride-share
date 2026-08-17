/* ══════════════════════════════════════════════════════════════════════
   Entry point (M0). Validates configuration and refuses to start — with a
   message naming the missing variable — before any other module loads.
   The NestJS application attaches here in P0.6.
   ══════════════════════════════════════════════════════════════════════ */
import { loadEnv } from './config/env.js';

try {
  // loadEnv() defaults to process.env internally — the only module allowed
  // to touch it (see eslint.config.mjs). This file never reads process.env.
  const env = loadEnv();
  process.stderr.write(`env ok — NODE_ENV=${env.NODE_ENV}, PORT=${env.PORT}\n`);
  process.exit(0);
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
