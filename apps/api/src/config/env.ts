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

  // ── identity / bootstrap ──────────────────────────────────────────────
  // Bootstrap admin (DEC — one account ships with the system). Both or neither;
  // a missing one is warned about and the seed is skipped.
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),

  // ── dev / testing bypass ──────────────────────────────────────────────
  // 'true' DISABLES email-OTP verification: sign-up and sign-in proceed
  // without a code (the email allowlist and one-email-one-account rules still
  // apply). For testing before an email provider is wired; enabling it logs a
  // loud warning on boot. Production should keep 'false'.
  AUTH_OTP_BYPASS: z.enum(['true', 'false']).default('false'),

  // ── geography (M2, DEC-197 numeric lat/lng) ─────────────────────────
  // Minimum spacing between stops in metres — a new stop closer than this to
  // an existing one requires an explicit override + reason (P2.2).
  STOP_MIN_SPACING_M: z.coerce.number().int().min(10).max(1000).default(100),
  // Maximum walking gap between consecutive stops on a corridor (P2.5).
  STOP_MAX_GAP_M: z.coerce.number().int().min(100).max(5000).default(1000),
  // Field capture (P2.3): a GPS fix worse than this is refused, not warned.
  STOP_MAX_FIX_ACCURACY_M: z.coerce.number().int().min(5).max(200).default(20),
  // Field photos: local directory (mount a Railway volume here in production)
  // and the maximum accepted photo size in bytes.
  PHOTO_STORAGE_DIR: z.string().default('./data/photos'),
  PHOTO_MAX_BYTES: z.coerce.number().int().min(100_000).max(50_000_000).default(8_000_000),
  // Routes (M3): average vehicle speed used to estimate the cumulative
  // run-time to each stop (the timetable feeds every arrival estimate).
  ROUTE_SPEED_KMH: z.coerce.number().int().min(5).max(80).default(20),
  // Journeys (M3): seats on a claimed vehicle by default, and how soon before
  // departure a claim may no longer be released (MinClaimLeadMinutes).
  VEHICLE_SEATS: z.coerce.number().int().min(1).max(60).default(14),
  MIN_CLAIM_LEAD_MINUTES: z.coerce.number().int().min(0).max(240).default(30),
  BOARDING_WINDOW_BEFORE_MIN: z.coerce.number().int().min(0).max(180).default(15),
  BOARDING_WINDOW_AFTER_MIN: z.coerce.number().int().min(0).max(180).default(30),

  // ── payments (Paymob, P3.7 Path A — optional until keys arrive) ──────
  // PAYMOB_ENABLED is the master feature flag (DEC-204): the Paymob option
  // is HIDDEN app-wide when false — effective availability = flag AND keys.
  PAYMOB_ENABLED: z.enum(['true', 'false']).default('false'),
  PAYMOB_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYMOB_BASE_URL: z.string().default('https://accept.paymob.com/api'),
  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_HMAC_SECRET: z.string().optional(),
  PAYMOB_INTEGRATION_ID: z.string().optional(),
  PAYMOB_IFRAME_ID: z.string().optional(),
  PAYMOB_WALLET_INTEGRATION_ID: z.string().optional(),
  // Platform commission on fares, integer percent 0..90. Default 0 = no
  // commission is taken until the owner sets the launch value (open MCQ).
  COMMISSION_PERCENT: z.coerce.number().int().min(0).max(90).default(0),

  // ── email (login codes + verification + password reset) ──────────────
  // Generic SMTP — works with Resend (smtp.resend.com:465, user "resend",
  // pass = API key), Gmail SMTP, Zoho, or any relay. When SMTP_HOST is unset,
  // development logs the code server-side and production REFUSES to send
  // (honest sandbox — never a fake success).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.enum(['true', 'false', 'auto']).default('auto'),
  EMAIL_FROM: z.string().optional(),

  // ── email sign-up policy ──────────────────────────────────────────────
  // Comma-separated EXTRA allowed email domains (exact or wildcard-by-suffix).
  // The built-in allowlist (popular providers + all .edu/.edu.<cc>) always
  // applies; this extends it for company/private domains without a code change.
  EMAIL_ALLOWED_DOMAINS: z.string().default(''),

  // ── migrations on boot ────────────────────────────────────────────────
  // 'true' (default) runs `node-pg-migrate up` before the app starts — the
  // single-instance Railway path. Set 'false' to migrate out-of-band.
  AUTO_MIGRATE: z.enum(['true', 'false']).default('true'),
  MIGRATIONS_DIR: z.string().optional(),
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
