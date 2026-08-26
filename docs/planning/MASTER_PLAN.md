# RIDE SHARE — CONSOLIDATED MASTER PLAN & ARCHITECTURE DOSSIER

**Date:** 2026-08-26 (Africa/Cairo)  
**Version:** 3.0 (Master Unified — Reconciling Path A, Path B, Start Here Handoff, and Commit `d850180`)  
**Repository:** https://github.com/Ahmed-Sleem/ride-share (Public)  
**Live Website:** https://ride-shareweb-production.up.railway.app/  
**Live Mobile App API:** https://ride-sharemobile-production.up.railway.app/  
**Internal Nest API:** `http://ride-shareapi.railway.internal:3000`  
**Latest Verified Commit:** `d850180` (All 6 GitHub Actions CI jobs green, APK artifact 9586803111)

---

## 0. Executive Principles & Binding Operating Rules

Every agent, engineer, and pipeline operating on this codebase must strictly adhere to the following non-negotiable rules:

1. **One Source of Truth (§0.3):**  
   - Design tokens live **only** in `apps/web/src/styles/shell.html` (`:root` and `[data-theme="dark"]`).
   - Authority queries are answered **only** by `apps/api/src/security/authority/authority.resolver.ts`.
   - SQL queries live **only** in `apps/api/src/modules/**/infra/*.repository.ts` (parameterized only; no ORM).
   - Copy & translations live **only** in `apps/web/src/data/content.js` (EN + AR bilingual parity).
   - Brand names/assets live **only** in `packages/brand/brand.json`.
   - Database schema changes happen **only** via `infra/migrations/` using `node-pg-migrate`. Next unused migration number: **`0029`**.

2. **Test-Break Discipline (§0.2):**  
   - Every new test and safety check must be deliberately broken once, observed failing in the test harness, and then restored. A test that has never been seen failing is not trusted.

3. **No Mocks or Placeholders in Production (§8.1):**  
   - Unbuilt or unconfigured features must fail-fast or be cleanly hidden. Dead, non-functional, or deceptive controls are strictly forbidden.

4. **Public Repository Security & Secret Hygiene:**  
   - The repository is public. Never commit secrets, credentials, API keys, passwords, JWT secrets, HMAC keys, Android keystores, or `.env` files.
   - Secrets are configured exclusively via Railway environment variables and GitHub Actions repository secrets.

5. **Decision Authority (DEC-Register & Ask User):**  
   - Communication with the project owner regarding design choices or open points happens via structured MCQs (`ask_user`). Once decided and registered in `docs/decisions/DECISIONS_REGISTER.md`, decisions are locked.

---

## 1. System Architecture & Surface Split

The production topology on Railway consists of three distinct services interacting with managed PostgreSQL:

```
                      ┌──────────────────────────────────────────────┐
                      │                 USER CLIENTS                 │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────┴───────────────────────┐
                      │                                              │
           [Desktop & Mobile Browsers]                     [Android Native APK]
                      │                                              │
                      ▼                                              ▼
    ┌───────────────────────────────────┐          ┌───────────────────────────────────┐
    │        Web Service (Public)       │          │     Mobile Gateway Service (Public)│
    │  https://ride-shareweb-production │          │  https://ride-sharemobile-prod... │
    │  .up.railway.app                  │          │  .up.railway.app                  │
    ├───────────────────────────────────┤          ├───────────────────────────────────┤
    │ • Landing & Marketing Website     │          │ • Non-browsable: GET / -> 403     │
    │ • PWA / Web Client UI             │          │ • HMAC-SHA256 App Attestation     │
    │ • Direct APK Download Endpoint    │          │ • OTA Update Manifests & Bundles  │
    │ • Proxies /v1/* to Internal API   │          │ • Proxies /v1/* to Internal API   │
    │ • __RS_SURFACE = 'web'            │          │ • __RS_SURFACE = 'mobile'         │
    └─────────────────┬─────────────────┘          └─────────────────┬─────────────────┘
                      │                                              │
                      └──────────────────────┬───────────────────────┘
                                             │ (Railway Private Mesh)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          NestJS API Service (Private)        │
                      │  http://ride-shareapi.railway.internal:3000  │
                      ├──────────────────────────────────────────────┤
                      │ • Modular Monolith (Fastify + NestJS 11)     │
                      │ • Domain Logic, Auth, Ledger, Journeys       │
                      │ • Parameterized Repositories (Pure SQL)      │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          PostgreSQL Database (Managed)       │
                      │ • Schema Migrations (0001 -> 0028 applied)   │
                      │ • Double-Entry Append-Only Ledger            │
                      │ • Seat Oversell Database Triggers            │
                      └──────────────────────────────────────────────┘
```

### Surface Split & OTA Architecture
1. **Web Surface (`apps/web`):**
   - Configured with `__RS_SURFACE=web`.
   - Guest entry defaults to `landing` screen (`apps/web/src/screens/landing.js`).
   - Browser visitors are never shown native app intro slides or forced into app shell mode.
   - Serves the direct APK binary at `GET /download/android.apk`.

2. **Mobile App API Gateway (`apps/mobile/server.js`):**
   - Direct browser visits to `/` return HTTP 403 `{"ok": false, "code": "NOT_A_WEBSITE"}`.
   - Public health check at `GET /healthz` returns `{"ok":true,"service":"mobile","kind":"app-api","api":"up"}`.
   - Authenticates mobile clients via HMAC-SHA256 headers: `X-RS-App-Id`, `X-RS-Ts`, and `X-RS-Sign`.
   - Serves OTA update metadata (`GET /v1/mobile/update`) and standalone HTML bundles (`GET /v1/mobile/bundle`).
   - Proxies authenticated API requests to internal NestJS API.

3. **Instagram-Style Native Bootloader (`apps/mobile/offline.html`):**
   - Embedded directly in APK assets (`www/index.html`).
   - On startup, executes Web Crypto HMAC-SHA256 signing against `MOBILE_APP_SECRET`.
   - Probes `https://ride-sharemobile-production.up.railway.app/v1/mobile/update` with a 2.5-second timeout.
   - Downloads and verifies OTA bundle SHA-256 hash against signed manifest.
   - Caches bundles locally in `localStorage` (`rs_ota_bundle_v*`).
   - Executes bundle inside a secured iframe sandbox, routing native bridge events to Capacitor native layer.
   - Operates 100% offline using last-known cached bundle if network is unavailable or gateway times out.
   - Never navigates or redirects the host window to the public website URL.

---

## 2. Completed Capabilities Matrix (Built & Verified)

All features from the merged Path A, Path B, and previous milestones are 100% completed, tested, and verified on `main`:

| Capability | Module / Layer | Implementation & Test Coverage |
|---|---|---|
| **Identity & Authentication** | `apps/api/src/modules/identity/` | Email + password, OTP rate-limiting, owner OTP bypass (DEC-208), session tokens, account lockout. |
| **System Admin & Staff Lifecycle** | `apps/api/src/modules/identity/` | Soft-deletion (`deleted_at`), bootstrap super-admin protection (DEC-196), role management. |
| **Owner Control Center** | `apps/api/src/modules/config/` | Dynamic platform settings (migration `0026`), launch commission %, notification limits, OTP bypass toggle. |
| **Geography & Stops Desk** | `apps/api/src/modules/geo/` | Interactive OSM stop placement, 2-person verification workflow, corridor stop indexing. |
| **Routes & Timetable Grid** | `apps/api/src/modules/routes/` | Fixed route management, ordered stops, departure slot generation, timetable claims. |
| **Driver Claim & Approval** | `apps/api/src/modules/drivers/` | Driver KYC submission, vehicle inspection state machine, 2-tap route slot claiming. |
| **Bookings & Seat Protection** | `apps/api/src/modules/bookings/` | Real-time seat reservation, DB oversell trigger guard, locked flat fare (DEC-056). |
| **Boarding Codes & QR Scan** | `apps/api/src/modules/bookings/` | 6-digit numeric fallback (DEC-136), QR manifest scanner (`POST /bookings/scan`), scan-once protection. |
| **Live Journey Lifecycle** | `apps/api/src/modules/journeys/` | Pure state machine (`CLAIMED → IN_PROGRESS → COMPLETED`), live alighting signal (`POST /bookings/:id/alight`), driver trip manifest. |
| **Double-Entry Financial Ledger** | `apps/api/src/modules/payments/` | Append-only ledger (migration `0017`), derived balances view (`account_balances`), immutable audit trail. |
| **Paymob Webhook Integration** | `apps/api/src/modules/payments/` | HMAC-SHA512 verification, idempotent provider transaction processing, wallet top-up. |
| **Wallet Fare Settlement** | `apps/api/src/modules/payments/` | Atomic booking fare settlement (`POST /payments/bookings/:id/pay-wallet`), cash liability tracking. |
| **Trust, Safety & Support (M4)** | `apps/api/src/modules/support/` | In-ride silent SOS, live web ride share, incident reporting queue, staff triage actions (migration `0020`). |
| **A→B Corridor Planner** | `apps/web/src/screens/planner.js` | Fuse.js fuzzy stop/route search, bilingual normalization, route selection, map view. |
| **Mobile Pipeline & APK** | `apps/mobile/` | Capacitor Android wrapper, offline GPS outbox, batched tracking, Instagram OTA bootloader, debug APK & release AAB. |

---

## 3. The Unified Remaining Work Inventory (Attack Order)

The remaining backlog is structured into 6 sequential phases with zero ambiguity:

### Phase 1: Core Journey UX & Spatial Search (Milestones W2, W2b, W13)

#### W2: Geocoded Place Search via Nominatim (BUILD_PLAN §P2.6 / DEC-206)
- **Problem:** Planner search currently matches only local corridor stops. Users need to search arbitrary Alexandria landmarks and addresses (e.g. "Stanley Bridge", "Sidi Gaber Station", "محطة الرمل").
- **Backend Implementation:**
  - Endpoint: `GET /geo/places?q=&lang=` in `apps/api/src/modules/geo/`.
  - Upstream: OpenStreetMap Nominatim API with Alexandria bounding box `viewbox=29.8,31.3,30.1,31.1&bounded=1`.
  - Caching: PostgreSQL `place_cache` table (columns: `query_norm`, `results_json`, `expires_at`, 7-day TTL).
  - Rate Limiting: 1 request/second compliance via `@Throttle()` and custom User-Agent header (`RideShare-Alexandria/1.0`).
- **Frontend Implementation:**
  - Stream Nominatim place results in `apps/web/src/screens/planner.js` below local stop matches.
  - Selecting a place calculates Euclidean/Haversine walking distance to the nearest route boarding stop and destination alighting stop.
- **Tests & Break Verification:**
  - Unit tests for Nominatim query formatting, caching hits/misses, and bounding box filtering.
  - Break test: Invert bounding box coordinates and verify failure in CI.

#### W2b: Live Fleet Ops Map Verification
- Verify `GET /journeys/live` accurately streams active vehicle GPS positions to `staff.js` live map.
- Ensure clean empty state and reconnect backoff when zero vehicles are active.

#### W13: Route Stops Attachment Desk UX
- Provide operators with an intuitive UI to attach verified stops to routes, configure stop sequence order, and set travel run minutes between stops (`POST /routes/:id/stops` and `POST /routes/:id/reorder`).

---

### Phase 2: Accounting Automation & Driver Payouts (Milestones W6, W5)

#### W6: Automated Daily Reconciliation (CH06 §6.9)
- **Problem:** Ledger balances, Paymob payment orders, and driver cash collections must balance automatically every 24 hours.
- **Implementation:**
  - Scheduled daily job (`ReconciliationCronService`) running at 03:00 Cairo time.
  - Compares:
    1. Sum of Paymob webhooks received vs ledger `cash_in` entries.
    2. Sum of booking fare deductions vs driver wallet balances.
    3. Sum of driver cash collection reports vs platform commission debits.
  - Discrepancy handling: Emits `payments.reconciliation_discrepancy` in audit log and raises a persistent amber/red alert banner in the Operations Dashboard. Never auto-adjusts ledger balances silently.
- **Tests:** Seed unbalanced test transaction, run reconciliation job, assert audit log emission and banner state.

#### W5: Paymob Driver Payouts & Earnings Statements (CH06 §6.7, DEC-080)
- **Implementation:**
  - Adapter: `PaymobPayoutAdapter` implementing `POST /disburse/{issuer}`.
  - Weekly payout batch processor for driver balances exceeding `MIN_PAYOUT_THRESHOLD`.
  - Driver statement screen in `apps/web/src/screens/driver.js`: line-by-line ride earnings, cash collected offsets, commission deductions, and net payout transfers.
- **Tests:** Verify payout threshold boundaries and ledger debit atomicity.

---

### Phase 3: Commercial Control & Supply (Milestone 5)

#### P5.1: Dynamic Fare Management
- Manager UI to adjust route flat fares.
- Read-only financial impact calculation against recent 30-day journey volume.
- Scheduled effective dates with automatic revert date for temporary pricing.
- Static check guarding against dynamic surge pricing (DEC-056).
- Audit trail in `fare_history` table.

#### P5.2: Budget-Capped Promotions & Flash Sales
- Promo code creation with hard ledger budget caps (`promotion_budget` liability account, INV-29).
- Atomic redemption checking: code rejects immediately when remaining budget is less than discount amount.
- Non-stackable (maximum 1 promo per booking), attributable to marketing campaign ID.

#### P5.3: Supply Heatmap & Driver Claim Bonuses
- Operations heatmap displaying uncovered schedule slots across corridors.
- Configurable per-slot driver claim bonus (`claim_bonus_minor`, DEC-132) credited upon journey completion.

#### Operational Analytics Telemetry
- Append-only `analytics_events` table for pseudonymous operational telemetry (search drop-offs, booking funnel conversion).

---

### Phase 4: Recurring Commutes & Subscriptions (Milestone 6)

#### P6.1: Route Ride-Packs & Subscriptions (BUILD_PLAN §P6.1)
- Ride-packs (e.g., 10-ride or 20-ride passes) sold **only** against committed supply corridors (`journeys.committed = true`, INV-33).
- Upfront wallet payment; unearned revenue held in `subscription_deferred` ledger account.
- Revenue recognized into driver/platform accounts upon each completed ride; atomic entitlement decrement; unused passes expire at term end (DEC-154).

#### P6.2: Recurring Driver Claims & Commuter Reservations
- Driver weekly timetable slot claiming templates.
- Rider daily recurring seat reservation auto-booking.

---

### Phase 5: Safety Telemetry, UI Polish & Security (Milestones W7, W8, W12)

#### W12: Privileged Staff 2FA (DEC-151)
- Mandatory TOTP authenticator / email step-up challenge for `super_admin`, `manager`, and `operations` roles.

#### W7: Safety Telemetry Instrumentation
- Telemetry logging for push notification delivery failures (G-055) and alighting signal frequency (G-053).

#### W8: Desktop GUI Polish & Fluid Typography
- Responsive two-pane list+detail layout for staff management tables on viewports ≥840px.
- Fluid typography using `clamp()` across mobile (320px) to ultrawide desktop (1440px+).

---

### Phase 6: Launch Validation & Rehearsals (Milestone 8)

#### P8.1: Day-in-the-Life Demand Simulation
- Simulation harness replaying 500 riders and 50 drivers across 5 corridors over a synthetic 24-hour day.
- Validates ledger balance consistency, slot claim concurrency, and rate limiter limits.

#### P8.2: Load & Failure Rehearsals
- Stress test core endpoints (`POST /bookings`, `POST /bookings/scan`).
- Database failover drill: assert clean HTTP 503 fail-fast behavior with zero corrupt partial writes.

#### P8.3: Live Corridor Acceptance
- End-to-end live corridor pass: Route creation → Timetable slot claim → Rider search & booking → Wallet payment → Driver QR scan → Trip completion.

---

## 4. Owner-Gated Action Items & Secret Register

The following items require external credentials or owner confirmation before production launch:

| ID | Item | Required Input / Action | Blocking Impact |
|---|---|---|---|
| **G-060** | Brand & App Name | Final trademark-cleared name in `packages/brand/brand.json` | Google Play store metadata & final branding. |
| **G-079** | Launch Commission % | Set launch commission (0% to 20%) in Owner Settings | Platform revenue cut on completed rides. |
| **W10** | Paymob Production Keys | Live API Key, HMAC Secret, Card/Wallet Integration IDs | Switching from Paymob sandbox to live Egyptian cards. |
| **W11** | Play Store Release Keystore | `ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` | Producing signed release AAB for Google Play Console. |
| **P2.5** | Alexandria Corridor Survey | Verification of physical corridor stop coordinates | Activating initial live passenger routes. |
| **Play Integrity** | Google Cloud Attestation | Play Integrity API project setup in Google Cloud Console | Replacing HMAC app attestation with cryptographic hardware attestation. |

---

## 5. Verification Protocol & Quality Gates

Before any commit is pushed to `origin/main`, the following verification cycle must pass 100% green:

```bash
# 1. Full repository verification (repo guards, build, types, ESLint, API unit, Web unit)
pnpm verify

# 2. Database verification (migrations up/down/up, schema drift check, TypeScript types)
DATABASE_URL="postgres:///rideshare_dev?host=/var/run/postgresql" pnpm db:verify

# 3. Web & GUI verification (unit, a11y, Puppeteer layout matrix, break test harnesses)
cd apps/web && ./verify.sh && cd ../..
```

---

## 6. Document Synthesis History

This document supersedes and merges:
- `docs/planning/PATH_A_MONEY.md` (Agent A - Ledger, Paymob, Wallet)
- `docs/planning/PATH_B_JOURNEY.md` (Agent B - Manifest, QR Scan, Lifecycle, Safety, Mobile)
- `docs/planning/START_HERE_HANDOFF.md` (Agent Handoff 2026-08-26)
- `docs/planning/NEXT_AGENT_HANDOVER.md` (Work Packages W0–W14)
- `docs/planning/BUILD_PLAN.md` (Phases 0–8 Blueprints)
