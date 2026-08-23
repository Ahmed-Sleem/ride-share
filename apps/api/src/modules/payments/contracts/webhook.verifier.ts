/* ══════════════════════════════════════════════════════════════════════
   Paymob webhook signature verification — the OFFICIAL algorithm (R20/G-076).
   Paymob does NOT sign the whole JSON: it signs the VALUES of a fixed,
   ordered list of transaction fields, concatenated with no separators,
   HMAC-SHA512 with the account's HMAC secret, hex lowercase. (See
   docs/research/05_PAYMOB_INTEGRATION.md §3 and Paymob's "Transaction
   Callbacks" / "HMAC Calculation" pages.) Missing/null fields contribute an
   empty string. Comparison is constant-time. This logic is REAL in sandbox
   and live: the secret is the only difference.                              */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface PaymobWebhookPayload {
  obj?: unknown;
  hmac?: string;
  type?: string;
}

/** The official field list, in the official (lexicographic) order. */
const SIGNED_FIELDS = [
  'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
  'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
  'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
  'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
] as const;

/** Reads a dotted path ("order.id") from an unknown-shape object. */
function pick(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** The exact string Paymob signs: field VALUES concatenated in official order. */
export function paymobSignedString(obj: unknown): string {
  return SIGNED_FIELDS.map((f) => {
    const v = pick(obj, f);
    return v === undefined || v === null ? '' : String(v);
  }).join('');
}

/**
 * Constant-time HMAC-SHA512 verification of a Paymob webhook, per the
 * official algorithm. Returns false (never throws) on a missing or
 * malformed signature.
 */
export function verifyPaymobWebhook(payload: PaymobWebhookPayload, secret: string): boolean {
  if (!payload || typeof payload.hmac !== 'string' || payload.obj === undefined) return false;
  if (!/^[0-9a-fA-F]+$/.test(payload.hmac)) return false;
  const expected = createHmac('sha512', secret).update(paymobSignedString(payload.obj)).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(payload.hmac.toLowerCase(), 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
