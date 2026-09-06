# APP GUI — study and plan of record (phase 2)

Status: **preparation only. No app code has been changed.** Written after round 7 of the landing
renewal; the owner asked to study the current app GUI deeply, revise the rules, clean the
workspace, and report back before any implementation.

Rules re-read this session: `~/uploads/GENERAL_GUI_AGENT_RULES.md` (§0.1 outcomes, §3.3 no magic-value
drift, §5.1 one implementation per concept, §9.1 analyze the reference before implementing, §13 the four
state classes, §18.2 a check must be able to fail, §18.3 the layout matrix) and
`~/uploads/AGENT_RULES_SANITIZED_ACTIVE (1).md` (§0.1 checklists, §0.2 a check that cannot fail is not a
check, §0.3 library-first, §3.1 every gap tracked, §6.3 no push before validation, §7.0 break every test
you write).

---

## 0. Where the app GUI actually is (the service map, verified 2026-09-06)

The owner's correction was right in one respect and the demo was wrong in another, so the map is
stated from the files rather than from memory:

| Piece | Path | What it is |
| --- | --- | --- |
| **The app GUI code** | `apps/web/src/{shell,lib,screens,styles,data}` | 43 page entries across 6 roles in one `PAGES` table, 9 `SHEETS`, 18-component kit, the 1,608-line sheet. This IS the app — not a second codebase. |
| **The web service** | Railway `web`, built from `apps/web` | serves the landing **and** the signed-in app from the same bundle |
| **The mobile component** | `apps/mobile` (`server.js` 185, `offline.html` 220, `capacitor.config.json`, `scripts/`, 4 test files) | **an app API, not a website**: `/` is JSON 403, `/v1/*` proxies to the private Nest API, plus `/v1/mobile/update` and `/v1/mobile/bundle` for OTA |
| **The APK** | Capacitor Android project, `webDir: www` | `apps/mobile/scripts/build.js` assembles `www/` "from the ONE web build … **Never fork screens**" — verified in its header comment |
| **Native chrome** | `packages/platform/src/index.js` | `Platform.applyChrome` sets the status-bar style per theme (line 204-207); screens never import `@capacitor/*` |

Consequences, each of which the owner's "different component in railway" is about:
1. **Skinning `apps/web` is skinning the app**, because the APK bakes that same build — and a browser
   visit to the `mobile` origin serves it too. There is no third GUI to renew.
2. **The app never appears in the built file unless you are signed in.** `boot()` resolves a session and
   otherwise calls `guestHome()` → the landing. The first demo therefore showed the landing: the review
   harness now boots straight into the app (measured after boot: `{view:"app",role:"rider",page:"home",
   authed:true,landing:false}`) with role/skin/lang/theme buttons.
3. **Two surfaces live outside `apps/web` and are still pre-renewal.** `apps/mobile/offline.html` ships
   its own palette (12 hard-coded hexes; the primary action is a `linear-gradient(135deg,#6C63FF,
   #5A4FD9)` violet gradient — measured on the rendered button: `background-image: linear-gradient
   (135deg, rgb(108, 9…` and `background-color: rgba(0,0,0,0)`), and `capacitor.config.json` sets
   `SplashScreen.backgroundColor` to `#6C63FF`, so the first pixels in the APK are off-system while the
   web splash is `background:var(--paper);color:var(--ink)`. Logged as G-094 and G-095.
4. `MOBILE_PUBLIC_ORIGIN` is referenced twice in `.github/workflows/ci.yml` (136, 170) but whether the
   Actions **variable** is populated cannot be checked without the PAT; if unset, an installed APK keeps
   its baked `www/` and does not live-update. Marked unverified rather than assumed.

## 1. What the app GUI actually is (inventory, all counted today)

| Layer | Where | Size | Notes |
| --- | --- | --- | --- |
| Shell + router | `src/shell/app.js` | 430 lines | One `PAGES` table per role, one `SHEETS` table, `render()` → `renderUnsafe()` |
| Component kit | `src/lib/components.js` | 620 lines | 18 components: `ICON Btn IconBtn Chip Divider Section KV Empty Row SearchBar Table Sheet OtpInput MapView InstallQR QRPanel VehicleId RouteCard` |
| Landing kit (renewal) | `src/lib/landing-parts.js` | 459 lines | 22 `mk*` builders — **used by the landing only** |
| Screens | `src/screens/*.js` | 3,441 lines | ~125 functions; the app owns ~110 of them |
| Stylesheet | `src/styles/shell.html` | 1,608 lines, 18 sections | 130 `.landing*` + 43 `.journey*` rules vs ~150 app rules |
| Copy | `src/data/content.js` | 917 lines | EN + AR tables |
| Geography | `src/data/journey.js` | 855 lines | `JOURNEY_ROUTE/SEA/COAST/CANAL/ROADS/MARKS/BBOX` — **shared by the landing map and the app map** |
| Transitions | `src/lib/pagefx.js` | 222 lines | already wired into `render()`, so the app gets the curtain for free |
| Motion | `src/lib/motion.js` | 462 lines | the landing's `journey()` layout/scroll |
| Maps | `src/lib/map.js` (301) + `MapView` in components.js | — | **two primitives, one job** (see A-1) |

Surfaces, counted from `PAGES`: rider 13, driver 5, ops 5, manager 6, support 4, super_admin 10 =
**43 page entries** (several reuse one function, e.g. `staffProfile`, `opsQueue`, `managerBoard`), plus
9 sheets, `auth` (signup/signin/otp/forgot), the intro, and the boot splash. Dock pages are the
`dock:true` rows; `foot:true` pins profile; `wide:true` marks the staff tables.

## 2. The app's health, measured (not assumed)

Instrument: `/home/user/.vtest/appscan.js` (scratch, outside the repo) — loads the **built**
`apps/web/dist-preview.html`, sets `S.view="app"` and renders **43 pages × 2 languages × 2 themes = 172
screens**, then walks visible text nodes and focusable controls. Result on `6dc6ac4`:

- renders that threw: **0**
- visible text that is a raw copy key (whole-token shape `word.word` / `word_word`): **0**
- `undefined` / `NaN` / `[object ` in visible text: **0**
- unnamed controls: **0** (first run flagged 4; all were `<input type="hidden">` — the probe was wrong, fixed, not the app)
- dead-end copy ("coming soon", "not available yet"): **0**
- horizontal overflow inside the page scroller: **0**
- pages that don't fill/exceed their scroller: **0** (the "shell occupies exactly one viewport" guard holds)

**Conclusion: the app is functionally sound.** Phase 2 is a design-language renewal and a
centralisation pass, not a repair job — which is the opposite of how the landing started, and it
changes what "done" should mean here (see §5).

## 3. Findings worth a decision or a fix (each with its evidence)

| # | Finding | Evidence |
| --- | --- | --- |
| A-1 | Two map primitives. `map.js` opens with "the ONE data-bound map primitive … nobody hand-rolls a second map (§0.3)", yet `MapView` in `components.js` still draws its own SVG fallback. | `RouteMap` 9 call sites (driver, planner, rider, staff) vs `MapView` 4 (staff only) |
| A-2 | Orphan screens that no navigation reaches. | `function comingSoonRider()` — 1 reference in `src/`, its own definition; `opsStops()` — no `PAGES` entry (`breaks.sh` records the case as retired: "no nav reaches" it) |
| A-3 | The renewed type voice never reaches the app. `--brand-font-display` (Jomhuria) appears **once** in the 1,608-line stylesheet, in `[dir="rtl"] .landing__featuret, .landing__cta-t`. App headings use `--brand-font` at `--brand-font-weight`. | `grep` counts above |
| A-4 | No completeness guard on app copy. 643 `t()` call sites, **364 distinct keys**, of which **20 are built at runtime** (`t("roleLabel."+r)`, `t("j_cat_"+x)`, `t("stopStatus."+s)`, `t("j_dec_"+d)`, `t("w_reason_"+r)`) — the class of key the landing's literal-key guard cannot see. `t()` deliberately returns the raw key when a lookup misses (G-086). | scan of `src/screens/*.js`, `src/lib/components.js`, `src/shell/app.js` |
| A-5 | A comment that misdescribes the code: `SHEETS` says "Safety & support actions arrive in M4 — honest placeholders, no fake calls", but `sosSheet()` composes a real `Banner` + checkbox + `sendSos()`, and `reportSheet`/`shareRideSheet` are wired the same way. Either the comment is stale or the sheets are half-real; must be checked end-to-end against `api.js` before anything else. | `src/shell/app.js:3-6`, `src/screens/rider.js:696-706` |
| A-6 | 71 raw `px` values in the app's stylesheet region (lines 881→1,608) vs 146 in the first 880 — the landing half was tokenised during the renewal, the app half was not audited. Some are legitimate (hairlines, radii); each needs the §3.3 test. | counted |
| A-7 | RTL is still hand-written per component for the app: `[dir="rtl"]` and logical overrides exist for `.sheet`, `.toast`, `.qrcode` etc., whereas the landing now centralises direction through tokens (`--lead-display-rtl`, inset/inline-start geometry). | stylesheet survey |
| A-9 | **`offline.html` duplicates a whole design system** (12 hexes, a violet brand ramp, a gradient button) instead of consuming the ink tokens. *Durable fix:* `apps/mobile/scripts/build.js` already assembles `www/` from the web build — let it inline the token block (and the `@font-face`s) into `offline.html` at build time, so the offline screen cannot drift. A mock of the result is in the demo (`app-ink-offline.html`): flat `rgb(10,10,10)` action on `rgb(255,255,255)` paper, no gradient. |
| A-10 | `capacitor.config.json` pins `SplashScreen.backgroundColor: "#6C63FF"` while `apps/web`'s splash uses ink tokens; the config is static so it cannot read `brand.json`. *Fix:* generate the file from `packages/brand/brand.json` in the mobile build (the script already loads BRAND), or set it to the ink value, and extend `apps/mobile/tests/config.test.js` — which already reads this file — to pin the colour. |
| A-8 | The app's intro is a second implementation of what `mkIntro` now does for the landing (`introSlides()` returns `{ic,k,t,b}` records rendered by `introView()`). Not a defect — a convergence opportunity, since both consume the same key shapes. | `src/screens/landing.js:375-379` |

## 4. Reference material — and the gap

The only demo in the workspace is the **landing** export: `~/uploads/-RIDE-SHARE-COMPL (3).html`
(587 KB, one `<style>`, one `<script>`, classes `hdr nav panel faq policy dl-card`) — searched for app
markers and there are none (`shift` 0, `verify` 0 hits; the `QR`/`OTP` hits belong to the download and
auth panels of the marketing page). **There is no app-GUI demo in the workspace.** So the reference for
"look-alike" in phase 2 has to be chosen by the owner (§6, Q-1).

## 5. Proposed phasing (each round independently shippable and revertible)

**P2-A — foundations, no visible risk (½ session).** Converge the maps (A-1) and delete `MapView`
behind an `archive/` backup, same workflow as G-082; remove the two orphans + their now-unreferenced
keys (A-2, same archive rule); fix or fulfil the safety-sheet claim (A-5) — this one touches API
contracts, so it may split off; add the app-side guards (A-4: whole-token scan over every rendered
screen, both languages, both themes, wired into `unit.test.js` so 172 renders become a permanent check;
plus "no `PAGES` entry may point at a missing function and no screen function may be unreachable");
replace the stale comment; settle the raw-px census (A-6) into tokens or record why not.
Gate: `apps/web/verify.sh` + `./tests/breaks.sh` + `./tests/layout-breaks.sh`, then push so Railway
redeploys.

**P2-B — the two journeys people use (1 session).** rider (13) + driver (5) + auth + intro + boot:
one type voice decision applied (§3 A-3), the shared `mk*` primitives reused where they fit (Section,
Steps, Slab, Panel, Doc), the state classes (§13: loading/empty/error/offline) verified per screen —
the app already has `Empty` and `Banner`, so this is mostly geometry, density and rhythm, not new
widgets. Screens get measured at 1280/900/390 × en/ar by the existing layout matrix, and every
change must survive the 172-render probe at 0 leaks.

**P2-C — the staff surfaces (1 session).** ops 5 + manager 6 + support 4 + super_admin 10, where
tables (`Table`, `metric`, `rowitem`) and `wide` density dominate; the industry-standard answer is
density tokens plus a real sticky header/row-height contract rather than landing-style glass — decide
here (Q-3) whether staff surfaces join the visual renewal at all or only the shared primitives.

Deliberately **out** until the owner re-orders: the 9 red API journey tests (L2), O-5 (production
audit), and `concurrency: cancel-in-progress` for CI.

## 6. Decisions I need before writing code

- **Q-1 reference.** (a) the owner supplies an app demo like the landing one → strictly look-alike; (b) no demo — the app inherits the renewed landing system (tokens, type, spacing, curtain, `mk*` where it fits) and I propose geometry per surface; (c) hybrid — (b) now, re-fidelity later if a demo arrives. Recommendation: **c**, because (b) is already most of the work and nothing in (b) is thrown away by a later demo.
- **Q-2 display type inside the app.** (a) Jomhuria for screen titles and empty-state words only, never controls (industry norm for Arabic UI: a workhorse face in the UI, the display face for voice — recommendation); (b) display everywhere the landing uses it; (c) keep the app purely `--brand-font`.
- **Q-3 glass in the app.** (a) the app stays solid, glass remains a landing-only device — on a phone, `backdrop-filter` on a top bar costs frames while scrolling lists, which is the one thing the landing perf round taught us to measure (recommendation); (b) mirror the landing's blur exactly in the app bar and accept the cost; (c) glass only on sheets/modals.
- **Q-4 how far to push convergence now.** (a) all of A-1…A-8 in P2-A/P2-B; (b) only A-1, A-2, A-4, A-5 (measurable + guard-bearing) and defer the rest (recommendation); (c) only the guards, leave the code shape alone until a demo exists.
- **Q-5 staff surfaces.** (a) full renewal in P2-C; (b) primitives + density tokens only, no visual theme work (recommendation: they are internal tools used at width); (c) leave them out of phase 2 entirely.
- **Q-6 sequencing with the open items.** The 9 API journey tests keep `Verify (repo + api + web unit)` red on every push. (a) leave it, land phase 2 regardless (recommendation — the GUI job is green and Railway is unaffected); (b) fix them first, contradicting the standing order to finish the GUI before the API; (c) fix only the 9 tests as a separate one-commit round this session.

## 7. Workspace state after this study pass

Repo tree is clean: `git status --porcelain` → 0 lines; nothing added under `apps/`; the only new file
is this document. Kept deliberately outside the repo: the probe `.vtest/appscan.js` (scratch, re-run:
`bash /home/user/.vtest/ensure-deps.sh && NODE_PATH=/home/user/.vtest/node_modules node appscan.js`).
Not deleted, with the reason: `~/fonts/` (1.5 MB of source `.ttf/.woff2`) is the input for re-subsetting
the Arabic faces — the repo ships only the subsets, so removing it costs reproducibility; `~/preview/`
(1.4 MB) holds the round 5–7 owner screenshots that the checklist cites by name; `~/uploads/` holds the
rule files and the landing demo. Local `main` is one **docs-only** commit ahead of the live tree
(`0492d68`, the L1/L2 checklist tick); pushing it needs the PAT re-supplied, since `/tmp/.tok` was
shredded last session and `/tmp` was rehydrated — nothing user-facing is pending, because the live URL
already equals `6dc6ac4`.

## 8. Skin v2 — the owner's review applied (2026-09-06)

Their notes were two, and both were measurable:

**"No top bar — the page starts with a big rush title."** `.topbar` is no longer chrome: no border,
no fill, no `min-height`, no `nowrap/ellipsis`. It is a two-row grid placed as the first block of the
reading column — controls row on top, poster title underneath, spanning both cells (`--f-poster`
71.68 px at 1280, `--fw-heavy`, uppercase, `letter-spacing -.04em`, `line-height .94`; Arabic takes
Jomhuria with `--lead-display-rtl`). A review button (`ar title`) flips the Arabic poster to Cairo 900
for comparison, because that is a decision, not a defect.

**"Spacing consistent and suitable — the search bar and the top bar and so on."** Measured, not styled
by eye, over all 172 surfaces:

| What | Before (v1 skin) | Now (v2) |
| --- | --- | --- |
| inline edge of head / band / card | 123 / 123 / 298 — a **175 px** mismatch: the head spanned the padded box while the cards sat in the capped column | **298 / 298 / 298** (and 123/123/123 on `wide` staff pages, where the column is uncapped) |
| gap between every pair of blocks in the column | 22 on some, 30 on `driver.work` (its hand-rolled head brings `margin-top:13.28px`) | **22 everywhere** = `--flow`; the 12 remaining 44 s sit next to a zero-height placeholder `<div>` waiting for data (child dump: `{c:"DIV", h:0}`), so they disappear once the screen is populated |
| head height on a page with actions | 219 px — 96 of it was the `h1`'s user-agent `0.67em` top margin (48 px at 71.68 px type), which the old flex bar swallowed and a grid honours | **123 px** (floor 8 + controls 40 + row-gap 8) — `headFloor:56`, exact |
| margins on column children | mixed | **0** — `.main__inner > *{margin-block:0}`, so the gap is the rhythm and no block adds to it |

**Found on the way, and it changes how every number must be read:** the app already has a **density
scale** (DEC-200, `--density` at ≥840 px). It rescales the spacing steps themselves — `--s6` 24→**22**,
`--s5` 20→**18**, `--s8` 40→**36**, `--content-max` 840→**756**, `--rail-collapsed` 80→**72**. So the
skin carries no new numbers: the rhythm is inherited, which is what "centralised" means here. Only
three literals were carried over from the landing's own convention (`-.04em`, `line-height .94`,
`max-width 18ch`), and D-3.1 turns those into named tokens so the habit stops spreading.

**"Same components code design like the landing page."** Recorded as G-097, because it is a code task,
not a stylesheet one: the landing's 22 `mk*` builders (`mkSection`, `mkEyebrow`, `mkLede`, `mkSteps`,
`mkSlab`, `mkPanel`, `mkActions`, `mkDoc`…) serve only the landing, while the app has 17 `Section()`
calls against 20 hand-rolled headings (G-093) and its own card/table/row families. The durable shape is
one component library consumed by both surfaces — the app importing the builders, or the builders
absorbing the app's needs — with the guard that no screen hand-rolls what a builder already owns.
