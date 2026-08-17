/* ══════════════════════════════════════════════════════════════════════
   Paymob webhook signature verification (HMAC-SHA512). Paymob signs
   JSON.stringify(payload.obj) with the webhook secret and sends the hex
   digest in payload.hmac. We recompute and compare in constant time —
   a plain `===` opens a practical timing attack. This logic is REAL in
   both sandbox and live: the secret is the only difference.
   ══════════════════════════════════════════════════════════════════════ */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface PaymobWebhookPayload {
  obj?: unknown;
  hmac?: string;
  type?: string;
}

/**
 * Constant-time HMAC-SHA512 verification of a Paymob webhook.
 * Returns false (never throws) on a missing or malformed signature.
 */
export function verifyPaymobWebhook(payload: PaymobWebhookPayload, secret: string): boolean {
  if (!payload || typeof payload.hmac !== 'string' || payload.obj === undefined) return false;
  const expected = createHmac('sha512', secret).update(JSON.stringify(payload.obj)).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(payload.hmac, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
