# CHAPTER 6a — The Pricing Formula (street pickup surcharge)

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
