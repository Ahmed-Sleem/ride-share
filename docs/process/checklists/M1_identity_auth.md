# M1 — IDENTITY, AUTH, AND THE REAL SYSTEM (stop being a demo)

> Milestone goal: the deployed app becomes a **real system** — real sign-in, real
> role-based dashboards, real data from the backend, no sample content. The
> approved GUI is kept as the client; it gets wired to the NestJS API (DEC-181).

## Why this exists

The live URL currently serves the design prototype: every screen renders `DATA.*`
sample content and no control talks to the backend. This milestone removes the
sample data, connects the interface to the API, and adds the identity layer —
the first real vertical slice (DEC-182).

## Scope (what "complete" means for THIS milestone)

- **One admin account ships with the system**, seeded from environment
  variables on first boot. It logs in with a password, can change its password,
  and can create other staff accounts. No self-service sign-up for staff
  (spec: DEC-032/033/035).
- **Riders self-register** (create account on the landing page). **Drivers
  apply** (sign-up then approval, DEC-035). Staff roles never self-register.
- **Role-based entry**: after sign-in, staff/admin land on their dashboards;
  riders on rider home; drivers on duty. (The `PAGES` table already routes per
  role — this milestone makes the role *real* from auth, not the switcher.)
- **All demo data is removed.** Every screen reads from the API; where no data
  exists yet, screens show honest empty states — and the admin/ops tools to
  create real records land in M2/M3. No fake rows, no decorative success.
- **GUI polish**: a bouncy-logo boot splash, the side rail **collapsed by
  default**, a landing page (logo → sign in / create account), and one motion
  system for every transition and action.

## Backend (NestJS — apps/api)

### A. Schema & migrations
- [x] `0002_users.sql` — users: id (uuidv7), phone (unique), name, role
      (rider/driver/operations/manager/support/super_admin), password_hash
      (nullable — OTP-only riders have none), created_at, status. Argon2 hash.
- [x] `0003_sessions.sql` — refresh tokens / device sessions (revocable).
- [x] Regenerate `packages/shared-types/src/db.generated.ts` (`pnpm db:types`).
- [x] up → down → up clean; schema drift check green (P0.5 machinery reused).

### B. Auth
- [x] Password auth for staff — Node `scrypt` (memory-hard, OWASP-accepted, zero native build risk; format is self-describing so params can be raised). Env-seeded admin uses it.
- [x] Rider OTP: phone → 6-digit code. **Development transport logs the code
      server-side; production REFUSES to start without an SMS key** (honest
      sandbox adapter, DEC-179 pattern — no fake success).
- [x] JWT access + refresh; sessions revocable; passcode (CH03).
- [x] `auth/` module: one authority gate on every route; the single resolver
      (already built) + the actor from the verified token.
- [x] One error shape throughout (already built); message_key i18n keys.

### C. Admin seeding & management
- [x] `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars → seed on boot, idempotent
      (create only if missing), logged as "seeded" without the password.
- [x] Change-own-password endpoint.
- [x] Super-admin creates staff accounts (role-scoped); staff list endpoint.
- [x] No self-service staff registration (endpoint absent + authority check).

### D. Drivers & vehicles (BUILD_PLAN P1)
- [ ] Driver application (docs upload) → ops approval (DEC-035 state machine).
- [ ] Vehicle registry with fleet labels (DEC-033/039).
- [ ] Real endpoints behind the `drivers` / `vehicles` module seams.

## Frontend (apps/web — the approved GUI, wired)

### E. Landing & auth
- [ ] Landing page: logo, tagline, "Sign in" and "Create account" (rider).
- [ ] Auth screens wired to the real API: OTP (rider), password (staff).
- [ ] Session persistence (refresh token); sign-out clears it.
- [ ] Role selector removed from the signed-in shell — role comes from auth
      (kept only behind a dev flag, per §8 no fake).

### F. Boot splash & motion
- [ ] Bouncy spinning-logo boot splash on first load; removed when the app
      has either a session or shows landing/auth.
- [ ] Side rail **collapsed by default** (stored preference defaults to
      collapsed; user can expand, choice remembered).
- [ ] One motion system: tokens for page transition, sheet, toast, nav-item,
      button/card hover — all respecting `prefers-reduced-motion` (already
      present). Page-level enter transition on render.

### G. Wire real data, kill the demo
- [ ] `DATA.*` sample content removed from `content.js`.
- [ ] A small API client (fetch, bearer token, one error handler) in the app.
- [ ] Signed-in screens load real state from the API; empty/loading/error
      states everywhere (no fake rows, no decorative success).
- [ ] Staff dashboards render real users/vehicles/applications (from D).
- [ ] Booking/geo screens show honest "not available yet" empty states until
      M2/M3 (hidden where the role would never see them, §8.1).

## Deployment
- [ ] `.env.example` documents `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SMS_API_KEY`
      (names only) + `check-env-example.sh` stays green.
- [ ] Railway variables updated (owner): `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
      `JWT_SECRET` (already set), `CORS_ORIGINS`, `SMS_API_KEY` (when ready).
- [ ] Rebuild → redeploy → verify `/healthz`, land on the landing page, sign in
      as the seeded admin, see the admin dashboard.

## Verification (every box ticked only on command proof)

- [ ] Backend: unit tests for hash/verify, OTP issue/verify/expiry, JWT,
      authority (already 21 green — grows), admin seed idempotency, change-password,
      staff-creation permission (a rider MUST NOT create staff — break case).
- [ ] Frontend: unit + axe + layout suites stay green; new break cases for:
      collapsed-by-default rail, splash presence, landing-before-auth, and
      "no DATA sample strings anywhere" (a check that fails if sample content
      returns).
- [ ] `pnpm verify` + `pnpm db:verify` green; secret scan clean.
- [ ] Live: seeded admin signs in on Railway, lands on the admin dashboard,
      changes password, creates a second admin.

## Explicitly NOT in this milestone (comes next)

- M2 geography/stops, M3 booking/boarding/payment, M4 safety, M5 commercial,
  M6 subscriptions, M7 APK. Their screens remain honest empty states until then.
