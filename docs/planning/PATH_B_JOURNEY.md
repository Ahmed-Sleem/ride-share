# PATH B — JOURNEY & RIDER/DRIVER EXPERIENCE (owner: Agent B — YOU)

> **You are Agent B, a new agent joining this project.** You own this path.
> **Another agent (Agent A) works in parallel on a completely separate path**
> (`docs/planning/PATH_A_MONEY.md` — wallet, ledger, Paymob payments,
> commercial). You never edit each other's owned files; shared files follow
> the strict protocol in §6. Agent A's commits will appear on `main` between
> yours — expect them, `git pull --rebase` before every push, and NEVER
> revert or rewrite his work. **Agent A also reviews your commits from time
> to time and may push small `fix(...>` corrections — that is agreed
> monitoring, not interference; pull and continue. If you disagree with a
> fix, raise it to the owner as an MCQ, do not revert.**
>
> Everything you need to work is in THIS file plus the docs it points to.
> Written 2026-08-24 at repo HEAD `c092b69` (CI all green). Repo:
> https://github.com/Ahmed-Sleem/ride-share (public; push access via the
> PAT the owner gives you). Live app (auto-deploys from `main`):
> https://ride-shareweb-production.up.railway.app

## 0. Session-start checklist — run EVERY session, in this exact order

1. `git pull --rebase origin main` then `git log --oneline -25` — what did
   Agent A push since you last looked? Read any commit that touches your
   owned files (there should be none beyond agreed fixes).
2. Tail `docs/process/CHANGELOG.md` and read `docs/process/AUDIT_AND_TODO.md`
   (open gaps) — both are append-only records of reality.
3. Re-read THIS file's §5 (ownership) and §7 (your work) + your own progress
   notes at the bottom.
4. Set up the environment if the sandbox reset (§3) and run the FULL
   baseline verification (§4) BEFORE changing anything. If the baseline is
   red, STOP — find the cause or raise an MCQ to the owner; never start
   working on a red baseline.
5. Before ANY design decision that has options: read
   `docs/decisions/DECISIONS_REGISTER.md` — this project does not re-litigate
   decided things (rule: "do not re-litigate completed decisions without
   reading the register first").

## 1. The binding rules — read before ANY work (every session)

1. `docs/process/ENGINEERING_STANDARD.md` — binding working rules §0–§19.
   The four that bite most: **§0.2** (every new check must be deliberately
   broken once and observed failing — a check never seen failing is not a
   check), **§0.3** (one definition of everything), **§8.1** (never offer a
   control that will be refused — hide, don't disable), **§8.2** (authority
   decided in ONE place).
2. `docs/process/GUI_STANDARD.md` — the interface standard (states, a11y,
   responsive, RTL — the app is EN+AR bilingual, light+dark).
3. `docs/process/REPOSITORY_STANDARD.md` — publishing rules. The repo is
   PUBLIC (DEC-203): **no secrets, no tokens, no credentials, ever.**
4. `docs/process/PROJECT_RULES.md` — **P1: communication with the owner
   happens ONLY through MCQ questions (ask_user), each with your recommended
   option marked, then WAIT. You never close an open point alone.**
5. `AGENTS.md` (repo root) — short, not optional.

Hard rules for THIS codebase (enforced by `pnpm verify` guard scripts):
- SQL lives ONLY in `apps/api/src/modules/**/infra/*.repository.ts`, always
  parameterised (`check-sql-location.sh`, `check-sql-injection.sh`).
- "May this actor do this" is answered ONLY by
  `apps/api/src/security/authority/authority.resolver.ts` — add a capability
  there if you need one; never check a role inline (`check-authority.sh`).
- Schema changes ONLY via `infra/migrations/` (node-pg-migrate); after each
  migration regenerate `infra/schema.sql` + `packages/shared-types/src/db.generated.ts`
  (commands §7 footer).
- Design tokens ONLY in `apps/web/src/styles/shell.html` `:root` +
  `[data-theme="dark"]` — a colour literal anywhere else fails verify
  (`check-tokens.sh`).
- Brand name/logo ONLY from `packages/brand/brand.json` — never hardcode
  ("Ride Share" etc.) anywhere (`check-branding.sh`).
- No mocks/fakes/placeholders in production paths (§8). Unbuilt features
  show honest coming-soon states; dead controls are forbidden.
- Every visible control works; loading/empty/error states everywhere; RTL
  (Arabic) and themes stay correct.
- **Migration numbering parity with Agent A: YOU take EVEN numbers (0018,
  0020, 0022…), A takes ODD.** Before creating one, `git pull --rebase` and
  take the next free EVEN number.
- `pnpm verify` green is the minimum bar before EVERY push (full protocol §9).

## 2. Project primer — what exists and how it fits (verified 2026-08-24)

**The product:** shared rides on fixed routes at a fixed price (Alexandria).
Rider picks a published route → boarding stop → departure → books a seat
(flat fare locked) → gets a 6-digit boarding code. Driver claims a slot on
a route (two taps) and drives the journey. Full spec:
`docs/specification/MASTER_SPECIFICATION.md` (Part I = 10-minute summary).

**Stack:** pnpm monorepo. Backend = NestJS 11 + Fastify modular monolith,
PostgreSQL ONLY (no ORM — hand-written SQL in repositories), JWT auth.
Frontend = ONE self-contained HTML file assembled by `apps/web/build.js`
from `apps/web/src/**` — no framework, no CDN. Deploy = Railway (web+api+
managed Postgres), auto-deploy on push to `main`.

**API module anatomy** (copy this shape in new code — look at
`modules/bookings/` as the reference): `contracts/` (public.ts — the ONLY
surface other modules may import; types.ts), `domain/` (pure rules, no
infra imports, unit-tested), `application/` (services, use cases),
`infra/` (repository — the ONLY SQL), `api/` (thin controllers + DTOs),
`<name>.module.ts`. Cross-module imports go through `contracts/public.ts`
only (`check-boundaries.mjs`). A DI-graph compile test
(`apps/api/src/app.graph.test.ts`) fails CI on unresolved wiring — the app
must never crash-loop production again (G-070).

**Existing relevant modules (yours to extend):**
- `journeys` — state machine `CLAIMED → OPEN_FOR_BOOKING → LOCKED →
  IN_PROGRESS → COMPLETED / CANCELLED / ABORTED` (domain/journey.ts — pure,
  tested), slot claim, work board.
- `bookings` — RESERVED/CONFIRMED/ON_BOARD/COMPLETED/CANCELLED/NO_SHOW;
  fare LOCKED at creation (DEC-056); DB seat-guard trigger (no oversell);
  6-digit code (DEC-136 numeric fallback); cancel returns seats.
- `drivers` — approval state machine; `identity` — accounts/roles
  (rider/driver/operations/manager/support/super_admin); `audit` — append-only
  audit log (record every sensitive action); `geo` — stops; `routes` —
  routes + ordered stops + slot grid; `payments` — **AGENT A'S, do not
  touch** (ledger + Paymob; you only consume `contracts/public.ts`, §8).

**Web app anatomy:** `apps/web/src/data/content.js` (ALL copy, `T.en`/`T.ar`,
`t(key)`), `lib/components.js` (shared primitives — `$("div",…)`, Sheet,
Banner, Empty, Row…), `lib/api.js` (the ONE API client `API.*`; same-origin
`/v1/*`), `lib/search.js` (Fuse.js + Arabic/English normalization),
`screens/*.js` (role screens; navigation is ONE table `PAGES` +
bottom-sheet registry `SHEETS` in `shell/app.js`), `styles/shell.html`
(tokens + document shell). `build.js` concatenates in PARTS order into
`dist-preview.html`. Tests: `tests/unit.test.js` (jsdom, runs against the
BUILT file — build first), `tests/a11y.test.js` (axe), `tests/layout.test.js`
+ `tests/landing.test.js` (puppeteer, real Chrome — 7452 layout assertions
across viewport/theme/lang matrix), `tests/breaks.sh` + `layout-breaks.sh`
(§0.2 harnesses — deliberately break checks and observe them caught).

**Verification = three layers** (§4). CI on GitHub runs all of them on every
push (4 jobs) — it is REAL now (repaired 2026-08-24 after being silently
dead; see G-073/G-074/G-077 in the audit register if curious).

## 3. Fresh-environment setup (the sandbox resets — repeat per session)

```bash
sudo npm install -g pnpm@9.15.9
git clone https://github.com/Ahmed-Sleem/ride-share && cd ride-share
# push access: ask the OWNER for the GitHub PAT (never write it into any file)
git config user.name "Ahmed-Sleem" && git config user.email "ahmed-sleem@users.noreply.github.com"
pnpm install --frozen-lockfile
# chrome libs for the puppeteer browser suite:
sudo apt-get update -qq && sudo apt-get install -y -qq libnss3 libnspr4 libatk1.0-0 \
  libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libatspi2.0-0
# local postgres for db:verify + migrations:
sudo apt-get install -y -qq postgresql && sudo service postgresql start
sudo -u postgres psql -c "CREATE ROLE \"$(id -un)\" LOGIN SUPERUSER;"   # peer auth — NO password anywhere
sudo -u postgres psql -c "CREATE DATABASE rideshare_dev OWNER \"$(id -un)\";"
export PATH="/usr/lib/postgresql/17/bin:$PATH"
export DATABASE_URL="postgres:///rideshare_dev?host=/var/run/postgresql"
pnpm migrate up
```

## 4. Verification — ALL THREE layers green before EVERY push

```bash
pnpm verify                                     # repo guards + build + typecheck + lint + all tests
cd apps/web && ./verify.sh && cd ../..          # unit + a11y + FULL browser suite + break harnesses
DATABASE_URL="postgres:///rideshare_dev?host=/var/run/postgresql" pnpm db:verify   # migrations + schema + types
```
Baseline them BEFORE your first change. If anything is red before you start,
stop and report — do not "fix forward" blindly.

## 5. File ownership — EXCLUSIVE

**Path B (YOU) owns:**
- `apps/api/src/modules/journeys/**` — all layers.
- `apps/api/src/modules/bookings/**` — all layers.
- `apps/api/src/modules/notifications/**` — NEW module you create (journey
  event notifications; in-app first).
- `apps/api/src/modules/support/**` — NEW (M4, when you get there).
- `apps/web/src/screens/rider.js`, `driver.js`, `staff.js`, `landing.js`,
  `auth.js`, `admin.js`.
- `apps/web/src/lib/search.js` (the A→B planner extends it).

**Path A (Agent A) owns — DO NOT EDIT:** `apps/api/src/modules/payments/**`,
`apps/web/src/screens/wallet.js`, and later M5/M6 commercial files. If
something there is broken, raise it (MCQ to owner) or at most a minimal
`fix(payments): …` forward-fix — never a revert.

## 6. Shared files — append-only protocol (memorize; this prevents collisions)

| File | Rule |
|---|---|
| `apps/web/build.js` | PARTS list: register YOUR new src files adjacent to your owned ones, one line + comment. |
| `apps/web/src/shell/app.js` | SHEETS/PAGES tables: append your entries at the end of the relevant table with `/* path B */`. Never touch Agent A's entries. |
| `apps/web/src/lib/api.js` | Append methods ONLY inside `/* ===== journeys client (Path B) ===== */` at the END of the API object. |
| `apps/web/src/data/content.js` | Append your i18n block at the END of `en:{...}` AND `ar:{...}` with marker `/* ——— Path B: journey/boarding ——— */`; prefix every key `j_` (A uses `w_`). ALWAYS both languages. |
| `apps/web/src/lib/components.js` | Extend existing primitives; new shared primitive at the END with a comment. |
| `apps/web/src/styles/shell.html` | New TOKENS only (`:root` + `[data-theme="dark"]`). No colour literals anywhere else. |
| `apps/api/src/app.module.ts` | Append your module import at the END of the imports array with `// Path B`. |
| `apps/api/src/config/env.ts` + `.env.example` | Append your own env block at the end (B: journey/notification vars). Parity enforced by `check-env-example.sh` — update both together. |
| `infra/migrations/` | **YOU take EVEN numbers (0018, 0020…); A takes ODD.** Pull before creating; next free of YOUR parity. |
| `infra/schema.sql`, `packages/shared-types/src/db.generated.ts` | GENERATED files — regenerate (commands at the end of §7), NEVER hand-merge, NEVER hand-edit. |
| `apps/web/tests/unit.test.js`, `tests/breaks.sh` | Append your groups/cases at the END with `/* ===== Path B ===== */` markers. |
| `docs/process/CHANGELOG.md`, `IMPLEMENTATION_LOG.md`, `AUDIT_AND_TODO.md` | Append-only; your own entries; gap IDs: next free number (check the tail). |
| `docs/process/checklists/M3_core_journey.md` | Tick ONLY your points (P3.8, P3.9, your halves of the verification row). |

If a rebase conflict lands inside an OWNED file of the other path: STOP —
that means a rule was violated somewhere. Fix forward only if clearly
broken (minimal diff, document in changelog), otherwise raise an owner MCQ.

## 7. THE WORK — Path B backlog (in order)

### P3.8 — Boarding: scan + manifest (BUILD_PLAN §P3.8; DEC-049/136; screens R-21/D-20/D-21)

Read first: `docs/specification/chapters/CH03_lifecycle.md` (states),
CH10b (rider screens R-21), CH10c (driver screens D-20/D-21),
`docs/decisions/DECISIONS_REGISTER.md` rows DEC-049/136/116/117/119.

- **P3.8.1 — Scan/validate endpoint (bookings module, yours):**
  `POST /bookings/scan` (driver; capability `SCAN_BOARDING` already exists
  in the authority resolver — use it, don't invent a new one):
  input `{ journeyId, code }` (the 6-digit code). Rules:
  booking must belong to THAT driver's journey; booking state
  RESERVED/CONFIRMED → ON_BOARD (single-use — second scan refused
  `bookings.already_boarded`); outside the journey's time window refused;
  the driver must be the journey's claimant (authority via resolver +
  ownership check in ONE place). MANUAL ENTRY IS RATE-LIMITED — the
  PostgreSQL throttler already exists (`common/throttle`, DEC-195):
  `MaxCodeAttempts` (config, default 5 per journey per minute) then
  lockout — defeats guessing (BUILD_PLAN test 5). Audit-log every scan
  attempt (success and refusal) via the existing audit service.
- **P3.8.2 — Manifest endpoint:** `GET /journeys/:id/manifest` (driver):
  the CONFIRMED/RESERVED/ON_BOARD bookings of that departure — rider first
  name, seats, boarding stop name (en/ar), code LAST-4 only (never the full
  code to avoid shoulder-surfing? — NO: the driver must be able to compare
  the full numeric fallback; show full code; it is the driver's private
  screen), payment method + `cashCollected` state when Agent A's payments
  contract is live (feature-detect; hide the column before that, §8.1).
- **P3.8.3 — Code rules (domain, pure):** codes are 6-digit, UNIQUE
  (DB constraint exists), drawn from `randomInt` (already unguessable —
  VERIFY the property: generate 1,000, test non-sequential, BUILD_PLAN
  test 4). Time window rule: boarding allowed from T−15m to T+30m around
  departure (make it config `BOARDING_WINDOW_MIN` env, default 15/30 —
  proposed via MCQ with your recommendation, P1).
- **P3.8.4 — Driver manifest UI (driver.js):** per active journey: list,
  live states, scan input (numeric keypad-friendly, `inputmode="numeric"`,
  label EN+AR), "arrived at stop" quick action (P3.9), per-passenger
  "cash collected" button ONLY when `API.payments?.markCashCollected`
  exists AND booking payment method is cash (feature detection — Agent A
  owns that surface; until he lands it the button is HIDDEN, not disabled).
- **P3.8.5 — Rider code screen (rider.js `booked` screen upgrade):** QR of
  the code + the always-visible 6 digits (DEC-136: the numeric IS the
  fallback — screen-reader accessible, `aria-label`), journey summary,
  regenerate never (code is fixed), offline-friendly: render from cached
  booking (the trips cache pattern exists — `S.tripsCache`).
- **Tests (break-observed §0.2):** scan-once; wrong-journey refusal;
  out-of-window refusal; non-sequential codes (1,000 sample); lockout after
  MaxCodeAttempts; manifest lists exactly the booked passengers of that
  departure (and NOT other departures'); authority (a rider calling scan
  is refused — resolver).

### P3.9 — Live journey (BUILD_PLAN §P3.9; DEC-119/117; screens D-20/R-22)

- **P3.9.1 — Journey lifecycle endpoints (journeys module):**
  `POST /journeys/:id/start` (LOCKED→IN_PROGRESS, driver only),
  `POST /journeys/:id/complete` (IN_PROGRESS→COMPLETED — also marks
  ON_BOARD bookings COMPLETED), `POST /journeys/:id/abort` (ops/driver with
  reason; CANCELLED/ABORTED per state machine; notifies booked riders via
  your notifications module). All transitions through the EXISTING pure
  state machine (`canTransition`) — extend it only if CH03 says so, with a
  test. Position updates (`POST /journeys/:id/position`) — driver of that
  journey only; reject others (BUILD_PLAN test 6).
- **P3.9.2 — Next-stop + schedule slip (domain, pure):** from the route's
  `route_stops.run_minutes` + current time, compute next stop and slip
  (minutes behind timetable). `MaxScheduleSlip` = env config (default 10;
  MCQ the default with the owner). A pickup/deviation that would exceed
  slip is NOT offered (BUILD_PLAN test 3 — mind the comparison sign!).
- **P3.9.3 — Rider waiting screen (rider.js `waiting`):** boarding code
  prominent, journey status (claimed/boarding/in-progress), next stop,
  "your ride is arriving" when IN_PROGRESS and next stop == rider's
  boarding stop; poll politely (interval ≥ 15s, backoff on error, stop when
  hidden — GUI standard §15). Onboard screen (onboard): current stop,
  "I'm getting off next" signal (DEC-117) → `POST /bookings/:id/alight`
  → surfaces on the driver's manifest within one poll (BUILD_PLAN test 4).
- **P3.9.4 — Driver journey screen (driver.js `journey`):** manifest,
  next stop + slip badge (green/amber/red from `MaxScheduleSlip`), actions:
  start, arrived-at-stop, complete, abort; alighting signals appear live.
- **Tests:** state-machine legality (completed→boarding refused); slip
  computed correctly for a seeded journey; over-slip pickup not offered
  (invert the comparison in a break run and watch it fail); alighting
  reaches the manifest; position from a non-driver rejected.
- **M3 verification rows (checklist):** after BOTH paths land, run the real
  end-to-end pass (create route → claim → book → scan → complete) and tick
  the box with proof; coordinate with Agent A via the changelog.

After P3.8/P3.9 (same discipline, in order): **B2** DEC-199 A→B planner
(extends `lib/search.js` + routes data: start→end → best route/2-leg mix;
alighting free anywhere makes a route "serve" a destination near the end
point — read DEC-135/140 first). **B3** DEC-200 desktop density (tokens
per-breakpoint, compact staff tables, 45–75ch measure — read GUI_polish
checklist). **B4** M4 safety & support (SOS, reporting, support module,
safety centre; monitors G-055/G-056 become measurable). **B5** M7 Capacitor
APK wrapper (BUILD_PLAN P7). **B6** M8 launch validation (JOINT with Agent
A — coordinate via changelog + owner MCQ).
Not agent work (owner fieldwork): P2.5 corridor survey; trademark check G-060.

**After every migration (exact commands):**
```bash
git pull --rebase origin main
export PATH="/usr/lib/postgresql/17/bin:$PATH"; export DATABASE_URL="postgres:///rideshare_dev?host=/var/run/postgresql"
pnpm migrate up
pg_dump --schema-only --no-owner --no-privileges --no-comments "$DATABASE_URL" \
  | sed -E '/^(--|SET |SELECT pg_catalog|\\[a-z])/d' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
  | grep -v '^$' > infra/schema.sql
pnpm db:types && pnpm db:verify
```

## 8. Cross-path contracts (Agent A implements HIS side; you consume)

**You consume (from `apps/api/src/modules/payments/contracts/public.ts`,
Agent A owns it):**
```ts
markCashCollected(actor, bookingId): Promise<{ ok: true }>   // driver's "cash collected" tap
issueCredit({ riderId, amountMinor, bookingId?, reason, actorLabel })   // refunds → wallet credit
bookingPaymentInfo(riderId, fareMinor): Promise<{ paymobEnabled: boolean;
  walletBalanceMinor: number; sufficient: boolean }>
```
Web side: everything money is `API.payments.*` in Agent A's marked section
of `lib/api.js`. Feature-detect before showing any payment UI:
`typeof API.payments?.markCashCollected === "function"` — if absent, the
control is HIDDEN (§8.1), the screen still makes sense without it.

**You provide (bookings/journeys `contracts/public.ts`, you own it):**
```ts
getBookingForPayment(bookingId): Promise<{ id; riderUserId; driverUserId;
  journeyId; fareMinor; status; paymentMethod: 'wallet'|'cash'|null }>;
```
Plus the scan/manifest/lifecycle/alight surfaces of §7. Publish them in
`contracts/public.ts` (that file is the ONLY thing other modules import —
`check-boundaries.mjs` enforces it).

## 9. Git protocol — what keeps the repo un-corrupted (both agents)

```bash
git pull --rebase origin main      # BEFORE every push
pnpm verify && (cd apps/web && ./verify.sh) && pnpm db:verify   # ALL green
git push origin main               # NEVER force-push; NEVER rewrite history
git fetch origin && git rev-parse HEAD origin/main   # must match
```
- Conventional commits: `feat(journeys): …`, `fix(web): …`, `docs(process): …`.
- Small frequent commits beat giant ones; each push is independently green.
- Railway auto-deploys every push — after pushing, smoke the live app:
  `curl -s https://ride-shareweb-production.up.railway.app/healthz` must say
  `api:"up"`; `/v1/healthz` must say `db:"up"`. If a deploy breaks the live
  app, say so immediately (owner MCQ) — never leave it broken silently.
- CI (4 jobs) runs on your push and must stay green. If YOUR push turns it
  red, fix forward immediately — do not start new work on a red main.
- Never push secrets (PAT, keys, passwords, .env). Never `git push --force`.

## 10. Working style expected of you (owner's standing orders)

- Take your time; the work must be 100% complete and production-ready — no
  half-built features, no mocks, no placeholders, industry best practice.
- THINK in checklists before every point (write a scratch checklist, tick
  items only when a COMMAND proved them; compare against the request line
  by line at the end; delete the scratch file after).
- Search/research before designing anything non-obvious; follow CH10
  screen specs and the design system (tokens, states, RTL, a11y).
- Explore the actual code before touching it — never assume.
- Ask the owner by MCQ whenever there is a real choice (P1/P5); recommend
  an option and wait.
- Append your progress notes to §12 below at the end of every session, and
  the docs duties: changelog entry, implementation-log entry per closed
  gap, audit-register row per new gap, checklist tick per completed point
  (only your own), README "What works today" when user-visible.
- If a task is very long, split it across sessions — completeness beats
  speed, always.

## 11. Your first session, concretely

1. §0 session-start checklist (pull, read, baseline verify — all three layers).
2. Read `apps/api/src/modules/bookings/**` and `journeys/**` end to end, and
   `apps/web/src/screens/driver.js` + `rider.js` + `shell/app.js`.
3. Write your scratch checklist for P3.8 (from §7 above + BUILD_PLAN §P3.8).
4. Build P3.8.1→P3.8.5 in order, §0.2 break each check, verify all three
   layers, push per §9, append docs.
5. MCQ the owner for the open defaults you meet (boarding window minutes,
   MaxScheduleSlip default, rate-limit numbers) — recommended option marked.

## 12. Progress log (append-only — YOUR entries)

- 2026-08-24 — Path file created by Agent A (parallel-work split; wallet
  extracted to `screens/wallet.js` as Path A ownership; baseline CI green at
  `c092b69`). Path B work not started yet.

## 13. Everything else remaining (so nothing is ever dropped)

| Item | Owner | Where |
|---|---|---|
| P3.7 money/ledger/Paymob | Agent A | PATH_A_MONEY.md §7 |
| P3.8/P3.9 boarding+journey | **Agent B (you)** | this file §7 |
| M3 end-to-end manual pass | B (after both paths) | M3 checklist |
| A→B planner DEC-199 | Agent B | this file §7 B2 |
| Desktop density DEC-200 | Agent B | B3 |
| M4 safety & support | Agent B | B4 |
| M5 commercial/promotions | Agent A | PATH_A §7 P-A2 |
| M6 recurring/subscriptions | A (billing) + B (claims UI) | PATH_A P-A3, B5 area |
| M7 APK (Capacitor) | Agent B | B5 |
| M8 launch validation | JOINT | coordinate via changelog |
| P2.5 corridor fieldwork; trademark G-060 | OWNER | not agent work |
| Monitors G-055/056/062-2 | instrument as features land | audit register |

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

> **Operational rule (added 2026-08-24 after landing v3 went red):** when a
> screen/style change removes or rewrites code that a break case targets, the
> case's sed/expectation must be RE-ANCHORED IN THE SAME COMMIT — a
> `BROKEN-BREAK` ("edit did not change the file") or a stale expectation turns
> CI red and blocks both paths. Prove the re-anchored case catches (mini-run
> the single case) before pushing.
- 2026-08-24 — P3.8.1–P3.8.5 landed. Owner declined scan lockout; window 15/30.

- 2026-08-24 — P3.9 live journey: start/complete/abort/position/arrive, slip, rider waiting/alight, notifications 0018.

- 2026-08-24 — B2 DEC-199 A→B planner + rider live poll ≥15s/backoff/hidden.

- 2026-08-24 — B3 DEC-200: desktop compact density (~90% of touch tokens; no CSS zoom).
