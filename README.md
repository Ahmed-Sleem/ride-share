# Ride Share

**Shared rides on fixed routes at a fixed price, for Alexandria.**

## Why

Microbuses already move most of Alexandria. They are cheap and they go where
people go, but you cannot know when one leaves, whether there will be a seat,
or what you will be asked to pay. Ride-hailing solves those problems and costs
several times more.

This is the middle: published routes, published departure times, one fare per
route however far you ride, and a seat you booked before you left the house.
A rider boards at a fixed stop and gets off anywhere along the line.

This repository currently contains the **complete interface** and the
specification and plan behind it. There is no backend yet — see
[Status](#status).

## Preview

The interface is one self-contained HTML file with no external requests.
Open it directly:

```bash
open apps/web/dist-preview.html      # macOS
xdg-open apps/web/dist-preview.html  # Linux
```

Five roles are included — rider, driver, operations, manager, support. Use the
role selector in the top bar to move between them. Language (English / Arabic
with full RTL) and appearance (light / dark) are in Profile.

## What is here

| Capability | What you get |
|---|---|
| Rider journey | Browse routes, pick a boarding point, pick a departure, book, boarding code, live ride, rate |
| Driver work | Duty, claim a published slot, run a journey, scan passengers, earnings, documents |
| Operations | Approval queues, live fleet map, stop mapping, route and slot grid, users |
| Manager | Coverage board, fare control with preview, promotions, analytics |
| Support | Rider lookup, bounded actions, tickets, lost property |
| Bilingual | English and Arabic, full right-to-left mirroring |
| Themes | Light and dark, both designed rather than inverted |
| Adaptive | One layout from a 320px phone to a 2560px monitor |

## Requirements

- Node.js 20 or newer
- pnpm 9 (pinned by `packageManager`; `corepack enable` picks it up)
- Docker — only if you want to serve it as a container

The interface has no runtime dependencies; the test suite uses `jsdom` and
`puppeteer` (installed by `pnpm install`).

## Quick start

```bash
git clone <url>
cd ride-share
corepack enable && pnpm install
pnpm --filter @ride-share/web build
```

That writes `apps/web/dist-preview.html`. Open it in a browser.

To run everything — build, unit and accessibility checks, real-browser layout
checks across fifteen viewports, and the break tests that prove those checks
can fail:

```bash
pnpm --filter @ride-share/web verify
```

To serve it as a container:

```bash
docker compose -f deploy/docker/docker-compose.yml up --build
# http://localhost:8080
```

## Repository layout

Code and documentation are kept apart on purpose.

```
apps/web/       the interface — source, build script, tests
apps/api/       the backend — NestJS modular monolith (M0 skeleton)
apps/mobile/    Capacitor wrapper (BUILD_PLAN P7, created with a README)
packages/       shared types, logic, API client, toolchain config
scripts/        the enforcement scripts behind `pnpm verify`
docs/           everything that is not code: specification, plan, decisions, research
deploy/         Dockerfile, nginx, Railway configuration, smoke test
```

`apps/web/src` is assembled into one file by `apps/web/build.js`. Edit the
sources, never the generated `dist-preview.html`.

```
apps/web/src/styles/shell.html   design tokens, layout, every CSS rule
apps/web/src/data/content.js     all text, both languages, and sample content
apps/web/src/lib/components.js   shared components and icons
apps/web/src/screens/            rider, driver, staff screens
apps/web/src/shell/app.js        navigation table, routing, render
```

## Further docs

Start at **[docs/README.md](docs/README.md)** — it is written for someone
picking this up with no prior context and says what to read in what order.

| Document | What it is |
|---|---|
| [docs/specification/MASTER_SPECIFICATION.md](docs/specification/MASTER_SPECIFICATION.md) | The product, in full. 22 chapters |
| [docs/planning/BUILD_PLAN.md](docs/planning/BUILD_PLAN.md) | How it gets built. Phases 0–8, every point with its tests |
| [docs/decisions/DECISIONS_REGISTER.md](docs/decisions/DECISIONS_REGISTER.md) | Every decision taken and why |
| [docs/decisions/OPEN_ITEMS.md](docs/decisions/OPEN_ITEMS.md) | What is still open or accepted as a risk |
| [docs/research/](docs/research/) | The sourced research behind the decisions |

## Verification

`pnpm --filter @ride-share/web verify` runs five stages:

| Stage | Checks |
|---|---|
| Build | Assembles the single file |
| Unit and accessibility | 198 assertions — labels, roles, focus, tokens, role boundaries, booking logic |
| Layout | 5,803 assertions in a real browser across 15 viewports × 5 roles × 30 screens |
| Breaks | 40 deliberate defects, each confirmed to turn the suite red |
| Layout breaks | 7 deliberate layout defects, same |

The break stages matter more than the passing counts. Every check in this
repository has been observed failing for the correct reason; a check never
seen failing is an assumption wearing a test's clothing.

## Status

| Area | State |
|---|---|
| Interface — all screens, five roles, bilingual, adaptive | Done |
| Specification and build plan | Done |
| Monorepo + pinned toolchain + workspace guard | Done — M0.1 |
| API, database, authentication | In progress — M0 foundations |
| Booking, payments, live journeys | Not started — M3 |
| Android APK | Not started — M7 |

The interface is not connected to anything. Data shown is sample content, the
map is a labelled illustration rather than live tiles, and no control performs
a real transaction. Nothing in the interface claims otherwise.

The product name is provisional and no trademark search has been done.

## License

MIT — see [LICENSE](LICENSE).
