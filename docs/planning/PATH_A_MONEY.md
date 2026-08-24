# PATH A — MONEY & COMMERCIAL (owner: Agent A)

> **You are Agent A.** You own this path. **Another agent (Agent B) works in
> parallel on a completely separate path** (`docs/planning/PATH_B_JOURNEY.md`
> — boarding, live journey, rider/driver screens, M4/M7). You never edit each
> other's owned files; shared files follow the protocol in §5. Agent B's
> commits will appear on `main` — expect them, `git pull --rebase` before
> every push, never revert them. You also **review Agent B's pushed commits
> from time to time and fix forward** anything broken (a small `fix(...)`
> commit, documented in the changelog).
>
> Written 2026-08-24 at repo HEAD `c092b69` (CI all green). Keep this file
> appended, never rewritten (project rule P2).

## 0. The binding rules — read before ANY work, every session

1. `docs/process/ENGINEERING_STANDARD.md` — the binding working rules (§0–§19).
2. `docs/process/GUI_STANDARD.md` — the interface standard.
3. `docs/process/REPOSITORY_STANDARD.md` — publishing rules (the repo is now
   PUBLIC — DEC-203: no secrets ever, no live domains beyond the app's own).
4. `docs/process/PROJECT_RULES.md` — P1: **every open point goes to the owner
   as an MCQ with a recommendation; you close nothing alone.**
5. `AGENTS.md` (repo root) — the 7 rules that are not optional.
6. The M3 checklist `docs/process/checklists/M3_core_journey.md` (you tick
   P3.7 only) and `docs/planning/BUILD_PLAN.md` P3.7 (what/how/test/break/done).

Non-negotiables, abbreviated (the full text wins):
- **§0.2** every new check is deliberately broken once and observed failing,
  then restored. A check never seen failing is not a check.
- **§0.3 / one definition** — SQL only in `**/infra/*.repository.ts`;
  authority only in `security/authority/authority.resolver.ts`; design tokens
  only in `apps/web/src/styles/shell.html` `:root`/`[data-theme="dark"]`;
  brand only from `packages/brand/brand.json`.
- **§8.1** never show a control that will be refused — hide, don't disable.
  When Paymob is off (`PAYMOB_ENABLED=false` or keys missing), the option is
  HIDDEN, and the wallet says so honestly.
- **§8 production code is real** — no mocks, no fake balances, no stub
  success. A payment provider that is not configured REFUSES (the existing
  `PaymobAdapter` sandbox behaviour) — it never pretends.
- **Money is integer minor units** (piastres) everywhere — INV-30. No float
  ever touches a money path. The ledger is double-entry, append-only; balance
  is DERIVED from entries (INV-26..29, CH06).
- **Schema changes only via migrations** (`infra/migrations/`,
  node-pg-migrate); after every migration regenerate `infra/schema.sql` and
  `packages/shared-types/src/db.generated.ts` (commands in §6).
- **Run `pnpm verify` before every push.** Push only green. Then confirm
  remote == local.

## 1. Where the project stands (verify, don't trust this page)

- Live app: https://ride-shareweb-production.up.railway.app (Railway
  auto-deploys `main`; deploys are independent of GitHub Actions CI).
- Done: M0–M2 (minus owner fieldwork P2.5), M3 P3.1–P3.6 (routes, slots,
  driver claim, rider booking + seat guard + boarding code), landing v2,
  advanced search (Fuse.js, AR/EN), policies, CI restored (G-073/074/077
  closed), Paymob reference research R20, official webhook HMAC verifier
  (G-076 fixed).
- **Your next point: M3 P3.7 — wallet/ledger/payments (below, §7).**
- The gap register: `docs/process/AUDIT_AND_TODO.md` (append-only). The
  decisions register: `docs/decisions/DECISIONS_REGISTER.md` — read DEC-078,
  DEC-204, DEC-055/056/148, DEC-179 before designing anything.

## 2. Fresh-environment setup (sandbox resets; repeat per session)

```bash
sudo npm install -g pnpm@9.15.9
git clone https://github.com/Ahmed-Sleem/ride-share && cd ride-share
# (the owner supplies the GitHub PAT for push access when needed)
git config user.name "Ahmed-Sleem" && git config user.email "ahmed-sleem@users.noreply.github.com"
pnpm install --frozen-lockfile
# chrome libs for the puppeteer browser suite:
sudo apt-get update -qq && sudo apt-get install -y -qq libnss3 libnspr4 libatk1.0-0 \
  libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libatspi2.0-0
# local postgres for db:verify:
sudo apt-get install -y -qq postgresql && sudo service postgresql start
sudo -u postgres psql -c "CREATE ROLE \"$(id -un)\" LOGIN SUPERUSER;"   # peer auth — NO password anywhere
sudo -u postgres psql -c "CREATE DATABASE rideshare_dev OWNER \"$(id -un)\";"
export PATH="/usr/lib/postgresql/17/bin:$PATH"
export DATABASE_URL="postgres:///rideshare_dev?host=/var/run/postgresql"
pnpm migrate up
```

Session start (ALWAYS, in order): `git log --oneline -20` (what did the other
agent push?) → tail `docs/process/CHANGELOG.md` → `docs/process/AUDIT_AND_TODO.md`
→ this file → `pnpm verify` baseline before changing anything.

## 3. Verification (all three layers must be green before every push)

```bash
pnpm verify                                    # repo guards + build + typecheck + lint + all unit/API tests
cd apps/web && ./verify.sh && cd ../..         # full browser suite (a11y, layout, landing, breaks)
DATABASE_URL=postgres:///rideshare_dev?host=/var/run/postgresql pnpm db:verify   # migrations + schema + types
```

## 4. File ownership — EXCLUSIVE (Agent B never edits these; you never edit his)

**Path A owns:**
- `apps/api/src/modules/payments/**` — every layer (contracts/, domain/, application/, infra/, api/, tests inline `*.test.ts`).
- `apps/web/src/screens/wallet.js` — wallet, top-up, payment-method, history screens.
- Everything money/commercial that lands later (M5 pricing/promotions backend, M6 subscription billing, Paymob Payouts integration) unless the file is in the shared list.

**Path B owns (DO NOT EDIT — request via the owner or a fix-forward commit only if broken):**
- `apps/api/src/modules/journeys/**`, `apps/api/src/modules/bookings/**`, `apps/api/src/modules/notifications/**` (new), `apps/api/src/modules/support/**` (M4).
- `apps/web/src/screens/rider.js`, `driver.js`, `staff.js`, `landing.js`, `auth.js`, `admin.js`, `apps/web/src/lib/search.js`.

## 5. Shared files — append-only protocol (both agents)

| File | Rule |
|---|---|
| `apps/web/build.js` | PARTS list: add your own new src files adjacent to your owned ones, one line, with a comment. (wallet.js is already registered.) |
| `apps/web/src/shell/app.js` | SHEETS/PAGES tables: append your own entries at the end of the relevant table with a `/* path X */` comment. Never reorder or delete the other's entries. |
| `apps/web/src/lib/api.js` | Append your own methods inside a marked section at the END of the `API` object: `/* ===== payments client (Path A) ===== */`. Path B has his own marked section. Do not touch his. |
| `apps/web/src/data/content.js` | i18n keys: append your own block at the END of `en:{...}` and of `ar:{...}` with marker `/* ——— Path A: wallet/payments ——— */`. Prefix every key `w_` (Path B uses `j_`). Both languages always. |
| `apps/web/src/lib/components.js` | Extend an existing primitive rather than forking it; a genuinely new shared primitive may be added at the END with a comment. If in doubt → owner MCQ. |
| `apps/web/src/styles/shell.html` | New TOKENS only (in `:root` AND `[data-theme="dark"]`). Never a colour literal anywhere else (check-tokens fails). |
| `apps/api/src/app.module.ts` | Append your module import at the END of the imports array with `// Path A` comment. |
| `apps/api/src/config/env.ts` + `.env.example` | Append your own env block at the end (A: payments vars; B: journey/notifications vars). `check-env-example.sh` enforces parity — update both together. |
| `infra/migrations/` | **Numbering parity: Path A takes ODD numbers (0017, 0019, …), Path B EVEN (0018, 0020, …).** Before creating one: `git pull --rebase origin main`; if your number is taken, take the next of your parity. |
| `infra/schema.sql`, `packages/shared-types/src/db.generated.ts` | GENERATED — regenerate after every pull that adds the other's migration; NEVER hand-merge (commands in §6). |
| `apps/web/tests/unit.test.js` | Append your own group(s) at the END with a `/* ===== Path A ===== */` marker. |
| `apps/web/tests/breaks.sh` | Append your own break cases at the END. |
| `docs/process/CHANGELOG.md`, `IMPLEMENTATION_LOG.md`, `AUDIT_AND_TODO.md` | Append-only, your own entries. |
| `docs/process/checklists/M3_core_journey.md` | Tick ONLY your own points (A: P3.7 + money halves of the verification row). |

## 6. After adding a migration (both agents, exact commands)

```bash
git pull --rebase origin main
export PATH="/usr/lib/postgresql/17/bin:$PATH"
export DATABASE_URL="postgres:///rideshare_dev?host=/var/run/postgresql"
pnpm migrate up
pg_dump --schema-only --no-owner --no-privileges --no-comments "$DATABASE_URL" \
  | sed -E '/^(--|SET |SELECT pg_catalog|\\[a-z])/d' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
  | grep -v '^$' > infra/schema.sql
pnpm db:types        # regenerates db.generated.ts (commit it)
pnpm db:verify       # must be green
```

## 7. THE WORK — Path A backlog (in order; each point: what/how/test/break/done)

### P3.7 — Wallet, ledger, cash and Paymob (M3 money point)

Source of truth for requirements: `docs/planning/BUILD_PLAN.md` §P3.7, CH06
(`docs/specification/chapters/CH06_money.md`), R20
(`docs/research/05_PAYMOB_INTEGRATION.md` — the complete Paymob reference:
endpoints, bodies, official HMAC, sandbox data, owner checklist), DEC-204
(Paymob FIRST in the UI, cash second; `PAYMOB_ENABLED` master flag),
DEC-078 (cash sequence), DEC-055/148 (refunds = wallet credit; forfeit
rules).

**P3.7.1 — Migration (odd number, yours): ledger + wallet + payment orders.**
- `ledger_entries`: append-only double-entry. Columns at minimum:
  `id uuid PK`, ` txn_id uuid NOT NULL` (groups the rows of ONE transaction —
  they must sum to zero), `debit_account text NOT NULL`, `credit_account
  text NOT NULL` (account keys like `wallet:<userUuid>`,
  `driver_earnings:<userUuid>`, `driver_cash:<userUuid>`, `platform_revenue`,
  `provider_clearing:paymob`, `promotion_budget` — CH06 §6.1 account table),
  `amount_minor integer NOT NULL CHECK (> 0)`, `reason text NOT NULL`
  (`booking_fare`, `topup`, `cash_collected`, `refund_credit`,
  `commission`, …), `ref_type text`, `ref_id uuid` (booking/payment order),
  `config_version text` (INV-22), `created_at timestamptz default now()`.
  Enforce append-only: `REVOKE UPDATE, DELETE` is not enough with a shared
  role — add a trigger that RAISES on UPDATE/DELETE (like the seat guard
  pattern) + a CHECK that amount > 0 + a deferred constraint trigger or
  application-level transaction that refuses to commit a `txn_id` whose rows
  do not sum to zero (test it — see the break list).
- `payment_orders`: `id uuid PK` (this IS the `merchant_order_id` sent to
  Paymob), `rider_user_id uuid`, `kind text` (`topup`|`booking`), `amount_minor`,
  `status text` (`created`|`pending`|`succeeded`|`failed`), `provider text`
  (`paymob`), `provider_order_id text`, `provider_txn_id text UNIQUE`
  (webhook idempotency key), `booking_id uuid null`, `raw jsonb` (verified
  webhook, audit trail), timestamps.
- Wallet "balance" is NOT stored — it is `SELECT sum(...) over the rider's
  wallet account rows` (a SQL view `wallet_balances` is allowed; a mutable
  balance column is FORBIDDEN — BUILD_PLAN break test 4).
- Update `infra/schema.sql` + regenerate types (§6). db:verify green.

**P3.7.2 — Domain layer (pure, tested):** posting rules — every post is two+
rows summing to zero; refund cannot exceed the original capture; cash
sequence per DEC-078 §6.3 (scan happens in Path B; YOUR endpoint is the
"cash collected" tap): `driver_cash += fare`, `driver_earnings += fare −
commission`, `platform_revenue += commission`; commission percent from
configuration (env-configurable `COMMISSION_PERCENT` default e.g. 20 — an
MCQ to the owner for the default value, P1).

**P3.7.3 — Application/infra/api:** `PaymentsModule` wiring into
`app.module.ts`; endpoints (all behind `IdentityGuard`, authority via the
ONE resolver — add capabilities if needed: e.g. `PAYMENTS_SELF` for riders;
drivers already hold `VIEW_OWN_EARNINGS`):
- `GET /payments/config` (public-safe, authenticated): `{ paymobEnabled }`
  — boolean ONLY; effective state = `PAYMOB_ENABLED=true` AND api key AND
  hmac secret AND integration ids present. Drives UI hiding (§8.1).
- `GET /payments/wallet` — balance (derived) + recent entries (i18n'd reason
  labels client-side).
- `POST /payments/topup` — creates `payment_orders` row + provider checkout
  (`PaymobAdapter.createCheckout`, R20 flow: auth token cached ~1h →
  order → payment key → iframe URL). Returns the redirect/iframe URL. When
  Paymob is not configured: 409 `payments.disabled` — never a fake URL.
- `POST /payments/webhook` — THE critical endpoint. Order: parse →
  `verifyPaymobWebhook` (official algorithm, already built + tested) →
  idempotency by `provider_txn_id` (replay 5× = one ledger effect) → amount
  re-check against OUR payment_order (`obj.order.merchant_order_id`) →
  status checks (`success && !pending`) → post ledger rows in ONE db
  transaction → 200. Bad signature → 401, zero side effects. Raw payload
  stored.
- `POST /payments/cash-collected` (driver, `SCAN_BOARDING` capability is
  Path B's scan capability — reuse the EXISTING `SCAN_BOARDING`; do not
  invent a second one §8.2): input `bookingId`; validates via Path B's
  bookings contract (§8 below) that the booking is the driver's journey's
  and in a boardable state; idempotent; posts the DEC-078 entries.
- `POST /bookings/:id/refund-credit` is NOT yours — refund-as-credit flows
  through `issueCredit` called by Path B's cancel path (§8 contract). You
  expose it; B consumes it when he wires cancellation forfeits (DEC-148).

**P3.7.4 — Web UI (`screens/wallet.js` + your marked sections):**
- Wallet screen: real derived balance, entries list (loading/empty/error
  states §13 GUI standard), top-up CTA.
- Top-up sheet: amount presets + custom (integer EGP), Paymob FIRST as the
  recommended method (DEC-204), cash second (cash = "pay the driver at
  boarding" explanation), Paymob hidden entirely when `/payments/config`
  says disabled — with one honest sentence instead (§8.1).
- Booking review: the payment-method choice (Paymob/wallet first, cash
  second) — coordinate: the review screen lives in Path B's `rider.js`;
  YOUR contract is the `API.payments.bookingPaymentInfo()` client fn +
  a self-contained `paymentChoice()` component exported from `wallet.js`
  that B embeds. Do not edit `rider.js` yourself.
- Driver "earnings" summary on the duty screen is Path B's layout — you
  provide `GET /payments/driver/earnings` (journey-completed accrual, cash
  liability netted) and the client fn; B embeds it.

**P3.7.5 — Tests (all break-observed §0.2, in the module + your unit group):**
1. Whole-ledger invariant: after every test scenario, `SELECT` ALL rows —
   per-`txn_id` sums are zero AND the total table sums to zero.
2. Webhook idempotency: the same verified webhook replayed 5× → exactly one
   credit (one `payment_orders` row stays `succeeded`, one txn posted).
3. Bad signature → 401, no rows. (Verifier already tested; wire-level test too.)
4. Balance derivation: property test — 1,000 random generated histories,
   derived balance == sum of rows. Break: introduce any mutable balance and
   it must drift/fail.
5. Refund cannot exceed capture (domain test).
6. Concurrent top-up + booking spend leaves a correct balance (two parallel
   promises, then re-derive).
7. `PAYMOB_ENABLED=false` → config false, topup 409, UI hides (unit).
8. Cash-collected: correct driver/journey/state only; double-tap idempotent.
DONE: a rider tops up (sandbox or flag-off honest refusal), books, cancels,
is refunded to wallet credit, driver marks cash — and the ledger balances to
zero at every step, with `pnpm verify` + web suite + `pnpm db:verify` green.

### Next points after P3.7 (same discipline, own files)
- **P-A2** M5 commercial: promotions/budget ledger account (INV-29), pricing
  suggestion tool backend (DEC-133), manager dashboards.
- **P-A3** M6 subscription billing (charge up front, recognise per journey
  consumed — CH06 §6.5).
- **P-A4** Paymob Payouts integration (R20 §8; `MinPayoutThreshold`,
  payout = earnings − cash liability, statements line-by-line).
- **P-A5** Daily reconciliation job skeleton (ledger vs provider report vs
  cash liabilities; discrepancies ALERT, never auto-correct — CH06 §6.9).

## 8. Cross-path contracts (Agent B programs against these; you implement)

You own `apps/api/src/modules/payments/contracts/public.ts`. Expose exactly:

```ts
export abstract class PaymentsPublic {
  /** Driver marks cash collected at boarding (DEC-078). Idempotent per
      booking. Throws Conflict/Forbidden with message_key on misuse. */
  abstract markCashCollected(actor: Actor, bookingId: string): Promise<{ ok: true }>;
  /** Credit a rider wallet (refunds are ALWAYS credit — DEC-055). */
  abstract issueCredit(input: { riderId: string; amountMinor: number;
    bookingId?: string; reason: string; actorLabel: string }): Promise<{ ok: true }>;
  /** Everything the booking flow needs to render payment choice. */
  abstract bookingPaymentInfo(riderId: string, fareMinor: number): Promise<{
    paymobEnabled: boolean; walletBalanceMinor: number; sufficient: boolean }>;
}
```

You CONSUME from Path B (`bookings/journeys contracts/public.ts`, he extends):
```ts
getBookingForPayment(bookingId): Promise<{ id; riderUserId; driverUserId;
  journeyId; fareMinor; status: BookingStatus; paymentMethod: 'wallet'|'cash'|null }>;
```
Until B lands it, wire-level defensive behaviour: 409 `payments.no_booking`
(the UI hides the cash button — feature detection, §8.1). Web side: your
`API.payments.*` marked section is the ONLY client surface; B feature-detects
`typeof API.payments?.markCashCollected === "function"`.

## 9. Docs duties every point (not optional)

1. Tick your box in `docs/process/checklists/M3_core_journey.md` (only yours).
2. Append to `docs/process/CHANGELOG.md` (one dated entry per session).
3. Append to `docs/process/IMPLEMENTATION_LOG.md` for every closed gap
   (what/files/tests/verified/self-check).
4. Append new gaps to `docs/process/AUDIT_AND_TODO.md` — G-0xx, next free ID
   (check the file tail; coordinate collisions by pulling first).
5. Update `docs/planning/PATH_A_MONEY.md` progress notes (append).
6. README "What works today" when a user-visible feature ships.

## 10. Git protocol (both agents — this is what keeps the repo un-corrupted)

```bash
git pull --rebase origin main     # BEFORE every push — resolve per §5 rules
pnpm verify && (cd apps/web && ./verify.sh) && pnpm db:verify   # all green
git push origin main              # NEVER force-push, NEVER rewrite history
git fetch origin && git rev-parse HEAD origin/main   # must match
```
- Small, frequent, conventional commits: `feat(payments): …`, `fix(ci): …`.
- On a rebase conflict in a SHARED file: apply §5 (append sections, keep both
  sides). In an OWNED file of the other path: STOP — that means he touched
  your file or you touched his; fix forward only if clearly broken, else
  owner MCQ.
- Never `git revert` the other agent's commit. Fix forward with a new commit.
- Railway auto-deploys every push of `main` — after pushing, smoke the live
  app: `curl -s https://ride-shareweb-production.up.railway.app/healthz` →
  `{"ok":true,"service":"web","api":"up"}` and `/v1/healthz` → `db:"up"`.
- CI runs on every push (4 jobs; all must stay green — it is now real and
  was repaired 2026-08-24, G-073/G-074/G-077).

## 11. Monitoring duty (yours)

After each of your work sessions (and at least every few days of parallel
work): `git log --oneline --author=... ` / plain `git log` — review Agent B's
new commits, run the full verify on the merged result, fix forward anything
broken (small `fix(...)` commit + changelog line), and keep this file's
"progress notes" current. If Agent B's work is stuck or unsafe (red CI he
cannot fix, ownership violations), fix forward and record a gap; raise an
MCQ to the owner for anything ambiguous.

## 12. Progress log (append-only)

- 2026-08-24 — Path created; wallet screen extracted to
  `apps/web/src/screens/wallet.js` (Path A ownership); build+349 unit+14 a11y
  green; this file + `PATH_B_JOURNEY.md` pushed. Next: P3.7.1 migration.

## ⚠️ Never commit a half-broken tree (learned 2026-08-24, real near-miss)

`apps/web/tests/breaks.sh` (part of `./verify.sh`) DELIBERATELY edits source
files (e.g. `const password = val(...)` → `const password = ""`), runs the
tests to watch them fail, then restores via git. If the harness is aborted
mid-run (timeout, manual stop), the broken edit STAYS in your working tree —
and a blind `git add -A && git push` would ship a real bug. Therefore:

- Before EVERY commit: `git status --short && git diff` — confirm the diff
  is exactly your intended work. Anything you did not write (a `.bak` file,
  a one-token corruption) → `git checkout -- <file>` and delete the `.bak`.
- Never abort `./verify.sh` mid-run if you can avoid it; if you must,
  restore sources afterwards before anything else.
- **Fast-verification policy (owner-directed): locally run `pnpm verify`
  (+ `pnpm db:verify` when migrations changed) before every push; the FULL
  browser suite is GitHub CI's job** (it runs the identical `verify.sh` in
  the `verify-gui` job). Treat red CI as stop-everything and fix forward.

- 2026-08-24 (later) — **P3.7 backend COMPLETE**: migration 0017 + ledger
  domain (closed-system caught a sign-model bug pre-integration) + payments
  service/controller/webhook + real Paymob adapter (G-078 fixed) + env/flag.
  201 API tests; §0.2 breaks observed (HMAC, amount, idempotency, trigger).
  Next: P3.7.4 wallet UI (top-up sheet, balance + entries, payment choice
  component for B's review screen, driver earnings embed), then e2e with
  Paymob sandbox when keys arrive. Open MCQs: COMMISSION_PERCENT (G-079),
  top-up presets.

- 2026-08-24 (final) — P3.7 COMPLETE on Path A's side: backend audit fixes +
  wallet UI live (372 unit / 203 API / breaks 2×CAUGHT). Remaining for full
  money loop: Path B's manifest "cash collected" button (contract ready),
  booking-payment recognition when a booking pays from wallet (posts on
  booking creation — next Path A point), real Paymob keys (owner), and the
  G-079 commission MCQ.
