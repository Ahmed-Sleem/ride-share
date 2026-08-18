/* ══════════════════════════════════════════════════════════════════════
   Verification & recovery domain rules (DEC-189). One place decides:
   - codes are 6 digits, hashed at rest;
   - TTL per purpose;
   - RESEND_COOLDOWN — at least 60s between sends;
   - MAX_ATTEMPTS 3, then LOCKOUT for 1 hour (measured from the last attempt).
   These are business rules: pure, tested, and enforced here — never in the
   HTTP layer, and never a second copy.
   ══════════════════════════════════════════════════════════════════════ */
import { randomInt } from 'node:crypto';
import { hashPassword, verifyPassword } from './password.js';

export const RESEND_COOLDOWN_MS = 60_000;          // >= 1 min between sends
export const MAX_ATTEMPTS = 3;                     // then locked
export const LOCKOUT_MS = 60 * 60 * 1000;          // 1 hour

export const CODE_TTL_MS: Record<VerificationKind, number> = {
  email_login: 5 * 60_000,
  email_verify: 15 * 60_000,
  password_reset: 15 * 60_000,
};

export type VerificationKind = 'email_login' | 'email_verify' | 'password_reset';
export type VerificationChannel = 'sms' | 'email';

export interface VerificationRecord {
  id: string;
  kind: VerificationKind;
  channel: VerificationChannel;
  target: string;
  codeHash: string;
  attempts: number;
  lastSentAt: Date;
  lastAttemptAt: Date | null;
  expiresAt: Date;
  consumedAt: Date | null;
}

export function generateCode(): string {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

export const hashCode = (code: string): string => hashPassword(code);

export type ResendResult =
  | { ok: true }
  | { ok: false; reason: 'too_soon'; retryAfterMs: number }
  | { ok: false; reason: 'locked'; lockedUntil: Date };

/** May a new code be sent for this target right now? */
export function canResend(record: VerificationRecord | null, now: Date): ResendResult {
  if (!record || record.consumedAt) return { ok: true };
  if (record.attempts >= MAX_ATTEMPTS && record.lastAttemptAt) {
    const lockedUntil = new Date(record.lastAttemptAt.getTime() + LOCKOUT_MS);
    if (lockedUntil.getTime() > now.getTime()) return { ok: false, reason: 'locked', lockedUntil };
  }
  const nextAllowed = record.lastSentAt.getTime() + RESEND_COOLDOWN_MS;
  if (nextAllowed > now.getTime()) {
    return { ok: false, reason: 'too_soon', retryAfterMs: nextAllowed - now.getTime() };
  }
  return { ok: true };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'locked' | 'consumed' | 'mismatch'; lockedUntil?: Date };

export function evaluateCode(record: VerificationRecord | null, candidate: string, now: Date): VerifyResult {
  if (!record) return { ok: false, reason: 'not_found' };
  if (record.consumedAt) return { ok: false, reason: 'consumed' };
  if (record.attempts >= MAX_ATTEMPTS && record.lastAttemptAt) {
    const lockedUntil = new Date(record.lastAttemptAt.getTime() + LOCKOUT_MS);
    if (lockedUntil.getTime() > now.getTime()) return { ok: false, reason: 'locked', lockedUntil };
  }
  if (record.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'expired' };
  if (!verifyPassword(candidate, record.codeHash)) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}
