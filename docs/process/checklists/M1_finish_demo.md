# M1-FINISH — Stop being a demo: remove sample content, wire every screen to the API

> Goal: no screen renders `DATA.*` sample content. Every signed-in screen loads
> real API data where an endpoint exists, and shows an honest "not available
> yet" empty state where the endpoint lands in M2/M3. The app stops being a
> prototype. One box is ticked only when a command proved it (§0.1); proof goes
> in `docs/process/IMPLEMENTATION_LOG.md`.

## A — Remove the demo content (`apps/web/src/data/content.js`)

- [x] Delete the whole `DATA` object (done this commit); the `T` copy table stays.
- [x] Every `DATA.` reference in `screens/` and `shell/app.js` removed (grep `DATA.` → 0 hits in `src/`).
- [x] The build injects only copy + components (bundle dropped 319→308 KB).

## B — A guard that fails if sample content ever returns (§0.2)

- [x] Unit assertion: the built bundle contains **no sample strings** ("no sample content in the bundle").
- [x] Break case "sample content returns to the bundle" — observed failing for the right reason.

## C — Rider screens (real or honest)

- [x] **Home** — greets the real `S.user` name; honest "routes coming soon" empty state (no fake route cards).
- [x] **Trips** — upcoming/past tabs kept; honest "no trips yet" empty state (no invented trips).
- [x] **Wallet** — honest "coming soon" empty state (no fake balance/history).
- [x] **Safety** — real entries kept (SOS/share/report/call support); fake vehicle + fake contacts removed.
- [x] **Profile** — confirmed real (`S.user` + email verification); no `DATA.user`.
- [x] Booking flow (`boarding`, `departures`, `review`, `booked`, `waiting`, `onboard`) — each shows the honest "booking lands in M3" state.

## D — Driver screens (real or honest)

- [x] **Duty/Work/Journey/Earnings** — honest "arrives with routes/journeys" empty states; no invented slots/earnings/claims.
- [x] **Profile** — real `S.user` + email verification + driver role chip; fake vehicle/rating removed.

## E — Staff screens (mostly real already — verify, don't regress)

- [x] **Ops queue** — driver applications + vehicles load from the real API with empty states; review + approve/reject call the real endpoints.
- [x] **Manager/support dashboards** — honest "arrives in M4/M5" empty states; no `DATA.*` metrics/coverage/tickets.
- [x] **Admin (super_admin)** — staff + audit confirmed still real (unchanged).

## F — Verification

- [x] `pnpm --filter @ride-share/web test` green (272 unit + 5 server + 14 a11y).
- [~] `apps/web/verify.sh` — build/unit/a11y/breaks run green locally; layout/landing run in CI (GitHub Actions) on push.
- [~] `pnpm verify` repo guards + api/web builds+tests green locally; full browser + db suites run in CI on push.
- [x] Committed + pushed; remote matches local.

## Explicitly NOT in this box (later milestones)

- Real routes/stops/trips/wallet data models → M2/M3. Until then those screens
  show honest "not available yet" states, never fake rows.
