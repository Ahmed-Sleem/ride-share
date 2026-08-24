/* Payments service tests (P3.7). The repository is a fake that SIMULATES the
   SQL semantics the real one enforces (UNIQUE provider_txn_id, the
   WHERE status <> 'succeeded' claim, derived balances) — the real SQL layer
   gets its own integration test that runs whenever a database is reachable.
   Webhooks are signed with the OFFICIAL Paymob field list. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { PaymentsService } from './payments.service.js';
import type { PaymentsRepository, PaymentOrderRow } from '../infra/payments.repository.js';
import type { LedgerRowInput } from '../domain/ledger.js';
import { paymobSignedString } from '../contracts/webhook.verifier.js';
import type { Actor } from '../../identity/contracts/types.js';
import type { Env } from '../../../config/env.js';


/** Matches a Nest exception by its machine key (response.message_key). */
const key = (k: string) => (e: unknown) => (e as { response?: { message_key?: string } })?.response?.message_key === k;

const RIDER: Actor = { id: '11111111-1111-1111-1111-111111111111', role: 'rider' };
const DRIVER: Actor = { id: '22222222-2222-2222-2222-222222222222', role: 'driver' };
const OPS: Actor = { id: '33333333-3333-3333-3333-333333333333', role: 'operations' };
const SECRET = 'test-hmac-secret';

function makeEnv(over: Partial<Env> = {}): Env {
  return {
    PAYMOB_ENABLED: 'false', PAYMOB_MODE: 'sandbox',
    PAYMOB_BASE_URL: 'https://accept.paymob.com/api',
    PAYMOB_API_KEY: undefined, PAYMOB_HMAC_SECRET: SECRET,
    PAYMOB_INTEGRATION_ID: undefined, PAYMOB_IFRAME_ID: undefined,
    PAYMOB_WALLET_INTEGRATION_ID: undefined, COMMISSION_PERCENT: 0,
    ...over,
  } as Env;
}

/** Fake repo with the REAL SQL semantics the service relies on. */
class FakeRepo {
  orders = new Map<string, PaymentOrderRow>();
  ledgerRows: LedgerRowInput[] = [];
  balances = new Map<string, number>();
  bookings = new Map<string, Awaited<ReturnType<PaymentsRepository['bookingForCashCollected']>>>();
  audits: string[] = [];

  toRepo(): PaymentsRepository { return this as unknown as PaymentsRepository; }

  async createOrder(input: { id: string; riderUserId: string; kind: 'topup' | 'booking'; amountMinor: number }) {
    const row: PaymentOrderRow = {
      id: input.id, rider_user_id: input.riderUserId, kind: input.kind,
      amount_minor: input.amountMinor, status: 'created', provider: 'paymob',
      provider_order_id: null, provider_txn_id: null, booking_id: null,
      raw: null, created_at: new Date(), updated_at: new Date(),
    };
    this.orders.set(input.id, row);
    return row;
  }
  async findOrder(id: string) { return this.orders.get(id) ?? null; }
  async markOrderPending(id: string, providerOrderId: string) {
    const o = this.orders.get(id)!; o.status = 'pending'; o.provider_order_id = providerOrderId;
  }
  async markOrderFailed(id: string) {
    const o = this.orders.get(id)!; if (o.status !== 'succeeded') o.status = 'failed';
  }
  async applySucceededOrder(input: { orderId: string; providerTxnId: string; raw: unknown; rows: LedgerRowInput[] }) {
    // UNIQUE(provider_txn_id) + WHERE status <> 'succeeded', simulated:
    if ([...this.orders.values()].some((o) => o.provider_txn_id === input.providerTxnId)) {
      return 'duplicate' as const;
    }
    const o = this.orders.get(input.orderId)!;
    if (o.status === 'succeeded') return 'duplicate' as const;
    o.status = 'succeeded'; o.provider_txn_id = input.providerTxnId; o.raw = input.raw;
    this.ledgerRows.push(...input.rows);
    return 'applied' as const;
  }
  async balancesFor(accounts: string[]) {
    return new Map(accounts.map((a) => [a, this.balances.get(a) ?? 0]));
  }
  async entriesForAccount() { return []; }
  async totalNetMinor() { return 0; }
  async txnExistsForRef(refType: string, refId: string, reason: string) {
    return this.ledgerRows.some((r) => r.refType === refType && r.refId === refId && r.reason === reason);
  }
  async postRows(rows: LedgerRowInput[]) { this.ledgerRows.push(...rows); }
  async riderProfile(id: string) { return { id, name: 'Test Rider', email: 't@example.com', phone: null }; }
  async bookingForCashCollected(id: string) {
    return this.bookings.get(id) ?? null;
  }
}

function makeAudit(fake: FakeRepo) {
  return { record: async (_actor: unknown, action: string) => { fake.audits.push(action); } } as never;
}

function service(repo: FakeRepo, env = makeEnv()) {
  return new PaymentsService(repo.toRepo(), makeAudit(repo), env);
}

/** A correctly-signed Paymob webhook for our order. */
function signedWebhook(order: { id: string; merchant: string; amount: number }, success = true) {
  const obj = {
    id: 987654321, pending: false, amount_cents: order.amount, currency: 'EGP',
    error_occured: false, owner: 42,
    order: { id: order.id, merchant_order_id: order.merchant, amount_cents: order.amount },
    is_3d_secure: true, source_data: { type: 'CARD', sub_type: 'VISA', pan: '411111******1111' },
    is_auth: false, is_capture: true, is_refunded: false, is_standalone_payment: true,
    is_voided: false, success, has_parent_transaction: false, integration_id: 345678,
    created_at: '2026-08-24T10:05:00+00:00',
  };
  const hmac = createHmac('sha512', SECRET).update(paymobSignedString(obj)).digest('hex');
  return { obj, hmac };
}

// ── config / feature flag ────────────────────────────────────────────────

test('config: Paymob hidden when the flag is off — even with keys set (DEC-204)', async () => {
  const repo = new FakeRepo();
  const s = service(repo, makeEnv({ PAYMOB_ENABLED: 'false', PAYMOB_API_KEY: 'k', PAYMOB_INTEGRATION_ID: 'i', PAYMOB_IFRAME_ID: 'f' }));
  const cfg = await s.config(RIDER);
  assert.equal(cfg.paymobEnabled, false);
  assert.equal(cfg.topupMinMinor, 500);        // bounds come from the ONE place
  assert.equal(cfg.topupMaxMinor, 1_000_000);
});

test('config: enabled only when flag AND every key is present', async () => {
  const repo = new FakeRepo();
  const s = service(repo, makeEnv({
    PAYMOB_ENABLED: 'true', PAYMOB_API_KEY: 'k', PAYMOB_INTEGRATION_ID: 'i', PAYMOB_IFRAME_ID: 'f',
  }));
  assert.equal((await s.config(RIDER)).paymobEnabled, true);
  const s2 = service(new FakeRepo(), makeEnv({ PAYMOB_ENABLED: 'true', PAYMOB_API_KEY: 'k' }));
  assert.equal((await s2.config(RIDER)).paymobEnabled, false); // keys missing
});

test('config: staff cannot call payments endpoints (authority)', async () => {
  const s = service(new FakeRepo());
  await assert.rejects(() => s.config(OPS), key('auth.forbidden'));
});

// ── top-up ───────────────────────────────────────────────────────────────

test('topup with Paymob unconfigured is an honest refusal, no order rows', async () => {
  const repo = new FakeRepo();
  const s = service(repo); // flag off
  await assert.rejects(() => s.topup(RIDER, { amountMinor: 5000 }), (e: { response?: { message_key?: string } }) =>
    e.response?.message_key === 'payments.disabled');
  assert.equal(repo.orders.size, 0, 'no order rows may be left behind');
});

test('topup amount bounds are enforced (integer minor units)', async () => {
  const s = service(new FakeRepo(), makeEnv({ PAYMOB_ENABLED: 'true', PAYMOB_API_KEY: 'k', PAYMOB_INTEGRATION_ID: 'i', PAYMOB_IFRAME_ID: 'f' }));
  await assert.rejects(() => s.topup(RIDER, { amountMinor: 100 }), key('payments.bad_topup_amount'));
  await assert.rejects(() => s.topup(RIDER, { amountMinor: 2_000_001 }), key('payments.bad_topup_amount'));
});

// ── webhook ──────────────────────────────────────────────────────────────

test('webhook with a bad signature never touches state', async () => {
  const repo = new FakeRepo();
  const s = service(repo);
  const payload = signedWebhook({ id: '1', merchant: 'x', amount: 100 });
  await assert.rejects(() => s.webhook({ ...payload, hmac: 'deadbeef' }), key('payments.bad_signature'));
  assert.equal(repo.orders.size, 0);
  assert.equal(repo.ledgerRows.length, 0);
});

test('webhook with NO signature is refused', async () => {
  const s = service(new FakeRepo());
  await assert.rejects(() => s.webhook({ obj: { id: 1 } }), key('payments.bad_signature'));
});

test('signed success credits the wallet ONCE; 5 replays = one effect (P3.7 TEST 2)', async () => {
  const repo = new FakeRepo();
  const s = service(repo);
  const order = await repo.createOrder({ id: 'ord-1', riderUserId: RIDER.id, kind: 'topup', amountMinor: 15000 });
  const payload = signedWebhook({ id: '11', merchant: 'ord-1', amount: 15000 });
  for (let i = 0; i < 5; i++) {
    const res = await s.webhook(payload);
    assert.equal(res.ok, true);
    if (i > 0) assert.equal(res.duplicate, true, `replay ${i} must be a duplicate`);
  }
  assert.equal(repo.ledgerRows.filter((r) => r.reason === 'topup').length, 1, 'exactly ONE topup posting set');
  assert.equal(order.status, 'succeeded');
});

test('webhook amount mismatch is refused — the payload is never trusted', async () => {
  const repo = new FakeRepo();
  const s = service(repo);
  await repo.createOrder({ id: 'ord-2', riderUserId: RIDER.id, kind: 'topup', amountMinor: 15000 });
  const payload = signedWebhook({ id: '12', merchant: 'ord-2', amount: 1 }); // 1 piastre!
  await assert.rejects(() => s.webhook(payload), key('payments.amount_mismatch'));
  assert.equal(repo.ledgerRows.length, 0);
});

test('webhook for an unknown order is refused loudly', async () => {
  const s = service(new FakeRepo());
  const payload = signedWebhook({ id: '13', merchant: 'does-not-exist', amount: 1000 });
  await assert.rejects(() => s.webhook(payload), key('payments.unknown_order'));
});

test('webhook failure event: acknowledged, nothing credited', async () => {
  const repo = new FakeRepo();
  const s = service(repo);
  const order = await repo.createOrder({ id: 'ord-3', riderUserId: RIDER.id, kind: 'topup', amountMinor: 5000 });
  const payload = signedWebhook({ id: '14', merchant: 'ord-3', amount: 5000 }, false);
  const res = await s.webhook(payload);
  assert.equal(res.ok, true);
  assert.equal(order.status, 'failed');
  assert.equal(repo.ledgerRows.length, 0);
});

// ── wallet / derived balance ─────────────────────────────────────────────

test('wallet returns the DERIVED balance and interprets the normal side', async () => {
  const repo = new FakeRepo();
  repo.balances.set(`wallet:${RIDER.id}`, 15000);
  const s = service(repo);
  const w = await s.wallet(RIDER);
  assert.equal(w.balanceMinor, 15000);
});

test('bookingPaymentInfo: sufficient only when the wallet covers the fare', async () => {
  const repo = new FakeRepo();
  repo.balances.set(`wallet:${RIDER.id}`, 3000);
  const s = service(repo);
  const yes = await s.bookingPaymentInfo(RIDER, 3000);
  const no = await s.bookingPaymentInfo(RIDER, 3001);
  assert.equal(yes.sufficient, true);
  assert.equal(no.sufficient, false);
});

// ── cash collected ───────────────────────────────────────────────────────

test('cash collected: only the journey driver, idempotent per booking', async () => {
  const repo = new FakeRepo();
  repo.bookings.set('bk-1', {
    id: 'bk-1', rider_user_id: RIDER.id, status: 'CONFIRMED', fare_minor: 5000,
    journey_driver_id: DRIVER.id, journey_status: 'OPEN_FOR_BOOKING',
  });
  const s = service(repo, makeEnv({ COMMISSION_PERCENT: 20 }));
  const first = await s.cashCollected(DRIVER, 'bk-1');
  assert.equal(first.ok, true);
  assert.equal(repo.ledgerRows.length, 2); // commission + driver share
  const second = await s.cashCollected(DRIVER, 'bk-1');
  assert.equal(second.duplicate, true, 'double-tap is idempotent');
  assert.equal(repo.ledgerRows.length, 2, 'no additional rows');
});

test('cash collected: another driver is refused; a rider is refused', async () => {
  const repo = new FakeRepo();
  repo.bookings.set('bk-2', {
    id: 'bk-2', rider_user_id: RIDER.id, status: 'CONFIRMED', fare_minor: 5000,
    journey_driver_id: '99999999-9999-9999-9999-999999999999', journey_status: 'LOCKED',
  });
  const s = service(repo);
  await assert.rejects(() => s.cashCollected(DRIVER, 'bk-2'), key('payments.not_your_journey'));
  await assert.rejects(() => s.cashCollected(RIDER, 'bk-2'), key('auth.forbidden')); // no SCAN_BOARDING
});

test('cash collected: cancelled booking is not payable', async () => {
  const repo = new FakeRepo();
  repo.bookings.set('bk-3', {
    id: 'bk-3', rider_user_id: RIDER.id, status: 'CANCELLED', fare_minor: 5000,
    journey_driver_id: DRIVER.id, journey_status: 'LOCKED',
  });
  const s = service(repo);
  await assert.rejects(() => s.cashCollected(DRIVER, 'bk-3'), key('payments.booking_not_payable'));
});

// ── issue credit (the Path B contract) ───────────────────────────────────

test('issueCredit posts one refund_credit row and audits it as the system', async () => {
  const repo = new FakeRepo();
  const s = service(repo);
  await s.issueCredit({ riderId: RIDER.id, amountMinor: 1250, bookingId: 'bk-9', reason: 'driver released slot', actorLabel: 'bookings.cancel' });
  assert.equal(repo.ledgerRows.length, 1);
  assert.equal(repo.ledgerRows[0]!.reason, 'refund_credit');
  assert.ok(repo.audits.includes('payments.issue_credit'));
});

// ── top-up success path (live provider stubbed) ──────────────────────────

test('topup success: order row FIRST, then pending + iframe URL + audit', async () => {
  const repo = new FakeRepo();
  const s = service(repo, makeEnv({
    PAYMOB_ENABLED: 'true', PAYMOB_API_KEY: 'k', PAYMOB_INTEGRATION_ID: 'i', PAYMOB_IFRAME_ID: 'f',
  }));
  // stub the live checkout (the adapter itself is covered by its own tests)
  (s as unknown as { provider: { createCheckout: unknown } }).provider.createCheckout = async (req: { orderId: string; amountMinor: number }) => ({
    providerOrderId: 'paymob-9', iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/f?payment_token=tok-${req.orderId}-${req.amountMinor}`,
  });
  const res = await s.topup(RIDER, { amountMinor: 5000 });
  assert.match(res.iframeUrl, /payment_token=tok-/);
  const order = repo.orders.get(res.orderId)!;
  assert.equal(order.status, 'pending');
  assert.equal(order.provider_order_id, 'paymob-9');
  assert.equal(order.amount_minor, 5000);
  assert.ok(repo.audits.includes('payments.topup_create'));
});

test('topup checkout failure marks the order failed — nothing pending', async () => {
  const repo = new FakeRepo();
  const s = service(repo, makeEnv({
    PAYMOB_ENABLED: 'true', PAYMOB_API_KEY: 'k', PAYMOB_INTEGRATION_ID: 'i', PAYMOB_IFRAME_ID: 'f',
  }));
  (s as unknown as { provider: { createCheckout: unknown } }).provider.createCheckout = async () => {
    throw new Error('provider down');
  };
  await assert.rejects(() => s.topup(RIDER, { amountMinor: 5000 }), /provider down/);
  assert.equal(repo.orders.size, 1, 'the honest failed intent is kept');
  assert.equal([...repo.orders.values()][0]!.status, 'failed');
});
