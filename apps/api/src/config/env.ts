/* ══════════════════════════════════════════════════════════════════════
   Configuration — the ONLY module that reads process.env (P0.3, §10.1).
   Every variable is declared once, here, with a type, a range and a
   default; the process refuses to start on a missing or malformed required
   variable, naming it, instead of crashing hours later on an undefined
   value. `.env.example` is kept in lock-step by scripts/check-env-example.sh.

   Railway / 12-factor: everything the app needs arrives as environment
   variables; there is no platform SDK and no other reader of process.env.
   ══════════════════════════════════════════════════════════════════════ */
import { z } from 'zod';

export const envSchema = {
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // ── security / hardening ─────────────────────────────────────────────
  // Comma-separated allowlist of origins. Empty = allow all (development
  // only; production logs a warning). Never '*' + credentials in prod.
  CORS_ORIGINS: z.string().default(''),
  THROTTLE_TTL: z.coerce.number().int().min(1000).default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(100),

  // ── payments (Paymob, Phase 3 — optional until keys arrive) ───────────
  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_HMAC_SECRET: z.string().optional(),
  PAYMOB_INTEGRATION_ID: z.string().optional(),
} as const;

const schema = z.object(envSchema);
export type Env = z.infer<typeof schema>;

/** DI token for the validated configuration — one object, shared everywhere. */
export const CONFIG = Symbol('CONFIG');

/**
 * Reads and validates configuration. Accepts an explicit object for tests;
 * production calls pass `process.env` (the only module allowed to touch it).
 * On failure the thrown error names every offending variable — never a late,
 * silent undefined.
 */
export function loadEnv(raw: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const names = result.error.issues
      .map((i) => String(i.path[0] ?? 'unknown'))
      .filter((v, i, a) => a.indexOf(v) === i);
    throw new Error(`configuration error — check: ${names.join(', ')}`);
  }
  return result.data;
}
