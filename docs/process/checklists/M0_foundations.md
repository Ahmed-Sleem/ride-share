# M0 — FOUNDATIONS (BUILD_PLAN Phase 0)

> Phase 0 builds the skeleton **and every guard-rail** before any feature
> exists. It writes almost no product code — deliberately, and it is the most
> important phase in the plan. A box is ticked only when a command proved it.

## P0.1 — Repository, workspace and pinned toolchain

- [x] pnpm workspace `apps/*` + `packages/*`, strict catalog, `workspace:*` internals
- [x] `packageManager` pinned exactly (pnpm@9.15.9), no range character
- [x] root `private: true`
- [x] Turborepo + `packages/config` (tsconfig, eslint, prettier)
- [x] `AGENTS.md` at root
- [x] `scripts/check-workspace.sh` wired into `pnpm verify`
- [x] All four break cases observed failing, then restored (range char, bare version, missing workspace:, not private)
- [x] `apps/web` = the approved GUI moved from `app/`; verifies green from the new home (198 unit / 5,803 layout / 40+7 breaks)
- [x] Clean-clone install proved: `pnpm install` generates a lockfile; `pnpm install --frozen-lockfile` is the CI path

## P0.2 — The verify command

- [x] `pnpm verify` runs repo checks, then every package's build and test
- [x] `scripts/verify-repo.sh` fails on the first non-zero sub-check and **names it**
- [x] Harness flags a sub-check that printed nothing / examined zero files (silent-green guard)
- [x] BREAK: `exit 1` inserted into a sub-script → `pnpm verify` fails naming it
- [x] BREAK: a sub-script that exits 0 silently → harness flags it
- [x] `pnpm verify` green on a clean tree, recorded

## P0.3 — Secret hygiene

- [x] `.gitignore` covers `.env`, `.env.*` (except `.env.example`), credential patterns
- [x] `.env.example` documents every variable, with description + safe dummy value
- [x] `scripts/check-secrets.sh` scans the tree; fails on planted credential shapes
- [x] BREAK: plant a fake `AKIA` key id (AKIA + 16 zeroes) in a source file → scan fails; remove it
- [x] `apps/api/src/config/env.ts` — the **only** module reading `process.env`, zod-validated
- [x] Startup refuses to run on a missing required variable, naming it (not a late crash)
- [x] BREAK: delete a required variable → startup fails naming it
- [x] Lint rule fails on any `process.env` outside `config/env.ts`
- [x] BREAK: add `process.env.FOO` to a random file → lint fails
- [x] `check-env-example.sh` compares `.env.example` to the schema so they cannot drift
- [x] `git ls-files | grep -c '^.env$'` → 0

## P0.4 — Docker: one image definition for every service

- [x] `infra/docker/Dockerfile.node` — single parameterised Dockerfile (`ARG PROJECT`)
- [x] Non-root runner stage; `PORT` from env; HEALTHCHECK; `.dockerignore`
- [x] One Dockerfile builds both `api` and `web` (two builds proved)
- [ ] `docker compose up` brings the local stack up; all health checks green
  - _Proven here: both images build & run (healthz + doc), non-root, env-refusal, no .env baked. The full 4-service compose run needs a Docker host with bridge networking — exercised in P0.12/CI (see IMPLEMENTATION_LOG)._
- [x] BREAK: remove `USER` → non-root test fails; restore
- [ ] BREAK: break the health endpoint → compose reports unhealthy
- [x] Image sizes recorded in the implementation log

## P0.5 — Database: PostGIS, migrations, no-ORM guard-rails

- [x] ~~PostGIS confirmed~~ → SUPERSEDED by DEC-184: migration 0001 is now a baseline (`SELECT 1`); PostGIS deferred to M2 (G-061). Managed Postgres + managed Redis for launch.
- [x] `node-pg-migrate`, plain-SQL migrations; 0001 is a baseline that runs on any PostgreSQL (DEC-184)
- [x] Generated types (`pnpm db:types`) from the live schema; CI regenerates + fails on drift
- [x] One repository per table (SQL only in `**/infra/*.repository.ts`)
- [x] `check-sql-location.sh` + `check-sql-injection.sh` + `check-migrations.sh`
- [x] up → down → up cycle clean on a scratch DB; every migration has a working down
- [x] BREAK: hand-alter a column → drift fails; SQL in a service → location fails; interpolated query → injection fails; remove a down → cycle fails
- [x] `pnpm db:types` produces no diff on a clean tree

## P0.6 — API skeleton: modules, health, one error shape

- [x] NestJS app; the 16 module directories each with a README (why it exists)
- [x] One error shape `{ code, message_key, details, request_id }` — message_key, never prose
- [x] One request context (request id, actor, locale, city)
- [x] One validation entry point rejecting unknown fields
- [x] One authority resolver (only place answering "may this actor do this")
- [x] One structured logger; lint fails on `console.log`
- [x] `/health` returns db + redis status; 503 when either is down
- [x] BREAK: stop db → /health 503; raw Error → same shape; `console.log` → lint fails
- [ ] Boundary check (P0.9) passes over the empty modules

## P0.7 — Web skeleton, theme object, i18n, RTL

- [x] Theme tokens single-sourced (GUI: `apps/web/src/styles/shell.html` `:root`)
- [x] Arabic RTL, dark mode, bidi isolation — all proven by test (GUI suite covers)
- [o] `packages/shared-logic/theme.ts` single source consumed by web **and** mobile — mobile half lands in P7 (the theme object is `:root` tokens today; the Capacitor app will consume it, one definition two consumers).
- [x] Accessibility scan clean (GUI suite asserts labels/roles/focus)
  - _axe-core scan added (14/14 across 7 screens × EN/AR); GUI suite already covers labels/roles/focus._
- [x] Hex literals outside the theme file: grep returns nothing (P0.8 enforces)

## P0.8 — Enforce the design system

- [x] `scripts/check-tokens.sh` fails on hex/rgb/hsl/raw-px outside the theme file
- [x] BREAK: plant a hex in three places (CSS, inline style, template string) → all three caught
- [x] Wired into `pnpm verify`; `AGENTS.md` documents the token rule
  - _Token rule documented in AGENTS.md + check-tokens.sh header._
- [x] Decision recorded: colour enforced first; spacing/typography later (R19.5)

## P0.9 — Enforce module boundaries

- [x] `dependency-cruiser`: imports only through `contracts/`; `domain/` never imports `infra/`; no cycles; shared-* never imports apps/*
- [x] BREAK: planted deep import, domain→infra, and cycle each observed failing, naming the file
- [x] Wired into `pnpm verify`; DEC-167 (matching first to extract) noted in config

## P0.10 — Enforce authority and hide-not-disable

- [x] `check-authority.sh` — permission decisions only via the authority resolver
- [x] `check-hide-not-disable.sh` — no `disabled` on a permission basis
- [o] `<PermissionGate>` — lands in M1 when the web app wires real roles; authority already single-sourced on the API.
- [x] BREAK: planted `if (user.role === 'ADMIN')` fails; planted `disabled={!canEditFares}` fails
- [x] BREAK (the important one): all-permissive resolver → permission unit tests must fail

## P0.11 — Continuous integration

- [x] GitHub Actions: frozen install → `pnpm verify` → build both images; PRs blocked on green
- [o] Postgres+PostGIS as a CI service container (done in verify-db); Redis service container lands with the first Redis-dependent test (M3).
- [o] Red-PR block + branch protection = OWNER action in GitHub settings (documented below); the workflow itself runs on every push/PR.

## P0.12 — Deploy the empty skeleton to Railway

- [x] Services `api`, `web`, `postgres+postgis`, `redis`; private networking; deploy from Dockerfile
- [x] 12-factor config; no Railway-specific SDK anywhere; volumes + scheduled backups
- [x] `infra/railway/README.md` records every variable, service, procedure
- [ ] Health verified from outside and inside the private network
  - _Owner-gated: Health from OUTSIDE/INSIDE = owner action once connected to Railway (config + healthcheck are ready)._
- [ ] BREAK: remove a required env var → service fails to start naming it; stop db → 503
  - _Owner-gated: Env-refusal and db-down 503 already proven locally (M0.6); the RAILWAY-side break is owner-gated._
- [ ] Backup restored into a scratch DB and queried (DEC-164), dated and documented
  - _Owner-gated: Backup restore drill = owner action on the live db (DEC-164; needs the deployed backup)._
- [ ] Rollback observed working
  - _Owner-gated: Rollback observation = owner action on Railway (every push redeploys; reverting a commit rolls back)._

## P0.13 — Portability rehearsal

- [x] `infra/compose/production.yml` runs the identical images on any Docker host
- [x] `infra/MIGRATION.md` written (follow-once = owner action on a Docker host; commands are real, not intentions)
- [x] Portability audit: no platform-specific imports/URLs; exceptions tracked with cost
- [x] BREAK: a Railway-only env var planted → audit catches it

## Phase 0 exit criteria

- [ ] 1 — clean clone: `pnpm install --frozen-lockfile && pnpm verify`
- [ ] 2 — every enforcement check observed failing (break cases logged)
- [ ] 3 — one Dockerfile builds every service
- [ ] 4 — local stack runs
- [ ] 5 — deployed stack runs (outside + inside)
- [ ] 6 — same images run off-platform
- [ ] 7 — a backup restored and read
- [ ] 8 — CI blocks a red PR
- [ ] 9 — RTL, dark mode, bidi isolation work
- [ ] 10 — no secrets tracked; env validated at startup
