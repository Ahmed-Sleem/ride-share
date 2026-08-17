# IMPLEMENTATION LOG

Every closed gap and every non-trivial change gets one entry here, in the
format below. Closing a gap requires proof (files changed, tests run, observed
output) — see the engineering standard §3.3 and §4.

## Format

```text
## <date> — <Gap ID or change one-liner>

- What: <one-line description>
- Files: <paths>
- Tests: <tests added or updated>
- Verified: <commands and observed output>
- Self-check: <fully fixed? wired and production-ready? does the test really validate the behaviour?>
```

---

## 2026-08-17 — Search bar scrolls with the page; separator removed

- What: The search band moved from a pinned sibling above the scroller to the
  first element inside `.main`, so it scrolls with the page content, and the
  horizontal separator under it was removed. (User request.)
- Files: `app/src/shell/app.js`, `app/src/styles/shell.html`,
  `app/tests/unit.test.js`, `app/tests/breaks.sh`, `app/tests/layout.test.js`,
  `docs/design/README.md`.
- Tests: unit section rewritten to assert the band is inside the scroller, is
  the first element, and has no divider; break cases added for "band pinned
  above the scroller", "band drops below the content", and "divider returns
  under the band"; layout check changed to "search band sits inside the
  scroller".
- Verified: `./app/verify.sh` green — 181 unit/accessibility assertions;
  5,803 real-browser layout assertions across 15 viewports × 5 roles × 30
  screens; 36 break cases and 7 layout break cases all caught. Also confirmed
  directly in a browser: the band's top moved from 81px to −48px after
  scrolling (scrolls with the page) and its border-bottom-width is 0.
- Self-check: fully fixed — the band is genuinely part of the scrollable page
  and no separator line remains; every changed check was observed failing for
  the right reason before passing.

## 2026-08-17 — GUI modernisation (violet pop design)

- What: Re-skinned the interface to a youth "pop" design — violet primary, coral secondary, five
  pastel pops, near-black dark mode, gradient brand mark + favicon, Auto/Light/Dark theme with a
  top-bar quick toggle, collapsible desktop rail, and tasteful motion/emoji accents. (User-approved
  decisions via MCQ: full re-skin; violet-first; Auto+Light+Dark; gradient mark; collapse-to-icons;
  moderate shapes; tasteful happiness set; near-black dark; violet as primary action, coral as
  secondary role.)
- Files: `app/src/styles/shell.html` (tokens, favicon, gradient defs, buttons, chips, empty,
  rail collapse), `app/src/lib/components.js` (state, resolvedTheme, storage, logoSVG, sun icon,
  Empty), `app/src/shell/app.js` (logo, railToggle, themeToggle, render), `app/src/screens/rider.js`
  (themeSeg 3-way, auth logo, emoji accents), `app/src/data/content.js` (i18n keys),
  `app/tests/unit.test.js`, `app/tests/breaks.sh`.
- Tests: unit rewritten (accent group for violet/coral, new THEME/RAIL/BRAND groups); break cases
  updated for the new tokens and 4 added (rail collapse, auto theme, favicon, gradient logo).
- Verified: `./app/verify.sh` green — 198 unit/accessibility; 5,803 real-browser layout (15
  viewports × 5 roles × 30 screens); 40 + 7 break cases caught. Functional browser check:
  auto resolves to the system, dark gives `#0B0C0F` surfaces, the rail collapses to 80px with
  labels hidden, the gradient logo and favicon render.
- Self-check: fully wired — the theme preference persists, the rail preference persists, every new
  check was observed failing for the right reason, and the RTL/Arabic + light/dark matrix still
  renders all 30 screens.

## 2026-08-17 — M0.1: monorepo skeleton, pinned toolchain, workspace guard

- What: Created the pnpm monorepo (apps/* + packages/*), pinned the toolchain exactly, added a
  central catalog (one dependency one version), moved the approved GUI to `apps/web/`, and added
  the first enforcement script.
- Files: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `AGENTS.md`,
  `scripts/check-workspace.sh`, `scripts/verify-repo.sh`, `packages/config/*`,
  `apps/{api,mobile,web}/package.json` (+ READMEs), `apps/web/**` (moved from `app/`),
  README/docs updates.
- Tests: `scripts/check-workspace.sh` guards private-root / exact-packageManager / named-packages /
  workspace-protocol / catalog-only. Each of the four break cases (range character in
  packageManager, bare version in a child package, internal dep without `workspace:`, root not
  private) observed failing for the right reason, then restored.
- Verified: `bash scripts/check-workspace.sh` → 6 files examined, 0 failures;
  `./apps/web/verify.sh` → 198 unit, 5,803 layout, 40 + 7 break cases caught, all green.
- Self-check: fully wired — the workspace installs from a clean clone (`pnpm install` with a
  generated lockfile), the GUI builds and verifies from its new home, and the guard genuinely
  fails when any constraint is violated.

## 2026-08-17 — M0.2 (P0.2) + M0.3 (P0.3): verify harness, secret hygiene, env guard

### P0.2 — The verify command
- What: `pnpm verify` = repo checks → build → typecheck → lint → test across the workspace.
  `scripts/verify-repo.sh` runs each check in order, fails on the first non-zero and NAMES it,
  and flags any sub-check that exits 0 without reporting an "examined N" count (the silent-green
  guard — P0.2's most important failure mode).
- Files: `scripts/verify-repo.sh`, `scripts/check-workspace.sh` (summary line), root `package.json`.
- Tests: two break cases observed — `exit 1` appended to a sub-check → "✗ FAIL: scripts/check-workspace.sh
  exited 1"; a sub-script that exits 0 silently → "reported no examined-file count (silent green)".
- Verified: `pnpm verify` exit 0 — repo checks green, web 198 unit, api build/typecheck/lint/test green.

### P0.3 — Secret hygiene
- What: `.env.example` expanded to document every variable; `scripts/check-secrets.sh` scans the tree
  for known credential shapes (AKIA, ghp_/github_pat_, sk-, private-key headers, connection strings
  with passwords, key=value secrets); `apps/api/src/config/env.ts` is the only module reading
  `process.env` (zod schema + named refusal), `scripts/check-env-example.sh` keeps `.env.example`
  in lock-step; eslint `no-restricted-syntax` fails on any other `process.env`.
- Files: `apps/api/{package.json,tsconfig.json,eslint.config.mjs,src/main.ts,src/config/env.ts,src/config/env.test.ts}`,
  `scripts/check-secrets.sh`, `scripts/check-env-example.sh`, `.env.example`, catalog versions.
- Tests: 3 unit tests (valid defaults; all missing vars named; short JWT_SECRET named). Break cases:
  planted `AKIA…` key → scan fails; `process.env.FOO` in a random file → lint fails; removed a
  required var from `.env.example` → env-doc fails; startup with empty env → exit 1 naming
  DATABASE_URL, REDIS_URL, JWT_SECRET. False positives fixed (dummy conn string in a test, AKIA
  literals in two docs) so the scan is clean on a clean tree.
- Verified: secret scan "examined 112 files, 0 hit(s)"; `git ls-files | grep -c '^.env$'` → 0.

## 2026-08-17 — M0.4 (P0.4): one Dockerfile, local compose, infra/ layout

- What: `infra/` layout (docker/, railway/, scripts/); the parameterised `infra/docker/Dockerfile.node`
  (ARG PROJECT ∈ {api, web}) with turbo-prune → build → non-root runner; `apps/web/server.js` (static
  server + /healthz, zero deps) and `apps/web/dist/index.html` build artifact; `apps/api/src/server.ts`
  health server; root `docker-compose.yml` (api, web, postgres+postgis, redis); `.dockerignore`;
  `infra/railway/railway.toml` + README; CI workflow (.github/workflows/ci.yml) running pnpm verify,
  the full GUI browser suite, and both image builds with a non-root check.
- Files: infra/** , apps/web/{server.js, build.js, tests/server.test.js, package.json},
  apps/api/{src/server.ts, src/main.ts, src/server.test.ts, package.json}, docker-compose.yml,
  .dockerignore, .github/workflows/ci.yml, README/docs updates.
- Tests/break: two bugs found and fixed by actually running the images — (1) ARG PROJECT not promoted
  to ENV (CMD saw empty → "No projects matched"); (2) corepack tried to download pnpm at container
  runtime (no network) — pnpm is now installed in the image. Break observed: removing `USER app`
  → image runs as root (uid=0); restored. Non-root (uid=100) proved for both images.
- Verified (in this sandbox, dockerd running): both images build from ONE Dockerfile (web 171 MB,
  api 177 MB); web serves /healthz `{"ok":true,"service":"web"}` + the document; api serves /healthz
  with valid env and refuses to start (exit 1) naming DATABASE_URL, REDIS_URL, JWT_SECRET; `ls /app/.env`
  → No such file (no secrets baked); compose YAML + railway TOML/JSON + all shell scripts syntax-checked.
- Not yet proven here (needs a Docker host with bridge networking): a live `docker compose up` of the
  4-service stack. The images are proven individually; the full-stack run is exercised in P0.12 and by CI.
