# Infrastructure

Deployment and operations live here, apart from application code and docs.

| Path | What it is |
|---|---|
| `docker/Dockerfile.node` | The **one** image definition for every Node service (`ARG PROJECT=api|web`) |
| `docker/` + root `docker-compose.yml` | Local full stack: api, web, postgres, redis |
| `railway/` | `railway.toml`, `railway.json`, and the deployment README (variables, services, procedure) |
| `scripts/smoke.sh` | Smoke test: confirms a running deployment actually serves the interface |

## Database note (DEC-184)

Production uses Railway's **managed PostgreSQL + managed Redis** (automatic
backups). PostGIS is **deferred** until the geography milestone (M2) — see
`docs/decisions/DECISIONS_REGISTER.md` DEC-184 and `docs/decisions/OPEN_ITEMS.md`
G-061. Local `docker-compose.yml` runs plain `postgres:16-alpine` to match.

## The portability guarantee

The deployment platform receives a **container**, not a repository. The same
images that run locally run in production, and `MIGRATION.md` (P0.13) proves
they run on a plain Docker host. Replacing the platform means running the same
container somewhere else.
