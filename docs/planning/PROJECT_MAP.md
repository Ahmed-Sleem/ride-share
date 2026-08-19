# PROJECT MAP — Ride Share

> One page that answers "what is here, what is real, what is left". Read this
> first if you are picking the project up. It is a map, not a tutorial — the
> tutorial is [README.md](../../README.md) and [docs/README.md](../README.md).

## What the product is

Shared rides on **fixed routes at a fixed price**. Alexandria first, any city
via configuration. A rider boards at a published stop, books a seat for a
published departure, pays one flat fare, and gets off anywhere along the line.
Full product definition: `docs/specification/MASTER_SPECIFICATION.md`.

## The stack (all pinned in `pnpm-workspace.yaml`)

| Piece | Tech | Why |
|---|---|---|
| Frontend | One self-contained HTML file assembled by `apps/web/build.js` — no framework, no CDN, system fonts | DEC-181: the approved single-file GUI is the real web client |
| Backend | NestJS 11 + Fastify, modular monolith (16 module dirs) | DEC-069 |
| Data | PostgreSQL **only** (no Redis, no ORM). Migrations via node-pg-migrate; SQL only inside `**/infra/*.repository.ts`; schema → generated TS types | DEC-186, DEC-170 |
| Deploy | Railway (web + api services, managed Postgres), Docker `infra/docker/Dockerfile.node` | DEC-183/191 |
| Auth | Email + password. scrypt-hashed passwords, JWT (jose), hashed refresh tokens, 6-digit email OTP (hashed at rest, 60s cooldown, 3 tries → 1h lockout), env-seeded "system admin" | DEC-189/192/196 |

## What is REAL (wired end-to-end, tested) vs SKELETON

### Real — backend (`apps/api/src/modules/`)
- **identity** — users, email sign-up/sign-in (allowlist + `AUTH_OTP_BYPASS`),
  verification/recovery, staff CRUD, the protected system admin, sessions.
- **drivers** — driver application → ops approval state machine; vehicle
  registry + approval.
- **audit** — append-only audit log (`POST /admin/audit`).
- **health** — `/health` and `/healthz` (503 when DB down, fast).
- Cross-cutting: `common/throttle` (PostgreSQL-backed rate limiting),
  `security/` (authority resolver + JWT guard), `config/` (env, PG pool).

### Real — frontend (`apps/web/src/screens/`)
- **landing** — hero slideshow, how-it-works, feature cards, linked credits.
- **auth** — email sign-in/sign-up (smart auto-detect), OTP boxes, password
  eye, resend countdown, lockout, forgot-password — all wired to the API.
- **admin** — staff management (create/edit/remove, system-admin protection)
  and audit log — real API data.
- **profile** — real `S.user` + email verification (riders and staff).

### Skeleton — module dirs with only README/contracts, no endpoints yet
`analytics`, `bookings`, `config`, `geo`, `journeys`, `matching`,
`notifications`, `payments` (contracts only), `pricing`, `promotions`,
`requests`, `support`, `vehicles`. These land in M2–M5.

### NOT REAL YET — the demo content
`apps/web/src/data/content.js` still ships a `DATA` object of sample
routes/trips/wallet/etc. The rider **home/trips/wallet/duty/ops/manager
screens** render that sample data. Removing it and wiring those screens to
the API with honest empty states is **M1-finish** (next work — checklist in
`docs/process/checklists/M1_finish_demo.md`).

## The verification machinery (why the repo is trustworthy)

- `pnpm verify` = repo guard scripts + every package's build/typecheck/lint/test.
- `pnpm db:verify` = migrations up → down → up on a scratch DB + schema-drift
  compare + generated-type drift check (needs a Postgres `DATABASE_URL`).
- `apps/web/tests/` = unit (jsdom), a11y (axe), layout + landing (puppeteer,
  real browser), `breaks.sh` / `layout-breaks.sh` (§0.2: every check is
  deliberately broken once and observed failing).
- Repo guard scripts (`scripts/`): secrets, env-doc parity, SQL location +
  injection, design tokens, authority-in-one-place, module boundaries,
  hide-not-disable, workspace pins.

## Env (names only — values are the owner's)

Documented in `.env.example` (kept in lock-step by `check-env-example.sh`):
`DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `SMTP_*`,
`EMAIL_FROM`, `EMAIL_ALLOWED_DOMAINS`, `AUTH_OTP_BYPASS`, `CORS_ORIGINS`,
`THROTTLE_*`, `AUTO_MIGRATE`, `PAYMOB_*`, `GOOGLE_MAPS_API_KEY`,
`API_INTERNAL_URL` (web only).

## Where the work stands (milestones)

`docs/process/checklists/00_MASTER.md` is the index. Summary:

| Milestone | State |
|---|---|
| M0 foundations | Done — deployed on Railway |
| M1 identity/auth/landing | Backend + auth + landing done; **demo-data removal (M1-finish) is next** |
| M2 geography | Not started (decide PostGIS vs lat/lng — G-061) |
| M3 routes/slots/booking/payment | Not started |
| M4 safety · M5 commercial · M6 subscriptions · M7 APK · M8 launch | Not started |

## Rules before you touch code

`docs/process/ENGINEERING_STANDARD.md` (binding), `GUI_STANDARD.md`,
`REPOSITORY_STANDARD.md`, `PROJECT_RULES.md` (every open decision is an MCQ to
the owner). The four that bite most often:

1. **§0.2** a check that cannot fail is not a check — break every new check once.
2. **§0.3** one definition of everything — tokens in `shell.html` :root, SQL
   only in repositories, authority only in `security/authority/`.
3. **§8.1** never offer what will be refused — hide, don't disable.
4. **§8.2** authority is decided in one place.
