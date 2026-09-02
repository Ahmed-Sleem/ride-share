# Landing checklist — every open item, with the check that closes it

The rule this file exists to enforce: **an item is done only when the executable check below it
passes**, and no item is started before the one above it is closed. Measured, not assumed.

Legend: `[ ]` open · `[x]` closed with the result written next to it.

## Round 4 (the owner's six, this session)

- [x] **R4-1 — "Get the app": the dot stays, the border goes.** `.landing__links .landing__link[data-cta]`
      keeps `::before` and the semibold weight, drops `border`/`border-radius`/padding-as-pill.
      *Check:* unit guard asserts `[data-cta]` has `::before` and **no** `border:1px solid`; the
      landing suite asserts the marked item is still the only one with a dot and its tap box ≥ 24 px.
- [x] **R4-2 — the curtain on language and on theme.** `PageFx.routeKey` gains `S.lang` and
      `S.theme`; `render()` already arms by key, so both switches inherit the transition, and the
      theme attribute is applied inside `renderUnsafe` so the repaint lands at full cover.
      *Check:* unit guard on the key's fields; a Chrome case that flips each switch and asserts the
      `.pagefx` node exists during the swap and is gone 2 s after, in both directions (4 cases).
- [x] **R4-3 — the masthead copy, de-duplicated, teaching the category.** `landingHero` and
      `landingHeroB` in EN and AR: no claim stated twice, "scheduled/shared transport with
      tweaks" said once, every fact kept (published stops and times · one fixed fare for the
      route · seat held before you leave · cash to the driver on boarding · price does not move).
      *Check:* a new unit guard — no lede/body pair on the rider page may share a key phrase —
      plus the one-viewport and no-crop asserts at 26 viewports × both languages.
- [x] **R4-4 — map words: one word per line, always.** `mkJourney` splits the cut title into
      `<span class="journey__wordline">` children (`display:block`), so "Verified drivers" is two
      lines and "Cash at the door" is four; the split is in the markup, not `word-break`, so a
      screen reader reads the phrase and the Arabic form breaks the same way.
      *Check:* unit guard for `journey__wordline` + one-line-per-word; the landing suite counts the
      lines by measured line box height (each word's box must be ≈ one line-height tall and they
      must stack, never sit side by side).
- [x] **R4-5 — "Want to drive with us?" becomes a slab.** Built with `mkSlab` (the page's own
      inverted section: black in light, paper in dark), with a new centred variant
      `.landing__slab--mid`, a kick, the poster title, the lede, and the button — and the primary
      button's colours inverted inside the slab so it never goes black-on-black.
      *Check:* unit guard that the invite is `.landing__slab` and that `.landing__slab .btn` has an
      inverted rule; the landing suite asserts the slab's background is the stage colour and the
      button's contrast against it is ≥ 4.5:1 in both themes.
- [x] **R4-6 — no horizontal lines between blocks, fixed at the component.** Hairlines removed from
      `.landing__section`, `.landing__hero`, `.landing__kick`, `.landing__hero-foot`, `.journey`,
      `.journey__cut` (<900), `.landing__feature`, `.landing__cta-row`, `.landing__foot` — with the
      spacing that the line was doing kept by the shared scale. Kept deliberately: the glass edge
      under the bar and the panel, and the FAQ's row rules, which are list separators, not section
      ones.
      *Check:* unit guard that no landing block-separating rule carries `border-top:1px` /
      `border-bottom:1px solid var(--line)` any more; a `breaks.sh` case that puts one back.

### Round 4 — closed 2026-09-02, with the measurements

All six checks ran and passed on the same tree: **unit 614 · landing 2,590 · a11y 14 · layout 8,185,
zero failures**, `node build.js` → `dist-preview.html` 962.8 KB / 19 modules, `scripts/verify-repo.sh` ✓.

- **R4-1** the guard reads `::before{content:"";width:6px;height:6px` in the `[data-cta]` rule and the
  rule carries no `border:` at all. Screenshot: `● Get the app`, and the same in RTL (`● حمّل التطبيق`).
- **R4-2** Chrome, cold load, 6 runs: the first real click on `.landingsw` draws `.pagefx`
  (`fx:true`) with **0 px of overhang** against the landing box at 1280×900, and the node is gone 2.2 s
  later with the page intact — same four asserts for `.landing__langbtn`. The suite drives both with a
  real pointer, because `armed()` refuses a scripted click on purpose.
- **R4-3** per-claim counting in both languages: no claim word occurs twice across `landingHero` +
  `landingHeroB` (the guard's first version counted them together and correctly failed my own copy for
  two *different* claims in one paragraph — the copy was right, the guard was not).
- **R4-4** every `.journey__word` measured: its `.journey__wordline` boxes have strictly increasing
  tops (never side by side), and a multi-word claim has as many lines as words.
- **R4-5** live `backgroundColor` of `.landing__slab--mid`: `rgb(10,10,10)` in light,
  `rgb(255,255,255)` in dark; `text-align:center`; the slab's own button ≥ 4.5:1 on its face, and the slab's text ≥ 4.5:1 on the
  slab — both themes, both languages.
- **R4-6** `borderTopWidth`/`borderBottomWidth` computed on every `.landing__section`,
  `.landing__feature`, `.journey`, `.landing__foot`, `.landing__hero`, `.landing__hero-foot`,
  `.landing__cta-row`: **0 px** at every width in the battery, and `117px` of section padding doing
  the separation. The FAQ's rows and the glass edges keep theirs by design. The `breaks.sh` case that
  puts a hairline back waits for L1, where the rest of the anchors land together.

Two things this round taught the harness, and they are now rules here:

1. **A guard must measure a state that is reachable at the moment it reads.** `routeLen` read the
   *inked* progress at `scrollTop: 0`, where nothing is inked — so it silently depended on whether the
   map was on screen at load, and went red at every phone width once the map grew a line taller. The
   unscrolled read now checks the geometry (`.journey__line`); the ink moved to the scrolled battery.
2. **A screenshot of an element inside a non-document scroller lies.** Element screenshots clipped the
   hero while claiming to shoot the slab, because `scrollIntoView` on the `<section>` does nothing to
   `.landing`. Scroll the scroller, then clip the viewport.

## Still open from the sixteen (the owner's standing list)

- [ ] **O-2 — the intro's dwell.** Floor 1000 ms, never released before `load` + fonts settle,
      6 s watchdog. *Check:* frame timings + the splash's release time in Chrome.
- [ ] **O-5 — the full production audit.** `docs/audits/LANDING_PRODUCTION_AUDIT.md`, every rule and
      every owner item mapped to file + test + live-URL evidence. *Check:* the audit itself.
- [ ] **O-8 (already asked again as R4-5)** — closed by R4-5.
- [ ] **O-10 — "Back to sign in" → "Back to home"** in both languages, routing to `#/`.
      *Check:* the copy guard + the "way out of the page" assert.
- [ ] **O-11 — Terms / Privacy / Safety**: same bar on all three, two columns with a sticky contents
      rail at ≥900, one centred column below, fully adaptive. *Check:* the deep battery on the three
      docs + a rail-owns-clause assert.
- [ ] **O-12 — the one-screen intro on every surface** (rider, drive, about, help, download) from one
      shared rule, not a per-page `min-height`. *Check:* the hero-floor assert iterates views.
- [ ] **O-14 — "What you need"** rebuilt from the shared primitives. *Check:* the shared-scale guard.
- [ ] **O-15b — a real bold Arabic face**: self-hosted Cairo subset, inlined, validated in `build.js`.
      *Check:* the font-stack guard + a measured AR display weight.
- [ ] **L2 — green CI**: `Verify (repo + api + web unit)` broke at the renewal's own push.
      *Check:* the job, on the newest commit.
- [ ] **L1 — both break harnesses to completion** after the CSS settles (anchors keep moving).
      *Check:* `breaks.sh` 113 + `layout-breaks.sh` 11, zero missed.

## Closed earlier (kept here so nothing is re-broken)

- [x] The map was letterboxed (R-M1) — `map box == section box`, poster words on the road.
- [x] The Arabic bar collided (115 px) and `.sheet`/`.toast` were a width off in RTL — grid regions.
- [x] The menu sheet was opaque (4) · the masthead's three buttons (6) · the steps' hairline (9, 13)
      — all in `5265538`.

## The gate before any push

`node build.js` · unit · a11y · layout · landing · `scripts/verify-repo.sh` · `cmp` the rebuilt
artifact against what lands in git. Then push, then read the live page's bytes back.
