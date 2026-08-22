# Ride Share

**Shared rides on fixed routes at a fixed price.**

## Why

Microbuses already move most of Alexandria. They are cheap and they go where
people go, but you cannot know when one leaves, whether there will be a seat,
or what you will be asked to pay. Ride-hailing solves those problems and costs
several times more.

This is the middle: published routes, published departure times, one fare per
route however far you ride, and a seat you booked before you left the house.
A rider boards at a fixed stop and gets off anywhere along the line.

## What works today

The live app is at **https://ride-shareweb-production.up.railway.app**.

- **Accounts** — riders self-register with email (+ password, + email OTP).
  Temporary-mail domains are rejected; one email = one account. Staff accounts
  are created by the env-seeded system admin only.
- **Sign-in** — one field; the system auto-detects email+password (staff and
  riders) vs email+code. Password reset and email verification included.
- **Staff administration** — the system admin creates, edits and removes
  operations/manager/support staff, and views the append-only audit log.
- **Drivers & vehicles** — apply-to-drive and vehicle registry with an
  operations approval queue (state machine).
- **Stops (M2)** — a desk mapping tool (coordinate/bilingual form, OSM
  click-to-place map, CSV import), a field-capture flow (accuracy gate,
  checklist, EXIF-stripped photo, offline queue), and a two-person
  verification queue.
- **Routes, slots & the booking flow (M3, first vertical slice)** — operators
  create and publish routes and generate the slot grid; drivers claim a slot
  in two taps; riders pick a route → boarding stop → departure → book a seat
  (fare locked at booking, no overselling) and get a boarding code.
- **Landing page** — hero slideshow, how-it-works, for-riders/for-drivers,
  policies, bilingual (EN/AR, RTL), light/dark themes, adaptive from 320px to
  2560px.

Not yet built: wallet/ledger and cash collection, the driver manifest and
boarding-code scan, the live-journey screens, the A→B planner, and everything
in M4–M8 — see [docs/planning/PROJECT_MAP.md](docs/planning/PROJECT_MAP.md)
and the [M3 checklist](docs/process/checklists/M3_core_journey.md).

## Architecture

A pnpm monorepo. The interface is a **single self-contained HTML file** with no
framework and no runtime dependencies; the backend is a **NestJS modular
monolith** with **PostgreSQL as the only stateful service** (no Redis, no ORM —
SQL lives only in `**/infra/*.repository.ts`).

```
apps/web/       the interface — assembled from src/ by build.js into one file
apps/api/       the backend — NestJS + Fastify, a modular monolith (17 module dirs)
apps/mobile/    Capacitor wrapper (planned, BUILD_PLAN P7)
packages/       shared types (schema-generated) + toolchain config + brand source
infra/          migrations, Dockerfile, docker-compose, Railway config
scripts/        the enforcement scripts behind `pnpm verify`
docs/           specification, decisions, build plan, project map, process rules
```

Read the project map ([docs/planning/PROJECT_MAP.md](docs/planning/PROJECT_MAP.md))
and the onboarding notes ([docs/README.md](docs/README.md)) before starting.

## Requirements

- Node.js 20+
- pnpm 9.15.9 (pinned by `packageManager`)
- PostgreSQL 16+ (any install; Docker is optional)

## Quick start (local)

```bash
git clone <repo-url>
cd ride-share
pnpm install
cp .env.example .env        # fill in DATABASE_URL + JWT_SECRET at minimum
pnpm migrate up             # apply infra/migrations to your database
```

Run the API:

```bash
pnpm --filter @ride-share/api build && pnpm --filter @ride-share/api start
# http://localhost:3000/healthz
```

Run the web (proxies /v1/* to the API):

```bash
API_INTERNAL_URL=http://localhost:3000 PORT=8080 \
  node apps/web/server.js
# http://localhost:8080
```

Or everything as containers:

```bash
docker compose up --build
# web: http://localhost:8080 · api: http://localhost:3000
```

## Configuration

Variable names only (values are environment-specific). The full list is in
`.env.example`; a few worth knowing:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | api | PostgreSQL connection |
| `JWT_SECRET` | api | token signing (≥32 chars) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | api | the ONE seeded system admin |
| `SMTP_HOST/PORT/SECURE/USER/PASS`, `EMAIL_FROM` | api | email codes (any SMTP; Resend works) |
| `AUTH_OTP_BYPASS` | api | `true` = skip email-OTP for testing |
| `EMAIL_ALLOWED_DOMAINS` | api | extra allowed email domains |
| `API_INTERNAL_URL` | web | `http://<api private host>:3000` |

## Verification

```bash
pnpm verify                        # repo guards + build + typecheck + lint + every test
pnpm --filter @ride-share/web verify   # + full browser suite (a11y, layout, landing, breaks)
pnpm db:verify                     # migrations up→down→up + schema drift + types (needs DATABASE_URL)
```

The test suite deliberately breaks every check once and observes it fail
(§0.2) — a green suite means the checks actually work, not just that they run.
The break harnesses live in `apps/web/tests/breaks.sh` and
`apps/web/tests/layout-breaks.sh`.

## Status

| Area | State |
|---|---|
| Foundations, deploy pipeline, guard-rails | Done |
| Identity, auth, accounts, staff, drivers/vehicles, landing | Done |
| Geography — stops, mapping tool, field capture, verification | Done except the corridor survey (owner fieldwork) |
| **Routes, slots, driver claim, rider booking (M3 P3.1–P3.6)** | **Done** |
| **Wallet/ledger, manifest + scan, live journey (M3 P3.7–P3.9)** | **In progress** |
| A→B planner, desktop density | Planned (DEC-199, DEC-200) |
| Safety, commercial, subscriptions, APK, launch | Not started — M4–M8 |

The product name is provisional and no trademark search has been done.

## License

MIT — see [LICENSE](LICENSE).
