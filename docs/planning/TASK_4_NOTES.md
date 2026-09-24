# Task 4 — measured candidate gaps (scratch, round 21)

Written from the code, not from memory. My round-20 note said "14 zero-caller `api.js`
methods ⇒ the driver duty loop has no UI". **That was wrong and I re-measured it.**

## What is actually true

`apps/web/src/lib/api.js` exposes 85 members; 33 match the plain
`name: (args) => API.request("METHOD", \`/path\`)` shape. Of those 33:

- **9 have no caller anywhere in `apps/web/src`** (grep on the identifier).
- **6 of those 9 are duplicates, not gaps** — the same path is called directly by the
  driver screen through the offline outbox helper:
  `startJourney` `arriveStop` `completeJourney` `abortJourney` `journeyPosition`
  `journeyPositionBatch` → `queueOrSend(kind, "POST", \`/journeys/${jid}/…\`)`
  (`apps/web/src/screens/driver.js:203-299`). So the **duty loop exists** and is durable.
- **3 have no UI call at all** (the server already implements each of them):

| client wrapper | server route (already there) | who needs it |
|---|---|---|
| `releaseJourney(id)` | `POST journeys/:id/release` (`journeys/api/…controller.ts:36`) | driver — give back a claimed journey before departure |
| `reorderRoute(id, orderedStopIds)` | `POST routes/:id/reorder` (`routes/api/routes.controller.ts:75`, gapless + exact-permutation validated) | ops — drag stops into order |
| `retireStop(id)` | `POST stops/:id/retire` (`geo/api/stops.controller.ts:109`) | ops — retire a stop |

`cancelBooking`, `addVehicle`, `scanBooking`, `changePassword`, `myNotifications` are
**not** in the zero-caller set (verified: `rider.js:551` calls `API.cancelBooking`),
except `myNotifications` which is Task 3 and in flight with the developer.

## The real two-layer smell

`queueOrSend` bypasses `API.request` and hits paths by string, so `api.js` is not the
single list of what the client can do. That is why a count-based claim mislead me. Any
task here should make one layer call the other, and keep the outbox semantics.

## Options for the owner (pick one, all are `apps/web` + one mobile file, no api change)

1. **Close the 3 endpoints** (~small): driver release action on the duty card; ops stop
   retire + route reorder in the routes tool. Each bilingual, each with a break case.
2. **Unify the request layers** (medium, no new feature, but removes a whole class of
   "the client cannot do X" mistakes).
3. **Device pass first** (D-8.27, 23 boxes) — no code until the phone list says ✗.
4. Legal rows (G-017, G-041) — owner's decision, not mine or the developer's.

## Rules any chosen task obeys

- never break existing behaviour; guards move in the same commit with the reason;
- `version.code` bump **and** one `apps/mobile/**` file in the same push (D-8.22 / MISSED-BUILD);
- every source edit re-runs `node apps/web/build.js` before tests read `dist-preview.html`;
- new guards must be seen to fail (`BREAKS_ONLY`), and the mutation must be seen to mutate;
- `bash apps/web/verify.sh` without `RS_SKIP_BREAKS`, plus `verify-repo.sh`;
- docs in the same commit (CHANGELOG / AUDIT_AND_TODO row / checklist / roadmap).

## ONBOARDING_TASK_2 — Map engine (vendored Leaflet 1.9.4 + state machine + default-osm)
Completed 2026-09-24. Single web bundle, 19 modules, dist-preview.html ~1270 KB.

### What landed (in commit order)
1. **Vendor** — `apps/web/vendor/leaflet/{leaflet.js,leaflet.css,LICENSE}` (1.9.4, BSD-2-Clause).
   Bytes sha256-pinned in `build.js`; build IIFE-wraps the JS, tokenizes the CSS, blanks
   every `url(...)` reference, and inlines the whole thing via `__RS_VENDOR__` sentinels
   plus an `__LEAFLET_STYLE__` placeholder just before `</style>` in `shell.html`.
2. **State machine** — `S.mapState ∈ {ready, unavailable}` with `setMapState()` firing a
   `rs:mapstate` CustomEvent; `mapsLive()` / `mapEngine()` are the single gates used by
   every map view (MapView, RouteMap, SearchMap, EditRouteMap). `pickLang` renamed from
   `L()` so Leaflet owns global `L` without shadowing.
3. **Default provider** — `loadMapsConfig()` falls back to `osm` (vendored Leaflet) on
   file:// previews, missing `/v1/config`, or refused responses; the Google `<script>` is
   only injected when the server supplies a key. ONE retry (`mapsRetried` flag) on
   `online` + `visibilitychange`; `onerror`/`onload` both publish state via
   `mapStateReached()`, which is G-134-guarded (only re-renders boot/landing or pages
   that actually hold a `.mapbox`).
4. **Token binding** — vendor `leaflet.css` #fff/#333/#ccc/#777/rgba(…) tokens replaced
   by `var(--leaflet-*)` custom props defined on the existing `:root` and
   `[data-theme="dark"]` semantic blocks; `.mapbox/.leaflet-container`, zoom control,
   attribution, tooltip, popup, popup-close are all themed. Third-party tiles are
   filtered into the palette with `filter: var(--map-tile-filter)` and sit behind the
   SVG route/vehicle overlay (sibling `.mapbox__canvas`, route drawn with cssVar `--brand`).
5. **Failure UX** — m_mapUnavailable EN/AR, mapMock copy reused; `tileerror` on the
   tile layer flips state to `unavailable` instead of silently painting a grey
   rectangle; scroll wheel stays on the page (`scrollWheelZoom:false`), zoom control
   top-right; default marker icon overridden to zero-size data-URI SVG (no upstream
   marker.png 404 — `build.js` also blanks vendor `url(...)` references, belt-and-braces).
6. **Mobile syntax-gate commit pushed first** (Step 6 per two-push order); web bundle
   + docs + 5 new `breaks.sh` cases followed in the second commit.

### Guards (all CAUGHT by `BREAKS_ONLY`)
- unpkg Leaflet `<script>`/`<link>` returns to shell → caught by "no unpkg tags" guard.
- leaflet.js sha256 pin zeroed → caught by sha256-pin unit test.
- tileerror handler silenced → caught by tileerror unit test.
- scrollWheelZoom re-enabled → caught by "wheel stays on the page" unit test.
- default icon allowed to request marker.png → caught by zero-size-data-URI unit test.

### Numbers
- unit: 817 / 0
- a11y: 14 / 0 (no new serious/critical violations from the leaflet container chrome)
- layout: 11877 / 0 (320 px measured clear of the top-right zoom control at mobile width)
- mobile breaks: 6 / 0
- web breaks: 5 new CAUGHT cases added, all pre-existing cases still CAUGHT.

### Reminder to owner
Needs: `version.code` bump + mobile redeploy before this goes to a device.
The PAT embedded in these push commands should be rotated after this lands.
