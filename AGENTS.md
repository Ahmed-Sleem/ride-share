# AGENTS.md — what an agent (or a new developer) must know before touching code

## Rules that are not optional

- **Secrets never live in code.** API keys, tokens, DB URLs, and credentials
  live only in environment variables (local `.env`, git-ignored; Railway
  variables in production). `.env.example` carries names only, never values.
- **One definition of everything.** A value, component, or rule appears once
  (§0.3). If a change needs edits in more than one place, that is a defect.
- **The schema changes only through migrations** (`migrations/`,
  `node-pg-migrate`). Never a manual `psql` alteration in any environment.
- **SQL is parameterised** and lives only in repository modules — enforced by
  `scripts/` checks in `pnpm verify`.
- **Every new check is broken once and observed failing** for the right reason
  before it is trusted (§0.2).
- **Run `pnpm verify` before every push.** It must be green.

## Where things are

- `apps/web/` — the interface (single-file build from `src/`).
- `apps/api/` — the backend (NestJS modular monolith).
- `apps/mobile/` — Capacitor wrapper (BUILD_PLAN P7).
- `packages/` — shared types, logic, API client, toolchain config.
- `migrations/` — the only way the database schema changes.
- `scripts/` — the enforcement scripts behind `pnpm verify`.
- `docs/` — specification, plans, decisions, research. Non-code lives here.

## Definitions of done

A change is finished when: its tests pass, every affected check has been
observed failing for the right reason, `pnpm verify` is green, docs still match
reality, and the work is committed and pushed.
