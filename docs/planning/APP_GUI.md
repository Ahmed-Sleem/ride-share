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


## 9. The auto-update contract, and what a GUI round may touch (2026-09-06, read from the files)

The owner's condition was explicit: *the app is fixed, and once open it calls the server to
download the GUI — update only the GUI without breaking this architecture*. It was verified by
reading `apps/mobile/scripts/build.js`, `apps/mobile/server.js` and `apps/mobile/offline.html`
rather than inferred. There are two planes, and they have different update paths.

**Plane A — delivered over the air, no new binary.** `apps/web/**` → `apps/web/build.js` →
`apps/mobile/scripts/build.js` takes that HTML and writes it to `apps/mobile/dist/www/index.html`
with one added tag injecting `window.__RS_SURFACE / __RS_PUBLIC_ORIGIN / __RS_APP_ID /
__RS_APP_SECRET`. The Railway `mobile` service serves exactly that file at
`GET /v1/mobile/bundle` (`cache-control: no-store`, `x-rs-sha256`, `x-rs-version-code`), answers
`GET /v1/mobile/update` with `{versionCode, versionName, sha256, bytes}` (503 `BUNDLE_MISSING`
when absent), gates both behind `appProof(req)` (HMAC over `appId\nts\nmethod\npath`), keeps `/`
at 403 `NOT_A_WEBSITE`, maps `/v1/config` to `platform/surface:"mobile"` and proxies `/v1/*` to
Nest. `bundleMeta()` (server.js:70-84) **hashes the bytes on every request**, so a changed GUI is
picked up with **no version bump and no second bundling step** — which is why this round added
neither. The WebView's hop to the live copy is `location.replace(__RS_PUBLIC_ORIGIN)`.

**Plane B — baked into the APK, needs a new binary.** `www/index.html` inside the APK is
`offline.html` plus the injection tag (that is why an offline device never shows Android's error
page), together with the generated `capacitor.config.json` (native `SplashScreen.backgroundColor`,
`androidScheme`, `allowNavigation`), the launcher icons and the permissions.

| What changed this round | Plane | Reaches installed devices? |
|---|---|---|
| Page head, poster title, one rhythm, glass, splash/auth/intro skins | A | yes, on next open |
| `offline.html` palette, faces, dark block (all generated from `brand.json`) | B | only fresh installs — the baked boot page is what changes, so a device that already cached a bundle keeps its old boot page |
| `capacitor.config.json` | generated, B | untouched: editing it by hand is drift, see G-095 |
| Landing download button, `brand.json` dead field | A / config | landing is the web app, so yes |

The one honest caveat: the **native** splash colour is a single value from `brand.json`
(`browserThemeColor.light`), so a dark-mode device still flashes paper-white before the boot page
paints. That is fixed in Android `values-night`, i.e. in the binary, not here.

## 10. Round 9 — the renewal applied to the repo (2026-09-06)

Skin v2 was moved out of `/home/user/preview/app-ink/ink-skin.css` and into
`apps/web/src/styles/shell.html` + `src/shell/app.js`, with the demo's numbers as the target:

- **The bar is gone as chrome.** `.topbar` is now a two-row head grid — controls above, title
  below — rendered by the shell as the **first block of `.main__inner`**; `background:transparent`
  and `border-bottom:0` at rest, `position:sticky;top:0` with `var(--glass)` +
  `var(--glass-blur)`, and the negative inline margin that lets the blur span the gutter so content
  emerges from under glass rather than a hard edge. `--topbar-h` is deleted (0 references left).
- **Poster head.** `--f-poster` / `--fw-heavy` / uppercase / `--lh-poster` / `--measure-poster`,
  Arabic added to the single display-face list so the head, the auth step title and the intro title
  take Jomhuria with `--lead-display-rtl`.
- **One rhythm.** `.main`/`.main__inner` now use `padding-inline:var(--gutter)`,
  `gap:var(--flow)` and `.main__inner > * { margin-block:0 }`, so head, band and cards share both
  the inline edge and the block gap (demo: 298/298/298 px edges, every gap `--flow` = 22 px).
- **Splash, auth, intro**: `.splash__name` on `--f-word`, `.metric` hairline, `.sheet` on glass,
  `.authmain`/`.authfoot` on `--gutter`, `.authmain .t-head` as a poster head. Measured in the repo
  build, not only the demo: see §11.
- **Three literals promoted** (`--track-poster`, `--lh-poster`, `--measure-poster`) and the three
  components that restated the tracking by hand now read the token:
  `grep -c "letter-spacing:-.04em" src/styles/shell.html` → **0**.
- **The download button, and the bug behind it**: the page had the markup and not the control.
  `SVG_TAGS` in `components.js` claimed `"a"`, so `$()` built an SVG anchor — 0×0 in an HTML document,
  attributes intact, invisible. Dropping `"a"` from the set (drawing tags only) makes it `238×44`, and
  `mkActions` now owns the link branch so the card's button and the QR are generated from the same
  `apkDownloadUrl()`. The hero version was measured and removed (`350×0`), along with the lede that
  repeated the card's sentence. See G-101 and D-5.1.
- **Boot page**: `apps/mobile/offline.html` dropped its violet palette, its gradient button and its
  SVG gradient def (the logo now follows `currentColor`, the way the web logo does), gained a
  dark-theme block, and takes its typeface from `brand.json` through an **asserted** marker
  injection in `scripts/build.js`.
- **Guards**: 2 assertions were re-anchored because their subject legitimately moved, and 4 new
  ones were added so the new design is pinned rather than assumed — see the commit note.

## 11. Measured on the repo build (not the demo), 2026-09-06

**D-6.1, the OTA proof in two lines.** After the renewal: `apps/mobile/dist/www/index.html` =
`14cd55544176a1e0…`, 1,137,282 B. What is live now (HEAD's bundle): `9bee41f4df721b23…`,
1,130,591 B. The bytes changed; `versionName 0.1.0` / `versionCode 3` did not, because
`bundleMeta()` hashes the file per request rather than trusting a stamp. That is the whole answer to
"update only the GUI without breaking this arch": no version bump, no new APK, no bundling step
added — the next open fetches the new HTML. The boot page inside the binary is 98,895 B with the
two injected `@font-face` blocks, and `document.fonts.size === 2` measured on it.


Every number below was read out of `apps/web/dist-preview.html` and
`apps/mobile/www/offline.html` by `/home/user/.vtest/{finalshots,headbox,glassproof,authtree}.js`
after `node apps/web/build.js`. The probes are scratch, outside the repo, by design.

| What | Phone 390×844 | Desktop 1280 | How |
|---|---|---|---|
| Head height | 87 px EN · 94 px AR | 123 px EN · 141 px AR | `.topbar` rect |
| Poster size | 28.8 px (clamp floor) | 71.68 px | computed `font-size` |
| Title transform | uppercase, 850, −1.092 px tracking, 25.662 px leading | same | `--fw-heavy`, `--track-poster`, `--lh-poster` |
| Inline edges head / band / card | **20 / 20 / 20** | **298 / 298 / 298** | text-box left (RTL-aware) |
| Column gap | `--flow` 24 px, uniform | 22 px (DEC-200 density) | every consecutive child pair |
| Head material | `rgba(255,255,255,.62)` + `blur(20px) saturate(1.8)` | same | computed `background`/`backdrop-filter` |
| Auth title | 27.3 px, uppercase, 850, −1.092 px | — | `.authwrap__card .t-title` |
| Auth card inset | 20 px (`--gutter`), native border-width 0 | — | `.authwrap` padding |
| Boot page (in the APK) | light `#FFFFFF`/`#0A0A0A`, dark `#0A0A0A`/`#F2F2F2`, logo fill `rgb(10,10,10)` | — | computed on `www/offline.html` |

Two things the measurement caught that reasoning had missed, both fixed in the same pass:

1. **The head's text was 14 px out of line at desktop** (312 against the band's 298). The
   cause was not my grid but a pre-existing rule 1,150 lines later —
   `@media (min-width:1200px){ .topbar{padding-inline:var(--s4)} }`, where `--s4` resolves
   to 14 px — a leftover of when `.topbar` was chrome whose controls needed edge padding.
   Setting it to 0 puts head, band and cards on one edge at every width. The full-bleed
   glass idea was dropped for the same reason it was measured: nothing scrolls outside the
   756 px column, so a wider strip blurs empty space.
2. **`.authmain` / `.authfoot` named nothing.** The auth view builds `.authwrap >
   .authwrap__card` with `h1.t-title` (`src/screens/auth.js:112-118`), so the auth rules my
   first patch wrote were dead code. Retargeted to `.authwrap__card .t-title` and the two
   unused rules deleted — which is also why `--hairline` appears nowhere: the app's real
   hairline token is `--line` (`--ink-200`, `#DEDEDE` / `#262626`), and the auth layer reads
   the same system as the app rather than a legacy one.

**Token audit** (new guard, `unit` group "EVERY TOKEN RESOLVES"): 189 custom properties are
used by the app CSS, 212 are declared, and exactly **one** had no definition — `--f-small` on
`.landing__railink`, the policy rail's link label. The declaration resolved to nothing and the
label inherited the surrounding body size instead of the scale's small step. Fixed to
`--f-cap` (13 px, 12 px under density). The name was introduced by **my own round 5**
(`git log -S"--f-small"` → `059bcef`), which is the point of the guard: no test could see it,
because a dropped `font-size` still leaves readable text. Logged as G-100.

**Glass, proven rather than asserted**: on `rider/plan` at 1280, scrolled 126 px (that page's
full overflow), two blocks sit inside the head's box and `elementsFromPoint` at its centre
returns `topbar__title → topbar → stack → main__inner → main`; cropping the head with the
blur and fill removed differs by 10,774 PNG bytes. D-1.4's pixel proof, closed.

**Suites on this build**: landing **2773/0** (2766 + the 7 namespace/box assertions) · `unit` 676/0 ·
`layout` 7570/0 · `a11y` 14/0 · mobile `config.test.js` ok · `node apps/mobile/scripts/build.js` clean,
`www/offline.html` 98.9 KB with 2 `@font-face` blocks and `document.fonts.size === 2` measured on it.

**One more correction to my own earlier claims, stated plainly.** I wrote, an hour ago, that the card's
button "was already there" and that the round's job was only to share a builder between the two. That was
wrong in the way that matters: the button did not work, and the reason was the element factory itself.
The lesson recorded here is that attribute-level assertions cannot see a missing box — which is exactly
what the new guard now checks. `--topbar-h` 0 references, 0 hand-written
`letter-spacing:-.04em` declarations, 0 gradients and 0 violet hexes in `offline.html`,
`brand.json logo.gradient` deleted.

### Two owner decisions taken after the code (2026-09-06, same day)

- **`brand.json` palette (G-099): yes.** The four ink values now live in the brand file and are injected
  into the boot page, with a guard holding the app stylesheet to them. Chosen because hand-mirroring had
  already drifted by a grey step.
- **Arabic display face: Jomhuria, as shipped.** The head grows 87→94 px on a phone against Cairo 900, and
  a display face is what a poster wants. This closes the last open question in §6 on type; `--brand-font-display`
  and `--lead-display-rtl` stay as they are, applied from one list (§3/G-091).

## 12. Round 10 — the installer is reachable, and the tutorial rejoins the system

Two owner reports, both true, both fixed inside the system.

**Download.** `/download/android` measured **HTTP 404** on live: the route serves a staged file and nothing is staged, while CI's
APK job was *skipped* because it is `needs: verify` and `verify` was red — and even when it runs it publishes an artifact, which
a phone cannot fetch. So CI now also pushes the debug build to a rolling `android-debug` prerelease under the brand's own file
name (`gh release upload --clobber`, `permissions: contents: write`, gated to main), and the server 302s `/download/android`
there, `ANDROID_APK_URL` overriding and the honest `APK_NOT_STAGED` JSON kept for a deployment with neither. The QR and the
button need no change: they always pointed at our own path, which is the point — the target moved, the printed code did not.
`server.test.js` had **no** download test; it has four now, and its response fake is a real `Writable` because
`Readable.pipe` was throwing into a discarded `.catch` and hanging tests instead of failing them.

**The first-open slider.** `introView()` survived the renewal but not the comparison: 27.3 px mixed-case at weight 750 where every
page head is an uppercase 850 poster; a 1280 px footer against a 480 px stage; a head box that grew 51→83 px between slides and
moved the headline 26 px on a phone; and no answer to a swipe. It now takes the poster's leading/tracking/weight/case while keeping
`--f-intro` for size — `--f-poster` is 71.68 px at desktop, which wraps these sentences badly in a 480 px column — shares one
`--intro-col` with the footer, reserves both text slots so the head top is constant (338 phone EN / 332 phone AR / 363 desktop, all
four slides), turns on a horizontal drag and refuses to turn past the last slide, and lost its fifth element to the body copy so no
slide carries a part the others lack. A **How the ride works** row in the rider and driver profiles replays it, on the app surface
only, and deliberately does not mark the tour seen — someone who watches it and walks away is still new.

Architecture untouched: `apps/web/src/**`, the test suites, `apps/web/server.js`, `apps/mobile/scripts/build.js` and CI. The OTA
bundle changed because the GUI changed; `versionCode` did not, so this still arrives with no new APK. What still needs a new binary
is unchanged: `www/index.html`'s boot copy, native splash colour, icons, permissions.

## 13. Round 10b — the splash proportions, the night splash, and the installer's home

Three owner points, all measured first.

**Splash wordmark (G-105).** `--f-word` was `clamp(1.8rem,6.5vw,5rem)`: 28.8 px on a phone, and the 80 px
ceiling from 1231 px up — a word 84 px tall under a 92 px mark, i.e. the label competing with the logo on
the one screen meant to be brief. Retuned to `clamp(1.5rem,1.15rem + .9vw,1.9rem)` → 24 / 25.3 / 29.9 /
30.4 px at 390 / 768 / 1280 / 1600, agreeing with the installer's own boot page (22 px). One consumer, so
the token moved and no override was added. A unit guard pins the clamp's shape, its ceiling (≤ 2rem) and its
floor (≥ 1.3rem), which is the complaint turned into a test.

**Night splash (G-106).** The Android theme the app is generated with has no dark counterpart at all — read
out of `@capacitor/cli` 8.5.0's own `android-template.tar.gz`, not from memory — so a dark-mode cold start
paints the daylight splash drawable and then goes dark. `scripts/apply-android-night-splash.js` writes
`values-night/{colors,styles}.xml` after `cap add android`, painting `brand.json`'s `palette.dark.paper`, and
throws if the day theme's anchor has moved. `config.test.js` runs it against the real template text and
checks the output, that a second run rewrites nothing, and that a moved anchor fails loudly. This is a binary
plane change: installed devices keep the flash until the installer is reinstalled, and `capacitor.config.json`
still carries its single-valued `SplashScreen.backgroundColor` because that is what the plugin reads.

**The installer's home (G-107).** Kept in the repo, at the path `apps/web/server.js` already serves, committed
by CI only when its sha256 changes, capped at 60 MB, `[skip ci]`. `.gitignore` said `*.apk` — a deliberate
earlier decision — so the exception is narrow and documented instead of quietly bypassed, and the cost is
stated: every clone carries the file, and reclaiming it later means rewriting history. The `android-debug`
release publish remains wired as the fallback the server redirects to, so the landing page's button and QR are
correct whether or not a file is staged. This sandbox cannot build the APK (no Android SDK, 1.9 GB RAM), so the
first bytes arrive from CI on this push; D-8.1 measures them before anything is called done.

## 14. Round 11 - the app reaches the server, and the menu becomes a sheet

Two reports from the owner's own phone, both fixed against evidence rather than description.

**The app opened onto "Check your internet connection" and stayed there.** The installed binary is the record: its
`assets/capacitor.config.json` carries no `server.url` (correct - the app must start from a file, guarded since round 9
by `config.test.js:43`), its `assets/public/index.html` is byte-identical to `offline.html` (99,194 B, sha256
`688346062f21c962`) because the boot page is the entry file by design, and its `SplashScreen` colour was `#FFFFFF` with
the night override from round 10b present in `res/`. What was missing was the address it dials: `liveOrigin()` read only
Railway-runtime variables, so the CI installer baked `""`, and `boot()`'s `if (!origin) return showOffline()` meant no
attempt, no status, no splash, and a Retry that redid nothing. Independently, the mobile server answered neither the
preflight nor the CORS question for `Origin: https://localhost`, so even a correct address was blocked before it started.
So: one module resolves the origin (env order documented, `brand.json app.origin` as the floor, a thrown build error
instead of an empty string, `new URL()` so `"https://"` and `"/base"` cannot pass); the four OTA paths answer OPTIONS
and echo only the app's own local origins; and the boot page now states what it tried, repeats it where it is visible,
and marks itself busy. The signature check that "failed" on the first look was my probe looking only in `META-INF`:
`APK Sig Block 42` at 27,831,431 before the central directory at 27,882,418 means v2/v3-signed and installable.
This is a baked change - devices need the new installer, so `version.code` moved 3 → 4 and the release asset and
`apps/web/downloads/android.apk` follow on the next CI run; after that the interface still arrives over the air.

**The landing's mobile menu is now a sheet.** It was already the bar's glass - measured alpha 0.62 against the bar's
0.62 - but it hung under the bar inside a `backdrop-filter`ed ancestor, which makes that bar the containing block for
anything `position:fixed`, so "full screen" was impossible and "glassy" had nothing to frost. It is a sibling of the
bar now, built by the same `landingMenuSheet()` the render path uses, z 19 beneath the bar's 20 so the dots that opened
it close it, `inset:0` measured at 390×844 against an ICB of 390×844, seven rows at 22px bold ink in 57px rows, and
Escape or a tap on the frost closes it. The scroll jump was structural: `.landing` is the scroller and `render()`
replaces it - so a disclosure does not re-render at all, and the render path keeps a measured restore (instant, and
re-asserted a frame later) for the language and theme switches, which had the same bug the owner has not reported yet.

## 15. The app's identity layer (2026-09-07, D-8.12 / G-117)

The GUI work ran into an architecture question: an installed app could reach its interface but not its data. The gate expected an HMAC signed
with a phrase the client had to hold, and no client can hold a secret — a bundle is public text, an APK is a zip anyone owns, and the bundle is
rebuilt at every commit. The app's identity is now *minted*, not *proven by the client*: `POST /v1/mobile/enroll` accepts a random per-install
device id (no hardware serial, no personal data) and returns a short-lived token the service signs with a key that never leaves it; personal
routes carry `x-rs-device-token`, and a stale token is refreshed and the call replayed once, invisibly.

Two design points worth keeping in view while the GUI changes around it. First, the boot page and the app no longer need anything baked, so the
"local-first + OTA" architecture is now the *only* update path rather than one of two — no future GUI change will ever require a new installer for
an identity reason. Second, this layer is attestation, never auth: it says which program is asking; the bearer token from login says who the person
is, and it is the only thing forwarded to the private api. The device token is deliberately dropped at the proxy so the api cannot come to depend on
it, and the api keeps its own throttling for anything that touches a person.


## 16. Round 17 — the bar's air, edge, and the rail's travel (owner's notes on the running app)

Three rules came out of renewing the app's top bar, and they belong here because they are easy to lose:

1. **A bar's air is its own tokens.** `--head-t` / `--head-b` are worn by `.topbar`, and the status-bar inset is *added* to the top
   (`calc(var(--head-t) + var(--safe-t))`) rather than replacing it. A bar with no bottom padding has its title touching the edge of
   itself, which is what "thin" means when someone says a bar is thin.
2. **An edge is one hairline, and the head's is earned by the scroll.** Round 17 shipped a hairline *plus* a 14 px fade, drawn by
   `.topbar::after`/`.nav::before` with `--edge-h`/`--edge-scrim` per theme (the Material 3 `scrolledUnderElevation` / iOS 26 scroll-edge
   family). **The owner tried it and rejected it: "the edges is very very bad, revert to the older simple line edge of the bottom menu,
   use the same in the top menu, and make it only visible on scroll."** So round 17b deleted the fade and both tokens, gave the bottom
   menu back its own `border-top:1px solid var(--line)`, and gave the head that same line as `border-bottom:1px solid transparent`
   painted to `var(--line)` only while `.main.is-rolled` (set by `Motion.scrollEdge`).
   Two things are worth keeping from the episode. The **width is reserved, not added**: a border that appears on the first scroll event
   would move the sticky bar's content by 1 px at the exact moment the page is moving. And the rejection is now a guard —
   `the treatment the owner rejected stays out of the sheet` asserts no `--edge-` token and no bar pseudo-element exists, with a
   `breaks.sh` case that puts one token back to prove the guard bites. Research earns its place by surviving contact with the owner;
   where it doesn't, the simpler thing the app already had was the design.
3. **Entrance motion belongs to the page, not to its chrome.** `.main__inner>*{animation:pagein}` with `.main__inner>.topbar{animation:none}`:
   a sticky bar caught in its own `translateY(8px)` is a gap above the bar for the length of the animation, and it will not show up in a
   source read at all — only in a measured frame.

Behaviour in JS, the look in the sheet: `Motion.scrollEdge(scroller)` returns a detach and owns nothing but the boolean.
Motion also has to answer to `prefers-reduced-motion`: the rail's `transition:width` and the label fade live inside
`@media (prefers-reduced-motion:no-preference) and (min-width:600px)`, and the layout suite asserts both sides of it, because Chrome
under `reduce` reports `0.00001s` rather than `0s` — so the predicate is "no travel", not "zero".

## 17. Where the app's GUI actually comes from (measured while shipping round 17)

The installed APK contains a **boot page**, not the app: `assets/public/index.html` inside the shipped binary is 100,474 B and carries the splash and
the OTA fetch, with no `.topbar` and no `--s2` in it. The 1.1 MB built page the shell suites test never enters the binary. Therefore:

* renewing app GUI = rebuilding the web bundle and publishing it through `/v1/mobile/update` + `/v1/mobile/bundle`; the installer is irrelevant to it;
* `version.code` in `packages/brand/brand.json` is the only lever that makes an installed app take a new GUI, and it must go **up**;
* a service that has not redeployed serves a stale GUI forever — the mobile service kept serving the round-16 bundle for 20+ minutes after the commit,
  while the web origin had the new page in ~90 s. If a tester reports "nothing changed", measure `/v1/mobile/update` before believing anything else;
* the native band above the bar (`G-124`) is the one part that genuinely needs a new binary, because it is the window, not the page.

## 18. Round 17b — what a GUI change has to pass through to reach a phone

The owner's verdict on the edge arrived as a CSS-only change, and reaching a device still took four steps, each of which can silently
stop it: `apps/web` build → `dist/index.html`; the mobile generator → `dist/www/index.html` + `dist/meta.json` (the OTA artifact and its
`versionCode`); the **mobile** service redeploying — which it does only for pushes touching `apps/mobile/**`, so an `apps/web`-only push
leaves devices on the old GUI indefinitely; and finally `brand.version.code` going up, because that is the only thing an installed app
compares. `scripts/build.js` now prints `boot … bytes → www/ | app … bytes → dist/www/ (OTA, versionCode N)` so the first two are
visible in any build log, and `config.test.js` guards that line.

## 19. Round 18 — motion a person can actually trigger, and the spring recipe

Three laws, in the order they cost us time:

1. **A transition belongs to an element that survives the interaction.** `transition` is the difference between two paints of *one* node. A
   control that changes a look by rebuilding the tree deletes the thing that would have animated, and the rule reads perfectly in a stylesheet
   while never firing. So a look-only toggle (fold the rail) mutates state in place; anything that navigates may rebuild. The guard has to be
   behavioural — click the control and assert `t.q(".nav")===navBefore` — because a guard that *sets the class itself* measures the cascade,
   not the user's path. Round 17's guard did exactly that and stayed green over a rail that never moved.
2. **A page that defers its own render will hide the rebuild from a synchronous check.** `render()` goes through `PageFx.armed()`, so after a
   click the DOM has not changed *yet*. Node identity alone therefore survives a regression; pin the wiring too (the handler's name in the
   bundle, and the absence of a rebuild in the handler's own body) and let the layout suite measure both directions on one element.
3. **Overshoot is allowed on space, never on alpha.** Material names it: spatial springs (size, position) may pass the target; effect springs
   (opacity, colour) must not. A bounce in opacity is a flash. That single rule decided every split in this block — `--rail-in-ease` on
   `width`/`padding-inline`, `--ease` on the label fade, and a faster non-overshooting `--rail-out-ease` on the way back out.

Regenerating the curve rather than tuning it by eye (these are the numbers in `--rail-in-ease`, and the unit assertion that bounds the overshoot
to 4-15% is what stops a later edit from sliding into clown territory):

```python
z  = 0.65                     # damping ratio: 0.7 → ~4.6% overshoot, 0.6 → ~9.5%, 1.0 → none
wn = 4.0/(z*0.43)             # choose ω so the 2% settle lands where the duration should be
wd = wn*math.sqrt(1-z*z)
p  = lambda t: 1-math.exp(-z*wn*t)*(math.cos(wd*t) + (z/math.sqrt(1-z*z))*math.sin(wd*t))
# sample p across the settle time, 21-25 points, round to 3 dp, hand it to linear(); keep a
# cubic-bezier declared FIRST for engines without linear() — a var() is not validated at parse
# time, so the duplicate-declaration fallback trick does not work with custom properties, which
# is exactly why this is an @supports block and not two lines.
```

And one delivery note that is not about CSS: **the artifact is not the source.** `rule()` and friends read `dist-preview.html`, so after any edit
to the sheet or a module, rebuild before believing a suite — or you will spend a round debugging a file that no longer exists, which is what
"Could not parse CSS stylesheet" was this round: a comment left where a deleted rule had been, in a build nobody had regenerated.

## 20. Round 20 - permissions, and where the OS ends

The owner asked the right question at the right time: *does the app ask before it takes the location?* The answer, measured in the
dependencies rather than from memory, is that **the asking is not our code** — which is a good thing to know, because it means a GUI
round can never delete it.

| Who prompts | Where it lives | What we had to do |
|---|---|---|
| Android, for location | `@capacitor/android` 8.5.1, `BridgeWebChromeClient.onGeolocationPermissionsShowPrompt` — requests `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION`, grants the WebView, and honours a coarse-only answer on API 31+ | Declare the permissions (`apply-android-manifest.sh`). Nothing in JS. |
| Android, for `getUserMedia` | same file, `onPermissionRequest` — maps VIDEO_CAPTURE to CAMERA, AUDIO_CAPTURE to RECORD_AUDIO | Declare `CAMERA` (G-127). The WebView path and the MLKit plugin path both needed it. |
| Chrome/Firefox/Safari, on the web origin | the browser's own prompt, stored **per origin**, reset from the site-info icon | Nothing — but the app and the browser are two separate permission states, which is why the owner saw a prompt on the site and a different one in the APK. |
| iOS | no iOS build exists; `Camera`, `Location` usage strings would be needed the day one does | Recorded, not fictional. |

Two rules fall out of that table, and both are now in the tests:

1. **A permission is a binary fact, so it is declared where binaries are made.** `apps/mobile/scripts/apply-android-manifest.sh` owns the
   list; `config.test.js` runs it against a real manifest and asserts placement, a count of exactly one, idempotency, and that the result
   still parses. A `plugins` or `capacitor.config.json` entry is never the place a permission is granted.
2. **A plugin config block is only real if the plugin is installed.** Capacitor reads `plugins` at exactly one call site
   (`CapConfig#getPluginConfig`), asked for by the id of a loaded plugin, so `StatusBar { style: "DARK" }` and
   `SplashScreen { backgroundColor: "#FFFFFF" }` were configuring nothing (G-126). The bars are painted by the generated theme instead, in
   `apply-android-system-bars.js`, from `packages/brand/brand.json`: transparent status and navigation bars, `windowLightStatusBar` true by
   day and false by night, OS contrast enforcement off. That is the whole native surface — two colours and two icon flags, no length, no
   font, no spacing — which is the answer to the owner's worry that a GUI could get "hardcoded in the app": it cannot, because the page owns
   every pixel inside the bars, and the bars' colours come from the same palette file the sheet reads.

The one limit worth saying out loud: a **theme** cannot know about an *in-app* light/dark toggle, only the system's. `D-8.27` items D3/D4 are
the box that tells us whether that is acceptable or whether the native side owes a one-time inset bridge. And `ACCESS_BACKGROUND_LOCATION` is
declared while nothing uses it (`G-128`) - an owner decision, not a bug.
