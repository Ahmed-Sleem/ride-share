# M2 — GEOGRAPHY (stops, mapping tool, one surveyed corridor)

> Goal: surveyed, verified boarding points for one Alexandria corridor, produced
> by the internal mapping tool (desk + field) under the two-person rule. Nothing
> can be booked until real, verifiable places exist (BUILD_PLAN Phase 2).
> One box is ticked only when a command proved it (§0.1); proof in
> `docs/process/IMPLEMENTATION_LOG.md`.

## 0 — Decisions (owner-only, before any code)

- [x] **G-061 resolved** — DEC-197: numeric lat/lng + one shared distance module (no PostGIS).
- [x] Map provider confirmed — DEC-198: OpenStreetMap-based (free, no login), behind the `MapProvider` interface, provider selected by env.

## P2.1 — Spatial data model and the stop entity

- [x] Migration `0011_stops.sql`: `stops` (name_en/ar, lat/lng, status, source, created_by, code, checklist cols), `stop_photos`, `stop_verifications` (append-only via trigger).
- [x] `stops_lat_lng_idx` b-tree on (lat,lng) + `stops_status_idx` on verified (DEC-197 model); the near query narrows by bounding box first.
- [x] `domain/geo-math.ts` (haversine + bounding box) and `domain/stop.ts` (bounds, stable code, spacing) — pure + tested.
- [x] Regenerated (10 tables; schema.sql includes the append-only trigger).
- [x] Migration up→down→up clean; schema drift green (db-types check green post-commit).

### P2.1 tests (each observed failing first, §0.2)

- [~] Covered by the domain haversine + verifiedNear unit tests (exact distance filtering); the bounding-box + radius behaviour is exercised through `verifiedNear`.
- [~] Bounding-box query is written to use the (lat,lng) index; an EXPLAIN assertion lands with the P2.2 integration suite (needs a seeded DB in CI).
- [x] Bounds test observed failing when the guard was removed.
- [~] Enforced by a BEFORE UPDATE/DELETE trigger in the migration; a DB-level test lands with the P2.2 integration suite.
- [x] `pnpm db:verify` type-drift check green (post-commit).

## P2.2 — Stop Mapping Tool, desk mode (O-18)

- [x] Operations places candidate stops by exact coordinates + bilingual names (the OSM map doubles as a click-picker when loaded); submit-to-pending endpoint + UI action.
- [x] MapView + loadMapsConfig now support Google AND OpenStreetMap/Leaflet (DEC-198) behind one surface; /v1/config reports the provider; illustration stays as the honest fallback.
- [x] CSV bulk import — `POST /stops/import`, all-or-nothing (one malformed/out-of-bounds row aborts the whole import with its line number).
- [x] Duplicate guard enforced server-side (geo.stop_too_close); the desk tool shows the override-reason field on that error and resubmits with it.
- [x] MANAGE_STOPS required for create/import/submit/review; the stops screen exists only in the ops nav (asserted in tests).

### P2.2 tests

- [x] Service test asserts the exact coordinate; the UI writes 6-decimal precision from map picks.
- [x] Service test: a stop inside STOP_MIN_SPACING_M is refused (geo.stop_too_close); override + reason lets it through.
- [x] Override reason is stored on the stop + written to the audit record.
- [x] CSV tests: 50 valid rows parse; a malformed/out-of-bounds row aborts with zero created (service boundary) — DB-level atomicity is createMany's single transaction.
- [x] Authority test (rider refused) + nav assertions (stops only in ops).

## P2.3 — Stop Mapping Tool, field mode (O-19)

- [ ] Field capture: device GPS + accuracy radius, a photo (EXIF GPS stripped), and a required physical checklist (stand, lit, legal stop, no motorway crossing).
- [ ] Accuracy gate: captures worse than `MaxFixAccuracy` are blocked, not warned.
- [ ] Offline: captures queue locally and upload on reconnect.

### P2.3 tests

- [ ] 8 m accuracy succeeds; 80 m is refused.
- [ ] A queued offline capture uploads intact once connectivity returns (photo included).
- [ ] The same queued capture uploaded twice creates ONE row (idempotency key).
- [ ] The authoritative coordinate is the measured one, not the photo's (EXIF stripped).
- [ ] A partial checklist submission is refused.

## P2.4 — Verification queue and the two-person rule (O-20)

- [ ] Desk review of field captures; a stop reaches `verified` only via a DIFFERENT person.
- [ ] Rejection requires a reason that reaches the original surveyor.
- [ ] Only `verified` stops are returned by the public "stops near me" endpoint.
- [ ] Retiring a stop used by a published route is refused, naming the route.

### P2.4 tests

- [ ] The capturing user cannot approve their own stop (action absent, not disabled).
- [ ] A second administrator can approve it.
- [ ] `pending` stops never leak from the public endpoint.
- [ ] Retiring a live stop is refused.

## P2.5 — The launch corridor is surveyed (owner-driven, not code)

- [ ] Every corridor stop is `verified` by two people, with a photo.
- [ ] No two stops closer than `MinStopSpacing` without a recorded override.
- [ ] Walking distance between consecutive stops computed and stored.
- [ ] The full corridor sequence has no gap > `MaxStopGap`.

## Verification

- [ ] `pnpm verify` green (repo guards + api/web builds + tests).
- [ ] `pnpm db:verify` green (migrations up→down→up + schema drift + generated types).
- [ ] Committed + pushed; remote matches local.
