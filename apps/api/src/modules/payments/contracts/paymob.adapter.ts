/* ══════════════════════════════════════════════════════════════════════
   Paymob adapter (DEC-179, R20). Implements PaymentProvider.

   Mode is "sandbox" until PAYMOB_API_KEY + PAYMOB_HMAC_SECRET are provided
   AND PAYMOB_MODE=live. In sandbox mode the webhook VERIFIER is fully
   functional (real HMAC-SHA512 over the official field list) but
   createCheckout/refund refuse to run — no fake success, no mock "paid"
   events (§8). Drop the keys in, set the mode, and the live flow runs:
   POST /auth/tokens → /ecommerce/orders → /acceptance/payment_keys →
   iframe redirect (R20 docs/research/05_PAYMOB_INTEGRATION.md §2).

   The auth token is cached for ~50 minutes (Paymob allows ~60) and shared
   across calls; a 401 invalidates it so the next call re-authenticates.
   Money is integer minor units everywhere — amount_cents IS our minor
   amount (EGP piastres), no conversion, never a float.               */
import { ServiceUnavailableException } from '@nestjs/common';
import type {
  CreateCheckoutRequest,
  CreateCheckoutResult,
  PaymentEvent,
  PaymentProvider,
  PaymentStatus,
  ProviderMode,
  RefundRequest,
} from './provider.interface.js';
import { verifyPaymobWebhook, type PaymobWebhookPayload } from './webhook.verifier.js';

export interface PaymobConfig {
  apiKey?: string;
  hmacSecret?: string;
  integrationId?: string;     // cards integration id (payment_keys)
  iframeId?: string;          // cards iframe id (the redirect surface)
  mode?: ProviderMode;
  baseUrl?: string;           // default https://accept.paymob.com/api
}

interface CachedToken { token: string; expiresAtMs: number }

export class PaymobAdapter implements PaymentProvider {
  readonly name = 'paymob';
  private auth: CachedToken | null = null;

  constructor(private readonly config: PaymobConfig) {}

  private get base(): string {
    return this.config.baseUrl ?? 'https://accept.paymob.com/api';
  }

  get mode(): ProviderMode {
    if (this.config.mode === 'live') return 'live';
    return this.config.apiKey && this.config.hmacSecret ? 'live' : 'sandbox';
  }

  private live(): void {
    if (this.mode !== 'live') {
      throw new ServiceUnavailableException({
        message_key: 'payments.provider_not_configured',
        details: { provider: this.name, mode: this.mode },
      });
    }
  }

  /** Full Paymob checkout: auth token → order registration → payment key →
      iframe URL. Our orderId (uuid) is sent as merchant_order_id — the R20
      idempotency join key the webhook carries back. */
  async createCheckout(req: CreateCheckoutRequest): Promise<CreateCheckoutResult> {
    this.live();
    if (!this.config.integrationId || !this.config.iframeId) {
      throw new ServiceUnavailableException({
        message_key: 'payments.provider_not_configured',
        details: { provider: this.name, missing: ['PAYMOB_INTEGRATION_ID', 'PAYMOB_IFRAME_ID'] },
      });
    }
    const token = await this.authToken();

    // 1 — register the order. amount_cents = integer minor units (INV-30).
    const orderRes = await this.fetchJson<{ id: number }>('POST', '/ecommerce/orders', token, {
      auth_token: token,
      delivery_needed: false,
      amount_cents: req.amountMinor,
      currency: 'EGP',
      merchant_order_id: req.orderId,
      items: [{
        name: req.purpose ?? 'wallet top-up',
        amount_cents: req.amountMinor,
        description: `${req.purpose ?? 'wallet top-up'} ${req.orderId}`,
        quantity: '1',
      }],
    });

    // 2 — payment key (billing_data is required by the schema; real values
    //     where we have them, "N/A" where we do not — R20 §2.3).
    const b = req.billing ?? {};
    const keyRes = await this.fetchJson<{ token: string }>('POST', '/acceptance/payment_keys', token, {
      auth_token: token,
      amount_cents: req.amountMinor,
      expiration: 3600,
      order_id: orderRes.id,
      currency: 'EGP',
      integration_id: Number(this.config.integrationId),
      billing_data: {
        first_name: b.name?.split(' ')[0] ?? 'N/A',
        last_name: b.name?.split(' ').slice(1).join(' ') || 'N/A',
        email: b.email ?? 'N/A',
        phone_number: b.phone ?? 'N/A',
        apartment: 'N/A', floor: 'N/A', building: 'N/A', street: 'N/A',
        city: b.city ?? 'Alexandria', country: 'EG', state: 'N/A',
        postal_code: 'N/A', shipping_method: 'PKG',
      },
    });

    return {
      providerOrderId: String(orderRes.id),
      iframeUrl: `${this.base}/acceptance/iframes/${this.config.iframeId}?payment_token=${keyRes.token}`,
      mode: 'live',
    };
  }

  async refund(req: RefundRequest): Promise<{ providerRefundId: string }> {
    this.live();
    const token = await this.authToken();
    // Refunds return money to the rider's card; OUR rider refunds are wallet
    // credit (DEC-055) — this path exists for operator-initiated settlements.
    const res = await this.fetchJson<{ id?: number }>('POST', '/acceptance/void_refund/refund', token, {
      auth_token: token,
      transaction_id: Number(req.transactionId),
      amount_cents: req.amountMinor,
    });
    return { providerRefundId: String(res.id ?? req.transactionId) };
  }

  verifyWebhook(payload: unknown): boolean {
    if (!this.config.hmacSecret) return false;
    return verifyPaymobWebhook(payload as PaymobWebhookPayload, this.config.hmacSecret);
  }

  /** Maps a VERIFIED webhook to a ledger-ready event. orderId is OUR
     merchant_order_id (obj.order.merchant_order_id) — NOT Paymob's numeric
     order id; that one lives in providerOrderId (G-078 fix). */
  normalizeWebhook(payload: unknown): PaymentEvent {
    const p = payload as PaymobWebhookPayload & { obj?: Record<string, unknown> };
    const obj = p.obj ?? {};
    const order = (obj.order ?? {}) as Record<string, unknown>;
    return {
      id: String(obj.id ?? ''),
      orderId: String(order.merchant_order_id ?? ''),
      providerOrderId: String(order.id ?? ''),
      amountMinor: Number(obj.amount_cents ?? 0),
      status: this.statusOf(obj),
      raw: payload,
    };
  }

  private statusOf(obj: Record<string, unknown>): PaymentStatus {
    if (obj.pending === true) return 'pending';
    if (obj.success === true || obj.paid === true) return 'succeeded';
    return 'failed';
  }

  private async authToken(): Promise<string> {
    if (this.auth && this.auth.expiresAtMs > Date.now() + 30_000) return this.auth.token;
    if (!this.config.apiKey) {
      throw new ServiceUnavailableException({ message_key: 'payments.provider_not_configured' });
    }
    const res = await this.fetchJson<{ token: string }>('POST', '/auth/tokens', null, {
      api_key: this.config.apiKey,
    });
    this.auth = { token: res.token, expiresAtMs: Date.now() + 50 * 60 * 1000 };
    return res.token;
  }

  /** Thin JSON fetch with token invalidation on 401. Never throws fake
      results: provider failures surface as ServiceUnavailable. */
  private async fetchJson<T>(method: string, path: string, token: string | null, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableException({ message_key: 'payments.provider_unreachable' });
    }
    if (res.status === 401 && this.auth) { this.auth = null; }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ServiceUnavailableException({
        message_key: 'payments.provider_error',
        details: { status: res.status, body: text.slice(0, 300) },
      });
    }
    return (await res.json()) as T;
  }
}
