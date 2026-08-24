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

- [x] Driver claims a slot in two taps (POST /journeys/claim): pick route → pick slot → confirm. One claim per slot by default, enforced by the UNIQUE slot_id constraint (race-safe).
- [~] Recurring-claim data model is the M6 slice; for now a claim is one slot (recurring claims land with M6 per DEC-202).
- [x] The driver "find work" board lists published routes + their slots with open/taken/mine states; claiming creates the journey in CLAIMED.
- [x] 9 journey-service tests + 6 state-machine tests: approved-driver+vehicle required, rider refused, past-slot refused, lock-window release, race mapping to a clear refusal, open-for-booking. 4 break checks observed failing.

## P3.4–P3.6 — Rider search → boarding → departure → book

- [x] Rider flow: published routes (GET /routes/published) → boarding stops (route order, recommended first) → upcoming bookable journeys (GET /journeys/upcoming) → review (seats stepper) → book.
- [x] Review shows the flat fare × seats; the booking stores fare_minor at creation (locked — a later fare change never rewrites it).
- [x] POST /bookings creates RESERVED with a 6-digit code; seat inventory is enforced by the bookings_seat_guard DB trigger (parallel bookings cannot oversell); cancellation returns seats.
- [x] 164 API tests incl. 9 bookings-service tests (fare lock, off-route refusal, seat cap, guard mapping, cancel-returns-seats, authority) — 4 break checks observed failing; 307 web unit (rider flow group + boarding-code break observed failing).

## P3.7 — Money (minimal, cash-first) — Path A (docs/planning/PATH_A_MONEY.md)

- [x] Booking records a fare (fare_minor locked since P3.6); a per-rider wallet
      now derives from the double-entry ledger (migration 0017: append-only
      `ledger_entries` + `payment_orders` + derived `account_balances` view —
      no mutable balance column anywhere).
- [~] Cash collection recorded by the driver at boarding: the backend is DONE
      (`POST /payments/cash-collected`, idempotent, journey-driver-checked,
      DEC-078 posting sequence); the driver's manifest button is Path B's
      P3.8 screen (feature-detected via the payments contract).
- [x] Paymob top-up END TO END on our side (DEC-204): checkout + official-HMAC
      webhook + `PAYMOB_ENABLED` master flag AND the wallet UI — real derived
      balance, history, top-up sheet (server-sourced bounds, presets, custom),
      Paymob hidden-not-disabled when off (§8.1), paymentChoice component for
      the review screen. Lights up with real keys with zero code changes.
- [x] Tests: ledger append-only (DB trigger blocks UPDATE/DELETE — observed
      failing with 23514); totals reconcile (closed-system Σ=0 + 1,000-random
      property test); webhook replay 5× = one effect (break-observed); bad
      signature / amount mismatch / unknown order refusals (break-observed);
      cash-collected idempotency (break-observed). 201 API tests green.

## P3.8 — Boarding code + manifest

- [x] Each booking has a numeric boarding code (QR + always-visible number, DEC-049/136).
- [x] Driver manifest = CONFIRMED bookings per journey; scan marks ON_BOARD.
- [x] Tests: code uniqueness, scan state transition, offline-friendly display.

## P3.9 — Live journey (minimal)

- [x] Driver journey screen: manifest, next stop, "arrived", end journey (schedule adherence per DEC-119 is tracked as config MaxScheduleSlip).
- [x] Rider waiting screen: boarding code + "your ride is arriving" status.
- [x] Tests: journey state machine transitions.

## Verification

- [ ] `pnpm verify` + `pnpm db:verify` green; commit + push; remote matches local.
- [ ] A real end-to-end pass (manual): create route → claim slot → book → board code.

## Explicitly NOT in this slice (next)

- [x] A→B journey planner (DEC-199) — start/end recommend single-leg + 2-leg mix; alight-anywhere serve.
- [ ] Recurring claims UI + subscriptions (M6 model exists; UI later).
- [ ] Safety centre (M4), promotions/analytics (M5).
