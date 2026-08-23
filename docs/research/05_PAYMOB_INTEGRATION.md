# R20 — Paymob Integration Reference (for P3.7+)

Status: RESEARCH COMPLETE for the top-up/booking-payment path · 2026-08-24
Purpose: everything needed to wire Paymob (Egypt) in one file — endpoints, exact
request/response shapes, the official webhook HMAC algorithm, sandbox test data,
our env-variable design, and the owner's account checklist. Sources are named
inline; anything not yet confirmed in our own sandbox run is marked `[UNVERIFIED]`.

Decision context: DEC-179 chose Paymob as the provider; on 2026-08-24 the owner
confirmed **Paymob is the primary payment option in the app UI, cash second**
(DEC-204), gated by a `PAYMOB_ENABLED` feature flag so the option can be hidden
until the account exists (§8.1 hide-not-disable).

---

## 1. Platform overview (what "Paymob" is)

- **Accept** is Paymob's payment gateway platform (Egypt base URL:
  `https://accept.paymob.com/api`). One account + one integration gives:
  cards (Visa/Mastercard/Meeza, 3-D Secure), **mobile wallets**
  (Vodafone Cash, Orange Money, Etisalat Cash), **Fawry/kiosk reference
  payments**, Apple Pay, BNPL (ValU/Aman etc.), bank cards via installments.
- **Payouts** (money OUT to drivers) is a separate product/portal
  (`payouts.paymobsolutions.com`) with its own API and credentials — §8.
- Developer portals: `https://developers.paymob.com` (new global portal, has an
  "Egypt hub") and `https://docs.paymob.com`. The classic Accept API below is
  fully supported and is what we build on (it is server-side, simple, and
  already half-built in `apps/api/src/modules/payments/`).

## 2. The classic Accept server-side flow (what we implement)

```
1  POST /api/auth/tokens            api_key → auth token (cache ~1h)
2  POST /api/ecommerce/orders       register the order (amount_cents, merchant_order_id)
3  POST /api/acceptance/payment_keys  order + billing + integration_id → payment_token
4  open the payment surface          iframe redirect (cards) or wallet request
5  webhook (transaction processed)   Paymob → our server, HMAC-verified
6  (money ops)                       refund / void / capture via API
```

### 2.1 Auth token — `POST /api/auth/tokens`
```json
{ "api_key": "PAYMOB_API_KEY" }        →  { "token": "…" }
```
Token lives ~60 minutes. Cache it in-process with its issue time; refresh on 401.
Source: developers.paymob.com / classic Accept docs.

### 2.2 Order registration — `POST /api/ecommerce/orders`
```json
{
  "auth_token": "…",
  "delivery_needed": false,
  "amount_cents": 150000,              // EGP 1500.00 → integer piastres
  "currency": "EGP",
  "merchant_order_id": "<our ledger order uuid>",   // OUR idempotency key
  "items": [ { "name": "wallet top-up", "amount_cents": 150000, "description": "…", "quantity": "1" } ]
}
```
Response `id` = Paymob's order id (needed in step 3). Notes:
- `amount_cents` is an **integer in minor units** — exactly our `fare_minor`
  convention (INV-30). Never floats.
- Re-registering the same `merchant_order_id` with a **different** amount is
  refused; with the same amount it is treated idempotently `[UNVERIFIED —
  confirm in sandbox]`. We generate one order row per top-up intent in OUR
  ledger and send its id, so the webhook's `obj.order.merchant_order_id`
  is the join key back to our ledger regardless.

### 2.3 Payment key — `POST /api/acceptance/payment_keys`
```json
{
  "auth_token": "…",
  "amount_cents": 150000,
  "expiration": 3600,                  // payment_token TTL, seconds
  "order_id": <paymob order id>,
  "billing_data": {                    // ALL keys are required by the schema;
    "first_name": "…", "last_name": "…", // real values where we have them
    "email": "…", "phone_number": "…",   // (rider profile), "N/A" where not
    "apartment": "N/A", "floor": "N/A", "building": "N/A", "street": "N/A",
    "city": "Alexandria", "country": "EG", "state": "N/A", "postal_code": "N/A",
    "shipping_method": "PKG"
  },
  "currency": "EGP",
  "integration_id": <per method, from dashboard>
}
```
Response `{ "token": "…", "redirect_url": "…" }`.

### 2.4 Open the payment surface
- **Cards / generic (iframe)**: redirect the rider to
  `https://accept.paymob.com/api/acceptance/iframes/{PAYMOB_IFRAME_ID}?payment_token={token}`.
- **Mobile wallet**: `POST /api/acceptance/payments/pay` with body
  `{ "source": { "identifier": "01010101010", "subtype": "WALLET" },
  "payment_token": "…" }` → the rider gets an OTP on their phone; final status
  arrives by webhook. (Server-to-server call with our auth token also works for
  the redirect-return path.)

### 2.5 Webhook — "transaction processed callback"
Paymob POSTs to the URL configured in the dashboard (Developers → Payment
Integrations / Webhook settings):
```json
{ "type": "TRANSACTION", "obj": { "id": 123, "amount_cents": 150000, "success": true, "pending": false,
    "order": { "id": 456, "merchant_order_id": "<our uuid>", "amount_cents": 150000, … },
    "source_data": { "type": "CARD", "sub_type": "MASTERCARD", "pan": "512345******2346" }, … },
  "hmac": "<hex>" }
```
Rules we enforce (CH06 + BUILD_PLAN P3.7 TEST):
1. **Verify HMAC first** (§3 below). Bad signature → 401, no ledger effect.
2. **Idempotent by `obj.id`** (provider transaction id) — providers retry by
   design; five replays must produce ONE ledger effect.
3. **Re-check the amount** against OUR order (`obj.order.merchant_order_id` →
   our row; `obj.amount_cents` must equal it) — never trust the payload alone.
4. Store the raw verified payload for the audit trail (`PaymentEvent.raw`).
5. Only `success === true && pending === false` credits anything.

### 2.6 Refund / void / capture
- Refund: `POST /api/acceptance/void_refund/refund`
  `{ "auth_token": "…", "transaction_id": <id>, "amount_cents": <n> }` — partial
  refunds allowed; a refund may not exceed the captured amount (P3.7 TEST 5).
- Void (same-day, before capture): `POST /api/acceptance/void_refund/void`.
- Capture (auth-then-capture flows): `POST /api/acceptance/void_refund/capture`;
  uncaptured auths auto-void after 14 days.
- Note: per CH06/DEC-055 rider refunds are ALWAYS wallet credit in OUR system;
  the provider refund only moves money back from gateway settlement.

## 3. The official webhook HMAC algorithm (IMPORTANT)

Paymob does **NOT** sign the whole JSON. The official method (Paymob docs —
"Transaction Callbacks" / "HMAC Calculation", same Accept platform on
docs.paymob.pk and developers.paymob.com):

1. Take these fields **of `obj`**, in exactly this (lexicographic) order:
   ```
   amount_cents, created_at, currency, error_occured, has_parent_transaction,
   id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded,
   is_standalone_payment, is_voided, order.id, owner, pending,
   source_data.pan, source_data.sub_type, source_data.type, success
   ```
   (`order.id` and `source_data.*` are nested paths; missing/null → empty string.)
2. Concatenate the **values** as strings — no separators, no keys.
3. `HMAC-SHA512(concatenation, PAYMOB_HMAC_SECRET)` → **hex, lowercase**.
4. Compare (constant time) with the `hmac` field/query param.

- The HMAC secret is account-level (dashboard: profile/developers tab).
- Other callback types (card tokens, payouts) use the same method with a
  different field list — e.g. the disbursement callback nests under `obj.*`.
- **Our previous verifier signed `JSON.stringify(obj)` — wrong scheme; would
  reject every real webhook. Fixed 2026-08-24 (G-076) to the official
  filtered-field algorithm.**
- Community tutorials showing `JSON.stringify(obj)` HMAC are incorrect — do
  not copy them.

## 4. Sandbox / test data

- Paymob Egypt accounts start in **test/sandbox mode** (dashboard test tab);
  live mode is activated after KYC/contract. Same API, test credentials.
- Test card (community-published, works against sandbox): Mastercard
  `5123 4567 8901 2346`, exp `12/25`, CVV `123`.
- Test wallet: `01010101010`, PIN `123456`, OTP `123456`.
- The authoritative test-cards page is `https://docs.paymob.com/testing`
  `[confirm exact current list during sandbox bring-up — UNVERIFIED]`.

## 5. Owner account checklist (what only the owner can do)

1. Register at `https://paymob.com` (Egypt) — business details; sandbox is
   immediate, live requires contract/KYC.
2. Dashboard → Settings → Developers (or "Online" payment integrations):
   - copy the **API key**;
   - enable **cards (online)** and **mobile wallet** integrations → note each
     **integration id**;
   - create/note the **iframe id** for cards;
   - copy the **HMAC secret** (profile/developers tab).
3. Set the **webhook URL** to `https://<api-host>/v1/payments/webhook` (the
   exact route lands with P3.7).
4. Put the values in Railway env vars (§6) — never in code or chat.
5. (Later, M5) separate **Payouts portal** account for driver payouts (§8).

## 6. Our env-variable design (12-factor; values only in Railway/.env)

Already present: `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_INTEGRATION_ID`.
To be added with the P3.7 build (names checked by `check-env-example.sh`):

| Variable | Purpose | Default |
|---|---|---|
| `PAYMOB_ENABLED` | master feature flag (`true`/`false`). Effective state = flag AND all required keys present. When off, the Paymob option is **hidden** app-wide (§8.1), wallet top-up shows cash/inactive honestly | `false` |
| `PAYMOB_MODE` | `sandbox` \| `live` (adapter already honours this) | `sandbox` |
| `PAYMOB_BASE_URL` | API base | `https://accept.paymob.com/api` |
| `PAYMOB_IFRAME_ID` | cards iframe id | — |
| `PAYMOB_WALLET_INTEGRATION_ID` | mobile-wallet integration id | — |

The API will expose the **boolean only** (e.g. `GET /v1/payments/config` →
`{ "paymobEnabled": true }`) for the web UI — secrets never reach the client.
This answers the owner's question: yes, env variables are the industry-standard
way (12-factor), plus an explicit enable flag so the option can be switched off
entirely (pre-account, or as an incident kill-switch) with zero code changes.

## 7. Security checklist for the build (P3.7)

- Webhook: HMAC-verify → idempotency (`obj.id` unique) → amount re-check →
  only then post ledger rows (two rows summing to zero, CH06).
- Everything money is integer minor units end-to-end (Paymob `amount_cents` ↔
  our `*_minor`) — no float ever.
- `timingSafeEqual` for signature compare; reject missing/malformed as 401.
- No trust in the browser "response callback" (redirect) — status changes only
  from the verified webhook or an authenticated order-status API call.
- Secrets only in env; `.env.example` carries names; secret scanner stays green.

## 8. Payouts (driver money-out) — M5+, reference only

Separate portal (`payouts.paymobsolutions.com`), separate credentials.
`POST /disburse/{issuer}` with `issuer` ∈ `vodafone | etisalat | orange |
bank_wallet | bank_card | instant_bank`; `amount` (EGP, decimal), `msisdn`
(11 digits, +2 auto-added) for wallets, `national_id` **mandatory**,
`client_reference_id` (our UUID — the timeout-recovery key), async final
status via callback. Min EGP 112 for `instant_bank`. Test wallet numbers are
listed in the payouts docs. Auth model for the payouts API: user/pass →
bearer token `[UNVERIFIED — confirm at adoption, M5]`.

## 9. Sources

- developers.paymob.com (global portal; Egypt hub) · docs.paymob.com —
  official API reference, webhook/HMAC pages, testing page.
- docs.paymob.pk/docs/transaction-webhooks and /docs/hmac-calculation — the
  official HMAC field list and algorithm (same Accept platform).
- payouts.paymobsolutions.com/docs/instant_cashin_api — payouts/disburse API.
- Community cross-checks: accept.paymob.com flow examples (StackOverflow,
  baselrabia/paymob config, rafa763/Paymob-Payment-Gateway Node example,
  PaymobAccept API-Postman-Collections).
- Earlier project research: `03_PAYMENTS_EGYPT.md` (R10) — provider landscape
  and why Paymob; InstaPay has no direct public API (PSP/partner-bank only).
