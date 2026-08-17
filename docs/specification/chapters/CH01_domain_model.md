# CHAPTER 1 — Glossary & Domain Model

Status: DRAFT v2 — rider flow updated for the ROUTE-TICKET model (DEC-114..120)
Depends on: DEC-001..DEC-018
Answers: MCQ Q15 (one model vs three), MCQ Q16 (who creates a journey)

---

## 1.0 Why this chapter exists

Right now the word "trip" means at least four different things in our own conversation:
what the driver drives, what the rider books, the repeating weekly pattern, and the physical path
on the map. If those four stay merged, the database, the API and the algorithm all inherit the
confusion, and it becomes unfixable later. This chapter separates them permanently.

---

## 1.1 DECISION: ONE universal core model (answers Q15)

### The decision
All three modes — commuter carpool, managed shuttle, commercial pooled ride — are ONE internal
concept: **a vehicle travelling through an ordered sequence of stops, with seats that can be booked.**
They differ only by *policy flags*, never by structure.

### Evidence supporting it
1. GTFS-Flex (adopted into the official GTFS spec in March 2024) does exactly this at the industry
   standard level: it extends the SAME trip/stop_times structure with flexible features — zone-based
   pickup, pickup/drop-off time WINDOWS instead of fixed times, continuous (anywhere-along-route)
   pickup, route deviation, and booking rules — rather than inventing separate models for
   dial-a-ride vs fixed route vs deviated route.
   Sources: https://gtfs.org/getting-started/features/flexible-services/ ,
   https://www.gtfsx.com/learn/gtfs-flex/ , https://github.com/MobilityData/gtfs-flex
2. The distinctions the world actually needs are captured by GTFS-Flex as ATTRIBUTES:
   - fixed stop vs zone (locations.geojson polygons)
   - exact time vs pickup/drop-off window (start/end_pickup_drop_off_window)
   - continuous pickup along a corridor (continuous_pickup / continuous_drop_off)
   - advance-booking constraints (booking_rules.txt: prior_notice_duration_min/max,
     prior_notice_last_day, booking_type)
   - "route deviation": fixed route where the vehicle may briefly detour to serve a booking
   Every one of those maps onto something the user asked for.
3. Practical: one model = one algorithm, one payment path, one rating system, one history screen,
   one admin tool. For a 2-person core team (DEC-007) this is the difference between feasible and not.
4. Strategic: it also makes us GTFS-Flex-exportable later, which is how you talk to a city transport
   authority or get into Google Maps trip planning. Three bespoke models would not be.

### Honest cost of this decision
A universal model is slightly harder to understand on day one, and there is a real risk of
"one table with 60 nullable columns". Mitigation: policy is expressed through a small number of
explicit, named POLICY OBJECTS (see 1.4), never through scattered boolean flags.

---

## 1.2 The core nouns (the glossary)

Terms are given in English with the Arabic term to be used in the UI.

| Term | Arabic (UI) | Precise meaning | Not to be confused with |
|---|---|---|---|
| **User** | مستخدم | A human account. One account, many possible roles. | Role |
| **Role** | دور | A capability set a User holds: Rider, Driver, OrgManager, Admin, Support. A User may hold several. | User |
| **Organization** | جهة / مؤسسة | A university, company, factory, school or compound that sponsors/controls transport for its members. | Operator |
| **Operator** | مشغّل | A legal entity that owns/operates vehicles (a company fleet, a transport vendor, or the platform itself). | Organization |
| **Vehicle** | مركبة | A physical car/van/bus in the registry, with capacity and attributes. | Driver |
| **Driver Profile** | ملف السائق | The verified driving identity attached to a User, with licence and documents. | Vehicle |
| **Stop** | نقطة التقاء | A named, fixed, verified point where boarding/alighting happens. | Zone, Waypoint |
| **Zone** | منطقة | A polygon inside which flexible pickup/drop-off is permitted. | Stop |
| **Route Template** | مسار محدد | A reusable, named, ordered list of stops (e.g. "Smouha → Alexandria University"). Used by shuttles and repeat commutes. | Journey |
| **Journey** | رحلة المركبة | **THE CENTRAL OBJECT.** One specific vehicle, one specific driver, on one specific date/time, traversing an ordered sequence of Journey Stops, offering N seats. | Booking, Route Template |
| **Journey Stop** | محطة الرحلة | One entry in a Journey's ordered stop list: where, planned arrival window, who boards, who alights. | Stop |
| **Ride Request** | طلب رحلة | A rider's stated INTENT: "this ROUTE, boarding at this point, N seats" (DEC-120). No destination. Exists before a departure is chosen. | Booking |
| **Booking** | حجز | A confirmed allocation of seat(s) on a specific Journey for a specific rider, with an assigned BOARDING point. The drop-off is NOT declared (DEC-114); it is recorded when the rider alights. | Ride Request |
| **Recurring Plan** | خطة متكررة | A rule that generates Ride Requests (or Journeys) on a schedule: "every Sun–Thu, 07:30, home → campus". | Journey |
| **Leg** | جزء الرحلة | The portion of a Journey a Booking actually occupied, known only AFTER alighting (DEC-117). | Journey |
| **Fare** | أجرة | The money owed for a Booking. | Payout |
| **Payout** | مستحقات | The money owed to a driver/operator. | Fare |
| **Wallet** | محفظة | A stored balance belonging to a User, Organization or Operator. | Fare |
| **Trip** | — | **BANNED WORD.** Too ambiguous; never used in code, schema, API or docs. Use Journey, Booking or Ride Request. | — |

### The one-sentence mental model
> **A Ride Request (what a rider wants) is matched into a Booking (a seat) on a Journey (a vehicle
> going somewhere), which stops at Journey Stops (places), possibly generated by a Recurring Plan.**

---

## 1.3 How each of the three modes maps onto the ONE model (the proof it holds)

| Aspect | Mode 2: Commuter carpool | Mode 3: Managed shuttle | Mode 1: Commercial pooled |
|---|---|---|---|
| Who creates the Journey | **SUPERSEDED by DEC-132 (M3):** in all modes the OPERATOR defines the Route and publishes the slot grid; a DRIVER CLAIMS a slot. Drivers never create routes. | same | same |
| Route | Driver's own route, mostly fixed | Fixed Route Template | Emergent — built by the algorithm |
| Stops | Mostly fixed Stops along the way | Strictly the template's Stops | Dynamically chosen Stops / on-route points |
| Timing | Fixed departure time | Fixed timetable | Time windows |
| Seats | 2–4 | 12–50 | 2–4 |
| Who is paid | Driver receives cost-share | Operator receives contract or fare revenue | Driver receives fare minus commission |
| Booking horizon | Hours to weeks ahead | Days ahead / subscription | Now, or scheduled |
| Different STRUCTURE? | **No** | **No** | **No** |

Everything in the table above is a *value*, not a *shape*. That is the test of a correct model.

---

## 1.4 Policy objects (how we avoid "60 nullable columns")

Instead of scattering flags, a Journey carries four named policies:

1. **SupplyPolicy** — who supplies the vehicle and who gets paid.
   `OPERATOR_FLEET` | `PLATFORM_DISPATCH` | ~~`PEER_CARPOOL`~~ (retained in the model, **unused at
   launch** under DEC-132 — no peer publishes their own route)
2. **RoutePolicy** — how much the route may change after publication.
   `FIXED` (shuttle: never deviates) | `DEVIATION_ALLOWED` (may detour within limits) |
   `DYNAMIC` (algorithm rebuilds the sequence as bookings arrive)
3. **BoardingPolicy** — where people may get on/off. Directly implements DEC-004's three tiers.
   `STOPS_ONLY` (Tier 1) | `STOPS_PLUS_ONROUTE` (Tier 2)
   *(Tier 3 `STOPS_PLUS_DOOR` was DROPPED by DEC-067 — two ticket types only.)*
4. **BookingPolicy** — when and how seats may be booked (modelled on GTFS-Flex booking_rules):
   minimum notice, maximum notice, cancellation deadline, who is eligible
   (public / members of Organization X / invited only).

A Journey = vehicle + driver + time + stop sequence + seats + these four policies. That is the
entire core of the platform.

---

## 1.5 DECISION: who creates a Journey (answers Q16) — and how to keep it SIMPLE

### The user's concern, restated
The user wants riders to be able to join an existing journey OR create their own, with the app
suggesting the best existing option first — but is worried this becomes complicated, and demands a
"very very very easy to use" product.

### The resolution: separate INTENT from MECHANISM
This is the key design principle of the whole product:

> **The rider never chooses a mechanism. The rider states an intent. The system chooses the
> mechanism and shows a plain-language result.**

A rider ALWAYS does exactly one thing (**updated by DEC-114/DEC-120 — route ticket model**):
```
Pick a ROUTE  →  pick where to BOARD  →  pick a DEPARTURE      → [ Book ]
"Smouha → University"   "Green Square, 6 min walk"   "08:05, 15 EGP"
```
No destination is declared; the rider gets off anywhere along the route (DEC-114).
That is the entire rider mental model. Never a choice between "join a carpool" versus "book a
shuttle" versus "hail a pooled taxi" — those words never appear.

Behind that button the system, in order:
1. Looks for existing Journeys with a free seat that fit (best case: instant confirmation).
2. If several fit, ranks them and shows at most 3, described in human terms:
   "8:05 · 6 min walk · 25 min · 18 EGP" — not "Shuttle #4471, RoutePolicy=FIXED".
3. If none fit, it holds the Ride Request as **PENDING** and tries to build a new Journey from it,
   pooling it with other pending requests going the same way (this is the "create your own" the
   user described — but the rider never has to know they created anything).
4. If it still cannot fill a vehicle, it offers honest alternatives: a nearby time that does work,
   a slightly longer walk, or a higher-priced private option.
5. Other riders can later be matched INTO that newly created Journey — which is exactly the user's
   "the driver can pick him and others can join this journey also".

### Publishing a Journey is a DRIVER action, not a rider action
Only Drivers, Org Managers and Admins ever see a "publish a journey" screen. This removes the
complexity from the rider experience entirely while losing none of the capability the user wants.

### The simplicity rules (binding on every later chapter)
- **S1.** The rider's primary flow is: state intent → see up to 3 options → confirm. Nothing else.
- **S2.** Internal vocabulary (Journey, policy, mode, tier) NEVER appears in the rider UI.
- **S3.** Any complexity we cannot remove must be absorbed by the system, not shown to the user.
- **S4.** Every option shown must be describable in one line: time, walk, duration, price.
- **S5.** If the system cannot serve a request, it must say so plainly and offer a real alternative —
  never an empty screen, never a spinner that ends in nothing.

---

## 1.6 Relationship diagram (text)

```
Organization ──sponsors──> User ──holds──> Role(s)
                             │
                             ├── as Rider ──> RideRequest ──matched──> Booking ──on──> Journey
                             │                     ▲                                     │
                             │             RecurringPlan ─generates─┘                    │
                             │                                                           │
                             └── as Driver ──> DriverProfile ──assigned──> Journey <──uses── Vehicle
                                                                              │
                                                                    ordered list of
                                                                              ▼
                                                                        JourneyStop ──at──> Stop | Zone point
Operator ──owns──> Vehicle
RouteTemplate ──instantiated as──> Journey
```

---

## 1.7 Invariants (rules that must ALWAYS hold — these become database constraints and tests)

- INV-1  A Booking references exactly one Journey and one Rider.
- INV-2  The sum of seats of all ACTIVE Bookings on a Journey never exceeds the Vehicle's capacity.
- INV-3  A Journey's stop sequence is strictly ordered, and every Booking's pickup stop precedes
         its drop-off stop in that sequence.
- INV-4  A Vehicle can be on at most one ACTIVE Journey at any instant.
- INV-5  A Driver can be on at most one ACTIVE Journey at any instant.
- INV-6  Every Booking has a Fare; every Fare is either fully paid, fully waived, or owed.
- INV-7  A RideRequest is either PENDING, MATCHED (has a Booking), EXPIRED, or CANCELLED — never two.
- INV-8  A Journey with SupplyPolicy=PEER_CARPOOL cannot pay the driver more than the platform's
         cost-share ceiling (this is a LEGAL invariant, see Chapter 13).
- INV-9  Deleting a User never deletes financial or safety records; it anonymises them.
- INV-10 Every state change of a Journey or Booking is recorded in an append-only event log.

---

## 1.8 Open questions raised by this chapter (carried to later chapters)
- ~~Q1.1 transfers~~ — CLOSED by DEC-025/DEC-135: each leg is an independent Booking; no transfer entity.
  Recommendation: NOT in version 1 — it multiplies failure modes and confuses riders.
- ~~Q1.2 booking for others~~ — CLOSED by DEC-024 (self only) and DEC-083 (multi-seat under one name).
- ~~Q1.3 two Organizations~~ — MOOT: organizations were removed entirely (DEC-031).
- ~~Q1.4 parcels~~ — CLOSED by DEC-037: people only, never parcels.

---

## 1.9 CONFIRMED CLOSURES (user MCQ, 2026-07-29)

- **DEC-019 CONFIRMED** — ONE universal model. Section 1.1 stands as written.
- **DEC-021 CONFIRMED** — "Trip" is a banned word across code, schema, API and documentation.
- **DEC-020 SUPERSEDED by DEC-114/DEC-120.** The intent-vs-mechanism principle survives (the rider
  never picks carpool/shuttle/taxi), but the intent itself changed from "from → to → arrive by" to
  "route → boarding point → departure". **Journeys are not "published" by anyone: the operator publishes
  ROUTES and SLOTS; a driver CLAIMS a slot, which creates the Journey (DEC-132 / CH4a).**
- **Q1.1 transfers — CLOSED by DEC-025.** There is NO transfer feature and NO transfer entity.
  Multi-leg travel is simply two independent Bookings. If the second fails, only the second is
  refunded. The domain model is unchanged. Residual stranded-rider risk tracked as G-015 for CH12.
- **Q1.2 booking for others — CLOSED by DEC-024.** Strict self-booking only. No organization
  booking on behalf of members, no family profiles. Accepted consequence: school transport and
  parent-for-student use cases are OUT OF SCOPE. Invariant added:
  - INV-11 Every Booking's rider is the authenticated account holder; a Booking can never name a
    third party. Any "guest" concept is forbidden in v1.
- **Q1.3** — MOOT (DEC-031 removed organizations).
- **Q1.4** — CLOSED by DEC-037.
