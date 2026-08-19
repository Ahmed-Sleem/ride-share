# M1-FINISH — Stop being a demo: remove sample content, wire every screen to the API

> Goal: no screen renders `DATA.*` sample content. Every signed-in screen loads
> real API data where an endpoint exists, and shows an honest "not available
> yet" empty state where the endpoint lands in M2/M3. The app stops being a
> prototype. One box is ticked only when a command proved it (§0.1); proof goes
> in `docs/process/IMPLEMENTATION_LOG.md`.

## A — Remove the demo content (`apps/web/src/data/content.js`)

- [ ] Delete the whole `DATA` object; keep the `T` copy table (all translatable strings).
- [ ] Every `DATA.` reference in `screens/` and `shell/app.js` is removed or replaced with real state / an honest empty state (grep `DATA.` → 0 hits in `src/`).
- [ ] The build still injects only copy + components (no sample rows anywhere in the bundle).

## B — A guard that fails if sample content ever returns (§0.2)

- [ ] Unit assertion: the built bundle contains **no sample strings** (e.g. no "Corniche Line", no "Montazah Gate", no `const DATA =`).
- [ ] Break case in `breaks.sh` that re-inserts a sample string and observes the test fail for the right reason.

## C — Rider screens (real or honest)

- [ ] **Home** — greets the real `S.user` name; search/list of routes shows an honest "routes coming in M2" empty state (no fake route cards).
- [ ] **Trips** — upcoming/past show the honest "no trips yet" empty state (real bookings don't exist until M3).
- [ ] **Wallet** — balance is not invented; show "wallet is part of M3" empty state (no fake `48 EGP`).
- [ ] **Safety** — keep the real, working entries (SOS/support/share are honest placeholders that already say so); no fake contact rows.
- [ ] **Profile** — already real (`S.user` + email verification); verify no `DATA.user` remains.
- [ ] Booking/boarding/waiting/onboard flows (`boarding`, `departures`, `review`, `booked`, `waiting`, `onboard`) — either removed from navigation or show the honest "booking lands in M3" state (§8.1 hide what the role can never use vs honest "not yet").

## D — Driver screens (real or honest)

- [ ] **Duty/Work/Journey/Earnings** — show honest "driver shifts land in M3" empty states; no invented slots/earnings.
- [ ] **Profile** — real `S.user` + email verification + the real driver application state (`GET /driver/me`) where it exists.

## E — Staff screens (mostly real already — verify, don't regress)

- [ ] **Ops queue** — driver applications + vehicles come from the real API (`/ops/driver-applications`, `/ops/vehicles`); empty state when there are none.
- [ ] **Manager/support dashboards** — no `DATA.*` metrics/coverage/tickets; honest "available in M4/M5" empty states (hidden per §8.1 where the role would never see them).
- [ ] **Admin (super_admin)** — staff + audit stay real (already wired).

## F — Verification

- [ ] `pnpm --filter @ride-share/web test` green (existing suites + the new no-sample-content group).
- [ ] `apps/web/verify.sh` green (build → unit → layout → landing → breaks → layout-breaks).
- [ ] `pnpm verify` green (repo guards + all packages); `pnpm db:verify` green.
- [ ] Committed + pushed; remote matches local.

## Explicitly NOT in this box (later milestones)

- Real routes/stops/trips/wallet data models → M2/M3. Until then those screens
  show honest "not available yet" states, never fake rows.
