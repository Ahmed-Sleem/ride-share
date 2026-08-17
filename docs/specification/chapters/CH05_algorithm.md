# CHAPTER 5 — The Matching Algorithm

Status: DRAFT v2 — rewritten for the ROUTE-TICKET model (DEC-114..120). Implements DEC-072..DEC-076. Evidence: R4, R7, R8, R9.
Depends on: CH1 (domain), CH3 (states), CH4 (geography), CH6a (pricing)

---

## 5.0 What this engine must do

Take a rider's stated intent (**route, boarding point, seats, ticket type** — DEC-120) and produce
either:
- up to 3 concrete, priced, guaranteed departure options on that route, or
- an honest "no" with real alternatives (DEC-076).

It must do this while respecting promises already made to riders on board (CH3 §3.3.1), never
selling a seat twice, and never making anyone wait on a solver.

---

## 5.1 The pipeline (DEC-074)

```
 REQUEST
    │
    ▼
[0] H3 PRE-FILTER            µs      shrink the world to a handful of candidates
    │
    ▼
[1] FEASIBILITY GATE         ms      remove everything that is impossible or harmful
    │
    ▼
[2] INSERTION HEURISTIC      ms      produce a VALID answer, always
    │
    ▼
[3] BATCH OPTIMISER          bounded improve within a deadline; abandonable at any instant
    │
    ▼
[4] OFFER WORKFLOW           s       offer → accept/timeout → re-offer → confirm
    │
    ▼
 BOOKING

[5] OVERNIGHT PLANNER        hours   full VRP for scheduled & subscription journeys
```

**Governing invariant (INV-23):** if stage 3 is interrupted at any moment, stage 2's answer remains
valid and shippable. The optimiser is always optional.

---

## 5.2 Stage 0 — H3 pre-filter
- Every Stop, Journey position and rider location is indexed to an H3 cell (R9.2).
- Candidate journeys/vehicles are gathered from the rider's cell plus a k-ring of neighbours.
- The ring expands progressively if too few candidates are found, up to a configured maximum.
- Redis holds the hot geospatial index; PostGIS holds the authoritative data (A4.5).
- **Config:** `H3Resolution`, `InitialKRing`, `MaxKRing`, `MinCandidates`.

## 5.3 Stage 1 — Feasibility gate (hard constraints, no scoring)

A candidate journey is discarded unless ALL hold:

| # | Constraint | Source |
|---|---|---|
| F1 | A seat is free for the requested count | INV-2, DEC-047 |
| F2 | Vehicle and driver are APPROVED and not suspended | CH2 §2.5 |
| F3 | The rider's pickup precedes their drop-off in the stop sequence | INV-3 |
| F4 | Rider reaches the pickup point in time (walking speed × distance) | CH4 §4.3 |
| F5 | ~~Rider arrives by their stated arrive-by time~~ **REMOVED** — no destination is declared (DEC-114) | — |
| F6 | **The vehicle does not fall more than `MaxScheduleSlip` behind the route timetable** (DEC-119) | CH3 §3.3.1 |
| F7 | Journey's cumulative detour stays within `JourneyDetourBudget` | CH6a §6a.3 |
| F8 | For street pickup: detour within `BandC_Max`, occupancy below threshold | CH6a §6a.3 |
| F9 | Pickup and drop-off are inside an ACTIVE service area | INV-20 |
| F10 | Journey state is OPEN_FOR_BOOKING or (IN_PROGRESS and RoutePolicy allows insertion) | CH3 |

F6 is the moral core of the product, restated for the route model (DEC-119):
> **The published timetable is a promise to everyone on board.** No pickup, deviation, wait or
> insertion may push the vehicle more than `MaxScheduleSlip` behind it. Because every rider on a
> route shares one schedule, protecting the timetable protects them all — an existing rider is
> never sacrificed for a new one.

Corollary: a route with no realistic timetable cannot be operated. Timetables come from the
overnight planner (stage 5) and are validated in simulation (CH14 §14.3).

## 5.4 Stage 2 — Insertion heuristic (always produces an answer)

For each surviving candidate journey, try inserting the new pickup and drop-off at every legal
position pair in the stop sequence, and keep the cheapest insertion by this cost:

```
InsertionCost = w_detour   × AddedVehicleMinutes
              + w_walk     × RiderWalkMinutes
              + w_wait     × RiderWaitMinutes
              + w_ride     × RiderInVehicleMinutes
              + w_slip     × ScheduleSlipMinutesAdded      ← DEC-119 (replaces w_promise)
              + w_empty    × EmptySeatPenalty
```
- All weights are **configuration** (DEC-070), tunable per city and per time of day.
- `w_slip` prices the harm done to the timetable, so an insertion that makes the vehicle late loses.
- `w_empty` gently favours filling vehicles that are emptier, improving overall utilisation.
- Complexity is bounded: insertions are only attempted within a configured window of the sequence,
  not across the whole route (R9.5 pruning lesson).

Output: a ranked list. Top 3 become the rider's options (S4: each describable in one line).

## 5.5 Stage 3 — Batch optimiser (the 8-10%)

- Requests accumulate for an **adaptive window** (DEC-072): short under high demand, longer when
  quiet, bounded by `MinBatchWindow` / `MaxBatchWindow`, both configurable.
- At each tick, the batch is solved as an assignment problem over the feasible
  (request → journey-insertion) pairs produced by stage 2.
- Runs under a **hard deadline** (`OptimiserDeadlineMs`). On expiry, the best solution so far is
  taken; stage 2's answer is the floor. (R4.2 anytime property, R9.5.)
- Aggressive pruning per R9.5: limit candidates per request, limit requests per journey, drop
  dominated pairs before solving.
- Expected benefit ~8% more requests served and ~10% less distance (R9.5) — measured, not assumed.

## 5.6 Stage 4 — Offer workflow (R9.6, R9.7)

```
rank options → present to rider → rider selects → SEAT HOLD placed
   → if journey needs driver acceptance: offer to driver, timeout T
        → accept  → BOOKING CONFIRMED
        → decline/timeout → next candidate → ... → honest failure (DEC-076)
   → hold expires if the rider does not confirm
```
Correctness requirements (R9.7):
- **Seat holds use an ephemeral lock + durable compare-and-set.** Two riders can never take the
  same seat (INV-2).
- All transitions are **idempotent**; retries are safe.
- Timers and workflow state must **survive a restart** (durable workflow, not in-memory timers).
- Every step emits a canonical event (CH8a §8a.5).

## 5.7 Stage 5 — Overnight planner (DEC-073)
- Runs nightly for the next N days of scheduled and subscription journeys.
- Full vehicle-routing optimisation with OR-Tools: assign riders to vehicles, order the stops,
  set departure times, balance vehicle loads.
- Output: concrete published Journeys, ready for same-day live insertion.
- Re-runs incrementally as new subscriptions arrive during the day.
- Because subscriptions guarantee seats (DEC-051), this planner also verifies the guarantee can be
  met and raises an alarm to operations if supply is short (G-028).

## 5.8 Fairness (DEC-075)
Pure efficiency: no fairness weighting. Implemented as `w_fairness = 0` in configuration, so the
capability exists and can be enabled without a code change if driver churn becomes a problem
(G-036).

## 5.9 Degradation rules (R9.8)
| Failure | Behaviour |
|---|---|
| Routing engine (OSRM) slow/down | Fall back to cached corridor matrices, then to Haversine × a calibrated factor; mark ETAs as approximate |
| Analytics pipeline lagging | Matching continues untouched; analytics is never on the hot path |
| Redis geo index stale | Fall back to PostGIS query; slower but correct |
| Optimiser unavailable | Stage 2 only; service continues at reduced efficiency |
| Everything degraded | Still serve stop-to-stop fixed-route journeys, which need no live optimisation |

**Rule:** the system degrades in quality, never into failure.

## 5.10 Rider-chosen stops (DEC-065, G-035)
Riders may pick any stop from the map or list. Therefore:
- Feasibility (stage 1) is evaluated per boarding stop on the chosen route; stops that cannot be
  served by the selected departure without breaking the timetable are rendered as UNAVAILABLE with
  a plain reason — never selectable-then-failing.
- The recommended stop is highlighted; choosing another recomputes options and price before booking.

## 5.11 What must be simulated before launch (feeds CH14)
Using FleetPy with synthetic Alexandria demand: fleet size vs service rate, walking-distance
sensitivity, batch-window tuning, promise-tolerance tuning, and the street-pickup share at various
surcharge levels. No parameter above should be set by intuition alone at launch.

## 5.12 Invariants added
- INV-23 Stage 3 is always optional; stage 2's output is always valid.
- INV-24 A seat may be held by at most one request at a time; holds expire deterministically.
- INV-25 No insertion may violate F6 (route schedule adherence, DEC-119) under any circumstance.
- INV-31 A seat is reserved to the end of the route (DEC-116) unless an alighting signal releases it
  (DEC-117); the algorithm may only resell a seat after a signal, never on a prediction.


---

## 5.13 Route-ticket adaptations (DEC-114..120) — added in v2

### 5.13.0 Where journeys come from (DEC-132)
The engine no longer creates journeys from pooled demand. A Journey exists because a **driver
claimed a published slot** (CH4a). The matching engine therefore:
- assigns riders to **existing claimed departures** on the route they chose;
- reports **uncovered demand per slot** back to the coverage mechanisms (CH4a §4a.6) instead of
  inventing a vehicle that does not exist;
- may recommend opening an **additional vehicle** on a slot when demand exceeds one vehicle and
  `max_vehicles` allows it (CH4a T5).
This makes stage 5 (the overnight planner) a **slot-grid and coverage planner**, not a free-form
vehicle-routing solver: it proposes where slots and incentives should be, and verifies that
committed coverage can honour sold subscriptions (CH4a §4a.7).

### 5.13.1 What the rider asks for now
Not "from A to B by 08:30", but: **this route · this boarding point · this many seats · this ticket
type**. The engine's job narrows to: *which departure on this route can collect this rider at this
point, without breaking the timetable?*

### 5.13.2 Capacity accounting (DEC-116, DEC-117)
- On boarding, a seat is consumed **for every remaining stop on the route**.
- A seat is released only when an **alighting signal** occurs: the rider taps "I'm getting off", or
  the driver marks it. Release applies from the next stop onward.
- The algorithm may **never** predict an alighting and resell a seat speculatively (INV-31).

### 5.13.3 Stop service (DEC-041, DEC-117)
A stop is served if it has: a declared boarding, or a signalled alighting, or is a timetable
anchor point. Otherwise it is skipped.

### 5.13.4 What got simpler
- Constraint F3 (pickup precedes drop-off) is now trivially satisfied.
- There is no drop-off deviation, because there is no declared destination — the street-pickup tier
  applies to **boarding only**.
- The offline planner optimises **timetables and vehicle allocation per route**, not per-rider
  origin-destination pairs — a materially smaller problem.

### 5.13.5 What got harder
- Utilisation now depends on riders signalling their alighting. If they do not, vehicles run with
  seats that are held but empty. **This must be measured from day one** and, if signalling is rare,
  the alighting-signal UX has to be made more prominent, or DEC-116 revisited.
