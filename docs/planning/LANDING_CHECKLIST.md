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

### Round 5 — the remaining owner items, closed with the same rule

- [x] **O-2 — the intro dwells, and is never the thing you wait for.** Floor
      `SPLASH_FLOOR_MS = 1000`, release never before `load` **and** `document.fonts.ready`,
      cap `SPLASH_WATCHDOG_MS = 6000` so a request that never answers cannot hold the door.
      *Check (unit):* both constants, the race, and the old bare `setTimeout(r, 1500)` gone.
      *Check (Chrome):* the dwell measured from navigation start, in a 950–3200 ms band, with
      first contentful paint already recorded and no `.splash` left in the document.
- [x] **O-10 — a way out names where it goes.** `landingBack` "Back to home", `authBack`
      "Back to sign in", `backToList` "Back to the list", `back` for one step inside the auth
      flow — one key per destination, in both languages, no key carrying two meanings.
      `backBtn` moved to `lib/components.js` (three modules used it while one owned it) and
      lost `|| t("changeEmail")`, a default that would have spoken for any button whose copy
      was forgotten. *Check:* each label matched against its own destination in both languages;
      the three are distinct sentences; a paren-walk proves every call site passes a label; and
      jsdom *clicks* the document page's way out and asserts it lands on the rider home.
- [x] **O-11 — the three policies are one page, in two shapes.** Same `landingNav()` bar on
      terms, privacy and safety (a document opened from the footer is still the site, so it
      offers the same way back out, in the same place); two columns above 900 with the contents
      rail sticky under the bar's clearance; one centred column below, the rail a list over the
      text — never hidden, because a hidden control takes its function with it. *Check:* per
      document, per shape: the counted non-zero grid tracks, `position:sticky`, the rail above
      the first clause when narrow, links = sections, the bar's glass and both switches inside
      it, the whole thing inside its own measure — and a real click on the third link must move
      the reader there *and* mark it `aria-current` — where the document is short enough that no
      further scroll exists, the promise being tested is that the clause is on screen, not that
      it sits in the top half, because a page cannot lift what already fits.
- [x] **O-12 — one intro rule, five surfaces.** `mkIntro` in `lib/landing-parts.js` is the only
      place `.landing__hero` is built; rider, drive, about, help and download all open with it,
      so the one-viewport floor, the rule field and the display type are shared by construction.
      The bar's clearance is now `--bar-clearance`, asked by the hero's padding *and* the
      document rail's sticky offset — two places that must not disagree about where a page
      begins under the glass. *Check:* the string `class: "landing__hero"` occurs exactly once;
      each page renders and its first body child is the hero with a display heading, with no
      section heading competing in the same page.
- [x] **O-14 — "What you need" in the page's own voice.** The three requirements are
      `mkSteps` rows, not a sentence to parse out of a paragraph; `mkStep(n, t, null)` now omits
      the body instead of inventing one. *Check:* the shared-scale guard, and the copy table
      carrying `driveReq1T..3T` in both languages.

- [x] **R5-A — Arabic typography, self-hosted.** Payload is measured, not assumed:
  66.3 KB of woff2 (Cairo 29.8 + Jomhuria 36.5) inlined → bundle 962.8 → 1,060.5 KB,
  and the budget in `fonts.json` (200 KB) is what stops it growing silently. Ink per em,
  at 96 px on the same string: fallback 2.31 %, Cairo 900 3.47 %, Jomhuria 1.09 % at
  0.64 em tall, Katibeh 1.10 % at 0.92 em — the reason the masthead face needs a
  size-adjust and the body text does not need a new family at all.
- [x] **R5-B — `build.js` refuses an unparsable bundle.** A stray parenthesis in a
  builder reached `dist-preview.html` and only surfaced as a jsdom `SyntaxError` in a
  suite that had 600 other things to say. The bundle is a classic script with no
  top-level await, so `new Function(js)` is a complete check, and it now runs before
  anything is written.
- [x] **R5-C — `G-081`: the app had a second copy of the brand font stack in `body`,
  and the poster had none.** Found because a font that should have appeared, did not.

- [x] **R5-D — the document pair finally claims its measure.** With the rail wired, the
  two columns occupied 467 px of a 1178 px measure: `.landing__doc` (the *wrapper* the page
  builds around the pair) carries `max-width:60ch`, and `fr` tracks sized from content simply
  obeyed it. Lifting that cap at the wide breakpoint only (`:has(.landing__doc2)`) and centring
  the pair gives `256px + 868px` tracks, a 545 px (70ch) text measure, and `x=64` on a 1280 px
  viewport. *Check:* the counted grid tracks and the centring already in the O-11 battery.

Gate as shipped: `node build.js` → **1062.3 KB / 19 modules**, unit **643/0**, a11y **14/0**,
layout **8185/0**, landing **2736/0**, `scripts/verify-repo.sh` green, and the committed
`dist-preview.html` byte-identical to a fresh build.

Six lessons the harness took, so they are not taken again:

1. **A guard that greps the whole bundle for placeholder words will find them inside
   identifiers** — `jumpToDocSec(n)` reads as `TODO` case-insensitively. Word boundaries now
   guard real placeholders, and the payload is stripped first.
2. **A guard that renders a page must hand the state back.** Leaving the window on the
   Help page turned every later assertion about the poster into an assertion about
   nothing; the O-12 loop now re-renders the rider home when it finishes.
3. **Never wire behaviour inside a builder.** `rail.closest(".landing")` is null before
   the node is in the document, so the contents rail never marked anything; behaviour
   belongs to `mountLanding`, which also owns the teardown.
4. **Counting a call's arguments with a regex stops at the first `)` of an arrow
   function.** The `backBtn` label guard walks the parentheses instead — and that is how
   two call sites with no label at all were found, which the previous default would have
   rendered as empty buttons.
5. **A layout fix can make a short document shorter than the viewport.** Widening the policy
   column from a 183 px band to 545 px removed most of its height, and with it the *ability* to
   land a clause in the upper half: the jump assertion went red on correct behaviour. Reachable
   state again — see R4 lesson 1 — and this time the guard learned to ask what the geometry
   permits, using the same `atEnd` escape the marking assertion already had.
6. **Measure the ancestry before arguing with the cascade.** Three guesses about why the pair
   collapsed were worth less than one walk up the DOM printing width, `justify-self` and
   `grid-template-columns` per ancestor: the cap was on an element the selector never named.
   `/tmp` probes that print the chain are cheap; CSS edits made from a theory are not.

## Round 5 open (nothing else from the owner's lists is pending)

- [ ] **O-5 — the full production audit** (`docs/audits/LANDING_PRODUCTION_AUDIT.md`): every
      rule, every owner item, file + test + live URL. Type and layout moved since the last
      pass, so the audit is worth taking after this lands.
- [ ] **L2 — green CI** on the newest commit. Two causes were open; one is closed:
      **`verify-gui` never ran at all** because git recorded every `.sh` in the repo as
      `100644`, so `./verify.sh` died with *Permission denied* (exit 126) before the browser
      suite — 23 scripts are mode `100755` now (`57c9f2d`), and the Chrome/puppeteer cache step
      was already correct. **Still red, and not GUI:** `pnpm verify` fails on nine `apps/api`
      journey-lifecycle tests (`an approved driver claims a slot`, `a driver cannot release
      another driver's claim`, `openForBooking transitions CLAIMED → OPEN_FOR_BOOKING`, start/
      complete legality, rider position rules, the batch-of-points rule, and the UNIQUE-violation
      race), `# pass 237 / # fail 9` on `node --test dist/`. That is phase 3's bug list, not the
      landing; `Verify database` passes, so it is logic, not environment.
- [ ] **L1 — both break harnesses**: one anchor was stale and is fixed (`57c9f2d` → `08f1ac8`:
      the bar-centring case sed-replaced a rule the bar no longer uses, so it reported
      *BROKEN-BREAK*, and `verify.sh` runs `breaks.sh` — a single stale anchor fails the GUI job).
      Measured since: **22 of 113 cases ran, 22 CAUGHT, 0 missed**, before the run was stopped on
      purpose. Worth the sentence it costs: a first local run of the whole battery reported
      *0 caught, 113 missed*, which is not drift at all but the sandbox — `breaks.sh` calls
      `node tests/unit.test.js`, which needs jsdom, so the harness has to be run with
      `NODE_PATH=/home/user/.vtest/node_modules` here; every "missed" was the suite failing to
      start. A second lesson the hard way: interrupting the battery mid-case leaves the break
      *applied* (the trap's scratch dir is removed before the restore writes), so
      `_breaks_restore` now recreates the path, and any interrupted run must be answered with
      `git status` before anything is trusted. Remaining: finish the full run (≈35 min) and the
      hairline case below.
      component guard bites.

## Closed earlier (kept here so nothing is re-broken)

- [x] The map was letterboxed (R-M1) — `map box == section box`, poster words on the road.
- [x] The Arabic bar collided (115 px) and `.sheet`/`.toast` were a width off in RTL — grid regions.
- [x] The menu sheet was opaque (4) · the masthead's three buttons (6) · the steps' hairline (9, 13)
      — all in `5265538`.

## The gate before any push

`node build.js` · unit · a11y · layout · landing · `scripts/verify-repo.sh` · `cmp` the rebuilt
artifact against what lands in git. Then push, then read the live page's bytes back.
