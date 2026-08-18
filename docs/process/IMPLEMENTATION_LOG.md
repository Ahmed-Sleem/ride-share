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
