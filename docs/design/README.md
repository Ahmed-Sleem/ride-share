# Design

`CH10a_design_system.md` is the specification chapter. What follows is how it
is actually implemented, and the decisions most likely to be undone by someone
who does not know why they were made: the one-ink palette, the landing's
scroller, the brand's single source, and the geography on the marketing page.

## Motion: one curtain, four beats

Between any two pages there is exactly one transition, drawn by `src/lib/pagefx.js`:
a full-bleed path anchored to the bottom of the window swells into a hill, covers the
surface, unhooks from the top and falls away. The path is interpolated on a rAF loop
rather than animated by a library, because that keeps another dependency out of the
bundle and leaves no question about CSS `d` support to answer.

Three rules make it safe, and they are the part a well-meaning edit undoes:

- **It is armed by intent, not by paint.** `render()` consults `PageFx.armed()`, which
  is true only within a short window after a trusted pointer or key event. A deep link,
  a session restore and every automated suite paint at once — a curtain nobody asked for
  is a page that loads badly.
- **The page is never hostage to the picture.** The swap happens on the covered frame
  and has a deadline of its own; where the animation cannot run (reduced motion, no
  rAF, a DOM without layout) the swap is immediate and the layer is removed.
- **The pacing lives here.** `--z-pagefx:95` and `--fx-rise|fill|release|fall` in
  `shell.html`; the numbers in the module are the fallback, not the source. Renaming a
  token in one file silently breaks the motion — the token is read with
  `getComputedStyle`, so a typo is a missing value, not an error — which is why a guard
  compares what the module reads with what the sheet defines.

## Colour: one ink, four exceptions

The interface is monochrome. `--brand` is the darkest step of the ink ramp, the
focus ring is the brand, selection and progress are weight and position rather
than hue, and the marketing surface prints the same ink at poster scale. A
product this quiet looks expensive in one colour and cheap in four.

This is a decision, not an absence. Before the renewal the model was two
working colours — teal for travel, violet for value — and it survived only as
an idea: the same role was painted differently on different screens, and once a
colour stops meaning something it is decoration, which is why a palette that
cannot be defended is better removed than kept.

Four things keep a hue, and none of them is decorative:

| Token family | Why it stays in colour |
|---|---|
| `--ok` / `--warn` / `--danger` / `--info` (+ `-bg`) | State must be distinguishable at a glance in a list of twelve rows. Each is paired with an icon and words, so colour is never the only signal |
| `--map-*` | Map conventions (the blue route line) are read by people who learned them elsewhere; overriding them makes maps harder to use |
| `--scrim`, `--glass` | Transitions over unknown content; the value is the alpha, not the hue |

A new screen gets no hue. If a state genuinely needs one, it joins the table
with a reason, in this file, before it ships.

## Tokens are two-layer

Primitives (`--ink-500`, `--green-400`, `--red-950`) are raw values with no
meaning. Semantic tokens (`--brand`, `--accent`, `--danger`, `--focus`,
`--stage`, `--line-hair`) carry the meaning. Components reference semantic
tokens only — and the semantic layer is the whole ramp: the ink steps are
measured so that every text-on-surface pair clears WCAG, which is asserted with
computed luminance in `apps/web/tests/unit.test.js`, not hoped for.

Dark mode remaps semantic tokens to different primitives. No component knows
which theme is active, and there is no second copy of any component for dark
mode.

## Values that are deliberately not themed

Four, each with a reason in the source:

| Token | Why it never changes |
|---|---|
| `--qr-paper`, `--qr-ink` | A boarding code must scan. Inverting it in dark mode makes it unreadable to a camera |
| `--knob` | The switch handle needs contrast against both track colours |
| `--on-solid` | White text on a saturated status fill is white in both themes |

## Breakpoints

Material 3 window size classes, chosen because they are the researched standard
rather than numbers invented here:

| Width | Class | Navigation |
|---|---|---|
| < 600px | compact | Bottom bar |
| ≥ 600px | medium | Collapsed rail, icons only |
| ≥ 840px | expanded | Expanded rail, icons and labels, profile pinned at the bottom |
| ≥ 1200px | large | Same, roomier gutters |
| ≥ 1600px | extra-large | Shell stops growing, content stays centred |

There is also a short-viewport rule at `max-height: 520px` for landscape
phones, which drops labels and tightens the bars.

Navigation is one component. The CSS decides its presentation; there is no
JavaScript branch per size and no resize listener.

## Sizes that are not negotiable

| Token | Value | Why |
|---|---|---|
| `--tap` | 44px | Minimum touch target |
| `--tap-driver` | 56px | Drivers work one-handed, in sunlight, in a moving vehicle |
| `--f-input` | 16px | Below 16px, iOS Safari force-zooms the viewport on focus and the user cannot undo it |

## The marketing surface is a poster

One sentence, one home. The road carries the seven claims (`.journey__cut`, one per
claim, alternating sides); the numbered rows carry the four chapters
(`.landing__feature`); the inverted slab carries the sequence (`landingHow1..3`). A
claim therefore lives on the map *or* in the rows, never twice, and a section's
eyebrow is never the heading under it. That is the demo's own arrangement — its
`features` ride the road, its `chapters` sit in the rows — and the reason an earlier
cut of this page, which had the chapters on the road and the claims in the rows,
made every promise sound twice. `unit.test.js` renders each landing view in both
languages and refuses a page where a heading, lede, caption or paragraph repeats.

The landing is not "the app, but wider". It is a printed poster that happens to
be interactive, and four rules keep it that way:

- **The masthead is type.** Three lines of display letters at `100vh`, a field
  of twelve hairlines behind them, no illustration and no slideshow. Stickers
  and hero art were removed rather than re-coloured; an illustration is a second
  design system.
- **One ink, one inversion.** Paper and ink everywhere; exactly one slab turns
  itself inside out, and dark mode turns the page over so the slab stays the
  odd one out. The journey drawing uses the same ink at four stroke weights.
- **The band runs.** The glyph marquee is one row rendered twice and shifted by
  half, so the loop can never show its seam; `--marquee` is the only duration
  and reduced motion stops it with `animation-play-state`.
- **Geography is texture, never a promise.** The road is real (OpenStreetMap,
  simplified), the labels are stages ("Request / Match / Board / Ride") and not
  districts, and the caption says out loud that it is a poster. See
  [JOURNEY_GEOMETRY.md](JOURNEY_GEOMETRY.md) for the data, the provenance and
  the re-cut procedure.

The contract is in three files and no others: `apps/web/src/styles/shell.html`
owns every measurement, colour and duration;
`apps/web/src/lib/landing-parts.js` owns the shapes (`.landing__hero`,
`.landing__display`, `.journey__cut`, `.landing__slab`, `.landing__feature` …);
`apps/web/src/screens/landing.js` composes them with copy keys. A class emitted
by the last two must exist in the first.

Two more things the landing owns:

- **It scrolls itself.** `.landing` is the scroller; `html`/`body` never do
  (`.landing{…overflow-y:auto}` and the shell's `overflow:hidden`, both
  break-tested). Every scroll effect reads the element that actually scrolls —
  a `window.scrollY` in this shell is permanently zero.
- **Nothing is fetched to draw a code.** `apps/web/src/lib/qr.js` is an
  ISO/IEC 18004 encoder (byte mode, L/M/Q/H, versions 1–12, all eight masks and
  the spec's penalty rules) and `InstallQR` renders its matrix as inline SVG.
  `tests/fixtures/qr-golden.json` holds matrices produced by an independent
  reference implementation, so the encoder is checked against the standard and
  not against itself. A QR service would have been a third party learning who
  installs the app, and a dead control offline.

## The brand has one source, and it is checked

`packages/brand/brand.json` is the only place the name, tagline, version, font,
logo path, browser theme colour and contact address are written. `build.js`
substitutes them into the shell and fails the build on an unresolved
`__BRAND_*`; `scripts/check-branding.sh` fails on a name or a logo path written
anywhere else; `scripts/check-tokens.sh` fails on a colour literal outside the
token layer. Renaming the product is therefore one edit, and the tests are the
reason nobody has to trust that it is complete.

Measured, not assumed: with `name` and `tagline` set to a throwaway value, the
rebuilt bundle carried the new name in the document title, the masthead, the
landing pages, the footer and the manifest, and kept the Arabic name in RTL —
and the old name survived in exactly one place, `email.fromName`, a field the
API reads for transactional mail and does not derive from `name`. That is the
one line of a rename that is still two edits, and it is listed as a follow-up
rather than quietly fixed, because the mail sender's typing is API-side.

## The poster is centred by its gutters

`.landing__body` is a three-track grid: a gutter, the column, a gutter. The gutters
are **floors, not walls** — `minmax(var(--gutter), 1fr)` — so the surplus of a wide
viewport is absorbed by the gutters and the column lands in the middle. A capped
middle track between two fixed gutters does something else: the grid's used width is
`gutter + cap + gutter`, it starts at the inline edge, and every full-bleed band
(`grid-column: 1 / -1`) inherits that short width. The poster then sits pinned left
with a dead margin on the right at 1440 and 1600 — measured, not theorised:
`0→1232` in a `1440` viewport. `justify-content: center` centres the content and
leaves the dark bands short, so it is the wrong half of the fix.

The column is `--landing-max: 1360px`: the demo's `--maxw: 1440px` less its inner
padding. It is the widest the poster is allowed to be and the only number that says
so; the type sizes are `clamp()`s against the viewport, which is why a wider column
fills the page without one bigger letter.

## One section rhythm: `--flow`

Blocks of a landing section are `--flow` apart, a paragraph's next paragraph is
`--s2`, and an eyebrow stays welded to the title it introduces (`--s2`). No
component declares its own `margin-top` to a neighbour: the lede, the prose, the
calls to action, the chapter list, the FAQ and the download cards all leave that to
the one rule, which sits at the **end** of the landing sheet so the cascade finishes
the argument — each component keeps `margin: 0` for the user-agent reset's sake and
is overruled from there. Per-page gaps are how the drive page's lede ended up 8 px
from its button while About's last paragraph sat 0 from its own.

Measure it on a fully revealed page (`[data-rv]:not([data-rv="in"])` is empty) —
a block that has not arrived yet is translated 14 px down, and every gap you measure
is 14 px short.

## A panel is the bar continued

The compact menu is three dots and no chrome (`ICON.dots`, no border, no box): the
tap target stays `--tap` while the square that pretended to be a button is gone. Its
panel is the same material as the bar — `--glass-blur`, a shared token — on
`--glass-solid`, because a 62 % wash over the poster's own display type turns the
links into noise. The entrance is one motion for every panel:
`--panel-in-dur` / `--panel-in-ease`, with each row `--panel-in-step` behind the one
before it, so the panel reads as one object opening. The gate at the top of the
sheet already shortens animations under `prefers-reduced-motion`, so no panel needs
its own. In the panel, every entry — Log in and Sign up included — is a link like
the page links above it: a filled button inside a menu is a second hierarchy for a
decision the bar has already made.

## The reveal contract

The landing fades its blocks in as they enter the viewport, and the fade is done
by CSS that hides first: `.landing [data-rv]{opacity:0}` in `shell.html`, restored
by `[data-rv="in"]`. That has a consequence bigger than the animation — **a
landing view that is not mounted by `mountLanding` renders its copy invisible**,
while every text assertion in the suite still passes, because the words are in
the DOM. Three rules follow, and all three are tested:

- `landing()` calls `mountLanding(view)` once, for every landing view. A view
  that returns before it (the share page) is the only way to skip the reveal, and
  it must then not carry `data-rv` at all.
- `mkSection` marks the blocks it holds that do not already reveal, with a
  `--d` stagger. Pages therefore animate without anyone wiring them, so About,
  Help, the download page and the policy documents speak the same language as
  the poster instead of being static exceptions to it.
- `Motion.reveal` counts a block that has been *scrolled past* as seen, and it
  re-checks the pending set while scrolling. Both halves are needed:
  `IntersectionObserver` reports a change of **ratio**, not a position, so a block
  carried from below the fold to above it between two samples produces no entry at
  all — the callback that would have marked it never runs, and the CSS holds the
  copy at `opacity:0` on a page the reader has finished. The sweep marks anything
  whose bottom edge is above the scroller's top, is rAF-throttled, unsubscribes
  itself when nothing is left pending, and returns a dispose so `mountLanding`
  owns it like every other mount.

Custom properties a script owns (`--d`, `--near`) are read with a fallback
(`var(--d,0ms)`, `var(--near,0)`) so the page looks finished before the first
frame of JS, and the sweep for a reference that resolves to nothing is
`grep -o 'var(--[a-z0-9-]*'` of the sheet against its definitions — currently
empty in both directions.

## The bar fits, at 320

The masthead is one row of five things — the mark, the language, the theme, one
button, the menu — and at 320 px that row is over its budget by the width of a word.
It is not solved by shrinking controls: under 380 px the wordmark steps back and the
mark stands for the brand (the link keeps its name in its accessible label), and the
labels take `--s2` of inline padding so a 14 px Arabic word is still a 30 × 40 hit
box. Two rules keep the surface honest at every width, and both are tested:
`.landing figure{margin:0}` — the user-agent sheet gives `figure` 40 px of inline
margin, an 80 px tax on a poster made of images — and `minmax(0,1fr)` on the landing's
grid tracks, because a bare `1fr` is `minmax(auto,1fr)`: it cannot shrink below its
content, which is the difference between a fluid grid and one that overflows the
moment the copy is longer than the space.

## Layout contract

The shell is exactly one viewport tall. `.main` is the only element that
scrolls; the top bar and navigation are `flex:none` siblings and are therefore
structurally unable to scroll away. The search band is the first element
inside `.main`, so it scrolls with the page like any other content. If you find
yourself adding `position: fixed` to keep something in place, the element is in
the wrong part of the tree.

## The curtain: one transition, armed by the render

Every page change passes through `render()`, and `render()` is the only caller of the
transition (`lib/pagefx.js`). That is deliberate: wiring a wipe to each link is how a
surface ends up with pages that animate and pages that do not. The route key is the
*page*, not the paint — a keystroke, a countdown tick or a sheet opening shares no key
with the frame before it, so it never triggers one.

Three numbers describe the shore line at each frame, in a 0…100 box stretched over the
viewport by `preserveAspectRatio="none"`, which is why the same curve is correct at 320 px
and at 3440 px. The pacing lives in the stylesheet as `--fx-rise/fill/release/fall`, and
the element is `pointer-events:none`, `aria-hidden`, above the sticky bar
(`--z-pagefx:95`), and removed from the document when it finishes.

Two rules make it safe. **The state is never gated by the animation**: the new page is
painted at full cover, and the swap keeps a deadline of its own, because a backgrounded
tab stops answering `requestAnimationFrame` and a curtain must never be the reason a page
does not appear. **Only a gesture earns one**: the module listens for trusted
`pointerdown`/`keydown`/`click` from the moment the bundle runs, and a render that no hand
asked for (a deep link, a session restore, a test) paints at once. Reduced motion gets the
plain swap, as everywhere else here.

## One name, one file — and a build that reads it strictly

`packages/brand/brand.json` is the only place the product's identity is written down: the
displayed name in both languages, the tagline, the version the install link is cache-busted
by, the logo, the theme colours, the install path and the file name the download arrives
under. Because its values are *spliced into the served document* — the title, two
`theme-color` metas, a CSS font stack, the favicon's inline `<svg>` — `build.js` validates
the shapes and refuses a build that would ship `undefined`, markup, or a link to nothing.
Two of those holes were live in `HEAD` (a missing `browserThemeColor.light` and a missing
`logo.color`), which is the argument for checking them where the file is read rather than
hoping a browser test notices a tab colour.

The claims are the drawing's key, not a second poster: the seven rider promises sit *under*
the road in two columns of small type at every width. A poster competing with the map was
both the loudest and the least legible part of the page, and the phone needed a special
case to keep the text off the projection at all — removing the overlay removed the
exception.
