# CHAPTERS 8, 16, 17 — System Architecture, Delivery Plan & Risk Register

> **Architecture revision (DEC-186/DEC-184, 2026-08-17):** PostgreSQL is the only stateful
> dependency (Redis removed; realtime = LISTEN/NOTIFY, queues = SKIP LOCKED); PostGIS deferred
> to M2. Any Redis/PostGIS reference in this chapter is superseded.


Status: DRAFT v1. Implements DEC-009, DEC-069, DEC-070, DEC-085, DEC-086, DEC-088..091,
DEC-099, DEC-110. Excludes hiring and timelines per DEC-111 / DEC-112.

===============================================================================
# CHAPTER 8 — System Architecture (runtime shape)
===============================================================================
(Code organisation is CH8a; this chapter is how the running system is arranged.)

## 8.1 The processing rule (DEC-009)
> If it affects money, safety, or who rides with whom — the SERVER computes it.
> If it affects only what this one user sees right now — the DEVICE may compute it.

| Server-authoritative, always | Device-side, never authoritative |
|---|---|
| matching and assignment | map rendering, camera, QR display |
| pricing, quotes, fares, refunds | GPS smoothing and sampling decisions |
| stop assignment, route plans | "distance to my stop" display |
| seat allocation and holds | local notifications and alarms |
| every state transition | optimistic UI, offline outbox |
| permissions and identity | cached stops, cached ticket |

## 8.2 Runtime components
```
> **SUPERSEDED BY DEC-176.** The Android application is built with **Capacitor** wrapping the web
> app, not Expo/React Native. One UI codebase. See BUILD_PLAN Phase 7 for the reason and for the
> P7.4 gate at which the driver app alone could revert to React Native.

 MOBILE (Expo)                WEB (Next.js)
 rider + driver, role-adaptive   public site, rider booking, Manager & Ops dashboards
        \                              /
         \____ REST + WebSockets _____/
                      |
              API (NestJS modular monolith, CH8a)
       ┌──────────────┼───────────────────────────────┐
       |              |                               |
  PostgreSQL 16    In-process store            Queues (PostgreSQL
  (+ replica)      geo index, last-known        SKIP LOCKED), workers:
                   state, live updates          matching tick loop,
                                                overnight optimiser (OR-Tools),
       |                                        notifications, payouts, reconciliation
  Object storage (documents, stop photos)  ·  Cold storage (aged movement data)
  OSRM (self-hosted routing + matrices)    ·  Payment providers (Paymob et al.)
```

## 8.3 The matching loop is not an HTTP request
The matching engine runs as a **queue-driven tick loop** with an adaptive batch window (DEC-072).
A booking request enters a queue; the loop matches a batch; results are pushed to clients over
WebSocket. Nothing about matching happens inside a request/response cycle.

## 8.4 Realtime design (DEC-089)
Live only where it matters: vehicle position, booking/journey state, driver manifest, ops map
(throttled), manager occupancy (near-live, 5-10s snapshots). Everything else is on-demand.

## 8.5 Configuration at runtime (DEC-070, G-032)
All business values are database configuration with scope inheritance
(global → country → city → corridor → route → vehicle class → time window), versioned and
hot-reloaded. **A price change, a new service area, or a new city is a configuration action, not a
deployment.** This is the mechanism that makes DEC-002 (scale to any city) real.

## 8.6 Multi-city (DEC-002, DEC-105)
Every entity is scoped to a City; every City carries its own currency, timezone, language default,
map/routing provider settings and fare configuration. No code may assume Egypt, EGP, Arabic,
Africa/Cairo, or a hosting region.

## 8.7 Failure behaviour (R9.8, CH5 §5.9)
The system degrades in quality, never into failure:
OSRM down → cached matrices → Haversine × calibration factor, ETAs marked approximate.
In-process index stale → PostgreSQL fallback, slower but correct.
Optimiser down → insertion heuristic only.
Analytics lagging → never on the hot path; matching unaffected.
Full degradation → fixed-route stop-to-stop journeys still operate.

## 8.8 The role-adaptive single app (DEC-014, G-011 — closed)
One mobile app. Role detected at login. Driver code is lazy-loaded and driver permissions
(background location, camera) are requested **only when driver mode is activated**, so a rider is
never asked for always-on location.

===============================================================================
# CHAPTER 16 — Delivery Plan
===============================================================================
Contains no hiring plan and no timeline estimates (DEC-111, DEC-112).

## 16.1 Principle (DEC-086, DEC-110)
**One corridor, working completely, before widening.** Vertical slices: every slice is
production-complete — no stubs, no fake screens, no "coming soon" (DEC-006, rules §8).

## 16.2 The phases (scope only, no dates)

### Phase 0 — Foundations
Monorepo, shared types, CI with the `verify` command, database and migrations, configuration
system with scope inheritance, audit log, event log, staging environment, infra-as-code, backups
with a tested restore.
*Exit:* an empty but production-grade skeleton where nothing is hand-configured.

### Phase 1 — Identity & the vehicle registry
Phone/OTP signup, passcode, roles and permissions, driver onboarding with document upload,
Ops approval queues, vehicle registry with fleet labels.
*Exit:* a real driver can be verified and approved by a real admin.

### Phase 2 — Geography & the mapping tool
Stops, zones, corridors, service areas; the Stop Mapping Tool (field + desk + review); OSRM
deployed with the Alexandria graph.
*Exit:* the launch corridor is fully mapped and verified.

### Phase 3 — The core ride (the corridor slice)
Journeys, ride requests, offers with seat holds, bookings, the matching pipeline stages 0-2 and 4,
fixed-route pricing, wallet and cash, QR boarding, the driver app with offline-first journey
execution, the rider app with the adaptive home and the waiting screen.
*Exit:* a real rider books, walks to a stop, boards by QR and pays — on one corridor.

### Phase 4 — Trust, safety & support
SOS with on-call routing, share-my-ride, masked calling, incident flow with precautionary
suspension, ratings, the Support workspace, fraud controls.
*Exit:* a rider in trouble reaches a human, and a dangerous driver can be removed.

### Phase 5 — Commercial control
Manager dashboard: live occupancy map, actionable alerts, pricing control with
preview-before-publish and rollback, promotions with ledger-enforced budgets, campaigns, analytics.
*Exit:* a manager can change a price and launch a flash sale with no engineering involvement.

### Phase 6 — Recurring & scale
Subscriptions with the trial day, recurring plans, the overnight OR-Tools planner, matching stage 3
(batch optimiser), street-pickup tier with the CH6a formula, driver payouts.
*Exit:* a commuter buys a monthly subscription and rides without thinking about it.

### Phase 7 — Validation & launch
FleetPy simulation to set every launch parameter, closed beta on one corridor with defined success
criteria, then public launch on that corridor. Widening is then a Manager dashboard action.

## 16.3 Work-package format (DEC-007, CH8a §8a.7)
Every task handed to any developer contains: goal in one sentence · the module it belongs to · the
interface to implement · the business rules with DEC-xxx references · acceptance criteria ·
required tests · explicit out-of-scope. **If a business rule is not written down, that is a
specification bug, not a developer error.**

## 16.4 Definition of Done
Merged · `verify` passes · tests genuinely exercise the behaviour · docs updated · audit entry
closed with evidence · implementation-log entry with commands and observed output.
Nothing is "done pending tests".

===============================================================================
# CHAPTER 17 — Risk Register
===============================================================================

| ID | Risk | Impact | Owner | Mitigation / status |
|----|------|--------|-------|---------------------|
| R-1 | Scope vs capacity: full product before launch | Schedule | **USER** | Hiring/timeline explicitly out of scope (DEC-111/112). Phased delivery (DEC-110) limits exposure. Recorded once, as agreed. |
| R-2 | Regulatory: open public ride service under Egypt's ride-hailing law (R1) | Existential | **LEGAL TEAM** | Handed off (DEC-030). System built so licensing, per-driver permits, vehicle age limits and trip-data export can all be satisfied technically. |
| R-3 | Indefinite retention of personal movement data (DEC-094) | Legal + breach | **LEGAL TEAM** | Flagged once (G-041). Technical mitigations specified in CH13 §13.2. |
| R-4 | Demand density: pooling fails below a threshold (R7.6) | Product viability | Product | One-corridor launch concentrates demand (DEC-110); simulation validates before launch (CH14 §14.3). |
| R-5 | Driver supply and churn; pure-efficiency matching has no fairness weighting (DEC-075) | Supply | Product | Fairness weight exists as configuration defaulting to 0; monitor earnings distribution (G-036). |
| R-6 | Strict cancellation policy harsher than local norm (DEC-055) | Adoption | Product | Informed consent before purchase; monitor cancellation and uninstall rates (G-031). |
| R-7 | Self-managed infrastructure: backups, patching, uptime are the team's responsibility | Availability | Team | CH15 §15.2 mandatory practices; replica + off-site backups + tested restores (DEC-107). |
| R-8 | Selling every physical seat harms comfort and ratings (DEC-047) | Retention | Product | Monitor complaints and ratings; per-vehicle sellable-seat override available (G-025). |
| R-9 | Ratings carry no consequence (DEC-096), so the incident flow is the only protection | Safety | Product | Incident flow strengthened with precautionary suspension and repeat-signal escalation (CH12 §12.2, G-044). |
| R-10 | Stranded rider when a second leg fails (DEC-025) | Safety/reputation | Product | Open: mitigation options listed in G-015, not yet chosen. |
| R-11 | Mapping quality gates launch (DEC-038/040) | Schedule | Ops | Mapping tool specified (CH4 §4.4); corridor-first reduces the volume needed. |
| R-12 | Payment provider dependency (Paymob for both collection and payout) | Financial ops | Product | Provider abstraction in CH6 §6.2 allows substitution; InstaPay terms unverified (R10.2). |
