# CHAPTER 3 — Lifecycle & State Machines

Status: DRAFT v1 — sections marked [MCQ PENDING] are NOT decided and will be raised with the user.
Depends on: CH1 (domain model), CH2 (roles)
Addresses audit items: F-01, F-02, F-03, F-04 (partly)

---

## 3.0 Why state machines matter here

Every dispute, refund, complaint and bug in a ride platform traces back to a state question:
"was the rider picked up or not?", "was the journey cancelled before or after the driver left?",
"is this seat still reserved?". If the states are vague, the money is vague. This chapter makes
every state explicit, with exactly one owner and one set of legal transitions.

Rule for the whole system: **a state change is an EVENT, appended to an immutable log** (INV-10).
The current state is a projection of that log, never the only record.

---

## 3.1 RideRequest state machine (what the rider wants)

```
                    ┌──────────────────────────────────────────┐
                    v                                          │
  [CREATED] ──> [SEARCHING] ──> [OFFERED] ──> [CONFIRMED] ──> (becomes a Booking)
                    │              │
                    │              └──> [OFFER_EXPIRED] ──> back to SEARCHING
                    │
                    ├──> [NO_SUPPLY]  (nothing found; rider is told honestly)
                    ├──> [EXPIRED]    (rider's latest acceptable time passed)
                    └──> [CANCELLED]  (rider gave up)
```

| State | Meaning | Who can change it | Time limit |
|---|---|---|---|
| CREATED | Request saved, not yet processed | system | instant |
| SEARCHING | In the matching batch queue | system | until latest_departure |
| OFFERED | One or more concrete options shown to the rider | system | short hold (see 3.1.1) |
| CONFIRMED | Rider accepted an option; a Booking now exists | rider | — |
| OFFER_EXPIRED | Rider did not accept in time; seat released | system | — |
| NO_SUPPLY | No feasible option exists | system | — |
| EXPIRED | The request's own deadline passed | system | — |
| CANCELLED | Rider withdrew | rider | — |

### 3.1.1 The seat-hold problem [MCQ PENDING]
When the system offers a seat, that seat must be held or two riders could book it. But a long hold
wastes capacity. Options to be decided: hold duration, whether holds are shown to other riders as
"1 seat left", and whether scheduled journeys hold differently from live ones.

---

## 3.2 Booking state machine (the rider's confirmed seat) — the money-bearing object

```
[RESERVED] ──> [CONFIRMED] ──> [EN_ROUTE_TO_STOP] ──> [WAITING_AT_STOP] ──> [ON_BOARD] ──> [COMPLETED]
     │              │                  │                      │                  │
     │              │                  │                      ├──> [NO_SHOW]     │
     │              │                  │                      │                  │
     └──> [CANCELLED_BY_RIDER] <───────┴──────────────────────┘                  │
     └──> [CANCELLED_BY_DRIVER] ───────────────────────────────────────────────> │
     └──> [CANCELLED_BY_SYSTEM] ──────────────────────────────────────────────────┘
                                                                    (all cancellations
                                                                     resolve to a refund
                                                                     outcome, see CH6)
```

| State | Meaning | Money implication |
|---|---|---|
| RESERVED | Seat held, payment not yet secured | none |
| CONFIRMED | Payment method authorised/committed | funds held or committed |
| EN_ROUTE_TO_STOP | Vehicle is on its way; rider should start walking | committed |
| WAITING_AT_STOP | Vehicle has arrived at the pickup point | committed |
| ON_BOARD | Rider boarded (see 3.5 boarding proof) | committed |
| COMPLETED | Rider alighted at their drop-off | charged |
| NO_SHOW | Rider was not there when the vehicle left | OPEN — see 3.10.9 |
| CANCELLED_BY_RIDER | Rider cancelled | RESOLVED by DEC-055 — see 3.10.6 |
| CANCELLED_BY_DRIVER | Driver cancelled | full credit to rider; driver penalty OPEN — 3.10.9 |
| CANCELLED_BY_SYSTEM | Platform failure, vehicle breakdown, safety | full refund, no rider penalty |

---

## 3.3 Journey state machine (the vehicle's run)

```
[CLAIMED] ──> [OPEN_FOR_BOOKING] ──> [LOCKED] ──> [IN_PROGRESS] ──> [COMPLETED]
                │                  │                  │              │
                │                  │                  │              ├──> [ABORTED] (breakdown,
                │                  │                  │              │     accident, safety)
                └──────────────────┴──────────────────┴──> [CANCELLED] (before it started)
```

| State | Meaning |
|---|---|
| CLAIMED | A driver has claimed a published slot (DEC-132); the Journey now exists |
| OPEN_FOR_BOOKING | Accepting bookings |
| LOCKED | Booking window closed; route and stop list are frozen [MCQ PENDING: how long before departure] |
| IN_PROGRESS | Vehicle has departed the first stop |
| COMPLETED | All bookings resolved (completed or no-show) |
| CANCELLED | Never departed |
| ABORTED | Departed but could not finish — the hardest case (see 3.6) |

### 3.3.1 Can a journey change after it starts?
Yes, and this is the heart of pooling: new riders can be inserted into a moving journey if
RoutePolicy allows (DYNAMIC or DEVIATION_ALLOWED) and the insertion does not violate the promises
already made to riders on board. The exact constraint set belongs to CH5 (the algorithm), but the
LIFECYCLE rule is stated here:

> **Schedule-adherence rule (DEC-119, supersedes the earlier promise-preservation rule):** any
> change to a Journey in IN_PROGRESS must not push the vehicle more than `MaxScheduleSlip` behind
> its published route timetable. Because every rider on a route shares one schedule, protecting the
> timetable protects them all.
> [OPEN: the value of `MaxScheduleSlip`, and whether riders on board are notified of a slip.]

---

## 3.4 Driver duty state machine

```
[OFFLINE] ──> [ONLINE_IDLE] ──> [ASSIGNED] ──> [DRIVING_JOURNEY] ──> [ONLINE_IDLE]
                   │                                   │
                   └──> [OFFLINE]                      └──> [BREAK] ──> [ONLINE_IDLE]
[SUSPENDED] — set by admin or automatic document expiry; blocks everything.
```
- A driver in DRIVING_JOURNEY cannot be assigned to a second journey (INV-5).
- Going OFFLINE with active bookings on board is forbidden; the journey must be completed or aborted.

---

## 3.5 Boarding proof — how we know a rider actually got in

> **RESOLVED by DEC-049 (QR primary). See 3.10.1 for the binding specification.**
> The options below are retained as the reasoning record.

This single mechanism determines fare accuracy, no-show disputes, and fraud resistance. Candidate
approaches (to be decided by MCQ, with trade-offs):
- **A. Driver taps "picked up"** — simplest, but the driver controls the money-bearing event.
- **B. Rider taps "I'm in"** — rider controls it; riders forget, and it fails with no signal.
- **C. Short numeric code** the rider shows and the driver enters (like Uber's PIN) — strong proof,
  slight friction, works offline.
- **D. QR code scan** — fast and precise, needs a working camera and light; awkward at night.
- **E. Automatic by GPS proximity** — zero friction, but unreliable in dense streets and spoofable.
- **F. Combination**: automatic attempt, falling back to a code.

---

## 3.6 The worst case: driver cancels or aborts with riders on board (F-02)

This is the most damaging operational event in shared transport, and it MUST have a designed
response rather than an ad-hoc one.

Defined sequence (proposed; the compensation parts are [MCQ PENDING]):
1. Journey moves to ABORTED. All ON_BOARD bookings move to a special resolution flow.
2. Every affected rider is notified immediately, in their language, with a concrete next step —
   never a generic error.
3. The system automatically attempts re-accommodation onto other journeys, prioritising these
   riders above new requests.
4. Riders are charged only for distance actually travelled, or nothing at all [MCQ PENDING].
5. The incident is logged against the driver with a severity level; repeated aborts trigger review.
6. Support Agents are alerted proactively — they should contact the rider before the rider contacts
   them.

---

## 3.7 Recurring Plans — how daily commutes are generated (user requirement #7)

A RecurringPlan is a RULE, not a booking. Under the route-ticket model (DEC-114/120) it holds:
**route, boarding point, departure time, days of week**, start date, optional end date, seat count,
and preferences. It carries NO destination.

### Generation model — **RESOLVED by DEC-051 (SUBSCRIPTION). See 3.10.3.**
The three candidates below are retained as the reasoning record.
- **A. Auto-book:** the system creates and confirms real bookings in advance (e.g. 3 days ahead).
  Best experience — the commuter never thinks about it. Risk: charging for rides not taken when
  plans change; needs an easy "skip tomorrow" control.
- **B. Auto-request only:** the system creates the ride request each day but the rider must confirm.
  Safer for money, but it re-introduces daily friction, which defeats the purpose.
- **C. Subscription:** the rider buys a weekly/monthly commute and seats are guaranteed.
  Strongest retention and predictable revenue; requires guaranteed supply, which is hard early.

### Required controls regardless of model
- Skip a single day; pause for a date range (holidays, exams, travel).
- Automatic pause on public holidays [needs an Egyptian holiday calendar — F-item].
- Edit the plan without losing history.
- Clear visibility: "your next 5 rides" always shown.

---

## 3.8 Cancellation & no-show policy (F-01, F-03)

> **PARTLY RESOLVED: rider cancellation by DEC-055 (3.10.6); wait time by DEC-052/DEC-084 (3.10.4).**
> The questions below that remain open are listed in 3.10.9.

Every parameter here is a business decision, not a technical one, and none are decided:
- How long before departure can a rider cancel free of charge?
- Is there a fee after that, and how much?
- How many free cancellations per period before penalties escalate?
- How long does a vehicle wait at a stop for a late rider? (This directly harms everyone on board.)
- Is a no-show charged? Fully or partly?
- What penalty does a DRIVER face for cancelling, and what does the rider receive?
- Do penalties differ for scheduled vs live journeys? (A scheduled cancellation is worse: the seat
  was unavailable to others for days.)

---

## 3.9 Invariants added by this chapter
- INV-13 A Booking can only reach ON_BOARD from WAITING_AT_STOP or EN_ROUTE_TO_STOP.
- INV-14 A Journey cannot enter IN_PROGRESS with zero CONFIRMED bookings [unless deadheading is
  explicitly permitted — MCQ PENDING].
- INV-15 Every terminal Booking state (COMPLETED, NO_SHOW, any CANCELLED) must have exactly one
  financial resolution recorded.
- INV-16 No state may be changed by two actors simultaneously; all transitions are serialised
  per-Booking and per-Journey.
- INV-17 A rider may hold at most one ON_BOARD booking at any instant.

---

## 3.10 CONFIRMED CLOSURES (user MCQ, 2026-07-29)

### 3.10.1 Boarding proof — QR PRIMARY (DEC-049)
QR codes are the primary validation mechanism everywhere possible. GPS runs in the background as a
supporting/observational signal only, never as proof.

**Mechanism**
- Each Booking generates a QR code, rotating (time-limited) so a screenshot cannot be reused.
- The DRIVER's app scans the RIDER's QR at boarding. (Direction chosen deliberately: the driver's
  device is the one that must be online and charged; it is the operational device.)
- On a successful scan the Booking moves WAITING_AT_STOP -> ON_BOARD, with a signed, timestamped,
  geolocated event.
- The driver's app displays a live manifest: who has boarded, who is still missing at this stop,
  with one-tap masked contact for each missing rider (DEC-053).
- Alighting: QR scan again at drop-off where practical, otherwise the driver marks arrival at the
  Journey Stop and all riders whose drop-off is that stop are completed automatically.

**Offline behaviour (mandatory)**
Scans must work with no network. The scan result is validated locally against a signed payload,
queued in the offline outbox (DEC-009), and synced when connectivity returns. Boarding must never
depend on the network.

**Fallbacks — REQUIRED, still to be designed (G-026)**
Dead/lost phone, cracked screen, no light, no smartphone, damaged code. Options to be raised in CH10.

### 3.10.2 Data capture (DEC-050)
Comprehensive event capture is an explicit product requirement. Every state transition, scan, GPS
sample, offer shown, offer declined, price quoted, and notification sent is recorded as an event.
Scope, GPS sampling frequency, retention and consent are NOT yet decided — tracked as G-027 for CH13.

### 3.10.3 Recurring commutes — SUBSCRIPTION model (DEC-051)
Supersedes the auto-book/auto-request options in 3.7. Riders purchase a weekly/monthly commute and
seats are GUARANTEED for the covered journeys.
- The platform now carries a supply obligation it must be able to honour (G-028).
- Required controls remain: skip a day, pause a date range, holiday handling, "your next 5 rides".
- Guarantee-failure remedy (what the rider gets when a guaranteed seat cannot be provided) is NOT
  decided — CH6.

### 3.10.4 Wait time at a stop (DEC-052)
Default wait is **10 minutes**. The driver may choose to extend at their discretion.
- Riders on board must be shown what is happening and why (transparency requirement).
- Efficiency mitigation options are open in G-029 (e.g. restrict long waits when the vehicle is full
  or when a downstream promise would be breached).

### 3.10.5 Boarding UX requirements (DEC-053) — binding on CH10
- The rider's phone must ALARM (sound + vibration + prominent screen) when the vehicle reaches the
  rider's stop, and earlier as it approaches. This must work with the app in the background.
- The driver's app must show, per stop: expected riders, who has scanned in, who is missing,
  a countdown of the wait, and one-tap masked calling of missing riders.

### 3.10.6 Cancellation policy — STRICT WITH INFORMED CONSENT (DEC-055)
Supersedes section 3.8's open questions on rider cancellation.
- Before purchase, the UI must clearly state the cancellation terms and require explicit
  confirmation. No silent acceptance, no buried terms.
- After purchase, cancelling forfeits approximately 50% of the ticket price. [Exact percentage,
  and whether it varies by how close to departure, to be finalised in CH6.]
- ALL refunds are issued as WALLET CREDIT, never returned to the original payment method.
- Driver-side and system-side cancellation penalties/compensation remain open for CH6.
- Business risk accepted and monitored: G-031.

### 3.10.7 Price certainty (DEC-056)
The quoted price is locked at booking and does not change based on vehicle occupancy or matching
outcome. This is a lifecycle guarantee: no Booking's fare may be recalculated after CONFIRMED,
except by an explicit refund/adjustment event.

### 3.10.8 Fare model consequence for this chapter (DEC-058, DEC-059)
Because fares are FIXED PER ROUTE and riders are not exposed to occupancy, the Booking lifecycle
carries a single immutable price from CONFIRMED onward. This removes an entire class of
end-of-journey fare-calculation states that occupancy-based pricing would have required.

### 3.10.9 Remaining OPEN items in this chapter (not closed by the agent)
- Seat-hold duration during OFFERED (3.1.1)
- Journey LOCKED timing (how long before departure bookings close)
- `MaxScheduleSlip` value (3.3.1) — how far behind timetable a vehicle may fall (DEC-119)
- Deadheading: may a Journey run with zero bookings? (INV-14)
- Driver cancellation penalties and rider compensation (3.6, 3.8)
- No-show charge treatment
- Subscription guarantee-failure remedy
