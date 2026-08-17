/* ══════════════════════════════════════════════════════════════════════
   Configuration — the ONLY module that reads process.env (P0.3, §10.1).
   Every variable is declared once, here, with a type, a range and a
   default; the process refuses to start on a missing or malformed
   required variable, naming it, instead of crashing hours later on an
   undefined value. `.env.example` is kept in lock-step by
   scripts/check-env-example.sh.
   ══════════════════════════════════════════════════════════════════════ */
import { z } from 'zod';

export const envSchema = {
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
} as const;

export type Env = { [K in keyof typeof envSchema]: z.output<(typeof envSchema)[K]> };

/**
 * Reads and validates configuration. Accepts an explicit object for tests;
 * production calls pass `process.env`. On failure the thrown error names
 * every offending variable — never a late, silent undefined.
 */
export function loadEnv(raw: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Env {
  const result = z.object(envSchema).safeParse(raw);
  if (!result.success) {
    const names = result.error.issues
      .map((i) => String(i.path[0] ?? 'unknown'))
      .filter((v, i, a) => a.indexOf(v) === i);
    throw new Error(`configuration error — check: ${names.join(', ')}`);
  }
  return result.data;
}
