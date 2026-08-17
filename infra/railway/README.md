# Railway deployment

## Services

| Service | Image / source | Public? | Health |
|---|---|---|---|
| `api` | `infra/docker/Dockerfile.node` (PROJECT=api) | yes | `GET /healthz` |
| `web` | `infra/docker/Dockerfile.node` (PROJECT=web) | yes | `GET /healthz` |
| `db` | `postgis/postgis:16-3.4` + volume | no (private) | `pg_isready` |
| `redis` | `redis:7-alpine` | no (private) | `redis-cli ping` |

- `api` ↔ `db` and `api` ↔ `redis` talk over Railway's private network;
  only `api` and `web` are publicly reachable.
- Deploy from the **Dockerfile**, not a buildpack — the platform receives a
  container (portability; see `../MIGRATION.md`).
- All configuration is environment variables (12-factor). No Railway SDK on
  any code path. `.env.example` documents every name; values live only in
  Railway variables.

## Variables (names only — values are secrets)

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | api, web | assigned by Railway; never hardcoded in the image |
| `DATABASE_URL` | api | PostGIS connection |
| `REDIS_URL` | api | Redis connection |
| `JWT_SECRET` | api | token signing (≥32 chars) |
| `NODE_ENV` | api | `production` |
| `LOG_LEVEL` | api | structured-log level |

## Platform facts (from R19.1 — operational risks, not inconveniences)

1. Railway's database templates are **unmanaged** — backup, recovery, tuning
   and monitoring are our responsibility. The monthly restore drill (DEC-164)
   is the only thing between the ledger and permanent loss.
2. **A hard spending limit can take workloads offline.** Configure limits and
   alerting deliberately, with a stated threshold, before it surprises you.

## Procedure (owner actions)

1. Create a Railway project and **Connect Repo** → `Ahmed-Sleem/ride-share`.
2. Add services: `api` and `web` (source = repo; Dockerfile detected),
   `db` (postgis/postgis:16 image + volume), `redis` (redis:7-alpine).
3. Set the variables above on `api`; `PORT` on `web`.
4. Every push to `main` rebuilds and redeploys.
