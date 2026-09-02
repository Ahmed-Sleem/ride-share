# Landing rework — the owner's 16, measured against the live page

Every row below was measured on the deployed page (`https://ride-shareweb-production.up.railway.app/`,
1,011,499 bytes, byte-identical to `2d5be58`) or read out of the source at that commit — not guessed
from the demo file. "Cause" is what the measurement showed; the fix is only what that cause requires.

The visual target stays the owner's demo (`uploads/-RIDE-SHARE-COMPL (3).html`), and where this list
reverses a decision made in an earlier round, the reversal is called out so the guard tests are
**re-derived to the new truth** rather than deleted.

| # | Owner's words | Measured cause | Fix | Tests to re-derive |
|---|---|---|---|---|
| 1 | "the map is empty, no text on it, the scroll emphasis we made — like the demo" | **Two defects.** (a) `.journey__svg{position:static}` gives the `<svg>` a 1440×522 box while its `viewBox` is `0 0 1440 1031`, so `preserveAspectRatio` letterboxes the whole drawing to half scale and the lower half of the road is clipped. (b) The demo's display type is gone: `.journey__word` computes **16px** (demo: `clamp(1.8rem,6.5vw,5rem)`), the 7 cuts are a single 610px column with `data-side="null"`, and there is no spotlight dimming the copy until the bus arrives. | Restore the demo's geometry: svg absolutely overlaid on the section (`inset:0`, box = section box, projection already measured at render time), `.journey__cut{width:52%}` alternating with `data-side` at ≥900px, `.journey__word` at the demo's clamp with the variable-weight scrub, the `.journey__shade` radial spotlight following the bus so each cut brightens as it is reached, stops `is-passed`, destination flag `is-arrived`, and the place marks at their true size. | `onMap === 0` (reversal — the claims go back on the road), the `.journey__svg{position:static}` anchor in `layout-breaks.sh`, the "key under the drawing" assertion, the fixed-610px cut width | → **DONE (M1)**
| 2 | "take its time to load, then open, so the transition is not laggy" | The splash releases on `load` with no floor and no font gate, and the curtain's rise is 220 ms while the swap does layout work on the same frame. | Dwell floor + `document.fonts.ready` + a paint barrier before release; run the swap while the page is fully covered (it already does) and drop the 600 ms deadline to the frame budget so nothing waits; measure frame times in Chrome and hold the median under 16.7 ms. | the intro/splash exact-viewport asserts, plus a new frame-time assert |
| 3 | "dark ↔ light must have the same transition" | `PageFx.routeKey` = `view\|page\|landingPage\|landingDoc\|authMode\|role` — **theme is not in it**, so the switch repaints instantly. | Add the theme (and `S.lang`, item 15) to the route key and route both switches through `PageFx.handoff`; the switch itself must still flip `<html data-theme>` synchronously so a curtain never reveals a half-styled page. | the unit guard that enumerates the route key; `pfxgone.js` gains a theme case |
| 4 | "the opened menu should blur what's under it, exactly like the top bar" | `.landing__menu-panel{background:var(--glass-solid)}` = `rgba(255,255,255,.96)`; it *has* `backdrop-filter: blur(20px) saturate(1.8)` but at 96 % the blur is invisible. The top bar is `rgba(255,255,255,.62)` — the same filter at 62 %. | One token: the panel takes `--glass`, the same as `.landing__nav`. Nothing else about the sheet changes. | the sheet's contrast guard must allow `--glass` and still refuse a bare `background:var(--paper)` | → **DONE (M3a)**
| 5 | "full audit that nothing was lost moving the landing to production" | Not yet written as an artifact; the requirements live across 6 docs plus this and the previous owner lists. | `docs/audits/LANDING_PRODUCTION_AUDIT.md`: every rule in §0/§1 of the agent rules, every item of the 12-list, this 16, mapped to file + test + live-URL evidence, run against the deployed page rather than the local tree. Any row without an executable check is listed as *unverified*, never as done. | the audit is itself checked by `scripts/verify-repo.sh` (no "TODO"/placeholder strings) |
| 6 | "remove Create account / Sign in / Get the app from the intro, they are all in the top bar" | The hero block builds a `.landing__actions` group of exactly those three (copy keys `landingCtaStart`, `signIn`, `createAccount`, `downloadCta`). | Delete the group from the hero — the buttons stay in the top bar, nothing else references them. | the auth-group spacing guard (its subject moves to the top bar), the one-slogan rule | → **DONE (M3a)**
| 7 | "the intro texts repeat each other — educate, say it is smart transport, keep all the meaning" | `landingHeroB` + the lede both say "fixed price at booking / published timetable / seat held"; three claims are stated twice inside one screen. | Re-cut the copy: one sentence of what it is (scheduled shared transport on fixed routes), one of what you get (fixed fare, printed timetable, seat held), one of what it is not (not a taxi, not surge). No claim appears twice in the same view; EN and AR in the same commit. | the no-repeat guard (new: no claim key may appear twice per view), the AR/EN key-parity guard |
| 8 | "make 'Want to drive with us?' its own section, bolder, same style" | It is today `mkEyebrow + mkLede + mkActions` — a caption and a paragraph, not a section: no `.landing__sec`, no poster title. | Promote it: `mkSection` with the kick, a `.landing__sec-t` poster title, the lede, and the button — the same section furniture every other block uses, so "bolder" comes from the shared scale and not a one-off style. | the drive-view structure guard |
| 9 | "remove the horizontal line after 'One price. A seat. No queue.'" and 13 | `.landing__steps{border-top:1px solid var(--stage-line)}` — one rule, and it is the line above the numbered steps on **both** quoted blocks. | Remove the border (and its padding weld) from `.landing__steps`. | the rhythm/spine guard that currently expects the rule | → **DONE (M3a)** — with 13
| 10 | "'Back to sign in' should say 'Back to home'" | `content.js:232 landingBack:"Back to sign in"` — used by the auth screens. | Both languages: `Back to home` / `العودة إلى الرئيسية`. The target is the landing, so verify the handler routes to `#/` and not to the sign-in view. | the "way out of the page" guard reads this string |
| 11 | "Terms / Privacy / Safety need the same top bar, and rethink their balance — maybe two columns on desktop, fully adaptive" | The three policy documents render inside the landing's own doc view; their measure is a single centred column with the shared top bar, but the type scale and the section rhythm are the app's, so they read like a different product at ≥1000px. | Proposal (owner's call, see the decision table): shared top bar guaranteed on every doc; desktop = two columns — a sticky contents rail (which doc, which clause) beside the text at a 62ch measure; below 900px it collapses to the current single centred column; bold display headings kept. | the deep battery's policy-doc asserts (measure, no horizontal scroll, back control), the tap-floor checks on the contents rail |
| 12 | "the intro must fill the viewport on every page, driver included — centralise the rule" | `min-height:var(--view-h)` exists only on `.landing__hero`; the drive view's first block is a plain section, so it opens at content height. | One rule for one idea: a `.landing__intro` (or `[data-intro]`) that every surface's first block carries — hero, drive, about, help, download — sized by the same measured `--view-h`, never a literal `100vh`. | the hero-floor assert must iterate over views, not just the rider hero |
| 13 | (folded into 9) | | | | → **DONE (M3a)** — see 9
| 14 | "'What you need' should be in the same style as the rest of the page" | It is rendered as a bare paragraph pair with no kick, no scale token, no section element — the only block on the drive view that is not built from the shared parts. | Rebuild it from the same primitives as its neighbours (`mkSection` + lede + the shared `--flow` rhythm), with the three requirements as the numbered chapter rows the page already uses. | the shared-scale guard (no ad-hoc font-size in the block) |
| 15 | "Arabic needs the same transition and a suitable bold Arabic font" | `S.lang` is not in `routeKey` (same cause as 3); and the AR face is the system stack — `brand.font.family` = `-apple-system, …, "Noto Sans Arabic", sans-serif` at weight 750, so a 750 request lands on `Noto Sans Arabic` only where it happens to be installed, and display sizes get no real bold. | Transition: `S.lang` in the key + `handoff` around the swap (the DOM is rebuilt, so the curtain genuinely helps here). Type: an owner decision (see below) — self-hosted Arabic display face subset vs the system stack. | the font-stack charset guard in `build.js` (a new family must pass it), the AR display overrides at `[dir=rtl]` |
| 16 | "in Arabic the top bar is corrupted" | Measured at 1280px RTL: `.landing__links` sits at **x 53–444** while its sibling group sits at **x 51–329** — a ~115px overlap — because the ≥1000px absolute-centring rule does not hold in RTL (it positions from the inline start, so the centred block lands on top of its neighbour), and a third child has width 0. | Replace absolute centring with a real three-region grid in both directions (`1fr auto 1fr` with the links in the centre track), so nothing can overlap at any width, any direction, any label length. | the nav-centring assert (currently measures the absolute model — it must assert "no overlap" instead of "centred by transform"), plus a new RTL overlap case for every viewport in the battery | → **DONE (M3a)** — and `.sheet`/`.toast` had the same pairing, fixed too

## Phases

One phase per session, each ending with a push and a report.

| Phase | Items | Why grouped |
|---|---|---|
| **M1 — the map** | 1 | The biggest visual defect, its own files (`lib/motion.js`, `lib/landing-parts.js`, `data/journey.js`, the `.journey*` CSS) and its own test reversals. Nothing else should move while its anchors are being re-derived. |
| **M2 — load, curtain, theme, language** | 2, 3, 15-transition | All three are the same mechanism: who may arm the curtain, and when the intro releases. |
| **M3 — top bar and the intro block** | 4, 6, 7, 9, 12, 13, 16, + "Get the app" treatment | Everything the eye hits first: nav geometry (both directions), the glass sheet, the button-less hero, the de-duplicated copy, the viewport rule on every surface. |
| **M4 — the drive view, the policy pages, the audit** | 8, 10, 11, 14, 5 | Structure and copy for the secondary surfaces, then the full production audit last, so it can certify everything above it. |

## Decisions taken (owner, same day)

| Question | Answer | What it commits me to |
|---|---|---|
| Arabic display type | **Self-host Cairo**, subset, weights 400/700/900 | OFL licence, Arabic+Latin subset, base64-inlined like every other asset, ≈45–70 KB on a 988 KB file; `build.js` must validate the new family the way it validates the stack today, and the `[dir=rtl]` overrides get a real bold to act on. M3. |
| "Get the app" in the top bar | **Outlined pill with a filled dot** | Keeps the existing underline weight language, adds `::before` dot in `--ink`; monochrome, inverts with the sheet, no new colour token. M3. |
| Terms / Privacy / Safety | **Two columns with a sticky contents rail** at ≥900px, single centred column below | The rail is the doc's own clause list, so it must be generated from the document model and not written by hand; the shared top bar is asserted, not assumed. M4. |
| The intro's dwell | **"min 1s but it can be more if the device is still loading"** | Floor 1000 ms, and no release before `load` + fonts settle — a slow device waits longer, a fast one still gets a full second. A watchdog releases at 6 s with whatever arrived, so a hanging third-party resource can never hold the page shut. M2. |

## M1 — the map: what was wrong and what the guards now say

Measured on the deployed page before the change, and on the built file after it:

| | before | after |
|---|---|---|
| `<svg>` box vs section box | 1440×**522** vs 1440×1031 → `preserveAspectRatio` halved the drawing and clipped its lower half | equal at 1440 / 1024 / 768 / 390 (`3325px` section, `3324px` map) |
| `.journey__word` computed size | **16 px** | **80 / 66.6 / 49.9 / 28.8 px** — the demo's `clamp(1.8rem,6.5vw,5rem)` |
| cut layout | one 610 px column, `data-side` absent | `left/right/left/right/…`, 52 % of the measure at ≥900, corridor left clear below |
| scroll emphasis | nothing reached the words (`--near` never written) | word opacity 0.55 → 0.87 as its cut crosses the middle; `is-passed` stops 0 → 2 → 4; the bus rides with `translate`+`rotate` |
| horizontal overflow | 0 | 0, at all four widths |

`onMap === 0` ("no type ever shares a box with the road") was the assertion defending the old
band, so it is now the opposite contract and the harnesses were re-derived with it: the unit guard
reads the overlay + `data-side` + the clamp + the Arabic override, `landing.test.js` asserts
`map box == section box` (the measurement that would have caught the emptiness in the first place),
every claim inside the map, the poster scale and — width-aware — either the half-measure rule or a
clear corridor at the far edge, and the two break cases now mutate the overlay into a band instead
of the reverse.

## L2, measured before it is opened

The two red jobs are **not the same fault**, and the difference is knowable from the API alone:

| Commit | what it changed | `Verify (repo + api + web unit)` | `Verify GUI (full browser suite)` |
|---|---|---|---|
| `3857de9` | archive only, no product file | **success** | failure |
| `c16e30d` | the renewal's phase 1 | **failure** | failure |
| `2d5be58`, `9b8d540` | docs, then M1 | failure | failure |

So the GUI job's red **predates the renewal** — it failed on a commit that touched nothing a browser
suite could notice — while the unit/lint/typecheck job was green up to `3857de9` and broke **at the
renewal's own push**. That is ours to fix, and `pnpm verify` = `verify-repo.sh` (green locally, twice)
plus `pnpm -r build / typecheck / lint / test`, so the failure is in one of those four, in some
package, and reachable here: install pnpm, `pnpm install --frozen-lockfile`, then the four commands
one at a time until one speaks. The workflow runs' aggregate status is useless for this question —
every run since 2026-08-25 reads `failure` because the GUI job poisons it; only the per-commit
check-runs endpoint separates the two.

## Phases left

M2 (load dwell, curtain on theme + language), M3 (top bar geometry in both directions, the glass
sheet, the button-less hero, the de-duplicated copy, Cairo, the "Get the app" pill, the intro rule
on every surface), M4 (drive-view structure, "What you need", "Back to home", the policy pages, then
the production audit), then **L1** (both break harnesses to completion) and **L2** (green CI).
