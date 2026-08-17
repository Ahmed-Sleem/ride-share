# Railway deployment

## The right way to start

Railway's built-in **"Add PostgreSQL" plugin is managed Postgres WITHOUT
PostGIS** — and our schema enables PostGIS in migration 0001 (P0.5). So the
database service is the **`postgis/postgis:16-3.4` Docker image with a
volume**, not the managed plugin. (Recorded as R19.2 in BUILD_PLAN P0.5.)

## Exact click-path (owner actions, ~5 minutes)

1. **railway.com → New Project** (or open your project).
2. **Connect the repo:** project → `New Service` → **GitHub Repo** →
   authorize Railway for GitHub → choose **`Ahmed-Sleem/ride-share`**.
   Railway auto-detects `infra/docker/Dockerfile.node` and `railway.toml`.
3. Add services:

   | Service | Source |
   |---|---|
   | `api` | the repo (Dockerfile detected); set variables below |
   | `web` | the repo (Dockerfile detected); set `PORT=8080` |
   | `db` | Docker image **`postgis/postgis:16-3.4`** + a **volume**; set `POSTGRES_USER=ride`, `POSTGRES_PASSWORD=…`, `POSTGRES_DB=rideshare` |
   | `redis` | Docker image **`redis:7-alpine`** |

4. Set `api` variables (values are secrets — only in Railway, never the repo):
   `DATABASE_URL` (from the db service's private URL), `REDIS_URL`,
   `JWT_SECRET` (≥32 chars), `NODE_ENV=production`, `CORS_ORIGINS`.
5. **Networking:** keep `db` and `redis` private; expose `api` and `web`
   publicly (Railway's default for services with a healthcheck).
6. Every push to `main` rebuilds and redeploys.

## Copy-paste variable blocks (Raw Editor)

Railway's **Raw Editor** accepts one `KEY=VALUE` per line. `${{Service.VAR}}`
references another service (stays in sync). Service names below must match
yours (`db`, `redis`, `api`, `web`).

**`db` service** (Docker image `postgis/postgis:16-3.4`, volume mounted at
`/var/lib/postgresql/data`):

```
POSTGRES_USER=ride
POSTGRES_PASSWORD=<generate: openssl rand -hex 24>
POSTGRES_DB=rideshare
```

**`redis` service** (Docker image `redis:7-alpine`): no variables needed.

**`api` service** (from the repo):

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgres://ride:${{db.POSTGRES_PASSWORD}}@${{db.RAILWAY_PRIVATE_DOMAIN}}:5432/rideshare
REDIS_URL=redis://${{redis.RAILWAY_PRIVATE_DOMAIN}}:6379
JWT_SECRET=<generate: openssl rand -hex 32>
CORS_ORIGINS=
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

`CORS_ORIGINS` starts empty (allow all, dev-style); set it to the web service's
public domain once it has one. Leave `PAYMOB_*` unset until M3.

**`web` service** (from the repo):

```
PORT=8080
```

If `${{db.RAILWAY_PRIVATE_DOMAIN}}` does not resolve, the literal private
hostname is `<service-name>.railway.internal` (e.g. `db.railway.internal`).

## Services

| Service | Image / source | Public? | Health |
|---|---|---|---|
| `api` | `infra/docker/Dockerfile.node` (PROJECT=api) | yes | `GET /healthz` |
| `web` | `infra/docker/Dockerfile.node` (PROJECT=web) | yes | `GET /healthz` |
| `db` | `postgis/postgis:16-3.4` + volume | no (private) | `pg_isready` |
| `redis` | `redis:7-alpine` | no (private) | `redis-cli ping` |

- Deploy from the **Dockerfile**, not a buildpack — the platform receives a
  container (portability; see `../MIGRATION.md`).
- All configuration is environment variables (12-factor). No Railway SDK on
  any code path. `.env.example` documents every name.

## Variables (names only — values are secrets)

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | api, web | assigned by Railway; never hardcoded in the image |
| `DATABASE_URL` | api | PostGIS connection |
| `REDIS_URL` | api | Redis connection |
| `JWT_SECRET` | api | token signing (≥32 chars) |
| `NODE_ENV` | api | `production` |
| `CORS_ORIGINS` | api | comma-separated allowlist |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | api | rate limiting (defaults 60000/100) |
| `PAYMOB_*` | api | M3 — leave unset until merchant keys exist |

## Platform facts (R19.1 — operational risks, not inconveniences)

1. **Unmanaged templates:** backup, recovery, tuning and monitoring are our
   responsibility. The monthly restore drill (DEC-164) is the only thing
   between the ledger and permanent loss.
2. **A hard spending limit can take workloads offline.** Configure limits and
   alerting deliberately, with a stated threshold.

## Migration off Railway

See `../MIGRATION.md` — the same images run on any Docker host.
