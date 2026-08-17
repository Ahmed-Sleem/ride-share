# TARGETED AUDIT — "Who initiates a Journey?" (2026-07-31)
Triggered by the user's question: "who initiates? does the driver post the route and its time and
the seats on the app, then people book — or what? and is that normal, or will the driver have hassle?"

## FINDING: the specification currently contradicts itself. This was never explicitly decided.

### What each part of the spec says today

| Source | What it says | Implies |
|---|---|---|
| **DEC-020** (session 1) | "'Publish a journey' is a driver/admin-only screen." | Drivers publish |
| **CH01 §1.3** mode table | Carpool: "**the driver** (a person going anyway)" creates the Journey | Drivers publish |
| **CH02 §2.4** permissions | "Publish a Journey — Driver: **Y**" | Drivers publish |
| **CH01 §1.4** SupplyPolicy | `PEER_CARPOOL` \| `OPERATOR_FLEET` \| `PLATFORM_DISPATCH` | All three exist |
| **DEC-115** (session 2) | Flat fare **per route**, set by a Manager (screen G-12) | Operator defines routes |
| **DEC-119** (session 2) | Every route has a **published timetable** the vehicle must keep | Operator defines schedules |
| **O-21** (screen) | Ops/Manager creates routes, attaches stops, sets fare and timetable | Operator defines routes |
| **D-11** (screen) | "**Assigned**/scheduled journeys… 'No journeys **assigned**'" | Driver is assigned work |
| **Driver inventory** | **There is NO publish-a-journey screen at all** | Drivers cannot publish |

### The root cause
The ROUTE-TICKET model (DEC-114..121) silently converted the product from a **driver-publishes
marketplace** into an **operator-runs-scheduled-routes network** — because:
- a route has ONE flat fare set centrally (DEC-115),
- a route has a PUBLISHED TIMETABLE that is a promise to riders (DEC-119),
- riders pick a ROUTE, not a driver's personal trip (DEC-120).

A driver cannot invent a route with its own fare and timetable without breaking all three.
Nobody decided this. It happened as a side effect, and the P6 sweep did not catch it because the
contradiction is between chapters that were each internally consistent.

### Why the user's instinct is right to question it
If drivers must publish their own routes, times and seats, the product asks a driver to:
1. define a route (which must match an approved stop network),
2. set a departure time they will be held to,
3. predict demand before anyone has booked,
4. repeat this every single day.
That is real hassle, and it is the classic reason peer carpooling apps fail on the supply side:
**the driver does unpaid planning work before earning anything.**

## THE THREE POSSIBLE MODELS (must be chosen explicitly)

### Model A — Operator-scheduled (what the spec has drifted into)
Ops/Manager defines routes, fares and timetables. Drivers see available shifts/journeys and
**claim** or are **assigned** one. Riders book seats on a scheduled journey.
- Driver effort: near zero — accept a journey, drive it.
- Predictable for riders; timetables are real promises.
- Requires the operator to plan supply, and to have enough vehicles under some form of commitment.
- This is the Swvl/microbus model, and it is what DEC-115/119 already assume.

### Model B — Driver-published (the original session-1 idea)
A driver publishes: this route, this departure time, these seats. Riders book onto it.
- Maximum flexibility and zero central planning.
- **Conflicts with DEC-115** (who sets the fare?) and **DEC-119** (whose timetable?).
- Real driver hassle; supply becomes unpredictable for riders.

### Model C — Hybrid: operator defines ROUTES, drivers choose DEPARTURES
The operator owns the route network: stops, flat fare, and the service window
(e.g. "Smouha → University, 06:00-10:00, target every 15 min").
A driver **opens a departure** on an approved route with one tap — or accepts a suggested one when
the system detects demand or a gap in coverage.
- Fares and stops stay centrally controlled (DEC-115 intact).
- Timetable becomes "target frequency + the actual departures drivers opened" (DEC-119 adapts).
- Driver effort: one tap, no planning, no route invention.
- Riders still see concrete departures to book.

## IMPACT IF THE MODEL CHANGES
| Area | A | B | C |
|---|---|---|---|
| DEC-115 flat fare per route | intact | **breaks** | intact |
| DEC-119 timetable promise | intact | **breaks** | adapts to "target frequency" |
| CH02 "Driver may publish = Y" | must become N | correct as-is | becomes "open a departure" |
| CH01 SupplyPolicy PEER_CARPOOL | unused | central | still usable |
| Driver screens | add "claim a journey" | add full "publish" flow | add one-tap "open departure" |
| Matching (CH5) | assign riders to scheduled journeys | build journeys from driver posts | both |
| Supply risk | operator must guarantee vehicles | unpredictable | shared |

**Nothing should be rewritten until the user chooses.**
