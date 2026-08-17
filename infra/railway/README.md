# Railway deployment

## Architecture (DEC-184 — updated for the free trial)

Production runs on Railway's **managed databases** (automatic backups, no
containers to run), not self-hosted image services:

| Service | What | Source |
|---|---|---|
| `api` | NestJS backend | the repo (Dockerfile) |
| `web` | the interface | the repo (Dockerfile) |
| `Postgres` | managed PostgreSQL | **+ New → Database → PostgreSQL** |
| `Redis` | managed Redis | **+ New → Database → Redis** |

**PostGIS is deferred** (DEC-184): Railway's managed PostgreSQL does not ship
PostGIS, and no geo feature exists yet (zero domain tables). Migration 0001 is
a baseline that runs anywhere. Geo returns at M2 — either a PostGIS-capable
host (once off the trial) or numeric lat/lng + OSRM/geocoder.

## Exact click-path

1. **railway.com → New Project → New Service → GitHub Repo** → authorize
   Railway → choose `Ahmed-Sleem/ride-share`.
2. Railway auto-imports one service per app it finds. **Delete `mobile`**
   (empty Phase-7 placeholder — it will fail to build). Keep `api` and `web`.
3. **Add the databases** (these are allowed on the free trial — they are
   database plugins, not Docker-image services):
   - **+ New → Database → PostgreSQL** — this is the `Postgres` service.
   - **+ New → Database → Redis** — this is the `Redis` service.
4. Configure services (see blocks below).
5. Deploy order: databases first, then `api`, then `web`.

## Copy-paste variable blocks (Raw Editor)

`${{Service.VAR}}` references another service and stays in sync.

**`api`** (from the repo):

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=9aa8b56fdffc9833e440a0dd2f2801b7779faa57116c0f954b3f62e958528bd8
CORS_ORIGINS=
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

- `DATABASE_URL` / `REDIS_URL` are reference variables — no credentials pasted.
  The service name in the reference must match what Railway names the database
  service (default: `Postgres` / `Redis`).
- `JWT_SECRET`: the value above is pre-generated; treat it as a secret.
- `CORS_ORIGINS` starts empty (allow all + a log warning); set it to the web
  service's public domain once it has one.
- Leave `PAYMOB_*` unset until M3.

**`web`** (from the repo):

```
PORT=8080
```

**`Postgres`** and **`Redis`**: no variables needed — Railway provisions
credentials and exposes `DATABASE_URL` / `REDIS_URL` automatically.

## Service settings

| Service | Healthcheck path | Timeout | Networking |
|---|---|---|---|
| `api` | `/healthz` | 120 | private (no public domain needed) |
| `web` | `/healthz` | 120 | **Generate Domain** (public URL) |
| `Postgres` | — (managed) | — | private |
| `Redis` | — (managed) | — | private |

## Platform facts (R19.1 — operational risks, not inconveniences)

1. **Managed Postgres gives automatic backups** — but the restore drill
   (DEC-164) still must be *performed*, not assumed: restore a backup into a
   scratch database and query it.
2. **A hard spending limit can take workloads offline.** Configure limits and
   alerting deliberately, with a stated threshold.

## Migration off Railway

See `../MIGRATION.md` — the same images run on any Docker host.
