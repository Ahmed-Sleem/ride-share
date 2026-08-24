# NEXT AGENT HANDOVER — THE COMPLETE REMAINING WORK
# (you are Agent B; Agent A becomes the auditor)

> **READ THIS FIRST — THE STANDARD (the owner's exact words, binding on every
> point in this file):**
> "It must be perfect complete, no mocks no demos, all should be production
> ready best practices, all must be industrial standard, all must be fully
> secure, fully production ready, without any production blockers."
> If any piece of work cannot meet that bar in this session, it stays HIDDEN
> and is recorded as a gap — never shipped half-built, never a placeholder
> pretending to work (engineering standard §8, §8.1). Every check you add is
> broken once and observed failing before it is trusted (§0.2). Every value,
> component and rule has ONE definition (§0.3). Authority is decided in ONE
> place (§8.2). Nothing you build may leave a production blocker behind.

> **Roles from now:** YOU (Agent B) build everything in this file.
> Agent A no longer writes features — he AUDITS your work when the owner says
> so, and fixes bugs found. Expect his audit; build so it finds nothing.

Written 2026-08-24 at repo HEAD `3752091` (CI all-green, live health green).
Author: Agent A (Path A — money, maps, planner search), from the live repo.

---

## 0. SESSION-START CHECKLIST — run EVERY session, in this order

1. `git pull --rebase origin main` → `git log --oneline -25` (what landed
   since you last looked — the audit may have pushed fixes).
2. Read the tail of `docs/process/CHANGELOG.md` (append-only reality log)
   and `docs/process/AUDIT_AND_TODO.md` (the one gap register).
3. Re-read the CURRENT point of this file (§6) + your own progress notes (§9).
4. Environment (a fresh sandbox resets — see §4): install pnpm, deps,
   postgres, chrome libs; set the credential-free DATABASE_URL; `pnpm migrate up`.
5. Baseline `pnpm verify` BEFORE changing anything. Red baseline = STOP,
   find the cause or ask the owner (MCQ). Never build on red.
6. Before any design decision with options: check
   `docs/decisions/DECISIONS_REGISTER.md` — decided things are not re-litigated.
7. Open points go to the OWNER as MCQ questions with a recommended option
   (project rule P1/P5 — you never close an open point alone).

## 1. WHAT THE PRODUCT IS (one paragraph, verified)

Shared rides on **fixed routes at a fixed price** in Alexandria (any city by
configuration). An operator publishes routes + a slot grid; a driver claims a
slot in two taps; a rider books a seat for a published departure at a locked
flat fare, boards at a fixed stop by QR/6-digit code, and gets off anywhere
along the line. Money: cash at boarding and wallet top-up (Paymob), one
double-entry append-only ledger, refunds always as wallet credit. Full spec:
`docs/specification/MASTER_SPECIFICATION.md` (Part I ≈ 10 minutes).

**Live right now (verify with these exact commands):**
```
curl -sS https://ride-shareweb-production.up.railway.app/healthz
→ {"ok":true,"service":"web","api":"up"}
curl -sS https://ride-shareweb-production.up.railway.app/v1/healthz
→ {"ok":true,"service":"api","db":"up"}
```

**Railway services (do not mix them up):**
| Service | Job | Opens |
|---|---|---|
| `api` | NestJS backend — all logic + PostgreSQL. No public UI. | Other services via `/v1` |
| `web` | The single-file HTML app + Node server proxying `/v1` to api. THE site. | Browsers |
| `mobile` | The SAME HTML built into the Capacitor Android shell (`www/`) + `/healthz` + `/v1` proxy. A deploy here does NOT update already-installed APKs — the APK/AAB is built by GitHub CI (jobs "Android debug APK" and "Android Play AAB"). | The installed APK |

Repo: https://github.com/Ahmed-Sleem/ride-share (PUBLIC — DEC-203; never any
secret/token/credential in code, docs, or history). The owner supplies the
GitHub PAT for pushes when you start; never write it into any file.

**Stack:** pnpm monorepo · web = ONE self-contained HTML assembled by
`apps/web/build.js` from `apps/web/src/**` (no framework, no runtime CDN for
app code; maps load their SDK lazily) · api = NestJS 11 + Fastify modular
monolith · PostgreSQL ONLY (no ORM — hand-written parameterised SQL lives
only in `**/infra/*.repository.ts`) · migrations via node-pg-migrate
(`infra/migrations/`) · CI = 6 GitHub jobs on every push (repo guards+unit,
GUI browser suite, db verify, 2× docker images, 2× Android builds) · Railway
auto-deploys `main`.

## 2. THE BINDING RULES (read the full files; this is the digest)

Read, in order: `AGENTS.md` (repo root) →
`docs/process/ENGINEERING_STANDARD.md` (§0–§19 — binding) →
`docs/process/GUI_STANDARD.md` → `docs/process/REPOSITORY_STANDARD.md` →
`docs/process/PROJECT_RULES.md` (P1–P6) → `docs/planning/BUILD_PLAN.md`
("How to read a point").

The ten that bite most:
1. **§0.2** a check never observed failing is not a check — break every new
   check once, watch it fail for the right reason, restore (mini-harness
   pattern: §4.4).
2. **§0.3 one definition** — SQL only in repositories; authority only in
   `apps/api/src/security/authority/authority.resolver.ts`; design tokens
   only in `apps/web/src/styles/shell.html` (`:root` + `[data-theme="dark"]`,
   enforced by `check-tokens.sh` — it has caught Agent A twice); brand only
   from `packages/brand/brand.json` (`check-branding.sh`).
3. **§8.1** never show a control that will be refused — HIDE, don't disable.
4. **§8.2** permission decisions in the one resolver; add a capability there,
   never a role check inline (`check-authority.sh`).
5. **§8 production code is real** — no mocks/fakes/placeholders; a provider
   that is unconfigured REFUSES honestly (the PaymobAdapter sandbox pattern).
6. **Money** = integer minor units everywhere (INV-30); balances are DERIVED
   from the ledger (never a mutable balance column); refunds are ALWAYS
   wallet credit (DEC-055).
7. **Schema changes only via migrations**; after each migration regenerate
   `infra/schema.sql` + `packages/shared-types/src/db.generated.ts` (exact
   commands §4.3); `pnpm db:verify` must be green.
8. **The web app is bilingual EN+AR (RTL) + light/dark** — every user-facing
   string in `apps/web/src/data/content.js` BOTH languages (parity-tested);
   complete states everywhere (loading/empty/error); a11y (labels, focus,
   combobox/listbox patterns like `apps/web/src/screens/planner.js`).
9. **Break-case discipline**: when a change stales a break case
   (`BROKEN-BREAK` in CI) re-anchor it IN THE SAME COMMIT and mini-prove it
   catches. Sed delimiters: never `|` when the pattern contains `||` (born-
   broken case, fixed once). Syntax-check shell scripts (`bash -n`) — a
   release script once shipped unparsed.
10. **Git protocol**: `git pull --rebase origin main` → full local verify →
    `git push origin main` (NEVER force-push) → confirm remote==local.
    Railway auto-deploys every push; smoke the live health after.

**Fast-verification policy (owner-directed):** locally run `pnpm verify`
(+ `pnpm db:verify` when migrations changed) + the 320px overflow probe (§4.5)
on touched pages; the heavy browser suite is CI's job. If your push turns CI
red, fix forward immediately — a red main blocks both of us. Small audits
before every push beat one big audit at the end.

## 3. WHAT IS BUILT (verified state — do not rebuild these)

| Area | State | Where to look |
|---|---|---|
| Identity/auth (email+password, OTP, staff CRUD, protected system admin, PG-backed throttling) | Done | `apps/api/src/modules/identity/**` |
| Drivers & vehicles (approval state machines, ops queue) | Done | `modules/drivers/**`, web `screens/staff.js` |
| Geography (stops desk tool w/ real OSM map + click-to-place, field capture, two-person verification) | Done (corridor fieldwork P2.5 is the owner's) | `modules/geo/**` |
| Routes + slot grid + driver two-tap claim + rider booking (fare locked, DB seat guard, 6-digit code) | Done | `modules/routes/**`, `modules/journeys/**`, `modules/bookings/**` |
| Boarding scan + manifest (P3.8) + live journey (P3.9: start/arrive/complete/abort, slip, alight, positions `last_lat/lng`) | Done | `journeys/**`, web `screens/driver.js`, `screens/rider.js` |
| Wallet & payments backend (P3.7): append-only double-entry ledger (migration 0017), derived balances, Paymob checkout + official-HMAC webhook (idempotent), cash-collected (DEC-078), ATOMIC wallet fare payment (advisory lock), report-only reconciliation | Done | `modules/payments/**`, `docs/research/05_PAYMOB_INTEGRATION.md` (R20 — the complete Paymob reference) |
| Wallet UI (balance, history, top-up sheet, paymentChoice component) | Done | `apps/web/src/screens/wallet.js` |
| A→B planner = Uber-style search (DEC-206): snappy AR/EN typeahead + combobox a11y + live map + tap-to-pin (nearest stop) + my-location | Done | `screens/planner.js`, `lib/map.js` |
| Maps (R21/DEC-205): `RouteMap` + `SearchMap` primitives on real OSM tiles; embedded on rider boarding/review, driver journey (own position dot), ops live fleet map (`GET /journeys/live`) | Done | `lib/map.js`, `screens/*.js` (search `RouteMap (DEC-205`) |
| M4 safety & support: SOS (silent mode), reports, share-my-ride, staff incident queue (migration 0020), rider safety screen | Done | `modules/support/**`, `screens/rider.js` riderSafety |
| M7 mobile pipeline: Capacitor wrap, durable GPS outbox (P7.2), camera scan (P7.3), batched GPS (P7.4), FCM, debug-APK + AAB CI jobs | Done (Play SIGNING secrets = owner, see §7) | `apps/mobile/**`, `.github/workflows/ci.yml` |
| Landing v3, desktop density (DEC-200), admin overview, audit log | Done | `screens/landing.js`, styles, `screens/admin.js` |
| CI: 6 jobs all green at `3752091`; Railway live health green | Verified | GitHub Actions |

**Skeleton modules (README/contract only, no endpoints):** `analytics`,
`config`, `matching`, `notifications` (module exists? check — FCM send lives
with mobile), `pricing`, `promotions`, `requests`, `vehicles`. These land in
the remaining work below — do NOT treat them as done.

## 4. ENVIRONMENT, VERIFICATION, AND THE DAILY LOOP

### 4.1 Fresh-sandbox setup (the sandbox RESETS between sessions — expect it)
```bash
sudo npm install -g pnpm@9.15.9
git clone https://github.com/Ahmed-Sleem/ride-share && cd ride-share
git config user.name "Ahmed-Sleem" && git config user.email "ahmed-sleem@users.noreply.github.com"
pnpm install --frozen-lockfile
# chrome libs (for local puppeteer probes):
sudo apt-get update -qq && sudo apt-get install -y -qq libnss3 libnspr4 libatk1.0-0 \
  libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libatspi2.0-0
# local postgres (credential-free, peer auth — NEVER put user:pass@ in any file; the secret scanner rejects it):
sudo apt-get install -y -qq postgresql && sudo service postgresql start
sudo -u postgres psql -c 'CREATE ROLE "'$(id -un)'" LOGIN SUPERUSER;'
sudo -u postgres psql -c 'CREATE DATABASE rideshare_dev OWNER "'$(id -un)'";'
export PATH="/usr/lib/postgresql/17/bin:$PATH"
export DATABASE_URL="postgres:///rideshare_dev?host=/var/run/postgresql"
pnpm migrate up
```
If the sandbox resets MID-SESSION: your pushed work is safe on GitHub; the
local `.git` may be stale or gone — re-clone, re-apply only unpushed work,
and ALWAYS `git status` + `git diff` line-by-line before committing (a stale
snapshot once carried a break-harness corruption into a diff).

### 4.2 Verification (the three layers)
```bash
pnpm verify          # repo guards (secrets/tokens/authority/boundaries/env-parity) + build + typecheck + lint + ALL unit/API tests
cd apps/web && ./verify.sh   # the FULL browser suite — long; CI runs it; run locally only when asked
DATABASE_URL="postgres:///rideshare_dev?host=/var/run/postgresql" pnpm db:verify   # migrations up/down/up + schema + generated types
```

### 4.3 After adding a migration (exact commands)
```bash
export PATH="/usr/lib/postgresql/17/bin:$PATH"
export DATABASE_URL="postgres:///rideshare_dev?host=/var/run/postgresql"
pnpm migrate up
pg_dump --schema-only --no-owner --no-privileges --no-comments "$DATABASE_URL" \
  | sed -E '/^(--|SET |SELECT pg_catalog|\\[a-z])/d' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
  | grep -v '^$' > infra/schema.sql
pnpm db:types && git add infra/schema.sql packages/shared-types/src/db.generated.ts   # stage BEFORE db:verify (it diffs worktree vs index)
pnpm db:verify
```
Next migration number: **0021** (0017–0020 exist).

### 4.4 §0.2 mini-harness (prove one break case fast, not the 11-min suite)
```bash
{ echo '#!/usr/bin/env bash'; echo 'set -u'; echo "cd $(pwd)/apps/web"; echo 'PASS=0; FAIL=0';
  sed -n '/^run_break () {/,/^}/p' apps/web/tests/breaks.sh
  <your run_break block copied from tests/breaks.sh>; } > /tmp/mini.sh && bash /tmp/mini.sh
```

### 4.5 The 320px overflow probe (run on EVERY page you touch, before push)
This exact check caught two real bugs (half-width bar; 13px svg escape). In
`apps/web`: a short puppeteer script that loads `dist-preview.html` at
320×568, sets `S.view="app"; S.authed=true; S.role=...; S.page=...`, renders,
then measures every element's `getBoundingClientRect()` for
`right > clientWidth || left < 0` (skipping `el.ownerSVGElement` children) —
assert widest ≤ 1px. Copy the pattern from the planner fix commit `84ca1f8`.

## 5. HOW THE TWO AGENTS COLLIDE-FREE (ownership is now simple)

- **You own everything.** The old Path A/Path B split is historical context
  (`docs/planning/PATH_A_MONEY.md`, `PATH_B_JOURNEY.md` — read them for the
  design notes, not for ownership). Agent A only audits + fixes bugs after
  you finish.
- **The shared-file append protocol still applies** between you and the
  auditor: `apps/web/src/lib/api.js`, `data/content.js` (i18n key blocks),
  `tests/unit.test.js`, `tests/breaks.sh`, `docs/process/*` — append your
  sections at marked points; never rewrite the other's entries.
- If you see commits not made by you: `git pull --rebase`, read them, do not
  revert; if one of yours was fixed forward by the audit, learn the lesson
  from its commit message.

## 6. THE REMAINING WORK — every point, in dependency order

Format per point: WHAT · WHY (decisions) · WHERE (exact code) · DESIGN ·
TESTS · §0.2 BREAK · DONE · REFERENCES. Sizes are honest: S ≈ a session-hour
or two, M ≈ half a session, L ≈ a full session.

---

### W1 (S·money) — Wire the WALLET payment into the booking flow
The money loop's last unwired step: the rider's payment CHOICE exists but
nothing calls the charge when booking.
- **WHY:** DEC-204 (Paymob first, wallet, cash); the atomic charge service is
  BUILT and tested — only the call is missing.
- **WHERE:** `apps/web/src/screens/rider.js` → the booking submit path
  (`bookAction`/equivalent near `riderReview`); the choice UI:
  `paymentChoice()` in `apps/web/src/screens/wallet.js` (sets `S.payMethod`);
  the API client: `API.topup`-style method pattern in `lib/api.js`; backend
  endpoint `POST /payments/bookings/:id/pay-wallet`
  (`apps/api/src/modules/payments/api/payments.controller.ts`) →
  `PaymentsService.chargeWalletForBooking` (atomic, idempotent, refuses
  `payments.insufficient_funds`).
- **DESIGN:** booking with method=cash → exactly today's flow (nothing to
  do). method=wallet → after `POST /bookings` succeeds, call pay-wallet; on
  `insufficient_funds` show the honest message + offer the top-up sheet (§8.1
  — never a dead button); on success the trips screen marks the fare PAID
  FROM WALLET. The booking must NEVER be left "booked but uncharged" silently:
  surface a clear state (paid-cash-at-boarding vs paid-from-wallet) on the
  booked/trips screens (i18n both languages).
- **TESTS:** unit — method=wallet path calls the endpoint and renders the
  paid state; insufficient → honest message + top-up offer; cash path
  unchanged. API tests already cover the charge (209+ tests in
  `payments.service.test.ts`).
- **BREAK:** remove the pay-wallet call → the paid-state test must fail.
- **DONE:** rider books with wallet balance, sees PAID; ledger rows appear
  (`fare_paid_*` legs); driver manifest shows the payment state via the
  existing `payments` contract (`contracts/public.ts` documents all wiring
  points).
- **REFS:** `payments/contracts/public.ts` (the wiring notes),
  `docs/specification/chapters/CH06_money.md` §6.2–6.3.

### W2 (M·maps) — GEOCODED PLACE SEARCH (the last piece of the planner ask)
Today the typeahead matches STOPS + ROUTES only. The owner asked for
Google-Maps-snappy "type the first letters → all close things": arbitrary
PLACES must match too.
- **WHY:** DEC-206 (owner's explicit UX ask); DEC-198 (OSM/Nominatim,
  free, no key, server-side).
- **WHERE:** NEW `GET /geo/places?q=` in
  `apps/api/src/modules/geo/` (controller+service+repository pattern of the
  module; the module already has the layered dirs). Web:
  `apps/web/src/screens/planner.js` (`plannerRenderList`) + `lib/api.js`.
- **DESIGN (production-grade, secure):**
  - Server-side proxy to Nominatim (`https://nominatim.openstreetmap.org/
    search?q=…&format=jsonv2&limit=5&accept-language=en|ar&viewbox=<Alexandria
    bbox>&bounded=1`). REQUIRED by Nominatim's usage policy: a real
    User-Agent identifying the app, max 1 req/s, cache results (a
    `place_cache` table keyed by normalized query, TTL ≥ 1 day), and the
    API-level throttle already exists (`@Throttle` — set e.g. 10/min/user).
  - Response shape: `[{id, name_en, name_ar?, lat, lng, kind:"place"}]`;
    MERGE ordering in the client: exact/substring STOP hits first (local,
    instant), then route hits, then geocoded places (async, appended when
    they arrive — never block the local list: the snappiness comes from
    rendering local hits immediately, places stream in after).
  - Choosing a PLACE as destination: the recommendation engine works on
    stops — snap the place to the NEAREST indexed stops (reuse
    `nearestStop` + `pointToSegmentMeters` from `lib/search.js`) and show
    "serves X · 400 m walk" (the engine's walk-alight logic already scores
    segments near B — read `planJourneys` in `screens/rider.js`).
  - Failure/timeout of the geocoder = the local list keeps working (the map
    and stop search never depend on the network). i18n both languages.
- **TESTS:** API — throttle active; cache hit does not re-call upstream
  (assert with an injected fake fetch); malformed q refused. Unit — merged
  ordering (stops before places), place→nearest-stop snapping, graceful
  degradation without network.
- **BREAK:** remove the cache → the no-second-upstream-call test must fail;
  reorder merge (places first) → the ordering test must fail.
- **DONE:** typing "stan" surfaces "Stanley Bridge" (place) alongside stop
  matches; picking it plans to the nearest boarding/alighting stops with
  honest walking distances; Nominatim policy respected.
- **REFS:** DEC-198 in the register; `docs/research/06_MAPS_UX.md`;
  Nominatim usage policy (search it — respect it: UA, 1 rps, caching).

### W3 (L·commercial — M5) — Fare management, promotions, coverage, analytics
BUILD_PLAN Phase 5 has three points with full TEST/BREAK specs — BUILD THEM
EXACTLY AS WRITTEN THERE (they are already production-grade):
- **P5.1 Fare management** (`docs/planning/BUILD_PLAN.md` §P5.1 — read it in
  full): manager edits a fare with PREVIEW against recent journeys
  (read-only computation — break-test proves preview never writes), full
  attribution (who/when/why/previous — audit log + a `fare_history` table),
  effective-from, time-boxed temporary changes that REVERT AUTOMATICALLY
  (a scheduler: simplest honest pattern for Railway single-instance =
  `setInterval` job in the API checking `effective_to` every minute + the
  check on read; document the assumption), and a STATIC code check that no
  demand-multiplier path exists (a `scripts/check-*.sh` guard, wired into
  `scripts/verify-repo.sh`, that fails on `surge|multiplier|demand_factor`
  identifiers in fare paths — per test 5). Existing bookings keep locked
  fares (re-assert). Screens G-13/G-14 (spec CH10d).
- **P5.2 Promotions & flash sales** (§P5.2): time-boxed, route+window
  targeted, BUDGET-CAPPED (the cap check must be atomic — advisory-lock or
  `SELECT … FOR UPDATE` counter in a `promotions` table + redemptions
  ledger-ref'd to `promotion_budget` (the account EXISTS in
  `payments/domain/ledger.ts` — use it, INV-29); one promo per booking
  (stacking refused); redemption attributable + reversible (compensating
  ledger rows, never edits); expired promo replay refused. Screen G-15.
- **P5.3 Coverage board + claim bonus** (§P5.3): manager view of slot
  coverage (uncovered slots per route/window — the data exists: routes ×
  slots × journeys), + the configurable claim bonus/incentive (DEC-132 —
  visibility, suggestion, incentive tiers; no forced assignment).
- **Analytics dashboards (G-10/G-17 + monitors in §8):** the `analytics`
  module is a SKELETON — build the events ingestion (append-only
  `analytics_events` table; the web app already emits where relevant — add
  `POST /analytics/events` batched, throttled, validated) and the manager
  read models. Keep it pseudonymous (no movement data in the clear beyond
  what operations needs — CH13 §13.2, G-043).
- **Migrations:** next numbers from 0021 (see §4.3).
- **REFS:** BUILD_PLAN §P5.1–P5.3 (full TEST/BREAK specs), CH06 §6.8 +
  CH06a (pricing), CH07 (dashboards G-10..G-17), DEC-060/082/113/133/139,
  screens CH10d. Ledger: `payments/domain/ledger.ts` (PROMOTION_BUDGET).

### W4 (L·recurring — M6) — Subscriptions + recurring claims
- **P6.1 Subscription products** (BUILD_PLAN §P6.1 — full spec there):
  rides-credits on a route over a period, sold ONLY against slots with
  `committed = true` claims (INV-33 — the `journeys.committed` column
  exists); honesty rule: expiry notice BEFORE purchase, skip/pause controls
  prominent (DEC-154: unused days EXPIRE, no rollover); charge up front,
  RECOGNISE revenue per consumed journey (ledger postings on each ride —
  CH06 §6.5); entitlement decrement is atomic under concurrent bookings;
  pro-rated refund as wallet credit; committed-supply-lost → subscribers
  protected + notified (notifications module EXISTS — see
  `modules/notifications/`). Billing from wallet balance first (the wallet
  is built).
- **P6.2 Recurring claims + daily reservation** (§P6.2): driver recurring
  claim (weekly pattern → claims each slot with the same two-tap feel, the
  DEC-132 model), rider daily reservation option.
- **UI:** recurring claims on the driver work board; subscription purchase +
  next-N-rides view on rider (screens R-50/R-51, D-11/D-12 in CH10b/c).
- **REFS:** BUILD_PLAN §P6.1–P6.2 + Phase-6 exit criteria; CH03 lifecycle,
  DEC-130/154; `journeys.committed` (migration 0015).

### W5 (M·money) — Paymob PAYOUTS (driver money-out) + statements
- **WHY:** CH06 §6.7 (payout = earnings − cash liability − fees), DEC-080
  (weekly); the ledger already tracks `driver_earnings:*` and
  `driver_cash:*` per driver (`payments/domain/ledger.ts`,
  `PaymentsService.driverEarnings`).
- **WHERE:** `modules/payments/` (extend; adapter pattern next to
  `contracts/paymob.adapter.ts`). R20 §8 (payouts reference): separate
  portal + `POST /disburse/{issuer}`, `national_id` mandatory,
  `client_reference_id` = OUR uuid (timeout-recovery key), async final
  status. Driver UI: earnings screen (driver.js has the entry).
- **DESIGN:** `PayoutsAdapter` behind the same `PaymentProvider`-style
  interface discipline (env: `PAYMOB_PAYOUTS_*`; unconfigured → honest
  refusal `payments.payouts_not_configured`, §8.1 hidden until configured).
  Weekly payout run (manager-triggered first — automation only when the
  owner asks): batch per driver above `MIN_PAYOUT_THRESHOLD` (env, default
  100000 minor = 1000 EGP), idempotent per (driver, week) — a `payouts`
  table keyed unique; every payout = ledger txn moving
  `driver_cash`/clearing into a payouts settlement account; DRIVER
  STATEMENT screen: line-by-line rides → earnings → deductions → payout
  (CH06 §6.7 "inspect line by line"). Failed payouts retry + alert ops
  (audit log entry + ops banner).
- **TESTS:** idempotent double-run; threshold respected; statement sums ==
  ledger deltas (property test); unconfigured refusal; disburse response
  mapping (fake transport injected — no live calls in tests).
- **BREAK:** drop the unique key → double-payout test fails.
- **REFS:** R20 (`docs/research/05_PAYMOB_INTEGRATION.md` §8), CH06 §6.7,
  `payments/driverEarnings` (the live balances source).

### W6 (S·money) — Automated daily reconciliation (CH06 §6.9)
The CHECK exists (`GET /payments/reconciliation`, report-only, audited).
Automate it: a daily job (same scheduler pattern as W3's fare revert) that
runs the checks, and on discrepancy: audit-log entry `payments.
reconciliation_discrepancy` + an OPS VISIBLE red banner on the ops home +
(ahead of FCM wiring) a notification row. NEVER auto-correct (§6.9). Add a
test proving a seeded discrepancy raises the alert and writes zero rows.
- **REFS:** `PaymentsService.reconciliation`, CH06 §6.9.

### W7 (S·safety) — M4 remainder: signal instrumentation + masked calling gate
- G-055/056 instrumentation (the M4 checklist's open boxes): emit analytics
  events for push-delivery failures (P7.5 FCM send results) and
  alighting-signal usage (G-053) — feeds W3's analytics. Add the ops-facing
  counters (no new screens needed initially — the analytics dashboards
  render them).
- Masked calling: STAYS HIDDEN until a telephony provider exists (§8.1);
  when the owner picks one, build behind env with honest refusal first.
- **REFS:** `docs/process/checklists/M4_safety_support.md` (open boxes),
  G-053/055/056 rows in `docs/process/AUDIT_AND_TODO.md`.

### W8 (S·GUI) — GUI-polish checklist remainder (`docs/process/checklists/GUI_polish.md`)
- Two-pane list+detail for staff tables at ≥840px (list left, detail right;
  the shell's `main--wide` exists; touch keeps the current stack pattern).
- Fluid type via `clamp()` for the type scale (tokens in shell.html — one
  definition; verify with the layout suite + 200%-zoom spot check).
- Then tick the checklist's verification boxes (CI layout matrix green).

### W9 (M·launch — M8) — Validation & launch rehearsal (BUILD_PLAN Phase 8)
- **P8.1 Simulation to set configuration defaults** (§P8.1 — read it):
  a simulation harness (script under `scripts/` or `apps/api/src/../sim`)
  that replays a synthetic day of demand against the REAL services (seed a
  scratch DB; NOT connected to production) and prints the recommended
  defaults (seat caps, throttle limits, slip caps, payout threshold). No
  mocks of OUR logic — it drives the real API endpoints.
- **P8.2 Load & failure rehearsal** (§P8.2): a k6/autocannon-style load
  script against a scratch deployment (booking + scan + wallet paths), a
  documented failure drill (kill DB → healthz 503s correctly, no wedged
  process — the pool's fail-fast exists; prove it), and the results
  recorded in `docs/process/` with numbers.
- **Security/launch hardening pass (owner-run items — document, don't do):**
  rotate `JWT_SECRET` if ever exposed; change `ADMIN_PASSWORD` after first
  login (the seeder never updates an existing admin — see
  `modules/identity/application/admin.seeder.ts`); verify Railway forced
  HTTPS; `CORS_ORIGINS` set to the real domains.
- **Record the M3 e2e corridor pass** (still unticked in
  `checklists/M3_core_journey.md`): create route → publish → claim → book →
  top-up (sandbox-off honest path if no keys) → scan → complete, with real
  command/browser evidence, and tick the box with proof.

### W10 (S) — Paymob SANDBOX end-to-end (the day the owner provides keys)
R20 §5 is the owner checklist (account, API key, HMAC secret, integration
ids, iframe id, webhook URL `https://<api-host>/v1/payments/webhook`). When
keys land in Railway: set `PAYMOB_ENABLED=true` + keys → the flow lights up
with ZERO code changes → run the sandbox top-up with R20 §4 test cards →
verify the webhook (idempotent replay!) → verify the ledger → record the
e2e in the changelog. Do NOT add code for this — only configuration.

### W11 (S·mobile) — Play store readiness (owner-gated, prep what you can)
`ANDROID_KEYSTORE_*` secrets in GitHub Actions (never git) unlock the signed
AAB job (it already works — CI built one). The store listing is blocked on
G-060 (name). Prepare: store copy (EN+AR) draft, screenshots flow, and the
version/update story (P7.6 version comes from brand.json — verify it flows
into the AAB).

## 6.x ORDER OF ATTACK (dependencies)
W1 → W2 (completes the rider loop + the owner's map ask) → W6 (quick win) →
W3 (M5) → W4 (M6) → W5 → W7/W8 (parallel smalls) → W9 (rehearsal) →
W10/W11 (owner-gated, whenever keys arrive). Anything owner-gated (§7) is
NEVER a reason to idle — there is always a non-gated point above.

## 7. OWNER-GATED BLOCKERS (never close these alone — MCQ only, per P1)

From `docs/process/checklists/M8_launch.md` (the launch gate) and the audit
register — current at writing:

| ID | Item | Why it matters |
|---|---|---|
| G-060 | Product name is the placeholder (brand.json); NO trademark check | Blocks Play listing + repo rename |
| G-017 | Egypt ride-hailing legal pack (permits, retention) | Legal team — handed off |
| P2.5 | Launch corridor field survey (stops verified in the tool) | Owner fieldwork — nothing rides until done (cash beta could) |
| P7.6 secrets | `ANDROID_KEYSTORE_*` in GitHub Actions | Signed AAB (Play) |
| G-079 | `COMMISSION_PERCENT` launch value (currently 0 = none taken) | Owner MCQ — affects every fare leg |
| Paymob live keys | `PAYMOB_ENABLED` + API/HMAC/integration/iframe | Card top-up e2e (W10) |
| Open MCQ | Top-up presets 50/100/200/500 EGP confirmation | Cosmetic but owner-tasted |

## 8. STANDING MONITORS (instrument in W3/W7; review after beta)

G-036 driver earnings distribution/churn by decile · G-053 alighting-signal
usage rate · G-055 push-delivery failure rate (weekly review) · G-056 driver
account-sharing signals · G-062-2 LISTEN/NOTIFY latency at volume ·
G-025/031 vehicle-size complaints + ratings instrumented. All defined in
`docs/process/AUDIT_AND_TODO.md` (append-only — add new gaps there with the
next free G-0xx, never silently drop a discovered issue).

## 9. YOUR PROGRESS LOG (append one block per session — this file is alive)

- (empty — you start here)

## 10. QUICK REFERENCE INDEX (verified paths)

**Docs:** specification `docs/specification/MASTER_SPECIFICATION.md` +
`chapters/` (CH03 lifecycle, CH06 money, CH06a pricing, CH07 dashboards,
CH10b/c/d screens rider/driver/staff) · decisions
`docs/decisions/DECISIONS_REGISTER.md` (DEC-128..207; read DEC-113/130/132/
133/154/199/200/203/204/205/206/207 minimum) · build detail
`docs/planning/BUILD_PLAN.md` (P5.1→P8.2 all have TEST/BREAK/DONE) ·
research `docs/research/` (03 payments Egypt, 04 GUI Uber/Swvl, 05 Paymob
integration R20, 06 maps R21) · process `docs/process/` (standards,
CHANGELOG, IMPLEMENTATION_LOG, AUDIT_AND_TODO — the append-only trio you
MUST update every session) · checklists `docs/process/checklists/` (00_MASTER
is the index; M3 has two open boxes, M4 two, GUI-polish three, M8 the gate).

**Key code entry points:** authority
`apps/api/src/security/authority/authority.resolver.ts` · ledger domain
`apps/api/src/modules/payments/domain/ledger.ts` (account keys + posting
builders — REUSE, never write a second posting path) · payments public
contract `modules/payments/contracts/public.ts` (wiring notes) · Paymob
adapter `modules/payments/contracts/paymob.adapter.ts` + R20 · webhook
`modules/payments/application/payments.service.ts` (HMAC → idempotency →
amount re-check → one-transaction apply) · planner engine
`apps/web/src/screens/rider.js` `planJourneys` (the ONE implementation) ·
search/AR-EN normalization `apps/web/src/lib/search.js` · map primitives
`apps/web/src/lib/map.js` (`RouteMap`, `SearchMap`, `createBaseMap` — the
only tile implementation) · planner screen `apps/web/src/screens/planner.js`
(combobox a11y reference) · copy table `apps/web/src/data/content.js`
(BOTH languages, always) · the single nav table `apps/web/src/shell/app.js`
`PAGES`/`SHEETS` · build order `apps/web/build.js` `PARTS` (register new
files!) · notifications `modules/notifications/**` (exists — extend, don't
fork) · analytics `modules/analytics/**` (skeleton — W3 builds it).

**Guards that will fail your push if you slip (they have caught Agent A
too — they are right):** `scripts/check-secrets.sh` (no credential-shaped
strings, even in docs) · `check-tokens.sh` (no colour literals outside
shell.html) · `check-branding.sh` · `check-authority.sh` (no inline role
checks) · `check-sql-location/injection.sh` · `check-env-example.sh`
(env.ts ↔ .env.example parity) · `check-migrations.sh` + `check-db-types.sh`
· `check-hide-not-disable.sh` · `check-boundaries.mjs` (cross-module imports
via contracts/public.ts only) · the DI compile test
`apps/api/src/app.graph.test.ts` (missing @Global/wiring fails CI, not
production) · the browser layout suite (320→2560, EN+AR, the overflow probe
of §4.5) · the break harnesses (`tests/breaks.sh`, `tests/layout-breaks.sh`).

---

*End of handover. Everything above was verified against the repository at
`3752091` on 2026-08-24. When reality and this file disagree, REALITY WINS —
then fix this file (append a note in §9). Build to THE STANDARD.*
