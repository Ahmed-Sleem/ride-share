# Infrastructure

Deployment and operations live here, apart from application code and docs.

| Path | What it is |
|---|---|
| `docker/Dockerfile.node` | The **one** image definition for every Node service (`ARG PROJECT=api|web`) |
| `docker/` + root `docker-compose.yml` | Local full stack: api, web, postgres+postgis, redis |
| `railway/` | `railway.toml`, `railway.json`, and the deployment README (variables, services, procedure) |
| `scripts/smoke.sh` | Smoke test: confirms a running deployment actually serves the interface |

## The portability guarantee

The deployment platform receives a **container**, not a repository. The same
images that run locally run in production, and `MIGRATION.md` (P0.13) proves
they run on a plain Docker host. Replacing the platform means running the same
container somewhere else.
