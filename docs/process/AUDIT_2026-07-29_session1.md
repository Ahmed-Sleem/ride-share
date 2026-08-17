# FULL AUDIT — Session 1 checkpoint (2026-07-29)
Performed on user instruction: "pause to think, audit, make sure you do not miss anything, if you
miss anything schedule it to be thought of in the future, document all to avoid forgetting."

## PART A — Is every original requirement from the user's first message still tracked?

| # | Original requirement (session 1 message) | Where it now lives | Status |
|---|---|---|---|
| 1 | "Like Uber but each car carries more than one person" | CH1 domain model; DEC-019 | TRACKED |
| 2 | "Special points on the map for people and cars to meet" | CH4 (next); DEC-038/040/041/043 | TRACKED |
| 3 | "Must be a very strong algorithm" | CH5; research R4 | TRACKED — not yet designed |
| 4 | "Admins with dashboards in the app" | CH11; expanded by DEC-045 | TRACKED |
| 5 | "Identifiers to input new cars by admins, properties, how many people" | CH2 §2.3; DEC-034/039 | TRACKED |
| 6 | "Choosing trip before it, with a day or longer" | BookingPolicy (CH1 §1.4); CH3 | TRACKED — not yet designed |
| 7 | "Periodic things, like each day to work" | RecurringPlan (CH1 §1.2); CH3 | TRACKED — not yet designed |
| 8 | "App must encourage people to do these more than the now thing" | CH7 incentives | TRACKED — not yet designed |
| 9 | "Web, works on mobile, and also mobile app" | DEC-014/015/016 | TRACKED |
| 10 | "Special accounts for cars and admins, users normal accounts" | CH2; DEC-045 (now 6 roles) | TRACKED |
| 11 | "Anyone car register" | DEC-034 self-service door | TRACKED |
| 12 | "Where to do processing: server, app, or hybrid" | DEC-009; CH8 | ANSWERED |
| 13 | "All details must be thought of, all things must be perfect" | This audit + 17-chapter plan | ONGOING |

**Result: no original requirement has been lost.**

## PART B — Requirements the user added later, and whether they are tracked
| Added requirement | Where | Status |
|---|---|---|
| Tri-modal product (carpool + shuttle + commercial) | DEC-001 | TRACKED |
| Alexandria -> Cairo -> generic scaling | DEC-002 | TRACKED |
| Three pickup tiers with different prices | DEC-004 | TRACKED — pricing not yet designed |
| Universities + fleet-owning companies as channels | DEC-005 | TRACKED (offline only, DEC-031) |
| Full product, no MVP, build all before launch | DEC-006 | TRACKED — conflicts with team size, see R-1 |
| Agent as technical lead producing task packages | DEC-007, DEC-013 | TRACKED — CH16 |
| Open-source reuse | DEC-008 | TRACKED — A3 candidate table |
| One app, role-adaptive UI | DEC-014 | TRACKED — G-011 |
| Web first, then app | DEC-015 | TRACKED — G-012 |
| Full i18n, Arabic+English, RTL | DEC-017 | TRACKED |
| Organization-agnostic, "just ride like Uber" | DEC-029 | TRACKED |
| No organizations at all | DEC-031 | TRACKED |
| Legal handled by user's legal team | DEC-030 | HANDED OFF |
| Transfers = independent bookings, refund only failed leg | DEC-025 | TRACKED |
| Strict human driver verification | DEC-035 | TRACKED |
| Driver-accountable, vehicle-as-attribute | DEC-039 | TRACKED |
| Mapping team + mapping tool | DEC-040 | TRACKED — G-022 |
| Manager role, flash sales, live numbers, notifications | DEC-045 | TRACKED — G-023 |

## PART C — Things NOT yet raised with the user that WILL matter (scheduled, not forgotten)
These are logged now so they cannot be lost. Each will be raised as an MCQ in its chapter.

| ID | Topic | Chapter | Why it matters |
|----|-------|---------|----------------|
| F-01 | Cancellation & no-show policy (who pays, how much, how many free) | CH3 | Directly affects driver trust and revenue |
| F-02 | What happens when a driver cancels on a full vehicle mid-route | CH3 | Worst operational failure mode |
| F-03 | Rider waiting time at a stop before the vehicle leaves without them | CH3 | Affects everyone else on board |
| F-04 | Live ETA accuracy and what riders are shown when traffic changes | CH3/CH5 | Main source of complaints in every ride app |
| F-05 | Surge / dynamic pricing — do we do it at all? | CH6 | Highly sensitive in the Egyptian market |
| F-06 | Cash handling in a pooled vehicle (multiple payers) | CH6 | Research R6 flagged this as genuinely hard |
| F-07 | Driver payout timing and method | CH6 | Determines driver retention |
| F-08 | Commission model per supply type | CH6 | Core revenue mechanics |
| F-09 | Rating system: two-way? visible? consequences? | CH12 | Quality control |
| F-10 | Gender preference options (women-only seats/vehicles) | CH12 | Highly relevant in Egypt; safety and adoption |
| F-11 | SOS / emergency button and incident escalation | CH12 | Safety-critical |
| F-12 | Trip sharing with a family member ("follow my ride") | CH12 | Standard expectation now |
| F-13 | Fraud: GPS spoofing, fake rides, collusion between driver and rider | CH12 | Money loss vector |
| F-14 | Referral program mechanics | CH7 | Growth |
| F-15 | Loyalty/streaks for daily commuters | CH7 | The user's "encourage people" requirement |
| F-16 | What the rider sees when NO ride can be found | CH10 | Determines whether they ever come back |
| F-17 | Offline behaviour: what works with no signal | CH8/CH10 | Egyptian network reality |
| F-18 | Low-end Android performance budget | CH8/CH10 | Most of the market |
| F-19 | Notification strategy: what, when, which channel, opt-outs | CH10 | Now bigger due to DEC-045 campaigns |
| F-20 | Data retention & export capability for authorities | CH13 | Technical duty even though legal is handed off |
| F-21 | Driver onboarding funnel and time-to-first-ride | CH10/CH16 | Supply growth bottleneck |
| F-22 | Multi-city rollout mechanics (city as a configuration unit) | CH8/CH15 | DEC-002 scaling promise |
| F-23 | Pricing/parameter changes without redeploying | CH8/CH11 | Manager role needs this (DEC-045) |
| F-24 | Simulation plan before launch (FleetPy) | CH14 | Validate the algorithm with zero users |
| F-25 | Vehicle capacity vs comfort (do we sell every seat?) | CH4/CH5 | 3 in the back of a small car is not the same as 3 in a van |

## PART D — Open contradictions and risks right now
| ID | Issue | Severity |
|----|-------|----------|
| R-1 | "Build everything before launch" (DEC-006) + 2 developers + now 6 roles and a promotions engine (DEC-045). Timeline grows with each addition. A hiring plan tied to phases is mandatory in CH16. | HIGH |
| R-2 | Open public network (DEC-029) sits inside Egypt's ride-hailing law per R1. Handed to legal (DEC-030) but the technical system must be able to comply. | HIGH (owned by legal) |
| R-3 | Web-first (DEC-015) cannot support reliable driver background location (G-012). | MEDIUM |
| R-4 | Admin-curated stops (DEC-038) make launch dependent on a manual survey completing. | MEDIUM (resourced, DEC-040) |
| R-5 | Cash in pooled rides (F-06) unsolved. | MEDIUM |

## PART E — Verification of this session's own work
- All chapter files exist and are non-empty: verified by `wc -l`.
- Decisions register contains DEC-001..DEC-045 with no gaps in numbering: verified below.
- Every CLOSED gap has a decision reference: verified by inspection of AUDIT_AND_TODO.md.
- No code has been written yet, so no tests apply. This is a documentation-only session. [ACCURATE]
