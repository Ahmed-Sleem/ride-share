# M2 — GEOGRAPHY (stops, mapping tool, one surveyed corridor)

> Goal: surveyed, verified boarding points for one Alexandria corridor, produced
> by the internal mapping tool (desk + field) under the two-person rule. Nothing
> can be booked until real, verifiable places exist (BUILD_PLAN Phase 2).
> One box is ticked only when a command proved it (§0.1); proof in
> `docs/process/IMPLEMENTATION_LOG.md`.

## 0 — Decisions (owner-only, before any code)

- [ ] **G-061 resolved** (PostGIS vs numeric lat/lng + OSRM/geocoder) — recorded in `DECISIONS_REGISTER.md` as DEC-19x.
- [ ] Map provider confirmed for the `MapProvider` interface (DEC-174 = commercial; Google key is owner-owned — the tool degrades honestly without it).

## P2.1 — Spatial data model and the stop entity

- [ ] Migration `0011_stops.sql`: `stop` (name_en/ar, lat/lng or geography, status draft|pending|verified|rejected|retired, source desk|field, created_by, public code), `stop_photo`, `stop_verification` (append-only row: who, when, device, photo, GPS accuracy).
- [ ] Spatial index for "stops near me" (GiST if PostGIS; a b-tree lat/lng or H3 approach otherwise).
- [ ] Domain rules: coordinate bounds (lat −90..90, lng −180..180), `MinStopSpacing`, `MaxStopGap`, stop code generation.
- [ ] Regenerate `packages/shared-types/src/db.generated.ts` + `infra/schema.sql`.
- [ ] Migration runs up → down → up cleanly; `pnpm db:verify` green.

### P2.1 tests (each observed failing first, §0.2)

- [ ] Two stops 300 m apart: a 500 m radius returns both, 200 m returns one.
- [ ] The radius query uses the index (EXPLAIN shows index/appropriate scan, not a full table scan).
- [ ] A stop with longitude 200 is rejected.
- [ ] `stop_verification` is append-only (UPDATE refused).
- [ ] Generated types match the schema (drift check).

## P2.2 — Stop Mapping Tool, desk mode (O-18)

- [ ] Operations administrator places candidate stops on the map, names them (EN/AR), marks draft, submits to pending.
- [ ] Uses the `MapProvider` interface (one file to swap provider) — honest fallback without a key.
- [ ] CSV bulk import (all-or-nothing).
- [ ] Duplicate guard: a stop within `MinStopSpacing` warns and requires an override + reason.
- [ ] Authority: only ops/manager/super_admin can create stops; the tool is NOT rendered for other roles (§8.1).

### P2.2 tests

- [ ] Placed stop round-trips its coordinate to 6 decimal places unchanged.
- [ ] A stop 20 m from an existing one triggers the duplicate warning.
- [ ] Override writes the reason to the audit row.
- [ ] CSV import of 50 rows → 50 drafts; a malformed row → zero rows (all-or-nothing).
- [ ] Support/rider calling the create endpoint is refused AND the tool is hidden for them.

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
