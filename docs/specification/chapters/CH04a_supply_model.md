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
