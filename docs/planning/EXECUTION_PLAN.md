# EXECUTION PLAN — build the product, for real

**Version:** 1.0 · **Date:** 2026-08-17
**Governs:** turning the approved `MASTER_SPECIFICATION.md` + GUI into a production system, deployed on Railway.
**Sibling docs:** `BUILD_PLAN.md` (Phases 0–8, the per-point detail — this file turns those points into build milestones), `DECISIONS_REGISTER.md`, `OPEN_ITEMS.md`.

## 0. The one-line mission

Ship a **real, production-ready shared-ride platform** — real database, real auth, real bookings,
real money movement, real dispatch, real safety tooling — deployed on Railway, on one corridor
first (DEC-110), then widened. No mock endpoints, no fake success paths, no "preview" data shipped
as product. The approved GUI is the front door; it gets wired to the real system.

## 1. What "no mocks, no previews" means here (honest definition)

- **Every business rule is real code**: implemented once (§0.3), backed by the database,
  enforced at the domain layer, and covered by tests that have been observed failing.
- **No hardcoded users, no fake API responses, no silent no-ops, no decorative buttons.** A control
  that cannot yet act is hidden, not faked (§8).
- **External services are integrations, not mocks.** SMS OTP, the card gateway, the commercial
  map provider, and OSRM each sit behind a single interface (already specified in CH5/CH6/CH9).
  The interface is implemented for real. Where a provider needs an **account or key only the owner
  can create**, the adapter ships in a clearly-labelled **sandbox mode** (deterministic, isolated,
  flagged in logs) and is switched to live the moment the key lands. This is the honest version of
  "no mocks": the code is real; the credentials are yours.
- **The sample data in the current GUI is exactly that** — sample content for design review. It is
  removed and replaced by API data before any milestone is called done.

## 2. Stack (already decided — see DECISIONS_REGISTER)

| Layer | Choice | Decision |
|---|---|---|
| Repo | pnpm workspaces + Turborepo, one **private** monorepo | DEC-177, DEC-085 |
| API | NestJS modular monolith (16 modules, enforced boundaries) | DEC-069, CH08a |
| DB | PostgreSQL (Railway **managed**, `node-pg-migrate`, **no ORM**). PostGIS **deferred** to M2 (DEC-184) | DEC-170, DEC-107, DEC-184 |
| DB types | Schema-introspection-generated types (never hand-maintained) | DEC-170 mitigation 1 |
| SQL rules | One repository per table; parameterised queries only; enforced by scripts | DEC-170 |
| Auth | Phone OTP (SMS provider) + JWT (access/refresh) + passcode | CH02, CH03 |
| Realtime | REST + targeted WebSocket channels | DEC-088/089 |
| Maps | Commercial provider (Google Maps class) for surface/geocoding; self-hosted **OSRM** behind the `MapProvider` interface for matrices/routing | DEC-174, DEC-173 |
| Payments | One provider interface; Paymob-class card rails + exact cash sequence; double-entry ledger | DEC-077…081, CH06 |
| Web UI | **Decision below (M0)** — recommended: keep the approved single-file GUI as the real client | this plan |
| Mobile | Capacitor wrapping the web app (Android APK) | DEC-176 |
| Deploy | Railway (managed Postgres + managed Redis + api + web; OSRM later), GitHub Actions CI, VPS later | DEC-104/105, CH15, DEC-184 |

## 3. Target repository layout

```
ride-share/
├─ apps/
│  ├─ api/            NestJS — the whole backend (modules: auth, users, vehicles, geography,
│  │                  routes, slots, matching, bookings, ledger, payments, notifications,
│  │                  safety, support, analytics, config)
│  ├─ web/            the approved GUI (single-file build) OR Next.js — M0 decision
│  └─ mobile/         Capacitor wrapper (P7 — created with a README explaining why)
├─ packages/
│  ├─ shared-types/   entities, DTOs, events — ONE definition of each (§0.3)
│  ├─ shared-logic/   validation, money, dates, i18n keys, the theme object
│  ├─ shared-api/     generated API client consumed by web
│  └─ config/         eslint, tsconfig, prettier — consumed by every package
├─ infra/
│  ├─ docker/         api Dockerfile, web Dockerfile, postgis, osrm, docker-compose (local dev)
│  └─ railway/        railway.toml, nixpacks.toml, healthcheck, env schema
├─ migrations/        node-pg-migrate — the ONLY way the schema changes
├─ scripts/           verify-repo.sh and every enforcement script
├─ docs/              the full specification, plans, decisions, research (non-code, kept here)
└─ .github/workflows/ ci.yml (lint, typecheck, test, build, secret scan)
```

## 4. Railway topology

| Service | What it runs | Image / source | Port / health |
|---|---|---|---|
| `api` | NestJS backend | Dockerfile (or Nixpacks) | 3000 → `GET /healthz` |
| `web` | the GUI (static) | Dockerfile (nginx) or static build | 80 → `GET /` |
| `db` | PostgreSQL (managed, DEC-184) | **+ New → Database → PostgreSQL** | managed, exposes `DATABASE_URL` |
| `redis` | managed Redis | **+ New → Database → Redis** | managed, exposes `REDIS_URL` |
| `osrm` | routing engine, one instance per city (DEC-163, M2+) | `osrm/osrm-backend` image, preprocessed graph volume | 5000 → `GET /route/v1/…` |

- Railway connects to the **private** GitHub repo; every push to `main` rebuilds and redeploys [docs](https://docs.railway.com/services).
- `railway.toml` pins the build command, start command, healthcheck path/timeout, restart policy, and the `watchPatterns` so only the affected service rebuilds.
- Secrets live **only** in Railway variables / the database, never in the repo (§10.1). A `SealedConfig`/`.env.example` lists every variable name; values are filled in Railway.
- Private networking: `api` ↔ `db` and `api` ↔ `osrm` talk over Railway's internal network; only `api` and `web` are public.
- Backups: nightly, 30-day retention, monthly restore drill (DEC-164).

## 5. Milestones (each ends green, committed, pushed, and — from M0 — deployed)

The existing `BUILD_PLAN.md` Phases map 1:1; here they are framed as build milestones with the
vertical-slice sequencing the user chose (DEC-086).

### M0 — Foundations, CI, and a live skeleton on Railway (P0)
- pnpm workspace + Turborepo, pinned toolchain (`packageManager` exact, catalog, `workspace:*`).
- The central `verify` command and every enforcement script: workspace integrity, secret scan,
  no-hardcoded-tokens, module boundaries, SQL-location, SQL-injection, migration drift, authority,
  hide-not-disable. Each check observed failing.
- `apps/api` boots with `/healthz`, reads config, connects to PostGIS; `apps/web` serves the GUI.
- Dockerfiles + `railway.toml` + healthchecks; **a live "empty but production-grade" deploy on Railway**.
- GitHub Actions: lint → typecheck → test → build → secret scan, on every PR.
- **Done when:** `pnpm verify` green; Railway shows `api` and `web` healthy; `git status` clean.
- Decision needed: web UI approach (Section 6, D1).

### M1 — Identity, roles, vehicles (P1)
- Phone OTP sign-in (SMS adapter in sandbox mode until the provider key arrives), JWT
  access/refresh, passcode, session revocation, RBAC with **one authority** and hide-not-disable.
- Driver application flow + documents upload + admin/ops approval; vehicle registry with fleet
  labels; the strict verification state machine (DEC-035).
- **Done when:** a real admin can approve a real driver on the live deploy; every permission is
  enforced in one place; auth flows tested end-to-end.

### M2 — Geography (P2)
- Stops (stable public codes, lifecycle, walking suitability), the Stop Mapping Tool (field + desk +
  review + audit), the launch corridor surveyed and its boarding points verified (DEC-040).
- PostGIS schema for stops/routes/corridors; commercial geocoding behind the interface.
- **Done when:** the corridor's stops and routes are real data in PostGIS, editable through the
  ops tools, visible in the web UI.

### M3 — Routes, slots & the core journey (P3) ★ the first vertical slice
- Route + slot timetable, slot claims (driver), the matching/offers pipeline (CH05), booking with
  multi-seat (DEC-083), boarding code (QR + numeric fallback), live journey states, alighting
  signal, schedule adherence (MaxScheduleSlip).
- Money: double-entry ledger (CH06), the exact cash sequence, wallet balances (materialised
  projection, reconciled nightly, DEC-153), card payments behind the provider interface, refunds
  (credit), cancellation rules (DEC-052/063…).
- **Done when:** a passenger books on the live site, walks to a stop, boards by code, and pays —
  cash or card — on one corridor; the ledger balances; every state transition is guarded and tested.

### M4 — Safety & support (P4)
- Silent SOS + SMS fallback, incident flow (DEC-138 thresholds), rider blocking (DEC-158),
  suspension ladders (DEC-156), support workspace with bounded actions and refund limits
  (DEC-155), tickets, lost property.
- **Done when:** a rider in difficulty reaches a person; an unsafe driver can be removed; support
  actions are capped and audited.

### M5 — Commercial control (P5)
- Manager pricing control with preview-before-publish and rollback (DEC-166 guided forms), flash
  sales/promotions with ledger-enforced budgets (DEC-103), coverage board, analytics (pseudonymised,
  DEC-162), alert rail (DEC-161 fields present, thresholds set from beta data).
- **Done when:** a manager changes a price and runs a promotion with no engineering involvement,
  and nothing publishes without preview + audit.

### M6 — Recurring travel (P6)
- Subscriptions (ride packs; unused days expire per DEC-154), recurring bookings, skip/pause,
  holiday calendar + Ramadan mode (DEC-118).
- **Done when:** a commuter buys a subscription and travels without further action.

### M7 — Mobile applications (P7)
- Capacitor APK wrapping the web app; the offline-first driver flow (DEC-099: offline outbox,
  delta sync, adaptive GPS with battery guard), background location at the P7.4 gate.
- **Done when:** a driver runs a full journey offline on a phone and it reconciles on reconnect.

### M8 — Validation & launch (P8)
- Simulation sets the parameters (CH14), closed-beta success criteria, the launch gate, operations
  runbook live, monitoring/alerting, backup restore drill.
- **Done when:** the closed beta meets its criteria and the corridor opens.

## 6. Decisions to confirm before M0 finishes (each is an MCQ per P5)

- **D1 — Web UI path.** (a, recommended) Keep the approved single-file GUI as the real web client
  and point it at the real API — reuses 100% of the tested, bilingual, adaptive UI and is the
  fastest correct path; (b) rebuild the UI in Next.js/React per P0.7 — more conventional, but
  re-implements 30 screens × 5 roles. (c) Keep GUI now, migrate to React after launch.
- **D2 — First slice.** (a, recommended) Foundations (M0), then the M3 vertical slice (auth + one
  corridor + booking + boarding + payment) as the first visible product; (b) foundations, then
  build every layer horizontally in phase order before anything is usable.
- **D3 — Payments.** (a, recommended) Build the full ledger + cash flow + provider interface now;
  plug the Paymob-class card gateway when you provide keys (sandbox adapter until then);
  (b) integrate a specific gateway immediately (needs merchant keys); (c) cash-only launch.
- **D4 — Railway access.** (a, recommended) I prepare everything (`railway.toml`, Dockerfiles,
  env schema, healthchecks) and you connect the repo in your Railway dashboard (one click, no
  token shared); (b) you paste a Railway API token and I create/configure services and watch
  deploys myself.

## 7. What I need from the owner (external accounts only they can open)

| When | Item | Used for |
|---|---|---|
| M1 | SMS provider key (e.g. Twilio / Unifonic / VictoryLink) | OTP sign-in (sandbox until then) |
| M2 | Commercial maps API key (Google Maps Platform class) | map surface + geocoding |
| M3 | Payment gateway keys (Paymob-class sandbox first) | card payments |
| M4+ | (nothing new — all internal) | — |
| M0 | Railway account + GitHub connection (or API token per D4) | deployment |
| M8 | Apple/Google developer accounts (Play Console for the APK) | store listing |

None of these are committed to the repo, ever (§10.1). `.env.example` carries names only.

## 8. Verification discipline (unchanged, restated for the build)

- Every milestone ends with `pnpm verify` green, a focused test run for the touched area, a secret
  scan, and a push — the repo is **always up to date**.
- Every new check is broken once and observed failing for the right reason (§0.2).
- Every closed gap gets an `IMPLEMENTATION_LOG.md` entry with proof.
- `docs/` stays the single source of truth for spec; `apps/` and `packages/` for code; nothing
  mixes them.

## 9. Risks (top of the register; full list in CH17)

1. **External key timing** gates M1 (SMS) and M3 (cards/maps) — mitigated by sandbox adapters so
   development never blocks on a key.
2. **Scope** — the honest cost of "everything, production-ready" is many milestones; sequencing
   them as vertical slices (D2) keeps something real usable at every step.
3. **PostGIS on Railway** is unavailable on the managed plugin — resolved by DEC-184: defer geo
   to M2, at which point we choose a PostGIS-capable host (once off the trial) or numeric
   lat/lng + OSRM/geocoder. Tracked as G-061.
4. **Account sharing** risk accepted at DEC-157 — compensating controls land in M1/M4.
