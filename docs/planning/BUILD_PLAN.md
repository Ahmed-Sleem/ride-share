# BUILD PLAN

**Version:** 1.0 · **Date:** 2026-08-02
**Governs:** construction of the shared-ride platform specified in `MASTER_SPECIFICATION.md`
**Rules in force:** `_working_docs/AGENT_RULES_GENERAL.md` (active version) — in particular
§0 The Standard, §0.1 checklists, §0.2 *a check that cannot fail is not a check*,
§0.3 *build a library, then build the product out of it*, §6.2 centralized verification,
§8.1 hide-not-disable, §8.2 one authority.

---

## HOW TO READ A POINT

Every point has the same nine fields. None is optional.

| Field | Meaning |
|---|---|
| **ID** | `P<phase>.<n>` — stable, referenced by commits and the audit log |
| **Implements** | Which decisions / chapters this point realises. Traceability is not decoration: if a point implements nothing, it should not exist |
| **Depends on** | Points that must be complete first |
| **WHAT** | The work, precisely. Files created or changed |
| **HOW** | The exact commands |
| **TEST** | The checks to write |
| **BREAK** | How to prove each check can fail — §0.2. *A check never observed failing is an assumption wearing a test's clothing* |
| **DONE** | Definition of done. Every line must be provable by a command |
| **GAP RISK** | What silently goes wrong if this point is skipped or half-done |

### Rules that apply to every point without being restated

1. **Nothing is ticked until a command proves it** (§0.1). Not when it compiles. Not when it looks right.
2. **Every point ends with `pnpm verify` green** (§6.2), and the verify command grows as points add checks.
3. **Every point ends with a commit** whose message names the point ID.
4. **A point is either finished or it is a tracked gap** (§0 item 2). There is no third state.
5. **Trace the whole chain** (§0 item 3): a change to a screen implies its service, its repository, its permissions, its translations, its tests and its checks.
6. **No secrets in the repository** (§10.1). Local secrets live in `.env` which is git-ignored; deployed secrets live in the platform's variable store.
7. **Where this plan departs from a common industry answer, the departure is written down** (§0 item 5).

### The phases

| Phase | Name | Ends when |
|---|---|---|
| **P0** | Foundations | An empty but production-grade skeleton deploys, with every guard-rail already enforcing |
| **P1** | Identity & vehicles | A real driver can be verified and approved by a real administrator |
| **P2** | Geography | The launch corridor is surveyed and its boarding points verified |
| **P3** | Routes, slots & the core journey | A passenger books, walks to a stop, boards by code and pays — on one corridor, on the web |
| **P4** | Safety & support | A passenger in difficulty reaches a person; an unsafe driver can be removed |
| **P5** | Commercial control | A manager changes a price and runs a promotion with no engineering involvement |
| **P6** | Recurring travel | A commuter buys a subscription and travels without further action |
| **P7** | Mobile applications | The driver runs a full journey offline on a phone |
| **P8** | Validation & launch | Simulation sets the parameters; a closed trial meets its criteria; the corridor opens |

**Web first, then mobile** (DEC-015). P0–P6 are web and API only. The mobile application is P7,
and the specification's offline-first driver requirements (DEC-099) are its core, not an addition.

---

# PHASE 0 — FOUNDATIONS

> **Purpose.** Build the skeleton *and every guard-rail* before any feature exists. A rule that is
> introduced after the code it governs is a rule that will be argued with. Introduced first, it is
> simply how the repository works.
>
> **This phase writes almost no product code.** That is deliberate and it is the most important
> phase in the plan.

---

## P0.1 — Repository, workspace and pinned toolchain

**Implements:** DEC-085 (monorepo, separate UIs), DEC-069 (modular monolith), §0.3
**Depends on:** nothing

**WHAT**
Create the repository skeleton and pin the toolchain so that every machine and every CI runner
builds identically.

```
/
├─ apps/
│  ├─ api/            NestJS  (P0.6)
│  ├─ web/            the approved single-file GUI (DEC-181 supersedes the
│  │                  Next.js choice of P0.7 — one UI codebase, DEC-176)
│  └─ mobile/         Capacitor (P7, DEC-176 — created empty with a README explaining why)
├─ packages/
│  ├─ shared-types/   entities, DTOs, events — ONE definition of each
│  ├─ shared-logic/   validation, money, dates, i18n keys, the theme object
│  ├─ shared-api/     generated API client
│  └─ config/         eslint, tsconfig, stylelint, prettier — consumed by every package
├─ infra/
│  ├─ docker/         Dockerfiles
│  └─ railway/        deployment configuration
├─ scripts/           verification and enforcement scripts
├─ .github/workflows/
├─ pnpm-workspace.yaml
├─ turbo.json
├─ package.json       private: true, packageManager pinned exactly
├─ AGENTS.md          where tokens live, what may never be hardcoded
└─ .gitignore         .env, node_modules, dist, .turbo, *.osrm*
```

- Root `package.json`: `"private": true`, `"packageManager": "pnpm@<exact>"` — **no caret, no
  `latest`**. Corepack reads this and locks every developer and runner to one version. Research
  R19.3 calls this non-negotiable and it is the cheapest possible defence against "works on my
  machine".
- `pnpm-workspace.yaml` declares `apps/*` and `packages/*`, and defines a **catalog** with
  `catalogMode: strict`, so no child package may name a bare version. One dependency, one version,
  changed in one file (§0.3).
- Every internal dependency uses `workspace:*`, which guarantees the local package is linked and
  never a same-named package from the registry.
- `packages/config` holds the ESLint, TypeScript, Stylelint and Prettier configuration. Every other
  package extends from it and defines none of its own. This is §0.3 applied to configuration.

**HOW**
```bash
corepack enable
pnpm init                       # then hand-edit package.json as above
pnpm add -Dw turbo typescript
pnpm install
git init && git add -A && git commit -m "chore(P0.1): workspace skeleton and pinned toolchain"
```

**TEST**
1. `scripts/check-workspace.sh` asserts: root is private; `packageManager` is an exact version with
   no range character; every `apps/*` and `packages/*` package.json exists and declares a name;
   every internal dependency uses the `workspace:` protocol; no package declares a dependency
   version outside the catalog.
2. `pnpm install --frozen-lockfile` succeeds from a clean clone.

**BREAK** (§0.2 — do all four, observe the failure, restore)
- Change `packageManager` to `pnpm@^10` → check must fail on the range character.
- Add `"react": "18.0.0"` to a child package instead of the catalog → check must fail on catalog violation.
- Change an internal dependency from `workspace:*` to `^1.0.0` → check must fail.
- Delete `"private": true` → check must fail.
If any of these leaves the check green, the check is wrong, not the repository.

**DONE**
- `pnpm install --frozen-lockfile` succeeds on a clean clone — proved by running it in a fresh directory.
- `scripts/check-workspace.sh` exits 0, and has been observed exiting non-zero for all four break cases.
- `git status` is clean; `.env` is ignored and no `.env` file is tracked.

**GAP RISK**
Version drift between packages, and the "works on my machine" class of failure. Both are silent
until they cost a day of debugging a build that differs from a colleague's.

---

## P0.2 — The verify command

**Implements:** §6.2, CH14 §14.1
**Depends on:** P0.1

**WHAT**
One command that runs every check. It exists **now**, while it is nearly empty, so that every
later point has somewhere to add its check. A verification command introduced late is a
verification command that never runs the checks written before it.

`package.json` root scripts:
```json
{
  "verify": "turbo run typecheck lint test build && pnpm verify:repo",
  "verify:repo": "bash scripts/verify-repo.sh"
}
```

`scripts/verify-repo.sh` runs, in order, failing on the first non-zero:
| Check | Script | Added in |
|---|---|---|
| Workspace integrity | `check-workspace.sh` | P0.1 |
| Secret scan | `check-secrets.sh` | P0.3 |
| No hardcoded design values | `check-tokens.sh` | P0.8 |
| Module boundaries | `check-boundaries.sh` | P0.9 |
| No SQL outside repositories | `check-sql-location.sh` | P0.5 |
| No concatenated SQL | `check-sql-injection.sh` | P0.5 |
| Migration drift | `check-migrations.sh` | P0.5 |
| No permission-disabled controls | `check-hide-not-disable.sh` | P0.10 |
| Single authority implementation | `check-authority.sh` | P0.10 |

Each script prints what it checked and how many files it examined — a check that prints nothing
cannot be distinguished from a check that did not run.

**HOW**
```bash
mkdir -p scripts && chmod +x scripts/*.sh
pnpm verify        # must pass, trivially, today
```

**TEST**
`scripts/verify-repo.sh` run with a deliberately failing sub-check must exit non-zero and name the
failing check.

**BREAK**
Insert `exit 1` into one sub-script → `pnpm verify` must fail and the output must say which check
failed. Restore. Then make a sub-script print nothing and exit 0 → the harness must flag a check
that examined zero files, because a check that silently matches nothing is the most common false
green in this whole plan.

**DONE**
- `pnpm verify` exits 0 on a clean tree.
- `pnpm verify` exits non-zero, naming the check, when any sub-check fails — observed.
- Each sub-check reports the number of files it examined.

**GAP RISK**
Without this, checks are written and then never run together. The rules require one command
(§6.2); more importantly, a check nobody runs is worse than no check, because it creates
false confidence.

---

## P0.3 — Secret hygiene

**Implements:** §10.1, §6.3
**Depends on:** P0.2

**WHAT**
- `.gitignore` covers `.env`, `.env.*` (except `.env.example`), and any credential file pattern.
- `.env.example` lists **every** variable the system reads, with a description and a safe dummy
  value. It is the single documented answer to "what configuration does this need".
- `scripts/check-secrets.sh` scans the working tree for high-entropy strings and known credential
  shapes (private-key headers, connection strings containing a password, provider key prefixes),
  and fails on any hit outside `.env.example`.
- Environment variables are read in **exactly one module** per app (`config/env.ts`), validated at
  startup with an explicit schema, and the process **refuses to start** if a required variable is
  missing or malformed. Nothing anywhere else touches `process.env` — enforced by a lint rule.

**HOW**
```bash
pnpm add -Dw zod            # startup validation of env
bash scripts/check-secrets.sh
```

**TEST**
1. Secret scan finds a planted fake credential.
2. Removing a required variable makes the app exit non-zero at startup **with a message naming the
   variable** — not a stack trace hundreds of lines later when something reads `undefined`.
3. A lint rule fails on any `process.env` reference outside `config/env.ts`.

**BREAK**
- Plant `AKIA0000000000000000` in a source file → scan must fail. Remove it.
- Delete a required variable from `.env` → startup must fail naming that variable, not crash later.
- Add `process.env.FOO` to a random file → lint must fail.

**DONE**
- No `.env` tracked: `git ls-files | grep -c '^\.env$'` returns 0.
- `.env.example` documents every variable that `config/env.ts` reads — checked by a script that
  compares the two, so they cannot drift.
- All three break cases observed failing.

**GAP RISK**
A leaked credential is unrecoverable — rotation is the only remedy, and only if you notice. The
env-validation half prevents the subtler failure: an application that starts successfully and
misbehaves an hour later because one variable was absent.

---

## P0.4 — Docker: one image definition for every service

**Implements:** R19.4, portability requirement (Railway now, VPS later)
**Depends on:** P0.1

**WHAT**
A **single parameterised Dockerfile** at `infra/docker/Dockerfile.node`, building any workspace app
via `ARG PROJECT`. Stages: `base` → `pruner` (`turbo prune --scope=$PROJECT --docker`) →
`builder` (install from the pruned lockfile, build, `pnpm prune --prod`) → `runner`.

Non-negotiables in the runner stage:
- **Non-root user.** A container running as root is a container whose compromise is a host problem.
- Only production dependencies and build output are copied — no source, no dev dependencies.
- `PORT` read from the environment, never hardcoded, because the platform assigns it.
- A `HEALTHCHECK` hitting the app's own health endpoint.
- `.dockerignore` excluding `node_modules`, `.git`, `.env`, `dist`, `.turbo`.

`docker-compose.yml` at the root runs the whole system locally: api, web, postgres+postgis, redis,
osrm. **The same images that run locally run in production**, and the same OSRM image runs on the
platform or on a plain host with only its URL differing (DEC-173). This is the portability guarantee —
the deployment platform receives a container, not a repository, so replacing the platform is
replacing where the container runs.

**HOW**
```bash
docker build -f infra/docker/Dockerfile.node --build-arg PROJECT=api -t rideshare-api .
docker compose up --build
```

**TEST**
1. Both `api` and `web` build from the same Dockerfile with different `PROJECT` values.
2. `docker compose up` brings the stack up and every health check passes.
3. `docker run --rm rideshare-api id -u` returns non-zero (not root).
4. Final image size is recorded in the point's implementation-log entry — a number to notice
   growing, not a number to hit.

**BREAK**
- Remove the `USER` line → the non-root test must fail. Restore.
- Break the health endpoint → `docker compose up` must report the service unhealthy rather than
  reporting success, which is the failure mode that matters: an unhealthy container that the
  platform believes is fine.

**DONE**
- One Dockerfile builds both services — proved by two build commands.
- `docker compose up` gives a working local stack.
- Containers run as non-root — proved.
- No `.env` is baked into any image: `docker history` inspected and recorded.

**GAP RISK**
Two Dockerfiles become two different base images, two Node versions and two security postures
(§0.3). Root containers turn a small compromise into a large one. And without local compose, "works
in production" becomes untestable before deployment.

---

## P0.5 — Database: PostGIS, migrations, and the no-ORM guard-rails

**Implements:** CH9, DEC-170 and its four mandatory mitigations, R19.2, R20.1
**Depends on:** P0.4

**WHAT**
- **Postgres 17 with PostGIS**, from an image we control (R19.2: the stock Railway template does
  not include PostGIS). The same image locally and deployed.
- **`node-pg-migrate`** with plain-SQL migrations under `infra/migrations/`. Migration `0001`
  enables the extension and creates nothing else, so that "does this environment have PostGIS" is
  answered by the first migration rather than discovered later.
- **Generated types (DEC-170 mitigation 1).** A script introspects the live schema and writes
  `packages/shared-types/src/db.generated.ts`. Types are *derived from* the schema, never
  hand-maintained beside it. CI regenerates and fails if the committed file differs — the schema
  and the types cannot drift because drift is a build failure.
- **One repository per table (mitigation 2).** SQL exists only in `**/infra/*.repository.ts`.
- **Parameterised queries only (mitigation 3).** `check-sql-injection.sh` fails on any SQL string
  built with template interpolation or `+`.
- **Migrations are the only way the schema changes (mitigation 4).** `check-migrations.sh` applies
  all migrations to a scratch database, dumps the schema, and compares it to the committed
  `schema.sql`. Any difference — including one made by hand in a live environment — fails.

**HOW**
```bash
pnpm add -Dw node-pg-migrate pg
pnpm migrate up
pnpm db:types            # regenerate; must produce no diff
bash scripts/check-migrations.sh
```

**TEST**
1. `CREATE EXTENSION postgis` succeeds and `SELECT PostGIS_Version()` returns a version.
2. Migrations run forward from empty, and **every migration has a working down**, proved by
   up → down → up on a scratch database.
3. Schema drift check fails when the scratch schema differs from `schema.sql`.
4. SQL-location check fails on SQL outside a repository file.
5. Injection check fails on an interpolated query.

**BREAK**
- Hand-alter a column on the scratch database → drift check must fail.
- Put a `SELECT` in a service file → location check must fail.
- Write `` `SELECT * FROM users WHERE id = ${id}` `` → injection check must fail. **This one
  matters most**: it is the check standing between the product and the most common serious
  vulnerability in this class of application.
- Remove a `down` migration → the up/down/up test must fail.

**DONE**
- PostGIS confirmed present by query output, recorded.
- up → down → up cycle clean on a scratch database.
- All four break cases observed failing.
- `pnpm db:types` produces no diff on a clean tree.

**GAP RISK**
Without generated types, the database and TypeScript diverge silently and the compiler reports
success while the query returns a different shape — precisely the safety an ORM would have given
and DEC-170 chose to forgo. Without the injection check, one hurried string interpolation is a
breach.

---

## P0.6 — API skeleton with modules, health and one error shape

**Implements:** CH8a (16 modules, enforced boundaries), §8.2, §9
**Depends on:** P0.5

**WHAT**
NestJS application with the sixteen module directories from CH8a §8a.2 created empty but real,
each containing `api/ application/ domain/ infra/ contracts/ tests/` and a README stating **why
that module exists** (§9 rule 1).

Cross-cutting, each implemented **once** (§0.3, §8.2):
- **One error shape.** A single exception filter renders every error as
  `{ code, message_key, details, request_id }`. `message_key` is a translation key, never English
  prose — otherwise the Arabic user receives English errors and the i18n promise is already broken
  on the first failure path (CH9 §9.3).
- **One request context**: request id, actor, locale, city — attached once, available everywhere.
- **One validation entry point**, at the boundary, rejecting unknown fields rather than ignoring them.
- **One authority resolver** — the only place that answers "may this actor do this". §8.2 is
  explicit that a second copy is a defect *even while its answer agrees*.
- **One structured logger.** No `console.log` in production paths (§9 rule 9), enforced by lint.
- `/health` returning process, database and Redis status.

**HOW**
```bash
pnpm --filter api add @nestjs/core @nestjs/common @nestjs/platform-fastify
pnpm --filter api exec nest start --watch
curl -s localhost:3000/health | jq
```

**TEST**
1. `/health` returns 200 with database and Redis both `ok`, and returns 503 when either is down.
2. A thrown domain error and an unexpected error both produce the same response *shape*, differing
   only in code.
3. Every error response carries a `request_id` that appears in the logs for that request.
4. A request with an unknown field is rejected, not silently accepted.
5. Lint fails on `console.log` in an app directory.

**BREAK**
- Stop the database container → `/health` must return 503, not 200 with a cheerful message. A health
  check that reports healthy while the database is unreachable is worse than none, because it
  disables the platform's own restart logic.
- Throw a raw `Error` from a controller → the response must still match the standard shape.
- Add `console.log` to a service → lint must fail.

**DONE**
- Health endpoint proved in both directions (up, and with the database stopped).
- Error shape proved identical for handled and unhandled errors.
- Sixteen module directories exist, each with a README explaining its purpose.
- Boundary check (P0.9) passes over the empty modules.

**GAP RISK**
Error shapes invented per endpoint mean the client writes a different handler for each one, and the
Arabic user gets English text. Two authority implementations mean the system refuses an action in
one place and permits it in another — §8.2 names this exactly.

---

## P0.7 — Web skeleton, theme object, i18n and RTL

**Implements:** CH10a, DEC-017 (i18n/RTL), DEC-098, DEC-169
**Depends on:** P0.1

**WHAT**
Next.js application, and the **single theme source** that every visual value in the product will
read from — `packages/shared-logic/src/theme.ts`, exporting colour, spacing, radius, type scale,
motion and breakpoint tokens (CH10a §10a.1–10a.4). Web consumes it as CSS custom properties;
mobile will consume the same object directly in P7. **One definition, two consumers** (§0.3).

- **i18n from the first screen.** Arabic and English, `dir` derived from the locale, the RTL rules
  of CH10a §10a.5 encoded once in the layout rather than per-component.
- **Dark mode from the first screen** — mandatory, not a later theme (CH10a §10a.1). Drivers work
  at night.
- A `/health` page and one placeholder screen that uses **only** tokens, proving the pipeline.

Retrofitting RTL or dark mode is a rewrite of every component. Both are structural, so both are
here, in the phase before any component exists.

**TEST**
1. Switching locale to Arabic sets `dir="rtl"` and mirrors the layout.
2. Switching to dark mode changes every surface — no element keeps a light background.
3. A digit sequence and a plate number inside an Arabic sentence render **LTR** and in the correct
   order (CH10a §10a.5 bidi isolation).
4. Axe accessibility scan passes on the placeholder screen.
5. Lighthouse cold-start budget recorded against CH10a §10a.9 (< 3s on the reference profile).

**BREAK**
- Hardcode `#FFFFFF` in the placeholder → the token check (P0.8) must fail.
- Remove the bidi isolation wrapper → the mixed-direction test must fail. This one is worth
  watching carefully: without it, `ABC 1234` inside Arabic text reorders visually, and every plate
  number in the product is wrong in a way an English-speaking reviewer will not see.

**DONE**
- Theme object is the only source of visual values; grep for hex literals in `apps/web/src`
  returns nothing outside the theme file.
- Arabic RTL, dark mode and bidi isolation all proved by test.
- Accessibility scan clean.

**GAP RISK**
Adding RTL later means re-testing every screen; adding dark mode later means re-specifying every
colour. Both are cheap now and expensive at any later point.

---

## P0.8 — Enforce the design system (§0.3 layer 1)

**Implements:** §0.3, CH10a, R19.5
**Depends on:** P0.7

**WHAT**
Make the token rule enforced rather than intended. §0.3 is explicit: *centralised design is
invisible in review — a hardcoded colour and a token render identically.*

- **`stylelint-declaration-strict-value`** on `color`, `background-color`, `border-color`:
  a raw value fails the build.
- **ESLint rule** banning colour literals in inline styles and (from P7) in `StyleSheet.create`,
  where stylelint does not reach.
- **`scripts/check-tokens.sh`** greps the application source for hex, `rgb(`, `hsl(` and raw pixel
  values outside the theme file, and fails on any hit.
- **`AGENTS.md`** at the repository root: where the tokens live, the naming convention, and the
  rule that literals are never acceptable. A documented 2026 convention for keeping assistants
  inside the design system, and equally a briefing for a new developer.

**Deliberate scope limit, taken from R19.5:** enforce **colour only** at first. Extend to spacing
and typography once the token set can answer every question the linter will ask. Enforcing spacing
against an incomplete scale makes people invent token names, which the source describes as worse
than the hex values it replaced. Recorded as a decision with a reason (§0 item 5), not an oversight.

**TEST**
`check-tokens.sh` fails on a planted `color: #FF0000`, and passes on `color: var(--color-danger)`.

**BREAK**
Plant a hex value in three places — a CSS file, an inline style, and a template string — and
confirm the check catches **all three**. A check that catches one of three is the false green this
rule exists to prevent.

**DONE**
- All three planted literals caught; check restored to green.
- `AGENTS.md` committed.
- Check wired into `pnpm verify`.

**GAP RISK**
Tokens decay quietly. One hardcoded colour becomes twenty, and the day the palette changes, the
product is subtly wrong in places nobody can find. This is the exact failure §0.3 was written to
prevent, and it cannot be caught in review.

---

## P0.9 — Enforce module boundaries (§0.3 layer 3)

**Implements:** CH8a §8a.2, §8.2
**Depends on:** P0.6

**WHAT**
`dependency-cruiser` configured so that:
- a module may be imported **only through its `contracts/`** — reaching into another module's
  `domain/` or `infra/` fails the build;
- **`domain/` may not import from `infra/`** — business rules must not know that a database exists,
  which is what keeps them testable and durable (CH8a §8a.2);
- **no cycles** anywhere. If two modules need each other, a third concept is missing;
- `packages/shared-*` may not import from `apps/*`.

**TEST**
`check-boundaries.sh` fails on a planted deep import, a planted `domain → infra` import, and a
planted cycle.

**BREAK**
Plant all three violations, one at a time, and observe three distinct failures naming the offending
file. Restore.

**DONE**
- Three violation types each observed failing.
- Check in `pnpm verify`.
- The rule that `matching` is the first candidate for extraction (DEC-167) is noted in the config
  as a comment, so the seam is protected deliberately rather than by accident.

**GAP RISK**
Boundaries erode invisibly. Once a service imports another module's repository directly, extracting
that module later stops being a refactor and becomes a rewrite — and the modular monolith quietly
becomes a monolith.

---

## P0.10 — Enforce authority and hide-not-disable (§8.1, §8.2)

**Implements:** §8.1, §8.2, CH2 §2.4
**Depends on:** P0.6

**WHAT**
Two rules the active ruleset singles out as invisible in review, each therefore needing a script.

- **`check-authority.sh`** — permission decisions may only be made by calling the single authority
  resolver. Any other `role ===`, `user.role`, or hand-rolled permission comparison in an API or
  service file fails the build. §8.2: a second copy is a defect *even while its answer agrees*,
  because the two will be edited on different days by people solving different problems.
- **`check-hide-not-disable.sh`** — a control may not be rendered `disabled` on the basis of a
  permission. §8.1 distinguishes precisely: `disabled` means "not yet, and you can change that
  yourself"; a permission the viewer will never hold is not a "not yet". Leaving it visible clutters
  the screen, invites a click that ends in a refusal, and **discloses what other roles are allowed
  to do**. The check fails on `disabled={!can(` and its variants.
- A shared `<PermissionGate>` primitive is the only sanctioned way to conditionally render by
  permission, and it **omits** rather than disables.

**TEST**
1. Authority check fails on a planted `if (user.role === 'ADMIN')` inside a controller.
2. Hide-not-disable check fails on a planted `disabled={!canEditFares}`.
3. A unit test of the authority resolver covers every role against a representative capability from
   the CH2 §2.4 matrix.

**BREAK**
Plant both violations and observe both failures. Then — the more important break — **change the
authority resolver to return `true` for everything** and confirm the permission unit tests fail.
Per §7.0, a test whose subject is too powerful cannot reach the bug: if the tests still pass with
an all-permissive resolver, they are testing the wrong subject and must be rewritten with a
narrowly-permissioned user.

**DONE**
- Both checks observed failing on planted violations.
- Permission tests observed failing against an all-permissive resolver — this is the proof that they
  test authority at all.
- `<PermissionGate>` exists and is the only permission-conditional renderer.

**GAP RISK**
Duplicated authority is how a system carefully refuses something in one place and quietly hands it
over in another. Disabled-by-permission controls leak the organisation's role structure to anyone
who looks, and train users to click things that refuse them.

---

## P0.11 — Continuous integration

**Implements:** §6.3, §13.3
**Depends on:** P0.2

**WHAT**
GitHub Actions running, on every pull request: install with a frozen lockfile → `pnpm verify` →
build both container images. Merges are blocked on green.

- The workflow runs **the same `pnpm verify`** a developer runs locally. Not a parallel list of
  steps that can drift from it — that would violate §0.3 as surely as a duplicated colour.
- Postgres+PostGIS and Redis run as service containers so integration tests are real, not mocked.
- Turborepo remote caching configured if available; correctness never depends on the cache.

**TEST**
Open a pull request containing a deliberate lint error and confirm CI fails and blocks the merge.

**BREAK**
Push a commit that fails `pnpm verify` and confirm the pull request cannot be merged. If it can,
branch protection is not actually on — a setting that is easy to believe is enabled and easy to
find disabled.

**DONE**
- A red pull request observed blocked.
- CI runtime recorded, to notice growth.
- Branch protection verified in repository settings, not assumed.

**GAP RISK**
Local verification is optional in practice; CI verification is not. Without it, the rules in P0.8
to P0.10 are advisory.

---

## P0.12 — Deploy the empty skeleton to Railway

**Implements:** deployment requirement, §14, DEC-164
**Depends on:** P0.4, P0.11

**WHAT**
Deploy the skeleton **before it does anything**, so the deployment path is proved while it is
trivial to debug. The first deployment of a large application is where a week disappears; the first
deployment of a health endpoint is where an afternoon does.

- Services: `api`, `web`, `postgres+postgis` (own image, R19.2), `redis`. Private networking
  between them; only `web` and `api` are publicly reachable.
- Deploy from the **Dockerfile**, not from a platform buildpack. This is the portability decision:
  the platform receives a container, so replacing the platform means running the same container
  somewhere else.
- All configuration through environment variables (12-factor). **No Railway-specific SDK on any
  code path** — vendor coupling in code is what makes a migration a rewrite.
- Volumes for Postgres data; scheduled backups configured.
- `infra/railway/README.md` records every variable, every service and the deployment procedure.

**Two platform facts recorded now, from R19.1, because both are operational risks rather than
inconveniences:**
1. Railway's database templates are **unmanaged** — backup, recovery, tuning and monitoring remain
   our responsibility. DEC-164's monthly restore drill is therefore not a formality; it is the only
   thing standing between the ledger and permanent loss.
2. **A hard spending limit can take workloads offline.** Configure limits and alerting deliberately,
   with a stated threshold, rather than discovering the behaviour during an outage.

**TEST**
1. Public URL serves the web health page over HTTPS.
2. API health returns database and Redis both `ok` **from inside the deployed environment**.
3. A deliberate bad deploy rolls back and the previous version continues serving.
4. **A backup is restored into a scratch database and queried** (DEC-164). Not "backups are
   enabled" — restored, and read.

**BREAK**
- Remove a required environment variable in the platform and redeploy → the service must fail to
  start with a message naming the variable (P0.3), not start and misbehave.
- Stop the database service → API health must go 503 and the platform must show the service
  unhealthy.

**DONE**
- Public URLs recorded in `infra/railway/README.md`.
- Health verified from outside and from inside the private network.
- **Restore drill performed and documented**, with the date and the commands used.
- Rollback observed working.

**GAP RISK**
Deploying late means debugging a large unfamiliar application and an unfamiliar platform at the same
time. And a backup that has never been restored is not a backup — it is a belief.

---

## P0.13 — Portability rehearsal: the same containers on a plain host

**Implements:** the "must be movable to our VPS" requirement
**Depends on:** P0.12

**WHAT**
Prove portability **now**, while the system is four small services, rather than asserting it in a
document and discovering the truth under pressure later.

- `infra/compose/production.yml` — a Compose file that runs the identical images on any Docker host,
  with the same environment variable names as the platform deployment.
- `infra/MIGRATION.md` — the concrete move: provision host, install Docker, restore the database
  from a backup, set variables, `docker compose up -d`, point DNS, verify. With commands, not
  intentions.
- A **portability audit**: grep the codebase for platform-specific imports, URLs and assumptions.
  Any hit is either removed or recorded as a tracked gap with the cost of removing it.

**TEST**
Bring the full stack up from `production.yml` on a clean Docker host (a local VM is sufficient) and
run the same smoke checks used against the deployed environment. Both must pass identically.

**BREAK**
Introduce a platform-specific environment variable that only exists on Railway, deploy to the plain
host, and confirm the portability audit catches it. This is the failure mode that matters: coupling
arrives one convenient variable at a time.

**DONE**
- Stack proved running on a non-Railway Docker host — the commands and output recorded.
- `MIGRATION.md` written and **followed once** by executing it, not merely written.
- Portability audit clean, or every exception tracked with its cost.

**GAP RISK**
"We can move any time" is a claim, and an untested claim about infrastructure is usually wrong. The
cost of coupling compounds: each convenient platform feature is individually reasonable and
collectively a rewrite.

---

## PHASE 0 EXIT CRITERIA

Phase 0 is complete when every line below is proved by a command, not by inspection.

| # | Criterion | Proof |
|---|---|---|
| 1 | Clean clone installs and verifies | `pnpm install --frozen-lockfile && pnpm verify` |
| 2 | Every enforcement check has been **observed failing** | The break case for each of P0.1, P0.3, P0.5, P0.8, P0.9, P0.10 recorded in the implementation log |
| 3 | One Dockerfile builds every service | two builds with different `PROJECT` |
| 4 | Local stack runs | `docker compose up` with all health checks green |
| 5 | Deployed stack runs | public URL, health `ok`, from outside and inside |
| 6 | The same images run off-platform | Compose on a plain Docker host |
| 7 | A backup has been restored and read | drill documented with date and commands |
| 8 | CI blocks a red pull request | observed |
| 9 | RTL, dark mode and bidi isolation work | tests |
| 10 | No secrets tracked, env validated at startup | scan clean; missing-variable failure observed |

**What Phase 0 deliberately does not contain:** any product feature. Every guard-rail exists before
the code it governs, which is the only order in which guard-rails are cheap.

---

# PHASE 1 — IDENTITY, ACCOUNTS AND VEHICLES

> **Purpose.** Make it possible for a real person to become a verified driver, approved by a real
> administrator. Nothing in the product can be trusted until identity is, so this precedes every
> feature that depends on knowing who someone is.
>
> **Exit condition.** A driver signs up on the web, uploads documents, an Operations Admin reviews
> and approves them, and the driver's account becomes able to hold a vehicle. All on the deployed
> environment, not locally.

---

## P1.1 — Identity data model

**Implements:** CH9 §9.2 (identity module), CH2 §2.2, DEC-028
**Depends on:** P0.5

**WHAT**
Migrations creating `users`, `user_roles`, `sessions`, `otp_challenges` exactly as CH9 §9.2
specifies, with the conventions of CH9 §9.1: UUID v7 primary keys, `timestamptz` stored in UTC,
`created_at`/`updated_at` on every table, optimistic-locking `version` on mutable business tables.

Constraints that carry meaning, expressed in the database rather than only in code:
- `users.phone_e164` **UNIQUE** — DEC-028 makes the phone the identity of record, so uniqueness is
  a database guarantee, not an application convention.
- `user_roles` primary key `(user_id, role)`; a partial index on `WHERE revoked_at IS NULL`, since
  every permission lookup reads only live grants.
- `otp_challenges` carries `attempts`, `expires_at`, `consumed_at` — the fields that make
  brute-force and replay preventable rather than merely discouraged.
- No soft-delete columns anywhere (CH9 §9.1); lifecycle is a status, and `users.status` includes
  `ANONYMISED` for INV-9.

**HOW**
```bash
pnpm migrate create identity_core
# hand-write the SQL, then:
pnpm migrate up && pnpm migrate down && pnpm migrate up
pnpm db:types
```

**TEST**
1. Inserting two users with the same `phone_e164` fails at the database level, with the app offline.
2. up → down → up leaves an identical schema (`check-migrations.sh`).
3. `db.generated.ts` regenerates with no diff after the migration is committed.
4. A row inserted without `created_at` receives one.

**BREAK**
Drop the unique index and re-run the duplicate-phone test — it must fail. This is worth doing
precisely because the application will also check for duplicates: the test must prove the
*database* refuses, so that a race between two concurrent signups cannot create two accounts on
one number.

**DONE**
- Migration reversible, proved by cycle.
- Duplicate phone rejected by the database with the application stopped.
- Generated types committed and drift-free.

**GAP RISK**
Uniqueness enforced only in application code fails under concurrency, which is exactly when two
people are signing up on a recycled number. Recovering merged accounts afterwards is manual work
on live data.

---

## P1.2 — Phone/OTP authentication

**Implements:** DEC-028, CH2 §2.2, CH9 §9.3, §10.2, §10.3
**Depends on:** P1.1, P0.6

**WHAT**
`POST /v1/auth/otp/request` and `POST /v1/auth/otp/verify`, plus short-lived access tokens and
rotating refresh tokens.

Security properties, each deliberate:
- **Codes are stored hashed**, never in plaintext. A database read must not yield a working code.
- **Rate limits on three axes**: per phone number, per IP, per device. One axis alone is trivially
  evaded.
- **Attempts are counted and capped**; the challenge is consumed on success and cannot be replayed.
- **The response does not reveal whether a number is registered.** Both cases return the same shape
  and the same timing — otherwise the endpoint is an account-enumeration oracle.
- **Rate-limit responses are honest** ("try again in 45s"), because a generic failure teaches users
  to retry immediately and hammer the endpoint (CH10 R-02).
- The SMS provider sits behind a `SmsProvider` interface with a console implementation used in
  development and tests. **Nothing else in the codebase knows which provider is in use** (§0.3),
  and the interface is the seam that makes the provider replaceable per city.

**HOW**
```bash
pnpm --filter api test auth
curl -X POST localhost:3000/v1/auth/otp/request -d '{"phone":"+201000000000"}'
```

**TEST**
1. Happy path: request → verify → tokens returned.
2. Wrong code increments attempts and, past the cap, rejects even a subsequently correct code.
3. Expired challenge is refused.
4. A consumed challenge cannot be reused (replay).
5. Rate limit engages per phone, per IP and per device, tested separately.
6. Registered and unregistered numbers produce indistinguishable responses.
7. Codes in the database are hashes: no stored value equals the code that was sent.

**BREAK**
- Remove the attempts cap → the brute-force test must fail.
- Remove `consumed_at` handling → the replay test must fail.
- Store the code in plaintext → the hashing test must fail.
- Make the unregistered-number path return a different status → the enumeration test must fail.
Each of these is a real vulnerability, and each test exists only to prove it stays closed.

**DONE**
- All seven tests pass; all four break cases observed failing.
- No SMS provider name appears outside its adapter — proved by grep.
- Verified against the deployed environment, not only locally.

**GAP RISK**
Authentication is the one endpoint attacked without provocation. Missing rate limits give away
accounts; a plaintext code turns a read-only database leak into full account takeover; an
enumeration oracle hands over a customer list.

---

## P1.3 — Passcode, session lifecycle and token rotation

**Implements:** DEC-028, CH2 §2.2, §10.2
**Depends on:** P1.2

**WHAT**
Optional passcode login so that everyday sign-in costs no SMS (DEC-028 chose this deliberately for
cost and for delivery reliability). Passcodes hashed with a memory-hard algorithm (Argon2id),
never a general-purpose hash.

Session rules:
- Refresh tokens **rotate** on use; a reused refresh token invalidates the whole session family
  and is recorded as a security event. This is the standard defence against a stolen refresh token
  and it is only meaningful if tested.
- Logout revokes server-side. A token that still works after logout is a token that was never
  really revoked.
- Every session records device and platform, so a user can see and end sessions later.

**TEST**
1. Passcode set, then login with it; wrong passcode is rejected and rate-limited.
2. Refresh rotates: the old refresh token stops working.
3. **Reusing a rotated refresh token kills the family** — subsequent refreshes with any token from
   that family fail.
4. Logout invalidates immediately, tested by using the access token after logout.
5. Passcode hashes are Argon2id — verified by inspecting the stored prefix.

**BREAK**
- Disable family invalidation → test 3 must fail.
- Make logout client-side only → test 4 must fail. This is the common shortcut, and it is invisible
  until an incident.

**DONE**
- All five tests pass; both break cases observed.
- Argon2id parameters recorded in the implementation log so they can be reviewed as hardware changes.

**GAP RISK**
Non-rotating refresh tokens mean a single stolen token grants indefinite access. Client-side logout
means "log out all devices" is a lie told to a user who has just been compromised.

---

## P1.4 — Roles, and the single authority resolver

**Implements:** DEC-046 (six roles), CH2 §2.4, §8.2, DEC-151
**Depends on:** P1.1, P0.10

**WHAT**
The six roles of DEC-046 — Rider, Driver, Support Agent, Operations Admin, Manager, Super Admin —
and **one** authority resolver implementing the CH2 §2.4 matrix.

- The matrix is expressed as **data**, not as scattered conditionals, so that reading it and
  auditing it are the same activity.
- `can(actor, capability, resource?)` is the only permission API. P0.10's check enforces that
  nothing else decides.
- **Staff roles are never self-service**; they are granted by a Super Admin and every grant is
  audited.
- **A staff account must not also hold Rider or Driver on the same login** (CH2 §2.1.1) — a support
  agent must never be able to act on their own booking. Enforced by a database constraint, not a
  policy note.
- **Two-factor authentication is mandatory for all staff roles** (DEC-151), enforced at login, not
  merely offered in settings.
- **Scope in the query, not after it** (§8.2 corollary): listing endpoints apply the actor's scope
  inside the SQL. Filtering after fetching breaks pagination, makes `limit` count invisible rows,
  and leaves data the caller may not see sitting in application memory.

**TEST**
1. A table-driven test over the entire CH2 §2.4 matrix: every role × every capability, asserted
   against the specification table.
2. Staff-plus-rider on one account is rejected by the database.
3. Staff login without a second factor fails.
4. A list endpoint called by a limited actor returns a correct `total` reflecting only visible rows.

**BREAK**
- Make `can()` return `true` unconditionally → the matrix test must fail on many rows. If it passes,
  the test is asserting nothing.
- Move scoping from the SQL into a post-fetch `.filter()` → test 4 must fail on the count. This is
  the subtle one: the page of results looks right while the pagination metadata lies.

**DONE**
- Matrix test covers every cell of CH2 §2.4 — count of assertions recorded and compared to the
  table's dimensions, so a missing row is visible.
- Both break cases observed.
- `check-authority.sh` green.

**GAP RISK**
§8.2 names the failure precisely: a second copy of a rule is a defect from the moment it is
written, even while its answer agrees. Post-fetch scoping additionally leaks row counts and breaks
paging in ways users report as "the list is wrong" long before anyone suspects permissions.

---

## P1.5 — Driver profile and document upload

**Implements:** DEC-035 (strict verification), CH2 §2.5, CH9 §9.2 (drivers module)
**Depends on:** P1.4

**WHAT**
`driver_profiles` and `driver_documents`, the state machine
`REGISTERED → DOCS_SUBMITTED → UNDER_REVIEW → APPROVED | NEEDS_FIX | REJECTED`, and upload for the
five required documents of DEC-035: national ID (both sides), driving licence, vehicle licence,
live selfie, vehicle photographs.

- **Files never touch the application server's disk.** Direct-to-object-storage uploads with
  short-lived pre-signed URLs; the database stores references only.
- **Validation at the boundary** (§9 rule 2, §10.2): MIME type verified by content inspection rather
  than by file extension, size capped, dimensions sanity-checked. An extension check is not a check.
- **Documents are private by default.** Access requires a freshly-issued short-lived URL and is
  audited — identity documents are visible only to Operations Admin and Super Admin (CH2 §2.4), and
  §8.1 requires that Support does not even see the control.
- Partial progress is saved; a driver never loses uploads because one file failed.
- Expiry dates are captured as data, because P1.7 depends on them.

**TEST**
1. Each state transition allowed by the machine succeeds; **every transition not in the machine is
   rejected** (CH14 §14.2 requires illegal transitions to be proved rejected, not merely absent).
2. A file renamed `.jpg` but containing a PDF is rejected.
3. An oversized file is rejected before it is stored.
4. A Support Agent requesting a document URL receives a refusal, and the attempt is audited.
5. An expired pre-signed URL fails.

**BREAK**
- Allow `REGISTERED → APPROVED` directly → the illegal-transition test must fail. Skipping review is
  the single worst bug this module could have.
- Check the extension instead of the content → the disguised-file test must fail.
- Grant Support read access → test 4 must fail.

**DONE**
- Full transition matrix tested, legal and illegal.
- Content-based type checking proved with a disguised file.
- Document access audited, with the audit row asserted by test.

**GAP RISK**
Identity documents are the most sensitive data the platform holds. Extension-based validation is
a known upload bypass; public object URLs have leaked entire verification databases at other
companies.

---

## P1.6 — Operations approval queue and review workspace

**Implements:** CH10d O-11/O-12, CH2 §2.5, DEC-102
**Depends on:** P1.5, P0.7

**WHAT**
The first real screens: the Operations work queue (O-10, driver section) and the driver review
workspace (O-12).

- Queue rows show applicant, submission date, **waiting time**, and which documents are present.
  Oldest first within severity — the queue exists to be cleared, not browsed (DEC-102).
- Review workspace shows every document at full size beside the typed data, and **the selfie beside
  the ID photo** for human comparison (DEC-035 requires a human decision; automation may pre-check
  quality and expiry but never approves).
- Three decisions — approve, needs-fix, reject — each requiring a **reason shown to the applicant in
  their own language** (CH2 §2.5). The reason is a translation key plus parameters, not free English.
- Duplicate detection surfaces the same national ID or phone used elsewhere.
- Screens are built **only** from the P0.7 primitives and theme tokens (§0.3): if a component does
  not exist, it is added to the shared library, never inline.

**TEST**
1. Queue ordering is correct, including ties.
2. A decision without a reason is refused by the API, not merely discouraged by the form.
3. The applicant receives the reason in their own language — asserted for both `ar` and `en`.
4. Approval writes an audit row naming the actor, the decision and the reason.
5. Axe accessibility scan clean; the screen is usable by keyboard alone; RTL verified.
6. A Support Agent cannot reach the workspace, **and does not see a link to it** (§8.1).

**BREAK**
- Make the reason optional in the API → test 2 must fail.
- Render the Support user's approve button `disabled` instead of omitting it → `check-hide-not-disable.sh`
  must fail. This is the rule that is invisible in review, which is why the check exists.

**DONE**
- A real driver record moved to APPROVED through the interface on the deployed environment.
- Audit row asserted.
- Accessibility and RTL proved.
- No new inline components: every element used exists in the shared library.

**GAP RISK**
An approval path without a mandatory reason produces rejections nobody can explain, and support
load that never ends. A visible-but-disabled admin control tells every Support Agent exactly what
Operations can do.

---

## P1.7 — Document expiry monitoring and automatic suspension

**Implements:** CH2 §2.5, DEC-035, CH20 N-D02/N-D03
**Depends on:** P1.6

**WHAT**
A scheduled job that warns at **30, 14, 7 and 1 days** before expiry and **automatically suspends**
the driver at expiry. A suspended driver keeps their account, history and earnings — they simply
cannot accept work.

- The job is **idempotent**: running it twice on the same day sends one warning, not two. Scheduled
  jobs are retried by infrastructure, and a non-idempotent job turns a retry into a duplicate charge
  or a duplicate message.
- Suspension is a state change with an audit row and a reason, identical in shape to a manual
  suspension — one path, not two (§0.3).
- Notifications use the CH20 catalogue keys, and are transactional, so they are never suppressed by
  frequency caps (DEC-146).

**TEST**
1. With a document expiring in exactly 30/14/7/1 days, the correct warning fires — tested by moving
   a clock, not by waiting.
2. Running the job twice produces one notification.
3. At expiry the driver's status becomes SUSPENDED and an audit row exists.
4. A suspended driver's attempt to act is refused by the authority resolver, not by a screen check.
5. Re-upload and re-approval restores the driver.

**BREAK**
- Remove the idempotency key → the double-run test must fail.
- Enforce suspension only in the user interface → test 4 must fail when the API is called directly.
  A rule enforced only in the interface is not enforced.

**DONE**
- All five tests pass, with the clock controlled rather than real.
- Both break cases observed.
- The job's schedule and its failure alerting are documented in CH18's standing duties.

**GAP RISK**
Without this, drivers with expired licences carry passengers, and nobody notices until an incident
makes it a legal question. Without idempotency, every infrastructure retry doubles the messages.

---

## P1.8 — Vehicle registry, approval and the fleet label

**Implements:** DEC-034, DEC-039, DEC-033, CH2 §2.3, CH9 §9.2 (vehicles module)
**Depends on:** P1.6

**WHAT**
`vehicles`, `driver_vehicles`, `vehicle_documents`, with two entry doors into one registry
(DEC-034): self-service by a driver, and direct creation by an admin.

- **No ownership is asserted or enforced** (DEC-039). The driver is the accountable entity; the
  vehicle is a declared attribute that an admin approves. A driver may hold several approved
  vehicles with exactly one ACTIVE.
- Switching the active vehicle is **audited**, and every future Journey permanently records which
  vehicle carried the riders — because "which car was it" is a question that arrives after an
  incident, when memory is not evidence.
- `fleet_label` groups vehicles for administrative purposes only (DEC-033): not an account, not a
  login, not a billing entity, not a permission scope, **not visible to riders**.
- Vehicle approval mirrors the driver state machine, sharing the same implementation (§0.3) rather
  than duplicating it.
- `seat_capacity` is the sellable capacity (DEC-047 sells every physical seat).

**TEST**
1. Both entry doors produce records indistinguishable in the registry.
2. A driver cannot activate an unapproved vehicle.
3. Exactly one vehicle can be ACTIVE per driver — enforced by a database constraint, tested with
   concurrent updates.
4. Switching writes an audit row.
5. A rider-facing endpoint never returns `fleet_label` — asserted on the response shape, so that a
   future careless `SELECT *` is caught by a test rather than by a customer.

**BREAK**
- Remove the one-active constraint and run two concurrent activations → test 3 must fail.
- Add `fleet_label` to a rider response → test 5 must fail.

**DONE**
- Both doors proved to converge on one registry.
- Concurrency test passes with the constraint and fails without it.
- Rider responses proved free of internal fields.

**GAP RISK**
Two vehicle-creation paths that drift produce records that behave differently depending on their
origin — a class of bug that is very hard to see and very hard to reproduce. Leaking `fleet_label`
discloses commercial relationships the rider has no business seeing.

---

## P1.9 — Rider registration and profile

**Implements:** CH10b R-01..R-05, R-80, CH2 §2.6, DEC-017
**Depends on:** P1.3, P0.7

**WHAT**
The rider-facing entry screens: welcome, phone entry, OTP, optional passcode, optional profile, and
settings.

- **Nothing here blocks booking** (CH10b R-05): name, photo and email are optional, because a fast
  path to value is the whole point of the sign-up screen.
- Settings include language, numeral system (Western or Arabic-Indic), notification preferences by
  category — with **ride-status messages not disableable** because they are operationally essential
  (CH10 §10.6, CH20 §20.0) — data export, and account deletion, which **anonymises rather than
  destroys** financial and safety records (INV-9).
- Every screen carries its five states (CH10a §10a.7): loading, empty, error, offline, RTL.

**TEST**
1. A rider can complete sign-up and reach the home screen without providing name, photo or email.
2. Deleting an account anonymises: personal fields are cleared, financial rows survive with a
   non-identifying reference — asserted at the database level.
3. Language switch changes `dir` and the numeral rendering.
4. Ride-status notifications cannot be disabled through the API, not merely hidden in the interface.
5. Accessibility scan clean on every screen; keyboard-only completion of the flow.

**BREAK**
- Make deletion actually delete rows → test 2 must fail. This protects the ledger: an account
  deletion that removes financial history destroys the record of money that genuinely moved.
- Allow the ride-status category to be disabled → test 4 must fail.

**DONE**
- Sign-up completed on the deployed environment by a real phone number.
- Anonymisation proved at the database level.
- All five states present on every screen, checked against CH10a §10a.7.

**GAP RISK**
A sign-up that demands a profile loses users at the first screen. A deletion that destroys ledger
rows makes the books unreconcilable and is, in most jurisdictions, the wrong answer to a deletion
request.

---

## PHASE 1 EXIT CRITERIA

| # | Criterion | Proof |
|---|---|---|
| 1 | A real driver is verified and approved end to end | Performed on the deployed environment; record ID noted |
| 2 | Authority is decided in exactly one place | `check-authority.sh` green; matrix test covers every CH2 §2.4 cell |
| 3 | No permission-disabled control exists | `check-hide-not-disable.sh` green |
| 4 | Every state machine rejects illegal transitions | Tests assert rejection, not absence |
| 5 | Identity documents are unreachable by Support | Test asserts refusal and an audit row |
| 6 | Expiry suspension works and is idempotent | Clock-controlled test; double-run produces one message |
| 7 | Deletion anonymises and preserves financial rows | Database-level assertion |
| 8 | Both vehicle entry doors converge on one registry | Test |
| 9 | Every new screen has all five states, RTL and accessibility proved | Per-screen tests |
| 10 | `pnpm verify` green; CI green; deployed and smoke-tested | Commands recorded |

**Judgement to carry forward.** Phase 1 contains the two decisions the specification flags as
accepted risks: verification happens **once** with no periodic re-check (DEC-157, G-056 — account
sharing), and ratings carry **no** automatic consequence (DEC-096). Neither is revisited here; both
are why the incident flow in Phase 4 must be strong, and why P1.5's audit trail matters more than
it appears to.

# PHASE 2 — GEOGRAPHY

> **Purpose.** Nothing in this product can be booked until real places exist: a corridor, its
> stops, and proof that a human being can actually stand at each one. This phase produces
> surveyed, verified boarding points for one Alexandria corridor.
>
> **Why this comes before routes.** A route is a sequence of stops. Drawing routes over
> unverified stops means re-drawing every route the first time a stop turns out to be on a
> flyover, behind a fence, or in front of a police checkpoint. Research R16 found under a third
> of Egyptian streets are in OpenStreetMap, so desk work alone cannot be trusted here.

---

## P2.1 — Spatial data model and the stop entity

**Implements:** CH04 (geography), DEC-040 (stop mapping), G-022
**Depends on:** P0.5 (PostGIS), P1.4 (authority resolver)

**WHAT**
Create the spatial schema: `service_area`, `stop`, `stop_photo`, `stop_verification`.

- `stop` carries `geog geography(Point,4326)`, `name_en`, `name_ar`, `status`
  (`draft | pending | verified | rejected | retired`), `created_by`, `source` (`desk | field`).
- `stop_verification` is an append-only audit row: who, when, from what device, with what photo,
  and the GPS accuracy reported at the moment of capture.
- A **GiST index** on `geog`. Without it every "stops near me" query is a sequential scan, and
  that query runs on the busiest screen in the product.
- Migration only, via `node-pg-migrate` (DEC-170). No ORM.

**HOW**
```bash
pnpm migrate create stops_and_service_areas
# write up/down SQL by hand, including CREATE INDEX ... USING GIST (geog)
pnpm migrate up
pnpm gen:types            # regenerate types from schema introspection
```

**TEST**
1. Insert two stops 300 m apart; a radius query at 500 m returns both, at 200 m returns one.
2. `EXPLAIN` on the radius query shows an **index scan**, not a sequential scan.
3. Inserting a stop with longitude 200 is rejected by a check constraint.
4. `stop_verification` rejects an `UPDATE` (append-only enforced by trigger or grant).
5. Generated types match the schema — CI drift check fails if they do not.

**BREAK**
- Drop the GiST index → the `EXPLAIN` test must fail on sequential scan. *(This is the check most
  likely to be written and never observed failing, because the query still returns correct rows.)*
- Insert lat 91 → constraint test must fail if the constraint is missing.
- Grant `UPDATE` on `stop_verification` → append-only test must fail.
- Hand-edit a generated type → drift check must fail.

**DONE**
- Migration runs up and **down** cleanly, twice in a row.
- All five tests pass and each has been observed failing.
- `pnpm verify` green.

**GAP RISK**
Without the index the product is fast in testing with 40 stops and unusable at 4,000. Without
append-only verification there is no defence when a stop's approval is later disputed.

---

## P2.2 — Stop Mapping Tool, desk mode (O-18)

**Implements:** DEC-040, screen O-18, DEC-160 (both modes)
**Depends on:** P2.1

**WHAT**
The internal web tool where an operations administrator places candidate stops on a map along a
corridor: click to place, name in both languages, set the walking-side of the road, mark as
`draft`, then submit to `pending`.

- Uses the commercial map provider behind the `MapProvider` interface (DEC-174). The interface is
  what the application imports; the provider is injected. Swapping provider must touch one file.
- Bulk import from a CSV of coordinates, because the first corridor will be surveyed on paper.
- Duplicate guard: placing a stop within `MinStopSpacing` metres of an existing one warns and
  requires an explicit override with a reason.

**TEST**
1. Placing a stop persists the exact coordinate, to 6 decimal places, unchanged by the round trip.
2. Placing a second stop 20 m from the first triggers the duplicate warning.
3. Overriding the warning writes the reason to the audit row.
4. CSV import of 50 rows creates 50 draft stops; a malformed row aborts the whole import
   (all-or-nothing), leaving zero rows.
5. A Support Agent calling the create endpoint is refused — and the tool is **not rendered** for
   that role at all (§8.1).

**BREAK**
- Make the CSV importer commit rows one at a time → test 4 must fail with partial data.
- Round coordinates to 4 decimals → test 1 must fail. *(4 decimals is ~11 m: enough to move a stop
  across a road, and invisible on a zoomed-out map.)*
- Give Support the permission → test 5 must fail.
- Remove the spacing check → test 2 must fail.

**DONE**
- An administrator places, names and submits a stop without touching a database.
- All five tests pass, each observed failing.

**GAP RISK**
Silent coordinate rounding is the dangerous one: it produces stops that look right on the map and
put passengers on the wrong side of a dual carriageway.

---

## P2.3 — Stop Mapping Tool, field mode (O-19)

**Implements:** DEC-160, screen O-19
**Depends on:** P2.2

**WHAT**
The mobile-web mode used standing at the kerb. Captures: device GPS with its **accuracy radius**,
a photo facing the boarding position, and answers to a short physical checklist — is there
somewhere to stand, is it lit, can a vehicle legally stop, is it reachable without crossing a
motorway.

- If GPS accuracy is worse than `MaxFixAccuracy`, the capture is **blocked**, not warned. A 60 m
  fix recorded as truth is worse than no record.
- Works offline: captures queue locally and upload when signal returns.

**TEST**
1. A capture with accuracy 8 m succeeds; a capture with accuracy 80 m is refused.
2. A queued capture taken offline uploads intact once connectivity returns, including its photo.
3. Uploading the same queued capture twice creates **one** row (idempotency key).
4. The photo is stripped of EXIF GPS before storage, and the authoritative coordinate is the
   measured one, not the photo's.
5. The checklist answers are all required; a partial submission is refused.

**BREAK**
- Remove the accuracy gate → test 1 must fail.
- Remove the idempotency key → test 3 must fail on a duplicate row.
- Disable EXIF stripping → test 4 must fail. *(A field surveyor's phone can embed a home address
  in a photo taken earlier the same day.)*
- Drop the offline queue → test 2 must fail.

**DONE**
- A surveyor with no signal records five stops and they all arrive, once each, on reconnection.

**GAP RISK**
Duplicated captures inflate coverage numbers and create phantom stops that riders will be sent to.

---

## P2.4 — Verification queue and the two-person rule (O-20)

**Implements:** screen O-20, DEC-040
**Depends on:** P2.3

**WHAT**
Desk review of field captures. A stop reaches `verified` only when a **different person** from the
one who captured it approves it, with the photo and checklist in view.

**TEST**
1. The capturing user cannot approve their own stop — the action is absent, not disabled.
2. A second administrator can approve it.
3. Rejection requires a reason; the reason reaches the original surveyor.
4. Only `verified` stops are returned by the public "stops near me" endpoint.
5. Retiring a stop that is used by a published route is refused with a clear message naming the route.

**BREAK**
- Allow self-approval → test 1 must fail.
- Return `pending` stops from the public endpoint → test 4 must fail. *(This is the leak that puts
  riders at an unverified kerb.)*
- Allow retiring a live stop → test 5 must fail.

**DONE**
- One corridor's stops move draft → pending → verified through two different accounts.

**GAP RISK**
Self-approval turns the two-person rule into paperwork. The public-endpoint leak is a safety issue.

---

## P2.5 — The launch corridor is surveyed

**Implements:** G-003, G-007, launch prerequisite
**Depends on:** P2.4

**WHAT**
Not code: the actual survey of the first Alexandria corridor, using the tool. Produces the real
boarding points the beta will run on, and a written note of the corridor's end-to-end drive time
measured at three times of day.

**TEST**
1. Every stop on the corridor is `verified`, by two people, with a photo.
2. No two stops are closer than `MinStopSpacing` without a recorded override reason.
3. Walking distance from each stop to the next is computed and stored.
4. The corridor's stop sequence, walked end to end, has no gap greater than `MaxStopGap`.

**DONE**
- A corridor exists in the database that a route can be drawn over with no further fieldwork.

**GAP RISK**
This is the point most likely to be skipped under time pressure, and the one that cannot be
recovered later: every route, every timetable and every demand estimate is built on it.

---

## PHASE 2 EXIT CRITERIA

| # | Criterion | Proved by |
|---|---|---|
| 1 | Spatial queries use the index | `EXPLAIN` in an automated test |
| 2 | Desk and field modes both produce stops | Two stops created by each path |
| 3 | No stop is verified by its own author | Automated test, observed failing |
| 4 | Only verified stops are public | Automated test, observed failing |
| 5 | One corridor fully surveyed | Query returns the full verified sequence |
| 6 | `pnpm verify` green | CI run |

---

# PHASE 3 — ROUTES, SLOTS AND THE CORE JOURNEY

> **Purpose.** The product becomes real. A passenger books a route ticket, walks to a verified
> stop, boards by code, and pays. A driver claims a published slot and runs the journey.
> One corridor, web only.
>
> This is the largest phase and the one where the route-ticket model (DEC-114) and the M3 supply
> model (DEC-132) either work or are exposed as wrong.

---

## P3.1 — Route and the ordered stop sequence

**Implements:** DEC-114 (route ticket), DEC-057, CH04
**Depends on:** P2.5

**WHAT**
`route` (name, both languages, `status`, `direction`), and `route_stop` — the **ordered** sequence
with `position`, plus the cumulative distance and expected running time to each stop.

- A route may only reference `verified` stops. Enforced by a foreign key **plus** a trigger that
  re-checks status, because a stop can be retired after the route is drawn.
- `position` is unique per route and gapless. A route with positions 1,2,4 is corrupt data that
  will silently break "next stop" logic.

**TEST**
1. Creating a route over an unverified stop is refused.
2. Retiring a stop used by a published route is refused (already tested in P2.4 — assert from this side too).
3. Positions are gapless: inserting position 4 when 3 is missing is refused.
4. Reordering stops rewrites positions atomically; a failure mid-way leaves the original order.
5. Cumulative distances are recomputed on reorder, and match a manual sum.

**BREAK**
- Remove the gapless constraint → test 3 must fail.
- Make reorder non-transactional → test 4 must fail with a corrupted sequence.
- Skip distance recomputation → test 5 must fail. *(Stale distances feed the timetable, which feeds
  every arrival estimate the rider sees.)*

**DONE**
- The surveyed corridor exists as a published route with a correct, gapless stop sequence.

**GAP RISK**
Position corruption is invisible until a driver's "next stop" shows a stop already passed.

---

## P3.2 — The timetable and the slot grid

**Implements:** DEC-132 (M3 supply), CH4a
**Depends on:** P3.1

**WHAT**
The operator publishes a **slot grid**: for each route, each service day, a set of departure times
with a required vehicle count. `slot` rows are generated from a recurrence rule, not hand-typed.

- Generation is **idempotent**: regenerating a week that already exists must not duplicate slots
  or orphan existing claims.
- Editing the grid for a future day is allowed; editing a day whose slots have claims requires an
  explicit confirmation naming the affected drivers.

**TEST**
1. Generating the same week twice produces the same slot count.
2. Regenerating a week with an existing claim preserves that claim.
3. A slot cannot be created in the past.
4. Removing a slot with a claim is refused without confirmation, and with confirmation notifies the driver.
5. Slot times respect the route's service window.

**BREAK**
- Make generation non-idempotent → test 1 must fail with doubled slots.
- Delete claims on regeneration → test 2 must fail. *(This is the bug that silently un-books every
  driver's week when an administrator fixes a typo.)*
- Allow past slots → test 3 must fail.

**DONE**
- A week of slots exists for the corridor; regenerating it changes nothing.

**GAP RISK**
Non-idempotent generation is the classic scheduling bug: it appears only on the second run.

---

## P3.3 — Slot claiming (D-11) and the commitment rule

**Implements:** DEC-132, INV-33, screen D-11
**Depends on:** P3.2, P1.8 (approved vehicle)

**WHAT**
A verified driver with an approved vehicle claims a slot in two taps. A claim carries
`committed: boolean` — the honesty flag behind INV-33. Subscriptions may only be sold against
committed claims.

- Claiming is **race-safe**: two drivers tapping the same last slot at the same instant must
  produce one claim and one clear refusal. Enforced in the database (unique constraint plus
  `SELECT ... FOR UPDATE` or an atomic conditional insert), never in application code alone.
- Releasing a claim inside `ClaimLockWindow` before departure is refused or penalised per config.

**TEST**
1. Two concurrent claims on a one-vehicle slot: exactly one succeeds. Run it 100 times in parallel.
2. A driver with expired documents cannot claim (ties to P1.7).
3. A driver without an approved vehicle cannot claim.
4. Releasing outside the lock window succeeds; inside it is refused.
5. A claim on a full slot is refused with a specific error, not a generic 500.

**BREAK**
- Move the uniqueness check into application code before the insert → test 1 must fail under
  concurrency. *(It will pass every single-threaded test. This is the check that must be observed
  failing or it means nothing.)*
- Let an expired driver claim → test 2 must fail.
- Remove the lock window → test 4 must fail.

**DONE**
- 100 parallel claim attempts on one seat yield exactly one claim, proved by a repeatable script.

**GAP RISK**
Double-claimed slots mean two vehicles on one departure and none on the next.

---

## P3.4 — Search: routes near a rider (R-11)

**Implements:** DEC-120 step 1, screen R-11
**Depends on:** P3.1

**WHAT**
Given a rider position, return routes whose stops fall within walking distance, ranked by walk
time then departure proximity. Backed by the GiST index from P2.1.

**TEST**
1. A rider 200 m from a corridor stop sees that route; a rider 5 km away does not.
2. Results are ordered by walking distance ascending.
3. Response time under 300 ms with 5,000 stops seeded.
4. Only published routes and verified stops appear.
5. A rider with location denied gets a usable search-by-name path, not an error screen.

**BREAK**
- Drop the index → test 3 must fail on latency.
- Include draft routes → test 4 must fail.
- Remove the no-location fallback → test 5 must fail. *(Location permission is denied far more
  often in practice than designs assume.)*

**DONE**
- Search returns correct, ordered, fast results on a seeded 5,000-stop database.

---

## P3.5 — Boarding point selection (R-12)

**Implements:** DEC-120 step 2, DEC-140 (boarding fixed), screen R-12
**Depends on:** P3.4

**WHAT**
For a chosen route, list the boarding points with walk time, mark the recommended one, and show
closed ones as **disabled with a reason** — this is a temporary, factual state, not a permission
matter, so disabling is correct here and hiding would be wrong (§8.1).

Plus the street-pickup option at its own fare (DEC-063/067).

**TEST**
1. Walk times are computed from the real position, not straight-line, and differ from crow-flight.
2. A closed stop is disabled, states why, and cannot be selected (attribute and behaviour).
3. The recommended stop is the shortest walk among open stops.
4. Street pickup shows the correct fare difference.

**BREAK**
- Substitute straight-line distance → test 1 must fail. *(Crow-flight across a rail line or the
  Corniche is a walk that does not exist.)*
- Style the closed stop without the disabled attribute → test 2 must fail.

**DONE**
- Selecting a boarding point on the real corridor produces plausible walk times.

---

## P3.6 — Departure selection, seat inventory and the booking (R-13, R-14)

**Implements:** DEC-115 (flat fare), DEC-056 (price locked), screens R-13/R-14
**Depends on:** P3.3, P3.5

**WHAT**
Show departures for the route with remaining seats. Booking decrements inventory atomically and
locks the fare at the moment of booking.

- Overselling is prevented in the **database**, by the same discipline as P3.3.
- The price stored on the booking is the price shown. A later fare change never rewrites it.

**TEST**
1. 20 concurrent bookings on 14 seats: exactly 14 succeed, 6 refused cleanly. Repeat 50 times.
2. A fare change after booking does not alter the booked price.
3. Booking 2 seats decrements by 2.
4. A cancelled booking returns its seats to inventory.
5. Seat counts shown to the rider match the database at the moment of render.

**BREAK**
- Check inventory in application code before insert → test 1 must fail under concurrency.
- Join the fare live instead of storing it → test 2 must fail. *(This is the bug that charges a
  rider more than the screen promised, and it is a legal problem as well as a trust one.)*
- Skip the cancellation return → test 4 must fail.

**DONE**
- The corridor cannot be oversold under parallel load, proved by a repeatable script.

**GAP RISK**
Overselling puts a paying passenger at a kerb with no seat. It is the single worst failure in the
booking path.

---

## P3.7 — Payment: wallet, cash and the ledger

**Implements:** CH06 (money), DEC-078 (cash), DEC-170
**Depends on:** P3.6

**WHAT**
A **double-entry ledger**. Every movement is two rows that sum to zero. Wallet top-up via the
payment provider, fare capture at booking, cash marked collected by the driver, refunds, and
driver payout accrual.

- No balance is ever stored as a mutable number that is added to. Balance is derived from the
  ledger, and may be cached only in a way that is recomputable and checked.
- Provider webhooks are idempotent and signature-verified.

**TEST**
1. Every transaction's rows sum to zero — asserted across the whole table, not per test case.
2. Replaying a provider webhook five times produces one ledger effect.
3. A webhook with a bad signature is rejected.
4. Derived balance equals the sum of ledger rows for 1,000 random generated histories (property test).
5. A refund cannot exceed the original capture.
6. Concurrent top-up and booking leave a correct balance.

**BREAK**
- Store balance as a mutable column and add to it → test 4 must fail on drift.
- Remove webhook idempotency → test 2 must fail with five credits. *(Payment providers retry by
  design; this will happen in production in the first week.)*
- Accept unsigned webhooks → test 3 must fail. *(Anyone who learns the URL can credit themselves.)*
- Allow over-refund → test 5 must fail.

**DONE**
- A rider tops up, books, cancels and is refunded, with a ledger that balances to zero throughout.

**GAP RISK**
A mutable balance column drifts under concurrency and the drift is discovered by a customer, not
by the team.

---

## P3.8 — Boarding: the code, the scan, the manifest (R-21, D-20, D-21)

**Implements:** DEC-136 (numeric fallback), screens R-21/D-20/D-21
**Depends on:** P3.6

**WHAT**
The rider's boarding code (QR plus a 6-digit human-readable fallback), the driver's manifest, and
the scan that marks a passenger boarded.

- Codes are single-use per journey, time-bounded, and unguessable (not sequential).
- The numeric fallback exists because scanning fails: cracked screens, sunlight, dead battery.
- Manual code entry is rate-limited to defeat guessing.

**TEST**
1. A code scans once; the second scan is refused as already boarded.
2. A code for a different journey is refused.
3. A code outside its time window is refused.
4. Codes are not sequential or predictable across 1,000 generated bookings.
5. Manual entry locks out after `MaxCodeAttempts`.
6. The manifest lists exactly the booked passengers for that departure.

**BREAK**
- Make codes sequential → test 4 must fail. *(Sequential codes mean a passenger can guess the next
  one and ride free, and worse, board a journey they did not book.)*
- Allow re-scan → test 1 must fail.
- Remove rate limiting → test 5 must fail.

**DONE**
- A full boarding cycle runs: rider shows code, driver scans, manifest updates.

---

## P3.9 — The live journey, schedule adherence and alighting (D-20, R-22)

**Implements:** DEC-119 (schedule adherence), DEC-117 (alighting signal), INV-33
**Depends on:** P3.8

**WHAT**
Journey state machine: `claimed → boarding → in_progress → completed`, with vehicle position,
next-stop computation, and the schedule-slip calculation that is the fairness rule (DEC-119).

- `MaxScheduleSlip` is the governing constraint: no pickup or deviation may push the vehicle
  further behind the published timetable than this.
- The rider's "I'm getting off next" signal (DEC-117) reaches the driver's screen.

**TEST**
1. State transitions are legal only in order; `completed → boarding` is refused.
2. Schedule slip is computed correctly against the timetable for a seeded journey.
3. A pickup that would exceed `MaxScheduleSlip` is not offered.
4. The alighting signal appears on the driver's manifest within the expected interval.
5. A journey abandoned mid-route can be closed by operations with a reason, and passengers are notified.
6. Position updates from a driver not on that journey are rejected.

**BREAK**
- Allow any state transition → test 1 must fail.
- Invert the slip comparison → test 3 must fail by offering the pickup. *(A sign error here is
  invisible in review and destroys the timetable in production.)*
- Accept unauthenticated position updates → test 6 must fail.

**DONE**
- A complete journey runs end to end on the corridor with correct slip reporting.

**GAP RISK**
Schedule adherence is the promise that distinguishes this product from an ordinary microbus. If it
is computed wrongly, the product's core claim is false.

---

## P3.10 — Rider journey screens end to end (R-15, R-20, R-22, R-23)

**Implements:** screens R-15, R-20, R-22, R-23
**Depends on:** P3.9

**WHAT**
Wire the approved GUI to the live API: confirmation, waiting (the anxiety screen), on board, and
completion with rating.

- The waiting screen degrades honestly: when position is stale, it says so rather than showing a
  confident old number.

**TEST**
1. Stale position shows a stale state, not a stale number presented as current.
2. The arrival estimate updates as the vehicle moves.
3. Cancellation from the waiting screen applies the correct fee per the window.
4. Rating submits once; a second submission is refused.
5. Every screen renders correctly in Arabic RTL.

**BREAK**
- Show the last known ETA with no staleness check → test 1 must fail. *(A frozen "2 min" is the
  single most trust-destroying thing this screen can do.)*
- Apply the wrong cancellation window → test 3 must fail.

**DONE**
- A rider completes a full booking-to-rating cycle against the real API, in both languages.

---

## PHASE 3 EXIT CRITERIA

| # | Criterion | Proved by |
|---|---|---|
| 1 | Seats cannot be oversold | 50× parallel test |
| 2 | Slots cannot be double-claimed | 100× parallel test |
| 3 | Ledger always balances | Whole-table assertion + property test |
| 4 | Booked price never changes | Automated test, observed failing |
| 5 | Boarding codes are single-use and unguessable | Automated test |
| 6 | Schedule slip is correct | Seeded journey test |
| 7 | A real end-to-end journey has run on the corridor | Manual run, recorded |
| 8 | `pnpm verify` green | CI run |

---

# PHASE 4 — SAFETY AND SUPPORT

> **Purpose.** A passenger in difficulty reaches a person. An unsafe driver can be removed
> quickly. Every action taken on a person's behalf is attributable.
>
> **Why here and not later.** The first real passengers arrive at the end of Phase 3. Safety
> cannot trail live passengers.

---

## P4.1 — SOS and the incident record (R-61, O-15)

**Implements:** CH12, screens R-61/O-15, G-044
**Depends on:** P3.9

**WHAT**
The SOS path: rider or driver raises an alarm; an incident row is created with journey, position,
vehicle and time; operations sees it at the top of the queue immediately.

- SOS must work when the app is in a bad state. It does not depend on the journey screen having
  loaded correctly.
- Raising SOS never requires more than one confirmation.

**TEST**
1. SOS creates an incident within 2 seconds, carrying journey, vehicle and position.
2. SOS works with a stale or failed journey fetch.
3. The incident appears in the operations queue ranked above all other work.
4. An incident cannot be deleted, only resolved with a reason.
5. Duplicate SOS from the same person within a short window creates one incident, not many.

**BREAK**
- Make SOS depend on a successful journey load → test 2 must fail. *(The moment a passenger most
  needs SOS is the moment the network is worst.)*
- Allow incident deletion → test 4 must fail.
- Rank incidents by age only → test 3 must fail.

**DONE**
- An SOS raised on a phone reaches an operations screen in under 2 seconds.

**GAP RISK**
An SOS that depends on healthy application state is an SOS that fails when it matters.

---

## P4.2 — Trip sharing and emergency contacts (R-60)

**Implements:** CH12 §12.1, screen R-60
**Depends on:** P3.10

**WHAT**
A shareable read-only link showing live journey status to someone outside the app.

- The link is **capability-scoped**: it reveals the journey and vehicle, never the rider's account,
  phone, history or other trips.
- It expires when the journey ends plus a grace period.

**TEST**
1. The link shows journey status without authentication.
2. The link exposes no personal data beyond first name — assert the whole response body.
3. The link is dead after expiry.
4. Guessing another journey's link is infeasible (unguessable token, not an incrementing id).
5. Revoking the share kills the link immediately.

**BREAK**
- Return the full rider object → test 2 must fail. *(The natural implementation returns the journey
  with its rider relation attached, and leaks a phone number to anyone with the link.)*
- Use a sequential token → test 4 must fail.
- Skip expiry → test 3 must fail.

**DONE**
- A shared link works for a family member and reveals nothing else.

---

## P4.3 — Support lookup, actions and their limits (S-11, S-13)

**Implements:** screens S-11/S-13, §8.1, §8.2
**Depends on:** P3.7

**WHAT**
The support workspace: find a rider by phone or reference, see the active journey, and take
bounded actions — contact, cancel, refund up to one fare, escalate.

- Identity documents are **not rendered** for this role. Not disabled — absent (§8.1).
- The refund cap is enforced server-side. A client-side cap is decoration.
- Every action writes an attributable audit row.

**TEST**
1. A support agent cannot retrieve identity documents by any route, including direct API call.
2. A refund above one fare is refused by the API even when the client is bypassed.
3. Every support action writes an audit row naming the agent.
4. Support cannot alter fares or routes.
5. Escalation moves the ticket and notifies operations.

**BREAK**
- Enforce the refund cap only in the UI → test 2 must fail when called directly. *(This is §7.0's
  "test that cannot reach the bug": testing through the UI alone would pass.)*
- Grant document access → test 1 must fail.
- Skip the audit row → test 3 must fail.

**DONE**
- A support agent resolves a double-charge complaint end to end, fully attributably.

**GAP RISK**
Client-side-only limits are the most common authority failure and the easiest to miss, because
every manual test goes through the client.

---

## P4.4 — Driver standards, ratings and removal

**Implements:** DEC-138 (rating threshold), G-056, CH12
**Depends on:** P3.10

**WHAT**
Rolling rating over the last N journeys, the poor-rating threshold, automatic flagging, and the
suspension path with human review.

- Suspension is **never fully automatic**: the system flags, a person decides. An automated
  livelihood decision with no appeal is not acceptable.
- Records the account-sharing risk (G-056, DEC-157: no periodic face match) as an accepted,
  monitored gap with an alert on its proxy signals.

**TEST**
1. The rolling average uses exactly the last N journeys.
2. Crossing the threshold flags but does not suspend.
3. Suspension requires a named administrator and a reason.
4. A suspended driver cannot claim slots or start journeys.
5. A suspended driver's future claims are released and the affected riders notified.

**BREAK**
- Auto-suspend on threshold → test 2 must fail.
- Leave claims in place on suspension → test 5 must fail. *(Otherwise a suspended driver's slots
  stay claimed and those departures silently have no vehicle.)*
- Use lifetime average instead of rolling → test 1 must fail.

**DONE**
- A driver crossing the threshold is flagged, reviewed, suspended, and their slots released.

---

## PHASE 4 EXIT CRITERIA

| # | Criterion | Proved by |
|---|---|---|
| 1 | SOS works in degraded conditions | Test with journey fetch failing |
| 2 | Share links leak nothing | Whole-body assertion |
| 3 | Role limits hold against direct API calls | Tests bypassing the client |
| 4 | Suspension releases claims and notifies riders | Automated test |
| 5 | `pnpm verify` green | CI run |

---

# PHASE 5 — COMMERCIAL CONTROL

> **Purpose.** A manager changes a price, runs a promotion and fills an empty departure without
> an engineer. **No surge, ever** (DEC-113).

---

## P5.1 — Fare management with preview and attribution (G-13, G-14)

**Implements:** DEC-062, DEC-113, CH6a, screens G-13/G-14
**Depends on:** P3.7

**WHAT**
Fare editing with a **preview against recent journeys** before publishing, an effective-from time,
and full attribution. Temporary price changes are time-boxed and revert automatically.

**TEST**
1. Preview reports the revenue effect on the last N journeys without changing anything.
2. Publishing records who, when, why, and the previous value.
3. Existing bookings keep their locked price (re-assert P3.6 from this side).
4. A temporary change reverts automatically at its end time.
5. No code path exists that multiplies a fare by a demand factor — asserted by a code check, not
   only a runtime test.

**BREAK**
- Let preview write → test 1 must fail.
- Remove the auto-revert job → test 4 must fail. *(A "temporary" 20% increase that never reverts
  is the exact behaviour DEC-113 exists to prevent.)*
- Add a surge multiplier → the static check in test 5 must fail.

**DONE**
- A manager changes a fare with preview and attribution, and a temporary change reverts on time.

---

## P5.2 — Promotions and flash sales (G-15)

**Implements:** DEC-060, DEC-082, screen G-15
**Depends on:** P5.1

**WHAT**
Time-boxed, budget-capped promotions targeted at a route and window, used to fill known-empty
departures.

**TEST**
1. A promotion applies only inside its window and route.
2. The budget cap stops redemption at the cap under concurrent use.
3. One promotion per booking; stacking is refused.
4. Redemption is attributable and reversible.
5. An expired promotion is not applied even if the code is replayed.

**BREAK**
- Check the budget non-atomically → test 2 must fail under concurrency. *(Budget overrun is a
  direct cash loss and only appears under load.)*
- Allow stacking → test 3 must fail.

**DONE**
- A flash sale fills a known-empty departure and stops exactly at its budget.

---

## P5.3 — Coverage board and the claim bonus (G-11)

**Implements:** DEC-132, CH4a §4a.6, screen G-11
**Depends on:** P3.3

**WHAT**
The manager's view of slots short of drivers, with the ability to attach a claim bonus to a
specific slot — the supply-side lever that replaces surge.

**TEST**
1. Shortfall is computed correctly against required vehicle counts.
2. A bonus attaches to one slot and is visible to eligible drivers only.
3. The bonus is paid on completion, not on claim.
4. Removing a bonus after a claim honours the claim.

**BREAK**
- Pay on claim → test 3 must fail. *(Paying on claim invites claim-and-cancel farming.)*
- Retroactively remove a bonus → test 4 must fail.

**DONE**
- A short slot is filled by attaching a bonus, and the bonus pays on completion.

---

## PHASE 5 EXIT CRITERIA

| # | Criterion | Proved by |
|---|---|---|
| 1 | No surge path exists | Static code check |
| 2 | Temporary changes revert | Automated test |
| 3 | Promotion budgets hold under concurrency | Parallel test |
| 4 | Bonuses pay on completion | Automated test |
| 5 | `pnpm verify` green | CI run |

---

# PHASE 6 — RECURRING TRAVEL

> **Purpose.** The commuter case. Someone travelling the same corridor daily buys once and stops
> thinking about it. This is the retention mechanism and the revenue predictability mechanism.

---

## P6.1 — Subscription products and the honesty rule (R-50, R-51)

**Implements:** DEC-130, INV-33, screens R-50/R-51
**Depends on:** P3.3, P3.7

**WHAT**
Subscription products (a number of rides on a route over a period), sold **only** against slots
whose claims are `committed = true` (INV-33). Selling a subscription against uncommitted supply is
selling a promise the operator cannot keep.

**TEST**
1. A subscription cannot be sold for a route whose relevant slots lack committed claims.
2. Ride consumption decrements the correct entitlement.
3. Expiry stops consumption at the period end.
4. A subscription cannot go negative under concurrent bookings.
5. Refund on cancellation is pro-rated correctly.
6. If committed supply disappears after sale, existing subscribers are protected and notified.

**BREAK**
- Sell against uncommitted slots → test 1 must fail. *(This is INV-33; violating it means selling a
  month of travel on a corridor that may have no driver next Tuesday.)*
- Make decrement non-atomic → test 4 must fail under concurrency.
- Skip pro-rating → test 5 must fail.

**DONE**
- A commuter buys a month, rides daily, and the entitlement tracks exactly.

**GAP RISK**
This is the point where a business quietly sells more than it can deliver.

---

## P6.2 — Recurring bookings and the daily reservation

**Implements:** CH03, DEC-130
**Depends on:** P6.1

**WHAT**
A subscriber's seat is reserved automatically on their pattern, with a hold-and-release rule so
that unused reserved seats return to inventory in time to be sold.

**TEST**
1. Seats are reserved on the pattern's days only.
2. An unclaimed reservation releases at `ReservationReleaseWindow` and becomes bookable.
3. A released seat that the subscriber then wants is handled without double-allocation.
4. Public holidays and pattern exceptions are respected.
5. Reservation does not oversell (re-assert P3.6 under this new path).

**BREAK**
- Never release unused reservations → test 2 must fail. *(Every subscriber who oversleeps
  permanently removes a sellable seat.)*
- Allow reservation to bypass inventory → test 5 must fail.

**DONE**
- A subscriber's week runs automatically, with unused seats returning to sale.

---

## PHASE 6 EXIT CRITERIA

| # | Criterion | Proved by |
|---|---|---|
| 1 | INV-33 holds — no sale against uncommitted supply | Automated test, observed failing |
| 2 | Entitlements never go negative | Parallel test |
| 3 | Unused reservations return to inventory | Automated test |
| 4 | `pnpm verify` green | CI run |

---

# PHASE 7 — MOBILE APPLICATIONS (ANDROID APK)

> **Purpose.** Ship a real Android APK for riders and drivers, with the driver application working
> through the long signal gaps that Alexandria's corridors actually have.
>
> ## Departure from the specification, recorded (§0 item 5)
>
> `DEC-085` and `DEC-015` specified **Expo / React Native** at `/apps/mobile`. This phase uses
> **Capacitor** instead, wrapping the existing web application. Superseded as **DEC-176**.
>
> **Reason.** The product is lists, forms, a map and a scanner. React Native would mean building
> and then maintaining every rider and driver screen a second time, and every future change twice.
> Capacitor gives a real APK with real native access — camera, GPS, push, background tasks, secure
> storage — from the single UI already approved. The cost is that the UI is web-rendered rather
> than composed of native widgets, which for this product's screens is not a difference users can
> identify.
>
> **What would reverse this decision:** if background location on Android proves unreliable through
> Capacitor for the driver's all-day journey tracking (P7.4), the driver app — and only the driver
> app — moves to React Native. The rider app stays on Capacitor either way. This is why P7.4 is
> placed early and has the harshest tests in the phase.

---

## P7.1 — Capacitor shell and the one-codebase rule

**Implements:** DEC-176 (supersedes DEC-085 mobile clause), DEC-015
**Depends on:** P3.10

**WHAT**
Add Capacitor to the monorepo at `/apps/mobile`, wrapping the web build. Android platform only for
now; the iOS folder is created but not shipped.

- The web app must remain a working web app. The mobile build is a **target**, not a fork. There is
  no `if (isMobile)` branching of screens — only capability adapters behind interfaces.
- A `Platform` interface abstracts camera, GPS, storage, push and share. The web implementation
  uses browser APIs; the native implementation uses Capacitor plugins. Screens import the
  interface, never a plugin.

**HOW**
```bash
pnpm add -w @capacitor/core @capacitor/cli
pnpm cap init && pnpm cap add android
pnpm build:web && pnpm cap sync android
pnpm cap run android
```

**TEST**
1. `scripts/check-platform-boundary.sh` asserts **no** screen or feature file imports
   `@capacitor/*` directly — only `packages/platform` may.
2. The web build still runs in a browser with every screen functional.
3. The APK builds from a clean checkout in CI.
4. The same screen file renders on web and in the APK with no platform conditional inside it.
5. Removing the native layer leaves a working web app.

**BREAK**
- Import `@capacitor/camera` inside a screen → the boundary check must fail. *(Without this check,
  plugin imports spread through the UI within a week and the web build breaks silently.)*
- Add a platform conditional inside a screen → test 4 must fail.

**DONE**
- One APK installs and runs; the web app is unaffected; the boundary check is enforced in CI.

**GAP RISK**
Without the boundary check, "one codebase" degrades into two codebases sharing a folder.

---

## P7.2 — Offline-first driver storage and the outbox

**Implements:** DEC-099 (offline-first driver), CH08a
**Depends on:** P7.1

**WHAT**
The driver application's local database and **outbox**: every action taken offline is written
locally, queued, and replayed in order when connectivity returns.

- Every queued action carries an **idempotency key**, so replay is safe.
- The queue is **ordered and durable**: it survives app kill, phone restart and battery death.
- Conflicts are resolved by explicit rules, never by last-write-wins on the whole row.

**TEST**
1. Twenty actions taken in airplane mode all arrive, once each, in order, after reconnection.
2. Killing the app mid-queue loses nothing.
3. Replaying the entire queue twice produces one server effect per action.
4. A server-side conflict surfaces to the driver rather than being silently discarded.
5. The queue survives a device restart.
6. A queued action older than `MaxOutboxAge` is surfaced for review, not silently dropped.

**BREAK**
- Hold the queue in memory → tests 2 and 5 must fail. *(In-memory queues pass every test performed
  without killing the process, which is every test performed by hand.)*
- Remove idempotency keys → test 3 must fail with duplicates.
- Discard conflicts silently → test 4 must fail.

**DONE**
- A driver runs a full journey in airplane mode; everything reconciles exactly once on reconnection.

**GAP RISK**
This is the highest-risk point in the whole plan. Duplicate boarding or duplicate cash records
corrupt the ledger, and the corruption is discovered days later.

---

## P7.3 — Camera scanning and the numeric fallback

**Implements:** DEC-136, screen D-21
**Depends on:** P7.1

**WHAT**
Native camera QR scanning with the 6-digit manual fallback always one tap away.

**TEST**
1. A valid code scans and boards the passenger.
2. Scanning works in low light and with a cracked-screen sample image, or fails over to manual.
3. The manual path is reachable within one tap at all times.
4. Scanning offline queues the boarding through the outbox (P7.2).
5. Camera permission denied leaves a fully usable manual path, not a blocked screen.

**BREAK**
- Hide the manual entry behind a menu → test 3 must fail.
- Make boarding require network → test 4 must fail. *(Boarding happens at the kerb, which is
  exactly where signal is worst.)*
- Block the screen on permission denial → test 5 must fail.

**DONE**
- A driver boards passengers by scan and by keypad, online and offline.

---

## P7.4 — Background location for the live journey

**Implements:** CH08, DEC-099 — **the decision point for DEC-176**
**Depends on:** P7.2

**WHAT**
Continuous position reporting during an active journey, surviving screen lock and app backgrounding
for a multi-hour shift, with a foreground-service notification as Android requires.

- Battery budget is a requirement, not an afterthought: a driver whose phone dies at 14:00 is
  offline for the evening peak.
- Positions batch and compress; they are not one request per fix.

**TEST**
1. Position reports continue for 2 hours with the screen locked.
2. Reports survive the app being backgrounded and the device sleeping.
3. Battery consumption over 2 hours is within `MaxBatteryBudget`.
4. Aggressive Android battery optimisation is detected and the driver is told how to exempt the app.
5. Position gaps are visible to operations rather than interpolated into a smooth fiction.
6. Reporting stops completely when no journey is active — no background tracking off-shift.

**BREAK**
- Interpolate across gaps → test 5 must fail. *(A smooth invented line on the operations map is
  worse than a visible gap: it is a confident lie about where a vehicle is.)*
- Continue tracking off-shift → test 6 must fail. This is a privacy requirement, not a preference.
- Report each fix individually → test 3 must fail on battery.

**DONE**
- A 2-hour locked-screen shift reports continuously within budget on a mid-range Android device.

**DECISION GATE**
If tests 1–3 cannot be met through Capacitor after genuine effort, the driver application moves to
React Native and this is recorded as a new decision with its evidence. The rider application does
not move.

---

## P7.5 — Push notifications

**Implements:** DEC-147 (push only, no SMS fallback), G-055, CH20
**Depends on:** P7.1

**WHAT**
Firebase Cloud Messaging through the `Platform` interface, implementing the CH20 notification
catalogue with its three tiers and caps.

- G-055 is an accepted risk: there is no SMS fallback, so a rider may miss "vehicle arrived". The
  mitigation is the cached-schedule local alarm, which must therefore actually work offline.

**TEST**
1. Each notification tier respects its cap from CH19.
2. The local cached-schedule alarm fires with no network at all.
3. Notification permission denied still leaves the local alarm working.
4. No notification contains personal data in its preview text.
5. Tapping a notification deep-links to the correct screen and state.

**BREAK**
- Make the alarm server-driven → test 2 must fail. *(The alarm exists precisely for the case where
  push did not arrive.)*
- Put the rider's name and phone in preview text → test 4 must fail; a lock screen is public.
- Ignore the tier caps → test 1 must fail.

**DONE**
- A rider with notifications denied and no signal is still warned by the local alarm.

---

## P7.6 — Release build, signing and distribution

**Implements:** launch prerequisite
**Depends on:** P7.1–P7.5

**WHAT**
A signed release APK and an AAB for Play, reproducible from CI, with the signing key held in the
platform secret store and never in the repository.

**TEST**
1. `scripts/check-secrets.sh` finds no keystore, password or service-account JSON in the tree or in
   git history.
2. The release build is reproducible from a clean checkout.
3. The APK installs on a clean device and completes a booking.
4. ProGuard/R8 minification does not break any screen — smoke test over every route on device.
5. Version code and name are derived from one source, not typed in two files.

**BREAK**
- Commit a dummy keystore → the secret check must fail, including when only in history.
- Enable minification without keeping required classes → test 4 must fail on a broken screen.
- Hardcode the version in a second place → test 5 must fail.

**DONE**
- A signed APK is produced by CI, installs, and completes a real booking.

---

## PHASE 7 EXIT CRITERIA

| # | Criterion | Proved by |
|---|---|---|
| 1 | One codebase — no plugin imports in screens | Boundary check in CI |
| 2 | Offline actions reconcile exactly once | Airplane-mode test with app kill |
| 3 | Background location survives 2 hours locked | On-device measurement |
| 4 | Local alarm works with no network | On-device test |
| 5 | No secrets in tree or history | Secret scan |
| 6 | Signed APK completes a booking | Manual run on a clean device |

---

# PHASE 8 — VALIDATION AND LAUNCH

> **Purpose.** Set the parameters with evidence rather than guesswork, prove the corridor works
> with real strangers, and open it.

---

## P8.1 — Simulation to set the configuration defaults

**Implements:** CH19 (65+ config keys), G-045, R22 (cold-start estimation)
**Depends on:** P3.9

**WHAT**
A simulation harness that replays synthetic demand against the real matching and scheduling code —
not a reimplementation of it — to set defaults for `MaxScheduleSlip`, `MinStopSpacing`,
batching window, reservation release window and the rest.

- Research R22 is explicit that historical models cannot estimate ridership for a new route. The
  corridor-yield formula (`population × trip rate × capture rate × coverage`) is calibrated against
  a known corridor to ±10–20% and used as a **range**, never a point estimate.

**TEST**
1. The simulation drives the production scheduling code path, proved by instrumenting it.
2. Results are deterministic for a fixed seed.
3. Each recommended default is accompanied by the sensitivity curve that justifies it.
4. Extreme inputs (zero demand, triple demand) do not crash the scheduler.
5. Every CH19 key with a simulated default records its evidence in the configuration catalogue.

**BREAK**
- Point the simulation at a copy of the algorithm → test 1 must fail. *(A simulation of a
  reimplementation validates nothing, and this is the most common way simulation effort is wasted.)*
- Introduce nondeterminism → test 2 must fail.

**DONE**
- Every tunable default is either simulated with evidence or explicitly marked as a guess to be
  revisited after beta.

---

## P8.2 — Load and failure rehearsal

**Implements:** CH18 (12 failure procedures), DEC-164
**Depends on:** P7.6

**WHAT**
Load test the booking path at the projected peak with headroom, and rehearse each of the twelve
CH18 failure procedures against the real deployment.

**TEST**
1. Peak booking load sustained with latency within target and zero oversells.
2. Database failover: the replica takes over and the documented restore drill completes.
3. Payment provider outage degrades to cash without losing bookings.
4. Map provider outage degrades to the cached route and stop list.
5. A restore from backup produces a working system, timed and recorded (DEC-164 monthly drill).
6. Railway spending-limit shutdown (R19.1) is rehearsed: alerting fires before the limit.

**BREAK**
- Remove the oversell guard and run the load test → test 1 must fail. *(Oversell only appears under
  concurrency; this is the test that proves the P3.6 guards hold at real load.)*
- Break the restore path → test 5 must fail. An unrehearsed backup is not a backup.

**DONE**
- Every CH18 procedure has been executed at least once, with its timing recorded.

**GAP RISK**
R19.1 found Railway's database templates are unmanaged and that a hard spending limit can take
workloads offline. Both must be rehearsed, not assumed.

---

## P8.3 — Closed beta on the corridor

**Implements:** DEC-161, G-053, G-031, G-025, G-036
**Depends on:** P8.1, P8.2

**WHAT**
A limited real-passenger trial on the surveyed corridor with instrumentation on every accepted
risk: alighting-signal usage (G-053), cancellation harshness (G-031), selling every seat (G-025),
and the fairness weight sitting at zero (G-036).

**TEST / MEASURE**
1. Schedule adherence against the published timetable.
2. Alighting-signal usage rate — determines whether utilisation assumptions hold.
3. Cancellation rate and its distribution across the fee windows.
4. Complaint categories, and how many needed a human.
5. Driver claim behaviour: which slots fill, which never do.
6. The "approaching your area" message effect (deferred measurement, DEC-161).

**DONE**
- The beta meets its pre-declared exit criteria, or the reasons it did not are written down before
  any decision to launch.

**GAP RISK**
Declaring exit criteria after seeing the results is the way a failed beta becomes a launch.

---

## P8.4 — Launch readiness review

**Implements:** §0, the whole plan
**Depends on:** all

**WHAT**
The final line-by-line comparison (§0.1) against the specification and this plan.

**CHECKLIST**
1. Every point in this plan is DONE or a tracked gap with an owner. No third state.
2. Every check in the repository has been observed failing — the break inventory is complete.
3. Every accepted risk (G-025, G-031, G-036, G-053, G-055, G-056) has instrumentation in production.
4. Every deliberate departure from an industry norm is written down with its reason
   (DEC-170 no ORM, DEC-174 commercial maps, DEC-176 Capacitor, QR ink not themed).
5. `pnpm verify` green, CI green, restore drill passed within the month.
6. On-call rota and escalation tree exist and have been tested with a real page.
7. No secret in the tree or in git history.

**DONE**
- The corridor opens to the public.

---

## PHASE 8 EXIT CRITERIA

| # | Criterion | Proved by |
|---|---|---|
| 1 | Defaults are evidence-based or marked as guesses | Configuration catalogue review |
| 2 | All 12 failure procedures rehearsed | Recorded timings |
| 3 | Restore drill passed | Timed, recorded |
| 4 | Beta met pre-declared criteria | Written comparison |
| 5 | Every accepted risk instrumented | Dashboard exists |

---

# APPENDIX — DECISIONS MADE BY THIS PLAN

| ID | Decision | Supersedes | Reason |
|---|---|---|---|
| **DEC-176** | Android APK built with **Capacitor** wrapping the web app | the mobile clause of DEC-085 | One UI codebase. The product is lists, forms, a map and a scanner; native widgets buy nothing users can identify, and cost every screen twice. Reversible for the driver app only, at the P7.4 gate. |
| **DEC-177** | **One private monorepo**; public repository only when and if the owner chooses | — | Nothing leaks while the product is unbuilt. `_working_docs/`, thinking files and audits are git-ignored from any future public push, per the GitHub Upload Law §1.2. |
| **DEC-178** | Profile identity and wallet balance are **pinned in the top bar** on rider root screens | — | Balance drives the decision to book; it should not require scrolling or a trip to another screen. Both halves are controls, not decoration. |

## Gaps closed by this plan

- **G-058** — Phases 2–8 written. Closed.
- **G-059** — Driver recommendation display: resolved in the GUI as *a number with its evidence*
  ("12 riders searched this slot yesterday"), which satisfies both the request for a single figure
  and §8's prohibition on decorative placeholder functionality. Enforced by an automated test.

## Gaps still open

- **G-057** — Alexandria OSM survey, deferred by DEC-174. Returns only if self-hosted OSRM is
  adopted for matrix volume.
- **G-056** — No periodic driver face match (DEC-157). Accepted; instrumented in P4.4.
- **G-055** — Push-only with no SMS fallback (DEC-147). Accepted; mitigated by the local alarm in P7.5.
- Product name (DEC-128) — the app currently ships the placeholder **Sekka**. No trademark check
  has been done. This blocks the Play Store listing, not development.
