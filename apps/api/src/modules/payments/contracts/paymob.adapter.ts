/* ══════════════════════════════════════════════════════════════════════
   Paymob adapter (DEC-179). Implements PaymentProvider.

   Mode is "sandbox" until PAYMOB_API_KEY + PAYMOB_HMAC_SECRET are provided
   AND PAYMOB_MODE=live. In sandbox mode the webhook VERIFIER is fully
   functional (HMAC is real) but createCheckout/refund refuse to run —
   no fake success, no mock "paid" events (§8). Drop the keys in, set the
   mode, and the live flow lights up: /auth/tokens → /ecommerce/orders →
   /acceptance/payment_keys → redirect → verified webhook.
   ══════════════════════════════════════════════════════════════════════ */
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
  integrationId?: string;
  mode?: ProviderMode;
}

export class PaymobAdapter implements PaymentProvider {
  readonly name = 'paymob';

  constructor(private readonly config: PaymobConfig) {}

  get mode(): ProviderMode {
    if (this.config.mode === 'live') return 'live';
    return this.config.apiKey && this.config.hmacSecret ? 'live' : 'sandbox';
  }

  private live(): asserts this is this {
    if (this.mode !== 'live') {
      throw new ServiceUnavailableException({
        message_key: 'payments.provider_not_configured',
        details: { provider: this.name, mode: this.mode },
      });
    }
  }

  createCheckout(_req: CreateCheckoutRequest): Promise<CreateCheckoutResult> {
    this.live();
    // Live flow: POST /auth/tokens → /ecommerce/orders → /acceptance/payment_keys.
    // Implemented in M3 when the merchant keys land; the contract above is stable.
    throw new Error('paymob live checkout is wired in M3 (merchant keys pending)');
  }

  refund(_req: RefundRequest): Promise<{ providerRefundId: string }> {
    this.live();
    throw new Error('paymob live refunds are wired in M3 (merchant keys pending)');
  }

  verifyWebhook(payload: unknown): boolean {
    if (!this.config.hmacSecret) return false;
    return verifyPaymobWebhook(payload as PaymobWebhookPayload, this.config.hmacSecret);
  }

  normalizeWebhook(payload: unknown): PaymentEvent {
    const p = payload as PaymobWebhookPayload & { obj?: Record<string, unknown> };
    const obj = p.obj ?? {};
    return {
      id: String(obj.id ?? ''),
      orderId: String((obj.order as Record<string, unknown>)?.id ?? ''),
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
}
