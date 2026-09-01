# The landing's journey band: what the drawing is and what it is not

The rider page tells the whole pitch in one continuous drawing: four chapters of
copy sit alternately beside one road, and a bus rides that road while the reader
scrolls. It is the most eye-catching thing on the marketing surface, so it is
also the thing most likely to be quietly turned into a lie. This file is the
reason it is not.

## One sentence

It is **geography used as texture**, never a map of the service: real coastline
and street grid, no routes, no stops, no places named.

## Where each part lives

| Concern | File | What it owns |
|---|---|---|
| The geometry | `apps/web/src/data/journey.js` | `JOURNEY_ROUTE` (213 points), `JOURNEY_COAST`, `JOURNEY_CANAL`, `JOURNEY_SEA`, `JOURNEY_ROADS` (four weight classes), `JOURNEY_MARKS`, `JOURNEY_BBOX`, `MARQUEE_GLYPHS`, `MARQUEE_REPEATS` |
| The measurement | `apps/web/src/lib/motion.js` | Fitting the geometry to the section on every layout, the smoothed path, the bus' tangent, the stop rows, the arrival |
| The look | `apps/web/src/styles/shell.html` | Every colour, stroke weight, size and duration, as tokens |
| The words | `apps/web/src/data/content.js` | `mkStop1..4` (the stage labels), `mkJourneyLabel`, `mkJourneyCaption`, and the four chapter paragraphs |
| The shape of the markup | `apps/web/src/lib/landing-parts.js` | `mkJourney(cuts, opts)` — the empty `<svg>` plus the four `<article class="journey__cut">` |

Nobody else draws a road. A second copy of this data — in a component, in a
string, in a screenshot — is the failure mode this file exists to prevent.

## How the numbers were made

1. OpenStreetMap way geometry for the coastal corridor of the city and the
   adjacent street grid, taken at a zoom where the shoreline is stable.
2. Projected to a planar box; that box is recorded verbatim as `JOURNEY_BBOX`
   (`[-9933, -17581, 35111, 26543]` in the projection's units) so a re-cut can
   be checked by eye against the same frame instead of a new one.
3. Reduced to 213 points on one polyline: enough to keep the bays readable at
   poster scale, few enough that the path string is a few kilobytes and a
   browser measures it once per layout instead of per frame.
4. Split into four road classes by how main each street is. The classes are
   weights, not colours: `--rd-0` 2.6, `--rd-1` 2, `--rd-2` 1.4, `--rd-3` 1, all
   drawn in `--grid-line`-family ink. Coast, canal and sea are 1.5, 3 and a
   fill; the service's own route is casing 9 / line 3 / progress 3.5.
5. Four marks, placed where the chapter rows land, carrying **stages**.

The data file is generated, and it says so at the top. Editing the numbers by
hand is allowed — it is how a composition gets nudged — but the bbox comment is
what tells the next reader whether a nudge is still the same city.

## The law that keeps it honest

- **No place names.** The marks are labelled from the copy table (`mkStop1` …
  `mkStop4`: Request, Match, Board, Ride) because a *stage* is a fact about the
  product and a *district* is a claim about coverage. Coverage is published by
  the API, per route, at runtime. A poster that shows five districts will be
  read as five promised districts.
- **One caption, always present.** `mkJourneyCaption` states the provenance and
  the limit: real coastline and street grid, drawn from OpenStreetMap, a poster
  and not a route guide; what you book is the published route and time.
- **Decoration is marked as decoration.** The `<svg>` carries
  `aria-hidden="true"` and `focusable="false"`. Every cut is a complete
  paragraph, so a reader with no SVG measurement, no JavaScript, or no motion
  gets the whole argument in plain text.

Two guards make this machine-checkable: `tests/unit.test.js` asserts the map is
`aria-hidden`, that the rule labels come from `mkStop1`, and that no bundle
contains the district names the product deliberately does not print;
`tests/breaks.sh` will go red if the `aria-hidden` attribute is dropped
("the map stops being decoration").

## Motion rules, and why the scroller is passed in

- The landing is a surface of the app shell: `html`/`body` never scroll, so any
  `window.scrollY` read in this file would be permanently zero. The scroller
  element is therefore an argument, which also lets a test hand in a fake one.
- Only `transform`, `opacity` and `stroke-dashoffset` are written inside a scroll
  callback; nothing here may trigger layout while the reader is scrolling.
- Every mount returns a dispose, and `render()` tears the landing down before it
  replaces the DOM — no stacked listeners, no orphaned rAF loop.
- `prefers-reduced-motion: reduce` gets the **finished** page: reveals at their
  end state, the band stopped, the bus parked mid-route. Motion is the reward for
  a reader who wants it, never the carrier of the content.

Scroll sets a *target*; a rAF loop eases toward it with a time constant
(`1 - exp(-dt * 6.5)`), so the glide covers the same distance per second on a
60 Hz phone and a 144 Hz monitor.

## Physical versus logical, on purpose

Text sides are logical (`margin-inline-start`, `text-align:end`, the
`data-side="right"` cut hugging the far side in the reading direction), so the
composition mirrors with Arabic. The road is not mirrored and the gutter left for
it is a physical `padding-inline-end` at the narrow layout only: the drawing is
one SVG, and the coastline is on the water side whether the words read
left-to-right or right-to-left. The one deliberately physical item is the step
number inside a step card, which stays flush to the card's right edge in both
languages — that is a repo regression pin, not an oversight.

## What is NOT here

- No routing, distance, ETA or fare data, and no import from `packages/shared`
  geography types. If a screen needs real geography, it asks the API.
- No third-party tiles in the marketing surface. Tiles belong to `RouteMap` and
  its key-injection path; the landing has no key and no network dependency.
- No sticker pack, no illustration, no gradient. The masthead is type (see
  `THEME_AND_DESIGN_SYSTEM_AUDIT.md` and the monochrome decision); the journey is
  a drawing made of the same ink as the text.

## Re-cutting it

If the corridor must change (a different city, a wider frame, a denser grid):

1. Re-project from OSM into a box, and write the box into `JOURNEY_BBOX`.
2. Keep the point budget near 200; simplify, do not resample.
3. Keep the four road classes and their token weights; reassign ways to classes.
4. Keep `JOURNEY_MARKS[].key` pointing at copy-table keys that name **stages**.
5. Run, in order: `node build.js`, `node tests/unit.test.js`,
   `node tests/landing.test.js`, `node tests/layout.test.js`,
   `bash tests/layout-breaks.sh`, `bash tests/breaks.sh`. The landing suite is
   the one that proves the route is actually drawn (`getTotalLength()` above
   200), that the masthead is exactly one viewport tall at 320–1440 px, and that
   the bus reaches the destination and fires the arrival once.
