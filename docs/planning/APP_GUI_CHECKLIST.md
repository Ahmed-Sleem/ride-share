# APP GUI — phase 2 checklist (live)

Method: the same one that carried the landing through seven rounds — measure before claiming, tick
with a number, break every check, and never call it finished while the live URL disagrees. Rules in
force: `~/uploads/GENERAL_GUI_AGENT_RULES.md` §0.1 (nothing half-built), §3.3 (no magic-value drift),
§5.1 (one implementation per concept), §9.2 (fidelity with judgment), §13 (the four state classes),
§18.2/§18.4 (verification) and `~/uploads/AGENT_RULES_SANITIZED_ACTIVE (1).md` §0.2 (a check that
cannot fail is not a check), §3.1/§3.3 (gaps tracked and closed with proof), §7.0 (break every test),
§6.3 (no push before validation).

Owner's brief for phase 2 (2026-09-06): *"after learning the current gui, create me a demo of the new
one, get the old one as base and start editing and give me the demo to confirm before pushing — the demo
should be like the new landing page, ink black and white, bold strong rush titles in each page, dark
mode and light mode, simple minimal, without losing any of the details"*, same fonts as the landing,
and *"you can mirror the landing page things"* for the bars. Work divided into sessions.

**Route chosen:** a *skin*, not a rewrite. The demo is the real built app (all 43 surfaces, all data
paths, all behaviour) with one extra stylesheet spliced in last, so the cascade favours it. Nothing can
be lost by construction, and any decision can be reversed by deleting one file. The repo's `src/` is
untouched until the owner signs the look off.

---

## D-0 · study, measurement, first skin — DONE this session

- [x] **D-0.1** App GUI inventoried → `APP_GUI.md` §1 (shell 430, kit 620/18 components, screens
  3,441/~125 functions, stylesheet 1,608/18 sections, copy 917, geography 855, transitions 222).
- [x] **D-0.2** Health measured, not assumed: 172 renders of the built file (43 pages × en/ar ×
  light/dark) → **0 throws, 0 raw keys, 0 `undefined`/`NaN`/`[object`, 0 unnamed, 0 dead ends, 0
  horizontal overflow**. First run's "4 unnamed controls" were `<input type=hidden>` — the probe was
  fixed, not the app.
- [x] **D-0.3** Rules re-read (both files) and the landing's ink layer understood: the glass, poster
  steps, `--gutter`, `--flow`, `--line-hair` are declared on `:root`, **not** scoped to `.landing`, so
  the app can consume them as they stand. Verified by reading lines 196–231, not inferred.
- [x] **D-0.4** Skin v1 written (`~/preview/app-ink/ink-skin.css`, 4.8 KB → 3 moves: chrome as glass,
  one voice, paper not plastic) and the demo assembled (`build-demo.py` → `app-ink.html`, 1,137,073 B
  from 1,130,591 B, 3 `@font-face` blocks preserved, one `</head>`/`</body>`).
- [x] **D-0.5** Regression: the same 172-render scan **re-run against the demo** → 0 throws, 0 leaks,
  0 unnamed, 0 overflow. The skin is presentation-only, and that is now measured rather than claimed.
- [x] **D-0.6** Two title defects caught by measurement, then fixed and re-measured: the Latin bar
  title was clipped by its own leading (`scrollHeight > clientHeight` at `line-height:.9` → `1.1`,
  28 px/30.8 px, `clip:false`) and the Arabic display title overflowed the bar at 1.45× (40.6/47.9 px,
  `titleFitsBar:false`) → 1.25× = 35 px/41.3 px, `titleFitsBar:true` on all six shots.
- [x] **D-0.7** Gaps logged: G-087…G-092 (in `AUDIT_AND_TODO.md`) plus G-093 below.

- [x] **D-0.8** **Consolidation, after the owner's correction.** Their objection was that the demo showed the landing — and it did, because `boot()` sends an unauthenticated visitor there; the app surface only exists when a session resolves. The demo now boots into it (measured: `{view:"app",role:"rider",page:"home",authed:true,landing:false}`) with role/skin/lang/theme buttons, and the service map is written down in `APP_GUI.md` §0 from the files: `apps/mobile/scripts/build.js` assembles the APK's `www/` **"from the ONE web build … Never fork screens"**, so `apps/web/src/**` is confirmed as the app GUI's code and the `mobile` Railway service is its API + packaging. Two surfaces outside `apps/web` turned out to be pre-renewal and are now G-094 (offline.html's violet system, 12 hexes, gradient action — measured on the rendered button) and G-095 (`SplashScreen.backgroundColor:#6C63FF`). One thing stays **unverified**: whether the `MOBILE_PUBLIC_ORIGIN` Actions *variable* is set (ci.yml references it at 136 and 170), because that needs the token.

## D-1 · make the look judgeable — NEXT session, before any taste is discussed

- [ ] **D-1.1** **The data harness.** Offline (`file://`) the API is unreachable, so data-bearing
  screens show their honest empty/error state and cannot be reviewed: `rider.profile` measured
  `scrollable: 0`, which also makes the glass-over-content effect impossible to demonstrate. Stub
  `window.fetch` in the *demo harness only* with payloads shaped from the API's own fixtures
  (`apps/api/dist/modules/**` DTO tests), for the flagship screens first: rider home/trips/wallet/
  boarding, driver work/journey/earnings, ops queue, super_admin staff, manager board.
  *Check:* every screen in the contact sheet shows at least one populated row, and `.main` scrolls on
  at least half of them.
- [ ] **D-1.2** Nothing-lost audit, quantified: for all 172 renders, diff the element inventory
  (counts of `button/input/a[href]/select/svg` plus their accessible names) between `dist-preview.html`
  and `app-ink.html`. *Check:* identical counts and identical names — that is "without losing any of
  the details", proven rather than promised.
- [ ] **D-1.3** Route the app's 20 hand-rolled headings through `Section()` (G-093) so one rule styles
  every head; then the skin's `.section__head .t-head` needs no per-screen exceptions.
  *Check:* `grep -c 'class:"t-head"' src/screens/*.js` → 0 outside `components.js`; contact sheet shows
  every page head in the display voice.
- [ ] **D-1.4** Glass over content, proven on the pixels: bar crop at two scroll positions of a
  *scrolling* screen must differ (my first attempt read `scrollable:0` and was therefore inconclusive —
  not a pass, not a fail).
- [ ] **D-1.4b** Bring the two mobile surfaces into the renewal: rebuild `offline.html` on the injected ink tokens (G-094) and generate `capacitor.config.json`'s splash colour from `brand.json` (G-095). *Check:* `grep -c '#[0-9A-Fa-f]\{6\}' apps/mobile/offline.html` → 0 outside the injected block, and `config.test.js` pins the splash colour to the brand's ink.
- [ ] **D-1.5** Staff tables and `wide` density: `--density`/DEC-200 with a sticky head, row height,
  hairline rules only, no shadows; the `.table th` eyebrow treatment already in the skin.
- [ ] **D-1.6** Motion: confirm `pagefx.js` (already the app's choke point) still arms on every
  navigation *with the bar absolute*; a bar that leaves the flow must not change `routeKey` behaviour.
  *Check:* the landing suite's stuck-curtain proof, extended to one app screen.

- [x] **D-1.7 (demo side)** The bar becomes a page head. In the skin: `.topbar` as a two-row grid inside the reading column — controls above, poster underneath. Measured on all 172 surfaces: `headFloor 56`, `headH 219 → 123`, title `--f-poster` 71.68 px / `--fw-heavy` / uppercase, Arabic `--lead-display-rtl`, `overflow 0`, `titleClip false`. The `ar title` button compares Jomhuria against Cairo 900 so the face choice is made from two renderings, not from my preference.
- [x] **D-1.8 (demo side)** One rhythm: `.main__inner > *{margin-block:0}` and a margin reset on the head title. All 172 surfaces now report `gapTokens: --flow` except 12 whose 44 px sits beside a zero-height placeholder awaiting data (proved by dumping the column children: `{c:"DIV", h:0, mt:0}` — that is the empty-data artifact, not a spacing rule).
- [ ] **D-1.9 (repo)** `app.js` renders `pageHead({title, back, right})` **inside** `.main__inner` as its first block and `topbar()` retires; `headerActions()` keeps its place in the controls row; the safe-area floor moves from the bar to the head (`padding-block-start:calc(var(--s2) + var(--safe-t))`). *Check:* the layout suite's "chrome is outside the scroller" intent is re-stated — the controls still never scroll away on `wide` screens only if we want that, so decide sticky-vs-not with the owner; the 172-render scan must still read 0 overflow and `headFloor == 56`.
- [ ] **D-1.10 (repo)** One component library for both surfaces (G-097): the app consumes the landing's `mk*` builders and every screen head goes through `Section()` (G-093). *Check:* `grep -c 'class:"t-head"' src/screens/*.js` → 0 outside `components.js`, and a unit guard that fails if a builder in `landing-parts.js` gains a landing-only selector that the app cannot use.
- [ ] **D-1.11 (repo)** Promote the three carried literals to tokens (`--track-poster:-.04em`, `--lh-poster:.94`, `--measure-head:18ch`) with the reason beside each, so the app does not inherit the landing's habit of restating negative tracking per component (§3.3). *Check:* `grep -c -- "-.04em" src/styles/shell.html` → 1 (the token).

## D-2 · the owner's round (sign-off)

- [ ] **D-2.1** Contact sheet of all 43 pages × light/dark × en/ar (86 views) + the clickable
  `app-ink.html` with its `ink skin: on/off` switch, delivered for confirmation. **No `src/` change
  ships before this tick.**
- [ ] **D-2.2** Each of the owner's notes becomes a numbered item here, with the measurement before and
  after — the round-6/7 pattern, including where their judgement overrides my measurement (G-085 law).

## D-3 · land it in the repo

- [ ] **D-3.1** Move the skin into `src/styles/shell.html` as a real "APP MONOCHROME LAYER" section;
  promote the three tracking literals (`-.03/-.045/-.03em`) to named tokens with a reason comment, so
  the app does not inherit the landing's habit of restating negative tracking per component (§3.3).
- [ ] **D-3.2** P2-A repo items: converge the maps (G-087), archive-then-delete the orphans (G-088),
  settle the safety-sheet comment (G-089), add the 172-render copy guard (G-090).
- [ ] **D-3.3** Guards: unit + a11y + layout + landing + `breaks.sh` + `layout-breaks.sh`, then
  `verify-repo.sh`, then the build. *Check:* all green locally; the break batteries add a case for each
  rule the skin introduces (a bar that is glass, a head that uses `Section`, a control that never takes
  the display face).
- [ ] **D-3.4** Push to `main`, wait for Railway, and `cmp` the live URL against
  `git show HEAD:apps/web/dist-preview.html` — the standing "finished means deployed" law.
- [ ] **D-3.5** Delete the demo scaffolding or archive it under `archive/` (the G-082 workflow).

## D-4 · loose ends inherited, not forgotten

- Two docs commits (`0492d68`, `dbc4993`) are unpushed because `/tmp/.tok` was shredded last session and
  `/tmp` is rehydrated between turns; live already equals `6dc6ac4`, so nothing user-facing waits.
- 9 red `apps/api` journey tests (L2) — the owner ordered them after the GUI work; they keep
  `Verify (repo + api + web unit)` red on every push, and nothing in phase 2 touches that job.
- O-5 production audit; `concurrency: cancel-in-progress` in `ci.yml` (approved, still unwritten).

---

## Harness lessons from this session (write them down or repeat the bugs)

1. Demo scaffolding must be injected before `</body>`. A `<script>` in `<head>` runs while
   `document.body` is null — my toggle threw `Cannot read properties of null (reading 'appendChild')`
   and only then did I see the app was fine.
2. `scrollable: 0` makes a scroll-dependent pixel test **inconclusive**. Reporting it as a pass (or a
   fail) would have been a lie; it needs a screen that actually scrolls, which needs D-1.1.
3. A selector aimed at a component must know the component is used. `.section__head .t-head` silently
   missed "My journeys" because 20 heads are hand-rolled against 17 `Section()` calls — the render told
   me, the kit did not.
4. Arabic display type in a fixed bar is bounded by arithmetic: `--topbar-h` 60 px − 2×`--s2` = 44 px
   available, and Jomhuria needs `--lead-display-rtl` 1.18 ⇒ ≤ 37.3 px. `* 1.45` overflowed (measured),
   `* 1.25` fits (measured).
5. A patch that ends in a Python `SyntaxError` inside a heredoc applies **nothing** — the numbers I read
   afterwards were old. Re-measure after every edit; one fix in that run landed (via `edit_file`), the
   other had not.
6. Node cannot `await requestAnimationFrame`, and a killed `timeout` run prints nothing at all: both of
   my hung probes were harness bugs, not app bugs.
