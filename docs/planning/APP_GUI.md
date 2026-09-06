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
