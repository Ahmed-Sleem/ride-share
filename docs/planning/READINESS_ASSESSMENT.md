# READINESS ASSESSMENT — 2026-08-01
Question asked: "are we ready now? what's missing? does anything need discussion?"

## THE HONEST ANSWER: not quite. Two chapters are missing, and ~20 real decisions sit inside
chapters rather than in the tracker.

### Defect found by this audit (mine)
The item tracker (AUDIT_AND_TODO) said **0 open decisions**. That was misleading: I had been
closing tracker gaps (G-nnn) while leaving genuine open questions inside chapter "Open items"
sections, where they were never counted. **7 were already stale** (resolved by later decisions but
never struck through) — now fixed. The rest are real.

---

## PART 1 — MISSING CHAPTERS (2)
| Chapter | Status | Impact |
|---|---|---|
| **CH11 Dashboards** | Exists only as PART B inside `CH07_CH11_growth_dashboards.md` | Cosmetic — content is complete |
| **CH14 Quality & Verification** | Exists inside `CH13_CH14_CH15...` | Cosmetic — content is complete |
| **CH16 Delivery Plan** | Exists inside `CH08_CH16_CH17...` | Cosmetic — content is complete |
| **CH17 Risk Register** | Same file | Cosmetic — content is complete |
=> **No chapter content is actually missing.** Several chapters are bundled into shared files.
This is a naming/navigation issue, not a specification gap.

---

## PART 2 — REAL OPEN DECISIONS STILL INSIDE CHAPTERS (~20)
These were never surfaced as MCQs. Grouped by whether they block building.

### A. BLOCKS BUILDING — must be decided before the relevant code is written (8)
| # | Question | Chapter | Blocks |
|---|----------|---------|--------|
| A1 | Support refund limit: exact amount and frequency | CH6 | Support tooling, CH19 default |
| A2 | Driver cancellation penalty amount + rider compensation | CH6 | Money flows, CH18 §18.7 |
| A3 | No-show charge: is the rider charged, fully or partly? | CH6/CH3 | Booking lifecycle |
| A4 | Unused subscription days: roll over, expire, or partial credit? | CH6 | Subscription billing |
| A5 | Does `CancellationForfeitPercent` vary with time to departure? | CH6 | Cancellation logic |
| A6 | Staff 2FA mandatory? (agent recommends yes) | CH2/CH12 | Auth implementation |
| A7 | Support contact channel: in-app chat, phone, WhatsApp? | CH10/CH20 | Screens R-70, S-10..13 |
| A8 | `wallets.balance_minor`: materialised projection or computed on read? | CH9 | Ledger performance |

### B. NEEDED BEFORE LAUNCH, NOT BEFORE CODE (7)
| # | Question | Chapter |
|---|----------|---------|
| B1 | Suspension durations per severity | CH12 |
| B2 | SLA targets per ops queue | CH7/CH11 |
| B3 | Alert threshold defaults per city | CH7/CH11 |
| B4 | Periodic driver face-match while on duty? | CH12 |
| B5 | Can riders block being re-matched with a specific driver? | CH12 |
| B6 | Should street pickup be disabled at peak? Discounted for subscribers? | CH6a |
| B7 | Should the rider see WHY street pickup is unavailable? | CH6a |

### C. EXTERNAL / NOT DECISIONS (5)
Product name (parked, DEC-128) · brand palette + icon set (designer) · Arabic/English copy
(copywriter) · real cost quotes (vendor) · Alexandria OSM survey (field work, G-003/G-007) ·
config defaults from simulation (CH14).

---

## PART 3 — WHAT IS GENUINELY COMPLETE
- 147 decisions, all traceable, no numbering gaps
- 22 chapter files / 20 logical chapters
- 75 screens across 5 roles, each with 5 states
- 60+ config keys with ranges, defaults, risk tiers and fallback behaviour
- ~60 notification messages with tiers, channels and caps
- 34 invariants
- 18 research passes, all sourced
- Design system, operations runbook, full data model, API contract, algorithm pipeline

## PART 4 — VERDICT
**Phase 0 (foundations) could start today.** Monorepo, verify command, database, migrations,
config system, audit log, event log, CI, staging, infra-as-code, backups — none of that is blocked
by any open item.

**Phase 1-3 need the 8 Category-A answers**, all of which are small business-rule decisions
(amounts, percentages, yes/no) rather than design work.
