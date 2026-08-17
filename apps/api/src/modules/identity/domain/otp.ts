/* ══════════════════════════════════════════════════════════════════════
   OTP — 6-digit code, hashed at rest (same scrypt primitive), 5-minute TTL,
   5 attempts, single use. Pure domain logic; storage lives in the repository.
   ══════════════════════════════════════════════════════════════════════ */
import { randomInt } from 'node:crypto';
import { hashPassword, verifyPassword } from './password.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

export interface OtpRecord {
  id: string;
  phone: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'too_many_attempts' | 'mismatch' };

export function evaluateOtp(record: OtpRecord, candidate: string, now: Date): OtpVerifyResult {
  if (record.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'expired' };
  if (record.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };
  if (!verifyPassword(candidate, record.codeHash)) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}

export const hashOtp = (code: string): string => hashPassword(code);
