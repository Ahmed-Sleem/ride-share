/* ══════════════════════════════════════════════════════════════════════
   Payment provider contract (CH6, DEC-179). Every gateway — Paymob today,
   any successor later — implements this one interface. The ledger depends
   on the interface, never on a provider's ledger, so the gateway is
   swappable without touching money logic. Money is integer minor units
   (piasters), never floats.
   ══════════════════════════════════════════════════════════════════════ */

export type ProviderMode = 'sandbox' | 'live';

export interface CreateCheckoutRequest {
  orderId: string; // our idempotency key — the ledger's booking order id
  amountMinor: number; // integer piasters
  currency: 'EGP';
  billing?: { name?: string; phone?: string; email?: string; city?: string };
}

export interface CreateCheckoutResult {
  providerOrderId?: string;
  redirectUrl?: string;
  iframeUrl?: string;
  mode: ProviderMode;
}

export interface RefundRequest {
  transactionId: string;
  amountMinor: number;
  reason?: string;
}

export type PaymentStatus = 'succeeded' | 'failed' | 'pending';

export interface PaymentEvent {
  id: string; // provider transaction id — the idempotency key for the ledger
  orderId: string; // our order id
  amountMinor: number;
  status: PaymentStatus;
  raw: unknown; // the verified payload, stored for the audit trail
}

export interface PaymentProvider {
  readonly name: string;
  readonly mode: ProviderMode;
  createCheckout(req: CreateCheckoutRequest): Promise<CreateCheckoutResult>;
  refund(req: RefundRequest): Promise<{ providerRefundId: string }>;
  /** Returns true only when the webhook signature is cryptographically valid. */
  verifyWebhook(payload: unknown): boolean;
  /** Maps a VERIFIED webhook payload to a ledger-ready event. */
  normalizeWebhook(payload: unknown): PaymentEvent;
}
