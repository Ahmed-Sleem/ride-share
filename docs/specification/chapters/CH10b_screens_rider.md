# CHAPTER 10b — Screen Inventory · PART 1: RIDER

Status: DRAFT v1. Implements DEC-122 (full detail), DEC-123 (rider first), DEC-124 (one spec,
platform notes), DEC-125 (references CH10a components).
Every screen defines the five mandatory states (CH10a §10a.7): Loading · Empty · Error · Offline · RTL.
Platform note convention: **[W]** = web only, **[M]** = mobile only, otherwise both.

Screen IDs are stable: `R-nn` rider · `D-nn` driver · `O-nn` ops · `G-nn` manager · `S-nn` support.

---

## R-00 · Splash / Session resolve
**Purpose** Decide where the user lands before showing anything (DEC-014 role-adaptive).
**Contents** Logo, nothing else. Duration must be < 800ms perceived.
**Logic** valid session → resolve role → R-10 (rider home) / D-10 (driver home) / dashboard.
No session → R-01.
**States** Loading: logo only, no spinner. Error (token refresh failed): silently route to R-01,
never an error screen. Offline: use cached session and cached home data. RTL: logo unmirrored.
**API** `POST /v1/auth/refresh`

---

## R-01 · Welcome
**Purpose** First impression; state the value in one line and get to phone entry fast.
**Contents** One-line value proposition (e.g. "Share the ride. Fixed price."), `Button/Primary`
"Continue with phone", language switcher (ar/en) prominent, small link "Browse routes first".
**Actions** Continue → R-02 · Language switch → reloads in place · Browse → R-11 read-only.
**States** Loading n/a · Empty n/a · Error n/a · Offline: browse-routes disabled with a plain note ·
RTL: full mirror, language switch shows the *other* language.
**Decisions** DEC-017, DEC-028
**Note [W]** Also renders marketing content below the fold for SEO (DEC-085); mobile does not.

---

## R-02 · Phone entry
**Contents** `Input/Phone` (country prefix, LTR-isolated), consent line linking to terms/privacy,
`Button/Primary` "Send code".
**Rules** Country default from city config, not device locale. Number normalised to E.164.
**States** Loading: button shows spinner, input stays editable · Error: `InlineError` under the
field ("This number doesn't look right") · Offline: `OfflineBanner`, button disabled with reason ·
RTL: digits stay LTR inside the field (CH10a §10a.5).
**API** `POST /v1/auth/otp/request`
**Rate limit** Shown honestly: "Try again in 45s" rather than a generic failure.

---

## R-03 · OTP verification
**Contents** `Input/OTP` (6 boxes, auto-advance, paste and SMS-autofill aware), the number being
verified with an "edit" affordance, resend countdown, "Call me instead" fallback.
**States** Loading: boxes locked, inline progress · Error: shake + `InlineError` "Wrong code,
2 attempts left" — never lock silently · Offline: banner, resend disabled · RTL: **boxes fill
left-to-right even in RTL** (numeric entry), a common bug.
**API** `POST /v1/auth/otp/verify`
**Then** New user → R-04 · Returning → R-10.

---

## R-04 · Set passcode (optional, DEC-028)
**Purpose** Avoid paying for an SMS on every login and work when SMS fails.
**Contents** 6-digit passcode, confirm, biometric opt-in if the device supports it, "Skip".
**States** Error: "Codes don't match" inline · Offline: allowed (stored locally, synced later) ·
RTL: mirrored, digits LTR.
**API** `POST /v1/auth/passcode/set`

---

## R-05 · Profile basics (skippable)
**Contents** Display name, optional photo, optional email, preferred language (pre-filled).
**Rule** Nothing here blocks booking (U1: fast path to value).
**States** Empty is the default state and is fine · Offline: queued.

---

## R-10 · HOME (adaptive) ★ the most important screen
**Purpose** DEC-098: identical structure everywhere, adaptive top slot.
**Must contain** (order of importance; layout is the designer's choice)
- Greeting / identity affordance and a wallet balance indicator
- **The adaptive top slot** (contents per the table below) — this is the only part that changes
- A way to search for a route
- A list of nearby routes
- A promotions area, which is **absent entirely** when there is no active promotion
- Primary navigation to: Home · Trips · Wallet · Help · Profile (5 destinations max, U2)
**Constant rule** The set and order of these elements never changes between contexts or platforms
(DEC-098); only the top slot's content differs.
**Adaptive top slot priority**
| Condition | Top slot |
|---|---|
| Active booking today | `TicketCard` with countdown + "Show QR" (highest priority) |
| Upcoming booking (later) | `TicketCard` calendar-style, next 1 shown |
| Subscriber, no booking today | Next 5 rides + skip/pause |
| Repeat commuter | Their usual route + boarding point, one tap |
| New user, nothing saved | Prompt: "Find a route near you" + nearby routes |
**States** Loading: skeletons in the same shape · Empty (no routes in this city): plain sentence +
"Tell us where you need service" (never a dead end, P3) · Error: cached content + retry chip ·
Offline: cached routes and the active ticket remain usable; `OfflineBanner` · RTL: full mirror.
**Decisions** DEC-098, DEC-120, DEC-014 · **API** `GET /v1/routes?near=`, `GET /v1/bookings?status=active`
**Note [W]** Desktop may show the map alongside the list. Same elements, same order of importance.

---

## R-11 · Route list / map (DEC-120 step 1)
**Purpose** Choose a ROUTE, not a destination.
**Contents** Toggle list ⇄ map; `RouteCard` per route: name (ar/en), flat fare (DEC-115),
frequency, direction, first/last departure. Search by route name or by a place the route passes.
**Rules** Routes outside an active service area are simply absent — the whole map is visible but
unserved areas show no routes (DEC-057, "never block looking").
**Actions** Select route → R-12.
**States** Loading: 5 skeleton cards · Empty: "No routes here yet" + a "notify me" action ·
Error: retry · Offline: last-cached route list, marked with last-synced time · RTL: mirrored list,
map NOT mirrored.
**API** `GET /v1/routes`

---

## R-12 · Boarding point picker (DEC-120 step 2)
**Purpose** Choose where to get on.
**Contents** Map with route line (`accent/route`) and stop pins; below it, `BoardingPointRow` list
sorted by walking time, nearest first. Each row: stop name, walking time, "recommended" badge.
A separate row offers **street pickup** with its price delta (DEC-063, CH6a).
Unavailable stops are shown **disabled with a plain reason** ("not served by this departure",
"too late to reach"), never hidden and never selectable-then-failing (DEC-065, DEC-140).
The screen must also state the asymmetry plainly: **you board at a stop, but you can get off
anywhere along the route** (DEC-140).
**Rules** No walking ceiling (DEC-064) — a distant stop is shown with its honest walking time, and
street pickup is always offered alongside.
**Actions** Select boarding point → R-13.
**States** Loading: map + skeleton rows · Empty (no reachable stop): street pickup presented as the
answer, not an error · Error: retry · Offline: cached stops for this route usable · RTL: list
mirrored, map not.
**API** `GET /v1/routes/:id/boarding_points?near=`

---

## R-13 · Departure picker (DEC-120 step 3)
**Contents** At most 3 `DepartureRow` (U7, one line each): departure time · boarding point ·
timetable arrival at end of line · price · recommended highlight. `SeatCounter` (DEC-083 multi-seat,
capped by config). A persistent, plain line: **"Get off anywhere along this route."** (DEC-114)
**Rules** Arrival shown is the ROUTE's published timetable (DEC-119), labelled as such — not a
personal promise. Price is final and locked (DEC-056); "fixed price, no surge" affordance (DEC-113).
**Actions** Select → R-14.
**States** Loading: 3 skeleton rows · **Empty (nothing available): DEC-076 — plain sentence plus
concrete alternatives (a later departure, a different boarding point, street pickup) — never an
empty screen** · Error: retry · Offline: booking is online-only (DEC-099); show the reason plainly ·
RTL: mirrored.
**API** `POST /v1/requests`

---

## R-14 · Review & confirm
**Contents** `PriceTag` (large, final) · route · boarding point + walking time · departure ·
seats · payment method selector (wallet default, DEC-079) · **cancellation terms stated plainly
with an explicit confirm control (DEC-055 informed consent — mandatory, not a checkbox buried in
terms)** · `Button/Primary` "Confirm booking".
**Rules** No fee may appear after this screen (U11). Seat hold is running; show its countdown.
**States** Loading: button spinner, everything else frozen · Error: seat taken → return to R-13
with a clear message and refreshed options · Offline: blocked with reason · RTL: mirrored.
**API** `POST /v1/requests/:id/accept`

---

## R-15 · Booking confirmed
**Contents** Success state, `TicketCard`, "Show QR" primary action, "Add to calendar",
share-my-ride hint, what happens next in one sentence.
**States** Offline: fully readable from cache · RTL: mirrored.

---

## R-20 · WAITING FOR THE VEHICLE ★ the anxiety screen (R12.5)
**Purpose** The rider must always know where to stand and when to move.
**Contents** `LiveMap` with vehicle + route + assigned stop · `WalkingLine` dotted path ·
**"Leave now" chip** timed so the rider reaches the stop as the vehicle does (DEC-053) ·
countdown, not just an ETA · `VehicleIdentity` (plate LTR, colour swatch, model, driver first name
+ photo) shown prominently because two vehicles may be at one stop (F-29) · `SOSButton` ·
share-my-ride · "Show QR".
**Alarm behaviour (DEC-053)** escalating: gentle notification as it approaches → strong alert +
vibration on arrival. **Must fire with the app in the background.**
**States** Loading: map skeleton + known text details · Empty n/a · Error (lost tracking): show last
known position with "last updated HH:MM", never a blank map · **Offline: stop, scheduled time,
walking line and QR all remain from cache with an honest last-updated stamp (DEC-099)** ·
RTL: panel mirrored, map not.
**API** `WS booking:{id}`

---

## R-21 · Boarding (QR)
**Contents** `QRPanel`: rotating QR at **maximum screen brightness (automatic)**, `mono-code`
numeric fallback always visible (accessibility + dead-camera fallback, CH12 §12.4-12.5),
one QR **per seat** for multi-seat bookings (DEC-083) with a clear "Seat 1 of 3" indicator.
**Success** unmistakable: full-screen confirmation + sound + haptic (CH10a §10a.4).
**States** Error (scan rejected): plain reason — wrong vehicle, wrong route, already boarded —
naming the correct vehicle and plate (F-28) · **Offline: works fully; the code is signed and
time-bounded and validates locally (DEC-091)** · RTL: instructions mirrored, code LTR.

---

## R-22 · On board (DEC-117)
**Contents** `StopList` of upcoming stops with the current one highlighted · vehicle position ·
**`AlightButton`: large, persistent, unmissable — "I'm getting off at the next stop"** ·
`SOSButton` · share-my-ride.
**Why the button matters** It tells the driver AND releases the seat for the remaining stops
(DEC-116/117). Utilisation depends on riders using it (G-053), so it must not be buried.
**Alternative path** The rider may simply tell the driver, who marks it — both supported.
**States** Offline: stop list from cache; the alight signal is queued and also announced verbally ·
RTL: mirrored.
**API** `POST /v1/bookings/:id/alight`

---

## R-23 · Journey complete
**Contents** Receipt (route, boarding point, alighting point, seats, price, method), optional
rating (informational only, DEC-096), any reward earned (DEC-060), "Book this again" and
"Make this a subscription" (DEC-100 trial day offer).
**States** Offline: receipt from cache; rating queued.

---

## R-30 · My trips
**Contents** Tabs/segments: Upcoming · Past. Rows show route, boarding point, date, price, status.
**States** Empty: "No trips yet" + "Find a route" action · Offline: cached list.

## R-31 · Trip detail
Full record, receipt, report-a-problem entry point (CH12 §12.2), lost-property action (F-31).

---

## R-40 · Wallet
**Contents** Balance, "Top up", entry list (credits, debits, rewards, refunds — all as ledger
entries, CH6 §6.1), pending items.
**Rule** Refunds appear as **wallet credit** (DEC-055) and are labelled as such, never implying a
card refund.
**States** Empty: zero balance with a top-up action · Offline: cached balance + "last updated".

## R-41 · Top up
Amount presets + custom; method selector: card, mobile wallet, Fawry/kiosk, InstaPay, Apple Pay
(DEC-079). Provider redirect handled with a clear return state.
**States** Error: provider failure explained in plain words + retry; never a raw provider code.

---

## R-50 · Subscriptions
**Contents** Active subscription (route, days, departure, seats, price, next 5 rides), skip a day,
pause a range, cancel. **Trial-day offer for non-subscribers (DEC-100).**
**Rules** Wall-clock times shown (DEC-118) — 07:30 is always 07:30 across DST.
Holiday auto-pause is visible, not silent.
**States** Empty: explain the value + trial-day CTA · Offline: cached schedule.

## R-51 · Subscription purchase
Route → boarding point → days → departure → seats → price → **cancellation and guarantee terms
stated plainly** → confirm.
**Guarantee terms shown here (DEC-130)** in plain words: "If we can't give you your seat, you get
that day's fare back as credit, plus a credit for the trouble." Amounts come from configuration.

---

## R-60 · Safety centre (CH12 §12.1)
`SOSButton` explained, share-my-ride, emergency contacts, safety tips.
**Rule** SOS is reachable in ONE TAP from any ride screen; this screen is education, not the path.

## R-61 · SOS active
Confirmation that help was reached, who is responding, live location being shared, cancel-alarm
control. **Silent mode** available (no visible change on screen).
**States** Offline: falls back to SMS with coordinates (CH12 §12.1.1) and says so.

## R-62 · Report a problem
Category picker (severity-mapped, CH12 §12.2), free text, optional photo, related booking
pre-filled. Confirms a ticket was created and that the reporter will be told the outcome.

---

## R-70 · Help / Support
FAQ, contact channel (F-40 — channel still undecided), my tickets.

## R-80 · Profile & settings
Name/photo/email, language, numerals (Western/Arabic-Indic), notification preferences by category
(ride status cannot be disabled, CH10 §10.6), payment methods, privacy controls and data export
(CH13 §13.3), delete account (anonymises, INV-9), log out.

---

## Rider screen count: 27
R-00,01,02,03,04,05 · R-10,11,12,13,14,15 · R-20,21,22,23 · R-30,31 · R-40,41 · R-50,51 ·
R-60,61,62 · R-70,80

## Open items blocking rider screens
- ~~QR fallback~~ — CLOSED by DEC-136: the always-visible numeric code is the fallback.
- ~~Support channel~~ — CLOSED by DEC-152: in-app chat + phone.
- Product name — deliberately parked (DEC-128); a token swapped once when chosen.
