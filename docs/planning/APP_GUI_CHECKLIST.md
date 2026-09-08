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
- [x] **D-1.4b** Bring the two mobile surfaces into the renewal. `offline.html`: violet palette, gradient button and SVG gradient def deleted (the logo follows `currentColor`), dark-theme block added, typeface injected from `packages/brand/brand.json` through an asserted `/*__RS_BRAND__*/` marker in `scripts/build.js`. `capacitor.config.json`: **not hand-edited** — `build.js` generates it from `brand.json`, so the committed `#6C63FF` was stale drift; running the generator brought the committed file into agreement with its source (`backgroundColor:"#FFFFFF"` today), which closes the drift half of G-095 and leaves only the native single-value half. *Checks that pass now:* no `gradient`, no `#6C63FF`/`#8571FF` anywhere in `apps/mobile/offline.html`; its remaining hexes are exactly the app's `#FFFFFF`/`#0A0A0A`/`#525252`; `node --check apps/mobile/scripts/build.js` clean; `apps/mobile/tests/config.test.js` green. *Residual, binary only:* native `SplashScreen.backgroundColor` is single-valued, so a dark-mode cold start flashes paper before the boot page paints (Android `values-night`).
- [ ] **D-1.5** Staff tables and `wide` density: `--density`/DEC-200 with a sticky head, row height,
  hairline rules only, no shadows; the `.table th` eyebrow treatment already in the skin.
- [ ] **D-1.6** Motion: confirm `pagefx.js` (already the app's choke point) still arms on every
  navigation *with the bar absolute*; a bar that leaves the flow must not change `routeKey` behaviour.
  *Check:* the landing suite's stuck-curtain proof, extended to one app screen.

- [x] **D-1.7 (demo side)** The bar becomes a page head. In the skin: `.topbar` as a two-row grid inside the reading column — controls above, poster underneath. Measured on all 172 surfaces: `headFloor 56`, `headH 219 → 123`, title `--f-poster` 71.68 px / `--fw-heavy` / uppercase, Arabic `--lead-display-rtl`, `overflow 0`, `titleClip false`. The `ar title` button compares Jomhuria against Cairo 900 so the face choice is made from two renderings, not from my preference.
- [x] **D-1.8 (demo side)** One rhythm: `.main__inner > *{margin-block:0}` and a margin reset on the head title. All 172 surfaces now report `gapTokens: --flow` except 12 whose 44 px sits beside a zero-height placeholder awaiting data (proved by dumping the column children: `{c:"DIV", h:0, mt:0}` — that is the empty-data artifact, not a spacing rule).
- [x] **D-1.9 (repo)** The shell renders the head **inside** `.main__inner` as its first block (same `topbar()` builder, so `headerActions()` keeps its row and the back control stays one component), with the safe-area floor moved onto the head. Sticky-vs-not, which this item left to the owner, was decided: **sticky inside the scroller** — the poster stays on screen and the back/account controls can never scroll away, which is what the old 'chrome is outside the scroller' group was really guarding. `--topbar-h` deleted (0 refs). *Checks:* `unit` 674/0 including 4 new head pins (first-block, `position:sticky` + `top:0`, glass painted, band-not-pinned); `layout`'s overlap assertion re-anchored from `main.t>=top.b` to `band.t>=top.b-1` at every viewport.
- [ ] **D-1.10 (repo)** One component library for both surfaces (G-097): the app consumes the landing's `mk*` builders and every screen head goes through `Section()` (G-093). *Check:* `grep -c 'class:"t-head"' src/screens/*.js` → 0 outside `components.js`, and a unit guard that fails if a builder in `landing-parts.js` gains a landing-only selector that the app cannot use.
- [x] **D-1.11 (repo)** The three carried literals are tokens (`--track-poster:-.04em`, `--lh-poster:.94`, `--measure-poster:18ch`, declared once in `:root` with the reason beside them) and the three components that restated the tracking by hand (`.intro__t`, one landing display rule, `.landing__slab-t`) now read `var(--track-poster)` — identical computed value, so no landing pixel moves. *Check:* `grep -c 'letter-spacing:-.04em' apps/web/src/styles/shell.html` → **0** (the literal survives only in the token definition). The original '→ 1' was written before the comment that names it was counted, so the check is stated as zero hand-restatements instead.

## D-5 — the landing's app-download action (owner's request, round 8)

- [x] **D-5.1** A download button on the app-download page, **in addition to** the QR (the QR stays —
  it is the route for a phone across the room, and `lib/qr.js` exists because a code that cannot scan is a
  lie). **What was actually wrong:** the button was in the code all along but invisible — `$("a", …)`
  resolved to the SVG namespace through `SVG_TAGS`, so the anchor had a `0×0` box. `components.js` no
  longer treats `"a"` as a drawing tag; the card's link is now produced by the shared `mkActions`
  (`href`/`download` branch) from the same `apkDownloadUrl()` the QR encodes, so label, version stamp and
  file name cannot drift. Measured at 390: `238×44`, `href=/download/android?v=3`,
  `download=ride-share.apk`, directly above the QR. **Considered and rejected:** the hero as its home —
  `.landing__hero-foot` at ≤899 is a two-column text grid whose implicit row measured `350×0`, and the
  landing keeps its calls to action in the bar by an earlier decision. The hero's `j_dlSub` lede was
  dropped with it: the card one screen below says that sentence already.
  *Checks:* 7 new assertions in `landing.test.js` (namespace, box ≥24px, `?v=` stamp, label, QR present,
  no `.btn/.card/.row` in the SVG namespace) · landing **2773/0** · `grep -c '$("a"' apps/web/src/lib/landing-parts.js` → 1.

## D-6 — OTA proof and delivery

- [x] **D-6.1** OTA proof, done: `node apps/web/build.js && node apps/mobile/scripts/build.js` →
  `apps/mobile/dist/www/index.html` is `14cd55544176a1e0…` / 1,137,282 B against the live
  `9bee41f4df721b23…` / 1,130,591 B, while `versionName 0.1.0` and `versionCode 3` stay put — the hash
  moves and the stamp does not, which is precisely what `server.js`'s `bundleMeta()` (sha256 per
  request) is for. No second bundling step was added anywhere. Numbers in `APP_GUI.md` §11.
- [x] **D-6.2** Pushed to `main`: `6f4b9a6` (round 9) and `ad9b98f` (round 9c). Railway redeployed and the served
  page carries the renewal — `--topbar-h` **absent**, `--lead-display` / `--f-word` / `position:sticky` /
  `--glass-blur` **present**, `@font-face` 3 and 88,482 base64 bytes identical to the local build.
  **Method note, because it cost me a false alarm:** byte-`cmp` against `apps/web/dist-preview.html` is not a fair
  cross-environment test — the page inlines `const BRAND = …` from `packages/brand/brand.json`, so a build made
  after the brand file moved differs by exactly that (measured 1,138,124 local vs 1,137,573 live = one line, the
  new `palette` key). Either compare markers, or compare bytes only when the brand file is identical.

- [x] **D-6.3** Owner decision taken (2026-09-06, "yes"): `palette.{light,dark}` now lives in
  `packages/brand/brand.json`; the boot page's colours are injected from it and its own hex literals are
  gone (**0** left in `apps/mobile/offline.html`), and `unit.test.js` guards the app stylesheet against the
  same four numbers in both themes. Measured drift this closed: muted `#525252` vs the app's `#5C5C5C`.
  G-099 closed.
  `packages/brand/brand.json` so the baked boot page and the app share one colour source instead of
  mirroring each other by hand. Recommendation: yes — 6 keys, and it deletes the last duplicated
  palette; it is an owner decision because the API build reads `brand.json` too.

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

## D-7 — round 10 (owner's two reports)

- [x] **D-7.1** `/download/android` verified end to end on the *serving* code, not by inference: HTTP 404 measured live,
  the three staging candidates read from `apps/web/server.js`, and the CI job's real reason for being skipped
  (`needs: verify`) confirmed from the workflow. Now: CI publishes the debug build to the `android-debug` release, the
  server redirects to it, `ANDROID_APK_URL` overrides, and the route has four tests it never had.
- [x] **D-7.2** First-open tutorial: poster-consistent headline (uppercase, 850, `--lh-poster`, `--track-poster`), one
  `--intro-col` shared by stage and footer (buttons measured at 400→880 at 1280, exactly the stage's column), constant
  head top across slides, swipe with a vertical-drag veto and a last-slide no-op, no fifth slide element, 13 assertions.
- [x] **D-7.3** Replay path: `How the ride works` in the rider and driver profiles, app-surface only, does not mark seen.
- [x] **D-7.4** Measured 2026-09-06 after run `34067676257`: the release exists (tag `android-debug`, prerelease,
  published 23:47:17Z, asset `ride-share.apk`, 27,882,440 B, `content-type: application/vnd.android.package-archive`)
  at `https://github.com/Ahmed-Sleem/ride-share/releases/download/android-debug/ride-share.apk`, and live
  `/download/android` answers **HTTP 200** with `content-disposition: attachment; filename="ride-share.apk"`
  and the same byte count. Installing on a phone is the owner's remaining hand-test.
  `HTTP 200` with `content-type: application/vnd.android.package-archive`. Reported as pending until measured.
- [x] **D-7.5** The break jobs have their own CI entry (`verify-breaks`, with `RS_SKIP_BREAKS=1` on the GUI job) **and it has been run on
  purpose-faulty code**: its first real run reported `caught 110 / missed 3`, all three re-anchored in the same commit, and later runs on `2247373`
  and the current head pass. The standing rule it existed to enforce still applies to every new guard: a case is added with the guard, not after.

## D-8 — round 10b (splash proportions, night theme, installer in the repo)

- [x] **D-8.0** Splash wordmark retuned and measured at four widths (24 / 25.3 / 29.9 / 30.4 px, was
  28.8 / 49.9 / 80 / 80), guard added; screenshot reviewed by eye at 390 and 1280.
- [x] **D-8.1** Done and measured end to end: CI's `apk` job completed **success**, committed
  `apps/web/downloads/android.apk` (**27,882,440 B**) to main as `86c8535 Installer v0.1.0 (3): sha256 9843cbefcfa2`,
  `git ls-tree -l origin/main` agrees with the release asset's size, and live serves it as an attachment. The
  60 MB ceiling held, the `[skip ci]` on the bot's own commit stopped it re-triggering itself, and the GUI plane
  is untouched — `versionCode 3` unchanged, so the interface still arrives over the air.
- [x] **D-8.2** Night splash resources generated from `brand.json` with a template-anchored test; recorded as
  a binary-plane change, so installed devices keep the white flash until reinstall.
- [ ] **D-8.3** `.gitignore` exception (`!apps/web/downloads/*.apk`) is narrow and documented — if the repo's
  size ever matters again, the removal is a history rewrite (git filter-repo / `git rm --cached` only stops
  future copies), and that is the owner's call to make, not a silent cleanup.
- [x] **D-8.4** Break-harness maintenance (G-109): the 3 `BROKEN-BREAK` misses from CI's first `Break-detection` run were stale anchors of mine
  from round 9, re-anchored with intent preserved and each verified CAUGHT via `BREAKS_ONLY` (~20 s each); the full 113-case suite re-runs in CI
  on this push, and that is the verdict to read.
- [x] **D-8.5** G-110: the origin a build dials is resolved in one module and can no longer be empty; the OTA paths answer the
  preflight and the CORS question the WebView requires; the boot page reports what it attempted. Mobile suite 15 → **22/0**.
- [x] **D-8.6** G-111: the landing's mobile menu is a full-screen sheet beside the bar (390×844 against an ICB of 390×844,
  alpha equal to the bar's 0.62, `blur(20px) saturate(1.8)`, 7 rows × 57px), opens and closes without moving the page
  (measured 1600 → 1600 → 1600), and no row starts above the bar's bottom edge at any surveyed id. landing 3221/0, unit 724/0.
- [ ] **D-8.7** Reinstall `ride-share.apk` on the owner's phone and confirm the app boots past the splash to the sign-in screen on a live
  connection - the symptom this round was built to remove, and only a device can close it. **Get code 5, not 4** (27,883,996 B, sha256
  `9fc2eabc45d3…`): `/download/android` serves the newest committed installer, verified byte-identical to `apps/web/downloads/android.apk` on
  `main` (`008055d`), and v5 is the first with both hosts in `allowNavigation`. A device is also the only place that can close the last unknown:
  `mountBundle` in a real WebView versus a browser (the harness proved the flow in Chromium, not in Android System WebView).
- [ ] **D-8.8** Formal `breaks.sh` cases for the 7 assertions added with G-110 (origin resolution, preflight, ACAO scoping).
  Each of these has already been seen failing on a real fault this round — my own `normalise()` hole, the missing `authored`
  binding, the guard left pointing at the old call — so the checks are proven; what is missing is the permanent harness entry.
- [x] **D-8.7** G-113: the OTA reads answer without a signature that cannot exist in this pipeline; the proxied API keeps its gate.
  Live before the change: `/v1/mobile/update` → `403 APP_UNPROVEN`. Mobile suite **23/0**. Reversible with one repo secret.
- [x] **D-8.8** (superseded by its own outcome) The route tests were the real gap and CI had them all along: `withNoInstaller()` now hides all three
  installer sources, `verify.sh` runs the file locally too, and web routes are **8/0**. G-112.
- [x] **D-8.9** G-114: `app.origin` (OTA) and `app.site` (the site) are separate brand facts, both present in `allowNavigation`, asserted against the
  generator. `version.code` 5, because the list is baked.
- [x] **D-8.10** G-115 + G-116: the OTA bundle must carry its own origin (guard on the assignment, fail the build otherwise), and CORS must answer
  writes as well as reads. Both server-side, so installed apps gain them on redeploy. Mobile suite 22 -> **26/0**.
- [ ] **D-8.11** *(mine — do not start; it collides with D-8.14's files)* Promote the harness that found G-115 into CI, because nothing else looks at the artifact the way a phone does. Recipe, in order:
  `node apps/mobile/scripts/build.js` -> spawn `node apps/mobile/server.js` with `PORT` and `MOBILE_WWW_DIR=apps/mobile/dist/www` -> take the boot page
  from the built `www/offline.html` and rewrite only its `window.__RS_PUBLIC_ORIGIN` to that local server -> serve that directory on a second
  localhost port (the mobile server answers `/` with 403 `NOT_A_WEBSITE`, by design) -> puppeteer at 390x844 `isMobile` loads it and asserts: the splash
  names the host *before* the network goes idle, `#root` mounts, `.offline` never appears, no console message matches `/blocked by CORS/`, and every
  `/v1/` response carries exactly one `access-control-allow-origin`. Poll from **outside** the page: mounting a bundle replaces the document and kills
  anything running inside it.
- [ ] **D-8.12** Owner decision, blocking and not code: the GitHub repository has no `MOBILE_APP_SECRET`, so CI bakes an empty key, `api.js` sees no key
  and skips signing, and the live proof check refuses every personal route - the app boots and browses but cannot sign in. Either set that repo secret to
  the value the deployed service already holds, or relax the gate to public reads plus a session token. Baking a key needs a new installer (`version.code` 6).
  **Better than both, and found while explaining this to the owner (2026-09-07):** `apps/mobile/scripts/build.js` reads `MOBILE_APP_SECRET` at *build* time,
  while the service reads it at *run* time (`server.js:16`) - which is why the live gate answers 403 and the installer baked `""`. So the mobile server can
  append the tag to the bundle it *serves* (it already has the value, and only appends for its own document origins): no GitHub secret, no matching values in
  two places, no reinstall, and existing installs start signing on their next launch. Exposure is unchanged - a key handed to a client is readable by that
  client, and that was already true of the copy inside the APK; this is attestation-lite, not auth. Needs: the injection + a test that the served bundle
  carries an assigned key, and a break case so a future edit that drops it fails loudly.
- [x] **D-8.13** The full-screen menu centres its page names. `display:flex;align-items:center;justify-content:center` + `text-align:center` on
  `.landing__menulink` — the row keeps its full width as a tap target, only the ink moves, and a centred line needs no RTL branch. Measured two ways because
  a full-width box is centred whatever the label does: `labelOff` in `landing.test.js` compares the label's Range rect to the viewport centre line at every
  boundary and language (worst 0.x px, gate ≤1.5), and `unit.test.js` asks the mounted row for its computed `justify-content`. unit 726/0, landing 3333/0.
- [x] **D-8.12** Resolved as the owner chose — the industry-standard shape (G-117): no phrase in the client, a short-lived device token minted by
  `POST /v1/mobile/enroll` and verified by the same service that serves the bundle. Nothing identity-related is baked any more, so the OTA path is the
  only update path; installed apps recover on their next launch. `MOBILE_DEVICE_TOKEN_KEY` (or the existing `MOBILE_APP_SECRET`) is a **service-side**
  variable: with it the tokens survive a restart, without it the process mints an ephemeral key and says so in the enrol response (`"key":"ephemeral"`).
  Mobile suite 29/0, web unit 726/0, a11y 14/0, `__RS_APP_SECRET` count in the site bundle 0.
- [x] **D-8.14** *(new developer, round 14 — reviewed and verified by the other agent)* `apps/mobile/tests/breaks.sh` now has a real
  `run_break`: scratch copies outside the tree, a `BREAKS_ONLY` filter, `PASS`/`FAIL` counters, `BROKEN-BREAK` when the sed matched nothing, and
  `die` unless the restore is byte-for-byte. Six cases, all CAUGHT, `examined 6 check(s), 0 missed`, exit 0 — verified on this checkout, not on his
  machine. His helper is stricter than the web one it was modelled on: it demands that the failing `not ok` line names the expected test, so a
  crash-everything mutation cannot masquerade as a catch. One residual to raise with him next: a mutation that breaks syntax would still make the
  named test go red and count as caught — a cap on how many tests may fail per case would close that. G-119 CLOSED by him.
- [ ] **D-8.15** Device verification of the whole flow on the owner's phone with the **v7** installer (code 7, rebuilt by CI after this commit): cold start offline → the honest
  card; online → splash → app → enrol 200 → sign-in accepted → a booking round-trip. Also the one thing no harness can prove here: `mountBundle` inside
  Android System WebView rather than Chromium.
- [ ] **D-8.16** Play Integrity (the header comment's next gate, needs the owner's Google Cloud project): replaces our "this came from our app" claim with
  Google's, and is the only remaining reason to hold any key. Decided against doing it blind — it needs a cloud project, a service account and a real
  Play-signed app, none of which exist yet.
- [ ] **D-8.19** Set `MOBILE_DEVICE_TOKEN_KEY` on the deployed mobile service — one value, 32 characters or more, e.g.
  `openssl rand -hex 32`. Nothing breaks without it (that is deliberate: `G-120`'s lesson is that a missing key must not lock installs
  out), but without it a restart invalidates every device token and a second instance refuses the first one's devices, so each install
  pays a re-enrolment round trip. `POST /v1/mobile/enroll` answers `key:"ephemeral"` while this is unset and `key:"configured"` after.
  A key shorter than 32 chars is refused as a key and reported as ephemeral, so a placeholder value cannot look like a finished job.
- [ ] **D-8.18** Give the shipped installer a stable signature. Measured 2026-09-07: CI ships the `assembleDebug` output
  (`.github/workflows/ci.yml:168`), signed with `CN=Android Debug, O=Android, serial=01`, and **two builds of the same `versionCode 6`
  carry different public keys** (`b80a9062d671…` vs `49fc80d9de05…`) because nothing caches a debug keystore — so a phone that installed
  one build cannot update onto the next (Android refuses a different signer: `INSTALL_FAILED_UPDATE_INCOMPATIBLE`) and a debug build keeps
  WebView inspection on. The plumbing already exists and is unwired: `apps/mobile/scripts/make-release.sh` reads `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, and the `apk-release` job runs it "signed when secrets exist".
  Done means: the four secrets set by the owner, a release-signed APK committed at `apps/web/downloads/android.apk`, the same bytes at
  `/download/android`, a stable key across two consecutive builds (`openssl x509 -inform DER -noout -pubkey | openssl sha256` on each), and
  a `versionCode` bump so the store path agrees. Until then the download is a tester channel, not a user channel. **Done 2026-09-07 (round 14):** `prepare-android.sh` (one prep for both variants — release used to skip the permissions, icons
  and night-splash patches, so swapping the landing page onto the signed build would have shipped a worse binary) and
  `apply-android-manifest.sh` (permissions + `allowBackup=false`, G-122); the `apk` job now chooses the variant itself —
  `make-release.sh` when the four secrets exist, `make-apk.sh` with a `::notice` until then — and prints the signer's certificate on
  every run; `version.code` 6 → 7 because the binary changes. Proven by execution, not by reading the files: `RS_PREP_DRY=1` prints
  both variants' prep lists and `config.test.js` compares them — seen red two ways on purpose (manifest script stubbed to `exit 0` →
  `missing ACCESS_COARSE_LOCATION`; release prep skipping the icons step → `release prep diverged from debug prep`).
  **Still waiting on the owner:** the keystore and the four secrets (chunk A2 of `NEXT_SESSIONS_ROADMAP.md`).
  Landed so far: CI ran the new job (renamed `Android installer (signed when the keystore exists)`) and committed **Installer v0.1.0 (7)**, still the debug variant as designed while the
  secrets are absent. It also exposed `G-123` (the night-splash lint failure), fixed in the same pass.
- [x] **D-8.20** The app's top bar is a bar: flush to the top, its own air, and a modern edge (owner's round-17 notes, 2026-09-08).
  Measured before: `title.b == head.b` (0 px under the title), `headTop 14` at ≥1200 and `8` everywhere from the page-in `translateY`,
  `border-bottom:0` + `box-shadow:none`, and `.nav{transition:none}` snapping the rail 144 px. After: `--head-t:12px/--head-b:16px` worn
  by the head (16 px of air under the title, measured at 320→1920), `headTop 0.0` at every viewport, the entrance animation moved to
  `.main__inner>*` so chrome never lifts, and the edge is one shared recipe — hairline + `--edge-h` fade on a pseudo-element outside the
  box, deepening while `.main.is-rolled` (Material 3 `scrolledUnderElevation` / iOS 26 scroll edge). The bottom menu, which the owner
  called the good one, now draws the *same* two layers, mirrored, and gave up its own `border-top`.
  Proven: unit 726→748, layout 7570→12520 (per-viewport geometry + both sides of the motion query: `0.28s` vs `0s`), 10 new
  `breaks.sh` cases all CAUGHT. `version.code` → 8 so the bundle inside installed apps changes through OTA.
  **Still open, and not a CSS fix:** `G-124` — the native status-bar band in the installed app needs edge-to-edge on the window
  (`apps/mobile`), i.e. a new binary, not a bundle.
- [x] **D-8.21** Round 17b — the owner rejected 17's fade and named the fix: the bottom menu's plain 1px line, the same on the head, only while
  content is under it. Done as ordered: `--edge-*` tokens and both pseudo-layers deleted, `.nav` back to `border-top:1px solid var(--line)`,
  `.topbar` = `border-bottom:1px solid transparent` → `var(--line)` under `.main.is-rolled`, arrival transition inside the motion guard,
  `--head-t/--head-b` and the flush top kept because those were praised. `version.code` 9. Guards rewritten in the same commit (unit 748,
  layout 11875 with the line's colour asserted *equal* to the other bar's, 11 `breaks.sh` cases CAUGHT incl. one that re-adds a fade token to
  prove the rejection is enforced), `apps/mobile` 34/34 incl. the build-log line that prints boot vs OTA bytes. See APP_GUI.md §16 rule 2 — the
  research is recorded *and* overruled, so the next round neither repeats the fade nor thinks a gradient is a design decision.
- [ ] **D-8.22** The push that changes app GUI must touch `apps/mobile/**` too, or the mobile service never redeploys and installed phones keep
  the old bundle (measured: 3 pushes, `versionCode` stuck at 7 for ~30 min, then 8 within ~60 s of a push touching `apps/mobile/tests/`).
  Either widen Railway's trigger for the `mobile` service, or keep the standing habit of landing a mobile-side file with GUI work. The build log
  line from 17b is the cheapest such file to touch honestly — see APP_GUI.md §18.

- [x] **D-8.17** Exec bits are now part of the gate: `scripts/check-exec-bits.sh` (in `verify-repo.sh`'s standard set) asserts every shebang'd `*.sh`
  is `100755` **in the index**. This caught a real red — `verify-gui` failed on `./verify.sh: Permission denied` after a rehydrate staged mode 644 for
  all 23 scripts (G-118). Working rule for this environment: restore `core.fileMode false` before any `git add`, not only during recovery.

