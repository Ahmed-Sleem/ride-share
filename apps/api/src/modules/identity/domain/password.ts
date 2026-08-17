/* ══════════════════════════════════════════════════════════════════════
   Password hashing — Node's built-in scrypt (memory-hard, NIST/OWASP
   accepted), zero native-build dependencies. Stored format is self-describing
   (`scrypt$N$r$p$salt$hash`) so parameters can be raised later without a
   migration. Verification is constant-time.
   ══════════════════════════════════════════════════════════════════════ */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384, R = 8, P = 1, KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(plain, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const n = Number(nStr), r = Number(rStr), p = Number(pStr);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  const salt = Buffer.from(saltB64 ?? '', 'base64');
  const expected = Buffer.from(hashB64 ?? '', 'base64');
  if (expected.length === 0) return false;
  const actual = scryptSync(plain, salt, expected.length, { N: n, r, p });
  return timingSafeEqual(expected, actual);
}
