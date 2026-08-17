# Checklists — how we prove work is finished

This folder is the project's **completion ledger**. One file per milestone; one
checkbox per atomic requirement. A box is ticked **only when a command has
proved it** (§0.1) — never when the code "looks right".

## How to read a box

- `[x]` — done, with proof recorded in `IMPLEMENTATION_LOG.md` (files, commands, output).
- `[ ]` — not started.
- `[~]` — in progress.
- `[o]` — deliberately deferred, with a note saying why and where it will land.

## The rules this enforces

- **Nothing is ticked until a command proves it.** The proof (command + observed
  output) goes in `IMPLEMENTATION_LOG.md` with a matching entry.
- **Every check is broken once and observed failing** for the right reason
  (§0.2) before it is trusted. Break cases are part of the milestone.
- **A milestone is finished when its checklist is fully ticked**, `pnpm verify`
  is green, and the work is committed and pushed.
- **No silent drops.** Anything unticked at the end of a session is either done
  now or recorded as a tracked gap with an ID.

## Where the tests live (reuse these, do not reinvent)

| Tests | Location | Run with |
|---|---|---|
| Web unit + accessibility | `apps/web/tests/unit.test.js` | `pnpm --filter @ride-share/web test` |
| Web real-browser layout | `apps/web/tests/layout.test.js` | `pnpm --filter @ride-share/web test:layout` |
| Web break harness (unit) | `apps/web/tests/breaks.sh` | `pnpm --filter @ride-share/web test:breaks` |
| Web break harness (layout) | `apps/web/tests/layout-breaks.sh` | `pnpm --filter @ride-share/web test:layout-breaks` |
| Repo enforcement scripts | `scripts/*.sh` | `pnpm verify:repo` |
| API tests (as they land) | `apps/api/src/**/*.spec.ts` | `pnpm --filter @ride-share/api test` |

The central command is **`pnpm verify`** — it runs every repo check, then every
package's build and test. It is the single source of truth for "is this done".

## Files

- `00_MASTER.md` — the index: every milestone and its status.
- `M0_foundations.md` — BUILD_PLAN Phase 0, points P0.1–P0.13.
- (M1, M2, … files appear when their milestone starts.)
