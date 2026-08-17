# Deployment

The unit of deployment is the Dockerfile. Railway is the current host, but
nothing here is Railway-specific: the same image runs on any container host,
which is the point (see DEC-104 and the portability rehearsal, BUILD_PLAN P0.13).

## Contents

| Path | Purpose |
|---|---|
| `docker/Dockerfile` | Two-stage build: assemble the interface, serve it with nginx as a non-root user |
| `docker/nginx.conf` | Static serving, `/healthz`, baseline security headers |
| `docker/docker-compose.yml` | Local run of the identical image |
| `railway/railway.json` | Tells Railway to use the Dockerfile and the health check |
| `scripts/` | Build and smoke-test helpers |

## Run locally

```bash
docker compose -f deploy/docker/docker-compose.yml up --build
# http://localhost:8080
```

## Deploy to Railway

1. Create a project and point it at this repository.
2. Railway reads `deploy/railway/railway.json` and builds the Dockerfile.
3. Confirm the health check passes at `/healthz`.

Railway's database templates are unmanaged services: backups, restores, tuning
and monitoring remain your responsibility. A hard spending limit can take a
workload offline. Both are covered in BUILD_PLAN P8.2.

## Scope

This deploys the **interface only**. There is no API, database or
authentication yet; the plan for those is `docs/planning/BUILD_PLAN.md`,
Phases 0 to 8.
