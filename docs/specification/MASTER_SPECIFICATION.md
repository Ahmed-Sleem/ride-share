# SHARED-RIDE PLATFORM — MASTER SPECIFICATION

**Version:** 3.0 — COMPLETE
**Date:** 2026-08-01
**Status:** Build-ready. 169 decisions. **Zero undecided product questions.**
**Launch market:** Alexandria, Egypt → Cairo → market-agnostic expansion

---

## ARCHITECTURE REVISIONS (supersede inline text where they differ)

- **DEC-186 (2026-08-17) — PostgreSQL is the ONLY stateful dependency.** Redis is removed
  entirely. Realtime = PostgreSQL `LISTEN/NOTIFY`; queues = `SELECT … FOR UPDATE SKIP LOCKED`;
  sessions and read models = tables; the matching hot index = an in-process H3 index rebuilt from
  PostgreSQL. Where a chapter still mentions Redis as a runtime component, that text is superseded.
- **DEC-184 (2026-08-17) — PostGIS deferred to M2.** Launch runs Railway managed PostgreSQL
  (no PostGIS); geo returns at M2 via a PostGIS-capable host or numeric lat/lng + OSRM/geocoder.
---

## HOW TO READ THIS DOCUMENT

| If you are... | Read |
|---|---|
| Deciding strategy | Part I, then Chapters 4a and 17 |
| Building the backend | Chapters 1, 3, 4a, 5, 6, 8, 8a, 9 |
| Building the apps | Chapters 1, 2, 3, 10, 10a, 10b, 10c, 12 |
| Building dashboards | Chapters 7, 11, 6a, 10d |
| Designing the UI | Chapters 10, 10a, and the screen inventories |
| Running operations | Chapters 2, 4, 11, 12, and **18 (runbook)** |
| Tuning the system | Chapter 19 — every configurable value |
| Writing app copy | Chapter 20 — every message |
| Checking why something was decided | Part III (DEC-001..169) |
| Checking what remains | Part IV |
| Checking the evidence | Part V (R1..R18, all sourced) |

---

# PART I — EXECUTIVE SUMMARY

## What this is
A shared-ride platform for Alexandria. The operator defines **routes** — an ordered set of verified
stops with **one flat fare** — and publishes a **slot grid** (e.g. every 15 minutes, 06:00-10:00).
Drivers **claim a slot in two taps**. Riders pick a route, pick where to board, pick a departure,
and **get off anywhere along the route**. It is a microbus network with software discipline.

## The twelve decisions that define the product

| # | Decision | Why it matters |
|---|---|---|
| 1 | **One universal internal model** (Journey · Booking · RideRequest) | Follows GTFS-Flex, the global standard since March 2024. 1x build cost, not 3x. |
| 2 | **Riders book a ROUTE, not a destination** (DEC-114) | Board at a stop, get off anywhere. Exactly how a microbus works. |
| 3 | **Operator defines routes; drivers CLAIM a slot** (DEC-132) | Two taps. No route drawing, no pricing, no demand prediction. |
| 4 | **Meeting points, not door-to-door** (DEC-038) | Walk-to-corner sustains 25-40% discounts vs 15-22%. The economic engine. |
| 5 | **One flat price per route, locked at booking** (DEC-115, DEC-056) | 15 EGP for 2 stops or 12. No surge, ever (DEC-113). |
| 6 | **Boarding fixed, alighting free** (DEC-140) | Pickups need certainty; drop-offs do not. |
| 7 | **Server decides money, safety and matching** (DEC-009) | Clients can be modified and GPS spoofed. |
| 8 | **QR-primary boarding that works offline** (DEC-049, DEC-091) | Boarding must never depend on a network. |
| 9 | **Everything commercial is configuration** (DEC-070) | Prices, routes and promotions change with no deployment. |
| 10 | **No organisations in the product** (DEC-031) | Universities are a sales channel; everyone rides one open network. |
| 11 | **Subscriptions sold only on committed slots** (INV-33) | The rule that makes the guarantee honest instead of hopeful. |
| 12 | **One corridor working completely, then widen** (DEC-110) | Pooling needs density; thin coverage kills it. |

## What the research changed
- **Swvl** (Cairo-born, same idea) burned cash on B2C and reached profitability only on recurring
  contracts — so subscriptions became central.
- **Batching requests 20-80s** beats instant matching: wait ~609s → ~427s, detour ~190s → ~75s.
- **Fixed routes beat demand-responsive at dense peak demand**, and the gap is brutal
  ($72 vs $25 per passenger at AC Transit). This decided the supply model.
- **Self-hosted OSRM** replaces ~$510/day of routing cost with ~$20/month.
- **Uber, Lyft and Gojek scored 66.75 / 60.25 / 62.75** on the System Usability Scale — all at or
  below average. The bar to beat is low.
- **Egypt has among the world's worst OSM coverage** (<1/3 of streets in a 2017 study) — but dense
  cities and main roads are the best-mapped, and human-verified stops insulate the design.
- **A ~10% complaint rate** matches the industry's effective deactivation tolerance — validating the
  threshold chosen for driver review.

## Completeness
| | |
|---|---|
| Decisions | **169**, every one traceable to the user's own words |
| Chapters | 22 files / 20 logical chapters |
| Screens | **75** across 5 roles, each with 5 mandatory states |
| Configuration keys | **65+** with type, range, default, scope, risk tier and fallback behaviour |
| Messages | **~60** with tier, channel and frequency caps |
| Invariants | **34** that become database constraints and tests |
| Research passes | **18**, every claim sourced |
| **Open product decisions** | **0** |

## What is NOT in this document, stated plainly
No code exists and no tests are claimed. No visual design — a design system and element lists only;
layout is the designer's job (DEC-131). No legal analysis (owned by the user's legal team, DEC-030).
No hiring plan or timeline (owned by the user, DEC-111/112). Cost figures are a structure without
real quotes. The FleetPy simulation that must set launch parameters has not been run. The product
has no name yet (DEC-128, deliberately parked).

## The nine things that still need doing (none is a product decision)
1. Brand palette and icon set — designer
2. Arabic/English copy for ~60 messages — copywriter
3. Alexandria OSM survey before committing to self-hosted OSRM — engineering field task
4. Simulation to replace CH19's starting defaults with evidence-based values
5. Real infrastructure cost quotes
6. On-call rota staffing, handover procedure and escalation contact tree
7. Ops SLA targets and Manager alert thresholds — deferred to post-beta by DEC-161
8. Post-beta measurement: is the "approaching your area" message useful or noisy?
9. Product name

---

# PART II — THE SPECIFICATION


---

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


---

# CHAPTER 2 — Roles, Accounts, Identity & Permissions

Status: DRAFT v1 (each decision individually confirmed by MCQ; see DECISIONS_REGISTER)
Depends on: CH1
Implements: DEC-026..DEC-035

---

## 2.1 The four roles

There are exactly four roles. There is no Organization role (DEC-031: organizations are removed
from the product entirely; universities and companies are offline sales channels only).

| Role | Arabic (UI) | Exists to | Key limits |
|---|---|---|---|
| **Rider** | راكب | Book and take rides | Books only for themselves (INV-11 / DEC-024) |
| **Driver** | سائق | Carry riders and earn | Cannot drive until fully verified (DEC-035) |
| **Support Agent** | دعم | Resolve live problems and complaints | Explicitly bounded powers — see 2.4 |
| **Platform Admin** | مسؤول | Run the platform | Full power, fully audited |

### 2.1.1 One account, many roles (DEC-027)
A single User account may hold Rider and Driver simultaneously and switch inside the app.
Support Agent and Platform Admin are STAFF roles: they are granted by an existing Admin, are never
self-service, and (rule) a staff account must not also carry Rider/Driver on the same login in
production — staff use a separate personal account if they want to ride. Rationale: a support agent
must never be able to act on their own bookings.

---

## 2.2 Identity model (DEC-028)

- **Phone number is MANDATORY and is the identity of record.** Verified by SMS OTP at signup.
- **Passcode/password is OPTIONAL** and added after signup, so daily logins do not require an SMS
  (this saves real money at scale and works when SMS delivery is unreliable).
- **Email is OPTIONAL**, used for receipts, recovery and notifications — never as the primary identity.
- One phone number = one account. Changing a phone number is a sensitive, audited operation
  requiring re-verification of both the old and the new number.
- Number recycling (a real problem in Egypt): if a number is re-verified on a new device after a
  long dormancy, the account enters a re-verification state rather than silently handing over the
  old account's history and wallet. [Design detail to be finalised in CH12.]

### Login methods summary
| Method | Purpose | Required? |
|---|---|---|
| Phone + SMS OTP | Signup, identity of record, recovery, sensitive actions | MANDATORY |
| Phone + passcode | Fast everyday login | Optional, recommended |
| Email | Receipts, recovery, notifications | Optional |
| Biometric (device) | Unlocks the stored session locally | Optional, device-level only |

---

## 2.3 Vehicle supply: two doors, one registry (DEC-033, DEC-034)

```
DOOR 1: Self-service                DOOR 2: Admin entry
Driver signs up, uploads            Admin creates the Vehicle record
documents, adds their vehicle       directly (fleet deals, DEC-005 channel)
        \                                   /
         \                                 /
          v                               v
          ONE VEHICLE REGISTRY  ──> ONE APPROVAL STATE MACHINE
```

### 2.3.1 The Fleet Label (DEC-033 option C)
A Vehicle may optionally carry a `fleet_label` (free text + an internal fleet id created by an
admin). It exists SOLELY so admins can filter, review, suspend and report on a group of vehicles
that belong to the same real-world owner.

Explicitly, a fleet label is NOT:
- an account, - a login, - a billing entity, - a permission scope, - visible to riders,
- a rider-pool boundary.

This satisfies "a company with 20 vans" without reintroducing organizations.

### 2.3.2 Vehicle approval states
`DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED | REJECTED(reason) -> SUSPENDED -> RETIRED`
- Only an APPROVED vehicle, driven by an APPROVED driver, may appear on any Journey.
- Any document expiry automatically moves the vehicle to SUSPENDED (see 2.5).

---

## 2.4 Permissions matrix

Legend: Y = allowed, N = forbidden, A = allowed but audited, L = allowed within a configured limit.

| Capability | Rider | Driver | Support | Admin |
|---|---|---|---|---|
| Create a Ride Request | Y | Y (as a rider) | N | N |
| **Claim a departure (a published slot)** | N | Y | N | A |
| Create/edit a Route or its slot grid | N | **N** | N | A (Ops/Manager) |
| View own bookings/journeys | Y | Y | — | — |
| View ANY user's active journey | N | N | Y | Y |
| View a user's full ride history | N | N | L (recent only) | A |
| View full personal data (ID docs) | N | N | **N** | A |
| Contact rider/driver via masked channel | Y (own) | Y (own) | Y | Y |
| Cancel a live ride | Y (own) | Y (own) | Y | Y |
| Issue a refund | N | N | **L** (small, capped, per-incident) | A |
| Adjust a fare | N | N | **N** | A |
| Credit/debit a wallet | N | N | **N** | A |
| Approve/reject a vehicle | N | N | **N** | A |
| Approve/reject a driver | N | N | **N** | A |
| Suspend a user | N | N | **N** (may only escalate) | A |
| Delete/anonymise an account | N | N | **N** | A |
| Export data in bulk | N | N | **N** | A |
| Change pricing rules | N | N | N | A |
| Change matching parameters | N | N | N | A |
| View audit log | N | N | N | Y |
| Grant staff roles | N | N | N | A |

### 2.4.1 The Support Agent boundary (DEC-032) — why it is drawn here
The most common insider fraud in ride platforms is a support employee who can move money or read
identity documents. Support can therefore *fix a rider's day* (cancel, refund a small amount,
contact, escalate) but can never *change the ledger* or *see identity documents*. Anything beyond
the limit becomes an escalation ticket for an Admin.

### 2.4.2 Audit rule
Every action marked A or L writes an immutable audit record: who, when, what, before/after values,
target user, reason text (mandatory), and the ticket/incident reference. Audit records are
append-only and cannot be edited or deleted by anyone, including Admins.

---

## 2.5 Driver verification (DEC-035) — strict and human-reviewed

### Required before a driver may accept ANY ride
1. Verified mobile phone (OTP).
2. National ID — front and back images + the ID number.
3. Driving licence — images + expiry date.
4. Vehicle licence (رخصة المركبة) — images + expiry date + plate number.
5. A live selfie, matched by a human against the ID photo.
6. Vehicle photos: front, back, both sides, interior, and the plate.

### The state machine
```
REGISTERED -> DOCS_SUBMITTED -> UNDER_REVIEW -> APPROVED
                                    |-> NEEDS_FIX(reason) -> back to DOCS_SUBMITTED
                                    |-> REJECTED(reason)
APPROVED -> SUSPENDED (document expired / incident / admin action) -> APPROVED after re-review
APPROVED -> DEACTIVATED (driver chose to stop)
```

### Rules
- A human admin makes the final decision. Automation may PRE-CHECK (image quality, expiry parsing,
  duplicate ID detection) but never auto-approves.
- Every rejection/needs-fix must carry a reason shown to the driver in their language.
- **Expiry monitoring:** the system warns the driver 30/14/7/1 days before any document expires and
  automatically SUSPENDS the driver at expiry. A suspended driver keeps their account, history and
  earnings; they simply cannot accept rides.
- **Face-match on duty (proposed, to be decided in CH12):** periodic selfie check that the person
  driving is the approved driver. Not decided here.

---

## 2.6 Rider verification (lighter, by design)
- Phone OTP is mandatory (this is already a real-world identity in Egypt).
- Name and photo optional at signup, encouraged for trust.
- Payment method verification handled in CH6.
- Escalating verification is triggered by risk signals (many cancellations, disputes, chargebacks)
  rather than applied to everyone up front. [Detail in CH12.]

---

## 2.7 Open questions carried forward (NOT closed by the agent)
- ~~Q2.1 staff 2FA~~ — CLOSED by DEC-151: mandatory for all staff roles.
- Q2.2 Number-recycling recovery: DESIGN RULE — a long-dormant number re-verified on a new device enters a re-verification state; wallet balance and history are NOT transferred until an admin confirms. Detailed flow is an implementation task.
- ~~Q2.3 face-match~~ — CLOSED by DEC-157: not implemented; risk accepted and monitored (G-056).
- ~~Q2.4 support refund limit~~ — CLOSED by DEC-155: one ride fare per incident, max 3 per agent per day.
- ~~Q2.5~~ — CLOSED by DEC-039: driver-accountable, vehicle is a declared+approved attribute.
- ~~Q2.6 parcels~~ — CLOSED by DEC-037: people only.

---

## 2.8 CONFIRMED CLOSURES (user MCQ, 2026-07-29)
- **Q2.5 CLOSED by DEC-036** — owner-only: the vehicle licence holder's name must match the driver's
  national ID. New invariant:
  - INV-12 A Vehicle may only be driven by the User whose verified national ID matches the vehicle
    licence holder. (SUBJECT TO REVIEW — see G-019, this conflicts with fleet supply.)
- **Q2.6 CLOSED by DEC-037** — no parcels, ever, in this product. People only.

## 2.9 REVISION NOTE — vehicle ownership model (DEC-039, supersedes 2.8's INV-12)
Owner-only driving is REVOKED. The model is now Uber-like:
- The **Driver** is the accountable, verified entity.
- A **Vehicle** is declared by the driver, verified by an admin, and linked to that driver.
- The system does **not** assert or enforce legal ownership; document legality is handled outside
  the software (DEC-030).
- A driver may hold several approved vehicles and switch the ACTIVE one; every switch is audited,
  and every Journey permanently records which vehicle actually carried the riders.
- INV-12 is revoked; INV-12b applies (see DECISIONS_REGISTER Batch 11).


---

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


---

# CHAPTER 4 — Geography: Meeting Points, Zones & Service Areas

Status: DRAFT v2 — tier-pricing conflict and walking ceiling RESOLVED (DEC-063/064/067).
Depends on: CH1, CH2, CH3
Implements: DEC-004, DEC-038, DEC-040..044, DEC-057
Addresses gaps: G-022 (mapping tool), G-024 (dynamic walking), G-032 (manager-controlled areas)

---

## 4.0 Why geography is the foundation of the whole product

Everything the algorithm can do is limited by the quality of the places it can use. A pooling system
with bad stops is a bad product no matter how good the mathematics is. Research (R3) confirms the
approach: Via runs "corner to corner instead of door to door", assigning each rider a virtual stop
and drawing a walking line to it — that is precisely the user's Tier-1 concept, already proven in
production.

---

## 4.1 The geographic objects

| Object | What it is | Created by | Mandatory data | Optional data |
|---|---|---|---|---|
| **Stop** | A named physical point where boarding/alighting happens | Admin only (DEC-038) | name, map location | night-safe flag, accessible flag, photos (many), description, landmark, notes (DEC-043) |
| **Zone** | A polygon grouping an area (a district, a campus, an industrial area) | Admin | name, polygon | parent zone, display colour |
| **Corridor / Route Template** | A named ordered list of Stops that vehicles commonly run | Admin / Manager | name, ordered stops | direction pair, default schedule |
| **Service Area** | The set of zones/corridors where the service is ACTIVE and accepting bookings | **Manager** (DEC-057) | name, geometry or corridor list, active flag | schedule of activity, launch date |

### 4.1.1 The whole map is always visible (DEC-057)
Users always see the entire city map. Areas with no service simply have no journeys and no stops
shown, which makes coverage self-evident without an error message or an artificial boundary wall.
Rule: never block a user from looking; only from booking where there is no service.

### 4.1.2 Stop identity and lifecycle
`PROPOSED -> ACTIVE -> (SUSPENDED) -> RETIRED`
- Stops are never hard-deleted; historical Bookings must keep resolving to a real place.
- A retired stop stays readable forever but cannot be assigned to new journeys.
- Every stop carries a stable public code (e.g. `ALX-SMO-014`) usable by support and drivers.

---

## 4.2a The boarding/alighting asymmetry (DEC-140) — important
> **Boarding happens ONLY at fixed stops** (or a priced street pickup). It must be predictable so
> the driver knows where to stop and the manifest is accurate.
> **Alighting is FREE** — the rider may get off at any point along the route (DEC-114), signalled
> per DEC-117.
This asymmetry is deliberate: pickups need certainty, drop-offs do not.

## 4.2 The three pickup tiers (DEC-004) — and an unresolved conflict

The user's original tiering:
- **Tier 1 — Stop pickup**: rider walks to an assigned Stop. Base price. If nobody is assigned to a
  stop, the driver is told to SKIP it (DEC-041).
- **Tier 2 — On-route pickup**: the vehicle stops for a rider who is close to its existing path.
  Costs more than Tier 1.
- ~~**Tier 3 — Door-to-door**~~: **DROPPED entirely by DEC-067.** Retained here only as the
  reasoning record; it is not part of the product.

### RESOLVED — reconciliation with fixed-route pricing (DEC-063, DEC-067)
The conflict between DEC-004 (three priced tiers) and DEC-058 (one fixed route price) was resolved:
- **Tier 3 (full door-to-door) is DROPPED entirely** (DEC-067).
- **Two ticket types remain**: the STOP ticket at the fixed route price, and the STREET/ON-ROUTE
  PICKUP ticket priced by the three-layer formula in CH6a (DEC-063, DEC-066).
- Both numbers are shown to the rider before booking and locked at booking (DEC-056).

---

## 4.3 Walking rules (DEC-044) — "dynamic, closest suitable stop"

The user rejected a fixed radius and specified: for a stops-only journey, offer the rider the
CLOSEST suitable stop.

### 4.3.1 What "suitable" must mean (proposed definition, [MCQ PENDING] on the weights)
A stop is *suitable* for a rider if ALL of the following hold:
1. It is ACTIVE and inside an active Service Area.
2. It lies on the ROUTE the rider selected (DEC-120), or can be inserted into a Journey on that
   route without breaking its timetable (DEC-119).
3. The walking route to it is reachable (not across a motorway, not through a closed area).
4. It does not violate any rider-specific constraint (accessibility need, night-safety preference)
   where that data exists (DEC-043 optional flags).

**Resolved by DEC-134:** there is no weighted formula. Boarding points are listed **sorted by
walking time, with honest distances shown**, and one is marked as recommended. The rider chooses
(DEC-065). No walking ceiling exists (DEC-064); street pickup is always offered alongside.

### 4.3.2 Hard walking ceiling — RESOLVED (DEC-064)
There is **NO hard walking ceiling**. However far the nearest suitable stop is, it is shown, and the
STREET PICKUP option is **always offered alongside it** (DEC-064) — turning a coverage gap into a
priced alternative rather than a rejection.
Requirement this places on the UI: walking distance and time must be stated **honestly and
prominently** so the rider self-selects; a 25-minute walk must never be presented as if it were
convenient.

---

## 4.4 The Stop Mapping Tool (G-022) — a required internal product

DEC-040 commits a dedicated team to mapping Alexandria before launch. That makes the mapping tool a
first-class build item, not a convenience script.

### 4.4.1 Required capabilities
- **Field mode on a phone**: drop a pin at your current GPS position, name it, save; works offline
  and syncs later (mappers will be standing in the street with poor signal).
- **Desk mode on a laptop**: place, move, merge, split, rename, bulk-edit stops on a large map.
- **Duplicate detection**: warn when a new stop is within X metres of an existing one.
- **Coverage view**: heat/grid display of mapped vs unmapped areas, and progress per district.
- **Photo capture**: multiple photos per stop, compressed, geotagged.
- **Optional attributes**: night-safe, accessible, description — never blocking, always skippable
  (DEC-043).
- **Import/Export**: CSV/GeoJSON in and out; the ability to seed from OSM candidate points is
  allowed as INPUT ONLY, since every stop must still be admin-approved (DEC-038).
- **Review queue**: a second person can verify a mapper's stops before they go ACTIVE.
- **Audit**: who created/edited each stop and when.

### 4.4.2 Quality rules for mappers (to be written into the field handbook)
A stop must be a place where a vehicle can legally and safely halt briefly, where a person can stand
and be seen, and which can be described in a short phrase a stranger would understand.

---

## 4.5 Manager-controlled service expansion (DEC-057, G-032)

Opening a new area or route must be a DASHBOARD ACTION, with no code deployment.
- A Manager can create a Service Area, attach corridors/zones, set prices, and activate it.
- Activation is scheduled (e.g. "goes live Sunday 06:00") and reversible.
- Deactivation must handle in-flight bookings gracefully: existing bookings are honoured; new
  bookings stop.
- Every activation/deactivation is logged with who, when, and why.

### 4.5.1 What this requires technically (feeds CH8)
Service areas, prices, walking ceilings, wait times and matching parameters must all be
CONFIGURATION stored in the database and editable at runtime — never constants in the source code.
This is also what makes DEC-002 (scale to any city) real: a new city is a new configuration row set,
not a new deployment.

---

## 4.6 Multi-city structure (DEC-002)
- Every geographic object belongs to a **City**, and every City to a **Country** with its own
  currency, language default, timezone, and map/routing provider configuration.
- No code may assume Egypt, EGP, Arabic, or Africa/Cairo.
- Stop codes, route names and prices are all scoped per city.

---

## 4.7 Invariants added by this chapter
- INV-18 A Stop referenced by any historical Booking can never be deleted, only RETIRED.
- INV-19 A Journey Stop must reference an ACTIVE Stop at the time the Journey was published.
- INV-20 A Booking cannot be created for a location outside an ACTIVE Service Area.
- INV-21 Every geographic object belongs to exactly one City.
- INV-22 Service-area and pricing configuration changes are versioned and never overwrite history:
  a past Booking must always be explainable by the configuration that was live when it was made.

## 4.8 Open items carried from this chapter
- ~~Whether riders may choose a different stop~~ — RESOLVED by DEC-065 (rider may choose any stop; system recommends)
- ~~Drop-off symmetry~~ — RESOLVED by DEC-114/117: there is no declared drop-off; the rider alights
  at any stop on the route, signalled at the time (DEC-117).


---

# CHAPTER 4a — The Supply Model: Who Creates a Journey

Status: DECISION CHAPTER v1 — resolves G-054. Evidence: R14 (9 sources, 14 studies).
Depends on: CH1, CH4, CH5. Affects: DEC-020, DEC-115, DEC-119, CH02 permissions, CH10c driver screens.

---

## 4a.1 Why this chapter exists
The specification contradicted itself: DEC-020, CH01 and CH02 said the DRIVER publishes journeys,
while DEC-115 (flat fare per route), DEC-119 (published timetable), screen O-21 and screen D-11
assumed the OPERATOR schedules them. The route-ticket model (DEC-114..121) silently converted the
product without an explicit decision. This chapter makes the decision explicitly.

---

## 4a.2 The four variables (previous options confused these)

| Var | Question |
|---|---|
| **V1** | Who defines the route geometry — the stops and their order? |
| **V2** | Who decides that a departure exists at, say, 07:15? |
| **V3** | Who is committed to driving it, and when is that commitment made? |
| **V4** | What happens when a needed departure is claimed by nobody? |

Most "models" differ only in V1 and V2, but **V3 and V4 decide whether the product's promises are
real** — because subscriptions (DEC-051) and the timetable fairness rule (DEC-119) both depend on a
vehicle actually being there.

---

## 4a.3 FULL MODEL COMPARISON

| Dimension | **M1 Driver-published** | **M2 Operator-assigned** | **M3 Route-fixed, driver picks slot** ★ | **M4 Fully dynamic (no routes)** |
|---|---|---|---|---|
| V1 route geometry | Driver draws/defines it | Operator | **Operator (predefined, approved)** | None — emergent per request |
| V2 departure exists because | Driver posts a time | Operator schedules it | **Driver claims a published slot** | Demand triggers dispatch |
| V3 commitment | None, ad-hoc | Rota/assignment | **Claim, ideally ahead of time** | Driver is online, no commitment |
| V4 uncovered demand | Nothing happens | Operator assigns someone | **Gap is visible; incentives + suggestions** | Algorithm dispatches whoever is nearest |
| Driver effort per journey | **High** — define route, time, seats, predict demand | Very low — accept work | **Very low — two taps** | Low — stay online |
| Driver freedom | Highest | Lowest | **High (chooses when)** | High |
| Rider predictability | Low — offers appear and vanish | **Highest** | High — a clean slot grid | Low — no timetable exists |
| Fare model | Per-driver pricing (breaks DEC-115) | Central | **Central flat fare (DEC-115 intact)** | Dynamic per trip (breaks DEC-115) |
| Timetable promise (DEC-119) | Impossible | Strong | **Strong for claimed slots** | Impossible |
| Subscriptions (DEC-051/130) | Cannot be guaranteed | Fully backed | **Backed only on committed slots** | Cannot be guaranteed |
| Operator planning burden | None | **Very high** | Medium — define routes + slot grid | Medium — fleet balancing |
| Cost per passenger (R14.2) | Unproven | Low at density | **Low at density** | **High** ($72 vs $25 AC Transit; £9-20 vs £1.35-1.62 rural England) |
| Evidence at dense peak demand (R14.1/R14.4) | Weak | **Strong** | **Strong** | **Explicitly contra-indicated** |
| Matches Swvl's actual model (R14.7) | No | Yes | Yes | No |
| Matches what drivers actually want (R14.8) | No — they want shift choice, not planning | Partly | **Yes** | Partly |
| Legal/employment exposure | Lowest | **Highest** (looks like employment) | Low-medium | Low |
| Build complexity | Medium | Medium | **Medium** | **Highest** |
| Cold-start behaviour | Empty until drivers post | Works from day one | Works once a few drivers claim | Needs a fleet online to work at all |

### Verdict
**M3 is chosen.** It is the only model that satisfies simultaneously: the evidence for dense peak
corridors (R14.1, R14.4), zero route-drawing burden on drivers (the user's concern), central fare
control (DEC-115), a real timetable (DEC-119), and driver freedom over *when* to work (R14.8).

---

## 4a.4 M3 in detail: Route → Slot → Departure

Three separate objects, and keeping them separate is what makes the model work.

| Object | Owner | Stability | Contains |
|---|---|---|---|
| **Route** | Operator (Ops/Manager) | Changes rarely | Ordered stops, direction, flat fare (DEC-115), service window, target frequency |
| **Slot** | Operator, published | A repeating grid | A departure time on a route, e.g. every 15 min, 06:00-10:00 |
| **Departure** | **Driver claims a slot** | One real run | Route + slot + driver + vehicle + seats |

**The driver's entire action is: pick a route → pick a slot → confirm.** Two taps. No drawing,
no pricing, no demand prediction. This directly answers the user's concern that route-mapping in the
app "is very complex for him".

---

## 4a.5 The timing rules (the user flagged this: "timing needs to handle a lot of things")

| # | Rule | Decision |
|---|---|---|
| T1 | DST and wall-clock | Slots are LOCAL wall-clock time (DEC-118); 07:15 is always 07:15 |
| T2 | Free time vs slot grid | **SLOT GRID only.** Free times produce 07:03/07:07/07:11 — unusable for riders and impossible to timetable. Grid interval is configuration per route |
| T3 | Lead time | A slot may be claimed from `MaxClaimLeadDays` ahead until `MinClaimLeadMinutes` before it — both configuration |
| T4 | Booking lock | The departure stops accepting bookings at `LockBeforeDepartureMinutes` (CH3 LOCKED state) |
| T5 | **Slot collision** | A slot may be claimed by **one** driver by default. If demand justifies it, the system may open the slot for an **additional vehicle** — explicitly, never silently, so two drivers never accidentally compete for the same riders |
| T6 | Driver cancels after bookings exist | Penalty (CH3 §3.8, still open) + the slot immediately returns to the pool and is pushed to nearby drivers as urgent |
| T7 | Minimum viable departure | If seats sold < `MinViableSeats` by lock time, the departure may be cancelled with full rider credit — or run anyway if `AlwaysRunClaimedSlots` is on. Configuration, per route |
| T8 | Service window | Slots exist only inside the route's operating hours |
| T9 | Recurring claim | A driver can claim "every weekday 07:15" in one action, not twenty (mirrors rider subscriptions) |
| T10 | Multi-city | Slots are per-city local time; no code assumes a timezone (DEC-002) |

---

## 4a.6 V4 — making needed departures actually happen
Without this, coverage is emergent and the timetable becomes fiction. Four mechanisms, all
configuration-controlled:

1. **Visibility** — an uncovered slot with waiting demand is shown to drivers as an opportunity
   ("07:15 Smouha → University · 8 riders waiting · unclaimed").
2. **Suggestion** — the system pushes uncovered high-demand slots to suitable nearby drivers.
3. **Incentive** — a configurable bonus for claiming an uncovered high-demand slot
   (Manager-controlled, budget-capped like any promotion, INV-29).
4. **Commitment tier** — a subset of drivers may commit to recurring slots in advance
   (T9), and **only committed slots may be sold as subscriptions** (see 4a.7).

## 4a.7 The honesty rule that makes DEC-130 real
> **A subscription may only be sold for slots that have committed coverage.**

Otherwise the platform sells a guaranteed seat it cannot guarantee, and pays out compensation
(DEC-130) for its own planning failure. This single rule converts the guarantee from hopeful to
honest, and it is why the commitment tier exists.

## 4a.8 Where demand-responsiveness survives (R14.6 hybrid)
Fixed routes are the spine. Flexibility lives at the edges, exactly where the evidence supports it:
- **Street pickup** within a detour budget (DEC-063, CH6a)
- **Skipping stops** with nobody boarding or alighting (DEC-041, DEC-117)
- **Extra departures** opened when demand appears (T5)
- **Live re-optimisation** of the running order within the route (CH5 stages 2-3)
Research support: reallocating between fixed and demand-responsive cut waiting time up to 36% and
operating cost up to 24% versus pure fixed route (Calabrò et al. 2023, R14.6).

## 4a.9 Consequences for existing decisions
| Item | Effect |
|---|---|
| DEC-020 | Superseded — riders never publish; drivers CLAIM, they do not create |
| CH02 permission "Publish a Journey: Driver Y" | Becomes **"Claim a departure: Driver Y"**; creating routes is Ops/Manager only |
| DEC-115 flat fare | Intact — fares belong to the route |
| DEC-119 timetable | Intact and strengthened — the slot grid IS the timetable |
| CH01 SupplyPolicy | `OPERATOR_FLEET` and `PLATFORM_DISPATCH` remain; `PEER_CARPOOL` is retained in the model but unused at launch |
| CH10c driver screens | Add: browse routes, claim a slot, recurring claim, my claimed departures |
| CH09 data model | Add `route_slots` and `slot_claims`; `journeys` gains `slot_id` |

## 4a.10 Still open (not decided here)
- Driver penalty amounts for cancelling a claimed departure (T6) — CH3 §3.8 remains open
- `MinViableSeats` policy: cancel or run at a loss (T7)
- Whether committed drivers receive different commission (DEC-081 supports it as configuration)
- Whether a driver may claim two overlapping slots on different routes (agent view: no, INV-5)


---

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
- An in-process spatial index (H3-partitioned, rebuilt from PostgreSQL) is the hot geospatial
  index; PostgreSQL holds the authoritative data (A4.5, revised by DEC-184/DEC-186).
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
| In-process geo index stale | Fall back to a PostgreSQL query; slower but correct |
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


---

# CHAPTER 6 — Money: Wallet, Payments, Fares, Payouts & Ledger

Status: DRAFT v1. Implements DEC-054..058, DEC-062, DEC-066, DEC-077..081. Evidence: R6, R7, R8, R10.
Depends on: CH1, CH3, CH5, CH6a

---

## 6.1 The first rule: one ledger, and it is always right

Every movement of value is a double-entry record in a single append-only **ledger**. Nothing else
in the system is allowed to be the source of truth about money.

- Money is stored as **integer minor units** (piastres), never floating point (CH8a §8a.6).
- Every entry is immutable. Corrections are new compensating entries, never edits.
- Every entry references: what caused it (booking, payout, promotion, refund), who it affects, and
  the configuration version that produced the amount (INV-22).
- The sum of all entries for any account equals that account's balance, always, by construction.

### Account types in the ledger
| Account | Belongs to | Purpose |
|---|---|---|
| Rider Wallet | rider | prepaid balance, refunds, rewards |
| Driver Earnings | driver | accrued fares owed to the driver |
| Driver Cash Liability | driver | cash they collected that belongs to the platform |
| Platform Revenue | platform | commission earned |
| Promotion Budget | platform | funds allocated to campaigns (DEC-045) |
| Payment Provider Clearing | platform | money in transit at Paymob etc. |

---

## 6.2 Payment methods (DEC-079)

All methods sit behind ONE internal `PaymentProvider` interface so a method can be added or
disabled per city as configuration.

| Method | Direction | Mechanism | Notes |
|---|---|---|---|
| **App Wallet** | in | internal balance | PRIMARY. Fastest boarding, no provider fee at ride time |
| **Cash** | in | recorded against scanned booking (DEC-078) | creates a Driver Cash Liability |
| **Cards (Visa/Mastercard/Meeza)** | in | Paymob | 3DS required |
| **Mobile wallets** (Vodafone Cash, Orange Money, Etisalat Cash, Meeza) | in | Paymob | very high local adoption |
| **Kiosk / Fawry cash-in** | in | Paymob | how cash users fund a wallet |
| **InstaPay / IPN** | in | via PSP or partner bank — NOT a direct API (R10.2) | commercial terms [UNVERIFIED], to confirm with Paymob/bank |
| **Apple Pay** | in | Paymob / provider support | for iOS users |
| **Paymob Payouts** | out | Instant Cashin API | driver payouts |

### 6.2.1 The wallet is the preferred path, not the only path
Wallet top-ups can be made by every "in" method above. A rider may also pay for a single booking
directly by any method. Wallet is preferred because it makes boarding instant and avoids a provider
round-trip at the moment the vehicle is waiting.

---

## 6.3 How cash actually works (DEC-078) — the exact sequence

```
1. Rider books, choosing "pay cash".        → Booking CONFIRMED, fare locked (DEC-056)
2. Rider boards; driver scans QR.           → Booking ON_BOARD
3. Driver taps "cash collected".            → Ledger: Driver Cash Liability += fare
                                              Ledger: Fare recognised, commission split applied
4. At payout time.                           → Payout = Driver Earnings − Cash Liability − fees
```
- There is **no change-making problem**: fares are fixed and known before boarding (DEC-058).
- If the driver does NOT mark cash collected, the booking is flagged for support review; the rider
  is not chased automatically (avoids false accusations).
- A driver whose cash liability exceeds `MaxCashLiability` (configuration) is automatically blocked
  from accepting further cash bookings until they settle. This is the main fraud/credit control.
- Cash acceptance can be disabled per city, per corridor, or per driver, as configuration.

---

## 6.4 Fares (DEC-058, DEC-062, CH6a)
- **Fixed price per route** is the primary model ("Smouha → Alexandria University = 15 EGP").
- **Per-km rate is NOT a rider-facing price** (DEC-133). It is a manager tool that suggests a fare
  when a new route is created ("6.2 km → suggested 15 EGP"). Riders always pay the route flat fare.
- **Street-pickup ticket** is priced by the three-layer formula in CH6a.
- Precedence: `explicit exception > route flat fare`. There is no per-km fallback (DEC-133).
- The quoted price is **locked at booking** and never recalculated (DEC-056, INV-26).

---

## 6.5 Subscriptions (DEC-051)
- A subscription buys a set of recurring journeys over a period (weekly/monthly) with **guaranteed
  seats**.
- Charged up front; ledger recognises revenue per journey consumed, not all at purchase.
- Controls required: skip a day, pause a range, view next N rides.
- **Guarantee-failure remedy [MCQ PENDING, G-028]:** what the rider receives when a guaranteed seat
  cannot be provided. Options range from full credit for that day, to credit plus compensation, to
  a paid alternative ride at the platform's cost.
- **Unused days EXPIRE** at the end of the period (DEC-154). No rollover, no credit conversion.
  Because this is the least generous option, two things are mandatory: the terms must be stated
  plainly before purchase, and the skip/pause controls must be prominent so a rider can protect
  value in advance rather than lose it.

---

## 6.6 Cancellations & refunds (DEC-055)
- Informed consent is mandatory BEFORE purchase: the exact terms are shown and must be confirmed.
- Rider cancellation after purchase forfeits `CancellationForfeitPercent` (default 50%), rising to
  **100% once the departure LOCKS** (DEC-148) — after lock the seat cannot be resold.
- **No-show: charged 100%** (DEC-150) — the seat was consumed and could not be resold.
- **Driver releases a claimed departure after bookings exist (DEC-149):** the driver loses a fee
  equal to the platform's commission on the lost bookings; every affected rider receives 100% credit
  plus a compensation credit (symmetric with DEC-130). Releasing a slot with NO bookings is free —
  this deliberately encourages early release over a last-minute no-show.
- **All refunds are issued as WALLET CREDIT** (DEC-055), never to the original payment method.
- Driver-caused and system-caused cancellations: rider receives 100% credit plus compensation credit;
  the failure is recorded against the driver (DEC-149).
- Support Agents may refund up to **one ride fare per incident, maximum 3 per agent per day**
  (DEC-155). Beyond that it escalates to Ops — never silently fails.

---

## 6.7 Driver earnings and payouts (DEC-080, DEC-081)

### Earnings
`DriverEarning = Fare − PlatformCommission` where commission is resolved from configuration.

### Revenue model (DEC-081) — all three supported, commission is the default
| Model | How it works | Status |
|---|---|---|
| **Commission** | platform takes `CommissionPercent` of each fare | DEFAULT |
| **Driver subscription** | driver pays a periodic fee, keeps 100% of fares | supported, off by default |
| **Hybrid** | commission with a cap, or a reduced rate above a volume threshold | supported, off by default |
Switchable per city, per corridor, per driver segment, as configuration — no engineering required.

### Payouts
- **Weekly**, via Paymob Payouts / Instant Cashin (DEC-080).
- Subject to `MinPayoutThreshold` (R10.4 suggests EGP 1,000–5,000 territory; exact value config).
- Payout = Driver Earnings − Cash Liability − any fees − any adjustments.
- Every payout produces a statement the driver can inspect line by line, per ride.
- Failed payouts retry automatically and alert operations.

---

## 6.8 Promotions & rewards (DEC-045, DEC-060, DEC-061)
- **Flash sales**: time-boxed, targeted discounts on specific routes/corridors/stops/time windows,
  with a **budget cap** that stops the promotion automatically when exhausted.
- **Share reward** (DEC-060): credit when a rider shares a journey and another rider joins it.
- **Referral reward** (DEC-060): both parties credited when a new user completes a first ride.
- Every mechanism is switchable and configurable from the Manager dashboard (DEC-061).
- Every promotion draws from the **Promotion Budget** ledger account, so the true cost is always
  visible and never hidden inside fare revenue.
- Anti-abuse required: self-referral detection, device/phone fingerprinting, caps per user and per
  period, and manual review above a threshold [detail in CH12].

---

## 6.9 Financial controls and reconciliation
- Daily automated reconciliation: platform ledger vs Paymob settlement reports vs driver cash
  liabilities. Any discrepancy raises an operations alert; it is never auto-corrected.
- No human may edit a balance directly; only posting a compensating, attributed, reasoned entry.
- Every money-affecting configuration change is versioned and attributable (CH8a §8a.4).
- Separation of duties: Managers set prices; only Super Admin can move money manually; Support is
  capped (CH2 §2.4).

---

## 6.10 Invariants added
- INV-26 A Booking's fare is immutable after CONFIRMED; changes occur only as new ledger entries.
- INV-27 Every ledger entry has a matching counter-entry; the ledger always balances.
- INV-28 A driver's payout can never exceed their Driver Earnings balance minus liabilities.
- INV-29 A promotion can never spend beyond its allocated Promotion Budget.
- INV-30 Money values are integers in minor units; floating point is forbidden in money paths.

## 6.11 Open items


---

# CHAPTER 6a — The Pricing Formula (street-pickup surcharge)

Status: PROPOSAL v1 for user review. Implements DEC-063, DEC-066, DEC-062.
Evidence base: R7 (pooling discounts), R8 (Uber Express Pool ~2x stop-vs-door gap).

---

## 6a.1 What the rider sees (this must stay simple — DEC-058, S1-S5)

For any route, at most two numbers:
```
Smouha  →  Alexandria University
  ● Meet at a stop  (6 min walk)        15 EGP
  ● Pick me up from my street            27 EGP
```
That is all. Every mechanism below happens invisibly and must always resolve to one number,
quoted before booking and then locked (DEC-056).

---

## 6a.2 The combined formula (DEC-066)

The street-pickup price is built from three layers, exactly as the user requested:

```
StreetPrice = BasePrice
            + FlatUplift                              ← layer 1: predictability
            + BandCharge(detour)                      ← layer 2: fairness
            + max(0, CostRecovery(detour) − Covered)  ← layer 3: loss protection

then clamped:  StreetPrice = clamp(StreetPrice, MinPrice, MaxPrice)
```

### Layer 1 — Flat uplift (predictability)
`FlatUplift = BasePrice × UpliftMultiplier` (default suggestion 0.5, i.e. +50%)
Guarantees a visible, advertisable premium even for a tiny deviation, and captures the
"you are getting a personal service" value.

### Layer 2 — Detour band (fairness)
The system computes `DetourMinutes` = extra driving time the deviation adds to the journey,
compared with the journey without this pickup. **This is a COMPUTED value, not a configuration key**
(the configurable parts are the band thresholds and fees in CH19 §19.1.1).

| Band | Detour | Charge |
|---|---|---|
| A | 0 – `BandA_Max` min (default 2) | `BandA_Fee` (default 0) |
| B | up to `BandB_Max` (default 5) | `BandB_Fee` |
| C | up to `BandC_Max` (default 9) | `BandC_Fee` |
| — | beyond `BandC_Max` | **NOT OFFERED** — the pickup is refused, not priced |

The refusal band is the important one: some pickups must simply be unavailable, or one rider
destroys the journey for everyone else (R8.2).

### Layer 3 — Cost recovery (loss protection)
`CostRecovery = DetourKm × CostPerKm + DetourMinutes × CostPerMinute`
`Covered` = the amount already collected by layers 1 and 2.
Only the shortfall is added, so layers never double-charge. This is the safety net that ensures a
street pickup is never sold below its true operating cost.

### Clamps
- `MinPrice`: the street ticket can never be cheaper than the stop ticket + a minimum premium.
- `MaxPrice`: protects the rider from a shocking number, and protects the brand.

---

## 6a.3 The "harm to others" rule (from R8.2)

A deviation is only *offered* if it does not break promises already made:
1. The vehicle does not fall more than `MaxScheduleSlip` behind its published route timetable
   (DEC-119, CH5 F6). Individual arrival promises no longer exist — no destination is declared.
2. The journey's total detour budget (sum of all deviations) may not exceed `JourneyDetourBudget`.
3. Deviations are refused when the vehicle is above `HighOccupancyThreshold`, because the harm
   scales with the number of people on board.
This is a FEASIBILITY gate that runs before pricing. A pickup that harms others is not expensive —
it is unavailable.

---

## 6a.4 Every variable is manager-controlled (DEC-062, DEC-066)

| Variable | Meaning | Scope it can be set at |
|---|---|---|
| `UpliftMultiplier` | Layer-1 premium | global → city → corridor → route → time-of-day |
| `BandA/B/C_Max`, `BandA/B/C_Fee` | Layer-2 bands | global → city → corridor |
| `CostPerKm`, `CostPerMinute` | Layer-3 recovery rates | global → city → vehicle class |
| `MinPrice`, `MaxPrice` | Clamps | global → city → route |
| `MaxScheduleSlip` | Max lateness against the route timetable (DEC-119) | global → city → corridor → route |
| `JourneyDetourBudget` | Total deviation allowed per journey | global → city → corridor |
| `HighOccupancyThreshold` | When to stop allowing deviations | global → city → vehicle class |

**Scope resolution rule:** the most specific setting wins (route beats corridor beats city beats
global). Every value shows where it was inherited from in the dashboard, so a manager always knows
why a price is what it is.

### Required guardrails (DEC-062)
- Every change is versioned, attributed and logged; nothing is overwritten silently.
- Sanity limits prevent a fare of 0 or an absurd maximum.
- **Preview before publish:** the manager sees, on real recent journeys, what the change would have
  done to prices and to the refusal rate, before it goes live.
- Scheduled changes (start/end time) so flash sales expire automatically.
- One-click rollback to the previous version.

---

## 6a.5 Worked example (illustrative numbers only)

Route: Smouha → Alexandria University. `BasePrice` = 15 EGP.
Settings: `UpliftMultiplier` 0.5, BandB_Fee 4 EGP, CostPerKm 3 EGP, CostPerMinute 0.5 EGP.

Rider requests street pickup adding 1.4 km and 4 minutes of detour:
- Layer 1: 15 × 0.5 = **7.5**
- Layer 2: 4 min → Band B → **4.0**
- Layer 3: cost = (1.4 × 3) + (4 × 0.5) = 4.2 + 2.0 = 6.2; covered = 11.5 → shortfall **0**
- Total = 15 + 7.5 + 4.0 = **26.5 EGP** → displayed as **27 EGP**

Same route, deviation of 11 minutes: exceeds `BandC_Max` → **street pickup not offered**; the rider
is shown stop options instead.

---

## 6a.6 Closures
- **Q6a.1 CLOSED by DEC-160** — always show the reason ("too far off our route today"); never a
  silently missing option.
- **Q6a.2 CLOSED by DEC-159** — no subscriber discount on street pickup; pricing stays simple.
- **Q6a.3 CLOSED by DEC-159** — a Manager MAY disable street pickup per route during defined peak
  windows (configuration `StreetPickupPeakDisabled`).
- Q6a.4 CLOSED by DEC-140 (see CH4 §4.2a).
- ~~Q6a.4 drop-off treatment~~ — CLOSED by DEC-140: boarding is fixed to stops, alighting is free anywhere on the route.


---

# CHAPTER 7 & 11 — Growth & Incentives / Dashboards

Status: DRAFT v1. Implements DEC-045, DEC-060, DEC-061, DEC-062, DEC-082, DEC-101..103.
Depends on: CH2 (roles), CH6 (money/ledger), CH9 (API)

===============================================================================
# PART A — CHAPTER 7: GROWTH & INCENTIVES
===============================================================================

## 7.0 The requirement
The user's original words: the app "must encourage people to do these more than the now thing" —
i.e. shift people from their current transport habit to shared rides.

## 7.1 The three mechanics (DEC-082, DEC-103 — built equally, measured honestly)

### 7.1.1 Referrals
- Both parties are credited **only after the invitee completes a first ride** (never at signup —
  that is the classic abuse vector, CH12 §12.3.3).
- Unique code + shareable link per user; attribution on first install or first booking.
- Reward amount, caps per user/period, and the entire mechanic are Manager-configurable (DEC-061).
- Anti-abuse: one reward per verified phone, device fingerprinting, linked-account detection.

### 7.1.2 Journey sharing (DEC-060)
- A rider can share a specific journey ("I'm going to campus at 07:30, join me").
- If another rider books a seat on that journey via the share, the sharer earns credit.
- This is the mechanic that directly fills empty seats — the platform's core economic need.
- Attribution: the shared link carries a journey id + sharer id; the reward fires on the joiner's
  booking becoming COMPLETED.

### 7.1.3 Commuter streaks
- Reward consistency: N consecutive commuting days → bonus wallet credit or a free ride.
- Streaks tolerate configured "protected" days (weekends, holidays, an allowed skip) so a single
  sick day does not destroy months of habit — the point is habit, not punishment.
- Feeds directly into subscription conversion (DEC-051) and the trial day (DEC-100).

## 7.2 Flash sales & campaigns (DEC-045)
- A flash sale = a time-boxed discount targeted at specific routes / corridors / stops / time
  windows / rider segments.
- **Hard budget cap** enforced in the ledger (INV-29): when the budget is exhausted, the promotion
  stops automatically. It cannot overspend.
- Automatic expiry at the scheduled end time; no promotion runs forever by accident.
- A campaign (notification send) can be attached to a promotion, subject to the per-user rate limits
  in CH10 §10.6.

## 7.3 Measurement (non-negotiable)
Every mechanic must report, per city and per period: cost, rides generated, new users acquired,
retention effect at 7/30 days, and cost per retained rider. A mechanic that cannot be measured is
switched off. This is what makes DEC-103 ("let the data decide") real rather than rhetorical.

## 7.4 Rules that protect the business
- No mechanic may pay out more than its allocated budget (INV-29).
- Rewards are wallet credit, not cash — they return value to the platform (consistent with DEC-055).
- Every reward is a ledger entry against the Promotion Budget account, so true cost is always visible.
- Any single user's total lifetime rewards are capped, configurable.

===============================================================================
# PART B — CHAPTER 11: DASHBOARDS
===============================================================================

## 11.0 Two distinct dashboards
Per DEC-045/DEC-046, commercial and operational power are separated. They are therefore two
different products with different home screens, not one dashboard with tabs.

---

## 11.1 MANAGER dashboard (commercial)

### 11.1.1 Home: live map + active alerts (DEC-101, DEC-045)
The main screen is a **live city map with an occupancy overlay** — vehicles running, seats free,
demand density by zone — with an **alert rail** beside it.

### 11.1.2 Alerts (the core innovation)
Each alert is a sentence plus an action:
```
⚠ Zone 4 (Smouha)   occupancy 32%   12 empty seats now
   [ Launch flash sale ]  [ Notify riders ]  [ Dismiss ]

⚠ Corridor: Sidi Gaber → University   8 unserved requests in 20 min
   [ Open route ]  [ Alert drivers ]  [ Dismiss ]
```
- Thresholds are configuration (DEC-070), tunable per city and per time window.
- Alerts are actionable in one click; dismissal is recorded.
- Alerts can also be delivered by email/push so a manager is not required to watch the screen.
- **Deliberately NOT automatic:** a human confirms every money-spending action. Automatic rules were
  considered and rejected for now (DEC-101) because a buggy rule spends real money.

### 11.1.3 Pricing control (DEC-062, CH6a)
- Edit **route flat fares** (DEC-115), the **per-km SUGGESTION rate** used only to propose a fare when
  creating a new route (DEC-133 — riders are never charged per km), and every variable of the
  street-pickup formula.
- Scope inheritance shown explicitly (global → country → city → corridor → route → time window),
  with an indicator of where each value came from.
- **Preview before publish**: the effect of the change on real recent journeys, including how many
  street pickups would have been refused.
- Versioned, attributed, reason required, scheduled activation, one-click rollback.
- Sanity limits prevent zero or absurd fares.

### 11.1.4 Promotions & campaigns
Create/stop flash sales, referral and streak parameters, budgets and audiences; live spend against
budget; per-mechanic performance (7.3).

### 11.1.5 Analytics
Rides, revenue, commission, occupancy, fill rate, unserved requests, cancellation rate, street-pickup
share, subscription growth, reward cost — all by city, corridor, route and time.

### 11.1.6 Service expansion (DEC-057, G-032)
Create and activate service areas and routes from the dashboard, with scheduled go-live and
graceful deactivation that honours in-flight bookings.

---

## 11.2 OPERATIONS ADMIN dashboard

### 11.2.1 Home: the work queue (DEC-102)
```
Pending driver approvals        14   ← oldest 2 days
Pending vehicle approvals        9
Open incidents                   3   ← 1 HIGH severity
Disputes awaiting decision       5
Expiring documents (7 days)     22
Stops awaiting verification     41
```
Priority order, oldest-first within severity, with SLA age visible. Clearing queues is the job.

### 11.2.2 Approval workspace
Driver/vehicle documents side by side with the submitted data; approve / needs-fix / reject with a
mandatory reason shown to the applicant in their language. Identity documents are visible **only**
to Ops Admin and Super Admin (CH2 §2.4).

### 11.2.3 Incident workspace (CH12 §12.2)
Full evidence in one place: event log, GPS trace, manifest, masked-call log, prior history of both
parties. Decision options with mandatory reason; automatic precautionary suspension for severe
categories.

### 11.2.4 Live operations map
Every active journey, delayed vehicles, stranded riders, aborted journeys — for intervening in real
time, not for browsing.

### 11.2.5 The Stop Mapping Tool (G-022, DEC-040)
Specified in CH4 §4.4; it lives inside this dashboard, plus a phone-friendly field mode.

---

## 11.3 SUPPORT workspace (bounded, CH2 §2.4)
Deliberately minimal: look up a rider by phone or booking, see the active journey only, contact via
masked channel, cancel, refund up to the configured limit, escalate. **Identity documents are never
visible.** Every action is audited with a mandatory reason.

## 11.4 Cross-cutting dashboard rules
- Desktop-first layouts (dense tables, keyboard shortcuts, bulk actions) — this is why the web app
  is Next.js and not React Native (DEC-085, R11.5).
- Every destructive or money-moving action requires a typed reason and is written to the audit log.
- Every list is exportable — and every export is audited (CH12 §12.7).
- Arabic/English with full RTL, same as the apps (DEC-017).

## 11.5 Open items
- ~~Alert threshold defaults~~ — DEFERRED to post-beta by DEC-161; fields exist, unset.
- ~~Manager analytics visibility~~ — CLOSED by DEC-162: pseudonymised; re-identification is Super-Admin-only and audited.
- ~~SLA targets per queue~~ — DEFERRED to post-beta by DEC-161; fields exist, unset.


---

# CHAPTER 8, 16 & 17 — System Architecture, Delivery Plan & Risk Register

Status: DRAFT v1. Implements DEC-009, DEC-069, DEC-070, DEC-085, DEC-086, DEC-088..091,
DEC-099, DEC-110. Excludes hiring and timelines per DEC-111 / DEC-112.

===============================================================================
# CHAPTER 8 — System Architecture (runtime shape)
===============================================================================
(Code organisation is CH8a; this chapter is how the running system is arranged.)

## 8.1 The processing rule (DEC-009)
> If it affects money, safety, or who rides with whom — the SERVER computes it.
> If it affects only what this one user sees right now — the DEVICE may compute it.

| Server-authoritative, always | Device-side, never authoritative |
|---|---|
| matching and assignment | map rendering, camera, QR display |
| pricing, quotes, fares, refunds | GPS smoothing and sampling decisions |
| stop assignment, route plans | "distance to my stop" display |
| seat allocation and holds | local notifications and alarms |
| every state transition | optimistic UI, offline outbox |
| permissions and identity | cached stops, cached ticket |

## 8.2 Runtime components
```
 MOBILE (Expo)                WEB (Next.js)
 rider + driver, role-adaptive   public site, rider booking, Manager & Ops dashboards
        \                              /
         \____ REST + WebSockets _____/
                      |
              API (NestJS modular monolith, CH8a)
       ┌──────────────┼───────────────────────────────┐
       |              |                               |
  PostgreSQL 16    In-process store            Queues (PostgreSQL
  (+ replica)      geo index, last-known        SKIP LOCKED), workers:
                   state, live updates          matching tick loop,
                                                overnight optimiser (OR-Tools),
       |                                        notifications, payouts, reconciliation
  Object storage (documents, stop photos)  ·  Cold storage (aged movement data)
  OSRM (self-hosted routing + matrices)    ·  Payment providers (Paymob et al.)
```

## 8.3 The matching loop is not an HTTP request
The matching engine runs as a **queue-driven tick loop** with an adaptive batch window (DEC-072).
A booking request enters a queue; the loop matches a batch; results are pushed to clients over
WebSocket. Nothing about matching happens inside a request/response cycle.

## 8.4 Realtime design (DEC-089)
Live only where it matters: vehicle position, booking/journey state, driver manifest, ops map
(throttled), manager occupancy (near-live, 5-10s snapshots). Everything else is on-demand.

## 8.5 Configuration at runtime (DEC-070, G-032)
All business values are database configuration with scope inheritance
(global → country → city → corridor → route → vehicle class → time window), versioned and
hot-reloaded. **A price change, a new service area, or a new city is a configuration action, not a
deployment.** This is the mechanism that makes DEC-002 (scale to any city) real.

## 8.6 Multi-city (DEC-002, DEC-105)
Every entity is scoped to a City; every City carries its own currency, timezone, language default,
map/routing provider settings and fare configuration. No code may assume Egypt, EGP, Arabic,
Africa/Cairo, or a hosting region.

## 8.7 Failure behaviour (R9.8, CH5 §5.9)
The system degrades in quality, never into failure:
OSRM down → cached matrices → Haversine × calibration factor, ETAs marked approximate.
In-process index stale → PostgreSQL fallback, slower but correct.
Optimiser down → insertion heuristic only.
Analytics lagging → never on the hot path; matching unaffected.
Full degradation → fixed-route stop-to-stop journeys still operate.

## 8.8 The role-adaptive single app (DEC-014, G-011 — closed)
One mobile app. Role detected at login. Driver code is lazy-loaded and driver permissions
(background location, camera) are requested **only when driver mode is activated**, so a rider is
never asked for always-on location.

===============================================================================
# CHAPTER 16 — Delivery Plan
===============================================================================
Contains no hiring plan and no timeline estimates (DEC-111, DEC-112).

## 16.1 Principle (DEC-086, DEC-110)
**One corridor, working completely, before widening.** Vertical slices: every slice is
production-complete — no stubs, no fake screens, no "coming soon" (DEC-006, rules §8).

## 16.2 The phases (scope only, no dates)

### Phase 0 — Foundations
Monorepo, shared types, CI with the `verify` command, database and migrations, configuration
system with scope inheritance, audit log, event log, staging environment, infra-as-code, backups
with a tested restore.
*Exit:* an empty but production-grade skeleton where nothing is hand-configured.

### Phase 1 — Identity & the vehicle registry
Phone/OTP signup, passcode, roles and permissions, driver onboarding with document upload,
Ops approval queues, vehicle registry with fleet labels.
*Exit:* a real driver can be verified and approved by a real admin.

### Phase 2 — Geography & the mapping tool
Stops, zones, corridors, service areas; the Stop Mapping Tool (field + desk + review); OSRM
deployed with the Alexandria graph.
*Exit:* the launch corridor is fully mapped and verified.

### Phase 3 — The core ride (the corridor slice)
Journeys, ride requests, offers with seat holds, bookings, the matching pipeline stages 0-2 and 4,
fixed-route pricing, wallet and cash, QR boarding, the driver app with offline-first journey
execution, the rider app with the adaptive home and the waiting screen.
*Exit:* a real rider books, walks to a stop, boards by QR and pays — on one corridor.

### Phase 4 — Trust, safety & support
SOS with on-call routing, share-my-ride, masked calling, incident flow with precautionary
suspension, ratings, the Support workspace, fraud controls.
*Exit:* a rider in trouble reaches a human, and a dangerous driver can be removed.

### Phase 5 — Commercial control
Manager dashboard: live occupancy map, actionable alerts, pricing control with
preview-before-publish and rollback, promotions with ledger-enforced budgets, campaigns, analytics.
*Exit:* a manager can change a price and launch a flash sale with no engineering involvement.

### Phase 6 — Recurring & scale
Subscriptions with the trial day, recurring plans, the overnight OR-Tools planner, matching stage 3
(batch optimiser), street-pickup tier with the CH6a formula, driver payouts.
*Exit:* a commuter buys a monthly subscription and rides without thinking about it.

### Phase 7 — Validation & launch
FleetPy simulation to set every launch parameter, closed beta on one corridor with defined success
criteria, then public launch on that corridor. Widening is then a Manager dashboard action.

## 16.3 Work-package format (DEC-007, CH8a §8a.7)
Every task handed to any developer contains: goal in one sentence · the module it belongs to · the
interface to implement · the business rules with DEC-xxx references · acceptance criteria ·
required tests · explicit out-of-scope. **If a business rule is not written down, that is a
specification bug, not a developer error.**

## 16.4 Definition of Done
Merged · `verify` passes · tests genuinely exercise the behaviour · docs updated · audit entry
closed with evidence · implementation-log entry with commands and observed output.
Nothing is "done pending tests".

===============================================================================
# CHAPTER 17 — Risk Register
===============================================================================

| ID | Risk | Impact | Owner | Mitigation / status |
|----|------|--------|-------|---------------------|
| R-1 | Scope vs capacity: full product before launch | Schedule | **USER** | Hiring/timeline explicitly out of scope (DEC-111/112). Phased delivery (DEC-110) limits exposure. Recorded once, as agreed. |
| R-2 | Regulatory: open public ride service under Egypt's ride-hailing law (R1) | Existential | **LEGAL TEAM** | Handed off (DEC-030). System built so licensing, per-driver permits, vehicle age limits and trip-data export can all be satisfied technically. |
| R-3 | Indefinite retention of personal movement data (DEC-094) | Legal + breach | **LEGAL TEAM** | Flagged once (G-041). Technical mitigations specified in CH13 §13.2. |
| R-4 | Demand density: pooling fails below a threshold (R7.6) | Product viability | Product | One-corridor launch concentrates demand (DEC-110); simulation validates before launch (CH14 §14.3). |
| R-5 | Driver supply and churn; pure-efficiency matching has no fairness weighting (DEC-075) | Supply | Product | Fairness weight exists as configuration defaulting to 0; monitor earnings distribution (G-036). |
| R-6 | Strict cancellation policy harsher than local norm (DEC-055) | Adoption | Product | Informed consent before purchase; monitor cancellation and uninstall rates (G-031). |
| R-7 | Self-managed infrastructure: backups, patching, uptime are the team's responsibility | Availability | Team | CH15 §15.2 mandatory practices; replica + off-site backups + tested restores (DEC-107). |
| R-8 | Selling every physical seat harms comfort and ratings (DEC-047) | Retention | Product | Monitor complaints and ratings; per-vehicle sellable-seat override available (G-025). |
| R-9 | Ratings carry no consequence (DEC-096), so the incident flow is the only protection | Safety | Product | Incident flow strengthened with precautionary suspension and repeat-signal escalation (CH12 §12.2, G-044). |
| R-10 | Stranded rider when a second leg fails (DEC-025) | Safety/reputation | Product | Open: mitigation options listed in G-015, not yet chosen. |
| R-11 | Mapping quality gates launch (DEC-038/040) | Schedule | Ops | Mapping tool specified (CH4 §4.4); corridor-first reduces the volume needed. |
| R-12 | Payment provider dependency (Paymob for both collection and payout) | Financial ops | Product | Provider abstraction in CH6 §6.2 allows substitution; InstaPay terms unverified (R10.2). |


---

# CHAPTER 8a — Code Architecture & Maintainability

Status: DRAFT v1. Implements DEC-068, DEC-069, DEC-070, DEC-071, and DEC-012 (stack).
Purpose: make change cheap and safe, especially when the work is done by hired developers who did
not design the system.

---

## 8a.1 The governing principle

> Every part of the system should be understandable on its own, changeable without fear, and
> impossible to break from a distance.

Three mechanisms deliver that: **module boundaries** (8a.2), **configuration instead of constants**
(8a.4), and **automated gates** (8a.6).

---

## 8a.2 Modular monolith (DEC-069)

One deployable backend application, internally divided into modules. Each module owns its data, its
rules and its public interface.

### Module list
| Module | Owns | Must never be touched by others |
|---|---|---|
| `identity` | users, roles, phone/OTP, sessions, permissions | password/OTP internals |
| `drivers` | driver profiles, documents, verification state machine | document storage |
| `vehicles` | vehicle registry, approval, fleet labels | approval state |
| `geo` | stops, zones, corridors, service areas, walking calculations | stop lifecycle |
| `journeys` | journeys, journey stops, publication, journey state machine | state transitions |
| `requests` | ride requests, offers, seat holds | offer expiry |
| `bookings` | bookings, boarding (QR), no-shows, booking state machine | state transitions |
| `matching` | the algorithm, batching, feasibility, assignment | internal solver |
| `pricing` | fare calculation, surcharge formula, quotes | formula internals |
| `payments` | wallet, ledger, refunds, payouts, providers | the ledger, absolutely |
| `promotions` | flash sales, rewards, referrals, campaigns | budget accounting |
| `notifications` | push/SMS/in-app delivery, templates, preferences | provider adapters |
| `analytics` | live occupancy, dashboards, reporting | read models |
| `support` | tickets, incidents, escalation | — |
| `audit` | append-only audit log | append-only, no deletes |
| `config` | versioned business configuration, scope resolution | version history |

### Boundary rules (enforced automatically, not by good intentions)
1. A module may only be used through its **public interface**; direct imports of another module's
   internals fail the build (enforced by lint rules / dependency-cruiser).
2. Modules communicate by **calling interfaces** or **publishing domain events** — never by reading
   each other's database tables.
3. Each module owns its tables. No cross-module foreign keys except to stable identity keys.
4. **No cycles.** If two modules need each other, a third concept is missing; find it.
5. Any module can be extracted into its own service later without changing its callers.

### Layering inside each module
```
module/
  api/         HTTP + WebSocket handlers — thin, no business logic
  application/ use cases, orchestration, transactions
  domain/      entities, value objects, business rules, state machines  ← the valuable part
  infra/       database, external providers, queues
  contracts/   the module's public interface + published events
  tests/       unit + integration tests for this module
```
Rule: `domain/` must have **no imports** from `infra/`. Business rules never know about databases,
HTTP or providers. This is what makes them testable and durable.

---

## 8a.3 The shared-types rule (why TypeScript everywhere pays off)
A single shared package defines every entity, request, response and event. The mobile app, the web
app, the admin dashboard and the backend all import the SAME definitions. A change to `Booking`
breaks the build everywhere it matters, immediately, at compile time — instead of at 7am in
Alexandria with real riders waiting.

---

## 8a.4 Configuration, not constants (DEC-070)

### The absolute rule
> If a business person could ever reasonably want to change it, it is CONFIGURATION, not code.

Configuration is stored in the database, versioned, scoped, and editable from the dashboard.

### Scope resolution
`global → country → city → corridor → route → vehicle class → time window`
Most specific wins. The dashboard always shows which level a value was inherited from.

### What must be configuration (non-exhaustive)
prices and base fares; the entire surcharge formula's variables; detour bands and budgets;
promise tolerance; wait time at a stop; walking preferences and weights; batch window length;
seat-hold duration; cancellation percentages and cutoffs; reward amounts and switches; referral
values; notification templates and timings; service-area activation; feature switches per city.

### What must NOT be configuration
security rules, permission definitions, state-machine legality, invariants, audit behaviour.
Those are code, reviewed and tested — a business user must never be able to switch off a safety rule.

### Configuration safety requirements
- Every change versioned, attributed, timestamped, with a mandatory reason.
- Validation on write (ranges, types, sanity limits — no accidental zero fare).
- **Preview before publish** against real recent journeys.
- Scheduled activation and automatic expiry.
- One-click rollback.
- **Historical correctness:** a past booking must always be explainable by the configuration that
  was live when it was made (INV-22). Configuration is never destructively overwritten.

---

## 8a.5 Event log as the backbone
Every meaningful action publishes an immutable domain event (INV-10). Events drive: analytics and
live dashboards, notifications, the audit trail, dispute resolution, and algorithm improvement
(DEC-050 "collect all the data"). Modules subscribe to events instead of calling each other, which
is what keeps the boundaries clean.

---

## 8a.6 Quality gates (DEC-071)

### One command verifies everything
`npm run verify` must run: type checking, lint (including module-boundary rules), unit tests,
integration tests, contract tests for the public interfaces, a build of every app, a secret scan,
and database migration checks. Required by the project rules §6.2. Nothing merges unless it passes.

### Testing requirements by area
| Area | Requirement |
|---|---|
| `domain/` business rules | Unit tests mandatory; pure functions, no mocks needed |
| Money (`payments`, `pricing`) | Highest bar: property-based tests, exact-value assertions, no floats for currency |
| State machines | Every legal transition tested; every illegal transition proven to be rejected |
| `matching` | Deterministic scenario tests + simulation runs (FleetPy) |
| API | Contract tests so the apps cannot silently break |
| UI | Build + type checks; critical flows covered end-to-end |

### Non-negotiables for hired developers (the contributor handbook)
- No business logic in HTTP handlers.
- No direct cross-module imports.
- No hard-coded business values.
- No money in floating point — integer minor units only.
- No swallowed errors; no `any`; no `console.log` in production paths.
- Every pull request: what changed, why, tests added, how it was verified.
- Every new module ships with its own README explaining why it exists.

---

## 8a.7 How work is handed to hired developers (DEC-007, DEC-013)
Each task is issued as a **work package** containing: the goal in one sentence, the module it lives
in, the interface it must implement, the business rules (with links to the decision IDs in the
register), acceptance criteria, required tests, and explicit out-of-scope notes. A developer should
never need to guess a business rule — if it is not written, that is a specification bug, not a
developer error.

---

## 8a.8 Open items
- ~~Q8a.1 Monorepo?~~ — CLOSED by DEC-085: monorepo with separate UI apps.
- ~~Q8a.2 first extraction~~ — CLOSED by DEC-167: `matching`, documented as intent only.
- ~~Q8a.3 config UI~~ — CLOSED by DEC-166: guided forms enforcing CH19 type/unit/range.


---

# CHAPTER 9 — Data Model & API Contract

Status: DRAFT v2 — updated for the ROUTE-TICKET model (DEC-114..120). Implements DEC-088..091 and every entity decision from CH1-CH6.
Depends on: CH1 (domain), CH2 (roles), CH3 (states), CH4 (geo), CH5 (algorithm), CH6 (money)
This is the chapter a developer builds directly from.

---

## 9.1 Conventions (binding on all tables)
- Primary keys: UUID v7 (time-ordered, index-friendly).
- All timestamps: `timestamptz`, stored UTC, rendered in the city's timezone.
- Money: `bigint` minor units (piastres) + a `currency` char(3). **Never floating point** (INV-30).
- Soft-delete is FORBIDDEN except where explicitly stated; use lifecycle states instead.
- Every table has `created_at`, `updated_at`; mutable business tables also carry `version` for
  optimistic locking.
- Every table belongs to a module (CH8a §8a.2); cross-module foreign keys only to stable IDs.
- Spatial columns: `geography(Point,4326)` for points, `geography(Polygon,4326)` for zones, with
  GIST indexes.

---

## 9.2 Core tables

### identity module
```
users(id, phone_e164 UNIQUE, phone_verified_at, passcode_hash NULL, email NULL,
      email_verified_at NULL, display_name, photo_url NULL, preferred_language,
      status[ACTIVE|SUSPENDED|ANONYMISED], created_at, updated_at)
user_roles(user_id, role[RIDER|DRIVER|SUPPORT|OPS_ADMIN|MANAGER|SUPER_ADMIN],
           granted_by, granted_at, revoked_at NULL)     -- PK(user_id, role)
sessions(id, user_id, device_id, platform, refresh_token_hash, expires_at, revoked_at NULL)
otp_challenges(id, phone_e164, code_hash, purpose, attempts, expires_at, consumed_at NULL)
```
Indexes: `users(phone_e164)`, `user_roles(user_id) WHERE revoked_at IS NULL`.

### drivers module
```
driver_profiles(id, user_id UNIQUE, status[REGISTERED|DOCS_SUBMITTED|UNDER_REVIEW|APPROVED|
                NEEDS_FIX|REJECTED|SUSPENDED|DEACTIVATED], approved_at NULL, approved_by NULL,
                rejection_reason NULL, rating_avg, rating_count)
driver_documents(id, driver_id, type[NATIONAL_ID|DRIVING_LICENCE|VEHICLE_LICENCE|SELFIE],
                 file_refs jsonb, number NULL, expires_at NULL,
                 status[PENDING|APPROVED|REJECTED], reviewed_by NULL, reviewed_at NULL)
driver_duty(driver_id PK, state[OFFLINE|ONLINE_IDLE|ASSIGNED|DRIVING|BREAK],
            active_vehicle_id NULL, last_seen_at, last_position geography(Point,4326))
```
Rule: a nightly job SUSPENDS any driver whose document `expires_at` has passed (CH2 §2.5).

### vehicles module
```
vehicles(id, city_id, plate UNIQUE_per_city, make, model, colour, year,
         seat_capacity, status[DRAFT|SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED|SUSPENDED|RETIRED],
         fleet_label NULL, fleet_id NULL, created_by, approved_by NULL, approved_at NULL)
driver_vehicles(driver_id, vehicle_id, is_active, linked_at, unlinked_at NULL)  -- PK(driver_id,vehicle_id)
vehicle_documents(...)  -- same shape as driver_documents
```
Note (DEC-039): no ownership relationship is asserted; a driver may hold several approved vehicles.

### geo module
```
cities(id, country_code, name, timezone, currency, default_language, map_provider_config jsonb,
       status[ACTIVE|INACTIVE])
stops(id, city_id, public_code UNIQUE, name_ar, name_en, location geography(Point,4326),
      status[PROPOSED|ACTIVE|SUSPENDED|RETIRED],
      night_safe bool NULL, accessible bool NULL, description NULL,
      created_by, verified_by NULL, verified_at NULL)          -- DEC-043: only name+location required
stop_photos(id, stop_id, file_ref, taken_at, taken_by)
zones(id, city_id, name, boundary geography(Polygon,4326), parent_zone_id NULL)
route_templates(id, city_id, name_ar, name_en, direction_label, active bool,
                flat_fare_minor,                     -- DEC-115: ONE price for the whole route
                service_window_start, service_window_end,   -- DEC-132: operating hours
                slot_interval_minutes,               -- DEC-132: the published grid
                target_frequency_minutes,            -- DEC-119 timetable target
                published_timetable jsonb)
route_slots(id, route_template_id, local_time, days_of_week int[],  -- DEC-132 the SLOT GRID
            active bool, max_vehicles int DEFAULT 1,   -- CH4a T5 collision control
            incentive_minor DEFAULT 0)                 -- CH4a §4a.6 uncovered-slot bonus
slot_claims(id, slot_id, service_date, driver_id, vehicle_id,
            claim_type[ONE_OFF|RECURRING], committed bool,  -- CH4a §4a.7 subscription backing
            claimed_at, released_at NULL, journey_id NULL,
            UNIQUE(slot_id, service_date, driver_id))
route_template_stops(route_template_id, sequence, stop_id)     -- PK(route_template_id, sequence)
service_areas(id, city_id, name, geometry geography(Polygon,4326) NULL,
              corridor_ids uuid[] NULL, active bool, activates_at NULL, deactivates_at NULL,
              changed_by, changed_at)
```
Indexes: GIST on all geography columns; `stops(city_id, status)`.

### journeys module
```
journeys(id, city_id, driver_id, vehicle_id, route_template_id, slot_id, slot_claim_id,
         timetable jsonb,                     -- DEC-119: published schedule this journey must keep
         schedule_slip_seconds int DEFAULT 0, -- live measure against the timetable
         supply_policy[PEER_CARPOOL|OPERATOR_FLEET|PLATFORM_DISPATCH],
         route_policy[FIXED|DEVIATION_ALLOWED|DYNAMIC],
         boarding_policy[STOPS_ONLY|STOPS_PLUS_ONROUTE],
         state[DRAFT|PUBLISHED|OPEN_FOR_BOOKING|LOCKED|IN_PROGRESS|COMPLETED|CANCELLED|ABORTED],
         seats_total, seats_taken, departs_at, locks_at, started_at NULL, completed_at NULL,
         config_version_id)                     -- INV-22: which config priced this journey
journey_stops(id, journey_id, sequence, stop_id NULL, adhoc_location geography(Point,4326) NULL,
              planned_arrival_at, actual_arrival_at NULL, skipped bool DEFAULT false)
journey_events(id, journey_id, type, payload jsonb, occurred_at, actor_id NULL)  -- append-only
```
Constraint: `seats_taken <= vehicles.seat_capacity` (INV-2), enforced in a transaction with a row lock.

### requests & bookings modules
```
ride_requests(id, rider_id, city_id, route_template_id, boarding_stop_id NULL,
              boarding_location geography(Point,4326) NULL,   -- for STREET tickets
              depart_after NULL, seats, ticket_type[STOP|STREET],
              state[CREATED|SEARCHING|OFFERED|CONFIRMED|OFFER_EXPIRED|NO_SUPPLY|EXPIRED|CANCELLED],
              created_at, expires_at)
offers(id, request_id, journey_id, pickup_stop_id NULL,
       quoted_fare_minor, walk_seconds, wait_seconds,
       held_until, state[OFFERED|ACCEPTED|EXPIRED|WITHDRAWN])
bookings(id, request_id NULL, journey_id, rider_id, seats, route_template_id,
         pickup_journey_stop_id,
         dropoff_journey_stop_id NULL,        -- DEC-114: NO destination is declared at booking
         alight_signalled_at NULL,            -- DEC-117: when the rider signalled
         alight_signalled_by[RIDER|DRIVER] NULL,
         actual_alight_stop_id NULL,          -- filled when they actually get off
         ticket_type[STOP|STREET], fare_minor, currency, config_version_id,
         payment_method[WALLET|CASH|CARD|MOBILE_WALLET|INSTAPAY|APPLE_PAY],
         state[RESERVED|CONFIRMED|EN_ROUTE|WAITING|ON_BOARD|COMPLETED|NO_SHOW|
               CANCELLED_RIDER|CANCELLED_DRIVER|CANCELLED_SYSTEM],
         cash_collected_at NULL, boarded_at NULL, completed_at NULL)
booking_qr(booking_id, seat_index, code_secret, rotates_every_seconds, issued_at)  -- DEC-083 multi-seat
booking_events(id, booking_id, type, payload jsonb, occurred_at, actor_id)  -- append-only
```
DEC-083: one booking with `seats = 3` issues 3 QR codes, all owned by the same rider.

### payments module
```
wallets(id, owner_type[USER|PLATFORM], owner_id, currency, balance_minor)  -- balance is a cached projection
ledger_entries(id, account_type, account_id, direction[DEBIT|CREDIT], amount_minor, currency,
               cause_type[BOOKING|REFUND|PAYOUT|PROMOTION|TOPUP|CASH_COLLECTION|ADJUSTMENT],
               cause_id, counter_entry_id, config_version_id, created_at, created_by)  -- APPEND-ONLY
payment_intents(id, user_id, provider, provider_ref, amount_minor, status, raw jsonb)
payouts(id, driver_id, period_start, period_end, gross_minor, cash_liability_minor,
        fees_minor, net_minor, provider_ref, status, executed_at NULL)
subscriptions(id, rider_id, route_template_id, period[WEEKLY|MONTHLY], days_of_week int[],
              depart_time, seats, price_minor, starts_on, ends_on, status, paused_ranges jsonb)
```
INV-27: every ledger entry has a counter-entry; the ledger always balances.

### config, promotions, audit
```
config_values(id, key, scope_type[GLOBAL|COUNTRY|CITY|CORRIDOR|ROUTE|VEHICLE_CLASS|TIME_WINDOW],
              scope_id NULL, value jsonb, version int, effective_from, effective_to NULL,
              changed_by, reason, created_at)                  -- versioned, never overwritten
promotions(id, city_id, type[FLASH_SALE|REFERRAL|SHARE_REWARD|STREAK], rules jsonb,
           budget_minor, spent_minor, starts_at, ends_at, active bool, created_by)
audit_log(id, actor_id, action, target_type, target_id, before jsonb, after jsonb,
          reason, ip, occurred_at)                             -- APPEND-ONLY, no updates or deletes
```

---

## 9.3 API design (DEC-088: REST + WebSockets)

### Principles
- Versioned base path: `/api/v1/...`
- Every mutating request carries an **`Idempotency-Key`** header; replays return the original result.
- Errors are structured: `{ code, message_key, details }` — `message_key` is translated client-side
  so errors work in Arabic and English (DEC-017).
- Every list endpoint is cursor-paginated. No offset pagination.
- Auth: short-lived access token + refresh token; every request carries the acting role.

### Rider endpoints
```
POST /v1/auth/otp/request          {phone}
POST /v1/auth/otp/verify           {phone, code}          -> tokens
POST /v1/auth/passcode/set         {passcode}
GET  /v1/geo/stops?bbox=&city=                            -> stops for the map (DEC-065)
GET  /v1/routes                    ?city=&near=         -> routes list/map (DEC-120)
GET  /v1/routes/:id/boarding_points ?near=               -> stops on this route + walk times
POST /v1/requests                  {route_id, boarding_stop_id|location, seats, ticket_type}
                                                          -> {request_id, offers[] (max 3 departures)}
POST /v1/requests/:id/accept       {offer_id}             -> booking (seat hold -> CONFIRMED)
GET  /v1/bookings                  ?status=               -> my bookings
GET  /v1/bookings/:id                                     -> detail + live journey link
GET  /v1/bookings/:id/qr                                  -> rotating QR payload(s), one per seat
POST /v1/bookings/:id/alight                              -> DEC-117 "I'm getting off at the next stop"
POST /v1/bookings/:id/cancel                              -> forfeit applied per DEC-055
GET  /v1/wallet                                           -> balance + entries
POST /v1/wallet/topup              {amount, method}       -> payment intent
POST /v1/subscriptions             {route_template, days, time, seats}
POST /v1/subscriptions/:id/skip    {date}
POST /v1/subscriptions/:id/pause   {from, to}
```

### Driver endpoints
```
POST /v1/driver/duty               {state}                -> ONLINE_IDLE / OFFLINE
POST /v1/driver/location           {points[]}             -> batched, adaptive (DEC-090)
GET  /v1/driver/journeys/active                           -> journey + full manifest
POST /v1/driver/journeys/:id/start
POST /v1/driver/stops/:id/arrived                         -> offline-queueable (DEC-091)
POST /v1/driver/bookings/:id/scan  {qr_payload, seat}     -> ON_BOARD; offline-queueable
POST /v1/driver/bookings/:id/cash  {collected: true}      -> cash liability (DEC-078)
POST /v1/driver/bookings/:id/alight {stop_id}             -> driver marks a rider alighting (DEC-117)
POST /v1/driver/bookings/:id/no_show
POST /v1/driver/journeys/:id/complete
GET  /v1/driver/routes                                   -- DEC-132: routes open to this driver
GET  /v1/driver/routes/:id/slots   ?date=                -- the published slot grid + demand
POST /v1/driver/slots/:id/claim    {date|recurring, vehicle_id}
GET  /v1/driver/claims
DELETE /v1/driver/claims/:id                             -- release, penalty per CH4a T6
GET  /v1/driver/earnings           ?period=
```

### Manager endpoints (DEC-045, DEC-062)
```
GET  /v1/manage/occupancy/live                            -> vehicles, seats free, by zone
GET  /v1/manage/metrics            ?from=&to=&groupBy=
GET  /v1/manage/config             ?scope=&key=
PUT  /v1/manage/config             {key,scope,value,reason}   -> versioned write
POST /v1/manage/config/preview     {change}               -> impact on recent journeys BEFORE publish
POST /v1/manage/config/rollback    {version_id}
POST /v1/manage/promotions         {type,rules,budget,window}
POST /v1/manage/promotions/:id/stop
POST /v1/manage/service-areas      {geometry|corridors, activates_at}
POST /v1/manage/campaigns          {audience, message, channel, schedule}
```

### Ops Admin endpoints
```
GET  /v1/ops/queue/drivers         ?status=UNDER_REVIEW
POST /v1/ops/drivers/:id/decision  {approve|needs_fix|reject, reason}
GET  /v1/ops/queue/vehicles
POST /v1/ops/vehicles/:id/decision {...}
POST /v1/ops/routes                {name, stops[], flat_fare, service_window}  -- DEC-132
POST /v1/ops/routes/:id/slots      {interval, days, max_vehicles}   -- publish the slot grid
GET  /v1/manage/coverage           ?date=&route=          -- claimed vs uncovered slots (CH4a §4a.6)
POST /v1/manage/slots/:id/incentive {amount, budget}      -- bonus for an uncovered slot
POST /v1/ops/stops                 {name, location, optional attrs}   -- Stop Mapping Tool (G-022)
PUT  /v1/ops/stops/:id
POST /v1/ops/stops/bulk_import     {geojson|csv}
GET  /v1/ops/live-map                                     -> all active journeys
POST /v1/ops/users/:id/suspend     {reason}
```

### Support endpoints (bounded per CH2 §2.4)
```
GET  /v1/support/lookup            ?phone=|booking=       -> limited view, no ID documents
POST /v1/support/bookings/:id/cancel {reason}
POST /v1/support/bookings/:id/refund {amount, reason}     -> rejected above SupportRefundLimit
POST /v1/support/escalate          {target, reason}
```

### WebSocket channels (DEC-089 — only what matters)
```
ws /v1/live
  subscribe: booking:{id}     -> state changes, vehicle position, ETA, stop arrival alarm (DEC-053)
  subscribe: journey:{id}     -> driver's manifest updates, stop progress
  subscribe: ops:city:{id}    -> live map for ops (throttled)
  subscribe: manage:city:{id} -> occupancy snapshot every 5-10s (near-live, not per-event)
```

---

## 9.4 Offline behaviour (DEC-091)

### What works offline (driver app)
QR scans, stop-arrival marking, journey start/complete, cash-collected marking, no-show marking.

### Mechanism
1. Action is applied **optimistically** to local state so the UI never freezes.
2. It is written to a durable local **outbox** with a generated `Idempotency-Key`.
3. On reconnect, the outbox replays in order; the server deduplicates by key.
4. Conflicts (e.g. the ride was already cancelled server-side) resolve with **server authority**,
   and the driver is shown a clear, plain-language explanation of what changed.
5. QR payloads are **signed and time-bounded**, so a scan can be validated locally without network.

### What does NOT work offline
Booking, payment, and anything that allocates a scarce resource — because seat availability cannot
be verified without the server, and promising an unavailable seat is worse than failing honestly.

---

## 9.5 Location pipeline (DEC-090)
- Device samples GPS adaptively: high frequency near a stop, during pickup, or when a rider is
  actively watching; low frequency on long stretches.
- Points are **batched** and compressed before sending; a single request may carry several samples.
- Server updates an in-process last-known-location store (hot, for matching and live view) and
  appends to the PostgreSQL movement store for
  analytics and disputes (DEC-050).
- Map-matching snaps points to roads before display (reduces jitter, improves ETA quality).
- Battery guard: if the device reports low battery, sampling reduces further and the driver is
  warned rather than the app silently degrading (F-34).

---

## 9.6 Invariants enforced at the database level
- INV-2 seats: enforced by a transactional check with row locking on `journeys`.
- INV-11 self-booking: `bookings.rider_id` is always the authenticated user.
- INV-31 seat release: a seat is counted as occupied for all remaining stops until
  `alight_signalled_at` is set (DEC-116/117). No speculative release.
- INV-27 ledger balance: enforced by requiring `counter_entry_id` on every entry.
- INV-18 stops never deleted: no DELETE grant on `stops`; only status transitions.
- Audit and event tables: INSERT-only grants; no UPDATE or DELETE for any role.

## 9.7 Open items
- ~~Config key catalogue~~ — DELIVERED as Chapter 19.
- ~~Wallet balance storage~~ — CLOSED by DEC-153: materialised projection, reconciled nightly; the ledger remains the source of truth.
- ~~Retention periods~~ — CLOSED by DEC-094/DEC-137: everything retained indefinitely, cold-storage tiered after `ColdStorageAfterDays` (CH19).


---

## 9.8 Route-ticket changes (v2, DEC-114..120)

| Change | Detail |
|---|---|
| Destination removed from booking | `ride_requests` no longer carries a destination; `bookings.dropoff_journey_stop_id` is NULLABLE and is filled only after the rider actually alights |
| Route is now first-class | `bookings.route_template_id` is required; `route_templates` carries `flat_fare_minor` (DEC-115) and `published_timetable` (DEC-119) |
| Alighting is an event, not a plan | `alight_signalled_at`, `alight_signalled_by`, `actual_alight_stop_id` |
| Schedule adherence is measured | `journeys.timetable` and `journeys.schedule_slip_seconds` support the F6 replacement (DEC-119) |
| New endpoints | `GET /v1/routes`, `GET /v1/routes/:id/boarding_points`, `POST /v1/bookings/:id/alight`, `POST /v1/driver/bookings/:id/alight` |
| Wall-clock scheduling (DEC-118) | Timetables and subscriptions store LOCAL time + IANA timezone, never a bare UTC instant, so DST never shifts a commute |


---

## 9.9 Supply-model additions (DEC-132 / CH4a)
| Table | Purpose |
|---|---|
| `route_slots` | The published grid a driver claims from. `max_vehicles` implements the collision rule (CH4a T5); `incentive_minor` implements the uncovered-slot bonus (CH4a §4a.6) |
| `slot_claims` | A driver's claim on a slot for a service date. `committed` marks coverage that subscriptions may be sold against (CH4a §4a.7) — the honesty rule for DEC-130 |
| `journeys.slot_id`, `journeys.slot_claim_id` | Every Journey now originates from a claimed slot |
**Invariant added**
- INV-32 A Journey may only exist for a slot that has an active `slot_claim`, and the number of
  Journeys per (slot, service_date) may never exceed `route_slots.max_vehicles`.
- INV-33 A subscription may only be sold against slots whose claim has `committed = true` (CH4a §4a.7).


---

# CHAPTER 10 — UX: Rules & Interaction Design

Status: DRAFT v2 — rider flow rewritten for the ROUTE-TICKET model (DEC-114..120). Implements DEC-014, DEC-017, DEC-020, DEC-053, DEC-076, DEC-091, DEC-098..100.
Evidence: R12 (usability research), R13 (offline-first).
Depends on: CH1-CH6, CH9, CH12

---

## 10.0 The design bar (measured, not aspirational)
Benchmark from R12.1: Uber scored **66.75** on the System Usability Scale, Lyft 60.25, Gojek 62.75 —
all at or below the conventional average of 68. **Our target is SUS >= 80**, tested with real
Alexandrian users on cheap Android phones, in Arabic, outdoors.

Performance targets (from R12.5, Snap-E's stated goals):
- App cold start **< 3 seconds** on a low-end Android device.
- **>= 99% crash-free sessions.**
- Any screen responds to a tap in < 100ms, even while syncing.

---

## 10.1 Universal design rules (binding on every screen)

| # | Rule | Source |
|---|---|---|
| U1 | Frequently used actions live on the main screen or one level down — never in a hamburger menu | R12.1, R12.4 |
| U2 | 3-5 primary destinations in the bottom navigation, no more | R12.4 |
| U3 | Primary actions sit in the lower half of the screen (thumb zone); bottom sheets over modals | R12.4 |
| U4 | If content overflows, show a signifier that more exists | R12.1 |
| U5 | Gestures are accelerators only; every action has a visible control | R12.4 |
| U6 | Internal vocabulary (Journey, policy, tier, mode) never appears in the rider UI | CH1 S2 |
| U7 | Every option is describable in one line: time, walk, duration, price | CH1 S4 |
| U8 | Never an empty screen or an endless spinner — always a next step | DEC-076, CH1 S5 |
| U9 | Full RTL for Arabic, including maps, icons, and directional animation | DEC-017 |
| U10 | Large tap targets, strong contrast, screen-reader labels, logical focus order | R12.4, CH12 §12.5 |
| U11 | Price is shown before commitment; no fee is ever revealed at checkout | R12.5 |
| U12 | The same screen structure on web and mobile; only content adapts | DEC-098 |

---

## 10.2 The rider journey (the core flow)

### 10.2.1 Home — adaptive top slot (DEC-098)
One screen. The **structure never changes**; the top slot's content does:

| Context | Top slot shows |
|---|---|
| New user, nothing saved | Nearby ROUTES, with a search box for finding a route (DEC-120) |
| Has an upcoming booking | That booking: countdown, stop name, walking time, plate. Calendar-style (R12.2) |
| Repeat commuter, no booking today | Their usual route + boarding point as a one-tap action |
| Subscriber | Next 5 rides, with skip/pause controls |

Below the top slot, always identical: recent places, saved places, and a promotions strip
(Manager-controlled, DEC-045) which is simply absent when there is no active promotion.

### 10.2.2 Pick a route → pick a boarding point → pick a departure (DEC-120)
The rider does NOT state a destination (DEC-114). Three light steps:

**Step 1 — choose the route** (list or map; routes named the way people speak about them):
```
  Smouha  →  Alexandria University          15 EGP · every 10-15 min
  Sidi Gaber  →  Alexandria University      15 EGP · every 20 min
  Miami  →  Downtown                        12 EGP · every 15 min
```

**Step 2 — choose where to board** (nearest first, walking time shown honestly per DEC-064):
```
  ● Green Square          6 min walk     ← recommended
  ○ Fawzy Moaz            9 min walk
  ○ Pick me up from my street          +12 EGP   (DEC-063 street ticket)
```

**Step 3 — choose a departure** (at most 3, each one line, U7):
```
  08:05   boards Green Square   arrives University ~08:32     15 EGP   ← recommended
  08:20   boards Green Square   arrives University ~08:47     15 EGP
  08:05   street pickup                                        27 EGP
```
The **route's published end-of-line arrival** is shown (DEC-119) because commuters care about
arrival (R12.2) — but it is presented as the ROUTE's timetable, not a personal promise.
The screen must state plainly: **"get off anywhere along the route"** (DEC-114).

If nothing fits (DEC-076): plain sentence + concrete alternatives. Never an empty result.

### 10.2.3 Booking confirmation
- Price shown large and final (DEC-056 — locked, no surprises).
- **Cancellation terms stated plainly with an explicit confirm** (DEC-055 informed consent).
- Payment method selector defaults to wallet.

### 10.2.4 Waiting for the vehicle — the anxiety screen
R12.5 names poor tracking as the biggest anxiety driver in congested markets. This screen must
therefore be the strongest in the app:
- Live map with the vehicle, the assigned stop, and a **dotted walking line** to it (R3, Via's pattern).
- **"Leave now" prompt** timed so the rider reaches the stop as the vehicle does.
- Vehicle identity shown prominently — plate, colour, model, driver first name — because two vehicles
  may be at one stop (F-29).
- Countdown, not just an ETA.
- **Escalating alarm** as the vehicle nears: gentle notification → strong alert + vibration on arrival
  (DEC-053). Must fire with the app in the background.
- **Offline fallback:** if signal drops, the screen still shows the stop, the scheduled time, the
  walking line and the ticket QR from cache, with an honest "last updated HH:MM" (R13.7).

### 10.2.5 Boarding
- QR displayed at maximum screen brightness automatically (CH12 §12.4).
- Numeric code shown beneath it always (fallback + accessibility).
- One QR per seat for multi-seat bookings (DEC-083).
- On successful scan: unmistakable success state — sound, vibration, full-screen confirmation.

### 10.2.6 On board — the alighting control (DEC-117)
- Minimal screen: **the list of upcoming stops on this route**, current position, share-my-ride,
  SOS always reachable (CH12 §12.1).
- One large, unmissable button: **"I'm getting off at the next stop"**.
  - It tells the driver (their app shows "STOP AT SIDI GABER — 1 alighting").
  - It releases the seat for the remaining stops (DEC-116/117), which is how the system recovers
    capacity — so the UI must make this button easy and obvious, not buried.
  - The rider may also simply tell the driver, who marks it; both paths are supported.
- On completion: receipt, optional rating, and any reward earned.

> **Design note (from CH5 §5.13.5):** if riders do not use this button, vehicles run with seats that
> are held but empty. Signal usage rate is a launch metric, not a nice-to-have.

---

## 10.3 The driver experience (offline-first, DEC-099)

### Design constraints
The driver is **driving**. Every interaction must be usable at a glance, one-handed, in sunlight,
possibly with the phone mounted.
- Very large tap targets; no small controls anywhere.
- High contrast; automatic day/night themes.
- Voice/audio confirmation of key events so the driver need not look.
- Never require typing while the vehicle is moving.

### Core screens
1. **Duty** — one big control: go online / offline. Current vehicle shown, switchable.
2. **Active journey** — next stop, distance, ETA, and the **manifest**: who boards here, who has
   scanned in, who is missing, with one-tap masked calling (DEC-053).
3. **Scan** — camera opens instantly; scanning is the default state at a stop, not a separate mode.
4. **Cash** — a single clear "cash collected" toggle per booking (DEC-078).
5. **Earnings** — today, this week, next payout date, cash liability owed.

### Offline behaviour (offline-FIRST)
- Local storage is the source of truth. The journey, manifest and QR validation keys are downloaded
  **before departure**.
- Every action (scan, arrive, cash, no-show, complete) writes locally first and appears instantly.
- A persistent, visible indicator shows: offline state, number of queued actions, last sync time.
- On reconnect: **delta sync only** (R13.4), in order, with idempotency keys.
- Conflicts resolve to **server authority**, and the driver is told plainly what changed and why.

---

## 10.4 Localisation & RTL (DEC-017)
- Arabic and English at launch; a new language is a translation file only.
- Full RTL: layout mirroring, icon direction, list ordering, and map UI controls.
- Arabic-Indic vs Western numerals selectable; times in 12h/24h per preference.
- **No text baked into images** — everything translatable.
- Error text is a `message_key` translated on the client (CH9 §9.3), never server-side English.

## 10.5 Low-end device budget (F-18)
- Target: a 2-3 year-old Android with 2-3 GB RAM as the reference device.
- Map tiles cached aggressively; avoid heavy animation; lazy-load images; compress payloads.
- Test on the reference device every release — not only on a developer's phone.

## 10.6 Notifications (F-19)
- Categories the user can control separately: ride status (cannot be disabled — operationally
  essential), promotions, and product news.
- Channel choice per category: push, SMS fallback if push fails, in-app.
- Quiet hours respected except for ride-status and safety messages.
- Campaign sends (DEC-045) are rate-limited per user regardless of how many campaigns target them.

## 10.7 Open items
- ~~Full screen inventory~~ — DELIVERED as Chapters 10b/10c/10d (75 screens). Wireframes are the designer's job (DEC-131).
- Onboarding/signup funnel detail — covered by screens R-01..R-05 and D-00..D-03; funnel OPTIMISATION is a post-beta task.
- ~~Support contact channel~~ — CLOSED by DEC-152: in-app chat + phone.
- ~~Alarm timings~~ — CLOSED by DEC-165: 15 min → 5 min → arrival, first reminder user-adjustable.


---

# CHAPTER 10a — Design System

Status: DRAFT v1. Implements DEC-017 (i18n/RTL), DEC-098 (identical structure, adaptive content),
DEC-125 (design system before screens), CH10 §10.1 (U1-U12), CH10 §10.5 (low-end budget).
Purpose: every screen in CH10b references components defined here instead of re-describing them.

---

## 10a.0 Design principles (derived from evidence, not taste)

| # | Principle | Source |
|---|---|---|
| P1 | **Certainty over cleverness.** The rider always knows the price, the place and the time. | R7.3, DEC-056 |
| P2 | **Thumb-first.** Primary actions live in the lower half of the screen. | R12.4 |
| P3 | **Honest states.** Never an empty screen, never an endless spinner, never a hidden fee. | DEC-076, U8, U11 |
| P4 | **Arabic is not a translation, it is a first language.** Full RTL, tested first, not last. | DEC-017 |
| P5 | **Assume a cheap phone on a bad network.** If it only works on a flagship with 5G, it does not work. | CH10 §10.5, DEC-099 |
| P6 | **The driver is driving.** Glanceable, one-handed, audio-confirmed, no typing in motion. | CH10 §10.3 |

---

## 10a.1 Colour

### Semantic tokens (never use raw hex in a screen spec — always the token)
| Token | Purpose | Light | Dark |
|---|---|---|---|
| `bg/base` | page background | #FFFFFF | #0F1115 |
| `bg/raised` | cards, sheets | #F7F8FA | #171A21 |
| `bg/sunken` | input wells, map underlay | #EEF0F4 | #0A0C10 |
| `text/primary` | main text | #0F1115 | #F5F7FA |
| `text/secondary` | supporting text | #5B6472 | #A2ABB8 |
| `text/inverse` | on brand fills | #FFFFFF | #0F1115 |
| `brand/primary` | primary actions, active state | #0B7A5A | #14A87B |
| `brand/onPrimary` | text/icon on brand | #FFFFFF | #06231A |
| `accent/route` | route lines on map | #1B62D6 | #4D8DF0 |
| `accent/walk` | dotted walking line | #7A5AF8 | #A38BFF |
| `status/success` | confirmed, boarded | #1E8E3E | #34C759 |
| `status/warning` | delay, low battery, expiring | #B26A00 | #FFB020 |
| `status/danger` | cancel, SOS, errors | #C62828 | #FF5A5A |
| `status/offline` | offline banner + queued badge | #5B6472 | #A2ABB8 |
| `border/subtle` | dividers | #E3E7ED | #262B34 |
| `overlay/scrim` | behind sheets/modals | rgba(0,0,0,.45) | rgba(0,0,0,.65) |

### Rules
- **Contrast:** body text ≥ 4.5:1, large text and icons ≥ 3:1 (WCAG AA). Verified in CI.
- **Never colour-only:** every state that uses colour also uses an icon or text label
  (colour-blind users, and sunlight on a cheap screen).
- **Dark mode is mandatory**, not optional — drivers work at night (P6).
- `status/danger` is reserved for destructive and safety actions. It must never be used decoratively.

---

## 10a.2 Typography

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 32 / 40 | 700 | the price on a confirmation screen, one per screen maximum |
| `title` | 24 / 32 | 700 | screen titles |
| `heading` | 20 / 28 | 600 | section headers |
| `body-lg` | 17 / 24 | 400 | primary reading text, list rows |
| `body` | 15 / 22 | 400 | default |
| `caption` | 13 / 18 | 400 | supporting detail, timestamps |
| `micro` | 11 / 16 | 500 | badges, overlines |
| `mono-code` | 20 / 28 | 600 | the numeric boarding code, plate numbers |

### Rules
- **Font:** a family with genuine Arabic support (e.g. IBM Plex Sans Arabic / Noto Sans Arabic)
  and matching Latin. Never render Arabic in a Latin-only face with fallback.
- **Minimum body size 15pt.** Never smaller, whatever the layout pressure.
- **Respect OS text scaling** up to 200%; layouts must reflow, not clip.
- **Numerals:** user-selectable Western (1234) or Arabic-Indic (١٢٣٤). Default Western in `en`,
  and a per-user preference in `ar` (defaults to Western, since Egyptian apps commonly use it).
- **Never bake text into an image** (U9 / DEC-017).

---

## 10a.3 Spacing, radius, elevation

- **Spacing scale (4pt base):** `4, 8, 12, 16, 20, 24, 32, 40, 56`. Nothing off-scale.
- **Screen padding:** 16 mobile, 24 tablet, 32 desktop.
- **Radius:** `sm 8` inputs/chips · `md 12` cards · `lg 20` bottom sheets · `full` pills/avatars.
- **Elevation:** flat by default. Shadows only on sheets, floating action bars, and map callouts.
  (Shadows are expensive to render on low-end Android — P5.)

---

## 10a.4 Touch targets & motion

- **Minimum touch target 44×44pt** for riders; **56×56pt minimum for every driver control** (P6).
- Spacing between adjacent targets ≥ 8pt.
- **Motion:** 150-250ms, ease-out. Respect "reduce motion". No animation on lists or maps while
  the vehicle is moving (battery + P5).
- **Haptics:** success (boarding confirmed), warning (vehicle arriving), error (scan failed).
  Haptics are a channel, never the only channel.

---

## 10a.5 RTL rules (DEC-017, P4)

| Element | LTR | RTL |
|---|---|---|
| Layout, lists, nav | left→right | **mirrored** |
| Back chevron | ← | **→** |
| Progress, steppers | left→right | **mirrored** |
| Icons with direction (arrows, next) | as drawn | **mirrored** |
| Icons without direction (map pin, clock, QR, SOS) | as drawn | **NOT mirrored** |
| Map canvas & compass | as drawn | **NOT mirrored** (geography is not mirrored) |
| Numerals & times | 1234 / 08:05 | not mirrored; digits render LTR inside RTL text |
| Phone numbers, plates | LTR | **LTR embedded** (use bidi isolation) |

**Rule:** every screen must be reviewed in Arabic **before** it is signed off in English.
Mixed-direction strings (an Arabic sentence containing a plate number) must use bidi isolation
so digits never visually reorder.

---

## 10a.6 Component library

Each component is defined once here; screens reference it by name.

### Core
| Component | Description | States |
|---|---|---|
| `Button/Primary` | filled brand, full-width in sheets | default · pressed · loading · disabled |
| `Button/Secondary` | outlined | same |
| `Button/Danger` | filled danger, requires confirmation | same |
| `Button/Ghost` | text-only, low emphasis | same |
| `IconButton` | 44pt (56pt driver) | default · pressed · disabled |
| `Input/Text` | label above, helper/error below | default · focus · error · disabled |
| `Input/Phone` | country prefix + LTR-isolated number | + invalid |
| `Input/OTP` | 6 boxes, auto-advance, paste-aware | + error · + resend countdown |
| `Select/Sheet` | bottom-sheet picker (never a dropdown on mobile) | — |
| `Chip` | filter or selection pill | default · selected · disabled |
| `Badge` | count or status | neutral · success · warning · danger · offline |
| `Avatar` | photo or initials | — |
| `Divider` | 1px `border/subtle` | — |
| `Skeleton` | shimmer placeholder matching final layout | — |

### Layout & navigation
| Component | Description |
|---|---|
| `BottomNav` | 3-5 destinations (U2), labels always visible, never icon-only |
| `TopBar` | title + optional back + optional single action |
| `BottomSheet` | 3 detents: peek / half / full. The primary surface on mobile (P2) |
| `Card` | `bg/raised`, radius md, padding 16 |
| `ListRow` | leading icon/avatar · title · subtitle · trailing value/chevron. min-height 56 |
| `SectionHeader` | `heading` + optional action link |
| `Tabs` | for dashboards only, never on rider mobile |
| `DataTable` | **web/desktop only** — sortable, bulk-select, keyboard nav, sticky header |

### Domain components (this product's vocabulary)
| Component | Description | Referenced by |
|---|---|---|
| `RouteCard` | route name (ar/en) · flat fare · frequency · direction | route list |
| `BoardingPointRow` | stop name · walking time · recommended badge · unavailable reason | boarding picker |
| `DepartureRow` | departure time · boarding point · timetable arrival · price · recommended | departure picker |
| `PriceTag` | large price + "fixed, no surge" affordance | booking, confirmation |
| `TicketCard` | route · boarding point · departure · seats · QR/code entry point | active booking |
| `QRPanel` | rotating QR at max brightness + `mono-code` numeric fallback + a11y label | boarding |
| `SeatCounter` | 1-N stepper, capped by configuration | booking |
| `VehicleIdentity` | plate (LTR) · colour swatch · model · driver first name + photo | waiting, on-board |
| `WalkingLine` | dotted `accent/walk` polyline + "leave now" chip | waiting |
| `LiveMap` | vehicle marker · route line · stops · user position | waiting, on-board, ops |
| `StopList` | ordered upcoming stops, current highlighted | on-board, driver |
| `AlightButton` | large, persistent: "I'm getting off at the next stop" (DEC-117) | on-board |
| `Manifest` | per-stop: expected · scanned · missing · one-tap masked call | driver |
| `ScanFrame` | camera viewfinder, instant, default state at a stop | driver |
| `DutyToggle` | one large online/offline control | driver |
| `EarningsSummary` | today · week · next payout · **cash liability owed** | driver |
| `AlertRail` | actionable alert + one-click action buttons (DEC-101) | manager |
| `OccupancyOverlay` | map heat layer: vehicles, free seats, demand | manager, ops |
| `QueueRow` | count · oldest age · severity · SLA state | ops |
| `ConfigField` | value + inherited-from indicator + preview/rollback affordance | manager |
| `SOSButton` | persistent, one tap from any ride screen, supports silent mode | rider, driver |

### Feedback & system state
| Component | Description |
|---|---|
| `Toast` | transient, non-blocking, bottom, above nav |
| `InlineError` | attached to the field or section that failed, never a generic banner |
| `EmptyState` | illustration-free: headline · one sentence · **one concrete action** (P3) |
| `OfflineBanner` | persistent bar: "Offline · 3 actions waiting · last synced 07:42" (R13.7) |
| `SyncBadge` | queued-action count on affected items |
| `ConfirmSheet` | destructive/irreversible confirmations; states the consequence in plain words |
| `LoadingState` | skeleton matching the final layout, **never** a bare spinner |

---

## 10a.7 The five states every screen must define (DEC-122)

No screen spec is complete without all five:

1. **Loading** — skeleton in the final layout's shape.
2. **Empty** — what it says and the one action offered (never a dead end).
3. **Error** — plain sentence, cause if known, and a retry or alternative.
4. **Offline** — what still works from cache, what is queued, last-sync time.
5. **RTL** — confirmed in Arabic, including numerals and any mixed-direction strings.

Additionally for money screens: **the price is always visible before the commit action** (U11, P1).

---

## 10a.8 Accessibility baseline (CH12 §12.5, U10)
- Every interactive element has an accessible name and role; icon-only buttons carry labels.
- Focus order follows visual order; visible focus rings on web.
- The **numeric boarding code is always available** alongside any QR (blind/low-vision riders).
- Screen-reader pass required on: booking, waiting, boarding, alighting, SOS.
- Supports OS text scaling to 200% and OS-level reduce-motion.
- Never convey status by colour alone.

## 10a.9 Performance budget (CH10 §10.5, P5)
| Metric | Budget |
|---|---|
| Cold start (reference low-end Android) | < 3s |
| Screen transition | < 300ms |
| Tap feedback | < 100ms, even while syncing |
| Crash-free sessions | ≥ 99% |
| Map tiles | cached aggressively; no full re-render on pan |
| Images | compressed, lazily loaded, no decorative full-bleed photos |
| Animation while driving | none |

## 10a.10 Open items
- Exact brand hue — structure now settled by DEC-169 (§10a.11.4); the single accent value remains open
- Icon set choice — the reference file's line-icon style (1.8px stroke, round caps) is the benchmark
- Whether the Arabic numeral default should differ per city

---

## 10a.11 UI reference benchmark (DEC-168)

A working HTML reference exists at `_working_docs/reference/UI_REFERENCE_daily-plan-app.html`
(a daily-planner application, unrelated in domain). It is retained because it demonstrates, in
running code, three patterns this chapter requires. It is a **brief for designers and web
developers, not code to be copied wholesale.**

### 10a.11.1 What is adopted from it

| Pattern in the reference | Why it is adopted here |
|---|---|
| **Single token layer** — every colour, radius, shadow and motion curve declared once in `:root` | Confirms §10a.1: screens reference a token, never a raw value. Reskinning is ~20 edits. |
| **One nav component, CSS-only adaptation** — a floating bottom dock below 1024px becomes a left sidebar above it, with no JavaScript branching and no second component | This is DEC-098 demonstrated: identical structure everywhere, only presentation adapts. Adopt the principle for the web app's navigation. |
| **Components as pure functions** `(props) => element` | Matches CH8a's module discipline and ports cleanly to React (the reference documents its own porting path). |
| **Pointer-gated interaction** — hover effects behind `@media (hover: hover) and (pointer: fine)` | Prevents hover styles misfiring on touch devices. Adopt as a rule. |
| **Motion honesty** — `prefers-reduced-motion` respected | Already required by §10a.4; the reference shows the implementation. |
| **Restrained visual tone** — generous radii, soft layered shadows, high contrast text, no decoration | Matches the product's calm register. |

### 10a.11.2 What must change before use

| Reference | This product requires |
|---|---|
| Pastel accent cards (purple, yellow, pink, blue) | A palette legible in direct sunlight on a low-end screen (§10a.1) |
| Light theme only | **Dark mode is mandatory** — drivers work at night (§10a.1) |
| LTR only | **Full RTL** with the mirroring matrix in §10a.5, and LTR-isolated plates and numerals |
| 44px touch targets | 44px riders, **56px minimum for every driver control** (§10a.4) |
| Layered shadows used liberally | Shadows are costly to render on low-end Android; flat by default (§10a.3) |
| Inter via Google Fonts | A self-hosted family with genuine Arabic support (§10a.2) |
| 4 fixed nav items | Role-adaptive navigation: 5 rider, 4 driver (DEC-014) |
| Static SVG map mockup | Live map, vehicle position, dotted walking line (§10a.6) |
| No connectivity states | Offline banner, queued-action count, last-synced time (§10a.6, §10a.7) |

### 10a.11.3 Scope of reuse
- **Web application** (`/apps/web`, Next.js): the CSS approach and token file are a valid starting
  point.
- **Mobile application** (Expo/React Native): the **component structure and props port; the CSS does
  not** — React Native has no stylesheets, media queries or `backdrop-filter`. Tokens must be
  re-expressed as a JavaScript theme object shared through `packages/shared-logic` (DEC-085).

### 10a.11.4 Palette direction (DEC-169, supersedes the placeholder in DEC-127)
Adopt the reference's structure — near-black text on white, muted secondary text, hairline borders,
a soft neutral panel fill — and replace the pastel accents with the semantic tokens in §10a.1.
The exact brand hue remains open; the token architecture means it is a single-value change.


---

# CHAPTER 10b — Screen Inventory: Rider (27 screens)

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


---

# CHAPTER 10c — Screen Inventory: Driver (20 screens)

Status: DRAFT v1. Implements DEC-099 (driver app is OFFLINE-FIRST), DEC-049 (QR), DEC-053 (manifest
+ contact), DEC-078 (recorded cash), DEC-117 (alighting), CH10 §10.3 (driver-in-motion constraints).
All five states defined per CH10a §10a.7. **[M]** = mobile only.

## Driver design law (binding on every screen here)
> **The driver is driving.** 56pt minimum touch targets · high contrast · automatic day/night ·
> audio confirmation of every key event · **never require typing while the vehicle is moving** ·
> every screen readable at a glance in sunlight.

**Offline-first (DEC-099):** local storage is the source of truth. The journey, manifest and QR
validation keys are downloaded **before departure**. Every action writes locally first and appears
instantly. A persistent indicator always shows: offline state · queued action count · last sync.

---

## D-00 · Driver onboarding — start [W available]
**Purpose** A driver can complete signup on the WEB (DEC-085: web serves signup, documents,
schedule, earnings; only *driving* requires the app).
**Contents** What's required listed up front (national ID, driving licence, vehicle licence, selfie,
vehicle photos — DEC-035), realistic expectation of review time, "Start".
**States** Empty n/a · Offline: read-only · RTL: mirrored.

## D-01 · Document upload [W available]
**Contents** One card per document with example images, camera or file upload, expiry date entry,
per-document status chip (`Badge`: pending / approved / needs fix / rejected).
**Rules** Rejections always show the human reason in the driver's language (CH2 §2.5).
Compression before upload (P5). Partial progress is saved — never lose work.
**States** Loading: per-file progress · Error: per-file inline, others unaffected · **Offline:
photos captured and queued, upload resumes automatically** · RTL: mirrored.
**API** `POST /v1/driver/documents`

## D-02 · Vehicle registration [W available]
**Contents** Plate (LTR), make, model, colour, year, **seat capacity** (DEC-047 sells every
physical seat), vehicle photos (front, back, sides, interior, plate).
**Note** DEC-039: no ownership is asserted; the driver declares, an admin approves.
**States** as D-01.

## D-03 · Verification status
**Contents** Clear stage indicator (submitted → under review → approved / needs fix), what is
outstanding, expected time, support contact.
**Rule** Never a silent wait — always say what happens next (P3).

## D-04 · Vehicle switcher
**Contents** List of the driver's approved vehicles, one marked ACTIVE (DEC-039).
**Rules** Switching is **audited**; every Journey permanently records which vehicle carried riders.
Cannot switch while a journey is IN_PROGRESS.

---

## D-10 · DUTY HOME ★
**Purpose** One decision: online or offline.
**Must contain**
- Which vehicle is active (plate), with a way to switch (D-04)
- Sync status: online/offline, queued action count, last sync time
- **One dominant control: go online / go offline** — the largest interactive element on the screen
- Today's summary: journeys completed, earnings
- **Cash still to settle** (liability owed), always visible
- Primary navigation: Duty · Journeys · Earnings · Profile
**Blocked states shown plainly, never a silent failure:** documents expired (DEC-035 auto-suspend) ·
vehicle suspended · **cash liability above `MaxCashLiability`** (CH6 §6.3) · account suspended.
Each states the reason and the way to fix it.
**States** Loading: skeleton · Error: cached state usable · **Offline: can still go online; work is
queued** · RTL: mirrored.
**API** `POST /v1/driver/duty`

## D-11 · Find work — browse routes and slots (DEC-132 / CH4a) ★ NEW
**Purpose** The driver's entire supply action: **pick a route → pick a slot → confirm.** Two taps.
Drivers never draw routes, set prices, or predict demand.
**Must contain**
- Routes available to this driver, nearest/most relevant first: route name, flat fare, service
  window, typical demand indication
- For a chosen route, its **published slot grid** (e.g. every 15 min, 06:00-10:00) with per slot:
  time, whether it is unclaimed / claimed by someone else / claimable, and **riders already waiting**
- Clear marking of **uncovered high-demand slots**, including any incentive offered (CH4a §4a.6)
- A one-tap claim action per slot
- A **recurring claim** action ("every weekday 07:15") — one action, not twenty (CH4a T9)
- Lead-time rules made visible: how far ahead a slot can be claimed, and the latest moment to claim
**States** Loading: skeleton grid · Empty: "No routes available near you" + when to check back ·
Error: retry · Offline: browsing from cache allowed, **claiming requires connection** (it allocates
a scarce resource) and says so plainly · RTL: mirrored, times LTR.
**API** `GET /v1/driver/routes`, `GET /v1/driver/routes/:id/slots`, `POST /v1/driver/slots/:id/claim`

## D-12 · My claimed departures
**Must contain** Upcoming departures this driver has claimed: route, slot time (wall-clock,
DEC-118), seats sold so far, vehicle, and whether it is locked yet. Automatic offline download
shown as done. A release/cancel action with **the consequence stated plainly** before confirming
(CH4a T6: penalty, and riders already booked are affected).
**States** Empty: "You haven't claimed any departures" + a link to D-11 · Offline: cached list.
**API** `GET /v1/driver/claims`, `DELETE /v1/driver/claims/:id`

---

## D-20 · ACTIVE JOURNEY ★ the main working screen
**Must contain**
- Offline indicator with queued-action count and last sync time — **only visible when offline**
- The next stop: name, distance, time to arrive
- **On-time or late against the route timetable** (DEC-119), stated in words a driver can act on
- Who is **boarding** at this stop: name, seat count, scanned or not scanned
- Who is **alighting** at this stop
- Two dominant actions: **SCAN** and **ARRIVED**
- Access to: the rest of the route's stops, navigation handoff, SOS
**Also** Next stop + distance + ETA + **on-time/late against the route timetable (DEC-119)** ·
`Manifest` for this stop · `StopList` for the rest of the route · navigation handoff · SOS.
**Rules** Skipped stops are shown as skipped (DEC-041/117 — a stop is served only if it has a
boarding, a signalled alighting, or is a timetable anchor).
**States** Loading: cached journey shown immediately · Error: never blocks the drive · **Offline:
fully functional** · RTL: mirrored; plate and digits LTR.
**API** `GET /v1/driver/journeys/active`, `WS journey:{id}`

## D-21 · Scan (boarding)
**Contents** `ScanFrame` — camera opens instantly; **scanning is the DEFAULT state at a stop, not a
mode you enter** (CH10 §10.3). Live list of who is still missing.
**Success** full-screen green + sound + haptic; name and seat count announced audibly so the driver
need not look.
**Failure** plain reason on screen and spoken: wrong vehicle / wrong route / already boarded /
expired code — and for "wrong vehicle" it names the correct plate (F-28).
**Fallbacks (CH12 §12.4)** numeric code entry · manual confirm from the manifest — both
**recorded, attributed and rate-limited**, because an unlimited override is the fraud path.
**States** **Offline: validates locally against the signed payload and queues** (DEC-091) ·
Error (camera unavailable): fall straight to numeric entry, no dead end · RTL: instructions
mirrored, code LTR.
**API** `POST /v1/driver/bookings/:id/scan`

## D-22 · Missing riders / wait
**Contents** Who has not boarded, one-tap **masked call** each (DEC-053, CH12 §12.1.3),
wait timer (default 10 min, DEC-052), and **the consequence made visible: who is already on board
and how far behind timetable the vehicle is** (DEC-084 — the app informs, the driver decides).
**Actions** Mark no-show · continue waiting · depart.
**States** Offline: calling still works (it is a phone call); marks are queued.

## D-23 · Cash collection (DEC-078)
**Contents** Per-booking row with the **exact fixed fare** (no change-making problem, DEC-115) and a
single large "Cash collected" toggle. Running total for this journey and total liability owed.
**Rules** Marking cash creates a **Driver Cash Liability** ledger entry (CH6 §6.3). Above
`MaxCashLiability` the driver is blocked from accepting further cash bookings — shown here plainly
before it happens, not as a surprise.
**States** Offline: queued; the total updates locally · Error: never silently lost.
**API** `POST /v1/driver/bookings/:id/cash`

## D-24 · Alighting (DEC-117)
**Contents** Riders who signalled they are getting off at the next stop, plus a control for the
driver to mark someone who **told them verbally** (both paths supported).
**Effect** Releases the seat for the remaining stops — the mechanism that recovers utilisation.
**States** Offline: queued.
**API** `POST /v1/driver/bookings/:id/alight`

## D-25 · Journey complete
Summary: stops served, riders carried, earnings for this journey, cash collected. One tap to go
back online.

## D-26 · Journey problem / abort (CH3 §3.6)
**Contents** Reason picker (breakdown, accident, safety, illness), immediate consequence explained,
confirm.
**Effect** Journey → ABORTED; every affected rider is notified with a next step; support is alerted
proactively; riders are prioritised for re-accommodation.
**Rule** This screen must be reachable in two taps but never be an accidental tap
(`ConfirmSheet` with the consequence stated).

---

## D-30 · Earnings
**Contents** `EarningsSummary`: today · this week · next payout date (weekly, DEC-080) ·
**cash liability owed** · minimum payout threshold progress.
**Rule** Every payout is inspectable **line by line, per ride** (CH6 §6.7).
**States** Offline: cached figures with last-updated stamp.

## D-31 · Payout detail
Gross − commission (DEC-081) − cash liability − fees = net. Every component itemised. Status and
provider reference. Failed payouts explained in plain words with what happens next.

## D-32 · Documents & expiry
All documents with expiry dates and status. **Warnings at 30/14/7/1 days; automatic suspension at
expiry** (DEC-035). Re-upload path directly from here.

---

## D-40 · Driver profile & settings
Photo, languages spoken, notification preferences, day/night theme override, audio-cue volume,
**battery-saver notice** (adaptive GPS explained honestly, DEC-090/F-34), support, log out.

## D-41 · Driver safety
SOS (same one-tap rule as riders), incident reporting, emergency contacts.

---

## Driver screen count: 20
D-00,01,02,03,04 · D-10,11,12 · D-20,21,22,23,24,25,26 · D-30,31,32 · D-40,41

## Cross-checks performed (P6)
- Every screen's offline behaviour matches DEC-099 (driver = offline-first).
- Cash flow matches CH6 §6.3 exactly (scan → collect → liability → payout deduction).
- Wait-time screen implements DEC-084 (app informs, human decides) rather than enforcing a rule.
- Alighting supports BOTH paths required by DEC-117 (rider signal, driver mark).
- No screen requires typing while in motion.


---

# CHAPTER 10d — Screen Inventory: Ops, Manager & Support (28 screens)

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


---

# CHAPTER 12 — Trust, Safety & Security

Status: DRAFT v1. Implements DEC-092..097, and addresses G-015, G-026, G-038, G-039, G-043, G-044.
Depends on: CH2 (roles/permissions), CH3 (lifecycle), CH6 (money)

---

## 12.0 The safety principle
> A rider is getting into a stranger's vehicle with other strangers. Every safety mechanism must
> work when the rider is frightened, in a hurry, on a cheap phone, with poor signal, possibly at
> night. Anything that only works in ideal conditions is not a safety feature.

---

## 12.1 The safety kit (DEC-092)

### 12.1.1 SOS
- One prominent control, reachable in **one tap from any ride screen** — never buried in a menu.
- Activating it sends: rider identity, live location, journey id, vehicle and driver details, and
  the full manifest, to the on-call responder (DEC-095).
- Works with minimal signal: falls back to SMS with coordinates if data fails.
- The rider is shown clearly that help was reached and who is responding.
- **Silent mode:** SOS can be triggered without an obvious on-screen change, for situations where
  visibly calling for help would escalate danger.
- Every activation creates an incident automatically — it can never be "just dismissed".

### 12.1.2 Share my ride
- Generates a link a family member can open in any browser, no app or account required.
- Shows live vehicle position, ETA, and the plate/driver first name — nothing more.
- Expires automatically at the end of the journey.

### 12.1.3 Masked calling and messaging
- Rider and driver can contact each other; neither ever sees the other's phone number.
- Masking persists for a limited window after the journey (for lost property), then closes.
- All masked contact events are logged (who called whom, when — not content).

### 12.1.4 Two-way ratings (DEC-096 — informational only)
Ratings are collected from riders and drivers and displayed, but trigger **no automatic action**.
Consequence flows entirely through the incident path below.

---

## 12.2 The incident flow — now the ONLY protective mechanism (G-044)

Because ratings carry no consequence (DEC-096), this flow carries the entire safety burden.
It must therefore be strong.

```
REPORT (rider/driver/support/SOS)
   -> TRIAGE (severity assigned automatically by category, upgradeable by a human)
   -> INVESTIGATION (Ops Admin; evidence = event log, GPS trace, manifest, masked-call log)
   -> DECISION (no action | warning | training | suspension | permanent removal)
   -> FOLLOW-UP (reporter is told the outcome)
   -> RECORD (permanent, attached to the person, never deleted)
```

### Mandatory rules
- Every report gets a ticket. Nothing is resolved informally.
- **Severity categories** (assault, harassment, dangerous driving, discrimination, theft, vehicle
  condition, punctuality, other). Sanctions escalate: warning → 7 days → 30 days → permanent (DEC-156). The top categories trigger IMMEDIATE precautionary suspension
  pending investigation — the person stops driving first, and is investigated second.
- **Repeat-signal detection (DEC-138, evidence R15):** three thresholds, all configuration:
  1. **Report rate ≥ 10%** of completed rides — with a **minimum of 20 completed rides**, measured
     over a **rolling window of the last 100 rides** → human review alert to Ops.
     (10% matches the industry's effective tolerance: Uber deactivates near a 4.6/5 average, which
     corresponds to roughly 8-12% poor ratings — R15.2. The volume guard prevents punishing a new
     driver for one unfair report — R15.3.)
  2. **Category clustering:** 3+ reports in the same category within 30 days → review even below 10%
     (R15.4: "multiple complaints about the same behaviour pattern... can add up").
  3. **Severe categories** → immediate precautionary suspension regardless of percentage.
- **No automatic deactivation, ever.** A human decides, records a reason, and the driver may appeal
  (R15.5: a reported 30% of drivers faced deactivation threats with no recourse; Seattle legislated
  an appeals panel in response).
- The reporter is always told what happened. Silence destroys trust in reporting.
- Reports are never visible to the person reported in a way that identifies the reporter.

---

## 12.3 Fraud controls (DEC-097)

### 12.3.1 GPS spoofing / fake completed rides
| Signal | Response |
|---|---|
| Mock-location flag reported by the OS | Block duty, flag account |
| Position jumps faster than physically possible | Discard sample, flag journey |
| Journey "completed" without matching GPS trace | Withhold payout, human review |
| QR scan location far from the expected stop | Flag booking for review |
Cross-check rule: a completed booking must have a **QR scan** (DEC-049) AND a plausible GPS trace.
Either alone is insufficient for payout.

### 12.3.2 Driver–rider collusion
Patterns to detect: the same rider–driver pair repeatedly; rides that always complete instantly;
referral rewards flowing between linked accounts; cash bookings that are always marked collected
with no corresponding trace.
Response: hold rewards, require human review before payout.

### 12.3.3 Promotion and referral abuse
Controls: one reward per verified phone; device fingerprinting; caps per user, per device, per
period; **promotion budget caps enforced in the ledger** (INV-29) so abuse cannot exceed the
allocated budget; rewards released only after a qualifying completed ride, never at signup.

---

## 12.4 QR fallbacks (G-026) — required, since QR is primary
| Failure | Fallback |
|---|---|
| Rider's phone is dead or lost | Driver looks the rider up on the manifest and confirms manually; action is flagged and rate-limited per driver |
| Screen cracked / QR unreadable | Short numeric code shown alongside every QR, typed by the driver |
| No light at night | QR displayed at maximum brightness automatically; numeric code as backup |
| Rider has no smartphone | Booking is not possible in v1 (app-only); documented limitation |
| Any other QR failure | **The numeric code shown beside every QR is the official fallback (DEC-136)** |
| Driver's phone dies mid-journey (F-26) | Journey continues; riders are marked boarded from the manifest afterwards by support; the incident is logged and the driver is prompted about power |
Manual overrides are always **recorded, attributed and rate-limited** — otherwise they become the
fraud path.

## 12.5 Accessibility of a QR-first product (G-038)
QR is visual, which excludes blind and low-vision riders. Required:
- The numeric code is always available and screen-reader accessible.
- The driver's app can complete boarding from the manifest without any scan for a flagged rider.
- Riders may set an accessibility flag on their profile that alerts the driver to assist.
[Full accessibility standard to be specified in CH10.]

## 12.6 Operational failures (F-26, F-27, F-34)
| Event | Designed response |
|---|---|
| Driver's phone dies | 12.4 above; journey completes; support reconciles |
| Vehicle breakdown mid-journey | Journey -> ABORTED; riders auto-prioritised for re-accommodation; charged only for distance travelled or nothing (CH3 §3.6); support contacts riders proactively |
| Low driver battery | Sampling reduced, explicit warning to the driver, prompt to charge (CH9 §9.5) |
| Rider boards the wrong vehicle (F-28) | QR scan fails with a clear message naming the correct vehicle and its plate |
| Two vehicles at one stop (F-29) | Rider screen shows plate, colour and driver name prominently before arrival |

## 12.7 Security of the movement store (G-043, from DEC-094)
Because all location history is retained indefinitely:
- Location history lives in a **separate store** with its own encryption key and tighter access.
- Analytics access is **pseudonymised by default**; re-identification is a separate audited right.
- **No bulk export** without Super Admin approval, always audited (CH2 §2.4).
- Access to another person's movement history is a Super-Admin-only, reason-required action.
- Old data moves to encrypted cold storage — retained, but not in the hot database (G-042).

## 12.8 Platform security baseline
- **Two-factor authentication is MANDATORY for all staff roles** (DEC-151).
- Rate limiting on OTP, login, booking and refund endpoints.
- All secrets in a managed secret store; none in code or configuration files.
- Dependency and secret scanning in the verify command (CH8a §8a.6).
- Least privilege for every service and database user.
- Regular restore-tested backups; an untested backup is not a backup.

## 12.9 Open items
- ~~Suspension durations~~ — CLOSED by DEC-156: warning → 7 days → 30 days → permanent.
- ~~Rider blocking~~ — CLOSED by DEC-158: one-way and silent; the driver is never told.


---

# CHAPTER 13, 14 & 15 — Privacy, Quality & Infrastructure

Status: DRAFT v1. Implements DEC-030, DEC-050, DEC-071, DEC-094, DEC-104..108.

===============================================================================
# CHAPTER 13 — Privacy & Data Governance
===============================================================================

## 13.0 Position
Legal interpretation is OUT OF SCOPE (DEC-030) — the user's legal team owns it. This chapter
specifies the TECHNICAL CAPABILITIES the system must have so that whatever the legal team decides
can actually be implemented.

## 13.1 What is collected (DEC-050 "collect all the data")
| Category | Examples | Sensitivity |
|---|---|---|
| Identity | phone, name, email, photo | high |
| Verification documents | national ID, licences, selfie | **highest** |
| Movement | GPS traces, stops used, journeys, times | **highest** (reveals home, work, routine) |
| Behaviour | searches, offers shown, offers declined, cancellations | medium |
| Money | bookings, fares, wallet, payouts, cash liabilities | high |
| Device | model, OS, app version, push token, coarse fingerprint | medium |
| Support | tickets, incident records, masked-call metadata | high |

## 13.2 Retention (DEC-094 — keep everything, indefinitely)
The user has chosen indefinite retention. The technical consequences are therefore mandatory,
not optional:
1. **Tiered storage, not tiered deletion.** Data older than a configured age moves to encrypted
   cold storage. Nothing is deleted; cost is controlled by where it lives (G-042).
2. **Separate movement store** with its own encryption key, distinct from the operational database.
3. **Pseudonymised analytics by default** — analytical queries see a hashed rider id;
   re-identification is a separate, audited, Super-Admin-only privilege.
4. **No bulk export without Super Admin approval**, always audited (CH2 §2.4).
5. **Deletion capability must exist** even if unused, because a regulator or court may compel it.
   Deleting a user ANONYMISES them while preserving financial and safety records (INV-9).
6. **Legal referral standing open**: indefinite retention of personal movement data must be cleared
   by the legal team against Egypt's PDPL (G-041). Flagged once, as required; not designed around.

## 13.3 Consent and transparency
- Plain-language privacy notice in Arabic and English, written for a normal reader.
- Explicit consent captured at signup, versioned — we must be able to prove WHICH version a user
  accepted and when.
- Granular controls where they do not break the service: marketing messages, personalisation.
  Ride-status messages and safety data are operationally essential and not optional.
- Users can view and export their own data.

## 13.4 Regulatory export capability (G-008)
Research (R1.5) indicated Egyptian ride-hailing rules require retaining trip data and providing it
to authorities on request. Whatever the legal position, the SYSTEM must be able to:
- produce a complete trip dataset for a defined period,
- do so without granting standing database access to anyone external,
- log every such export: who requested, who approved, what was included, when.

## 13.5 Access control summary
Identity documents: Ops Admin + Super Admin only. Movement history of another user: Super Admin
only, with reason. Money ledger: read for Manager (aggregate), write for nobody (append-only).
Bulk export: Super Admin approval, always audited.

===============================================================================
# CHAPTER 14 — Quality & Verification
===============================================================================

## 14.1 The single verify command (DEC-071, rules §6.2)
`npm run verify` must run, and all must pass before any merge:
type check · lint incl. module-boundary rules · unit tests · integration tests · contract tests ·
build of every app · database migration check · secret scan · dependency audit.

## 14.2 Testing bar by area
| Area | Bar |
|---|---|
| Domain rules | Unit tests mandatory; pure functions |
| **Money** | Highest: exact-value assertions, property-based tests, integer-only arithmetic, ledger-balance assertions |
| **State machines** | Every legal transition tested; every ILLEGAL transition proven rejected |
| **Matching** | Deterministic scenario tests + simulation (14.3) |
| API | Contract tests so apps cannot silently break |
| Offline sync | Tested against flaky networks, not just airplane mode (R13.7) |
| UI | Build + type checks; critical flows end-to-end |
| Accessibility | Screen-reader pass on core rider flows; RTL verified |
| Performance | Cold start <3s and crash-free ≥99% measured on the reference low-end device |

## 14.3 Simulation before launch (DEC-106, FleetPy)
Run against synthetic Alexandria demand to answer, with numbers rather than intuition:
- fleet size vs percentage of requests served,
- walking-distance sensitivity,
- optimal batch window per time of day (DEC-072),
- promise-tolerance setting (CH5 F6),
- street-pickup share at various surcharge levels (CH6a),
- what happens at 2x and 5x demand.
**No launch parameter may be set purely by intuition.**

## 14.4 Closed beta (DEC-108)
One corridor, real riders, real drivers, limited scale, for a defined period.
Explicit success criteria before going public: completion rate, on-time rate, rider return rate,
stop-findability failures, driver manifest errors, support contacts per 100 rides.
Beta findings are triaged as gaps in AUDIT_AND_TODO before any public launch.

## 14.5 Definition of Done (binding on every work package)
A task is done when: the code is merged, `verify` passes, tests genuinely exercise the behaviour,
documentation is updated, the audit entry is closed with evidence, and the implementation log has an
entry with commands and observed output. Nothing is "done pending tests".

===============================================================================
# CHAPTER 15 — Infrastructure & Cost
===============================================================================

## 15.1 Shape (DEC-104, DEC-105, DEC-107)
Self-managed VPS, region as configuration, database self-hosted with replica + off-site backups.

```
[ CDN / static ]     web app (Next.js)
        |
[ Load balancer ] -> API (NestJS, modular monolith, N containers)
                       |-- PostgreSQL 16 + PostGIS  (primary)  --> streaming replica
                       |-- In-process store (geo index, last-known state; rebuilt from PostgreSQL)
                       |-- OSRM (self-hosted routing + matrices)
                       |-- Optimiser service (Python + OR-Tools) — queue-driven
                       |-- Object storage (documents, stop photos) — encrypted
                       |-- Cold storage (aged movement data)
[ Monitoring / alerting / log aggregation ]  — mandatory from day one
```

## 15.2 Non-negotiable operational practices (DEC-104 mitigations)
1. **Infrastructure as code** — every server reproducible from the repository. No hand-built boxes.
2. **Automated encrypted off-site backups**, plus **documented restore drills** on a schedule.
   An untested backup is not a backup.
3. **Streaming replication** for the database (DEC-107).
4. **Monitoring and paging** from day one: uptime, error rate, latency, queue depth, disk space,
   certificate expiry, replication lag, backup success.
5. **Staging environment** mirroring production.
6. **Zero-downtime deploys** and a one-command rollback.
7. Region is configuration, never assumed in code (DEC-105) — data localisation may become a
   legal requirement.

## 15.3 Cost model (structure; figures to be filled with real quotes)
| Component | Driver of cost | Notes |
|---|---|---|
| API containers | request volume | scales horizontally |
| PostgreSQL primary + replica | data size, IOPS | the money ledger lives here |
| In-process store | active vehicles and riders | memory-bound |
| OSRM | city graph size | R5.1: self-hosting avoids ~$510/day Google matrix costs |
| Optimiser | overnight VRP runtime | can run on a cheap burst machine |
| Object storage | documents + stop photos | grows steadily |
| Cold storage | indefinite retention (DEC-094) | the reason tiering exists (G-042) |
| SMS / OTP | logins and notifications | real per-message cost — the passcode option (DEC-028) reduces it |
| Payment provider fees | transaction volume | per-transaction + payout fees |
| Maps geocoding | address searches | the one paid map service (R5.2) |
Three sizing scenarios (pilot corridor / one city / multi-city) to be produced with real quotes
before launch.

## 15.4 Scaling path
1. Vertical first — bigger machines are cheaper than complexity.
2. Then horizontal API containers behind the load balancer.
3. Then read replicas for analytics so reporting never touches the hot path (R9.8).
4. Only then extract a module into a service — `matching` first, on CPU pressure (CH8a Q8a.2).

## 15.5 Open items
- Real cost quotes per scenario — EXTERNAL (vendor quotes needed)
- ~~Backup schedule~~ — CLOSED by DEC-164: nightly, retained 30 days, restore drill monthly.
- ~~OSRM deployment~~ — CLOSED by DEC-163: one instance per city.


---

# CHAPTER 18 — Operations Runbook

Status: DRAFT v1. Implements DEC-142. Complements CH12 §12.6 (what the SOFTWARE does) by defining
what the PEOPLE do: who acts, in what order, within what time.

**How to read a runbook entry:** DETECT (how we know) → IMMEDIATE (first 2 minutes) →
CONTAIN (first 15 minutes) → RESOLVE → RECORD. Every entry ends with a written record; nothing is
resolved informally.

**Roles referenced:** Ops Admin · Support Agent · Manager · Super Admin · On-call responder
(DEC-095). Time targets are configuration and must be reviewed after the closed beta.

---

## 18.1 SAFETY — SOS activated by a rider or driver
| Phase | Action |
|---|---|
| DETECT | SOS event arrives with identity, live location, journey, vehicle, driver, manifest (CH12 §12.1.1). Also arrives by SMS if data failed. |
| IMMEDIATE (< 2 min) | On-call responder acknowledges IN THE SYSTEM so the rider sees someone is responding. Attempt contact on the masked channel; if silent mode was used (CH12 §12.1.1), **do not call** — use in-app text only. |
| CONTAIN (< 15 min) | Establish whether emergency services are needed. Keep the live location open. Notify the other party's side only if safe to do so. |
| RESOLVE | Emergency services if required; otherwise reach a stated outcome with the person. |
| RECORD | An incident is created automatically and **can never be dismissed without a decision** (CH12 §12.1.1). Reporter is told the outcome. |
**Never:** close an SOS as "no answer". Escalate to Ops Admin instead.

## 18.2 SAFETY — severe incident report (assault, harassment, dangerous driving, discrimination)
| Phase | Action |
|---|---|
| DETECT | Report filed via R-62, support, or SOS follow-up. Severity auto-assigned by category. |
| IMMEDIATE | **Automatic precautionary suspension of the accused driver** (CH12 §12.2). The person stops driving first, is investigated second. |
| CONTAIN | Ops Admin opens O-15 with all evidence: event log, GPS trace, manifest, masked-call metadata, prior history. Riders on any in-progress journey of that driver are re-accommodated. |
| RESOLVE | Decision with mandatory reason: no action · warning · training · suspension (duration) · permanent removal. |
| RECORD | Permanent record attached to the person. **Reporter is told the outcome** — mandatory, not optional. |

## 18.3 VEHICLE BREAKDOWN OR ACCIDENT MID-JOURNEY (F-27)
| Phase | Action |
|---|---|
| DETECT | Driver uses D-26 (abort), or Ops sees a stationary vehicle on O-17. |
| IMMEDIATE | Journey → ABORTED. Every rider on board is notified **with a concrete next step**, never a generic error (CH3 §3.6). |
| CONTAIN (< 15 min) | System prioritises these riders above new requests for re-accommodation. **Support contacts them proactively — before they contact support.** If the route has a later claimed departure, they are placed on it. |
| RESOLVE | Riders charged only for distance travelled, or nothing (CH3 §3.6). Driver safety confirmed. Vehicle marked unavailable until cleared. |
| RECORD | Incident logged with severity; repeated aborts by the same driver trigger review (DEC-138). |

## 18.4 DRIVER'S PHONE DIES MID-JOURNEY (F-26)
| Phase | Action |
|---|---|
| DETECT | Location and heartbeat stop while a journey is IN_PROGRESS. |
| IMMEDIATE | Ops attempts masked contact. Riders on board see "last updated HH:MM" rather than a frozen map (CH10 R-20). |
| CONTAIN | **The journey continues physically** — the driver keeps driving. Boarding for remaining stops falls back to the numeric code or verbal confirmation. |
| RESOLVE | After the journey, Support reconciles the manifest: riders are marked boarded/completed from the record, with an audit entry per manual mark. |
| RECORD | Logged; the driver is prompted about charging. Repeated occurrences are a review trigger. |

## 18.5 LOW DRIVER BATTERY (F-34)
| Phase | Action |
|---|---|
| DETECT | Device reports low battery (CH9 §9.5). |
| IMMEDIATE | GPS sampling reduces automatically; the driver is **warned explicitly** rather than the app silently degrading. |
| CONTAIN | If the driver is on a journey and battery is critical, Ops is alerted so 18.4 can be pre-empted. |
| RECORD | Logged for pattern analysis (a driver whose phone dies weekly needs a charger, not a suspension). |

## 18.6 UNCOVERED SLOT WITH WAITING DEMAND (CH4a §4a.6)
| Phase | Action |
|---|---|
| DETECT | Manager coverage board (G-11) shows an uncovered slot with riders waiting; alert also pushed by email/push. |
| IMMEDIATE | Push the slot as a suggestion to suitable nearby drivers. |
| CONTAIN | If still unclaimed, Manager offers a configured incentive (budget-capped, INV-29). |
| RESOLVE | If the slot remains uncovered at lock time, riders searching it receive the honest no-supply answer with alternatives (DEC-076). **Any sold subscription for that slot triggers DEC-130 compensation.** |
| RECORD | Coverage failure logged against the route for planning; repeated failures mean the slot grid or the commitment tier needs changing. |

## 18.7 DRIVER RELEASES A CLAIMED DEPARTURE THAT HAS BOOKINGS (CH4a T6)
| Phase | Action |
|---|---|
| DETECT | Release action on D-12. |
| IMMEDIATE | Slot returns to the pool **and is pushed to nearby drivers as urgent**. |
| CONTAIN | If not re-claimed before lock, affected riders are notified early with alternatives — never at departure time. |
| RESOLVE | Riders fully credited. Driver penalty applied per CH3 §3.8. |
| RECORD | Counted against the driver; repeated releases are a review trigger. |

## 18.8 CASH LIABILITY BREACH (CH6 §6.3)
| Phase | Action |
|---|---|
| DETECT | Driver's cash liability approaches `MaxCashLiability`. |
| IMMEDIATE | Driver is warned **before** the block, on D-10 and D-23 — never blocked as a surprise. |
| CONTAIN | At the limit, cash bookings are blocked; wallet bookings continue. |
| RESOLVE | Settlement, or deduction at the next weekly payout (DEC-080). |
| RECORD | Ledger entries; repeated breaches escalate to Ops. |

## 18.9 PAYMENT PROVIDER OUTAGE
| Phase | Action |
|---|---|
| DETECT | Elevated failure rate on payment intents or payouts. |
| IMMEDIATE | Wallet-funded bookings continue unaffected — **this is why wallet-first matters** (CH6 §6.2.1). Top-ups show an honest message, not a raw provider error. |
| CONTAIN | Manager may temporarily raise cash acceptance where it is enabled. |
| RESOLVE | Retry queued top-ups; reconcile when the provider recovers. |
| RECORD | Daily reconciliation (CH6 §6.9) must show no discrepancy after recovery. |

## 18.10 ROUTING ENGINE (OSRM) DEGRADED
Software behaviour is automatic (CH5 §5.9): cached matrices → Haversine × calibration, ETAs marked
approximate. **Human action:** Ops posts a service notice; Manager considers pausing street pickup
(which depends on accurate detour measurement) until routing recovers.

## 18.11 PLATFORM OUTAGE
| Phase | Action |
|---|---|
| DETECT | Monitoring/paging (CH15 §15.2). |
| IMMEDIATE | **Journeys in progress continue** — the driver app is offline-first (DEC-099) and keeps working. This is the single most valuable property of the architecture during an outage. |
| CONTAIN | Status communicated in-app and on the public site. New bookings blocked with an honest message. |
| RESOLVE | Restore; the offline outbox replays with idempotency keys, so no boarding is lost or duplicated. |
| RECORD | Post-incident review; a written record of cause and fix. |

## 18.12 DATA REQUEST FROM AUTHORITIES (CH13 §13.4)
Never grant direct database access. Produce a scoped export through the audited path; Super Admin
approval required; log who requested, who approved, what was included, when. Legal team is informed
(DEC-030).

---

## 18.13 Standing operational duties
| Cadence | Duty |
|---|---|
| Continuous | On-call SOS responder available 24/7 (DEC-095) |
| Every morning | Coverage board review for the day and the next day (G-11) |
| Daily | Financial reconciliation: ledger vs provider settlement vs cash liabilities (CH6 §6.9) |
| Daily | Clear the approval queues (O-10) |
| Weekly | Driver payouts (DEC-080); failed payouts chased |
| Weekly | Review incidents, DEC-138 threshold alerts, and repeat-signal clusters |
| Monthly | Restore drill from backup, documented (CH15 §15.2) |
| Monthly | Review the behavioural-bet metrics from DEC-141 |
| Per document expiry | Automatic suspension is automatic; Ops chases re-upload (CH2 §2.5) |

## 18.14 Open items
- Exact time targets per phase (to be set after the closed beta)
- Who staffs the on-call rota, and its handover procedure
- Escalation contact tree


---

# CHAPTER 19 — Configuration Key Catalogue

Status: DRAFT v1. Implements DEC-070, DEC-144, DEC-145. Evidence: R17.
**Every value the business can change lives here.** Nothing in this catalogue may be hard-coded.

## 19.0 How to read this
- **Scope**: the levels at which a key may be set. Resolution is most-specific-wins
  (`global → country → city → corridor → route → vehicle class → time window`).
- **Risk** (DEC-145): **L** = Manager, instant · **M** = Manager, preview required ·
  **H** = Super Admin, mandatory reason AND a stated rollback trigger before it goes live.
- **If missing**: the behaviour when the key is absent or unparseable (R17.3 — most incidents happen
  during fallback, not during the change).
- Security rules, permissions, state-machine legality and invariants are **NOT configuration**
  (CH8a §8a.4). They are code, reviewed and tested.

---

# 19.1 BUSINESS PARAMETERS (permanent · Manager-editable)

## 19.1.1 Fares and pricing (CH6, CH6a)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `RouteFlatFare` | int | minor units | 500-100000 | — (required per route) | route | **M** | Route cannot be sold; fail loudly |
| `PerKmSuggestionRate` | int | minor/km | 0-10000 | 250 | city | L | Suggestion feature disabled only |
| `UpliftMultiplier` | decimal | ratio | 0-3.0 | 0.5 | global→route→time | **M** | Street pickup disabled |
| `BandA_Max` / `BandB_Max` / `BandC_Max` | int | minutes | 0-30 | 2 / 5 / 9 | city→corridor | **M** | Street pickup disabled |
| `BandA_Fee` / `BandB_Fee` / `BandC_Fee` | int | minor units | 0-50000 | 0 / 400 / 900 | city→corridor | **M** | Street pickup disabled |
| `CostPerKm` | int | minor/km | 0-10000 | 300 | city→vehicle class | **M** | Layer 3 skipped |
| `CostPerMinute` | int | minor/min | 0-5000 | 50 | city→vehicle class | **M** | Layer 3 skipped |
| `MinPrice` / `MaxPrice` | int | minor units | — | fare+100 / fare×3 | route | **H** | Clamps disabled — dangerous, alert |
| `TemporaryPriceMultiplier` | decimal | ratio | 1.0-2.0 | 1.0 | route→time window | **H** | 1.0 (no change) |
| `StreetPickupPeakDisabled` | bool | — | — | false | route→time window | **M** | false |

## 19.1.2 Routes, slots and coverage (CH4a)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `SlotIntervalMinutes` | int | minutes | 5-120 | 15 | route | **M** | Route publishes no slots |
| `ServiceWindowStart` / `End` | time | local | — | 06:00 / 22:00 | route | **M** | Route inactive |
| `TargetFrequencyMinutes` | int | minutes | 5-120 | 15 | route | L | No coverage target shown |
| `MaxVehiclesPerSlot` | int | count | 1-10 | 1 | route→slot | **M** | 1 |
| `MaxClaimLeadDays` | int | days | 1-30 | 7 | city | L | 7 |
| `MinClaimLeadMinutes` | int | minutes | 0-240 | 30 | city | L | 30 |
| `LockBeforeDepartureMinutes` | int | minutes | 0-120 | 10 | route | **M** | 10 |
| `MinViableSeats` | int | count | 0-20 | 0 (always run) | route | **M** | 0 |
| `AlwaysRunClaimedSlots` | bool | — | — | true | route | **M** | true |
| `UncoveredSlotIncentive` | int | minor units | 0-100000 | 0 | slot | **M** | 0 (no incentive) |

## 19.1.3 Matching and service quality (CH5)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `MaxScheduleSlip` | int | minutes | 1-60 | 10 | city→route | **M** | 10 |
| `JourneyDetourBudget` | int | minutes | 0-60 | 12 | city→corridor | **M** | 0 (no deviations) |
| `HighOccupancyThreshold` | decimal | ratio | 0-1.0 | 0.8 | city→vehicle class | **M** | 0.8 |
| `MinBatchWindow` / `MaxBatchWindow` | int | seconds | 5-180 | 20 / 60 | city | **H** | 20 / 60 |
| `OptimiserDeadlineMs` | int | ms | 50-5000 | 800 | city | **H** | 800 |
| `SeatHoldSeconds` | int | seconds | 30-600 | 120 | city | **M** | 120 |
| `w_detour` `w_walk` `w_wait` `w_ride` `w_slip` `w_empty` | decimal | weight | 0-10 | 1.0 / 1.0 / 1.0 / 1.0 / 3.0 / 0.5 | city→time | **H** | 1.0 each; `w_slip` 3.0 |
| `w_fairness` | decimal | weight | 0-10 | **0** (DEC-075) | city | **H** | 0 |
| `DriverWaitAtStopMinutes` | int | minutes | 0-30 | 10 (DEC-052) | route | **M** | 10 |

## 19.1.4 Money, cancellation and payouts (CH6)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `CancellationForfeitPercent` | int | % | 0-100 | 50 (DEC-055) | city | **H** | 0 (fail generous, never over-charge) |
| `PostLockForfeitPercent` | int | % | 0-100 | 100 (DEC-148) | city | **H** | 0 (fail generous) |
| `NoShowChargePercent` | int | % | 0-100 | 100 (DEC-150) | city | **H** | 0 (fail generous) |
| `DriverReleasePenaltyBasis` | enum | — | COMMISSION_ON_LOST / FLAT / NONE | COMMISSION_ON_LOST (DEC-149) | city | **H** | NONE (fail generous to the driver) |
| `SubscriptionUnusedDayPolicy` | enum | — | EXPIRE / ROLLOVER / CREDIT | EXPIRE (DEC-154) | city | **H** | EXPIRE |
| `CommissionPercent` | decimal | % | 0-50 | 20 | city→route→driver segment | **H** | Block payouts; alert. Never guess a commission |
| `RevenueModel` | enum | — | COMMISSION / DRIVER_SUBSCRIPTION / HYBRID | COMMISSION | city | **H** | COMMISSION |
| `MinPayoutThreshold` | int | minor units | 0-500000 | 100000 | city | **M** | 100000 |
| `PayoutCadence` | enum | — | WEEKLY / DAILY / ON_DEMAND | WEEKLY | city | **H** | WEEKLY |
| `MaxCashLiability` | int | minor units | 0-500000 | 50000 | city→driver | **H** | 0 (block cash — fail closed) |
| `SupportRefundLimit` | int | minor units | 0-50000 | 1 ride fare (DEC-155) | global | **H** | 0 (escalate everything) |
| `SupportRefundsPerAgentPerDay` | int | count | 0-20 | 3 (DEC-155) | global | **H** | 0 (escalate everything) |
| `CashEnabled` | bool | — | — | true | city→route→driver | **M** | false (fail closed) |
| `SubscriptionFailureCompensation` | int | minor units | 0-100000 | 2000 | city | **M** | 0 (day credit only) |

## 19.1.5 Growth and rewards (CH7)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `ReferralRewardAmount` | int | minor units | 0-100000 | 2000 | city | **M** | 0 |
| `ShareRewardAmount` | int | minor units | 0-100000 | 1000 | city | **M** | 0 |
| `StreakThresholdDays` / `StreakReward` | int | days / minor | 2-30 / 0-100000 | 5 / 2000 | city | **M** | Streaks off |
| `RewardCapPerUserPerPeriod` | int | minor units | 0-500000 | 20000 | city | **H** | 0 (fail closed) |
| `PromotionBudget` | int | minor units | 0-∞ | — (required) | promotion | **H** | Promotion cannot start |

## 19.1.6 Notifications (CH20)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `BehaviouralCapPerDay` | int | count | 0-10 | 2 | city | L | 2 |
| `BehaviouralMinGapHours` | int | hours | 0-24 | 4 | city | L | 4 |
| `PromotionalCapPerDay` / `PerWeek` | int | count | 0-5 / 0-20 | 1 / 5 | city | L | 1 / 5 |
| `GlobalNonTransactionalCapPer24h` | int | count | 0-10 | 3 | city | L | 3 |
| `QuietHoursStart` / `End` | time | local | — | 22:00 / 07:00 | city | L | No quiet hours |
| `AlarmFirstReminderMinutes` | int | minutes | 5-60 | 15 (DEC-165, rider-adjustable) | city→user | L | 15 |
| `AlarmSecondReminderMinutes` | int | minutes | 1-30 | 5 (DEC-165) | city | L | 5 |

## 19.1.7 Safety (CH12)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `ReportRateReviewThreshold` | decimal | ratio | 0-1.0 | 0.10 (DEC-138) | city | **H** | 0.10 |
| `ReportRateMinRides` | int | count | 1-500 | 20 | city | **H** | 20 |
| `ReportRateWindowRides` | int | count | 10-1000 | 100 | city | **H** | 100 |
| `CategoryClusterCount` / `WindowDays` | int | count / days | 2-10 / 1-90 | 3 / 30 | city | **H** | 3 / 30 |
| `SuspensionLadderDays` | list | days | — | [warning, 7, 30, permanent] (DEC-156) | city | **H** | permanent (fail safe) |
| `RiderBlockingEnabled` | bool | — | — | true (DEC-158) | city | **M** | true |
| `OpsQueueSlaHours` | map | hours | — | **unset — set after beta (DEC-161)** | city→queue | **M** | no SLA enforced |
| `AlertOccupancyThreshold` / `AlertWindowMinutes` | decimal / int | ratio / min | — | **unset — set after beta (DEC-161)** | city→zone | **M** | alerting off |
| `SevereCategories` | list | — | — | assault, harassment, dangerous driving, discrimination | global | **H** | All categories treated as severe (fail safe) |

---

# 19.2 FEATURE TOGGLES (temporary · owned · expiring)
Per R17.1 and Unleash guidance, every toggle has an **owner** and an **expiry date**, and is
**deleted** after rollout. A toggle still present past its expiry is a defect raised in the audit.

| Toggle | Purpose | Owner | Expiry | Default |
|---|---|---|---|---|
| `ff_street_pickup` | Enable the street-pickup ticket per city | Product | at launch+90d | off |
| `ff_subscriptions` | Enable subscription sales per city | Product | at launch+90d | off |
| `ff_recurring_claims` | Driver recurring slot claims | Product | at launch+90d | off |
| `ff_batch_optimiser` | Matching stage 3 on/off | Eng | when proven | off |
| `ff_overnight_planner` | Matching stage 5 on/off | Eng | when proven | off |
| `ff_women_preference` | Women-only vehicle preference (DEC-093) per city | Product | when supply allows | off |
| `ff_alight_signal_prompt` | Extra prompting for the alight button (G-053 response) | Product | after beta review | off |

---

# 19.3 SYSTEM TUNING (technical · Super Admin only)
| Key | Type | Default | Notes |
|---|---|---|---|
| `H3Resolution` | int | 8 | Changing this invalidates the geo index |
| `InitialKRing` / `MaxKRing` / `MinCandidates` | int | 1 / 4 / 10 | Candidate search expansion |
| `GpsHighFrequencySeconds` / `GpsLowFrequencySeconds` | int | 4 / 45 | Adaptive sampling (DEC-090) |
| `GpsLowBatteryFrequencySeconds` | int | 90 | Battery guard (F-34) |
| `OutboxRetryBackoffMs` | int | 1000 base, exponential | Offline sync |
| `RoutingProvider` | enum | OSRM | Per city (DEC-105) |
| `GeocodingProvider` | enum | commercial | Per city |
| `ColdStorageAfterDays` | int | 180 | Tiering, not deletion (DEC-094) |
| `BackupRetentionDays` | int | 30 | DEC-164; nightly backups, monthly restore drill |
| `ConfigCacheTtlSeconds` | int | 30 | How fast a change propagates |

---

## 19.4 Rules that apply to every key
1. **Versioned, never overwritten.** A past booking must be explainable by the config live at the
   time (INV-22).
2. **Attributed with a mandatory reason.**
3. **Validated on write** against type, range and unit. An out-of-range write is refused with a
   plain message naming the limit.
4. **Preview before publish** for MEDIUM and HIGH risk (CH6a §6a.4).
5. **A rollback trigger must be stated before a HIGH-risk change goes live** (R17.5).
6. **One-click rollback** to the previous version.
7. **Startup fail-safe**: if the config store is unavailable, use last-known-good and alert; never
   start with silent defaults for HIGH-risk keys (R17.3).
8. Changes propagate within `ConfigCacheTtlSeconds`; the dashboard shows when a change is live.

## 19.5 Open items
- Real default values for Alexandria must be set by simulation before launch (CH14 §14.3) —
  the defaults above are starting points, not evidence-based settings.


---

# CHAPTER 20 — Notification & Message Catalogue

Status: DRAFT v1. Implements DEC-146, DEC-147, CH10 §10.6. Evidence: R18.
Every message the system can send, its trigger, tier, channel, and whether it can be turned off.

## 20.0 The three tiers (R18.1)
| Tier | Meaning | Cap | Can the user disable it? | Retried? |
|---|---|---|---|---|
| **TRANSACTIONAL** | Something happened to a thing you bought or are doing | **Unlimited** — never suppressed by other caps | **No** (operationally essential) | **Yes** |
| **BEHAVIOURAL** | Prompted by your action or inaction | 2/day, 4h gap | Yes | No |
| **PROMOTIONAL** | Marketing | 1/day, 5/week | Yes (opt-in only) | No |
Global cap on non-transactional: **3 per 24h**. Quiet hours apply to behavioural and promotional
only. All caps are configuration (CH19 §19.1.6).

## 20.1 Channel policy (DEC-147)
**Push only. No SMS fallback except OTP.** Consequence accepted and mitigated (G-055):
- The arrival alarm must fire from **cached schedule data**, not from a live push (DEC-053).
- The waiting screen must show stop, time and QR from cache when offline (CH10 R-20).
- **Push-delivery failure rate is instrumented and reviewed weekly.**
In-app messages are always available as the reliable channel; push is best-effort.

---

## 20.2 RIDER MESSAGES

### Transactional (cannot be disabled)
| ID | Trigger | Channel | Content (both languages) | Notes |
|---|---|---|---|---|
| N-R01 | OTP requested | **SMS** | Verification code | The only SMS |
| N-R02 | Booking confirmed | push + in-app | Route, boarding point, departure, price, seats | Includes "get off anywhere on the route" |
| N-R03 | Departure lock approaching | push | "Bookings close in X minutes" | Only if unpaid/unconfirmed |
| N-R04 | **Leave now** | push + **local alarm** | "Leave now to reach {stop} by {time}" | **Must fire from cache** (DEC-147 mitigation) |
| N-R05 | **Vehicle arriving** | push + **local alarm + vibration** | "{Plate} arriving at {stop}" | Escalating (DEC-053) |
| N-R06 | Vehicle arrived | push + strong local alarm | "{Plate} is at {stop} now" | |
| N-R07 | Boarded (QR scanned) | in-app | Confirmation, seat count | Sound + haptic |
| N-R08 | Approaching your area | push | "Next stop: {stop}" | Helps riders who did not signal |
| N-R09 | Journey complete | push + in-app | Receipt summary | |
| N-R10 | Departure delayed beyond `MaxScheduleSlip` | push | Plain reason + new expected time | Honest, never silent |
| N-R11 | **Driver released the departure** | push | "Your 07:15 is being reassigned" + alternatives | Early, never at departure time (CH18 §18.7) |
| N-R12 | Journey aborted (breakdown) | push + in-app | Concrete next step, never a generic error | Support contacts proactively |
| N-R13 | Booking cancelled by system | push | Reason + full credit confirmation | |
| N-R14 | Refund/credit issued | push + in-app | Amount, reason, new wallet balance | Labelled as **credit**, not card refund |
| N-R15 | Payment failed | push + in-app | Plain reason + how to fix | Never a raw provider code |
| N-R16 | Wallet low before a subscription renewal | push | Amount needed | |
| N-R17 | Subscription renewed / expiring | push + in-app | Dates, next 5 rides | |
| N-R18 | **Subscription seat could not be provided** | push + in-app | Apology, full day credit + compensation (DEC-130) | |
| N-R19 | Incident/report outcome | in-app | Outcome of what they reported | **Mandatory** (CH12 §12.2) |
| N-R20 | SOS acknowledged | push + in-app | Who is responding | **Silent mode: in-app text only, no push sound** |
| N-R21 | Account/security change | push + in-app | What changed, and how to report it if not them | |

### Behavioural (disableable)
| ID | Trigger | Content |
|---|---|---|
| N-R30 | Searched a route with no coverage, then a slot gets claimed | "A 07:15 on {route} is now available" |
| N-R31 | Rode the same route 3+ times | Suggest a subscription **with the trial day** (DEC-100) |
| N-R32 | Streak at risk | "Ride today to keep your {n}-day streak" |
| N-R33 | Someone joined a journey they shared | "You earned {amount}" (DEC-139) |
| N-R34 | Referral completed a first ride | "You both earned {amount}" |
| N-R35 | Left a booking unconfirmed | "Your seat hold expires in X minutes" |

### Promotional (opt-in only)
| ID | Trigger | Content |
|---|---|---|
| N-R40 | Manager flash sale targeting this rider's route | Discount, validity window |
| N-R41 | New route opened near them | Route, fare, frequency |
| N-R42 | Product news | Rare, batched |

---

## 20.3 DRIVER MESSAGES

### Transactional
| ID | Trigger | Channel | Content |
|---|---|---|---|
| N-D01 | Document approved / needs fix / rejected | push + in-app | Reason in the driver's language |
| N-D02 | Document expiring | push | 30/14/7/1 days before (CH2 §2.5) |
| N-D03 | **Auto-suspended (document expired)** | push + in-app | What expired, how to fix |
| N-D04 | Slot claim confirmed | push + in-app | Route, slot, date, vehicle |
| N-D05 | Departure starting soon | push | "Your 07:15 starts in 30 min · 6 riders booked" |
| N-D06 | Rider booked / cancelled on their departure | in-app | Updated manifest count |
| N-D07 | Rider signalled alighting | in-app + audio | "Stop at {stop} — 1 alighting" (DEC-117) |
| N-D08 | Payout sent / failed | push + in-app | Amount, or plain failure reason |
| N-D09 | **Cash liability approaching limit** | push + in-app | "Settle {amount} to keep accepting cash" — **before** the block (CH18 §18.8) |
| N-D10 | Cash bookings blocked | push + in-app | Why, and how to clear it |
| N-D11 | Incident opened / precautionary suspension | push + in-app | What happens next, appeal path |
| N-D12 | Low battery during a journey | in-app + audio | Warning, not silent degradation (F-34) |
| N-D13 | Sync restored, queued actions sent | in-app | Count synced |

### Behavioural
| ID | Trigger | Content |
|---|---|---|
| N-D20 | **Uncovered high-demand slot nearby** | "07:15 {route} · 8 riders waiting · unclaimed" (CH4a §4a.6) |
| N-D21 | Incentive offered on an uncovered slot | Amount and expiry |
| N-D22 | Recurring claim about to lapse | Renew prompt |
| N-D23 | Went offline during their usual hours | Gentle nudge, respects caps |

---

## 20.4 STAFF MESSAGES (email/push, no caps — operational)
| ID | Recipient | Trigger |
|---|---|---|
| N-S01 | On-call | **SOS activated** — immediate, bypasses everything |
| N-S02 | Ops | Severe incident reported / precautionary suspension applied |
| N-S03 | Ops | Journey aborted with riders on board |
| N-S04 | Ops | Driver phone offline mid-journey |
| N-S05 | Ops | Approval queue exceeds SLA age |
| N-S06 | Manager | Coverage gap with waiting demand (G-11) |
| N-S07 | Manager | Promotion budget 80% / 100% consumed |
| N-S08 | Manager | Occupancy threshold breach (DEC-101 alerts) |
| N-S09 | Super Admin | Reconciliation discrepancy (CH6 §6.9) |
| N-S10 | Super Admin | Backup or restore-drill failure |
| N-S11 | Ops | Subscription sold against a slot that lost committed coverage (INV-33 risk) |

---

## 20.5 Content rules
1. **Both languages, always.** Content is a translation key, never server-side English (CH9 §9.3).
2. **One purpose, one action** per message.
3. **Plain words.** No internal vocabulary (Journey, slot, policy) in rider messages (U6).
4. **Never a raw provider or system error.** Always a human sentence.
5. **Times in local wall-clock** (DEC-118), numerals per user preference.
6. **Plate numbers and codes render LTR** inside Arabic text (CH10a §10a.5).
7. Deep-link every message to the exact screen it refers to.

## 20.6 Suppression and safety rules
- Transactional messages are **never** suppressed by caps or quiet hours (R18.2).
- Safety messages (SOS, incident) ignore every cap and every preference.
- **Silent-mode SOS produces no audible push** (CH18 §18.1) — a sound could endanger the rider.
- Only transactional messages are retried (R18.4).
- Campaign sends are rate-limited **per user**, not per campaign (CH10 §10.6).

## 20.7 Required metrics (screen G-18)
Delivery rate per channel · **push-delivery failure rate (G-055)** · open rate by tier ·
**7-day rolling opt-out rate, reviewed weekly (R18.6)** · uninstalls following a send ·
alarm-fired-vs-boarded rate for N-R05/N-R06.

## 20.8 Open items
- Exact copy for each message in Arabic and English (a copywriting task)
- Whether N-R08 "approaching your area" is useful or noisy — measure after the beta


---

# PART III — DECISIONS REGISTER (DEC-001..169)

## Batch 1 — Product foundation (2026-07-29)

| ID | Question | DECISION (user's words preserved) | Rationale | Status |
|----|----------|-----------------------------------|-----------|--------|
| DEC-001 | What kind of shared-ride product? | "hybrid between these": A (commercial pooled taxi) + B (commuter carpooling) + C (managed shuttle/vanpool). ALL THREE. | User wants one platform covering the full spectrum of shared mobility. | CONFIRMED |
| DEC-002 | Which market first? | "we will start in alexandria egypt then cairo" AND must also be market-agnostic "to be easy for scaling". | Local launch, global architecture. | CONFIRMED |
| DEC-003 | Who puts cars into the system? | Option C — BOTH: self-service registration into an approval queue AND direct admin creation, one registry. | Resolves the conflict in the original idea. | CONFIRMED |
| DEC-004 | How do passengers and cars meet? | "all and smart system decide": fixed stops (skip stop if nobody assigned), on-route pickup at higher price, door-to-door at highest price. | Tiered, system-optimised, monetised comfort. | CONFIRMED |

## Batch 2 — Strategy and resources (2026-07-29)

| ID | Question | DECISION (user's words preserved) | Rationale | Status |
|----|----------|-----------------------------------|-----------|--------|
| DEC-005 | Which mode launches first? | "start first by marketing in universities and calling companies that owns vehicles for the start but the design must be ready and suitable for all". | Universities = dense, predictable, closed-community demand. Fleet-owning companies = instant supply. | CONFIRMED |
| DEC-006 | MVP or full product? | "i dont want mvp i want the full thing". Later refined: "we need to build everything before launching". | User wants a complete, finished product at launch. | CONFIRMED |
| DEC-007 | Who builds it? | "we are the only developers" + "i can create you a team when needed but you are the head, give them the files and tasks and they will do them". | Agent acts as technical lead producing task-decomposed work packages executable by hired developers. | CONFIRMED |
| DEC-008 | Reuse open source? | "we can use any open source existings we can search github and adapt things if there is anything can help us". | OSS-first, with mandatory vetting per rules section 16. | CONFIRMED |
| DEC-009 | Where does processing happen? | Delegated to agent: "what is the best practice, what is the outputs of the research". AGENT ANSWER: HYBRID, server-authoritative (see 02_ARCHITECTURE_ANALYSIS.md A1). | Matching needs global view + batching; money/safety must be server-side; device handles display, GPS filtering, offline outbox. | CONFIRMED (agent-decided by delegation) |
| DEC-010 | Depth of the final document? | "build ready thing, with every decision and details everything" + separate file recording all user decisions. | This file (DECISIONS_REGISTER.md) is that separate file. | CONFIRMED |
| DEC-011 | Technology stack? | Delegated to agent: "choose the most suitable the best thing... the more it dynamic and cross platform". AGENT ANSWER: see DEC-012 below. | User prioritises best practice, dynamism, cross-platform reach. | CONFIRMED (delegated) |

## Batch 2b — Agent decisions made under delegation (2026-07-29)

| ID | Decision area | AGENT DECISION | Evidence | Status |
|----|---------------|----------------|----------|--------|
| DEC-012 | Stack | *(mobile clause SUPERSEDED by DEC-176.)* TypeScript end-to-end: Next.js (web + admin) + React Native/Expo (rider, driver, and shuttle apps) + NestJS (backend) + PostgreSQL 16 + PostGIS + Redis + self-hosted OSRM/Valhalla + OR-Tools microservice (Python) for the offline optimiser only. | See 02_ARCHITECTURE_ANALYSIS.md A4. | PROPOSED — awaiting user confirmation → **SUPERSEDED by the later row for DEC-012** |
| DEC-013 | Team model | Agent produces per-role work packages (spec + acceptance criteria + tests) that hired developers execute; agent reviews. Requires a contributor handbook in the final document. | DEC-007. | PROPOSED |

## Batch 3 — Platform shape (2026-07-29)

| ID | Question | DECISION (user's words preserved) | Rationale | Status |
|----|----------|-----------------------------------|-----------|--------|
| DEC-012 | Technology stack | APPROVED (option A). TypeScript everywhere + Python OR-Tools service. | See 02_ARCHITECTURE_ANALYSIS.md A4. | CONFIRMED |
| DEC-014 | How many apps? | "i want one thing that directly detect the account and open the suitable ui, and the website also the same thing". ONE unified product that adapts its UI to the logged-in role. | Single brand, single download, single codebase; role detected at login. | CONFIRMED |
| DEC-015 | Delivery order of platforms | "we will start by website, then convert into app". WEB FIRST, then mobile app. | Faster iteration, no store review, immediate demos to universities/companies. | CONFIRMED |
| DEC-016 | Web responsiveness | Website must work on mobile, tablet and PC (true responsive, cross-platform). | Web is the launch surface, so it must serve drivers on phones too. | CONFIRMED |
| DEC-017 | Localization | Option C — full i18n framework, launching with Arabic + English, full RTL, new language = translation file only. | Supports market-agnostic scaling (DEC-002). | CONFIRMED |
| DEC-018 | Chapter sequencing | "move in the right logical arrangement bec things depend on each other, find the points we need to do and arrange them first then move one by one". Agent must produce a dependency-ordered chapter plan first. | Prevents rework from deciding things out of order. | CONFIRMED |

## Batch 4 — Domain model (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-019 | One model or three? | Delegated to agent ("search and decide for me"). AGENT ANSWER: ONE universal core model — Journey + Booking + RideRequest, with four named policy objects. | Mirrors GTFS-Flex (official spec since March 2024) which handles fixed/deviated/dial-a-ride as attributes of one structure; 1x build cost instead of 3x; future GTFS-Flex export. | PROPOSED — awaiting confirmation → **SUPERSEDED by the later row for DEC-019** |
| DEC-020 | Who creates a journey? | User: "both... the app can suggest the most suitable from existing ones but if the user insists to create new one he can do it... but I want very very very easy to use". AGENT ANSWER: separate INTENT from MECHANISM. Riders only state intent; the system joins an existing Journey or creates a new one invisibly. "Publish a journey" is a driver/admin-only screen. | Delivers both capabilities with a one-screen rider experience. | PROPOSED — awaiting confirmation |
| DEC-021 | Banned terminology | The word "Trip" is banned from code, schema, API and docs — replaced by Journey / Booking / RideRequest. | Ambiguity was already causing confusion in session 1. | PROPOSED → **SUPERSEDED by the later row for DEC-021** |

## Batch 5 — Chapter 1 detail decisions (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-022 | Process rule | User: "give me things in the MCQ so I can approve them, I don't know what I'm approving" + "things I don't close... do not close things yourself, all must be closed and discussed through the MCQ". | Added as binding project rule P5 in AGENT_RULES.md. | CONFIRMED |
| DEC-023 | Q1.1 Transfers between vehicles | User chose B: YES, support transfers from the start. | User wants full capability. AGENT CAUTION: this is the hardest failure mode in shared transport (stranded passenger). Mitigation options must be decided before this is final. | CONFIRMED (mitigation OPEN) |
| DEC-024 | Q1.2 Booking for someone else | User chose B: NO, every rider books for themselves only. | Simplest and safest identity model. AGENT CAUTION: this blocks school transport, parents booking for students, and HR booking for visitors — all relevant to the university/corporate go-to-market (DEC-005). Consequence must be confirmed. | CONFIRMED (consequence review OPEN) → **SUPERSEDED by the later row for DEC-024** |

## Batch 6 — Chapter 1 closure (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-019 | One model or three? | CONFIRMED option A: ONE universal internal model with policy settings. | GTFS-Flex precedent; 1x build cost; shared wallet/history/rating; future GTFS export. | CONFIRMED |
| DEC-021 | Ban the word "Trip"? | CONFIRMED: banned. Use Journey / Booking / RideRequest. | Removes a whole class of ambiguity bugs for hired developers. | CONFIRMED |
| DEC-024 | Booking for others? | CONFIRMED strict: every rider books for themselves ONLY. No org booking, no family booking. | User re-confirmed after being shown the cost. Every person in every vehicle is a verified account. | CONFIRMED |
| DEC-025 | Transfer failure handling | User: "best effort and each one consider separated journey if one succeed the second fail only refund the failed". Transfers are NOT a guaranteed product feature — each leg is an INDEPENDENT Booking, refunded independently. | Radically simplifies the model: there is no "transfer" object at all. | CONFIRMED |

### DEC-025 consequences (agent analysis, IMPORTANT — simplifies the architecture)
Because each leg is an independent Booking with independent refunding:
1. There is NO transfer entity, no linked-booking table, no connection-protection logic. The domain
   model of CH1 is unchanged and stays simple.
2. The system may still SUGGEST a two-leg option, but it must be presented honestly as two separate
   bookings with a clear warning that the second is not guaranteed.
3. Refund of a failed leg is just the normal single-booking cancellation/refund path — no new code.
4. RESIDUAL RISK (must stay visible): a rider whose second leg fails is refunded but still stranded.
   The reputational damage of a stranded student is real even when the money is returned. Proposed
   mitigations, to be decided later in CH12 (Trust & Safety), NOT closed here:
   - only offer multi-leg options in daylight hours,
   - only offer them at hubs with high vehicle frequency,
   - show a plain warning before booking,
   - surface a "get me home" fallback (paid private ride) rather than nothing.

## Batch 7 — Chapter 2 foundation (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-026 | Account types | Option B: FOUR roles — Rider, Driver, Organization Manager, Admin. | User chose the simpler set. AGENT CAUTION: no separate Support role means every support employee has full admin power over money and user data. Re-raise before build. | CONFIRMED (caution logged G-016) |
| DEC-027 | One account, many roles? | Option A: YES. One login can be Rider and Driver simultaneously, with an in-app switch. | Essential for carpool supply growth (DEC-003 self-registration). | CONFIRMED |
| DEC-028 | Identity / login | Phone number + SMS OTP is MANDATORY and is the identity of record. Users may ADDITIONALLY set a passcode/password and add an email to the account. | Phone is universal in Egypt; passcode avoids paying for an SMS on every login; email is optional convenience/recovery. | CONFIRMED |
| DEC-029 | **ORGANIZATION-AGNOSTIC PRODUCT** (major) | User: "it should be organization agnostic, we just ride like uber, the idea of targeting universities or companies is just marketing thing, but you just book and ride you do not know what company or what thing you ride as user normal user". Journeys MAY serve multiple organizations; riders never see organizational boundaries. | The product is a PUBLIC open network. Universities/companies are DEMAND ACQUISITION CHANNELS and SUPPLY SOURCES, not walled gardens. | CONFIRMED |

### DEC-029 consequences (agent analysis — this is the biggest re-framing so far)
POSITIVE:
1. One liquidity pool. Every vehicle can serve every rider -> far better matching density, which is
   the single strongest driver of pooling quality (R4.x). Walled gardens fragment liquidity.
2. Radically simpler rider UX, consistent with DEC-020 (intent, not mechanism) and the "very very
   very easy" requirement: the rider never picks a mode, an operator, or an organization.
3. Organizations become a SUPPLY and SUBSIDY layer, not a partition of the network.
NEGATIVE / MUST BE FACED:
4. **LEGAL: this re-opens G-006.** A closed-community/B2B transport service is the legally light
   path in Egypt (R1.8, Swvl's own position). An OPEN PUBLIC service where any person books any
   vehicle is precisely what the ride-hailing law targets (R1.1-R1.7), including the reported
   EGP 30M operating licence. Being organization-agnostic moves us INTO the regulated category.
   This must be confronted, not glossed over. -> new gap G-017.
5. The role "Organization Manager" (DEC-026) still exists, but its meaning changes: it manages the
   organization's VEHICLES, DRIVERS, SUBSIDIES and REPORTING — it does NOT own a private rider pool.
6. Billing model changes: organizations pay for subsidies/benefits consumed by their members, not
   for a private service. Needs a design in CH6.

## Batch 8 — Major simplification (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-030 | Legal strategy | User: "we do not need to talk about anything legal, there is a legal team who will manage that". LEGAL IS OUT OF SCOPE for this document. | The agent will not design legal structure. Agent obligation retained: where a technical choice has a legal dependency, it is FLAGGED once in the risk chapter and handed to the legal team — never silently assumed. | CONFIRMED |
| DEC-031 | Organizations | User: "no organizations at all in our app, at all". The Organization entity is REMOVED ENTIRELY from the product. No Organization Manager role, no org accounts, no org billing, no org subsidies. | Maximum simplicity. Universities and companies remain purely OFFLINE marketing/sales channels; they have no representation in the software. | CONFIRMED |
| DEC-032 | Support role | Option A: ADD a Support Agent role with limited powers (view active journeys, contact users, cancel a ride, refund up to a limit, escalate) and explicit prohibitions (no fare edits, no wallet edits, no account deletion, no data export, no vehicle approval). | Prevents the most common insider-fraud pattern. | CONFIRMED |

### Final role list after DEC-031 + DEC-032 (supersedes DEC-026)
1. **Rider** 2. **Driver** 3. **Support Agent** 4. **Platform Admin**
(Still four roles: Organization Manager removed, Support Agent added.)

### DEC-031 consequences (agent analysis)
REMOVED from the entire specification — no work will be done on any of these:
- Organization entity, org membership, org verification, org billing, org dashboards,
  org subsidies, org-private journeys, multi-org cost splitting, corporate reporting.
SIMPLIFIED as a result:
- Chapter 11 shrinks from "Admin + Organization dashboards" to "Admin dashboard" only.
- The permissions model drops an entire dimension (no per-org scoping of data access).
- Fare model (CH6) has only ONE payer type: the rider (plus platform promotions).
- The vehicle registry keeps its two entry doors (DEC-003) but "who owns the vehicle" becomes a
  simple attribute on the Vehicle record, not a relationship to an Organization account.
QUESTION THIS RE-OPENS (must be asked, not assumed):
- If a company owns 20 vans and wants them on the platform, HOW do those vans get in, and who
  manages them day to day, now that there is no organization account? -> MCQ next.

## Batch 9 — Supply & verification (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-033 | Fleet mechanism (G-018) | User chose A + B + C together: (A) fleet drivers can self-register as normal Driver accounts; (B) admins can enter vehicles and link drivers; (C) vehicles carry an optional lightweight FLEET LABEL so admins can view/manage them as a group. NO organization account, NO org login, NO org billing, invisible to riders. | Covers every real-world path while keeping DEC-031 (no organizations) intact. | CONFIRMED |
| DEC-034 | Who can add a vehicle | Confirmed DEC-003 survives: BOTH self-service driver registration (into an approval queue) AND direct admin creation, into ONE vehicle registry. | Preserves the "call companies with vehicles" sales channel. | CONFIRMED |
| DEC-035 | Driver verification | STRICT and manual: national ID + driving licence + vehicle licence + photo + verified mobile phone, all reviewed by a human admin BEFORE the driver may accept any ride. | Safety incidents are existential; riders are getting into a stranger's car. | CONFIRMED |

## Batch 10 — Vehicle ownership, scope, stops (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-036 | Driving a car you don't own | Option A: a driver may ONLY drive a vehicle registered in their own name (vehicle licence name must match national ID). | Simplest, safest, no consent-document handling. AGENT CONFLICT WARNING: this contradicts DEC-033/DEC-034 (company with 20 vans) — a company-owned van is by definition not in the driver's name. See G-019. | CONFIRMED (conflict OPEN) |
| DEC-037 | Parcels / goods | Option A: NO. People only. Parcels are not part of this product. | Keeps scope focused; avoids insurance/liability/chain-of-custody complexity. Recorded as a possible future product, not designed for. | CONFIRMED |
| DEC-038 | Where meeting points come from | Option A: ADMIN-CURATED ONLY. Every meeting point is created and verified by an admin (lit? can a car stop? near a landmark? safe at night?). No auto-generation, no crowd-sourcing in v1. | Stop quality directly determines rider trust. AGENT NOTE: this makes city mapping a launch prerequisite — see G-020. | CONFIRMED (workload OPEN) |

## Batch 11 — Vehicle binding & stop mapping (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-039 | G-019 resolution — vehicle ownership | SUPERSEDES DEC-036. User: "like Uber... the system needs only the account of the driver and does not need the deeper details. If the driver changes the car at some point it is normal, if all the details are accepted and legal — the system does not care." DECISION: the DRIVER is the accountable entity; the VEHICLE is an attribute the driver declares and an admin approves. Ownership matching is NOT enforced by the system. A driver may have multiple approved vehicles and switch between them. | Matches how Uber/Careem actually work; unblocks fleet vans and family cars; legality of the paperwork is the legal team's domain (DEC-030), not the software's. | CONFIRMED |
| DEC-040 | Pre-launch mapping | A dedicated MAPPING TEAM will map all of Alexandria before launch, using purpose-built internal tools. Stops may be updated continuously after the initial mapping. | User will resource this. Creates a hard product requirement: an internal Stop Mapping Tool is part of the build (not optional tooling). | CONFIRMED |
| DEC-041 | Stops served per journey | "each car journey not necessarily stops at each point, it picks some only" — a Journey serves only the subset of stops where someone is actually boarding/alighting. Confirms and generalises DEC-004's skip-empty-stop rule. | Core efficiency mechanism. | CONFIRMED |
| DEC-042 | Stop data richness | Option B: MINIMAL — name + coordinates only. | User prioritises mapping speed. AGENT CAUTION: with no night-safety or accessibility attributes, the system cannot make "smart" stop choices (avoid unlit stops at night, suitable stops for elderly/disabled riders), and DEC-004's auto-upgrade-for-accessibility idea becomes unimplementable. Re-survey later would be expensive. Logged as G-021 for review. | CONFIRMED (caution logged) |

### DEC-039 consequences (agent analysis)
- INV-12 (from CH2) is REVOKED. Replaced by:
  - INV-12b A Journey references exactly one approved Driver and one approved Vehicle; the vehicle
    must be in that driver's list of approved vehicles. No ownership relationship is asserted.
- Vehicle records still capture plate, model, colour, capacity, and document images/expiries,
  because riders must identify the car and admins must verify it. What is NOT captured or enforced
  is a legal ownership link to the driver.
- The `fleet_label` (DEC-033) still works: an admin can tag many vehicles as one real-world fleet.
- Driver may hold N approved vehicles; exactly one is ACTIVE at any time; switching is an audited
  action so every Journey record knows which car actually carried the riders.

## Batch 12 — Stop data, walking, and a NEW role requirement (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-043 | Stop data (supersedes DEC-042) | MANDATORY: name + map location ONLY. OPTIONAL and encouraged: night-safe flag, accessible flag, MULTIPLE photos, description, and further attributes. | Mapping stays fast (nothing blocks a mapper), while richer data can be added whenever available. Resolves G-021 without slowing the survey. | CONFIRMED |
| DEC-044 | Walking distance | DYNAMIC, not a fixed radius. For a stops-only journey the rider is offered the CLOSEST suitable stop to them. Walking limits adapt rather than being one global number. | Rider comfort first; avoids an arbitrary city-wide constant. Full parameter design deferred to CH4/CH5. | CONFIRMED (details OPEN) |
| DEC-045 | **NEW ROLE: Manager** (business/operations) | User: "we need the dashboard with managers and so on (not admins) to be able to change rates and money, and to create flash sales... to see numbers, like if we now see a lot of buses with a lot of empty slots, we can launch a flash sale... and send notifications. The admins will answer people and make sure the operations is running seamless." A MANAGER role is added, distinct from Admin. | Separates COMMERCIAL control (pricing, promotions, campaigns, analytics) from OPERATIONAL control (support, incidents, approvals). | CONFIRMED |

### DEC-045 consequences — role list REVISED again (supersedes DEC-026/DEC-032 role list)
| Role | Purpose | Examples of powers |
|---|---|---|
| Rider | Books and rides | — |
| Driver | Carries riders | — |
| **Support Agent** | Front-line problem solving | contact users, cancel a ride, small capped refund, escalate |
| **Operations Admin** | Keeps the service running | approve drivers/vehicles, manage stops, live ops map, suspend users, handle incidents |
| **Manager** (commercial) | Runs the business side | change fares/rates, create flash sales & promotions, send campaigns/notifications, view analytics & dashboards |
| **Super Admin** | Owns the platform | grants roles, changes system parameters, sees audit log, everything |

This is now SIX roles. The user's earlier preference for four (DEC-026) is superseded by their own
later requirements. Both are recorded; DEC-045 is the current truth.

### New product surface implied by DEC-045 (must be specified, currently unspecified)
1. **Real-time commercial analytics** — live occupancy: "how many vehicles are running with how many
   empty seats, where, right now". This is a genuine live-data requirement, not a nightly report.
2. **Flash sale / promotion engine** — create a time-boxed, targeted discount on SPECIFIC journeys,
   corridors, stops or time windows; with budget caps, eligibility rules and automatic expiry.
3. **Campaign / notification engine** — targeted push/SMS/in-app messaging tied to those promotions.
4. **Manager dashboard** — separate from the operations dashboard, commercially focused.
5. **Trigger/alerting** — "alert me when occupancy in zone X drops below Y%" so a manager can act.

## Batch 13 — Roles confirmed, capacity, sequencing (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-046 | Final role list | SIX roles CONFIRMED: Rider, Driver, Support Agent, Operations Admin, Manager, Super Admin. | Separates commercial power (Manager) from operational power (Ops Admin) from platform power (Super Admin). Supersedes DEC-026 and the Batch-8 four-role list. | CONFIRMED |
| DEC-047 | Seats sold per vehicle | Option B: SELL EVERY PHYSICAL SEAT. A vehicle's sellable capacity equals its physical passenger capacity. | Maximum revenue per vehicle, lowest price per rider. AGENT CAUTION: 3 adults across the back of a small sedan in Alexandria summer is a known churn driver; comfort complaints and low ratings are the expected cost. Logged as G-025 with cheap mitigations to consider later (vehicle class tiers, or a per-vehicle override). | CONFIRMED (caution logged) |
| DEC-048 | Work sequencing | Delegated to agent: "you decide the best way". AGENT DECISION: continue in strict dependency order (CH3 next), but front-load any question whose answer would change an earlier chapter. Rationale: option C (deciding all 25 F-items now) would ask questions out of context and produce worse answers; option B (Manager dashboard first) depends on pricing, which depends on the trip lifecycle. | Dependency order protects against rework. | CONFIRMED (delegated) |

## Batch 14 — Boarding, recurring, waiting (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-049 | Boarding proof | QR CODES are the primary validation mechanism EVERYWHERE possible. GPS runs in the background as a supporting signal, never as the main proof. | User: "depend fully on QR codes in all the validations possible, the GPS must work in the background but not the main thing". AGENT NOTE: night/low-light, cracked screens, dead phones and no-signal cases need a documented fallback — see G-026. | CONFIRMED (fallback OPEN) |
| DEC-050 | Data collection | "the app must collect all the data and store them" — comprehensive event/telemetry capture is an explicit product requirement, not a by-product. | Enables analytics (DEC-045 Manager dashboards), disputes, algorithm improvement, and any future regulatory export. AGENT NOTE: "collect everything" has privacy, storage-cost and consent consequences; scope must be defined — see G-027. | CONFIRMED (scope OPEN) |
| DEC-051 | Recurring commutes | Option C: SUBSCRIPTION. Riders buy a weekly/monthly commute with guaranteed seats. | Best retention and predictable revenue; matches the model that made Swvl profitable (R2.3). AGENT NOTE: guaranteed seats require guaranteed supply — the platform now carries an obligation it must be able to honour. See G-028. | CONFIRMED (supply risk OPEN) |
| DEC-052 | Wait time at a stop | DEFAULT 10 MINUTES. The driver may choose to wait longer at their discretion. | User's choice. AGENT CAUTION: 10 min is very long for pooling — it delays every rider on board and every downstream stop. Mitigation options logged in G-029. | CONFIRMED (caution logged) |
| DEC-053 | Boarding UX requirements | Explicit UX demands: rider's phone ALARMS when the vehicle reaches the stop; driver's app scans QR codes and shows WHO IS MISSING, with one-tap contact. | Raises boarding from a transaction to a designed experience. Becomes a hard requirement in CH10. | CONFIRMED |
| DEC-054 | Money model | User: "I think we need to search and think more to create the full picture of how money works". Initial instinct recorded: strict — cancelling a bought ticket loses ~50%; a driver who accepts then cancels also loses fees. NOT FINAL. | Money design deferred to a dedicated deep-research pass in CH6. | DEFERRED — CH6 |

## Batch 15 — Money & launch coverage (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-055 | Cancellation policy | STRICT, with mandatory informed consent BEFORE purchase. The UI must explicitly warn ("this ticket cannot be cancelled without losing ~50%") and require the user to confirm. Refunds are ALWAYS issued as WALLET CREDIT, never back to the card. | User: "the UI asks the user if he wants to confirm and tells him no cancellation, then use the strictest thing, and the refund always as credit". Informed consent softens the harshness; wallet credit keeps money in the platform. AGENT CAUTION RETAINED: harsher than the local Swvl benchmark (R7.7). Monitor cancellation-related churn from day one. | CONFIRMED |
| DEC-056 | Price certainty | GUARANTEED PRICE LOCKED AT BOOKING. The rider pays exactly what was quoted, even if the vehicle ends up empty or full. The platform absorbs matching risk. | R7.3: uncertainty deterred riders more than price; ~31% of shared rides run solo at the discounted price anyway. | CONFIRMED |
| DEC-057 | Launch coverage | Start with UNIVERSITY routes. The platform must let a MANAGER open new routes/areas from the dashboard with no engineering work. The WHOLE map is always visible; areas without journeys simply show no service, making coverage self-evident to users. | Concentrated density where it is strongest, plus operator-controlled expansion. Makes "market-agnostic scaling" (DEC-002) concrete: expansion is a dashboard action. | CONFIRMED |
| DEC-058 | Fare shape | DEFERRED — user requested a plain-language explanation before deciding. | Agent to re-present in simple terms with Alexandria examples. | PENDING → **SUPERSEDED by the later row for DEC-058** |

## Batch 16 — Fares, rewards, price control (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-058 | Fare shape (resolved) | FIXED PRICE PER ROUTE. "Smouha → University = 15 EGP, always." The rider buys a ticket at a known price. | Simplest possible mental model; matches microbus/Swvl expectations; makes subscriptions (DEC-051) natural; advertisable. | CONFIRMED |
| DEC-059 | Occupancy-based pricing/rewards | REJECTED. Riders have NO visibility of how full the vehicle is and are NOT rewarded for it. "They just book a ticket then ride only." | User wants the rider experience to be a simple ticket purchase, disconnected from vehicle economics. Overrides the research-backed occupancy-discount idea (R7.2) in favour of simplicity. | CONFIRMED |
| DEC-060 | Reward mechanics (what IS rewarded) | Wallet credit is earned for: (a) SHARING A JOURNEY that results in another rider joining that journey (if seats remain), and (b) REFERRING A NEW USER to the app — both users get a reward, Uber-style. | Growth loops tied to the two behaviours that actually help the platform: filling existing journeys and acquiring users. | CONFIRMED |
| DEC-061 | Reward controllability | EVERY reward mechanism must be switchable ON/OFF and configurable from the MANAGER DASHBOARD. Nothing is hard-coded. | Business agility; lets the company stop paying for a promotion instantly. | CONFIRMED |
| DEC-062 | Price control | Managers set prices per route AND a price-per-km rate, can create EXCEPTIONS, and see the effect of changes. Changes take effect immediately. Guardrails required: full change log, sanity limits (no accidental zero fares), and clear preview of impact. "The dashboard should be advanced." | Maximum commercial agility with protection against costly mistakes. | CONFIRMED |

### Note on DEC-058 + DEC-062 together
Fixed route prices are the PRIMARY model, but a per-km rate also exists. Interpretation to confirm
in CH6: the per-km rate is the FALLBACK used to auto-price any origin/destination pair that does not
have an explicit fixed route price, and is also the basis managers use to generate suggested prices
for new routes. Exceptions override both. [To be verified with the user in the CH6 MCQ.]

## Batch 17 — Ticket types and stop choice (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-063 | Ticket types (resolves the DEC-004 vs DEC-058 conflict) | TWO ticket types only: (1) NORMAL STOP TICKET, (2) STREET/ON-ROUTE PICKUP TICKET (request the driver to stop on or near the route) which costs more. Full door-to-door as a third tier is dropped for now. Exact surcharge method deferred pending research. | Simpler than three tiers; preserves the price gap that keeps routes straight. | CONFIRMED (surcharge method PENDING) |
| DEC-064 | Walking ceiling | NO hard limit. Street pickup is ALWAYS offered as an alternative option. | User: "no limit and street pickup always proposed as option". Turns a coverage gap into an upsell instead of a rejection. AGENT CAUTION: with no ceiling the system may still surface a very distant stop; the UI must present distance honestly so the rider self-selects. | CONFIRMED |
| DEC-065 | Stop selection | The rider SEES all stops on the map and in a list, and may CHOOSE ANY of them. The system RECOMMENDS the best one. | Rider autonomy + system guidance. AGENT NOTE: allowing any stop means the rider can pick one that is poor for routing; the price/feasibility must be recomputed for whatever they choose, and infeasible choices must be shown as unavailable rather than failing after booking. | CONFIRMED |

## Batch 18 — Pricing formula & code maintainability (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-066 | Street-pickup surcharge method | COMBINE all three approaches (flat uplift + detour banding + cost recovery) into ONE formula, with every variable controllable by the Manager from the dashboard. | Gives predictability, fairness and cost protection at once; manager retains full commercial control. | CONFIRMED |
| DEC-067 | Door-to-door tier | DROPPED ENTIRELY. Two ticket types only: Stop ticket and Street/On-route pickup ticket. | Cleanest product; street pickup already covers most of the need. | CONFIRMED |
| DEC-068 | Code organisation (NEW REQUIREMENT) | Code must be organised for very easy maintenance and updates. Architecture must make changes cheap and safe. To be specified as a first-class chapter, not an afterthought. | User: "I want to discuss the organization of the code that should be very easy to maintain and update, do not miss this point". | CONFIRMED — to design in CH8 |

## Batch 19 — Engineering discipline (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-069 | Code structure | MODULAR MONOLITH. One deployable application, internally split into strictly-bounded modules with defined interfaces; no module reaches into another's internals. Seams designed so a module can be extracted into a service later without rewriting it. | Right complexity for the team size; avoids the distributed-systems tax while keeping future optionality. | CONFIRMED |
| DEC-070 | Business rules location | CONFIG-DRIVEN. Prices, bands, limits, wait times, walking rules, reward rules and feature switches live in the DATABASE as versioned configuration, editable by Managers. Code reads and applies; it never hard-codes a business value. | Makes the Manager dashboard genuinely powerful; makes multi-city expansion configuration rather than engineering (DEC-002); removes developers from the loop for commercial changes. | CONFIRMED |
| DEC-071 | Quality gates | FULL DISCIPLINE FROM DAY ONE: automated tests, static type checking, linting, mandatory code review, and a single command that verifies everything. Nothing merges unless it passes. | Essential when work is handed to rotating hired developers (DEC-007); also mandated by the user's own agent rules §6.2. | CONFIRMED |

| DEC-072 | Matching timing | ADAPTIVE batch window: short when demand is high, longer when quiet; the window is a Manager-tunable configuration value. | R4.5 (batching beats instant dispatch by a wide margin) and R9.4 (adaptive timing is standard industry practice). | CONFIRMED |
| DEC-073 | Scheduled vs live | TWO ENGINES: an overnight/offline planner (OR-Tools, full optimisation) for scheduled and subscription journeys, and a fast live engine for same-day/on-demand requests. | Subscriptions are the core product (DEC-051) and there is no time pressure overnight; use it. | CONFIRMED |
| DEC-074 | Matching engine design | APPROVED: the 6-stage layered pipeline (H3 pre-filter → feasibility → insertion heuristic → deadline-bounded batch optimiser → offer workflow → overnight VRP). | R9.1/R9.3/R9.5/R9.10. Fast answer always available; optimiser is optional improvement. | CONFIRMED |
| DEC-075 | Driver fairness in matching | PURE EFFICIENCY. The algorithm always picks the best match for the system; no fairness weighting toward lower-earning drivers. | User's choice. AGENT CAUTION: R9/industry practice includes fairness because driver supply is the hardest constraint; consistently poorly-served drivers churn. Logged as G-036 to monitor, with the fairness weight designed as a config value defaulting to zero so it can be enabled without code changes. | CONFIRMED (caution logged) |
| DEC-076 | No-match behaviour (F-16) | HONEST IMMEDIATE ALTERNATIVES: state plainly that nothing fits, and offer concrete options (a different time, a different stop, street pickup at its price). Never an empty screen, never an endless spinner. | This screen determines whether a rider ever returns. | CONFIRMED |

| DEC-077 | Payment methods | ALL of: wallet (primary), cash, Paymob (cards + mobile wallets + kiosk), and InstaPay where available. User: "cash is fine wallet, paymob and instapay integrations if possible is great". | Maximum inclusion in the Egyptian market. | CONFIRMED (mechanism detail below) |
| DEC-078 | Cash mechanism | Cash IS allowed, but ALWAYS recorded against the scanned booking: scan QR → driver marks "cash collected" → the fixed fare becomes a driver liability, settled against payout. No untracked cash sale ever exists. | Only safe way cash and pooling coexist; keeps the ledger authoritative. | CONFIRMED |
| DEC-079 | Payment methods (full list) | ALL of: in-app WALLET (primary), CASH (recorded), PAYMOB (cards + mobile wallets + kiosk), INSTAPAY (via PSP/bank, not direct API), DIRECT CREDIT/DEBIT CARD, APPLE PAY. All behind one payment-provider abstraction. | Maximum inclusion; user wants every option available. | CONFIRMED |
| DEC-080 | Driver payouts | WEEKLY payouts via Paymob Payouts / Instant Cashin, subject to a minimum threshold (R10.4: EGP 1,000-5,000 typical). | Predictable, low fee overhead, matches PSP thresholds. | CONFIRMED |
| DEC-081 | Platform revenue | PERCENTAGE COMMISSION is the DEFAULT, but the system must SUPPORT commission / driver-subscription / hybrid models as configuration, switchable without engineering. | User: "I want the idea of system support things but the default is commission". Fits DEC-070. | CONFIRMED |
| DEC-082 | Growth mechanics | ALL THREE: habit/streaks + social (referral & journey sharing) + price events (flash sales/campaigns). Each independently switchable and measurable from the Manager dashboard. | Fits DEC-061; lets the business learn which lever works and disable the rest. | CONFIRMED |
| DEC-083 | F-38 multi-seat booking | ALLOWED: one rider may book multiple seats, all under their own name and responsibility (multiple QR codes issued to them). No named third parties, so DEC-024/INV-11 survives. | Covers friends/couples/colleagues travelling together — a normal everyday case Swvl supports. | CONFIRMED |
| DEC-084 | C-5 wait-time conflict | NOT AN APP CONCERN. The user rules that managing a late rider is handled socially by the driver (asking people, judging the situation), not by system logic. The 10-minute default stands; the app does not enforce a promise-vs-wait trade-off. | User: "that's something internal, the driver asks people and so on, that's not an app thing". AGENT NOTE: the app should still SHOW the driver the consequence (who is on board, their promised times) so the human decision is informed. | CONFIRMED |

## Batch 20 — Codebase shape & build order (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-085 | Codebase shape (resolves C-2, C-3) | *(mobile clause SUPERSEDED by DEC-176: Capacitor, not Expo.)* MONOREPO WITH SEPARATE UIs. `/apps/mobile` (Expo, rider+driver, role-adaptive), `/apps/web` (Next.js: public site, rider web booking, Manager & Ops dashboards), `/apps/api` (NestJS modular monolith). Shared packages: `shared-types`, `shared-logic`, `shared-api`. UI is NOT shared; everything else is. | R11.3/R11.4/R11.5: practitioners and official guidance agree. Driver needs native background GPS (physics, not framework choice); dashboards need real desktop UI; public site needs SEO. Also allows hiring a web dev and a mobile dev in parallel. | CONFIRMED |
| DEC-086 | Build order | VERTICAL SLICES: one complete feature at a time, working end-to-end across API + web + mobile before starting the next. | Matches DEC-006's "nothing fake" stance — nothing is ever half-built. | CONFIRMED |
| DEC-087 | Process (restated) | ALL discussion continues via MCQ, per rule P5. | User restated. | CONFIRMED |
| DEC-088 | API style | REST + WebSockets. REST for actions, WebSockets for live push. | Simplest to build and debug; universally understood by hired developers; good caching. | CONFIRMED |
| DEC-089 | Realtime scope | LIVE only where it matters: vehicle position, ride/booking state, driver manifest. Everything else refreshes on demand. | Protects battery on low-end Android and keeps server cost low. | CONFIRMED |
| DEC-090 | GPS sampling | ADAPTIVE: frequent near stops/pickups, sparse on long stretches. | Addresses F-34 (driver battery drain as an operational failure cause). | CONFIRMED |
| DEC-091 | Offline capability | CRITICAL ACTIONS WORK OFFLINE: QR boarding scans, arrival marking, journey progress — queued in an outbox and synced with idempotency keys. Booking/payment remain online-only. | Alexandria dead zones, garages, tunnels. Booking offline is unsafe (cannot verify seat availability). | CONFIRMED |

## Batch 21 — Safety, gender, retention (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-092 | Safety features | FULL KIT: SOS button with live location to support, share-my-ride link, masked calling both directions, two-way ratings, and a tracked incident flow with follow-up. | Rider expectation in 2026 and a real marketing advantage in Egypt. | CONFIRMED |
| DEC-093 | Gender preference | Women may REQUEST women-only vehicles/seats when available (soft preference, not a guarantee). If no suitable vehicle exists, normal options are shown. | Research noted ride-hailing is especially popular among women in Egypt partly for safety; strong adoption driver without a hard supply promise. | CONFIRMED |
| DEC-094 | Data retention | KEEP EVERYTHING INDEFINITELY. No automatic deletion of collected data. | User's choice for maximum analytical value. AGENT CAUTION (recorded, not overridden): (a) storage cost grows without bound; (b) a breach would expose years of every rider's movements — home, workplace, daily routine; (c) indefinite retention of personal data conflicts with common data-protection principles and may conflict with Egypt's PDPL — this is a LEGAL question owned by the user's legal team (DEC-030), and it MUST be put to them explicitly. Technical mitigations proposed below. | CONFIRMED (caution logged, legal referral required) |

### DEC-094 required technical mitigations (agent-proposed, not yet approved)
Because the data is kept forever, the protections around it must be stronger, not weaker:
1. **Encrypt location history at rest** with a separate key from the main database.
2. **Separate the movement store** from the operational database, with its own tighter access rules.
3. **No bulk export without Super Admin approval**, always audited (already in CH2 §2.4).
4. **Pseudonymise on access**: analytics queries see a hashed rider id by default; re-identification
   is a separate, audited privilege.
5. **Age-based cold storage**: data older than N months moves to cheaper archival storage —
   still kept, just not in the hot database. This controls cost without deleting anything.
6. **Right-to-deletion path** must still exist technically even if unused, because a regulator or
   court may compel it. Deleting a user anonymises rather than destroys financial records (INV-9).
| DEC-095 | SOS staffing | On-call phone rota (a real person, 24/7) at launch; upgrade to a staffed desk when volume justifies it. | Honest and achievable; the button always reaches a human. | CONFIRMED |
| DEC-096 | Rating consequences | INFORMATIONAL ONLY. Ratings carry no automatic consequence for drivers. | User's choice. AGENT CAUTION: ratings then provide no protective function; the protective role must be carried entirely by the INCIDENT/complaint flow (DEC-092) and by Ops Admin action. Logged as G-044 — the complaint path must therefore be strong, because it is now the only mechanism that removes a dangerous driver. | CONFIRMED (caution logged) |
| DEC-097 | Fraud focus | Design against the three money-draining vectors: GPS spoofing / fake completed rides, driver-rider collusion, and promotion/referral abuse. Rule-based detection first; pattern detection later. | Targets actual financial loss rather than speculative threats. | CONFIRMED |

## Batch 22 — UX foundations (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-098 | Rider home screen | ADAPTIVE HOME: one screen whose top slot changes by context — new user sees "Where to?" search; a rider with an upcoming booking sees that booking as the highlight; a repeat commuter sees their saved commute. **The screen LAYOUT stays identical across web and mobile; only the content (banners, top slot) adapts.** | R12.2/R12.3 evidence; user added the constraint that the screen must feel the same everywhere, with adaptivity in content not structure. | CONFIRMED |
| DEC-099 | Offline model | SPLIT: **driver app = offline-FIRST** (local storage is the source of truth; a full journey can run with zero signal), **rider app = offline-capable** (cached stop, time, walking line, ticket QR), **booking/matching = online-only** (a scarce seat cannot be honestly promised offline). Delta sync only; optimistic UI with calm rollback. | R13.1/R13.6: research explicitly warns offline-first is risky for real-time dispatch, but journey EXECUTION only records what already happened. | CONFIRMED |
| DEC-100 | Subscription trial day | YES — a single TRIAL DAY is offered before committing to any recurring subscription. | R12.2: both riders and drivers preferred starting with one test day; removes commitment fear on an unproven route. | CONFIRMED |
| DEC-101 | Manager dashboard behaviour | ACTIVE ALERTING: the system watches occupancy/demand thresholds and raises actionable alerts ("Zone 4: 12 empty seats, 32% occupancy — suggest flash sale"), each with a one-click action. Thresholds are configurable. NOT fully automatic rules (rejected for now: an automated rule with a bug spends real money). | Turns DEC-045 into something that works when nobody is watching. | CONFIRMED |
| DEC-102 | Ops Admin home | WORK-QUEUE FIRST: pending driver approvals, vehicle approvals, open incidents, disputes — in priority order. Live map is a tab. | Ops work is clearing queues, not watching dots. | CONFIRMED |
| DEC-103 | Growth build priority | ALL THREE EQUALLY (referrals, streaks, flash sales), each measurable, and let real data decide which to invest in. | Nobody can reliably predict which mechanic works in a new market. | CONFIRMED |

## Batch 23 — Infrastructure & testing (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-104 | Hosting | SELF-MANAGED VPS (Hetzner / DigitalOcean class). Not managed cloud. | User's choice: 3-5x cheaper and full control. AGENT CAUTION: the team becomes responsible for backups, patching, uptime, and 3am failures. Mitigations mandated below. | CONFIRMED (caution logged) |
| DEC-105 | Region | ANY region — no constraint imposed by the user. AGENT DEFAULT: choose a low-latency European region (Frankfurt/Milan class) for Alexandria, with the region treated as configuration so it can move. | Latency to Egypt is acceptable and provider maturity is highest. NOTE: if the legal team ever confirms a data-localisation requirement (research R1.5 showed Egypt has debated exactly this), the region must move — so no code may assume a region. | CONFIRMED (agent default) |
| DEC-106 | Testing depth | FULL PYRAMID: unit + integration + contract + end-to-end + FleetPy simulation against synthetic Alexandria demand before launch. | Matches DEC-071 quality gates; validates the algorithm with zero real riders at risk. | CONFIRMED |

### DEC-104 required mitigations (because self-managed means self-responsible)
1. **Everything as code**: servers reproducible from scripts/containers; no hand-configured machines.
   If a server dies, a new one is rebuilt from the repository, not from memory.
2. **Automated backups with tested restores.** An untested backup is not a backup (CH12 §12.8).
   A restore drill must be performed and documented on a schedule.
3. **Managed exception**: the PRIMARY DATABASE is the one place where the agent recommends paying
   for a managed service even on a VPS-first strategy, because losing the ledger is unrecoverable.
   [Raised as an MCQ rather than assumed.]
4. **Monitoring and paging** from day one: uptime, error rate, queue depth, disk space, certificate
   expiry. Self-hosting without alerting is how outages become multi-hour.
5. **Staging environment** that mirrors production, because there is no provider safety net.
| DEC-107 | Database hosting | SELF-HOSTED with a live REPLICA and automated OFF-SITE backups from day one. Not managed, not a single box. | Keeps cost and control while removing the single-point-of-failure. Mandatory: streaming replication to a second machine, automated encrypted off-site backups, point-in-time recovery configured, and DOCUMENTED RESTORE DRILLS on a schedule. A restore that has never been tested does not count. | CONFIRMED |
| DEC-108 | Launch gate | CLOSED BETA on ONE corridor with real riders before public launch. | Finds what simulation cannot: unfindable stops, confusing screens, drivers misreading the manifest. | CONFIRMED |
| DEC-109 | Team growth | PHASED HIRING: start with user + agent; hire specifically when a phase demands it. CH16 must define, per phase: scope, required skills, hiring trigger, and ready-to-hand-over work packages. | Honest about timeline; avoids paying for a team before the work exists. | CONFIRMED |
| DEC-110 | Phase shape | ONE CORRIDOR WORKING COMPLETELY, then widen. Everything needed for a single real route (signup → stops → booking → matching → QR boarding → payment → driver app → basic ops) before adding corridors and breadth. | Reaches real users soonest and proves the model; consistent with DEC-086 vertical slices. | CONFIRMED |
| DEC-111 | Hiring plan | OUT OF SCOPE. User: "do not talk about this part, when we need someone we will have it." CH16 will contain NO hiring plan and NO role recommendations. | User owns resourcing. | CONFIRMED |
| DEC-112 | Timeline estimates | OUT OF SCOPE. User: "we do not need this part." CH16 will contain NO calendar estimates and NO person-week figures. | User owns scheduling. | CONFIRMED |

### Consequence of DEC-111 + DEC-112
Risk R-1 / gap G-009 ("build everything before launch" vs team capacity) can no longer be resolved
by a hiring or timeline plan in this document. It is therefore RECLASSIFIED: it stops being an open
gap for the agent to solve, and becomes a standing risk owned by the user, recorded once in CH17.
The agent will not raise it again unless the user asks.

## Batch 24 — Post-audit decisions (2026-07-31, session 2)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-113 | Surge pricing (G-047) | NO AUTOMATIC SURGE. Prices never rise algorithmically with demand. A MANAGER may raise prices manually for a defined period from the dashboard. | Preserves the fixed-price promise (DEC-058) and the simple-ticket philosophy; still allows a human response to a genuine supply crisis. Surge is widely resented in this market. | CONFIRMED |
| DEC-114 | **ROUTE TICKET, not origin→destination booking** (G-048) — MAJOR MODEL CHANGE | User: "he can get in at any point from the route... he books the route not a fixed destination at all, he picks the route and he can get off the bus at any point." A rider books a **ROUTE**, boards at a point on it, and may alight at ANY point along that route. No fixed destination is committed at booking. | Matches how Egyptian microbuses actually work; radically simpler for the rider. AGENT WARNING: this contradicts or reshapes several existing decisions — full impact analysis below, and the consequences MUST be decided before the spec is consistent. | CONFIRMED (impact analysis OPEN) |

### DEC-114 IMPACT ANALYSIS — what this changes (agent analysis, requires user decisions)
This is the largest single model change since DEC-019. It affects:

1. **Pricing (DEC-058).** A fixed route price now means one price for the whole route regardless of
   how far you ride — OR a price per segment. UNDECIDED. This is the biggest open question.
2. **Capacity (INV-2).** If the drop-off is unknown, the system cannot know when a seat frees up.
   Either a seat is assumed occupied for the WHOLE remaining route (safe, wasteful) or the rider
   declares an intended alighting point that is non-binding (efficient, imprecise). UNDECIDED.
3. **Matching (CH5).** Constraint F3 (pickup precedes drop-off in the sequence) and the insertion
   cost function both assume a known drop-off. The algorithm must be re-specified for unknown
   destinations.
4. **The rider's stated intent (DEC-020).** The intent screen was "from / to / arrive by". With a
   route ticket, the rider picks a ROUTE, not a destination. The core rider flow changes.
5. **Data model (CH9).** `bookings.dropoff_journey_stop_id` becomes nullable; `ride_requests`
   may not carry a destination.
6. **Journey stops (DEC-041).** "Skip a stop if nobody is assigned" breaks: if drop-offs are not
   declared, the driver cannot know which stops to skip. Either riders signal to alight (like a bus
   bell) or every stop is served.
7. **Boarding/alighting proof (DEC-049).** QR scan at boarding still works; alighting has no scan,
   so completion becomes driver-marked or automatic at the route end.
8. **The promise rule (CH5 F6).** Promised arrival times cannot exist if destinations are unknown.
   The core fairness constraint of the algorithm loses its meaning.
9. **The street-pickup tier (DEC-063, CH6a).** A deviation to collect someone still works, but a
   deviation to DROP someone at their door cannot exist without a declared destination.

**Nothing in the specification should be rewritten for DEC-114 until points 1, 2 and 6 are decided.**
| DEC-115 | Route-ticket pricing (G-051 #1) | ONE FLAT PRICE FOR THE WHOLE ROUTE. "Smouha → University route = 15 EGP" whether the rider travels 2 stops or 12. | Exactly like a microbus; simplest possible mental model; ideal for subscriptions. Accepted cost: short-distance riders subsidise long-distance ones. | CONFIRMED |
| DEC-116 | Route-ticket capacity (G-051 #2) | A SEAT IS HELD FOR THE ENTIRE REMAINING ROUTE. Once boarded, the seat is that rider's until the end of the line; the system never resells it mid-route based on a guess. | Never oversells, never wrong. Accepted cost: seats freed early sit empty unless the rider signals (DEC-117). | CONFIRMED |
| DEC-117 | Alighting signal (G-051 #3) | BOTH: the rider may simply tell the driver, AND an in-app "I'm getting off" button exists. When the app button is used, the system learns the seat is free and may resell it for the remaining stops. Driver may also mark an alighting. | Works for everyone including riders not watching their phone; the app path recovers the capacity that DEC-116 would otherwise waste. | CONFIRMED |
| DEC-118 | Calendar handling (G-049) | Scheduled journeys and subscriptions are stored as LOCAL WALL-CLOCK TIME (e.g. "07:30 Africa/Cairo"), so DST changes never shift a rider's commute. Plus a RAMADAN MODE (managers shift timetables and expectations) and a HOLIDAY CALENDAR that auto-pauses subscriptions. | DST-safe by construction; both seasonal features matter enormously in the Egyptian market. | CONFIRMED |

### DEC-115..117 combined effect — the model is now coherent again
- Rider books a ROUTE at a flat price, boards at any point (QR scan), rides as far as they like.
- The seat is reserved to the end of the line, so capacity is never oversold.
- If the rider signals they are alighting (app button, or telling the driver who marks it), the seat
  is released for the remaining stops and can be resold — recovering utilisation safely.
- The driver knows where to stop from: declared boarding points + alighting signals.

### Remaining DEC-114 consequences now RESOLVED or REDUCED
| # | Area | Resolution |
|---|------|-----------|
| 1 | Pricing | DEC-115 flat route price |
| 2 | Capacity | DEC-116 hold to end of line, released by DEC-117 signal |
| 3 | Matching F3 (pickup precedes drop-off) | Now trivially satisfied: drop-off is effectively end-of-route unless signalled |
| 4 | Rider intent screen | Changes from "from → to" to "pick your route, board here". CH10 must be rewritten. OPEN |
| 5 | Data model | `dropoff_journey_stop_id` becomes NULLABLE; add `alight_signalled_at`, `actual_alight_stop_id`. CH9 must be updated. OPEN |
| 6 | Stop skipping (DEC-041) | Driver serves stops with declared boardings + signalled alightings; other stops skipped |
| 7 | Alighting proof (DEC-049) | No scan on alighting; completion is by signal, driver mark, or automatically at end of route |
| 8 | Promise rule F6 | **WEAKENED**: with no declared destination there is no promised arrival time to protect. F6 now protects only the ROUTE's overall schedule, not individual riders' arrival promises. Significant change to CH5. OPEN |
| 9 | Street-pickup tier | Boarding deviation still works; there is no drop-off deviation, since there is no declared destination |
| DEC-119 | Fairness rule replacing F6 (G-052) | **SCHEDULE ADHERENCE.** Every route has a published timetable. No pickup, deviation, wait or insertion may push the vehicle more than `MaxScheduleSlip` behind that timetable. Riders are protected collectively because they share one schedule. | With no declared destinations there are no individual arrival promises; protecting the timetable protects everyone on board. This is how real bus services work and it fits the route model naturally. | CONFIRMED |
| DEC-120 | Rider intent (replaces "From/To/Arrive by") | Rider **picks a ROUTE** from a list or map, then **picks a boarding point** on it. e.g. "Smouha → University" then "board at Green Square, 6 min walk". | Matches how people already think about microbus lines; no destination is committed. | CONFIRMED |
| DEC-121 | Fix order | Rewrite CH5, CH9 and CH10 for the route model FIRST, then produce the screen inventory. | Prevents documenting screens that no longer exist — the exact defect class found in audit #3. | CONFIRMED |

## Batch 25 — Design system & screen inventory (2026-07-31)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-122 | Screen inventory depth | FULL DETAIL per screen: purpose, every element, every action, all states (loading/empty/error/offline/RTL), governing decisions, and the API calls it makes. | Build-ready standard (DEC-010); a developer must not need to ask. | CONFIRMED |
| DEC-123 | Inventory order | Rider → Driver → Ops/Manager/Support. | Rider is the largest surface and defines the product's feel. | CONFIRMED |
| DEC-124 | Web vs mobile documentation | ONE screen spec with explicit notes where web and mobile differ. | Matches DEC-098 (identical structure, adaptive content); avoids two specs drifting apart — the defect class found in audits #3 and #4. | CONFIRMED |
| DEC-125 | Design system | Define the DESIGN SYSTEM FIRST, then the screens reference its components. | Shorter inventory, consistent build, one visual language across apps and dashboards. | CONFIRMED |
| DEC-126 | Standing instruction | Every audit conflict must be FIXED, and DISCUSSED with the user when a decision is needed. Consistency and suitability are continuous obligations, not end-of-project tasks. | User instruction, 2026-07-31. Reinforces rules §3 and project rule P5. | CONFIRMED |
| DEC-127 | Brand palette | PLACEHOLDER for now. The token system means any palette can be swapped by changing hex values in one place; no screen references a raw colour. | Branding not yet decided; costs nothing to defer because of the token architecture. | CONFIRMED (deferred) |
| DEC-128 | Product name | NOT YET CHOSEN. Agent to propose candidates that work in Egyptian Arabic and English. Until chosen, screens use a neutral placeholder. | Name appears in every screen, notification, receipt and email. | OPEN — naming MCQ |
| DEC-129 | Screen inventory delivery | ALL ROLES in one document (~80-100 screens), delivered in parts, rider first (DEC-123). | User wants completeness. | CONFIRMED |
| DEC-130 | Subscription guarantee failure (G-028) | FULL CREDIT for that day **PLUS** a compensation credit. The rider gets the day's value back and something extra for the broken promise. Amounts are configuration (Manager-set). | A guarantee that fails like a normal cancellation is not a guarantee. Clear and explainable. | CONFIRMED |
| DEC-131 | Screen spec format | NO layout diagrams and NO visual prescriptions. Each screen is a PLAIN LIST of everything that must be present: information, controls, interactions, states. Designers choose layout, hierarchy and styling. | User: "just list things that must be in each screen... leave them to choose the best layout and styles". Separates requirements (ours) from design (theirs). | CONFIRMED |

## Batch 26 — Supply model resolved (2026-07-31)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-132 | Supply model (G-054) | **MODEL M3: operator defines ROUTES and publishes a SLOT GRID; drivers CLAIM a slot (two taps). Drivers never draw routes, set prices, or predict demand.** Uncovered slots are filled by visibility, system suggestion, configurable incentive, and a commitment tier. Subscriptions may only be sold on slots with committed coverage. | R14 evidence (14 studies): fixed routes win on cost, schedule adherence and ridership at dense peak demand; demand-responsive is explicitly contra-indicated for "dense urban" and "peak-hour commuter corridors". Drivers want shift choice, not planning (R14.8). Keeps DEC-115 and DEC-119 intact. | CONFIRMED |
| DEC-133 | Per-km rate purpose (G-033) | The per-km rate is **NOT a rider-facing fallback**. It exists only as a MANAGER TOOL that SUGGESTS a fare when creating a new route ("this route is 6.2 km → suggested 15 EGP"). Riders are never charged per km. Precedence is therefore simply: **route flat fare, always** (DEC-115). | Under M3 every journey is on a defined route, so an unpriced pair cannot occur. Keeps fare consistency as the network grows. | CONFIRMED |
| DEC-134 | Walking rule (G-024) | **No walking rule.** Under M3 the rider chooses their own boarding point from the route's stops. The system simply lists every boarding point **sorted by walking time, with honest distances**, and marks one as recommended. No ceiling (DEC-064), no weighted formula. | Consistent with DEC-064/065; M3 removed the need for the system to choose for the rider. | CONFIRMED |
| DEC-135 | Multi-leg journeys (G-015) | **SUGGEST multi-leg normally**, treated exactly like any single-leg booking. User's reasoning: "it is the same risk as single leg, so if not succeed just refund for the failed leg." No special warnings, no fallback ride, no daylight/hub restrictions. Each leg is an independent booking (DEC-025); a failed leg is refunded like any other failure. | Consistency: a single-leg journey can also fail and strand someone at their origin. Treating multi-leg as uniquely dangerous would be inconsistent. | CONFIRMED |
| DEC-136 | QR fallback (G-026) | **The numeric code IS the fallback**, always displayed alongside the QR. Covers: camera failure, darkness, cracked screen, and screen-reader users (accessibility). No SMS codes, no separate mechanism. Driver manual confirm from the manifest remains available as a rate-limited, audited override (CH12 §12.4). | Simple and complete; one mechanism covers every realistic failure. | CONFIRMED |
| DEC-137 | Data collection scope (G-027) | **EVERYTHING**: every state change, every GPS sample, every offer shown and declined, every price quoted, every notification sent, and in-app behaviour (screens, taps, time on screen). Retained indefinitely (DEC-094), cost controlled by cold-storage tiering, not by collecting less. | User: "everything". Maximum analytical and dispute-resolution value. Security/privacy mitigations already mandated in CH13 §13.2 and CH12 §12.7. | CONFIRMED |
| DEC-138 | Driver report threshold (G-044) | **Report rate ≥ 10% of completed rides, with a minimum of 20 completed rides, over a rolling window of the last 100 rides → raises a HUMAN REVIEW alert to Ops.** Plus: severe categories trigger immediate precautionary suspension regardless of percentage; 3+ reports in the same category within 30 days trigger review even below 10%. **No automatic deactivation ever** — a human decides, states a reason, and the driver may appeal. All values configuration. | R15: the user's 10% instinct matches the industry's effective tolerance (Uber deactivates near a 4.6/5 average, which corresponds to roughly 8-12% poor ratings). R15.3 adds the minimum-volume and rolling-window guards; R15.5 requires human review and appeal (30% of drivers reportedly faced deactivation threats with no recourse). | CONFIRMED |
| DEC-139 | Journey sharing mechanism (G-034) | A **shareable link** carrying the journey id and the sharer's code (WhatsApp-ready, viewable without installing). Whoever books through it credits the sharer once their ride COMPLETES (never at signup — CH12 §12.3.3). | Links spread through WhatsApp groups, which is how things actually spread in Egypt; no contacts permission needed. | CONFIRMED |
| DEC-140 | Boarding-point availability + alighting freedom (G-035) | Unavailable boarding points are shown **greyed out with a plain reason** ("not served by this departure", "too late to reach"), never selectable-then-failing. **Boarding is only at fixed stops; ALIGHTING is free — the rider may get off at any point along the route** (reaffirms DEC-114/117). | Rider sees the whole route honestly. Asymmetry is deliberate: boarding must be predictable for the driver and the manifest; alighting does not need to be. | CONFIRMED |
| DEC-141 | Behavioural bets (G-031, G-025) | KEEP both as decided (strict cancellation, sell every seat) but **INSTRUMENT them from day one** and review after the closed beta (DEC-108). Required metrics: cancellation rate; churn/uninstall after a cancellation charge; seat-comfort complaint rate; ratings segmented by vehicle size and by seat position. | Decide with real Alexandria data, not prediction. | CONFIRMED |
| DEC-142 | Operational failures (G-039) | BOTH: the software behaviour stays in CH12 §12.6, AND a **detailed OPERATIONS RUNBOOK is written into the master document** — who does what, in what order, within what time, for each failure mode. | User: "both, and write the operation runbook detailed in the master doc". | CONFIRMED |
| DEC-143 | Open-source vetting (G-010) | Vet each component **at the moment of adoption**, not in advance. Licence, maintenance activity, security posture and production maturity are checked and recorded in the implementation log when the component is first used. | Avoids vetting components that may never be adopted; keeps the record tied to a real decision. | CONFIRMED |

## Batch 27 — Configuration & notifications (2026-07-31)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-144 | Config catalogue structure | THREE categories: **Business parameters** (permanent, Manager-editable) · **Feature toggles** (temporary, owned, with an expiry date, treated as technical debt) · **System tuning** (technical, Super-Admin only). | R17.1: merging flags with permanent parameters causes flags to silently become permanent system state. | CONFIRMED |
| DEC-145 | Config risk tiers | THREE tiers by blast radius, reversibility and hidden coupling: **LOW** (Manager, instant) · **MEDIUM** (Manager, preview required) · **HIGH** (Super Admin, mandatory reason AND a stated rollback trigger before it goes live). Every key also declares its **missing-value behaviour**. | R17.3/R17.4: most incidents happen during fallback, not during the change; ceremony should scale with risk. | CONFIRMED |
| DEC-146 | Notification caps | Adopt the researched caps: **transactional unlimited** (never suppressed by other caps) · **behavioural max 2/day with a 4-hour gap** · **promotional max 1/day and 5/week** · **global non-transactional max 3 per 24h**. All stored as configuration. Only transactional messages are retried. | R18.1/R18.2/R18.4. | CONFIRMED |
| DEC-147 | SMS fallback | **PUSH ONLY. No SMS fallback except OTP.** | User's choice, cost-driven. AGENT CAUTION RETAINED: R18.3 states push is connectivity-dependent and "may struggle to reach mobile phones" in poor-signal environments — which describes parts of Alexandria. Consequence: a rider may never learn their vehicle arrived. Mitigations that are now MANDATORY because there is no SMS safety net: (a) the in-app alarm (DEC-053) must work from cached schedule data without a live push, (b) the waiting screen must show the scheduled time from cache when offline (already CH10 R-20), (c) push-delivery failure rate must be instrumented and reviewed. Logged as G-055. | CONFIRMED (caution logged) |

## Batch 28 — Build-blocking business rules (2026-08-01)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-148 | Cancellation forfeit timing (A5) | FLAT 50% at any time after purchase, rising to **100% after the departure LOCKS**. Two steps only. | Keeps DEC-055 simple and adds the one step that is economically real: after lock the seat cannot be resold. | CONFIRMED |
| DEC-149 | Driver cancellation penalty (A2) | A driver who releases a claimed departure **after bookings exist** loses a fee equal to the platform's commission on the lost bookings. Riders receive **100% credit plus a small compensation credit** (symmetric with DEC-130). | The penalty scales with harm done; the rider is made whole plus something for the trouble. | CONFIRMED |
| DEC-150 | Rider no-show (A3) | A no-show rider is charged **100%** — they consumed the seat, which could not be resold. | Consistent with DEC-148's post-lock rule. | CONFIRMED |
| DEC-151 | Staff 2FA (A6) | **MANDATORY for all staff roles** (Support, Ops Admin, Manager, Super Admin). | Staff can move money and access personal data. Closes Q2.1. | CONFIRMED |
| DEC-152 | Support channel (A7) | **In-app chat + phone.** Chat scales and keeps a written record attached to the booking; phone covers urgent and low-literacy cases. Not WhatsApp (conversations would live outside the system, weakening the audit trail). | Closes F-40; unblocks screens R-70 and S-10..S-13. | CONFIRMED |
| DEC-153 | Wallet balance storage (A8) | `wallets.balance_minor` is a **materialised projection** of the ledger, reconciled nightly. The **ledger remains the sole source of truth** (CH6 §6.1). | Fast reads without weakening the ledger guarantee. | CONFIRMED |
| DEC-154 | Unused subscription days (A4) | **EXPIRE.** Rides not taken within the subscription period are lost, like a gym membership. No rollover, no credit conversion. | Simplest accounting and forecasting. AGENT NOTE: this is the least generous option; pair it with clear pre-purchase wording and the skip/pause controls (CH3 §3.10.3) so riders can protect value in advance. Monitor complaints. | CONFIRMED |
| DEC-155 | Support refund limit (A1) | **One ride fare per incident, maximum 3 per agent per day.** Anything larger, or a fourth case in a day, escalates to Ops. | Agent can fix a rider's day instantly; caps exposure to any single agent (insider-fraud control, CH2 §2.4.1). | CONFIRMED |

## Batch 29 — Final pre-launch rules (2026-08-01)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-156 | Suspension durations (B1) | Escalating: **warning → 7 days → 30 days → permanent**. Severe categories jump straight to precautionary suspension pending investigation (CH12 §12.2). | Predictable and defensible; a driver can see where they stand. | CONFIRMED |
| DEC-157 | Driver face-match on duty (B4) | **NO periodic face-match.** Verification happens once, at onboarding (DEC-035). | User's choice: less driver friction, no extra build. AGENT CAUTION RETAINED: this accepts the risk of ACCOUNT SHARING — an unverified person driving on an approved account, which is the most serious safety failure the platform can have. Compensating controls now carry that weight: strict onboarding (DEC-035), the incident flow (DEC-138), and GPS/behaviour anomaly detection (CH12 §12.3.1). Logged as G-056 to monitor. | CONFIRMED (caution logged) |
| DEC-158 | Rider blocking (B5) | **YES — one-way and silent.** A rider may block a driver; they are never matched with them again. The driver is never told. | Gives riders a remedy for a bad-but-not-reportable experience instead of silently churning. One-way and silent avoids retaliation. | CONFIRMED |
| DEC-159 | Street pickup at peak (B6) | Manager may **disable street pickup per route during defined peak windows** (configuration). **No subscriber discount** on street pickup — pricing stays simple. | Protects journey times when vehicles are full; keeps one price per ticket type. | CONFIRMED |
| DEC-160 | Explaining unavailability (B7) | **Show the reason** when street pickup or a boarding point is unavailable ("too far off our route today", "not served by this departure"). Never a silently missing option. | Consistent with DEC-076 and DEC-140; honesty beats a vanishing control. | CONFIRMED |
| DEC-161 | SLAs and alert thresholds (B2, B3) | **DEFERRED to after the closed beta.** No values are invented now. The system must support them as configuration from day one, and the beta must produce the data that sets them. | User's choice: you cannot set a realistic SLA before you know your volumes. AGENT NOTE: the fields exist and are empty; CH18 §18.13 duties still apply without numeric targets. | CONFIRMED |

## Batch 30 — Final technical decisions (2026-08-01)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-162 | Manager analytics visibility | Managers see **pseudonymised** riders in analytics. Re-identification is a separate, audited, Super-Admin-only action (CH13 §13.2). | Managers need patterns, not identities. | CONFIRMED |
| DEC-163 | OSRM deployment | **One OSRM instance per city.** Each city's graph stays small, fast, and independently updatable. | Matches "a new city is configuration" (DEC-002); avoids rebuilding every city's graph together. | CONFIRMED |
| DEC-164 | Backup policy | **Nightly backups, retained 30 days, restore drill monthly** (documented, per CH15 §15.2). | Standard cadence; a drill that is never performed is not a backup. | CONFIRMED |
| DEC-165 | Alarm escalation | Default **15 min before → 5 min before → strong alarm on arrival**. **The rider can change the first reminder** (e.g. to 30 minutes) in their notification preferences. | Default suits most; user control handles longer walks and personal habits. | CONFIRMED |
| DEC-166 | Configuration editing UI | **Guided forms per rule type**, not raw value entry. The field itself enforces the type, unit and range from CH19 — a manager cannot type 5000% into a discount field. | Prevents the class of error that risk tiers alone cannot catch. | CONFIRMED |
| DEC-167 | First module extraction | **`matching`** is the documented first candidate for extraction from the monolith, if load ever demands it. Documented as intent only — not built now. | CPU-heaviest, and it already has a natural queue boundary (CH5 §5.5). Stating the intent keeps the seam clean. | CONFIRMED |

## Batch 31 — UI reference and palette (2026-08-02)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-168 | UI reference artefact | The user's "Daily Plan" HTML demo is adopted as the **visual and architectural BENCHMARK** for this product, stored at `_working_docs/reference/UI_REFERENCE_daily-plan-app.html`. It is a reference brief for designers and web developers, **not** code to be copied wholesale. | It independently demonstrates three patterns this specification already requires: a single token layer, one nav component that adapts by CSS alone, and component-as-pure-function structure. | CONFIRMED |
| DEC-169 | Brand palette (supersedes DEC-127) | The reference file's approach is ADOPTED and adapted: keep the calm neutral base, near-black text, soft layered shadows and generous radii; **replace the pastel accent cards** with a palette that survives direct sunlight on a low-end screen and works in mandatory dark mode. | DEC-127 deliberately deferred the palette; the reference supplies a coherent starting point that matches the product's restrained tone. | CONFIRMED |

---

# PART IV — ITEM TRACKER

# AUDIT_AND_TODO

## Open items (append-only)

| ID | Type | Description | Status |
|----|------|-------------|--------|
| G-001 | Scope risk | Addressed by DEC-110 (one corridor complete, then widen). Residual scope-vs-capacity risk is owned by the user per DEC-111/112. | CLOSED |
| G-002 | Legal | Researched (R1). HANDED OFF to legal team per DEC-030. | HANDED OFF |
| G-003 | Data | RESEARCHED (R16): a PLOS ONE study names Egypt among the worst OSM coverage (<1/3 of streets, 2017), BUT dense cities and main roads are the best-mapped, and our design (verified stops, operator routes on main corridors, no door-to-door) is largely insulated. Converted to a PHASE-2 ENGINEERING TASK: measure the Alexandria extract before committing to self-hosted OSRM. | TASK — Phase 2 |
| G-004 | Payments | CLOSED — R10 researched the rails; CH6 specifies the ledger, all payment methods behind one interface, and the exact cash sequence (DEC-078). | CLOSED |
| G-005 | Algorithm | CLOSED — CH5 v2 specifies the full 6-stage pipeline for on-demand, scheduled, recurring and route-ticket operation. | CLOSED |
| G-006 | Legal/strategy | HANDED OFF — licensing strategy belongs to the user's legal team (DEC-030). Recorded once in CH17 R-2; the technical system can satisfy per-driver permits, vehicle age limits and trip-data export whatever they decide. | HANDED OFF — legal team |
| G-007 | Data | Merged into G-003 (same task): download the Alexandria Geofabrik extract, verify launch corridors, turn restrictions, one-ways and walking routes; benchmark OSRM times against a commercial provider; contribute upstream fixes. | TASK — Phase 2 |
| G-008 | Legal/technical | SPECIFIED — CH13 §13.4 defines the technical export capability: scoped export, no standing external access, every export logged with requester/approver/scope. | SPECIFIED |
| G-009 | Scope | RECLASSIFIED: hiring and timeline are out of scope (DEC-111, DEC-112). Recorded once as a standing user-owned risk in CH17. Agent will not re-raise. | HANDED OFF — user |
| G-010 | OSS vetting | CLOSED by DEC-143 — components vetted at adoption, recorded in the implementation log. | CLOSED |
| G-011 | Architecture | CLOSED by DEC-085 — rider+driver remain ONE Expo app (DEC-014 preserved) with role-adaptive UI; driver permissions requested only on driver activation; role code lazy-loaded. Native app provides the background GPS the browser cannot. | CLOSED |
| G-012 | Delivery | CLOSED by DEC-085 — web serves riders, public site and dashboards; driving requires the native app. Web still supports driver signup, documents, schedule and earnings. DEC-015 (web first) survives as a SEQUENCING preference, now reconciled with platform reality. | CLOSED |
| G-013 | Product risk | Transfers: CLOSED by DEC-025 — no transfer entity; each leg is an independent Booking, refunded independently. Residual stranded-rider risk moved to G-015. | CLOSED |
| G-014 | Go-to-market risk | Booking-for-others: CLOSED by DEC-024 — strict self-booking only. Accepted loss: school transport, parent-for-student, HR-for-visitor. | CLOSED (accepted) |
| G-015 | Trust/safety | CLOSED by DEC-135 — multi-leg suggested normally; each leg independent; failed leg refunded like any other failure. User's rationale: same risk profile as a single leg. | CLOSED |
| G-016 | Security | CLOSED by DEC-032 — Support Agent role added with limited, explicitly-bounded powers. | CLOSED |
| G-017 | Legal (CRITICAL) | Product is an OPEN PUBLIC ride service (DEC-029), which per research R1.x sits inside Egypt's ride-hailing law. HANDED TO THE LEGAL TEAM per DEC-030. Not designed by the agent. Remains listed so it is never forgotten; the technical system must be able to satisfy whatever the legal team requires (per-driver permits, vehicle age limits, trip-data retention/export). | HANDED OFF — legal team |
| G-018 | Product gap | CLOSED by DEC-033 — three combined paths: self-registering fleet drivers, admin-entered vehicles, and an optional admin-only fleet label for grouping. | CLOSED |
| G-019 | Contradiction | CLOSED by DEC-039 — driver is the accountable entity, vehicle is a declared+approved attribute, no ownership enforcement. DEC-036 superseded, INV-12 revoked. | CLOSED |
| G-020 | Launch workload | CLOSED by DEC-040 — dedicated mapping team resourced by the user; internal Stop Mapping Tool becomes a required product component (see G-022). | CLOSED |
| G-022 | Required tooling | SPECIFIED — CH4 §4.4 (capabilities) and screens O-18/O-19 (desk + offline field mode). Now a BUILD TASK in Phase 2, not a spec gap. | SPECIFIED |
| G-021 | Product capability | CLOSED by DEC-043 — mandatory name+location, optional night-safe/accessible flags, photos and description. | CLOSED |
| G-023 | New scope | SPECIFIED — all five Manager surfaces exist: live occupancy (G-10), coverage board (G-11), pricing control (G-13), promotions (G-15), campaigns (G-17), plus alerting throughout. | SPECIFIED |
| G-024 | Design gap | CLOSED by DEC-134 — no walking rule; boarding points listed sorted by honest walking time, one recommended. | CLOSED |
| G-025 | Product quality | CLOSED by DEC-141 — kept as decided, instrumented (complaints + ratings by vehicle size), reviewed after the closed beta. | CLOSED (measuring) |
| G-026 | Design gap | CLOSED by DEC-136 — the always-visible numeric code is the fallback; manifest confirm remains as an audited override. | CLOSED |
| G-027 | Privacy/cost | CLOSED by DEC-137 — collect everything including in-app behaviour; indefinite retention with cold-storage tiering; security mitigations in CH13 §13.2 / CH12 §12.7. | CLOSED |
| G-028 | Business risk | CLOSED by DEC-130 — guarantee failure pays full day credit + compensation credit, amounts Manager-configurable. Unblocks screen R-51. | CLOSED |
| G-029 | Efficiency risk | CLOSED by DEC-084 — treated as a human/driver judgement, not system logic; app shows consequences to inform the driver. Original note: DEC-052 sets a 10-minute wait. Every minute waited is inflicted on all riders on board and all downstream stops. Mitigations to consider: only allow long waits when the vehicle is empty/near-empty, or when no downstream promise is breached; show riders on board what is happening. | CLOSED |
| G-030 | Strategy | CLOSED by DEC-057 — map city-wide, operate university routes first, expand via Manager dashboard. | CLOSED |
| G-031 | Business risk | CLOSED by DEC-141 — kept as decided, instrumented from day one, reviewed after the closed beta. | CLOSED (measuring) |
| G-032 | Required capability | SPECIFIED — CH4 §4.5 (manager-controlled activation), CH8 §8.5 (runtime configuration, no deploy), screen O-21/O-23. | SPECIFIED |
| G-033 | Design detail | CLOSED by DEC-133 — per-km is a manager pricing-suggestion tool only; riders always pay the route flat fare. | CLOSED |
| G-034 | Growth mechanic | CLOSED by DEC-139 — shareable link with sharer code; reward on the joiner's COMPLETED ride. | CLOSED |
| G-035 | Design detail | CLOSED by DEC-140 — unavailable boarding points greyed with a plain reason; boarding fixed to stops, alighting free anywhere on the route. | CLOSED |
| G-036 | Supply risk | MONITOR — fairness weight exists as configuration defaulting to 0; track driver earnings distribution and churn by decile after launch. | MONITOR |
| G-037 | CONFLICT | CLOSED by DEC-083 — multi-seat booking allowed under one rider's name. Original: F-38: DEC-024/INV-11 (book only for yourself) blocks a rider booking multiple seats for friends travelling together — a normal everyday case that Swvl supports. Needs a decision. | CLOSED |
| G-038 | Accessibility | CLOSED by DEC-136 — the numeric code is always present and screen-reader accessible, giving blind/low-vision riders a non-visual boarding path. | CLOSED |
| G-039 | Operational | CLOSED by DEC-142 — software behaviour in CH12 §12.6 plus a detailed Operations Runbook (CH18) in the master document. | CLOSED |
| G-040 | Local reality | CLOSED by DEC-118 — wall-clock scheduling (DST-safe), Ramadan mode, holiday calendar that auto-pauses subscriptions. Implementation detail lands in CH5/CH6 rewrites. | CLOSED |
| G-041 | Legal (CRITICAL) | DEC-094 keeps all personal movement data indefinitely. This must be explicitly cleared by the user's legal team against Egypt's data-protection law (PDPL) and any sector rules. The agent has flagged it once, as required; it is not designed around. | HANDED OFF — legal team |
| G-042 | Cost | SPECIFIED — CH13 §13.2 (tiered storage, not tiered deletion) and CH15 §15.3 (cold storage as a cost line). Real quotes still needed at build time. | SPECIFIED |
| G-043 | Security | SPECIFIED — CH12 §12.7 (separate encrypted movement store, pseudonymised analytics, Super-Admin-only bulk export) and CH13 §13.2. | SPECIFIED |
| G-044 | Safety (important) | CLOSED by DEC-138 — 10% report rate over a 100-ride rolling window with a 20-ride minimum triggers human review; severe categories suspend immediately; category clustering escalates; no automatic deactivation, appeal required. | CLOSED |
| G-045 | Operational risk | DEC-104 self-managed VPS: mitigations defined in CH15 §15.2 (infra-as-code, tested restores, monitoring, staging). Staffing/costing is user-owned per DEC-111/112. | CLOSED (mitigations specified) |
| G-046 | Data loss risk | CLOSED by DEC-107 — self-hosted with live replica + automated off-site backups + documented restore drills. | CLOSED |
| G-048 | Product gap | CLOSED by DEC-114 — the question dissolved: no destination is declared, so there is nothing to change. The rider simply stays on longer or gets off earlier, signalling per DEC-117. | CLOSED |
| G-050 | Documentation | CLOSED — master regenerated as v1.1, then v1.2 after the route-ticket rewrites. | CLOSED |
| G-047 | Product gap | CLOSED by DEC-113 — no automatic surge; manager-initiated temporary price changes only. | CLOSED |
| G-049 | Product gap | CLOSED by DEC-118 — wall-clock scheduling, Ramadan mode, holiday calendar. | CLOSED |
| G-051 | MAJOR MODEL CHANGE | CLOSED — DEC-115/116/117 decided the model; CH5, CH9 and CH10 all rewritten to v2 for the route-ticket model. | CLOSED |
| G-052 | Algorithm | CLOSED by DEC-119 — F6 replaced with SCHEDULE ADHERENCE (`MaxScheduleSlip` against the published route timetable). CH5 v2 written. | CLOSED |
| G-053 | Launch metric | MONITOR — instrument alighting-signal usage rate from day one (analytics G-18); if low, make the control more prominent or revisit DEC-116. | MONITOR |
| G-054 | CONTRADICTION (major) | CLOSED by DEC-132 — Model M3 adopted. Swept and fixed across 8 areas: CH02 permissions, CH01 model table + SupplyPolicy, CH03 journey states (CLAIMED), CH05 slot awareness, CH09 route_slots/slot_claims/endpoints/INV-32-33, CH10c driver claim screens (D-11/D-12), CH10d O-23 slot management + G-11 coverage board. | CLOSED |
| G-055 | Delivery risk | DEC-147 (push only, no SMS fallback) means a rider on a poor connection may never receive "your vehicle has arrived". Mandatory mitigations: local scheduled-time alarm that fires without a live push; cached waiting screen; instrumented push-delivery failure rate reviewed weekly. If failure rates are material after the beta, revisit DEC-147 for boarding-critical messages only. | MONITOR |
| G-056 | Safety risk | DEC-157 declines periodic driver face-match, accepting the risk of ACCOUNT SHARING (an unverified person driving on an approved account). Compensating controls: strict onboarding (DEC-035), incident flow (DEC-138), GPS/behaviour anomaly detection. Monitor for signals of shared accounts (device changes, driving-pattern shifts, rider reports of "a different driver"). Revisit if any signal appears. | MONITOR |

---

# PART V — RESEARCH EVIDENCE (R1..R18, with sources)

## R1 — Egypt legal / regulatory landscape (gap G-002)

Source A: MENAbytes, "Egypt approves law to regulate Uber, Careem..." https://www.menabytes.com/ride-hailing-law-egypt/
Source B: Ahram English, Law 2180/2019 https://english.ahram.org.eg/NewsContent/1/64/351174/
Source C: Egypt Independent, PM decision Sept 2019 https://egyptindependent.com/egypt-issues-new-regulations-for-ridesharing-companies/
Source D: TIMEP brief https://timep.org/2019/02/12/timep-brief-uber-and-careem-law/

Findings (as reported by the above; NOT legal advice — must be re-confirmed with an Egyptian
transport lawyer before launch):
- R1.1 Egypt has a dedicated ride-hailing law (passed 2018, executive regs 2019, Law 2180/2019).
- R1.2 Operating licence for a ride-hailing company: reported up to EGP 30 million for 5 years,
       renewable, partially payable in instalments (25% upfront reported). THIS IS THE SINGLE
       BIGGEST STRATEGIC CONSTRAINT for a startup.
- R1.3 Drivers need an individual annual permit (reported EGP ~1,000-2,000/year) and reportedly
       pay ~25% more tax than regular taxi drivers.
- R1.4 Vehicles: air-conditioned, age limit reported at max 5 years, must display a visible
       operating logo/mark while working.
- R1.5 Data: companies must retain trip/user data (reported 180 days / 6 months) and provide it
       to the Ministry of Transport / authorities on request. Big privacy-design implication.
- R1.6 Driver conduct: monthly random drug/alcohol testing of >= 0.5% of drivers; retraining after
       3 complaints in a month; suspension on repeats.
- R1.7 Reported requirement that a driver permit is tied to ONE company (industry objected).
- R1.8 Swvl's public position in 2019 was that it is "mass transport", not individual transport,
       and therefore arguably a different regulatory category than Uber/Careem.
- R1.9 Speed-limiter rules: from 2026, new commercial/fleet-registered vehicles in Egypt must have
       certified speed limiters; private individual owners currently exempt unless in a registered
       fleet. Source: https://speed.resolute-dynamics.com/blog/egypt-speed-limiter-laws-certification/
       [Treat as secondary source — verify with official gazette.]

### R1-IMPLICATION (agent analysis)
The EGP 30M licence makes "be Uber but pooled" essentially unreachable for a bootstrapped launch.
Three legally lighter doors exist and should be evaluated:
  (a) B2B / closed-community transport (employers, universities, factories, compounds) — Swvl's
      own pivot; contracts with an organisation, buses/vans supplied by licensed transport vendors.
  (b) Genuine cost-sharing carpooling (no profit to driver, no commission on the ride itself)
      — usually a different legal category than for-hire transport, revenue from subscriptions/ads.
  (c) Partner with an ALREADY-LICENSED transport operator/fleet and act as their software (SaaS).
These map remarkably well onto the user's three chosen modes — but the ORDER of launch matters.

---

## R2 — Swvl precedent (Egypt-born, closest analogue)

Source: Grokipedia entry on Swvl https://grokipedia.com/page/Swvl (secondary; corroborate later)
- R2.1 Founded 2017 Cairo; app-based fixed-route bus/van booking with seat reservation, real-time
       tracking, digital payment. Exactly the "Mode 3" shuttle model.
- R2.2 Scaled fast on B2C, listed on Nasdaq 2022 at ~$1.5B valuation, then retrenched hard.
- R2.3 Pivoted to B2B/B2G (corporate commute, school transport, factory shuttles, transit
       authorities) and reached profitability in 2025 on that model, with ~85% recurring revenue.
- R2.4 Reported Nasdaq compliance notice Nov 2025 for market-value shortfall.

### R2-IMPLICATION (agent analysis)
The strongest evidence available says: in this exact market, B2C mass-shared-ride burns cash;
B2B recurring contracts is what actually became profitable. This argues for making the SHUTTLE /
CORPORATE COMMUTE mode the revenue anchor, with consumer carpooling as the growth/network layer.

---

## R3 — Meeting points ("virtual bus stops") — validates the user's instinct

Source: Via Transportation city services https://city.ridewithvia.com/arlington , /jersey-city
- R3.1 Via operates "corner to corner instead of door to door"; the system assigns each rider a
       "virtual bus stop", usually a nearby corner, and the app draws a dotted walking line to it.
- R3.2 Stated reason: it is how they can pick up multiple passengers without adding significant
       time to each rider's journey. This is exactly the user's Tier-1 idea, already proven in
       production by a major microtransit operator.
- R3.3 They also curate "popular origins/destinations" as selectable places, and handle wheelchair
       accessible vehicle requests through a separate channel.

### R3-IMPLICATION
Tier-1 (assigned virtual stop) should be the DEFAULT, and the walking line UI is a solved pattern.
Accessibility must bypass the walk requirement — supports the user's auto-upgrade idea.

---

## R4 — The matching algorithm: what the literature actually says (gap G-005)

Sources:
- Alonso-Mora et al., PNAS 2017, "On-demand high-capacity ride-sharing via dynamic trip-vehicle
  assignment" https://www.pnas.org/doi/10.1073/pnas.1611675114
- Engelhardt et al., arXiv 2007.14877, "Speed-up Heuristic for an On-Demand Ride-Pooling Algorithm"
- PLOS ONE 2022, space-time clustering for shareability
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0262499
- arXiv 2503.13200 (2025), "Timing the Match: Deep RL for ride-hailing and ride-pooling"
- Patsnap 2026 landscape review https://www.patsnap.com/resources/blog/articles/ride-sharing-matching-algorithms-2026-tech-landscape/

- R4.1 The canonical formulation is the Dial-A-Ride Problem (DARP) / dynamic trip-vehicle
       assignment. It is NP-hard; exact optimisation does not scale to city size in real time.
- R4.2 Alonso-Mora's approach: build an RV-graph (request-vehicle feasibility), then an RTV-graph
       (request-trip-vehicle), then solve an ILP assignment, plus idle-vehicle REBALANCING.
       It is "anytime optimal": start from a greedy assignment, improve while time allows.
       Result: 2,000 capacity-10 vehicles (15% of NYC taxi fleet) served 98% of demand,
       mean wait 2.8 min, mean trip delay 3.5 min.
- R4.3 Engelhardt et al. (Munich data): a simple insertion heuristic vs a state-of-the-art
       multi-step matcher — the advanced one served up to 8% more requests and saved 10% more
       distance, but its runtime blows past real-time as size grows. Their vehicle-selection
       heuristic sped up the costliest step by >8x while keeping ~70% of the distance savings.
- R4.4 Clustering-first (space-time shareability clustering, k-means/hierarchical) is the standard
       trick to make large instances tractable; Lyon study handled ~500k morning-peak requests.
- R4.5 "Timing the match" matters as much as the match itself: batching requests over a window
       beats instant first-dispatch. Reported averages — first-dispatch = 608.8s total wait and
       190.5s detour delay; a fixed 20s batch = 427.0s / 113.1s; 80s batch = 433.1s / 75.4s;
       their RL-timed approach = 337.8s total wait with 60.7s detour delay. Lesson: BATCH WINDOWS
       (roughly 20-80s) produce large gains over greedy instant matching; tune per city.
- R4.6 Distributed/edge matching can cut latency dramatically (a Toronto study cited at ~125x)
       at some cost in wait/detour quality; dense urban cores favour centralised accuracy.

### R4-IMPLICATION (proposed algorithm architecture)
A pragmatic, staged engine — NOT a research prototype:
  Layer 0: geospatial pre-filter (H3/geohash cells + Haversine) to shortlist candidates.
  Layer 1: road-network travel-time matrix from a self-hosted routing engine, heavily cached.
  Layer 2: insertion heuristic with hard feasibility constraints (capacity, time windows,
           max detour, max walk) -> always produces a valid answer fast.
  Layer 3: batch optimisation every N seconds (N ~ 20-60) over the batch, ILP or greedy+local
           search, improving on Layer 2 — "anytime" so it can be cut off by a deadline.
  Layer 4: offline solver for scheduled/recurring trips (runs overnight, full VRP quality).
  Layer 5: rebalancing/positioning hints for idle drivers.
This is deliberately incremental: Layers 0-2 alone ship a working product; 3-5 add efficiency.

---

## R5 — Maps & routing infrastructure (gap G-003)

Sources: tanhdev benchmark https://tanhdev.com/posts/graphhopper-distance-matrix-production-guide/ ,
zeorouteplanner OSM guide, r/selfhosted production report
https://www.reddit.com/r/selfhosted/comments/1sbg0xg/
- R5.1 Reported 100x100 matrix latency: OSRM ~21ms, GraphHopper ~52ms, Valhalla ~120ms,
       Google Distance Matrix ~2,500ms+ and ~$510/day for that workload.
- R5.2 A production delivery platform in Oman reported cutting Google Maps from ~$8,000/month to
       ~$520/month by moving route calculation and distance matrix to self-hosted OSRM on Fargate,
       with a daily automated Geofabrik data rebuild — but KEPT Google for consumer address search,
       because Nominatim autocomplete quality was not good enough for that UX. [secondary source]
- R5.3 Trade-offs: OSRM = fastest but rigid profiles (Lua, recompile); GraphHopper = runtime custom
       models, good for multi-profile fleets; Valhalla = most flexible/multi-modal, slower.
- R5.4 OSM data quality in the target city must be surveyed directly before committing. [UNVERIFIED
       for Alexandria — action item, see G-003.]

### R5-IMPLICATION
Hybrid map strategy: self-hosted OSRM/Valhalla for the millions of internal matrix/routing calls,
commercial provider (Google/Mapbox) only for user-facing geocoding/autocomplete and possibly live
traffic. Wrap both behind ONE internal "MapProvider" interface so any provider can be swapped per
city — this is what makes the market-agnostic requirement (D1.2) real instead of a slogan.

---

## R6 — Payments in Egypt (gap G-004)

Sources: payatlas Egypt country page https://payatlas.com/countries/egypt-eg ,
Nafezly/payments library https://github.com/Nafezly/payments , netarabia gateway roundup
- R6.1 Dominant local rails: cards (Visa/Mastercard + local Meeza), mobile wallets (Vodafone Cash,
       Orange Money, Etisalat Cash, Meeza Wallet), Fawry cash network, and cash itself.
- R6.2 Main local PSPs: Paymob, Fawry, Kashier, Amazon Payment Services; they integrate directly
       with national rails and CBE compliance; global PSPs (Stripe/Adyen) are for cross-border.
- R6.3 Practical guidance repeated across sources: mobile-first, Arabic-localised, one-page
       checkout; enable 3DS and velocity checks; keep cash as a fallback or adoption dies.
- R6.4 Open-source unified gateway wrappers exist (e.g. Nafezly/payments for PHP/Laravel) covering
       Paymob, Fawry, Kashier and wallets — useful as a reference implementation, licence and
       maintenance to be checked before adoption (per rules section 16).

### R6-IMPLICATION
Cash cannot be designed out on day one, but cash in a POOLED trip is genuinely hard (multiple
payers, per-seat fares, driver making change, disputes). Design answer to propose: a WALLET-FIRST
model — riders top up via wallet/card/Fawry/cash-in points, seats are debited from the wallet, and
the driver never handles per-seat cash. This is also how Swvl-style seat booking avoids the mess.

---

## R7 — Money & pricing in ride-pooling (research pass 2, for CH6 / DEC-054)

Sources:
- getridewise 2026 guide https://getridewise.com/blog/uber-pool-uberx-share-lyft-shared-complete-guide
- de Ruijter, Cats, Alonso-Mora, Hoogendoorn (2023), Transport Reviews/TPPP
  https://www.tandfonline.com/doi/full/10.1080/03081060.2023.2194874
- markhub24 Uber Pool strategy retrospective; therideshareguy driver-pay analyses
- The Verge on Lyft Shared Saver https://www.theverge.com/2019/2/21/18233440/
- Reddit r/Egypt on Swvl cancellation policy (user report, secondary)

### R7.1 What discounts actually are (vs marketing)
- Pooling discounts are typically quoted at 25-60% off a private ride (Shaheen & Cohen 2019, as
  cited in the 2023 academic paper).
- A 2026 hands-on comparison reports the REAL saving on door-to-door shared products is only
  ~15-22%, and calls "save up to 50%" marketing "a fantasy in 2026".
- CRITICAL FOR US: the same source reports WALK-TO-CORNER models (Lyft Shared Saver / Wait & Save)
  save 25-40%, materially more than door-to-door sharing (10-20%).
  => The user's meeting-point model (DEC-004 Tier 1) is exactly the variant that can offer a real,
     defensible discount. Door-to-door pooling cannot.

### R7.2 The academic finding that should drive our pricing
de Ruijter et al. (2023): mileage savings only materialise if users are genuinely willing to share
AND are offered ~50% discount. They tested adding a small occupancy-based bonus: a 7.5% extra
discount PER CO-RIDER at maximum occupancy, on top of a 50% base discount, "more than doubled the
total reduction in vehicle kilometres" and reduced rejected requests.
=> Design implication: a two-part price — a base sharing discount PLUS a bonus that grows with how
   full the vehicle actually is. This directly rewards the behaviour the platform needs.

### R7.3 Price certainty beats price optimisation
- Modern shared products lock the price at booking: "the price you see when booking is locked in
  even if the system finds zero matches and you end up riding solo" (~31% of shared rides ran solo
  at the discounted price in that sample).
- Old UberPool's variable outcome was widely hated; uncertainty is a bigger deterrent than price.
=> Design rule: QUOTE A GUARANTEED PRICE UP FRONT. The platform absorbs matching risk, not the rider.

### R7.4 Extra time is the real cost to the rider
Reported median extra time on shared rides: ~8 min (short trips), ~13 min (medium), ~17 min (LA
average), worst case 27 min. Riders trade time for money, so the discount must visibly compensate.

### R7.5 Driver pay in pooling (from driver-side analyses)
- Per-mile/per-minute rates for pooled rides are set LOWER than solo rates, but the driver is paid
  for the WHOLE pooled route including detours and inter-passenger pickups.
- Driver resentment is a documented, serious problem ("Why Everyone Hates UberPOOL"): more work,
  more stops, more complexity, unclear pay.
=> Design rule: driver pay must be transparent and must never make a full vehicle feel like a
   punishment. Consider paying a per-seat bonus so a fuller car always earns the driver more.

### R7.6 Density is a precondition, not a nice-to-have
2026 reporting: shared rides are only deployed in ~15 US metros; the rule of thumb given is that
under ~750,000 population, shared rides don't work. Uber Pool itself was discontinued in March 2020
and replaced by a weaker product (UberX Share, max one co-rider).
=> Strategic implication for Alexandria: launch must CONCENTRATE demand on a few corridors, not
   spread thin. This independently confirms the corridor-launch reasoning.

### R7.7 Swvl's cancellation policy in Egypt (nearest local benchmark)
User-reported (Reddit, secondary): 100% refund if cancelled up to 3 HOURS before a scheduled trip;
for immediate trips, within 10 MINUTES. Seat availability shown as "1 or 2 seats left / fully
booked". Cashless only in some markets.
=> A time-based, generous-until-a-clear-cutoff policy is the local norm the market already knows.
   The user's instinct (50% penalty on any cancellation) is HARSHER than the local benchmark.

---

## R8 — Pricing the "stop vs street pickup" gap (research pass 3, for DEC-063)

Sources: The Verge (2018) https://www.theverge.com/2018/2/21/17020484/uber-express-pool-launch-cities ;
Wired https://www.wired.com/story/uber-express-pool-cities-launch/ ; Mashable; AP News;
Condé Nast Traveler — all covering Uber Express Pool's launch and pricing logic.

### R8.1 The actual price ladder Uber used
Uber ran THREE products simultaneously, and the price gap between them is the exact question we face:
- UberX (private, door-to-door): baseline, e.g. $15
- UberPool (shared, door-to-door): ~40% less than X, e.g. $9
- Express Pool (shared, WALK to a meeting point): up to 50% less than Pool and up to 70-75% less
  than X, e.g. $4.50
=> The WALK ITSELF was worth roughly HALF the fare. Walking to a stop vs being collected at your
   door was priced as a ~2x difference. That is the size of the gap, empirically.

### R8.2 Why the walk is worth so much (the mechanism, not just the number)
Stated by Uber's own product director: the point is to keep the vehicle on a "central, straight
path" and eliminate "the lengthy, loopy bits of shared rides" — the runs around the block to collect
someone from wherever they happen to be standing. Reported effects:
- total trip time is LOWER for Express Pool than for door-to-door Pool, because match quality is
  higher and routes are straighter;
- they deliberately ADD 1-2 minutes of matching time before assigning, to get better matches
  (independent confirmation of R4.5's batching finding).
=> The deviation surcharge is not arbitrary: a street/door pickup destroys route straightness for
   EVERY other rider on board. The price must reflect harm done to others, not just extra metres.

### R8.3 Uber kept BOTH products on purpose
Uber explicitly retained door-to-door Pool alongside Express Pool because "there will always be
customers who are unwilling or unable to use their feet", and framed door-to-door as a paid premium
("you'll have to pay a premium for that door-to-door service, but you won't show up for brunch
sopping wet").
=> Directly supports the user's two-ticket model: a cheap stop ticket and a more expensive
   street-pickup ticket, sold side by side.

### R8.4 Cost basis for a surcharge (delivery-industry method)
Per-mile operating cost is normally built from fuel + maintenance + tyres + depreciation +
insurance (a worked example totals ~$0.563/mile). Route-deviation surcharges in transport are
commonly a flat band (an auto-transport example quotes $50-150 for a significant deviation).
=> Two established surcharge philosophies exist: FLAT BAND (simple, predictable) or
   COST-RECOVERY (computed from actual extra distance/time). Both are defensible.

### R8.5 Synthesis — three candidate ways to price the street-pickup ticket
| Model | How the price is set | Pros | Cons |
|---|---|---|---|
| **Flat uplift** | Stop ticket + a fixed amount (e.g. +50% or a fixed EGP figure) | Trivial to understand, advertisable, predictable, easy for subscriptions | Overcharges tiny deviations, undercharges big ones |
| **Banded by detour** | System measures added detour, charges band A/B/C | Fairer, still predictable, protects against expensive pickups | Rider must be shown WHY their price differs; more explaining |
| **Cost-recovery** | Extra distance/time x a rate + a margin | Most economically correct | Unpredictable price, contradicts DEC-056 price certainty unless quoted up front |
All three are compatible with DEC-056 (locked price) PROVIDED the number is computed and shown
BEFORE the rider confirms.

### R8.6 Agent's reading of the evidence
Uber's empirical ~2x gap suggests the street-pickup ticket should be MEANINGFULLY more expensive —
not a token +10%. A large gap is what actually pushes riders to the stop, which is what keeps
vehicles straight and the whole system efficient. A gap that is too small produces the worst
outcome: everyone requests street pickup, routes become loopy, and the product degrades into an
expensive taxi.

---

## R9 — How production dispatch systems are ACTUALLY built (research pass 4, answers Q69)

Sources:
- Engelhardt et al., arXiv 2007.14877 (Munich, insertion vs multi-step) — re-read in detail
- Alonso-Mora et al., PNAS 2017 (anytime optimal, RV/RTV graphs) — already in R4
- systemdesigndoc.com Uber case study https://systemdesigndoc.com/case-studies/how-uber-works/
- dev.to "Architecting an Uber-scale real-time tracking & dispatch system"
- systemdesignschool.io Design Uber
- grokkingthesystemdesign.com Uber system design
- blog.afi.io on building a rideshare dispatch algorithm with route optimisation
(The system-design sources are secondary reconstructions, not official Uber documentation.
Treated as industry consensus, not vendor truth.)

### R9.1 The single most important finding: dispatch is NOT one algorithm
"Production dispatch is a constellation: supply freshness, ETA precomputes, batch optimizers,
fairness constraints, and reoffer logic after timeouts... Interview answers should show state
machines + retries, not a single greedy function."
=> The question "insertion heuristic OR optimisation?" is a false choice. Real systems run BOTH,
   in a pipeline, with different components handling different stages.

### R9.2 Geographic partitioning comes first
Consensus pattern: "Matching is partitioned by geography: convert pickup point → H3 cell, then
compute a k-ring (neighbor cells) to form the initial candidate set. Using H3 reduces the candidate
set dramatically versus a global scan."
=> Confirms the Layer-0 H3 pre-filter already proposed in R4-IMPLICATION.

### R9.3 Greedy first, batch optimisation second — explicitly
"Uber uses a combination of greedy algorithms for initial matching and batch optimization that
considers multiple pending requests simultaneously to find globally better assignments. This batch
matching can reduce average wait times by reassigning requests that were initially matched
suboptimally."
=> This is exactly the layered "anytime" design (MCQ option A), and it is what the largest operator
   in the world reportedly does.

### R9.4 Adaptive timing is standard practice (validates DEC-072)
"The matching algorithm runs as an optimization problem, balancing immediate assignment against
waiting for potentially better matches. In high-demand situations, waiting even a few seconds might
surface a closer driver. In low-demand areas, the algorithm dispatches immediately to minimize
rider wait time."
=> Independent confirmation of the user's adaptive-window choice.

### R9.5 Quantified trade-off (the number that decides the design)
Engelhardt et al. (Munich): the advanced multi-step matcher served up to 8% more requests and saved
10% more driven distance than a simple insertion heuristic — BUT its computation time "exceeds real
time rather fast as problem size increases". Their vehicle-selection heuristic sped up the most
expensive step by >8x while keeping request-service almost constant and retaining ~70% of the
distance savings; overall speed-up 2.5x.
=> Conclusion: the optimiser is worth ~8-10%, and that 8-10% is retrievable at ~70% efficiency with
   smart candidate pruning. So: ALWAYS have the fast path; run the optimiser within a deadline;
   prune aggressively.

### R9.6 Offers, timeouts and re-offers are part of the algorithm
Consensus flow: rank candidates → send offer over WebSocket → driver has a timeout (~15s) → on
decline/timeout, try the next candidate → expand the search radius → eventually tell the rider
honestly that nothing is available.
=> The "algorithm" must be specified as a WORKFLOW with timers and retries, not a function.

### R9.7 The double-dispatch problem is a real correctness hazard
"What if two ride requests simultaneously try to assign the same driver?" Recommended pattern:
PostgreSQL advisory lock (pg_advisory_xact_lock) + durable compare-and-set + canonical event; keep the assignment workflow in
a durable workflow engine so timers and state survive restarts; make all transitions idempotent.
=> Directly supports INV-16 (serialised transitions) and the event-log backbone (CH8a §8a.5).

### R9.8 Degradation strategy
Hot path must survive dependency failure: keep last-known driver state in the in-process store (rebuilt from PostgreSQL) so
matching continues if the streaming pipeline lags; analytics consumers may lag without breaking
matching; apply backpressure at the gateway.
=> Matching must never depend on analytics, and must degrade to "good enough" rather than fail.

### R9.9 ETA computation is precomputed, not synchronous
Pattern: compute heavy features in streaming jobs, serve from a low-latency store; use fast
approximate routing for the immediate UI number and refresh when the better model returns.
=> Our OSRM matrices should be cached and precomputed per corridor, not computed per request.

### R9.10 AGENT CONCLUSION — recommended design for Q69
Build the LAYERED PIPELINE (MCQ option A), because the evidence says every serious operator does:
```
0. H3 cell pre-filter                      (microseconds)  — shrink the candidate set
1. Hard feasibility filter                 (fast)          — capacity, time windows, promises, detour budget
2. Insertion heuristic                     (milliseconds)  — ALWAYS yields a valid answer
3. Batch optimisation within a deadline    (bounded)       — improves on step 2; abandonable at any point
4. Offer workflow with timeouts/re-offers  (seconds)       — durable, idempotent, survives restarts
5. Overnight full VRP for scheduled rides  (minutes/hours) — OR-Tools, no time pressure
```
Non-negotiable property: **if step 3 is cut off at any moment, step 2's answer is still valid and
shippable.** No rider ever waits on a solver.

---

## R10 — Egyptian payment rails in detail (research pass 5, for CH6 / DEC-077)

Sources: CBE https://www.cbe.org.eg/en/payment-systems-and-services/instant-payment-network ;
Egyptian Banks Company https://www.egyptianbanks.com/ ; openbanking.ng Egypt overview ;
transfi.com Egypt payment rails ; Paymob Payouts docs
https://payouts.paymobsolutions.com/docs/instant_cashin_api/ ; Paymob developer portal
https://developers.paymob.com/ ; payatlas Egypt country page ; Reddit r/Egypt_Developers.

### R10.1 InstaPay / IPN — what it actually is
- The **Instant Payment Network (IPN)** launched 22 March 2022. It is a national network linking all
  operating banks in Egypt for real-time, 24/7 transfers.
- It is operated by the **Egyptian Banks Company (EBC)**, the CBE's technology arm, connecting
  38 member banks.
- **InstaPay** is an APPLICATION — the first PSP app licensed by the CBE to run on the IPN — not a
  merchant API in itself.
- In designing the IPN the CBE studied India's UPI, Brazil's PIX, EU TIPS and Singapore FAST.
- Explicitly designed for interoperability and "integration with fintech companies".

### R10.2 The critical practical finding for us
There is **no public, self-service InstaPay merchant API** of the kind Stripe offers. Access to IPN
rails is intermediated: banks and licensed PSPs connect to IPN, and businesses connect through them.
Egyptian developer discussion corroborates the absence of an open InstaPay API, with third-party
workarounds circulating (unofficial, not suitable for production).
=> **Design conclusion:** treat "InstaPay" as a payment METHOD offered through a licensed PSP or a
   partner bank, not as an API we integrate directly. Anything else is unverifiable for us and
   would be a compliance question for the user's legal/finance team (DEC-030).
[UNVERIFIED: current commercial terms for IPN access via banks/PSPs — must be confirmed by the user
directly with Paymob/their bank, not assumed from web sources.]

### R10.3 Paymob — the practical primary integration
- Developer portal and docs are public: https://developers.paymob.com/ , https://docs.paymob.com/ ,
  with Egypt-specific documentation and a Checkout API guide.
- Coverage cited: card payments, mobile wallet integration, bank transfers, kiosk payments, cash
  collection, and order management.
- Crucially for us, Paymob also runs a **Payouts / Instant Cashin API**
  (https://payouts.paymobsolutions.com/docs/instant_cashin_api/) supporting disbursement to bank
  accounts, debit cards and cash-transfer channels, with a `customer_bears_fees` option.
=> Paymob can plausibly serve BOTH directions: collecting from riders AND paying out drivers.
   That is unusual and valuable — most gateways only do collection.

### R10.4 Payout thresholds
Reported minimum payout thresholds in Egypt commonly start around EGP 1,000–5,000 depending on the
PSP. => Driver payout cadence must be designed around a threshold, not assumed to be per-ride.

### R10.5 The rails we should support (synthesis with R6)
| Method | Direction | Notes |
|---|---|---|
| Cards (Visa/Mastercard/Meeza) | in | via Paymob; 3DS required |
| Mobile wallets (Vodafone Cash, Orange Money, Etisalat Cash, Meeza Wallet) | in | very high adoption |
| Fawry / kiosk cash-in | in | how cash users fund a wallet without cash entering the vehicle |
| InstaPay / IPN bank transfer | in | via PSP/bank partner, NOT a direct API (R10.2) |
| Cash to driver | in | user says acceptable; see R10.6 for the pooled-vehicle problem |
| Paymob Payouts / Instant Cashin | out | driver payouts to bank/card/cash channels |

### R10.6 The unavoidable problem with cash in a POOLED vehicle
Cash is fine in a solo taxi: one rider, one fare, one hand-over. In a pooled vehicle with per-seat
fixed fares (DEC-058) it creates: multiple payers per journey, change-making while driving,
disputes over who paid, driver cash-handling risk, reconciliation against the platform's ledger,
and slower boarding — which directly harms the 10-minute wait budget (DEC-052) and the QR flow
(DEC-049).
=> If cash is accepted, it must be handled as a RECORDED COLLECTION against a booking (driver marks
   "cash collected" on the scanned booking) and settled against the driver's payout, never as an
   untracked cash sale. This keeps the ledger authoritative.

---

## R11 — Web + mobile: one codebase or two? (research pass 6, answers C-2 / DEC-015)

Sources: reactnativerelay.com "React Native Web + Expo Guide (2026)"
https://reactnativerelay.com/article/react-native-web-expo-cross-platform-2026 ;
Expo EAS docs & GitHub Actions guide https://medium.com/@kgkrool/... ;
openreplay Expo guide; multiple r/reactnative practitioner threads (2023-2026);
matthewwolfe.github.io on code sharing.

### R11.1 The Mac question — ANSWERED, and it is not a problem
- "The builds run on Expo's servers, so you don't need a Mac to build iOS apps."
- EAS cloud builds can be triggered from GitHub Actions on `ubuntu-latest`; a macOS CI runner is not
  required; the cloud side uses a pinned macOS/Xcode image.
- Building iOS LOCALLY does require a Mac + Xcode; building Android locally does not.
=> The user HAS a Mac, so they are in the easiest possible position: local iOS builds work AND cloud
   builds work. The Mac is an advantage, not a constraint. No blocker here.
- Practical requirements regardless: a paid Apple Developer account for TestFlight/App Store, and
  app-store screenshots at required device sizes.

### R11.2 Is React Native Web production-ready? Yes.
"RNW powers the X (formerly Twitter) web client and Major League Soccer... With Expo SDK 54+ the
bundler, routing, styling, and deployment stories are all stable."
Expo Router is universal: the same `app/` directory becomes navigation stacks on native and routed
pages on web; static rendering out of the box, SSR alpha in SDK 55+, RSC preview in SDK 56.

### R11.3 BUT practitioners consistently warn against ONE codebase for everything
Repeated, independent, experienced voices:
- "Having a single code base targeting web and mobile is not a good way to go. The UI becomes too
  complex due to platform differences... if your app is simple, sure it can work, but if you want to
  do anything ambitious, your View layer should be decoupled between web and mobile."
- Their solution: "a mono repo with web, native and shared code. Web and native ran React and RN,
  while shared contained redux, utils, APIs etc. This allows us to reuse a lot of code while still
  being able to optimize each platform well."
- Another, after doing the migration: monorepo with `/apps/web` and `/apps/mobile` plus shared
  packages, "90% of the codebase was still shared... I was stupid to try to close that last 10% gap."
- "Do separate, web is a different beast, especially on desktop."

### R11.4 The official guidance matches the practitioners
From the 2026 RNW guide's own FAQ:
"If your primary product is a mobile app and the web is a companion surface, use RNW with Expo for
one codebase. If your primary product is the website and a mobile app is secondary, use Next.js for
the site and a separate React Native app, optionally with shared utility packages."

### R11.5 What this means for THIS project specifically
Our surfaces are NOT the same product:
- Rider: mobile-first, map-heavy, needs push, background location, QR camera, alarms.
- Driver: mobile-ONLY in practice — continuous background GPS, wake locks, QR scanning, navigation.
  A browser cannot do this (C-2).
- Manager & Ops dashboards: desktop-first, dense tables, charts, bulk editing, multi-panel layouts.
  These are genuinely bad on a phone and genuinely bad in React Native.
- Marketing/public pages: need SEO and fast first load -> Next.js territory.
=> The surfaces have GENUINELY different needs. Forcing them into one UI codebase is the exact
   mistake the practitioners describe.

### R11.6 AGENT RECOMMENDATION
**Monorepo with shared logic, separate UI apps.** This preserves DEC-069 (modular monolith thinking)
and DEC-012 (TypeScript everywhere) while respecting platform reality:
```
/apps
   /mobile     Expo (React Native) — rider + driver, one app, role-adaptive (DEC-014)
   /web        Next.js — public site, rider web booking, manager & ops dashboards
   /api        NestJS backend (the modular monolith of CH8a)
/packages
   /shared-types     entities, DTOs, events — ONE definition of Booking everywhere
   /shared-logic     validation, fare display rules, date/time, i18n strings, formatting
   /shared-api       generated API client used by both apps
```
- Shared: everything that is not pixels — types, validation, business display rules, i18n, API client.
- Not shared: screens and navigation. Web gets React/Next components; mobile gets React Native.
- This is the "90% shared" outcome practitioners report, without the last-10% pain.

---

## R12 — UX research for the rider app (research pass 7)

Sources: Hsu & Chen, "Usability Study on the User Interface Design of Ride-hailing Applications",
Springer 2023 https://link.springer.com/chapter/10.1007/978-3-031-35702-2_15 ;
UX Planet, "Designing a ride-sharing app for the daily commute (Saudi Arabia)"
https://uxplanet.org/designing-a-ride-sharing-app-for-the-daily-commute-ui-ux-case-study-8df8a3943eb9 ;
uxdesign.cc student ridesharing case study; designstudiouiux mobile navigation UX 2026 and the
Snap-E Cabs redesign case study; onde.app ride-hailing UX guide.

### R12.1 Measured usability of the market leaders (the benchmark to beat)
Hsu & Chen tested Uber, Lyft and Gojek with 30 participants across 5 tasks. System Usability Scale
scores: **Uber 66.75, Lyft 60.25, Gojek 62.75**. For context, an SUS of 68 is the conventional
average — so all three leading apps scored AT OR BELOW average usability. This is encouraging:
the incumbents are not a high usability bar.

Their concrete findings, directly applicable:
1. If a page overflows the screen, add **signifiers** so users know more content exists.
2. Unrelated settings/info should be collapsed into a **single modular tab or collapsible panel**.
3. Offer a mode **without advertisements** so users interact with the core service undisturbed.
4. **Frequently used functions belong on the main page or one level down** — never buried.
5. Profile/photo editing should be inline, not on an extra layer.

### R12.2 The Saudi daily-commute case study (closest analogue to our product)
Findings that map directly onto our commuter product:
- For a REPEAT user, showing their **latest search** on return respects their time.
- Once a user has an upcoming booking, "the goal of the app changed to play as a reminder/calendar
  for near bookings" — the upcoming ride becomes the main highlight, with search still available.
- **Arrival time matters more than departure time** to commuters; the designer placed "reaching
  time" ABOVE pickup time because that is what the rider actually cares about.
- Both riders and drivers preferred **starting with a single test day** before committing to a
  recurring arrangement. (Direct implication for our subscriptions, DEC-051: offer a trial day.)
- A home-screen design was tested on 8 users and confused ~75% of them without anyone complaining
  explicitly — evidence that home-screen confusion is silent and must be tested, not assumed.

### R12.3 Student ridesharing case study
- "For ease of use, the **Home screen is the Search function itself**."
- Settings merged into Profile to reduce bottom-nav clutter.
- Notifications reachable from all top-level screens.

### R12.4 Mobile navigation best practice (2026)
- **3-5 primary destinations** in the bottom tab bar; more becomes unscannable.
- **Bottom tab bars and bottom sheets** sit in the thumb-friendly zone — put frequent actions in the
  lower half of the screen.
- Do not bury high-frequency actions in hamburger menus; drawers are for infrequent items.
- Gestures are fast for experts but undiscoverable: always keep a visible control as the primary path.
- Accessibility: clear text labels, large tap targets, visible focus states, strong contrast,
  logical focus order.

### R12.5 Documented pain points in existing ride-hailing apps (what to avoid)
From the Uber redesign case study and the Snap-E Cabs (India) redesign:
- Overwhelming screens with too many features at once.
- Hidden fees — surge/price surprises only revealed at checkout.
- Complex payment flows causing drop-off.
- **Poor GPS accuracy and lack of reliable driver tracking "amplified user anxiety"** — named as the
  single biggest anxiety driver in a congested-traffic market.
- Snap-E's targets after redesign: **sub-3-second app load** and **99%+ crash-free sessions**;
  they added "Verified Driver" badges and an accessible SOS button as trust elements.

### R12.6 AGENT SYNTHESIS for our rider home screen
The evidence supports the ADAPTIVE home (MCQ option C), not a fixed choice:
- First-time user: the home screen IS the search ("Where to?") — R12.3.
- User with an upcoming booking: that booking becomes the main highlight, calendar-style — R12.2.
- Repeat commuter: their saved commute and latest search surface first — R12.2.
This is not three screens; it is ONE screen with a priority order for what occupies the top slot.

---

## R13 — Offline-first architecture (research pass 8, answers the "bullet-proof against signal loss" requirement)

Sources: tekrevol offline-first guide 2026 https://www.tekrevol.com/blogs/offline-first-app-development-guide/ ;
quokkalabs offline-first architecture; xsoneconsultants offline-first practices;
think-it.io offline apps; techbuzzonline offline-first guide.

### R13.1 The critical distinction
- **Offline-CAPABLE**: degrades gracefully when connectivity drops, but fundamentally depends on the
  network and treats failures as exceptions.
- **Offline-FIRST**: the app is architected so **local storage is the primary data source and the
  network is a sync channel**. Android's own architecture guidance states the local data source
  should be the canonical source of truth for higher layers.
=> Our DEC-091 (critical actions work offline) is offline-CAPABLE. The user is now asking for
   "bullet proof", which points toward offline-FIRST for the driver app specifically.

### R13.2 Optimistic UI — the three-phase pattern
1. **Update locally first** — write to local storage, reflect in the UI immediately; the user sees
   the result before any network request.
2. **Sync in the background** — add the operation to a sync queue and flush when ready.
3. **Roll back on failure** — undo the local change and show a calm, non-alarming message such as
   "Couldn't save, tap to retry".
This is cited as why Notion, Gmail and Linear feel instant on poor connections.

### R13.3 Sync strategy comparison (from the research)
| Strategy | Best for | Risk | Complexity |
|---|---|---|---|
| Pull-based | content refresh | stale data between pulls | Low |
| Push-based | server-driven updates | infrastructure overhead | Medium |
| **Queue-then-sync** | **forms, inspections, delayed writes** | retry/failure handling matters | Medium |
| Real-time | shared live state | conflict pressure, cost | High |
"Many business apps benefit most from a **queue-then-sync** approach." — matches our outbox design.

### R13.4 Efficiency rules (important for Egyptian data plans)
- **Delta sync only** — never re-sync the whole dataset on reconnect; send only changed fields/rows.
  Full sync "will consume massive amounts of bandwidth and drain the battery".
- Compress payloads; use efficient formats; batch, throttle and debounce network calls.
- Optimise and lazily load images; adapt loading strategy to detected network quality.

### R13.5 Conflict resolution
- Last-write-wins: simple, but can silently discard important updates.
- CRDTs: for collaborative/data-critical apps.
=> For us, neither: our conflicts are about **authoritative server state** (a seat was taken, a ride
   was cancelled). Correct model is **server authority + explain the change to the user**, which is
   already what CH9 §9.4 specifies.

### R13.6 The explicit warning that applies to us
The research warns AGAINST offline-first for "real-time dispatch" systems, which "often require
immediate server validation, making offline-first risky and expensive."
=> This validates the split already in DEC-091: **booking/matching stays online-only** (it allocates
   a scarce resource), while **the driver's journey execution goes offline-first** (it records what
   already happened). The rider app is offline-capable; the driver app is offline-first.

### R13.7 Required UX affordances for offline states
- Clear offline indicators, a count of queued changes, and a last-synced timestamp.
- Tell users plainly which actions are deferred.
- Never rely on a naive "is online" flag — test against genuinely unstable networks, not just
  airplane mode.

---

## R14 — Fixed-route vs demand-responsive, and who should initiate (research pass 9, for G-054)

Sources:
- ScienceDirect 2026, "Fixed-route or demand-responsive transit? An evaluation framework for transit
  service structures using dual-perspective indicators"
  https://www.sciencedirect.com/science/article/pii/S1077291X26000159 (includes a literature table
  of 14 studies, 2007-2025)
- CivicWell on AC Transit Flex https://civicwell.org/civic-news/microtransit-right-sizing-transportation/
- movmi DRT guide https://movmi.net/blog/exploring-demand-responsive-transit-drt-the-history-business-models-benefits/
- Human Transit, "Microtransit: What I Think We Know" https://humantransit.org/2018/02/microtransit-what-i-think-we-know.html
- Via https://ridewithvia.com/resources/microtransit-myth-on-demand-public-transit-is-too-expensive
- RideCo, N-CATT, Mobility CoE, Shared-Use Mobility Center (Lynden Hop case)
- Swvl Business https://www.swvl.com/en/blog/exploring-employee-transport-solutions

### R14.1 The central finding — it depends on DEMAND DENSITY, and the threshold is known
The 2026 evaluation paper concludes: **FRT performed better on cost, schedule adherence and
ridership**, making it "suitable for areas with regular passenger demand". **DRT performed better
on accessibility in low-density areas** and for transit-captive populations.

Quantified thresholds from the literature table:
- Li & Quadrifoglio (2010): "DRT outperforms FRT when demand is **below 10-50 passengers per square
  mile per hour** depending on layout... **FRT becomes preferable at higher demand**."
- Edwards & Watkins (2013): DRT wins "at low demand levels (under 6 passengers per minute)...
  **FRT becomes more efficient as demand rises**."
- Mehran et al. (2020): "DRT operates at lower cost than FRT at low demand levels, but **FRT is more
  cost-effective as annual ridership increases beyond ~132,573 passengers per year**."
- Yoon et al. (2022): "DRT reduces user waiting and walking time in low-demand settings, but **FRT
  achieves better efficiency (lower VKT, higher vehicle utilization) under high-demand conditions**."
- Berrada & Poulhès (2021): replacing FRT with DRT "**reduces social welfare and ridership**" when
  demand is high.

### R14.2 Real cost figures (the gap is large, not marginal)
- **AC Transit (California):** Flex/microtransit cost **$72 per passenger vs $25** on the fixed
  route it replaced — ~3x. Riders liked it (94% preferred it), but the economics did not work.
- **Rural England (White 2016):** public cost per passenger trip **£1.35-1.62 for FRT vs £9-19.96
  for DRT** — 6-12x.
- Counter-evidence where DRT wins: San Antonio VIA replaced three UNDERPERFORMING routes and cut
  cost per passenger from $11 to $7 (-36%); Hall County GA replaced three underperforming routes and
  halved operating cost. **Note the pattern: DRT wins where fixed routes were already failing.**

### R14.3 Rider satisfaction
Wong et al. (2023): "Passengers were **less satisfied with DRT than FRT**, with FRT scoring higher
service quality except for longer service hours." Punctuality and schedule adherence are better
under FRT — which matters because predictability is what commuters buy.

### R14.4 Explicit guidance against DRT in our exact launch context
movmi's guide lists when NOT to use demand-responsive:
- **"Dense urban routes** — in dense urban environments with short trip distances... fixed-route
  services benefit from economies of scale. DRT's smaller vehicles and dynamic routing are less
  efficient in these settings."
- **"Peak-hour commuter corridors** — during peak commuting periods, predictable travel patterns and
  high passenger volumes favour scheduled, high-capacity transit. Deploying DRT in peak hours can
  increase per-trip costs."
- "When budgets cannot support higher per-trip costs."
=> **Alexandria university corridors at 07:00-09:00 are precisely "dense urban + peak commuter".**
   Every listed contra-indication applies to our launch case.

### R14.5 The economic argument for why fixed routes emerge naturally
Human Transit walks through the logic from first principles: an on-demand shared service, as demand
grows, is forced by economics toward fixed intervals (waiting for a full vehicle is unacceptable to
riders), then toward straight routes (detours punish everyone on board), then toward walking to
stops (door service destroys frequency). Conclusion quoted: "An on-demand, sharing system operates
in a very small window between the fixed route systems — that are cost effective with even moderate
demand — and the taxi cab system (only cheapest when ridership is extremely low)."
**Our design has already independently arrived at all three of those conclusions** (stops not doors
DEC-004/038, straight routes protected by detour limits CH6a, timetables DEC-119).

### R14.6 The consensus resolution: hybrid, not either/or
- Itani et al. (2024): "**DRT should be seen as a complement to FRT, not a replacement.**"
- Calabrò et al. (2023): "**Reallocating service between FRT and DRT reduces waiting time by up to
  36% and operational cost by up to 24% compared to pure FRT** under moderate demand."
=> The best-performing configuration is a fixed-route SPINE with demand-responsive elements at the
   edges (low-density areas, off-peak hours, first/last mile).

### R14.7 What Swvl actually does (the nearest local comparable)
Swvl calls drivers **"Captains"**. Their business product uses **dynamic routing** with GPS
re-optimisation when incidents cause delays, plus "multiple backup systems... so that your employees
are picked up and dropped off on time". Captains do NOT invent routes or set fares — Swvl plans the
network and the Captain drives it. Riders book a **seat on a scheduled run**.

### R14.8 Driver-side evidence
Shared-Use Mobility Center (Lynden Hop, operated in-house) reported that running the service
in-house "gave WTA more control over staffing and scheduling, allowing operators **greater
flexibility in choosing shifts** and opportunities to work on either fixed-route or on-demand
service." A driver interviewed said microtransit built closer relationships with passengers.
=> Drivers value **choosing shifts**, not inventing routes. The flexibility they want is
   *when to work*, not *what to plan*.

### R14.9 AGENT CONCLUSION for G-054
The evidence points one way for the Alexandria launch context (dense corridors, peak commuter
demand, price-sensitive riders, and a small operator that cannot absorb $72-per-passenger economics):

**Fixed routes, operator-defined. Drivers choose WHEN, never WHAT.**

Specifically:
1. The operator owns the route network: stops, sequence, flat fare (DEC-115), service window and
   target frequency (DEC-119). This is R14.1/R14.4/R14.7.
2. Drivers do not invent routes, set prices, or predict demand — that is the "hassle" the user
   correctly identified, and R14.8 says it is not the flexibility drivers actually want.
3. Drivers get flexibility over SHIFTS and DEPARTURES: claim a scheduled departure, or open one on
   an approved route inside its service window with one tap.
4. Demand-responsive behaviour is kept where the evidence says it belongs: **at the edges** —
   street pickup within a detour budget (DEC-063), skipping stops with nobody waiting (DEC-041),
   and adding extra departures when demand appears. This is R14.6's hybrid.
=> This is Model C from the WHO_INITIATES audit, with the operator side strengthened.

---

## R15 — Complaint/report thresholds: is 10% suitable? (research pass 10, for G-044)

Sources: getridewise "Uber and Lyft Driver Ratings Explained" https://getridewise.com/blog/uber-lyft-driver-ratings-explained ;
RideGuru https://ride.guru/content/newsroom/what-do-ratings-mean-for-rideshare-drivers ;
Gridwise deactivation guide https://gridwise.io/blog/gig-driver-deactivation-appeal ;
peanutpolitician (citing a 2023 EPI report).

### R15.1 The industry does NOT use a complaint percentage — it uses a rating average
- Uber: deactivation at roughly **4.6 average over the last 500 trips** (4.65-4.7 in high-volume
  markets like NYC). Not published officially, varies by city.
- Lyft: threshold generally **4.6-4.8** depending on market, over the last ~100 trips.
- Both combine the rating with **acceptance rate, cancellation rate and complaint volume**.

### R15.2 Translating a rating threshold into a complaint rate
A 4.6 average out of 5 means the driver is losing 0.4 stars per trip on average. In practice a
driver sits near 4.9 when ~2-4% of riders rate them 1-3 stars. Falling to 4.6 typically requires
roughly **8-12% of riders rating poorly** — i.e. the industry's effective tolerance before
deactivation review lands close to **~10%**.
=> **The user's 10% instinct is well-calibrated.** It sits in the same band as Uber/Lyft's
   effective tolerance, arrived at independently.

### R15.3 But percentage alone is dangerous at low volume
A driver with 8 completed rides and 1 report is at 12.5% — above threshold, on a single complaint
that may be unfair. Both major platforms mitigate this with a **large rolling window**
(500 trips Uber, ~100 Lyft) so early noise cannot trigger deactivation.
=> A percentage rule needs BOTH a **minimum ride count** and a **rolling window**, or it will
   punish new drivers for statistical noise.

### R15.4 Pattern detection matters more than the raw number
Gridwise, on Uber: "**Multiple complaints about the same behavior pattern — even if no single
incident is severe — can add up.**" Lyft similarly reviews on "safety reports" independently of
rating.
=> Category clustering (3 reports all about the same thing) should escalate even when the overall
   percentage is low.

### R15.5 The fairness problem, documented
A 2023 EPI report (cited secondhand) states **30% of drivers faced deactivation threats due to low
ratings, with no clear recourse**, and that ratings are affected by factors outside a driver's
control (traffic, other passengers). Seattle created the first municipal deactivation appeals panel
in response.
=> Any automatic threshold MUST be paired with: human review before action, a stated reason, and an
   appeal path. An automatic ban on a percentage alone is both unfair and a reputational risk.

### R15.6 AGENT RECOMMENDATION for G-044
The user's 10% is a good headline number. It should be implemented as:
- **Report rate ≥ 10%** of completed rides, **AND** a minimum of **20 completed rides**, measured
  over a **rolling window of the last 100 rides** → raises a HUMAN REVIEW alert to Ops (not a ban).
- **Severe categories** (assault, harassment, dangerous driving, discrimination) → immediate
  precautionary suspension pending investigation, regardless of percentage (already CH12 §12.2).
- **Category clustering**: 3+ reports in the same category within 30 days → human review even if
  below 10% (R15.4).
- **No automatic deactivation ever.** A human decides, states a reason, and the driver may appeal
  (R15.5).
All thresholds are configuration (DEC-070), tunable per city.

---

## R16 — OSM data quality in Egypt (research pass 11, for G-003/G-007)

Source: Barrington-Leigh & Millard-Ball, "The world's user-generated road map is more than 80%
complete", PLOS ONE 2017 https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0180698

### R16.1 The finding that matters, and it is bad news for us
Global OSM road completeness is ~83%. But the paper names Egypt explicitly as one of the WORST:
> "At one extreme, we estimate that **less than one-third of the streets in China, Egypt and
> Pakistan are in the OSM database**, compared to more than 95% in Cuba, Ecuador and Syria as well
> as most European and North American countries."

### R16.2 Mitigating nuance
- The study is from 2017; OSM in Egypt has grown since. Magnitude of improvement is [UNVERIFIED].
- Completeness has a **U-shaped relationship with population density**: "both sparsely populated
  areas and dense cities are the best mapped." Central Alexandria is dense, so it is likely far
  better mapped than the national average.
- Other work finds "high-level roads and urban traffic networks of OSM data have high positional
  accuracy and completeness" — i.e. **main roads are fine; side streets are the gap.**

### R16.3 Why this is survivable for OUR design specifically
Our architecture is unusually insulated from side-street gaps:
1. **Boarding happens only at admin-verified stops** (DEC-038/040) — a human physically visits and
   places each one, so stop positions do not depend on OSM at all.
2. **Routes are operator-defined** along known corridors (DEC-132), which are main roads — exactly
   the part OSM maps well (R16.2).
3. **We do not need door-to-door navigation** into unmapped alleys; door-to-door was dropped
   (DEC-067).
4. Street pickup is bounded by a detour budget on or near the route (CH6a), not deep into side streets.
=> The design decisions already taken have accidentally minimised our exposure to Egypt's weakest
   OSM coverage.

### R16.4 The residual risk and the required action
Risk remains for: walking-route calculation to a stop (needs pedestrian paths), and travel-time
accuracy if a corridor's geometry is wrong or missing turn restrictions.
**Required before committing to self-hosted OSRM (G-003/G-007):**
- Download the Alexandria extract (Geofabrik) and measure: are the launch corridors present, are
  turn restrictions and one-ways tagged, and do walking routes to candidate stops resolve?
- Compare a sample of OSRM travel times against a commercial provider on the same corridors.
- Contribute fixes upstream where the launch corridors are wrong — this is cheap and permanent.
This is a **field/engineering task**, not a product decision. It must be done in Phase 2 (CH16),
before the routing engine is committed.

---

## R17 — Runtime configuration management (research pass 12, for the config catalogue)

Sources: momentslog "Runtime Configuration Change Checklist"
https://www.momentslog.com/development/runtime-configuration-change-checklist-how-to-reduce-production-risk-without-slowing-every-release ;
Ensolvers "Configuration as Architecture" https://www.ensolvers.com/post/configuration-as-architecture-designing-per-client-features-at-scale ;
Unleash feature-flag best practices https://docs.getunleash.io/guides/feature-flag-best-practices ;
medium/subham11 config management; northflank multi-tenant guide.

### R17.1 Config values and feature flags are DIFFERENT things — do not merge them
Ensolvers: feature flag systems "are designed to control release behavior and short-lived runtime
decisions and not to represent the long-term structure of product capabilities. When tenant
customization is primarily based on feature flags, these flags gradually start to describe
permanent system states instead of temporary rollout controls."
=> Our catalogue must separate: (a) BUSINESS PARAMETERS (permanent, e.g. `MaxScheduleSlip`),
   (b) FEATURE TOGGLES (temporary, removable, with an owner and expiry).
Unleash: "Treat feature flags like technical debt. Give them owners, set expiration dates, and add
cleanup tasks to your backlog."

### R17.2 Every key needs a defined SCHEMA before it exists
Recommended per key: "keys, types, scopes, validation rules"; "Validate config with JSON Schema or
custom validators before promotion"; "Confirm validation rules, units, allowed bounds,
missing-value behavior, and fallback behavior."
=> Our catalogue columns are therefore: key · type · unit · allowed range · default · scope ·
   who may change it · risk tier · behaviour if missing.

### R17.3 Safe defaults are where incidents actually happen
momentslog: "**many incidents happen during fallback, not during the initial change.** Ask what the
service does if the config store is temporarily unavailable, if the value cannot be parsed, if the
key is missing... The safest behavior is rarely universal. For a rate limit, failing closed may
protect a dependency but harm users. For an authentication flag, failing open may be unacceptable."
=> Every key must declare its **missing-value behaviour** explicitly. Add a startup fail-safe:
   "if config is unavailable, either use last known good or fail fast with clear logs."

### R17.4 Risk tiers govern how much ceremony a change needs
momentslog proposes three tiers based on **blast radius** (who is affected if wrong),
**reversibility** (can we restore quickly) and **coupling** (does it silently affect billing, auth,
retries, cache, third-party usage).
- Low: narrow, reversible, visible.
- Medium: customer-facing behaviour with a straightforward rollback.
- High: money, security, or wide blast radius.
=> Maps directly onto our roles: Manager may change LOW/MEDIUM commercial keys; SUPER ADMIN only for
   HIGH-risk keys; security and permission rules are NOT configuration at all (CH8a §8a.4).

### R17.5 Rollout and rollback discipline
"Roll out in the smallest practical slice... Define a rollback trigger before rollout expansion...
Leave an audit note with the outcome, timing, dashboard links." Also: "Build a quick rollback: one
click to revert to previous version; alert on error rates after changes."
=> Confirms CH6a §6a.4 and CH8a §8a.4: preview-before-publish, versioning, one-click rollback,
   mandatory reason. Add: **a rollback trigger must be stated before a high-risk change goes live.**

---

## R18 — Notification strategy (research pass 13, for the message catalogue)

Sources: vmobify "Push Notification Strategy 2026" https://vmobify.com/blog/push-notification-strategy ;
MagicBell "SMS Notification Best Practices 2026" https://www.magicbell.com/blog/sms-notification-best-practices ;
NN/g "Transactional Notifications" https://www.nngroup.com/articles/transactional-notifications/ ;
insiderone SMS practices; dualmedia push strategy.

### R18.1 The three-tier model (this is the structural fix)
vmobify: "Segmenting notifications into three tiers — **transactional (always send)**, **behavioural
trigger (action/inaction based)**, and **promotional (explicit opt-in only)** — is the fastest
structural fix for notification fatigue and uninstall rates."

### R18.2 Frequency caps, quantified
| Tier | Cap |
|---|---|
| Transactional | **Unlimited, but only when the trigger fires.** "No transactional event should be suppressed by promotional frequency caps." |
| Behavioural | **Max 2/day, minimum 4-hour gap** |
| Promotional | **Max 1/day, max 5/week** |
| Global (non-transactional) | **Max 3 per 24 hours across all types** |
MagicBell for SMS: promotional 2-4/month recommended, 8/month maximum; transactional as needed.
"Opt-out rate above 1%: review your frequency or relevance."

### R18.3 Channel choice: SMS vs push (directly applicable to us)
NN/g: "Save SMS messages for **urgent and crucial information that users need to refer to later** or
that they need to respond to quickly; use push for nonurgent communications as some users may block
them." Also: "sending push notifications is **connectivity-dependent** and, in environments with
poor data-signal strength, notifications may struggle to reach mobile phones."
=> For Alexandria's uneven networks: **safety-critical and boarding-critical messages need an SMS
   fallback**, not push alone. This matches our offline-first posture.

### R18.4 Retries
MagicBell: "**Only retry transactional messages. Skip promotional retries.**"

### R18.5 Opt-out and control
NN/g: allow users to opt out **per channel**, and to customise frequency/type. Every SMS must carry
an opt-out instruction. Our CH10 §10.6 already requires per-category control with ride-status
non-disableable — R18.1 confirms that transactional messages are legitimately exempt.

### R18.6 The metric that tells you you are over the line
vmobify: "The most reliable signal that you have exceeded your audience's tolerance threshold is a
**rising 7-day opt-out rate** — monitor this weekly."
=> Becomes a required analytics metric (screen G-18).