# MASTER CHECKLIST

One row per milestone. Status changes only when the milestone's own checklist
file is fully ticked and pushed.

| Milestone | What | Checklist | Status |
|---|---|---|---|
| M0 | Foundations & guard-rails; empty skeleton deploys to Railway | [M0_foundations.md](M0_foundations.md) | **Done** — deployed & verified live |
| M1 | Identity, auth, real system (no demo data), landing page, motion | [M1_identity_auth.md](M1_identity_auth.md) | **In progress** — planning |
| M2 | Geography — stops, mapping tool, corridor | [M2_geography.md](M2_geography.md) | **Done except P2.5 fieldwork** |
| M3 | Routes, slots & the core journey (first vertical slice) | [M3_core_journey.md](M3_core_journey.md) | **Next** |
| M4 | Safety & support | `M4_safety_support.md` | Not started |
| M5 | Commercial control | `M5_commercial.md` | Not started |
| M6 | Recurring travel | `M6_recurring.md` | Not started |
| M7 | Mobile (Android APK) | `M7_mobile.md` | Not started |
| M8 | Validation & launch | `M8_launch.md` | Not started |

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
