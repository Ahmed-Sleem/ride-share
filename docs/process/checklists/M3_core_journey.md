# M3 — ROUTES, SLOTS & THE CORE JOURNEY (first vertical slice)

> Goal (DEC-202, DEC-182): one corridor, one bookable ride, end to end — an operator
> publishes a route + slot grid, a driver claims a slot in two taps, a rider books a seat and
> boards by code. The A→B planner (DEC-199), recurring claims + subscriptions, and M4/M5
> follow. Mirrors BUILD_PLAN Phase 3. One box ticked only on command proof (§0.1).

## P3.1 — Route entity (operator)

- [x] Migration `0013_routes.sql`: routes (code, name_en/ar, status, direction, fare_minor, window, slot_interval) + route_stops (position unique+gapless-by-construction, distance, run_minutes) with a verified-stops trigger AND a stops_retire_guard trigger (published-route retire refusal).
- [x] Domain: verified-stops enforced by trigger; gapless positions by append/reorder only (route.ts reorderPositions permutation check); flat fare validated.
- [~] Backend create/publish/add-stop/reorder endpoints are done; the ops routes UI screen lands with P3.2 UI (next step).
- [x] Tests: authority (rider refused), fare/interval/window validation, gapless append, permutation reorder, publish-needs-two-stops — 5 break checks observed failing.

## P3.2 — Slot grid

- [x] Domain slot-grid.ts: generateSlotTimes(window, interval) — grid only, wall-clock, last departure strictly before end.
- [x] Tests: 16 departures in 06:00–10:00 @15min; bad window/interval refused; last < end; time round-trips — break-observed.

## P3.3 — Driver claim (two taps)

- [ ] Driver picks a route → picks a slot → claims (one claim per slot by default — T5).
- [ ] Recurring claim rule (T9) stored (route + weekday pattern + start/end date).
- [ ] Unclaimed slots are visible; claim creates the journey (state CLAIMED).
- [ ] Tests: one driver per slot; claim creates a journey; authority (driver only).

## P3.4–P3.6 — Rider search → boarding → departure → book

- [ ] Rider picks a route (list or map), a boarding point (DEC-120), a departure, seat count.
- [ ] Price shown up front (flat fare × seats), locked at booking (DEC-056).
- [ ] Booking creates a Booking in RESERVED→CONFIRMED; seat inventory decrements.
- [ ] Tests: booking authority (rider), seats, price lock, sold-out honesty.

## P3.7 — Money (minimal, cash-first)

- [ ] Booking records a fare; a per-rider wallet/ledger table (wallet is a balance + entries).
- [ ] Cash collection recorded by the driver at boarding (scan).
- [ ] Tests: ledger is append-only; totals reconcile.

## P3.8 — Boarding code + manifest

- [ ] Each booking has a numeric boarding code (QR + always-visible number, DEC-049/136).
- [ ] Driver manifest = CONFIRMED bookings per journey; scan marks ON_BOARD.
- [ ] Tests: code uniqueness, scan state transition, offline-friendly display.

## P3.9 — Live journey (minimal)

- [ ] Driver journey screen: manifest, next stop, "arrived", end journey (schedule adherence per DEC-119 is tracked as config MaxScheduleSlip).
- [ ] Rider waiting screen: boarding code + "your ride is arriving" status.
- [ ] Tests: journey state machine transitions.

## Verification

- [ ] `pnpm verify` + `pnpm db:verify` green; commit + push; remote matches local.
- [ ] A real end-to-end pass (manual): create route → claim slot → book → board code.

## Explicitly NOT in this slice (next)

- [ ] A→B journey planner (DEC-199) — after the core flow works.
- [ ] Recurring claims UI + subscriptions (M6 model exists; UI later).
- [ ] Safety centre (M4), promotions/analytics (M5).
