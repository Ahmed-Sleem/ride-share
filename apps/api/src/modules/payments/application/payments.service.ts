/* Payments service — application layer (P3.7, Path A). The one place that
   turns money INTENT into ledger rows. Invariants enforced here (CH06,
   BUILD_PLAN P3.7):
   - the webhook is HMAC-verified FIRST; a bad signature never touches state
   - webhook replay is idempotent by provider txn id (five replays = one effect)
   - the amount is re-checked against OUR order — the payload is never trusted
   - only success && !pending credits anything
   - a top-up with Paymob unconfigured is an honest refusal (payments.disabled)
   - cash-collected is idempotent per booking and validates the driver/journey
   - every wallet/earnings balance is DERIVED from the ledger, never stored. */
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaymentsRepository } from '../infra/payments.repository.js';
import { PaymobAdapter } from '../contracts/paymob.adapter.js';
import type { PaymentProvider } from '../contracts/provider.interface.js';
import { CONFIG, type Env } from '../../../config/env.js';
import { AuditService } from '../../audit/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import type { Actor } from '../../identity/contracts/types.js';
import {
  newTxnId, postTopup, postCashCollected, postRefundCredit, postFareFromWallet,
  assertValidPosting, walletAccount, driverEarningsAccount, driverCashAccount,
  displayBalance, type LedgerRowInput,
} from '../domain/ledger.js';

/** Top-up bounds (integer minor units): 5 EGP … 10,000 EGP per order. */
export const TOPUP_MIN_MINOR = 500;
export const TOPUP_MAX_MINOR = 1_000_000;

@Injectable()
export class PaymentsService {
  readonly provider: PaymentProvider;

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly audit: AuditService,
    @Inject(CONFIG) private readonly env: Env,
  ) {
    this.provider = new PaymobAdapter({
      apiKey: env.PAYMOB_API_KEY,
      hmacSecret: env.PAYMOB_HMAC_SECRET,
      integrationId: env.PAYMOB_INTEGRATION_ID,
      iframeId: env.PAYMOB_IFRAME_ID,
      mode: env.PAYMOB_MODE === 'live' ? 'live' : 'sandbox',
      baseUrl: env.PAYMOB_BASE_URL,
    });
  }

  /** Effective Paymob availability: the master flag AND every key the card
      flow needs (DEC-204). The client learns ONLY this boolean. */
  paymobEnabled(): boolean {
    return this.env.PAYMOB_ENABLED === 'true'
      && !!this.env.PAYMOB_API_KEY
      && !!this.env.PAYMOB_HMAC_SECRET
      && !!this.env.PAYMOB_INTEGRATION_ID
      && !!this.env.PAYMOB_IFRAME_ID;
  }

  async config(actor: Actor): Promise<{
    paymobEnabled: boolean; topupMinMinor: number; topupMaxMinor: number;
  }> {
    assertCan(actor.role as unknown as Role, Capability.PAYMENTS_SELF);
    // the bounds ride along so the client NEVER hard-codes them (§0.3)
    return {
      paymobEnabled: this.paymobEnabled(),
      topupMinMinor: TOPUP_MIN_MINOR, topupMaxMinor: TOPUP_MAX_MINOR,
    };
  }

  /** Derived wallet balance + recent activity. Balance is READ from the
      ledger view — nothing mutable anywhere. */
  async wallet(actor: Actor): Promise<{
    balanceMinor: number; entries: { id: string; side: 'debit' | 'credit'; amountMinor: number; reason: string; createdAt: Date }[];
  }> {
    assertCan(actor.role as unknown as Role, Capability.PAYMENTS_SELF);
    const account = walletAccount(actor.id);
    const balances = await this.repo.balancesFor([account]);
    const raw = balances.get(account) ?? 0;
    const rows = await this.repo.entriesForAccount(account, 25);
    return {
      balanceMinor: displayBalance(account, raw),
      entries: rows.map((r) => ({
        id: r.id, side: r.side, amountMinor: r.amount_minor, reason: r.reason, createdAt: r.created_at,
      })),
    };
  }

  /** Everything the booking flow needs to render the payment choice
      (Paymob first, cash second — DEC-204). */
  async bookingPaymentInfo(actor: Actor, fareMinor: number): Promise<{
    paymobEnabled: boolean; walletBalanceMinor: number; sufficient: boolean;
  }> {
    assertCan(actor.role as unknown as Role, Capability.PAYMENTS_SELF);
    const account = walletAccount(actor.id);
    const balances = await this.repo.balancesFor([account]);
    const balance = displayBalance(account, balances.get(account) ?? 0);
    return {
      paymobEnabled: this.paymobEnabled(),
      walletBalanceMinor: balance,
      sufficient: Number.isInteger(fareMinor) && fareMinor > 0 && balance >= fareMinor,
    };
  }

  /** Create a wallet top-up intent + provider checkout. With Paymob not
      configured this is an HONEST refusal — no order rows, no fake URL. */
  async topup(actor: Actor, input: { amountMinor: number }): Promise<{ orderId: string; iframeUrl: string }> {
    assertCan(actor.role as unknown as Role, Capability.PAYMENTS_SELF);
    const amountMinor = Math.floor(input.amountMinor);
    if (!Number.isInteger(amountMinor) || amountMinor < TOPUP_MIN_MINOR || amountMinor > TOPUP_MAX_MINOR) {
      throw new ConflictException({ message_key: 'payments.bad_topup_amount' });
    }
    if (!this.paymobEnabled()) {
      throw new ConflictException({ message_key: 'payments.disabled' });
    }
    const profile = await this.repo.riderProfile(actor.id);
    if (!profile) throw new NotFoundException({ message_key: 'payments.rider_not_found' });

    const orderId = randomUUID();       // IS merchant_order_id (R20 §2.2)
    // Order row FIRST (status created) so a checkout failure still leaves an
    // honest failed intent — never a provider order we do not track.
    await this.repo.createOrder({ id: orderId, riderUserId: actor.id, kind: 'topup', amountMinor });
    let checkout;
    try {
      checkout = await this.provider.createCheckout({
        orderId, amountMinor, currency: 'EGP', purpose: 'wallet top-up',
        billing: { name: profile.name, email: profile.email ?? undefined, phone: profile.phone ?? undefined },
      });
    } catch (e) {
      await this.repo.markOrderFailed(orderId);
      throw e;
    }
    await this.repo.markOrderPending(orderId, checkout.providerOrderId ?? '');
    await this.audit.record(actor, 'payments.topup_create', {
      targetType: 'payment_order', targetId: orderId,
      after: { amountMinor, provider: this.provider.name },
    });
    return { orderId, iframeUrl: checkout.iframeUrl ?? '' };
  }

  /** The provider webhook. Order: verify signature → normalize → find OUR
      order → idempotency → amount re-check → apply in ONE transaction. */
  async webhook(payload: unknown): Promise<{ ok: true; duplicate?: boolean }> {
    if (!this.provider.verifyWebhook(payload)) {
      throw new ForbiddenException({ message_key: 'payments.bad_signature' });
    }
    const event = this.provider.normalizeWebhook(payload);
    if (!event.id || !event.orderId) {
      throw new ConflictException({ message_key: 'payments.unknown_order' });
    }
    const order = await this.repo.findOrder(event.orderId);
    if (!order) {
      // A correctly-signed event for an unknown order is a provider/state
      // mismatch: refuse loudly, change nothing, let the provider retry.
      throw new ConflictException({ message_key: 'payments.unknown_order' });
    }
    if (event.amountMinor !== order.amount_minor) {
      throw new ConflictException({
        message_key: 'payments.amount_mismatch',
        details: { orderMinor: order.amount_minor, eventMinor: event.amountMinor },
      });
    }
    if (event.status !== 'succeeded') {
      if (event.status === 'failed') await this.repo.markOrderFailed(order.id);
      return { ok: true };              // pending/failed: acknowledged, no credit
    }

    // Idempotency: the transaction UPDATE ... WHERE status <> 'succeeded'
    // returns zero rows on a replay → duplicate, nothing written.
    const rows: LedgerRowInput[] = order.kind === 'topup'
      ? postTopup(newTxnId(), order.rider_user_id, order.amount_minor, order.id)
      : [];
    if (order.kind !== 'topup') {
      // booking-payment recognition arrives with the fare-capture flow; a
      // succeeded booking order without it is refused, not guessed.
      throw new ConflictException({ message_key: 'payments.unsupported_kind' });
    }
    assertValidPosting(rows);
    const result = await this.repo.applySucceededOrder({
      orderId: order.id, providerTxnId: event.id, raw: event.raw, rows,
    });
    return { ok: true, duplicate: result === 'duplicate' };
  }

  /** Driver marks cash collected at boarding (DEC-078). Idempotent per
      booking; only the journey's own driver; boardable states only. */
  async cashCollected(actor: Actor, bookingId: string): Promise<{ ok: true; duplicate?: boolean }> {
    assertCan(actor.role as unknown as Role, Capability.SCAN_BOARDING);
    const booking = await this.repo.bookingForCashCollected(bookingId);
    if (!booking) throw new NotFoundException({ message_key: 'payments.booking_not_found' });
    if (booking.journey_driver_id !== actor.id) {
      throw new ForbiddenException({ message_key: 'payments.not_your_journey' });
    }
    if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') {
      throw new ConflictException({ message_key: 'payments.booking_not_payable' });
    }
    if (await this.repo.txnExistsForRef('booking', bookingId, 'cash_collected_driver_share')) {
      return { ok: true, duplicate: true };
    }
    const commissionPercent = this.env.COMMISSION_PERCENT;
    const rows = postCashCollected(newTxnId(), actor.id, booking.fare_minor, commissionPercent, bookingId);
    assertValidPosting(rows);
    await this.repo.postRows(rows);
    await this.audit.record(actor, 'payments.cash_collected', {
      targetType: 'booking', targetId: bookingId,
      after: { fareMinor: booking.fare_minor, commissionPercent },
    });
    return { ok: true };
  }

  /** Pay a booking's locked fare FROM the rider's wallet (the DEC-204
      preferred path). Atomic: the advisory-locked spend cannot overdraw;
      idempotent per booking; only the journey's own rider may pay. Path B's
      booking flow calls this when the rider chose "wallet". */
  async chargeWalletForBooking(actor: Actor, bookingId: string): Promise<{ ok: true; duplicate?: boolean }> {
    assertCan(actor.role as unknown as Role, Capability.PAYMENTS_SELF);
    const booking = await this.repo.bookingForCashCollected(bookingId);
    if (!booking) throw new NotFoundException({ message_key: 'payments.booking_not_found' });
    if (booking.rider_user_id !== actor.id) {
      throw new ForbiddenException({ message_key: 'payments.not_your_booking' });
    }
    if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') {
      throw new ConflictException({ message_key: 'payments.booking_not_payable' });
    }
    if (await this.repo.txnExistsForRef('booking', bookingId, 'fare_paid_driver_share')) {
      return { ok: true, duplicate: true };
    }
    if (!booking.journey_driver_id) {
      throw new ConflictException({ message_key: 'payments.no_driver' });
    }
    const commissionPercent = this.env.COMMISSION_PERCENT;
    const rows = postFareFromWallet(
      newTxnId(), actor.id, booking.journey_driver_id, booking.fare_minor, commissionPercent, bookingId);
    assertValidPosting(rows);
    const spent = await this.repo.postRowsIfWalletCovers({
      walletAccount: walletAccount(actor.id),
      amountMinor: booking.fare_minor,
      rows,
    });
    if (spent === 'insufficient') {
      throw new ConflictException({ message_key: 'payments.insufficient_funds' });
    }
    await this.audit.record(actor, 'payments.fare_paid_wallet', {
      targetType: 'booking', targetId: bookingId,
      after: { fareMinor: booking.fare_minor, commissionPercent },
    });
    return { ok: true };
  }

  /** CH06 §6.9 — daily reconciliation, REPORT-ONLY: discrepancies alert,
      never auto-correct. Manager-visible (VIEW_ANALYTICS); super_admin holds
      every capability. */
  async reconciliation(actor: Actor): Promise<{
    ok: boolean; checks: { name: string; ok: boolean; detail?: unknown }[];
  }> {
    assertCan(actor.role as unknown as Role, Capability.VIEW_ANALYTICS);
    const f = await this.repo.reconciliationFacts();
    const checks = [
      { name: 'closed_system_sums_to_zero', ok: f.totalNetMinor === 0, detail: { totalNetMinor: f.totalNetMinor } },
      { name: 'every_succeeded_order_has_postings', ok: f.ordersWithPostings === f.succeededOrders,
        detail: { succeededOrders: f.succeededOrders, ordersWithPostings: f.ordersWithPostings } },
      { name: 'no_orphan_postings', ok: f.postingsWithoutSucceededOrder === 0,
        detail: { postingsWithoutSucceededOrder: f.postingsWithoutSucceededOrder } },
      { name: 'balances_view_matches_recompute', ok: f.viewMatchesRecompute },
    ];
    const ok = checks.every((c) => c.ok);
    if (!ok) {
      // Loud, attributed, recorded — the discrepancy itself is never touched.
      await this.audit.record(null, 'payments.reconciliation_discrepancy', {
        targetType: 'ledger', reason: 'reconciliation reported failures',
        after: { checks },
      });
    }
    return { ok, checks };
  }

  /** Driver earnings + outstanding cash liability (derived, DEC-078 §6.3). */
  async driverEarnings(actor: Actor): Promise<{
    earningsMinor: number; cashLiabilityMinor: number;
  }> {
    assertCan(actor.role as unknown as Role, Capability.VIEW_OWN_EARNINGS);
    const earn = driverEarningsAccount(actor.id);
    const cash = driverCashAccount(actor.id);
    const balances = await this.repo.balancesFor([earn, cash]);
    return {
      earningsMinor: displayBalance(earn, balances.get(earn) ?? 0),
      cashLiabilityMinor: displayBalance(cash, balances.get(cash) ?? 0),
    };
  }

  /** Refunds are ALWAYS wallet credit (DEC-055). Called by the booking
      cancellation flow (Path B) and, later, bounded support refunds. The
      CALLER enforces refund ≤ capture — it is the one that knows the fare. */
  async issueCredit(input: {
    riderId: string; amountMinor: number; bookingId?: string; reason: string; actorLabel: string;
  }): Promise<{ ok: true }> {
    const rows = postRefundCredit(newTxnId(), input.riderId, input.amountMinor, input.bookingId);
    assertValidPosting(rows);
    await this.repo.postRows(rows);
    // actor null = the system posting on behalf of the cancelling flow; the
    // human attribution travels in the reason string, never a faked actor.
    await this.audit.record(null, 'payments.issue_credit', {
      targetType: input.bookingId ? 'booking' : 'wallet', targetId: input.bookingId ?? input.riderId,
      reason: `${input.actorLabel}: ${input.reason}`,
      after: { amountMinor: input.amountMinor, riderId: input.riderId },
    });
    return { ok: true };
  }
}
