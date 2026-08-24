# R21 — Maps in the Product: Research + Design (Uber · Careem · Swvl)

Status: RESEARCH COMPLETE · 2026-08-24 · owner requested ("where is the map
in the UI… I think it is a great addition; search Uber, Careem, Swvl for the
best practice"). Implementation: the ONE map primitive `apps/web/src/lib/map.js`
(`RouteMap`) — surfaces roll out per the owner's MCQ.

## 1. What the research says

**Uber (rider)** — the map IS the home screen: set/adjust pickup on the map,
and during waiting the vehicle moves live with an ETA; precision-pickup work
exists precisely because the map is the primary interface.
(vickyye.medium.com Uber pickup UX case study; uber.com engineering blog.)

**Uber (driver, engineering)** — the durable lessons are ARCHITECTURAL: one
persistent map, features draw into sandboxed layers, a padding provider so
panels never cover what matters, and a cooperative camera (fit-bounds rules)
so no feature yanks the view. Translated to our rules (§0.3): ONE map
primitive, every screen composes it, nobody hand-rolls a second map.
(uber.com/blog/building-a-scalable-and-reliable-map-interface-for-drivers.)

**Careem** — Uber-family patterns (map-first ride hailing, live vehicle on
waiting screen); for our fixed-route product the transferable part is the
waiting-screen live map, not destination pinning.

**Swvl / fixed-route buses (our model)** — the closest analogue: the LIST
(rides, times, stops) is primary; the map is supporting CONTEXT — the route
line, numbered stops, the boarding stop highlighted, and the vehicle's
position on the line. Transit-UX best practice agrees: a map orients users,
real-time vehicle tracking reduces waiting anxiety, and performance/a11y of
the map matter (fuselabcreative.com transportation UX best practices).

**Our model is route-ticket (DEC-132/140):** fixed routes, fixed stops,
alighting free anywhere. So the map's job is TRUST + CONTEXT — "this is the
line, here is my stop, that is my vehicle" — never destination-picking
(DEC-067) and never turn-by-turn (drivers use their own navigation; DEC-049
makes QR the boarding proof).

## 2. Where maps appear TODAY (verified in code, 2026-08-24)

| Role | Screen | Map today |
|---|---|---|
| Rider | everywhere | **none** (text lists) |
| Driver | everywhere | **none** |
| Operations | Stops tool (desk) | **real interactive map** — OpenFreeMap/Leaflet tiles (DEC-198), click-to-place coordinates |
| Operations | Live map (O-17) | labelled ILLUSTRATION (honest, "no fake tiles") + real vehicle table |
| Admin | staff/audit | none (correct — tables are the right tool) |

Provider loading is already built: `/v1/config` → `MAP_PROVIDER=osm` (default;
Leaflet + OpenFreeMap liberty tiles, no key) or `google` + key, loaded lazily;
the honest labelled illustration renders until/unless the SDK loads.

## 3. Design decisions (from the research, fitted to our model)

1. **ONE primitive, data-bound** — `RouteMap({stops, highlightStopId, vehicle,
   h})` in `lib/map.js`. Route polyline through the real stop coordinates,
   numbered stop markers, the boarding/highlighted stop enlarged in brand
   colour, optional live vehicle marker. Fit-bounds camera (Uber's
   cooperative-camera lesson, simplified). Colour only via CSS custom
   properties (§0.3 tokens) — never literals.
2. **The list is the accessible alternative** — every map carries the numbered
   stop list beneath it (ARIA); the map is enhancement, not the only path
   (screen-reader users, no-SDK environments, file:// previews).
3. **Honest fallback everywhere** — no SDK → the existing labelled
   illustration + the stop list. No fake tiles, no invented positions.
4. **Live vehicle only from real data** — `journeys.progress` (Path B's
   last_lat/lng). No position yet → no vehicle marker, honest status text.
5. **Rollout (proposed)**: Phase 1 = rider route/boarding/review map +
   driver journey screen map (route + stops + own position) + ops live map
   (fleet dots from in-progress journeys). Phase 2 = planner result maps +
   rider waiting live-vehicle map. Owner MCQ decides order (P1).
6. **Fix shipped with this**: the Google branch of the old `realMapView`
   drew a HARDCODED demo polyline (violates §8 no-demo-data) — removed; all
   route drawing now goes through RouteMap with real data.

## 4. Sources
- uber.com/blog/building-a-scalable-and-reliable-map-interface-for-drivers
  (driver map architecture: layers, padding, camera)
- vickyye.medium.com/uber-ux-case-study (rider pickup/precision map UX)
- fuselabcreative.com transportation-app-ui-ux-design-best-practices
  (map on home, live tracking, a11y/performance)
- Swvl/bus-model pattern via transit UX references (list-primary,
  route-line + numbered stops maps)
- Project decisions: DEC-198 (OSM provider), DEC-132/140 (route-ticket
  model), DEC-049 (QR boarding proof), DEC-067 (no door-to-door)
