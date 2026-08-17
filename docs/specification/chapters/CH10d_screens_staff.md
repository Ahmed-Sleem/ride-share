# CHAPTER 10d — Screen Inventory · PART 3: OPERATIONS, MANAGER & SUPPORT

Status: DRAFT v1. Format per DEC-131: **each screen is a list of what must be present.**
No layouts, no visual prescriptions — designers decide arrangement, hierarchy and styling.
All five states still required (CH10a §10a.7). These surfaces are **desktop-first web** (DEC-085).

---
# 3A · OPERATIONS ADMIN  (`O-nn`)
Home is the WORK QUEUE (DEC-102). The job is clearing queues, not watching dots.

## O-10 · Operations home
**Must contain**
- A prioritised list of work queues, each showing: name, count, age of the oldest item, SLA state
  — driver approvals · vehicle approvals · open incidents · disputes · expiring documents ·
  stops awaiting verification
- Severity indication where a queue contains anything high-severity
- A way to jump straight into any queue
- Access to the live operations map (secondary, not the default view)
**States** Loading: skeleton rows · Empty: "nothing waiting" stated positively · Error: retry ·
Offline: read-only cached counts with last-updated · RTL: mirrored.
**API** `GET /v1/ops/queue/*`

## O-11 · Driver approval queue
- Filterable, sortable list of drivers awaiting review, oldest first within severity
- Per row: applicant, submitted date, waiting time, which documents are present
- Bulk selection for routine actions
- A clear indication of anything previously rejected or re-submitted

## O-12 · Driver review workspace
**Must contain**
- Every submitted document viewable at full size, side by side with the typed data to compare
- The submitted selfie next to the ID photo for human face comparison (DEC-035)
- Expiry dates, with anything already expired flagged
- Duplicate-detection result (same ID or phone used elsewhere)
- Three decisions: approve · needs fix · reject — each requiring a **reason in the applicant's
  language**, shown to them (CH2 §2.5)
- Full history of this applicant's prior submissions and decisions
**Access rule** Identity documents are visible **only** to Ops Admin and Super Admin (CH2 §2.4).
**States** Error on decision: never lose the typed reason.

## O-13 · Vehicle approval queue and O-14 · Vehicle review workspace
Same pattern as O-11/O-12 for vehicles: photos (front, back, sides, interior, plate), plate,
capacity, documents, expiry, fleet label (DEC-033), approve/needs-fix/reject with reason.

## O-15 · Incident workspace (CH12 §12.2 — carries the entire safety burden per G-044)
**Must contain**
- The report: who, when, category, severity, free text, any photo
- **All evidence in one place**: event log, GPS trace, manifest, masked-call metadata, prior history
  of both parties
- Whether a **precautionary suspension** has already been applied automatically (severe categories)
- Decision options: no action · warning · training · suspension (with duration) · permanent removal
  — each requiring a mandatory reason
- A control to inform the reporter of the outcome (mandatory step, not optional)
- Repeat-signal indicator: other reports about this person inside the configured window
**States** Error: decisions are never partially applied.

## O-16 · Disputes
Money disputes with the booking, the ledger entries, both parties' accounts, and a resolution
action bounded by role (only Super Admin can move money manually, CH6 §6.9).

## O-17 · Live operations map
- Every active journey, with delay indication against timetable (DEC-119)
- Vehicles that have stopped moving unexpectedly
- Aborted journeys and riders needing re-accommodation (CH3 §3.6)
- Stranded-rider alerts
- Filter by city, corridor, route
**Purpose statement** For intervening, not for browsing.

## O-18 · Stop Mapping Tool — desk mode (G-022, DEC-040) ★ launch prerequisite
**Must contain**
- Map with all existing stops, their status, and coverage indication
- Create, move, rename, merge, split, retire a stop
- Mandatory fields only: **name and location** (DEC-043)
- Optional fields, never blocking: night-safe flag, accessible flag, description, multiple photos
- **Duplicate warning** when placing a stop within X metres of an existing one
- Bulk edit and bulk import/export (CSV/GeoJSON); OSM candidates may be imported as **suggestions
  only** — every stop still requires admin approval (DEC-038)
- Coverage view: mapped vs unmapped areas, progress by district
- Full audit of who created or changed each stop
**States** Offline: not required for desk mode.

## O-19 · Stop Mapping Tool — field mode [mobile]
**Must contain**
- Drop a pin at the current GPS position, name it, save — in as few taps as possible
- Capture multiple photos
- Optional attributes, skippable
- **Works fully offline and syncs later** (mappers stand in streets with poor signal)
- A visible queue of unsynced stops
**Design note** This is used while standing outdoors in sunlight; treat it like a driver screen
(large targets, high contrast).

## O-20 · Stop verification queue
Second-person review of mapped stops before they go ACTIVE, with photo, location and attributes.

## O-21 · Service areas & routes (DEC-057, G-032)
- Create/edit service areas and routes; attach stops in order
- Set the route's **flat fare** (DEC-115) and its **published timetable** (DEC-119)
- Schedule activation and deactivation
- Deactivation must show what happens to in-flight bookings (they are honoured)
- Every change versioned, attributed, with a reason

## O-23 · Route & slot grid management (DEC-132 / CH4a) ★ NEW
**Must contain**
- Create/edit a route: ordered stops, direction, **flat fare** (DEC-115), service window
- Publish the **slot grid**: interval (e.g. every 15 min), days of week, per-slot `max_vehicles`
  (CH4a T5), and target frequency (DEC-119)
- Per slot, current state: unclaimed · claimed · committed · number of vehicles
- Ability to mark a claim as **committed** — the flag that permits subscriptions to be sold against
  that slot (CH4a §4a.7, the honesty rule behind DEC-130)
- Versioned, attributed changes with a mandatory reason; scheduled activation
**States** Empty: no slots yet, with a "publish a grid" action · Error: a change that would orphan
existing claims must be refused with a plain explanation.

## O-22 · User administration
Look up any user, see status, suspend with reason (audited), view their role grants.
**Rule** Suspension requires a reason; deletion anonymises rather than destroys (INV-9).

---
# 3B · MANAGER (commercial)  (`G-nn`)
Home is the live map **with an alert rail** (DEC-101).

## G-10 · Manager home
**Must contain**
- A live city map with an **occupancy overlay**: vehicles running, seats free, demand density by zone
- An **alert rail**: each alert is a plain sentence plus one-click actions
  (e.g. "Zone 4 · occupancy 32% · 12 empty seats now" → launch flash sale / notify riders / dismiss)
- Headline figures for the current period
- City selector (multi-city, DEC-002)
**Rules** Alerts are also deliverable by email/push so a manager need not watch the screen.
Dismissals are recorded. **No automatic money-spending rules** (DEC-101) — a human confirms.
**States** Empty: "no alerts" stated positively · Offline: read-only cached snapshot.

## G-11 · Coverage board (DEC-132 / CH4a §4a.6) ★ NEW
**Must contain**
- For a chosen date and route: every slot, whether it is claimed, by whom, and committed or not
- **Uncovered slots highlighted, with the demand waiting on each** (riders searching that slot)
- One-click actions per uncovered slot: **offer an incentive** (amount + budget cap, INV-29) ·
  **push a suggestion** to suitable nearby drivers
- Coverage summary: % of slots covered today and tomorrow, and **whether committed coverage is
  sufficient for the subscriptions already sold** (CH4a §4a.7) — with a warning if it is not
- History of incentives offered and whether they worked
**Why it exists** Without this, coverage is emergent and the timetable becomes fiction.
**States** Empty: full coverage stated positively · Offline: read-only cached snapshot.

## G-12 · Alert detail
The underlying data, the recommended action, the expected cost, and the action controls.

## G-13 · Pricing control (DEC-062, CH6a)
**Must contain**
- Route flat fares (DEC-115)
- The per-km **suggestion** rate — used only to propose a fare for a NEW route; riders are never
  charged per km (DEC-133)
- Every variable of the street-pickup formula: uplift multiplier, band thresholds and fees,
  cost-recovery rates, min/max clamps (CH6a §6a.4)
- **Where each value is inherited from** (global → country → city → corridor → route → time window)
- **Preview before publish**: the effect on real recent journeys, including how many street pickups
  would have been refused
- Scheduled activation with automatic expiry
- **One-click rollback** to the previous version
- Change history: who, when, why (reason mandatory)
- Sanity limits that prevent zero or absurd fares
**States** Error: a rejected change explains which limit it violated.

## G-14 · Temporary price change (DEC-113)
Manager-initiated, time-boxed price increase for a defined area/route/period, with a stated reason.
**Rule** There is **no automatic surge**; this is the only way a price rises, and it is attributable.

## G-15 · Promotions & flash sales
- Create: type, target (route/corridor/stop/time window/segment), discount, **budget cap**, window
- Live spend against budget, with automatic stop when exhausted (INV-29)
- Stop a running promotion immediately
- Per-promotion performance: cost, rides generated, new users, retention effect (CH7 §7.3)

## G-16 · Growth mechanics (DEC-060, DEC-082, DEC-103)
Switch each mechanic on/off and configure it: referrals, journey sharing, commuter streaks —
with reward amounts, caps per user and per period, and measured performance side by side.

## G-17 · Campaigns / notifications
Audience, channel, message (per language), schedule, and the **per-user rate limits** that apply
regardless of how many campaigns target someone (CH10 §10.6).

## G-18 · Analytics
Rides, revenue, commission, occupancy, fill rate, unserved requests, cancellation rate,
street-pickup share, subscription growth, reward cost, **alighting-signal usage rate (G-053)** —
by city, corridor, route and time. Export available (and audited).

## G-19 · Configuration browser
Every tunable value with its current setting, scope, inheritance, last change and who made it.
**Note** Depends on the configuration key catalogue, which does not yet exist (next artefact).

---
# 3C · SUPPORT  (`S-nn`)
Deliberately bounded (CH2 §2.4). The design must make the limits obvious, not hide them.

## S-10 · Support home
Assigned tickets, queue, and a lookup box (phone or booking reference).

## S-11 · Lookup result
**Must contain**
- The person's **active journey only** — not their full history beyond a recent window
- Booking details needed to help: route, boarding point, departure, seats, price, status
- Masked contact controls
- **Identity documents are NOT shown** — this must be visibly absent, not merely disabled
**Access rule** Everything here is audited.

## S-12 · Ticket workspace
Conversation, related booking, actions permitted at this role, and an **escalate** control.
**Must show the limits plainly**: refunds only up to `SupportRefundLimit`, and what requires escalation.

## S-13 · Support actions
- Cancel a live ride (reason mandatory)
- Issue a refund **up to the configured limit** — attempts above it are refused with a clear
  message and converted into an escalation, never silently failed
- Contact rider or driver via masked channel
- Escalate to Ops or Manager with a reason
**Rule** Support can fix a rider's day; Support can never change the ledger (CH2 §2.4.1).

## S-14 · Lost property (F-31)
Report, match to a journey, contact the driver via masked channel, track to resolution.

---

## Screen counts
Rider 27 · Driver 20 · Operations 13 · Manager 10 · Support 5 → **75 screens total**

## Cross-checks performed (P6)
- Support screens grant nothing beyond CH2 §2.4; identity documents visibly absent.
- Manager screens contain no automatic money-spending rule (DEC-101).
- Pricing screen exposes exactly the CH6a variables, no more.
- Stop Mapping Tool matches CH4 §4.4 requirements, including offline field mode.
- Every staff action that changes money, safety or access requires a reason and is audited.

## Open items
- ~~Config key catalogue~~ — DELIVERED as Chapter 19.
- ~~Support channel~~ — CLOSED by DEC-152: in-app chat + phone.
- SLA targets per queue — DEFERRED to post-beta by DEC-161; fields exist, unset.
