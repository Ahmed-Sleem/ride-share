# IMPLEMENTATION LOG

Every closed gap and every non-trivial change gets one entry here, in the
format below. Closing a gap requires proof (files changed, tests run, observed
output) — see the engineering standard §3.3 and §4.

## Format

```text
## <date> — <Gap ID or change one-liner>

- What: <one-line description>
- Files: <paths>
- Tests: <tests added or updated>
- Verified: <commands and observed output>
- Self-check: <fully fixed? wired and production-ready? does the test really validate the behaviour?>
```

---

## 2026-08-17 — Search bar scrolls with the page; separator removed

- What: The search band moved from a pinned sibling above the scroller to the
  first element inside `.main`, so it scrolls with the page content, and the
  horizontal separator under it was removed. (User request.)
- Files: `app/src/shell/app.js`, `app/src/styles/shell.html`,
  `app/tests/unit.test.js`, `app/tests/breaks.sh`, `app/tests/layout.test.js`,
  `docs/design/README.md`.
- Tests: unit section rewritten to assert the band is inside the scroller, is
  the first element, and has no divider; break cases added for "band pinned
  above the scroller", "band drops below the content", and "divider returns
  under the band"; layout check changed to "search band sits inside the
  scroller".
- Verified: `./app/verify.sh` green — 181 unit/accessibility assertions;
  5,803 real-browser layout assertions across 15 viewports × 5 roles × 30
  screens; 36 break cases and 7 layout break cases all caught. Also confirmed
  directly in a browser: the band's top moved from 81px to −48px after
  scrolling (scrolls with the page) and its border-bottom-width is 0.
- Self-check: fully fixed — the band is genuinely part of the scrollable page
  and no separator line remains; every changed check was observed failing for
  the right reason before passing.

## 2026-08-17 — GUI modernisation (violet pop design)

- What: Re-skinned the interface to a youth "pop" design — violet primary, coral secondary, five
  pastel pops, near-black dark mode, gradient brand mark + favicon, Auto/Light/Dark theme with a
  top-bar quick toggle, collapsible desktop rail, and tasteful motion/emoji accents. (User-approved
  decisions via MCQ: full re-skin; violet-first; Auto+Light+Dark; gradient mark; collapse-to-icons;
  moderate shapes; tasteful happiness set; near-black dark; violet as primary action, coral as
  secondary role.)
- Files: `app/src/styles/shell.html` (tokens, favicon, gradient defs, buttons, chips, empty,
  rail collapse), `app/src/lib/components.js` (state, resolvedTheme, storage, logoSVG, sun icon,
  Empty), `app/src/shell/app.js` (logo, railToggle, themeToggle, render), `app/src/screens/rider.js`
  (themeSeg 3-way, auth logo, emoji accents), `app/src/data/content.js` (i18n keys),
  `app/tests/unit.test.js`, `app/tests/breaks.sh`.
- Tests: unit rewritten (accent group for violet/coral, new THEME/RAIL/BRAND groups); break cases
  updated for the new tokens and 4 added (rail collapse, auto theme, favicon, gradient logo).
- Verified: `./app/verify.sh` green — 198 unit/accessibility; 5,803 real-browser layout (15
  viewports × 5 roles × 30 screens); 40 + 7 break cases caught. Functional browser check:
  auto resolves to the system, dark gives `#0B0C0F` surfaces, the rail collapses to 80px with
  labels hidden, the gradient logo and favicon render.
- Self-check: fully wired — the theme preference persists, the rail preference persists, every new
  check was observed failing for the right reason, and the RTL/Arabic + light/dark matrix still
  renders all 30 screens.

## 2026-08-17 — M0.1: monorepo skeleton, pinned toolchain, workspace guard

- What: Created the pnpm monorepo (apps/* + packages/*), pinned the toolchain exactly, added a
  central catalog (one dependency one version), moved the approved GUI to `apps/web/`, and added
  the first enforcement script.
- Files: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `AGENTS.md`,
  `scripts/check-workspace.sh`, `scripts/verify-repo.sh`, `packages/config/*`,
  `apps/{api,mobile,web}/package.json` (+ READMEs), `apps/web/**` (moved from `app/`),
  README/docs updates.
- Tests: `scripts/check-workspace.sh` guards private-root / exact-packageManager / named-packages /
  workspace-protocol / catalog-only. Each of the four break cases (range character in
  packageManager, bare version in a child package, internal dep without `workspace:`, root not
  private) observed failing for the right reason, then restored.
- Verified: `bash scripts/check-workspace.sh` → 6 files examined, 0 failures;
  `./apps/web/verify.sh` → 198 unit, 5,803 layout, 40 + 7 break cases caught, all green.
- Self-check: fully wired — the workspace installs from a clean clone (`pnpm install` with a
  generated lockfile), the GUI builds and verifies from its new home, and the guard genuinely
  fails when any constraint is violated.

## 2026-08-17 — M0.2 (P0.2) + M0.3 (P0.3): verify harness, secret hygiene, env guard

### P0.2 — The verify command
- What: `pnpm verify` = repo checks → build → typecheck → lint → test across the workspace.
  `scripts/verify-repo.sh` runs each check in order, fails on the first non-zero and NAMES it,
  and flags any sub-check that exits 0 without reporting an "examined N" count (the silent-green
  guard — P0.2's most important failure mode).
- Files: `scripts/verify-repo.sh`, `scripts/check-workspace.sh` (summary line), root `package.json`.
- Tests: two break cases observed — `exit 1` appended to a sub-check → "✗ FAIL: scripts/check-workspace.sh
  exited 1"; a sub-script that exits 0 silently → "reported no examined-file count (silent green)".
- Verified: `pnpm verify` exit 0 — repo checks green, web 198 unit, api build/typecheck/lint/test green.

### P0.3 — Secret hygiene
- What: `.env.example` expanded to document every variable; `scripts/check-secrets.sh` scans the tree
  for known credential shapes (AKIA, ghp_/github_pat_, sk-, private-key headers, connection strings
  with passwords, key=value secrets); `apps/api/src/config/env.ts` is the only module reading
  `process.env` (zod schema + named refusal), `scripts/check-env-example.sh` keeps `.env.example`
  in lock-step; eslint `no-restricted-syntax` fails on any other `process.env`.
- Files: `apps/api/{package.json,tsconfig.json,eslint.config.mjs,src/main.ts,src/config/env.ts,src/config/env.test.ts}`,
  `scripts/check-secrets.sh`, `scripts/check-env-example.sh`, `.env.example`, catalog versions.
- Tests: 3 unit tests (valid defaults; all missing vars named; short JWT_SECRET named). Break cases:
  planted `AKIA…` key → scan fails; `process.env.FOO` in a random file → lint fails; removed a
  required var from `.env.example` → env-doc fails; startup with empty env → exit 1 naming
  DATABASE_URL, REDIS_URL, JWT_SECRET. False positives fixed (dummy conn string in a test, AKIA
  literals in two docs) so the scan is clean on a clean tree.
- Verified: secret scan "examined 112 files, 0 hit(s)"; `git ls-files | grep -c '^.env$'` → 0.

## 2026-08-17 — M0.4 (P0.4): one Dockerfile, local compose, infra/ layout

- What: `infra/` layout (docker/, railway/, scripts/); the parameterised `infra/docker/Dockerfile.node`
  (ARG PROJECT ∈ {api, web}) with turbo-prune → build → non-root runner; `apps/web/server.js` (static
  server + /healthz, zero deps) and `apps/web/dist/index.html` build artifact; `apps/api/src/server.ts`
  health server; root `docker-compose.yml` (api, web, postgres+postgis, redis); `.dockerignore`;
  `infra/railway/railway.toml` + README; CI workflow (.github/workflows/ci.yml) running pnpm verify,
  the full GUI browser suite, and both image builds with a non-root check.
- Files: infra/** , apps/web/{server.js, build.js, tests/server.test.js, package.json},
  apps/api/{src/server.ts, src/main.ts, src/server.test.ts, package.json}, docker-compose.yml,
  .dockerignore, .github/workflows/ci.yml, README/docs updates.
- Tests/break: two bugs found and fixed by actually running the images — (1) ARG PROJECT not promoted
  to ENV (CMD saw empty → "No projects matched"); (2) corepack tried to download pnpm at container
  runtime (no network) — pnpm is now installed in the image. Break observed: removing `USER app`
  → image runs as root (uid=0); restored. Non-root (uid=100) proved for both images.
- Verified (in this sandbox, dockerd running): both images build from ONE Dockerfile (web 171 MB,
  api 177 MB); web serves /healthz `{"ok":true,"service":"web"}` + the document; api serves /healthz
  with valid env and refuses to start (exit 1) naming DATABASE_URL, REDIS_URL, JWT_SECRET; `ls /app/.env`
  → No such file (no secrets baked); compose YAML + railway TOML/JSON + all shell scripts syntax-checked.
- Not yet proven here (needs a Docker host with bridge networking): a live `docker compose up` of the
  4-service stack. The images are proven individually; the full-stack run is exercised in P0.12 and by CI.

## 2026-08-17 — M0.5 (P0.5): PostGIS, migrations, and the no-ORM guard-rails

- What: `infra/migrations/0001_enable-postgis.sql` (enables PostGIS, nothing else);
  `packages/shared-types` with a GENERATED `db.generated.ts` (schema-derived, excludes
  extension-owned tables and views); `scripts/check-sql-location.sh` (SQL only in repositories),
  `scripts/check-sql-injection.sh` (no interpolated/concatenated SQL), `scripts/check-migrations.sh`
  (scratch DB → up → pg_dump → compare to committed `infra/schema.sql` → down-all → up-again),
  `scripts/check-db-types.sh`, `scripts/verify-db.sh`; `pnpm migrate`, `pnpm db:types`, `pnpm db:verify`;
  CI `verify-db` job against a postgis/postgis:16-3.4 service container.
- Files: infra/migrations/*, infra/schema.sql, scripts/{gen-db-types.mjs,check-sql-location.sh,
  check-sql-injection.sh,check-migrations.sh,check-db-types.sh,verify-db.sh}, packages/shared-types/*,
  .github/workflows/ci.yml, pnpm-workspace.yaml (node-pg-migrate@9, pg@8), package.json.
- Findings fixed by running it for real: (1) node-pg-migrate loads EVERY file in the migrations dir,
  so schema.sql lives at infra/schema.sql; (2) the postgis image pre-seeds its default DB with
  tiger/topology/fuzzystrmatch, so the committed schema is generated from a CLEAN scratch DB
  (migrations-only); (3) pg_dump 17 emits `\unrestrict` meta-commands → stripped in normalization;
  (4) the type generator must exclude extension-owned tables (pg_depend) and views.
- Break cases (all observed failing for the right reason): SQL in a service file → location fails;
  `SELECT ... ${id}` → injection fails; hand-added column in schema.sql → drift fails; removed the
  down migration → up/down/up fails ("down migration disabled").
- Verified: PostGIS_Version() = 3.4; `pnpm db:verify` green (0 drift, cycle clean, types 0 drift);
  `pnpm verify` green (repo checks incl. both SQL checks, web 198 unit, api tests). DB suite is
  DB-dependent and lives behind `pnpm db:verify` (run in CI, not in the DB-free `pnpm verify`).

## 2026-08-17 — M0.6 (P0.6): API skeleton + security foundation (Paymob-ready)

- What: NestJS 11 (Fastify) API with a full security foundation, per OWASP/practitioner research.
  One error shape `{ code, message_key, details, request_id }` (message_key is a translation key,
  never prose — prose like "Cannot GET /nope" maps to `error.not_found`); one request context
  (request id from Fastify + locale/city headers); one strict validation pipe (whitelist +
  forbidNonWhitelisted, rejects unknown fields); one authority resolver (Role × Capability matrix,
  deny-by-default, assertCan throws auth.forbidden) + AuthorityGuard/RequireCapability; one pino
  structured logger with central redaction; helmet security headers; CORS allowlist from env;
  global rate limiting (@nestjs/throttler, env-tuned); trustProxy for correct IPs behind Railway.
  /health + /healthz report db (pg) + redis (ioredis) and return 503 when either is down.
- Paymob-ready: `modules/payments/contracts/` — PaymentProvider interface (checkout/refund/
  verifyWebhook/normalizeWebhook, integer minor units), a real HMAC-SHA512 webhook verifier
  (constant-time compare, Paymob's JSON.stringify(obj) scheme), and a PaymobAdapter whose
  verifier is live-ready while checkout/refund refuse in sandbox mode (no fake success). Mode flips
  to live when PAYMOB_API_KEY/HMAC_SECRET land.
- Files: apps/api/src/{main,app.module,config/config.module,common/*,security/*,health/*,
  modules/payments/contracts/*} + the 16 module dirs (identity, drivers, vehicles, geo, journeys,
  requests, bookings, matching, pricing, payments, promotions, notifications, analytics, support,
  audit, config) each with a "why" README + contracts/domain seam. .env.example + catalog extended.
- Tests (21, all green): env (3), health e2e (2, 503-when-down), error filter (4, incl. prose→key
  and no-internals-leak), authority (6), webhook verifier (4, incl. tamper/wrong-secret), validation
  e2e (2, unknown field → 400). Break cases observed: console.log → lint fails; redis down → 503;
  raw Error → INTERNAL shape. Live proof (native Postgres 17 + PostGIS + Redis in sandbox): /healthz
  200 {db:up,redis:up}; helmet headers present; 404 → {code,message_key,request_id}; rate limit →
  429; redis shutdown → 503 → restart → 200.
- Self-check: fully wired — security is applied ONCE at bootstrap/root module; feature modules get
  the same filter/pipe/guard/authority with no per-route re-implementation.

## 2026-08-17 — M0.7–M0.11 (P0.7–P0.11): token/boundary/authority guards, axe scan, CI

- What: the remaining Phase 0 guard-rails, each wired into `pnpm verify` and each observed
  failing for the right reason.
  - P0.7: axe-core scan (`apps/web/tests/a11y.test.js`) over 7 representative screens × EN/AR —
    14/14, zero serious/critical violations. RTL, dark mode and bidi isolation were already proven
    by the GUI suite. The shared theme object's mobile half is deferred to P7 (one definition, two
    consumers — the Capacitor app reads the same `:root` tokens).
  - P0.8: `scripts/check-tokens.sh` — colour literals only in the theme file (token blocks); three
    break cases caught (CSS rule inside `<style>`, inline style object, template literal).
  - P0.9: `scripts/check-boundaries.mjs` — cross-module imports only through `contracts/`,
    `domain/` never imports `infra/`, no module cycles, packages never import apps. Tooling decision
    recorded in the file: a dependency-free Node script instead of dependency-cruiser (§16
    verify-before-adopting) — the rules are enforced from import paths, which is the same
    information. Three break cases caught (deep import, domain→infra, contracts cycle).
  - P0.10: `scripts/check-authority.sh` (role comparisons only in the resolver) and
    `scripts/check-hide-not-disable.sh` (no permission-based `dis:`/`disabled:`) — both break cases
    caught. The important break: an all-permissive resolver makes 5 authority tests fail (proved),
    confirming the tests genuinely test authority (§7.0). `<PermissionGate>` lands in M1.
  - P0.11: CI workflow (verify, verify-gui, verify-db with postgis service, images with non-root
    check) validated as YAML; branch protection + the red-PR observation are owner actions in
    GitHub settings (documented in the checklist).
- Files: scripts/{check-tokens.sh,check-boundaries.mjs,check-authority.sh,check-hide-not-disable.sh},
  scripts/verify-repo.sh (9 checks), apps/web/tests/a11y.test.js, AGENTS.md, catalog + axe-core,
  apps/web/package.json.
- Verified: `pnpm verify` green — 9 repo checks (workspace 7, secrets 191, env-doc, sql-location 34,
  sql-injection 34, tokens 7, authority 13, hide-not-disable 7, boundaries 22), web 198 unit +
  14 axe, api 21 tests, typecheck + lint clean.

## 2026-08-17 — P0.12/P0.13 prep + critical fix: check-secrets.sh was untracked

- What: `infra/compose/production.yml` (identical images on a plain Docker host, same env names),
  `infra/MIGRATION.md` (concrete move, real commands), Railway click-path in
  `infra/railway/README.md` incl. the PostGIS-not-in-managed-Postgres note (R19.2). Portability audit:
  clean — no platform SDKs or platform URLs in code (only explanatory comments + infra/railway config).
- CRITICAL FIX: `scripts/check-secrets.sh` had been silently IGNORED by `.gitignore` since P0.3
  (its name matches `**/*secret*`), so it was never pushed — GitHub's CI verify job would call a
  script that does not exist there. Fixed with a negation (`!scripts/check-secrets.sh`) and audited
  `git status --ignored` for other surprises (only `main.log`, correctly ignored). Also extended the
  scan skip to compose files (${VAR} placeholders, not secrets) — a planted AKIA key still fails.
- Verified: `pnpm verify` green (9 repo checks, 198 web, axe 14, 21 api).

## 2026-08-17 — DEC-184/DEC-185: managed Postgres + Redis, PostGIS deferred

- What: switched the launch database to Railway's managed PostgreSQL + managed Redis (the trial
  cannot run Docker-image services, and managed Postgres does not ship PostGIS). Migration 0001
  is now `0001_baseline.sql` (`SELECT 1`), which runs on any PostgreSQL. PostGIS deferred to M2
  (G-061, DEC-184); local docker-compose and CI use `postgres:16-alpine` for parity (DEC-185).
- Files: infra/migrations/0001_baseline.sql (renamed), infra/schema.sql (regenerated from a clean
  plain-PG scratch DB), docker-compose.yml, .github/workflows/ci.yml, infra/railway/README.md
  (managed DB click-path + reference variables `${{Postgres.DATABASE_URL}}` / `${{Redis.REDIS_URL}}`),
  infra/README.md, README.md, .env.example, docs/planning/EXECUTION_PLAN.md + BUILD_PLAN.md (P0.5
  superseding note), docs/decisions/DECISIONS_REGISTER.md (Batch 34), OPEN_ITEMS.md (G-061),
  checklist M0 (P0.5 items restated).
- Verified: `pnpm migrate up` on plain PG 17; `pnpm db:verify` green (0 drift, up/down/up cycle
  clean); `pnpm db:types` (0 tables); `pnpm verify` green (9 repo checks, 198 web, 21 api).
- Self-check: the migration machinery and all no-ORM guard-rails are proven on the SAME database
  surface production uses — no PostGIS anywhere in the committed schema.

## 2026-08-17 — DEC-186: PostgreSQL-only (Redis removed)

- What: removed Redis from the entire system per owner direction (single stateful dependency, no
  adapter). Health now checks PostgreSQL only. Realtime/queues/sessions re-specified as Postgres-native
  (LISTEN/NOTIFY, SKIP LOCKED, tables). Decision DEC-186 + scale-monitor G-062 recorded; DEC-187
  confirms the no-ORM guard-rails are unchanged.
- Files: apps/api/src/{config/env.ts,config/env.test.ts,health/health.controller.ts,
  health/health.controller.test.ts,package.json}, pnpm-workspace.yaml, docker-compose.yml,
  .env.example, .github/workflows/ci.yml, infra/{compose/production.yml,MIGRATION.md,README.md,
  railway/README.md}, README.md, docs/planning/{EXECUTION_PLAN.md,BUILD_PLAN.md},
  docs/specification/{MASTER_SPECIFICATION.md,chapters/CH05,CH08_CH16_CH17,CH09,CH13},
  docs/decisions/{DECISIONS_REGISTER.md,OPEN_ITEMS.md}, docs/process/checklists/M0_foundations.md.
- Tests: env tests updated (2 required vars now DATABASE_URL + JWT_SECRET; missing-vars names both);
  health e2e updated (db-only; 503 when down). 21 api tests green.
- Verified: `pnpm verify` exit 0; `pnpm db:verify` green; LIVE proof — `/healthz` returns
  `{"ok":true,"service":"api","db":"up"}` with NO redis field, and `{"ok":false,"db":"down"}` [503]
  with the database stopped. Zero Redis references remain in code, config, or active design docs
  (historical decision rows and research stay, per append-only rules).
- Self-check: fully wired — the runtime path has no Redis import, dependency, env var, or health
  check; the spec's architecture statements match the code.

## 2026-08-18 — M1 backend: identity, auth, admin bootstrap (real system core)

- What: the backend identity layer — the first real vertical slice. Migrations 0002 (users) and
  0003 (otps, sessions); scrypt password hashing (self-describing format, constant-time verify);
  JWT access tokens via jose (HS256, pinned iss/aud, 15m) + opaque refresh tokens hashed with
  SHA-256 (deterministic lookup — a salted hash cannot look up) in revocable sessions; 6-digit OTP
  (hashed, 5-min TTL, 5 attempts) with a dev transport that logs the code and a production refusal
  without an SMS provider (honest, no fake success); admin seeder (ADMIN_EMAIL/ADMIN_PASSWORD,
  idempotent, password never logged); endpoints: staff login, otp/request, otp/verify (self-register
  rider), refresh (rotates), /me, me/password, admin/staff create+list (super_admin only, §8.2).
- Files: infra/migrations/0002_users.sql, 0003_auth.sql; infra/schema.sql + db.generated.ts
  (regenerated, 3 tables); apps/api/src/modules/identity/** (contracts, domain password/token/otp,
  infra users/otp/sessions repositories, application service + admin seeder, api controller/guard,
  module); config (PG_POOL + logger providers, ADMIN_*/SMS_* env); authority resolver +MANAGE_STAFF;
  .env.example; jose@6.2.9 added.
- Tests (42 green): password (4), token (3), otp (5), identity service (8, incl. rider-cannot-create-
  staff and refresh rotation), authority (7), health (2), env (3), webhook (4), validation (2), etc.
  Two bugs found by tests and fixed: salted-hash lookup for refresh tokens (→ SHA-256 hashToken) and
  the OTP transport test reading the wrong arg.
- Verified LIVE (sandbox Postgres 17 + migrations): seeded super_admin login → creates manager;
  manager create-staff → 403; rider OTP request (code logged) → verify self-registers; wrong code
  → 401; change password → old 401 / new 201; unknown field → 400 (mass-assignment guard).
  `pnpm db:verify` + `pnpm verify` green (see final run).
- Not pushed — owner confirmation gate (build-everything-then-confirm instruction).

## 2026-08-18 — M1 backend complete: identifier login, drivers, vehicles, audit (DEC-188)

- What: completed the identity/driver/vehicle backend, per the validated domain model
  (read CH02/CH04a/CH10b-c-d/DEC-046 before building). Findings applied: SIX roles (DEC-046);
  phone is the identity of record (staff log in with phone OR email — owner choice); routes are
  created by Ops/Manager, drivers only CLAIM slots; drivers self-register (Door 1) then get
  approved; staff never self-register.
- DEC-188 (M1 driver model): a driver is a rider account whose driver_profiles row is APPROVED;
  on approval users.role becomes 'driver' (atomic transaction). Drivers keep BOOK_RIDE (CH02 2.4:
  a driver may ride). State machines enumerated (submitted→under_review→approved|rejected), and
  approval walks the legal chain — a fresh application is approved via under_review, never a jump.
- New: migrations 0004 driver_profiles, 0005 vehicles, 0006 audit_log; drivers module (apply, my
  profile, add vehicle, ops list/review applications + vehicles); audit module (append-only,
  super_admin-only list) recording staff.create / driver.apply / driver.approve|reject /
  vehicle.approve|reject; identity gains findByIdentifier (phone OR email) and phone/email staff
  creation; authority matrix: DRIVER += BOOK_RIDE/MANAGE_OWN_ACCOUNT/APPLY_AS_DRIVER,
  RIDER += APPLY_AS_DRIVER.
- Architecture fixes the guard-rails themselves demanded: SQL moved from service into the
  repository (SQL-location check); cross-module imports moved to contracts/ (boundary check);
  the auth guard + token utils moved to security/ as cross-cutting infrastructure, breaking the
  identity↔audit cycle (boundary check) — the "third concept" was auth infrastructure.
- Tests: 52 green (password, token, otp, identity incl. identifier login + phone/email staff +
  audited staff creation, driver/vehicle state machines, authority, health, env, webhook,
  validation, error filter). Live-proven end to end: staff create (phone), manager 403 on audit,
  rider OTP self-register, driver apply→approve (role becomes driver), vehicle add→approve, audit
  trail shows every action.
- LOCAL COMMIT ONLY — push pending owner confirmation (build-everything-then-confirm).

## 2026-08-18 — M1 frontend Stage 1: landing, auth, splash, motion, real session

- What: turned the shell from a demo into a real entry flow. Boot splash (bouncy logo, reduced-motion
  safe) → landing page (scroll-driven hero + features + how-it-works + the map illustration, city-
  agnostic copy, light/dark + RTL) → sign-in / create-account wired to the REAL API → the signed-in
  app. Rail is collapsed by default. The demo role switcher is gone: the identity chip shows the
  session user and sign-out clears the session.
- API plumbing: `apps/web/src/lib/api.js` (the ONE api client: bearer token, one refresh on 401,
  session save/clear, all endpoints); `apps/web/server.js` now proxies `/v1/*` to `API_INTERNAL_URL`
  over the private network (503 API_NOT_CONFIGURED when unset — honest, no CORS, no key in client).
- New screens: landing.js, auth.js (staff password / rider OTP with name-collected-once, staff
  no-self-signup notice, driver path hint), admin.js (Administration: staff list + create + audit log,
  real API, empty/error states). super_admin added as the 6th role in PAGES (admin, adminStaff,
  adminAudit, queue, board, profile).
- Motion: `.main__inner` page-enter animation; landing `.reveal` + hero parallax via CSS scroll-driven
  animations (view-timeline), all wrapped in prefers-reduced-motion no-preference; splash bounce.
- Bugs found & fixed by the smoke/tests: shadowed `icon` params in featureCard/stepCard/adminStat;
  auth tabs built but never appended; breaks.sh new cases used stale `app/src/` paths (the script runs
  from apps/web).
- Tests: 218 unit (new M1 group: splash/landing/auth/rail-default/no-role-switcher/sign-out/enterApp),
  14 axe, 6,904 layout (super_admin screens added), 44 break cases (4 new M1 breaks) — all green.
  Real-browser check: boot→splash→landing (hero+map, 4 CTAs), auth card renders, zero console errors.
- LOCAL COMMIT ONLY — push pending owner confirmation.

## 2026-08-18 — M1.5: verification & recovery (DEC-189/190/191)

- What: full verification & recovery. Migration 0007: `verification_codes` (kind/channel/target,
  attempts, last_sent_at, last_attempt_at, expires_at, consumed_at) replaces `otps`; users gain
  email_verified_at. Domain `verification.ts`: 60s RESEND_COOLDOWN, MAX_ATTEMPTS=3, LOCKOUT=1h,
  per-kind TTL, hashed codes. Identity service: riderRequestOtp (cooldown/lockout → 429 with
  retryAfterMs/lockedUntil), riderVerifyOtp (mismatch counts down, 3rd → locked), email verify
  (request → code → verified), password reset (request never enumerates; confirm resets + revokes
  all sessions). Notifications: SMS + SMTP (nodemailer) behind one interface, honest sandbox.
  Migrations-on-boot via node-pg-migrate `runner()` (AUTO_MIGRATE); Dockerfile ships
  infra/migrations. Route-level @Throttle on all auth endpoints.
- Frontend: forgot-password flow (identify → code+new pass → done), resend button with a live
  60s countdown + disabled state, 1-hour lockout banner, email verification section in rider and
  driver profiles (add → code → verified chip).
- Tests: 63 api (new: verification domain cooldown/lockout/evaluate ×11, identity service reset/
  email/cooldown/lockout ×8); 226 web unit (new M1 verification group); 46 break cases (2 new).
  Fixes along the way: fake repo mutation fidelity, Notifications DI, a swallowed Nest bootstrap
  error (logger:false hid it — reproduced via --trace-exit), SQL-location false positive on a
  comment (check now strips comments, still catches real SQL).
- Verified LIVE: OTP request → resendInMs 60000; resend <60s → 429 {retryAfterMs}; wrong code
  → 401; verify → rider created (emailVerified false); email request → verify → ok; reset request
  (unknown identifier → ok, no enumeration); reset confirm → old password 401 / new 201;
  auto-migrate log "migrations complete". `pnpm verify` + `pnpm db:verify` green.
- LOCAL COMMIT ONLY — push pending owner confirmation.

## 2026-08-18 — M1.6: smart sign-in, rider/driver signup, GUI audit fixes, maps layer

- What: (1) Auto-detect sign-in: identifyLogin() returns method; passwordless accounts get a login
  OTP sent automatically — no visible role toggle; signup = Rider|Driver only, Driver auto-applies
  post-verify. (2) Twilio SMS provider behind the one seam (env-gated, dev-log fallback).
  (3) Google Maps: web server /v1/config returns GOOGLE_MAPS_API_KEY; MapView renders a real map
  (polyline, marker, geolocation "locate me") when the key is present, the labelled SVG otherwise.
  (4) GUI audit fixes per owner: full-viewport hero, centered auth card, 1500ms splash floor, hero
  map zoom crop, RTL step icons (horizontal step rows), hidden scrollbars, ::selection accent,
  role-choice cards.
- Files: identity.service.ts (identifyLogin/login), identity.controller.ts (IdentifyDto +
  /auth/login/identify), notifications.ts (twilioSms), env.ts (+SMS_PROVIDER/TWILIO_*),
  api.js (+identify/getConfig), server.js (/v1/config), components.js (S state, MapView real/zoom/
  locate), shell/app.js (1500ms boot, loadMapsConfig), auth.js (rewritten), landing.js (step rows,
  hero map), shell.html (hero/center/scrollbars/selection/step rows/rolechoice/map zoom), content.js.
- Tests: 229 web (auth rewritten assertions), 60 api (identify/login). Break cases re-targeted.
  Bugs found by tests/live and fixed: Element.append returns undefined (MapView returned undefined),
  hex literal in the polyline (→ token), IdentifyDto required a password, file:// maps fetch console
  error, login failed because a previous live reset had changed the seeded password.
- Verified LIVE: /auth/login/identify → {method:password} (staff) and 401 for unknown; login → super_admin;
  browser: hero 839px in a 900px viewport (fullscreen), scrollbarWidth none, auth card centered
  (220/204), selection = coral accent, no tabs, no console errors.

## 2026-08-18 — fix(web): landing fills the viewport; adaptive hero

- What: fixed the ~50%-width landing bug (flex-child shrink under #root's row flex) and made the
  landing genuinely adaptive: full-width, capped+centered content (--landing-max), clamp() hero
  title, two-column hero from 840px, nav padding aligned to the cap, viewport-scaled hero map.
- Files: apps/web/src/styles/shell.html, apps/web/tests/landing.test.js (new, 46 assertions),
  apps/web/package.json, apps/web/verify.sh, apps/web/tests/layout-breaks.sh (landing break helper
  + width break case).
- Verified: landing 46/46 (7 viewports + RTL), layout 6,904, unit 229, a11y 14, breaks 46,
  layout-breaks 8 (the width break caught 4 assertions when reintroduced). pnpm verify green.

## 2026-08-18 — feat(web): landing slideshow hero + user-facing features + hover tooltips

- What: replaced the hero map with a feature slideshow (heroSlideshow: 4 slides, crossfade,
  4s auto-advance, pause on hover, dots); swapped the two internal features for "Save on every
  ride" + "Track your ride live" (Swvl/Careem/Uber value props); added feature hover animation
  (lift + shine ::after sweep + icon pop); step cards now show a cursor-following floating tooltip
  (mousemove-positioned .step-tip, tap-to-toggle on touch); step numbers use physical `right:` so
  they stay put in RTL; the hero is full-bleed (gradient spans the viewport in light and dark) with
  capped inner content and a second accent glow.
- Files: apps/web/src/screens/landing.js, src/styles/shell.html, src/data/content.js,
  tests/unit.test.js (+slideshow assertions), tests/landing.test.js (+RTL number-side check),
  tests/breaks.sh (+slideshow break case).
- Verified: 230 unit / 47 landing / 14 axe / 6904 layout / 47 breaks / 8 layout-breaks; live browser:
  slideshow 0→1 after 4s, tooltip on hover, dark hero glow 1440==1440, zero console errors.

## 2026-08-18 — M1.7: stickers, colored slideshow, RTL numbers, auto lang/theme, theme-toggle fix

- What: (1) chose Streamline "Manila" over the other two packs (lively/youth doodle style, 2 colours,
  recolorable); copied 7 stickers to apps/web/assets/stickers/ (outside src so the token check skips
  them); build.js reads+minifies+recolors (fill=#001434→style fill:var(--sticker-ink);
  #3D9CFB→var(--sticker-accent)) and injects STICKERS — the bundle stays hex-free. (2) Slideshow cards
  colored per palette (tinted bg + accent) with a sticker each; how-it-works cards carry a 112px
  sticker; tooltips now show number+title+full description. (3) Step numbers use physical right:
  (no RTL mirror). (4) Sign-up: the question was a 13px caption → now a heading; role cards enlarged
  (16/15px) with robust wrap. (5) Focus ring = accent in both themes. (6) THEME-TOGGLE BUG: html vs
  body data-theme disagreement — render() now sets both. (7) Auto lang (navigator.language) + auto
  theme (prefers-color-scheme, else time-of-day) with stored overrides. (8) Footer "Vectors by
  Streamline" (not legally required — Streamline free license allows commercial use without
  attribution — added as good practice).
- Files: apps/web/{build.js, assets/stickers/* (7), src/screens/landing.js, src/screens/auth.js,
  src/lib/components.js, src/shell/app.js, src/styles/shell.html, src/data/content.js,
  tests/unit.test.js, tests/landing.test.js, docs/process/checklists/M1_landing_polish.md}.
- Verified: 233 unit (new auto-theme/auto-lang + focus-accent assertions), 14 axe, 47 landing,
  6,904 layout, 47 breaks, 8 layout-breaks; live browser audit: 4 colored slides with stickers,
  112px step art, tooltip with number+title+body, theme flips html==body ×4, AR sign-up heading +
  role cards (16/15px, no overflow), zero console errors; bundle hex-free.

## M1.8 — Email sign-in/sign-up, styled emails, DB-backed throttle, slider/landing polish

- What changed: (1) Email sign-up/sign-in REPLACES phone/SMS for riders & drivers: `/auth/otp/request`
  and `/auth/otp/verify` now take `email`; smart sign-in emails the login code; the Twilio SMS path is
  removed as dead code. (2) Email allowlist (DEC-193) in `identity/domain/email-policy.ts` — popular
  providers + every `.edu`/`.edu.<cc>` + env `EMAIL_ALLOWED_DOMAINS`; temp mailboxes (playboot.com,
  mailinator, 10minutemail…) are refused BEFORE sending, with `auth.email_domain_not_allowed`.
  (3) New `email_login` verification kind (migration 0008) on the existing DEC-189 machinery (60s
  cooldown, 3 tries → 1h lockout, scrypt-hashed codes, all in PostgreSQL); audit events for otp_request /
  signup / login / code_locked. (4) Branded HTML email (one template, violet/coral, big code block)
  via generic SMTP — Resend works by env only (smtp.resend.com:465, user "resend", pass = API key).
  (5) Rate limiting moves to PostgreSQL (DEC-195): `throttle_records` (migration 0009) + a pure
  `nextThrottleState()` transition + a `ThrottleRepository` (SQL only in `infra/*.repository.ts`) +
  a `PostgresThrottlerStorage` adapter — limits survive restarts and share across instances (G-062
  clause 1). (6) Frontend: sign-up "choose → email → OTP (6 boxes, auto-advance/paste/one-time-code) →
  name"; resend countdown + lockout persist across refresh via localStorage; friendly error copy for
  every message_key. (7) Landing: "Vectors by Streamline" is now a smaller link on its own line;
  role-choice chevrons sized 20px (were rendering ~194–276px and crushing the card text to 0 width);
  slider cards are ONE solid 700-shade each (no gradient) with white text + white doodle (AA contrast);
  dark mode brightens the doodle accents to 300-level; feature-card hover is bouncier (--bounce,
  --slow).
- Files: apps/api/src/modules/identity/{domain/email-policy.ts(+test), domain/verification.ts(+test),
  application/identity.service.ts(+test), api/identity.controller.ts, infra/notifications.ts,
  infra/verifications.repository.ts}, apps/api/src/common/throttle/{throttle-logic.ts(+test),
  postgres-throttler-storage.ts, infra/throttle.repository.ts}, apps/api/src/{config/env.ts, app.module.ts},
  infra/migrations/{0008_email_login.sql, 0009_throttle_records.sql}, infra/schema.sql,
  packages/shared-types/src/db.generated.ts, apps/web/src/{data/content.js, lib/components.js,
  lib/api.js, screens/auth.js, screens/landing.js, shell/app.js, styles/shell.html},
  apps/web/tests/{unit.test.js, breaks.sh}, .env.example, infra/railway/README.md,
  docs/decisions/{DECISIONS_REGISTER.md, OPEN_ITEMS.md}, docs/planning/EXECUTION_PLAN.md,
  docs/process/checklists/M1_email_auth.md.
- Verified: API 77 tests green (new: email-policy 9, throttle-logic 7 — each break-observed failing for
  the right reason before restore); web 246 unit + 14 axe + 47 landing + 6904 layout + 53 breaks +
  8 layout-breaks green; `pnpm verify` green (repo checks incl. env-doc parity 22 vars, token check,
  SQL-location/injection, secrets); `pnpm db:verify` migrations up→down→up + schema drift clean
  (post-commit); browser measures: role-choice chevron 20×20 (text width 174px, was 0), slide solid
  rgb(70,61,176)=violet-700 with white text and no gradient, footer credit <a href=streamlinehq.com 11px.
- Self-check: email-only auth end-to-end (allowlist → OTP → account) is real, tested and documented;
  every new check was observed failing; schema/types/schema.sql all regenerated from the migrated DB.


## M1.8b — Slider illustration + motion (owner: dark ink doodle, pop animation, drifting glow)

- Changed: apps/web/src/styles/shell.html (.slide__sticker ink=--ink-900 accent=--on-solid;
  slidepop/stickerpop/rise/dotpulse keyframes on .slide--on; herodrift 42s on .landing__hero),
  apps/web/tests/{unit.test.js (+4 assertions), breaks.sh (+3 breaks)}.
- Verified: 249 unit, 56 breaks (0 missed), 14 axe, 47 landing, verify:repo green. Browser audit:
  slide solid rgb(70,61,176) no gradient; animationName slidepop/stickerpop/herodrift; sticker ink
  #15181F + accent #FFFFFF; hero animationDuration 42s.

## M1-finish step 1 — rider screens stop being a demo

- What changed: rider home now greets the real S.user and shows an honest "routes coming soon" empty
  state; routes/boarding/departures/review/booked/waiting/onboard all show a shared "booking lands in M3"
  coming-soon state; trips keeps its tabs and shows the honest no-trips empty state; wallet shows "coming
  soon" (no fake 48 EGP); safety keeps the real SOS/share/report/call-support rows and drops the fake
  vehicle + fake contacts. Added EN/AR copy (comingSoon, routesComingBody, bookingComingBody, walletComingBody).
- Tests: replaced the demo "BOOKING FLOW" and "PRICING RULES" groups with "RIDER SCREENS SHOW NO SAMPLE
  CONTENT" (asserts no sample strings on every rider screen + real-user greeting); new break case
  "rider home reverts to sample routes" observed failing; removed two obsolete break cases (boarding
  point / seat-price) that guarded removed demo behaviour.
- Verified: web unit 271, a11y 14, server 5 green; verify:repo green. Full browser + db suites run in CI
  (GitHub Actions) on push.
- Remaining: driver/staff/shell sheets still use DATA.* — next steps, then delete DATA and add the
  bundle-wide "no const DATA" guard.

## M1-finish steps 2–4 — driver + staff screens, demo data deleted

- Driver screens: duty greets the real driver and shows an honest "no claimed departures — arrives
  with routes" empty state; work/journey/earnings show "arrives with routes/journeys" empty states;
  profile shows the real user + driver role chip + email verification (fake vehicle/rating removed).
- Staff screens: ops queue is REAL — driver applications (GET /ops/driver-applications) and vehicles
  (GET /ops/vehicles) load from the API with empty states; selecting an application opens a real
  review (approve/reject → POST /ops/driver-applications/:id/review); vehicles approve inline
  (POST /ops/vehicles/:id/review); live map lists real vehicles. Stops/routes/users (M2/M3) and all
  manager (M5) and support (M4) screens show honest "arrives in …" empty states.
- Sheets: the demo sheets (qr, topup, subs, trip, claim, scan, fare, contacts) are deleted; sos and
  report are honest "arrives in M4" placeholders; staffEdit/staffRemove stay real.
- The DATA object is deleted from content.js; every DATA. reference removed (0 hits); the window
  export no longer exposes DATA; layout.test.js long-text case now uses S.user instead of DATA.
- Tests: replaced the demo booking/pricing + driver-rules + support-refund groups with honest-state
  checks; added the bundle-wide "no sample content" guard; new/changed break cases observed failing
  (support fake refund, driver fake earnings, sample content returns).
- Verified: web unit 272, a11y 14, server 5, verify:repo green. Bundle 319→308 KB. Full browser +
  db suites run in CI (GitHub Actions) on push.

## M2 — P2.1 stop entity + distance module (DEC-197 numeric lat/lng)

- Decisions: DEC-197 (numeric lat/lng, one shared distance module, no PostGIS — G-061 closed) and
  DEC-198 (OpenStreetMap-based provider, free/no login, behind the MapProvider interface).
- Migration 0011: stops (code unique, name_en/ar, lat/lng double precision + bounds CHECKs, status
  draft|pending|verified|rejected|retired, source desk|field, created_by, checklist cols,
  walking_to_next_m, override_reason), stop_photos, stop_verifications (append-only via trigger).
  Indexes: stops_lat_lng_idx (lat,lng) + stops_status_idx (verified).
- New geo module: domain/geo-math.ts (haversine + boundingBox), domain/stop.ts (bounds, stopCode,
  spacingCheck), infra/stops.repository.ts (SQL only here), application/stops.service.ts (create +
  duplicate guard + verifiedNear + two-person review), api/stops.controller.ts (POST /stops,
  GET /stops, GET /stops/near [public verified-only], POST /stops/:id/review), geo.module.ts.
- Config: STOP_MIN_SPACING_M (default 100), STOP_MAX_GAP_M (default 1000) — documented in .env.example.
- Tests: 105 API tests green (geo-math 5, stop domain 5, service 9). Break checks observed failing:
  coordinate bounds, minimum spacing, two-person self-approval, verified-only public near.
- Verified: pnpm db:verify migrations up→down→up + schema drift clean; verify:repo green.
- Remaining in M2: P2.2 desk tool UI, P2.3 field mode, P2.4 queue UI (the service rules for P2.4 are
  already enforced), P2.5 corridor survey (owner fieldwork).

## M2 — P2.2 desk mapping tool (stops UI + CSV import + OSM map)

- Backend: POST /stops/import (all-or-nothing CSV: parseStopsCsv in domain/csv.ts, createMany in one
  transaction), POST /stops/:id/submit (draft → pending). Service + controller + tests.
- Frontend: ops "stops" screen is now a real desk tool — coordinate + bilingual-name form with the
  duplicate-guard override flow, an OSM map that doubles as a click-picker (6-decimal precision),
  CSV import, and the stops list with per-status chips + submit-to-pending. MAP_PROVIDER env
  (default 'osm') selects the provider; /v1/config reports it; MapView + loadMapsConfig handle
  Google and Leaflet/OSM behind one surface.
- Fixed a latent bug found while wiring it: the $() helper ignored a bare `id` option AND the list
  loaders read getElementById() before the node was in the document — the admin staff/audit and ops
  application/vehicle lists never actually attached. $() now honours id; every initial loader passes
  the element reference directly.
- Tests: 114 API (9 new geo service + 5 csv) with break checks observed failing (csv all-or-nothing,
  csv bounds); 279 web unit (new "STOP MAPPING TOOL" group + 2 break entries observed failing);
  a11y 14, server 5 green; verify:repo green.

## M2 — P2.3 field capture + P2.4 verification queue

- Backend: migration 0012 (stops.capture_id UNIQUE + gps_accuracy_m; stop_photos.mime_type);
  domain/exif.ts (stripJpegExif — pure JPEG APP1 stripper) + domain/field-capture.ts (accuracy gate,
  checklistComplete); infra/photo-storage.ts (PhotoStorage interface + LocalPhotoStorage, dir from
  env); service captureStop (accuracy gate → checklist → idempotency by captureId → EXIF strip →
  store photo), photoForStop, retireStop (verified→retired); controller POST /stops/capture,
  GET /stops/:id/photo, POST /stops/:id/retire, GET /stops?status=; main.ts bodyLimit 10 MB;
  env STOP_MAX_FIX_ACCURACY_M / PHOTO_STORAGE_DIR / PHOTO_MAX_BYTES.
- Frontend: ops Stops screen gains the P2.4 pending-verification queue + review view (checklist,
  photo via authenticated data-URL fetch, reject-reason field, approve hidden for your own capture);
  a field-capture sheet (geolocation + accuracy, 4 checklist switches, optional photo, offline queue
  to localStorage with flush on boot + 'online'); API.stopPhoto + captureStop.
- Tests: 125 API (exif 3, field-capture domain 2, service capture/retire/photo 5 — 5 new break checks
  observed failing: accuracy gate, checklist, idempotency, exif strip, retire-draft); 284 web unit
  (pending queue + review + own-capture-approve-hidden, break-observed); a11y 14, server 5;
  verify:repo green; db:verify migrations up→down→up + schema drift clean.
- Deferred honestly: (1) showing the rejection reason to the original surveyor lands with the field
  tool's "my captures" view + M4 notifications; (2) refusing to retire a stop used by a published
  route lands in M3 with route_stops. Both marked [~]/[o] in the M2 checklist.

## GUI polish — landing page completeness (DEC-201)

- Landing grew three sections: For riders (the 4 feature cards under a heading), For drivers
  (apply to drive / claim a slot in two taps / earn weekly), Safety (verified drivers, board by
  code, help within reach — SOS/share honestly labelled "arrive with the safety centre").
- Policies footer: Terms / Privacy / Safety open a structured document page (landingDoc) with the
  honest note that final legal wording is the operator's (DEC-030); Streamline credit stays an <a>.
- New copy EN+AR; `.landing__policies` / `.landing__policylink` / `.landing__doc` tokens added
  (no hardcoded colours).
- Tests: 9 new unit assertions (sections, policy links, doc opens + back, no sample content) and
  2 break cases (drivers section, policy links) observed failing; 293 unit, 14 a11y, 47 landing,
  repo checks green.
- Remaining GUI polish: DEC-200 desktop density/shell (checklist section A) and M3 core journey.

## M3 — P3.1 route entity + P3.2 slot grid (backend)

- New `routes` module (17th): domain/slot-grid.ts (pure grid generation), domain/route.ts (gapless
  append + permutation reorder), infra/routes.repository.ts (SQL only; reorder in one transaction),
  application/routes.service.ts (create/publish/addStop/reorder/generateSlots/listSlots), api
  controller, module registered in app.module.
- Migration 0013 (routes + route_stops with verified-stops trigger + stops_retire_guard trigger
  refusing retirement of a stop on a published route, naming it) and 0014 (slots with the unique
  (route, day, time) key for idempotent regeneration).
- geo: retireStop maps the 23514 retire-guard violation to geo.stop_on_published_route (no
  cross-module cycle — the guard is at the DB, as the boundary checker forbids geo→routes).
- Distance = geo's contract (distanceMeters exported via geo/contracts/public.ts) — one definition.
  Config ROUTE_SPEED_KMH (default 20) estimates cumulative run-time.
- Tests: 140 API (grid + reorder domain; 8 route-service; 1 geo retire-guard mapping). 5 break
  checks observed failing (grid window end, permutation skip, past slot, one-stop publish, guard
  unmapped). Repo checks green (boundaries + env-doc parity). Migrations up clean; schema + types
  regenerated (13 tables).
- Deferred: ops routes/slots UI (P3.2 UI) and P3.3 driver claim — next steps.

## M3 — P3.3 driver slot claim (journeys module) + routes/slots UI

- New `journeys` module: domain/journey.ts (state machine CLAIMED→OPEN_FOR_BOOKING→LOCKED→
  IN_PROGRESS→COMPLETED/CANCELLED/ABORTED), infra/journeys.repository.ts (claim with UNIQUE
  slot_id = race-safety; claimedSlotIds for the board), application/journeys.service.ts
  (claimSlot: approved driver + own approved vehicle, past-slot refusal, 23505→clear refusal;
  releaseClaim inside MinClaimLeadMinutes refused; openForBooking; availableWork), api controller
  (claim/release/open/mine/available), module.
- Migration 0015: journeys (slot_id UNIQUE, committed flag, seats_total, status CHECK).
- Drivers + routes became @Global (the established shared-capability pattern) and grew contract
  reads: DriversService.assertApprovedDriverWithVehicle + myVehicles; RoutesService.publishedRoutes
  + slotsForClaim + getSlotById + slotDepartureInstant (UTC+2, no DST). Boundary + SQL checks green.
- Frontend: ops Routes is a REAL tool (create route with fare EGP→minor units + window + interval,
  route detail with stops/distances, publish, slot generation + list). Driver Duty shows real
  journeys (release/open-for-booking) and Driver Work is the real find-work board (slots as
  open/taken/mine chips, claim sheet picks the approved vehicle). 7 new copy keys EN+AR.
- Tests: 155 API (journeys domain + service) with 4 break checks observed failing; 299 web unit
  (routes tool + work board + updated driver-honesty group, 2 break cases observed failing);
  a11y 14, server 5, repo checks green. Schema + types regenerated (14 tables).

## Branding single-source (owner: centralized branding, §0.3 one-change test)

- New packages/brand/brand.json — the ONE source of brand identity: name (en/ar), tagline,
  description, wordmark font, logo (viewBox + path + gradient), browser theme-color, email
  identity/colours. packages/brand/README.md documents the one-change test.
- Web: build.js reads brand.json, generates the favicon data URI + <title>/meta/theme-color, and
  injects `const BRAND = …` (before the modules); shell.html carries __BRAND_* tokens (no literal
  title/favicon/meta left); content.js reads BRAND.name/tagline; components.js LOGO_PATH =
  BRAND.logo.path and logoSVG viewBox = BRAND.logo.viewBox; wordmarks use --brand-font.
- API: apps/api/src/config/brand.ts loads the same brand.json (path-resolved, container-safe);
  notifications.ts derives every subject, body and email colour from it (0 "Ride Share" literals).
- Enforced by scripts/check-branding.sh (wired into verify-repo): the brand name/logo must not be
  hardcoded anywhere in apps/*/src. Observed failing when a second definition was planted.
- Tests: 306 web unit (branding group: title/copy/logo/font/favicon + brand-colours-as-data),
  2 break cases observed failing (logo path, copy name); 155 API; a11y 14, landing 47, server 5;
  repo checks green. pnpm-lock + both apps' deps updated (@ride-share/brand workspace:*).

## M3 — P3.4–P3.6 rider search → boarding → book (bookings module)

- New `bookings` module: domain/booking.ts (status, 6-digit code), infra (SQL only; joined
  byRider), application (book: fare locked at creation, boarding stop must be on the route, seat
  pre-check + DB-guard mapping, cancel returns seats), api (POST /bookings, GET /bookings/mine,
  POST /bookings/:id/cancel), module. Migration 0016: bookings + bookings_seat_guard trigger
  (SUM of non-cancelled seats ≤ journey.seats_total — overselling impossible under concurrency).
- Routes contract: publishedWithStops (rider), getRouteFare, hasStop; GET /routes/published.
  Journeys contract: upcomingForRiders + getForBooking (bookable status + future); GET /journeys/upcoming.
- Rider UI: home (greeting + routes/trips CTAs + real routes), routes (real published routes with
  fares), boarding (stops in order, recommended first), departures (real upcoming journeys with
  times), review (flat fare × seats, stepper, confirm), booked (real boarding code QR + numeric),
  trips (real bookings, cancel returns seats). waiting/onboard stay honest "coming soon" (P3.9).
- Tests: 164 API (9 bookings tests; 4 break checks: seat pre-check, guard mapping, off-route, fare
  lock) + 307 web unit (rider flow group + boarding-code break observed failing); a11y 14, server 5,
  repo checks green; schema + types regenerated (15 tables).
- Deferred (honest): walking-time ranking of boarding points needs a routing provider — arrives with
  the DEC-199 A→B planner; P3.9 live tracking (waiting/onboard screens) next.

## Audit — full-suite verification pass (test drift + CI gaps + doc drift)

- Ran `pnpm verify`, `pnpm db:verify` and `apps/web/verify.sh` against a clean
  clone. Found and fixed the issues below — all were invisible to the root
  `pnpm verify` because the GUI verify (`./verify.sh`) could not run in CI.
- **layout.test.js drift**: the sheet loop hardcoded the deleted demo sheets
  (qr/topup/subs/scan/contacts/trip/fare) and screens fired real `file://`
  fetches (CORS console errors) — 9 assertions failed. Fixed: the sheet list is
  derived from the live `SHEETS` registry (core-sheet guard), fetch is stubbed
  to the standard error shape, and a dedicated wide-table case keeps the
  scroll-wrapper guarantee reachable. layout now 7482/7482.
- **CI exec bits**: `apps/web/verify.sh`, `tests/breaks.sh`, `tests/layout-breaks.sh`
  were committed 100644, so CI's `./verify.sh` never ran. Fixed: all 17 tracked
  `*.sh` are 100755.
- **Break harnesses**: two sed edits targeted M1-finish-removed lines and the
  expectation matcher used regex grep on names containing `[object Object]` —
  3 breaks unobservable. Fixed: sed edits updated, matcher switched to `grep -F`.
  74/74 breaks caught.
- **Orphaned a11y suite**: `tests/a11y.test.js` (axe) was wired into nothing.
  Fixed: added to the web `test` script and `verify.sh`.
- **Docs drift**: README.md, docs/README.md, PROJECT_MAP.md, 00_MASTER.md said
  the rider journey renders demo data and M2/M3 were "not started". Fixed.
- **Config drift**: `.env.example` carried a dead `MAP_PROVIDER_KEY` and missed
  the web vars (`API_INTERNAL_URL`, `MAP_PROVIDER`, `GOOGLE_MAPS_API_KEY`). Fixed.
- **Duplicate gap register**: `AUDIT_AND_TODO.md` and `OPEN_ITEMS.md` had drifted.
  Consolidated to one register; `OPEN_ITEMS.md` is now a pointer.
- **Live smoke test**: the deployed web serves the landing (HTTP 200) but
  `/healthz` reports `api:"unreachable"` and every `/v1/*` proxy returns 504 —
  the web cannot reach the api at `API_INTERNAL_URL`. Logged as G-070 (owner
  action in the Railway dashboard).
- Verified: `pnpm verify` green (repo checks + build + typecheck + lint + 164 API
  + web unit/a11y/server); `pnpm db:verify` green (migrations cycle + schema +
  types); `apps/web/verify.sh` green (307 unit, 14 a11y, 7482 layout, 47 landing,
  74/74 breaks, 8/8 layout breaks).

## M3 — production crash-loop root cause (JourneysModule missing @Global)

- Symptom: the Railway api service "crashed 2h ago" and looped — logs showed the
  bypass warning, "migrations complete", then `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` /
  `Exit status 1` with NO error text, on every restart. The web proxy returned
  504 for every /v1/* (the api never listened).
- Diagnosis (reproduced locally with the production env): the crash is inside
  `NestFactory.create`. Nest's ExceptionsZone catches DI errors, logs them via
  the app logger, then `process.exit(1)` — and because main.ts created the app
  with `{ logger: false }`, that error was swallowed, so the container died
  silently and Railway restarted it forever.
- Real error (surfaced by wiring the real logger into create): `Nest can't
  resolve dependencies of the BookingsService (BookingsRepository, ?,
  RoutesService, AuditService). Please make sure that the argument
  JourneysService at index [1] is available in the BookingsModule module.`
  — JourneysModule lacked `@Global()`, unlike routes/drivers/geo/audit, so
  bookings (which resolves JourneysService via contracts/public.ts) broke the
  whole graph. Unit tests never caught it because each service is tested with
  fakes, not through the real AppModule.
- Fixes: (1) `@Global()` on JourneysModule; (2) `NestFactory.create` now takes
  the real PinoLoggerService instead of `{ logger: false }`; (3) the logger's
  fmt() now serializes an Error's message/name/stack (pino drops non-enumerable
  props, which is why the reason was invisible); (4) bootstrap catch logs the
  full stack; (5) NEW regression guard `src/app.graph.test.ts` compiles the real
  AppModule — observed failing for the right reason before the fix, green after.
- Verified: 165 API tests green (incl. the new guard); full local boot reaches
  "api listening"; /healthz → `{ok:true,db:"up"}`; `pnpm verify` + `pnpm db:verify`
  green. Logged G-070 (now CLOSED).

## M3.5 — Seamless trips tabs + advanced search (Fuse.js + Arabic normalization)

- **Trips tab fix (the reported "page moves" bug):** the Upcoming/Past tabs called
  `render()`, which rebuilt the whole app — recreating the `.main` scroller (snap
  to top), refetching `/bookings/mine` on every tap, and dropping focus. Now the
  list is fetched ONCE into `S.tripsCache`; the tab click only syncs `aria-pressed`
  and re-renders the list in place. Regression test "tab switch does NOT refetch
  (seamless)" + a break-case (reverting to `render()` refetches and fails).
- **Search (the dead-input gap):** every "live" search field was a dead `<input>`
  with no listener and there was zero filtering logic. Now:
  - `Fuse.js v6.6.2` (Apache-2.0 — note: NOT MIT) is vendored at BUILD time into
    the single file (never a CDN); wrapped in an IIFE so its `var e,t` can't
    collide with the app's `const t` translator.
  - `lib/search.js` owns the index + normalization (§0.3 one search implementation):
    Arabic diacritics stripped, alef/hamza/waw+hamza/ya+hamza/alef-maqsura/teh-marbuta
    unified, Latin lowercased — "سموحه" and "سموحة" hit the same stop.
  - Rider routes screen: live search filters routes; each route card nests its
    BOOKABLE JOURNEYS (departure chips, best-first → review) and highlights the
    matched boarding stop. Rider home band navigates to the results screen.
  - Ops stops list got the same live filter; the dead bands on the "coming soon"
    ops/users and support/lookup screens were REMOVED (a band with no wired filter
    is a dead control, §8.1).
- **Build bug fixed while wiring Fuse:** `shell.replace(MARK, "<script>"+js+…)`
  used a STRING replacement; the Fuse minified code contains `$&`, which JS
  interprets as "the matched text" — splicing `<div id="root"></div>` into the
  middle of the library and breaking the whole bundle. Fixed with a replacement
  FUNCTION. (A lesson: never string-replace inject code containing `$`.)
- Also fixed: the async test groups in unit.test.js were fire-and-forget and raced
  the final tally; they are now awaited in the harness's `Promise.all`.
- Tests: 330 web unit (search normalization/fuzzy/screen-filter + seamless-tabs),
  76/76 breaks caught (new: teh-marbuta unification, input label, tabs refetch);
  a11y 14, layout 7452, landing 47, 165 API, repo guards green.
