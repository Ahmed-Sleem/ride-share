/* ══════════════════════════════════════════════════════════════════════
   Tokens. Access tokens are JWTs (HS256) with pinned issuer + audience and
   a short TTL (OWASP: validate aud/iss, never jwt.decode on an auth path).
   Refresh tokens are opaque random strings, stored hashed in `sessions` so
   every session is individually revocable.
   ══════════════════════════════════════════════════════════════════════ */
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';

export const ISSUER = 'ride-share-api';
export const AUDIENCE = 'ride-share-app';

export interface AccessClaims {
  sub: string;
  role: string;
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export function signAccessToken(secret: string, sub: string, role: string, ttl = '15m'): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(key(secret));
}

export async function verifyAccessToken(secret: string, token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, key(secret), { issuer: ISSUER, audience: AUDIENCE });
  return { sub: payload.sub ?? '', role: String(payload.role ?? '') };
}

export const newRefreshToken = (): string => randomBytes(48).toString('hex');

/**
 * Deterministic hash for high-entropy tokens (refresh tokens). Unlike
 * passwords, tokens are 384-bit random strings — a salted slow hash adds
 * nothing, and a salted hash cannot be used for LOOKUP anyway. SHA-256 here
 * is the standard, correct choice.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
