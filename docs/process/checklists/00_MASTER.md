# MASTER CHECKLIST

One row per milestone. Status changes only when the milestone's own checklist
file is fully ticked and pushed.

| Milestone | What | Checklist | Status |
|---|---|---|---|
| M0 | Foundations & guard-rails; empty skeleton deploys to Railway | [M0_foundations.md](M0_foundations.md) | **Done** — deployed & verified live |
| M1 | Identity, auth, real system (no demo data), landing page, motion | [M1_identity_auth.md](M1_identity_auth.md) | **Done** |
| M2 | Geography — stops, mapping tool, corridor | [M2_geography.md](M2_geography.md) | **Done except P2.5 fieldwork** |
| M3 | Routes, slots & the core journey (first vertical slice) | [M3_core_journey.md](M3_core_journey.md) | **Code done** — e2e corridor pass not recorded |
| M4 | Safety & support | (B4 on main) | **Code done** — SOS/report/share/queue |
| M5 | Commercial control | `M5_commercial.md` | Path A — not this file |
| M6 | Recurring travel | `M6_recurring.md` | Not started |
| M7 | Mobile (Android APK) | [M7_capacitor.md](M7_capacitor.md) | **P7.1–P7.6 pipeline done** — Play secrets owner |
| M8 | Validation & launch | [M8_launch.md](M8_launch.md) | **Gate open** — blockers listed, live health green |

## Legend

- **Done** — checklist ticked, `pnpm verify` green, pushed.
- **In progress** — current milestone.
- **Not started** — blocked on the previous milestone completing.

## External accounts needed (owner-owned; each unblocks a specific point)

| Milestone | Item | Used for | Blocker? |
|---|---|---|---|
| M0 | Railway account + repo connection | deployment (P0.12) | P0.12 only |
| M1 | SMS provider key | OTP sign-in | No — sandbox adapter until then |
| M2 | Google Maps Platform key | map surface + geocoding | No — sandbox adapter |
| M3 | Paymob sandbox keys | card payments | No — cash + ledger first |
| M8 | Google Play developer account | APK store listing | M8 only |

## Remaining work for the next builder

Canonical remaining-work file (complete + 2026-08-25 reality patch):
[`docs/planning/NEXT_AGENT_HANDOVER.md`](../../planning/NEXT_AGENT_HANDOVER.md).
