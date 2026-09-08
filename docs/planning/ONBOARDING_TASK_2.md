# ONBOARDING TASK 2 — make the map appear, and make its failure visible

Task 1 is merged and closed (`445668c`, reviewed: `examined 6 check(s), 0 missed`). This is the next one.
It was chosen because the owner opened the app, looked for the map, and found none — and because the
reason is measured, not guessed.

## The finding, in order, with the numbers

`apps/web/src/lib/map.js` is a complete, data-bound map primitive (301 lines): tiles, polyline, numbered
stops, an optional live vehicle marker, and an honest fallback — an illustration plus the stop **list** —
for when no SDK is present. It is called from `rider.js` (×2), `driver.js`, `planner.js`, `staff.js` and
`components.js`. Nothing on any of those screens ever shows a map. Three independent reasons, all measured
on 2026-09-08:

1. **The SDK is a runtime CDN dependency.** `apps/web/src/shell/app.js:433` injects
   `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` (and `:431` the matching CSS). `unpkg` answers
   `HTTP/2 200` from this machine today — and `:425`/`:437` both say `s.onerror = () => {};`, while
   `:440` sets `window.__rsMapsConfigured = true` regardless. One blocked, slow or offline load and maps
   are off **for the whole session, silently**, with no retry and nothing on screen explaining it.
2. **In the installed app the switch is behind the identity gate.** `app.js:415` bails to the
   illustration if `API.getConfig()` throws, and the mobile service answers `/v1/config` only after
   `deviceToken(req)` (`apps/mobile/server.js:304`, the handler is at `:307`). Measured against the live
   service: `GET https://ride-sharemobile-production.up.railway.app/v1/config` →
   `403 {"ok":false,"code":"DEVICE_TOKEN_MISSING"}`, while the same path on the **web** origin returns
   `200 {"maps":{"provider":"osm","apiKey":""},"surface":"web"}`. So a phone that has not enrolled —
   which includes every cold start, which is the first thing a new tester does — cannot learn that the
   map is allowed to exist. A public capability is chained to a private credential.
3. **`file://` previews skip it entirely** (`app.js:414`) — correct for the test harness, but it means
   the whole layout/unit suite has never once rendered a tile layer.

Do not "fix" this by adding `server.url` to `apps/mobile/capacitor.config.json` (a hard rule in this repo,
guarded by `apps/mobile/tests/config.test.js`) and do not touch `apps/mobile/server.js` — if you think one
config field belongs there, write the exact request in your commit body and the agent will land it.

## What to build

**Step 1 — vendor Leaflet, and check the bytes.**
`apps/web/vendor/leaflet/leaflet.js` + `leaflet.css`, pinned 1.9.4, and inline them the way `build.js`
already inlines the fonts (`node apps/web/build.js` → "fonts: 2 inlined (65 KB) … no unused faces").
`build.js` already hashes inlined payloads — "a payload is checked by hash in build.js, where the bytes
matter" — so add the vendor files to that same mechanism with their `sha256` written down in the build
script, and make the app load the vendored copy instead of `unpkg`. Third-party origins must not be on the
critical path of a screen: it is an outage dependency, it is a privacy leak (unpkg sees every map load of
every rider), and it is a line the store's data-safety form would have to declare.

**Step 2 — a map that fails out loud.**
Replace both `s.onerror = () => {}` arms with a real state: mark it (`S.mapState = "unavailable"` or
whatever reads well in this codebase), let it retry once on `online`/`visibilitychange`, and make the
fallback say *what happened* in the user's language. The copy must read as a product decision, not an
admission: `tests/unit.test.js` has an `ADMIT` regex that fails the build on words like "placeholder",
"TBD", "not final", "قيد الإنشاء". Also honour `MAP_PROVIDER=google` exactly as today, still key-from-config
only, never baked in.

**Step 3 — a missing token is not a reason to hide the map.**
`loadMapsConfig` should treat a failed or refused `/v1/config` as "use the default provider (`osm`)"
rather than "no maps". The provider is public information; the device token is identity. Keep the Google
key path gated the way it is — a key is a secret and must keep coming from config.

**Step 4 — the map must never hide the journey.**
The stop list has to stay in the DOM *while the tiles are up*, and a tile failure must leave it intact
(a screen reader, `file://`, an offline train and a broken CDN all take the same path). Add the guard,
not just the intention: with a stubbed `window.L`, every stop name is still in the rendered screen.
Tile/attribution wording: keep `.attribution` (`map.js:56`) and make it the real thing —
`© OpenStreetMap contributors`.

**Step 5 — gestures, or the page stops working.**
`scrollWheelZoom: false` (a map that eats the wheel steals the page from the rider above it), `dragging`
and `touchZoom` on, `keyboard: true`, `zoomControl` positioned so it cannot cover the boarding marker at
320 px, and `maxZoom` set from the tile source's own limit. If a tile error happens it must not leave a
grey rectangle: the `tileerror` event flips the same "unavailable" state.

## What "done" means

* `apps/web` builds; a rider with two or more stops and a real route sees **tiles** at 390×844 and at
  1280×800; `curl`-ing nothing is required at runtime (grep your change for `https://` — a third-party
  origin may remain only for tiles and only as a *deliberate*, documented constant, never for code).
* `bash apps/web/verify.sh` green (it runs build → unit → a11y → layout → landing → breaks) and
  `bash scripts/verify-repo.sh` green. `export NODE_PATH=/home/user/.vtest/node_modules` first, or the
  suites cannot find puppeteer/jsdom.
* **Every new guard seen red on purpose.** Add cases to `apps/web/tests/breaks.sh` — append, never rewrite:
  the harness has a `BROKEN-BREAK` check for an edit that matches nothing, and `run_break`'s expected-test
  names are matched literally. Minimum four: (a) onerror no longer records state, (b) config refused →
  no maps, (c) the vendored file's hash mismatched, (d) the stop list disappears when the SDK is on.
  Do not edit `apps/mobile/tests/breaks.sh` — that file is yours in spirit but the agent is reviewing it
  this round; if you want a change there, put it in step 6 below and nothing else.
* Screenshots are not evidence. A number in a failing assertion is.
* If you write `breaks.sh` cases: in sed's BRE, `\( \)` is a **capture group** and `\{` opens an **interval**, so a pattern like
  `var\(--line\)` matches `var--line` and never the literal parens you can see in the file. Literal punctuation stays **unescaped**.
  When that goes wrong the harness prints `BROKEN-BREAK → edit did not change the file` — which happened four times in one round to the
  agent, and is the harness doing its job, not a nuisance: an edit that matches nothing is a test that proves nothing.

## Step 6 — the small one, from your task-1 review (separate commit, separate push)

Your `run_break` is stricter than the web one it came from, and that is why it passed review. One residual
is left: a mutation that breaks **syntax** reddens every test in the file — including the named one — so
`grep -F "not ok " | grep -qF "$expect"` is satisfied and the case counts as caught for the wrong reason.
Close it in `apps/mobile/tests/breaks.sh` by either (a) running `node --check` on the mutated file and
treating a syntax error as `BROKEN-BREAK`, or (b) counting the `not ok` lines and failing the case above a
small cap. Then prove the fix by making one mutation *deliberately* syntactic and showing the harness
refuses to call it caught.

## House rules that are not negotiable

* Touch `apps/web/**` (plus `docs/`). No `apps/mobile/**`, no `packages/brand/**`, no CI YAML — and that has a consequence for you:
  shipping a GUI to a device needs `packages/brand/brand.json`'s `version.code` bumped **and** a push that touches `apps/mobile/**`,
  because the mobile service's Railway trigger is path-filtered to that directory (`D-8.22` in the checklist, measured this round: three
  pushes, `versionCode` stuck at 7 for half an hour, then 8 within a minute of a push touching `apps/mobile/tests/`). Do **not** do either
  yourself: put the line `needs: version.code bump + mobile redeploy` in your commit body and the agent lands both at review. If you
  ship without it, your map will be correct in `main`, in CI and on the website, and invisible on every phone — and it will look like your
  work did nothing. The installer never contains the app at all (`apps/mobile/www/` is a 100 KB boot page; the app is the OTA artifact),
  which is why the version number and the service, not the APK, are what a device sees.
* Colours, spacing, durations and easing come from tokens — `scripts/check-tokens.sh` and
  `scripts/check-branding.sh` enforce it, and `map.js` already reads `cssVar()` for every colour it draws.
* Nothing may regress the app shell's bar (round 17, D-8.20): `--head-t`/`--head-b`, the shared
  `.topbar::after`/`.nav::before` edge and the rail's transition are guarded — read
  `docs/planning/APP_GUI.md` §16 before you touch any CSS.
* No `[skip ci]` in your commit message (it silences the pipeline). Push to `main`; CI redeploys Railway.
* Update the docs **with** the work: a `docs/process/CHANGELOG.md` entry (newest at the top), and a row in
  `docs/process/AUDIT_AND_TODO.md` if you find anything — the next free number is `G-125`, and the status
  is field 5.
* Commit as `Ahmed-Sleem <ahmed-sleem@users.noreply.github.com>`, and run
  `bash scripts/check-exec-bits.sh` before committing: `git checkout <branch> -- <file>` silently
  downgrades the exec bit, and CI fails on it.
* If you are ever unsure between two designs, write both as an MCQ in your commit body and pick one. A
  decision recorded and reversible beats a decision hidden in a diff.
