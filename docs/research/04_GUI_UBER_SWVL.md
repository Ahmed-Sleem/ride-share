# R19 — GUI references: Uber, Swvl, and desktop-density best practice

> Research pass (2026-08-19). Sources: Uber "Base" design system breakdown, Uber UX
> teardowns, Swvl company/market research, and 2026 responsive-design guides. What we
> borrow, and what we deliberately do NOT, is decided in DEC-199..201 and the GUI polish
> checklist. This file is the memory — return to it before GUI work.

## 1. Swvl — the model we already match (validation)

- Swvl runs **fixed routes, fixed timings, fixed stops, fixed prices** — "book a seat on a
  minibus", 60–80% cheaper than ride-hailing, no surge. This is exactly the M3 supply model
  (DEC-132) and the route-ticket model (DEC-114/115).
- Swvl's profitability came from **recurring contracts/subscriptions**, not one-off B2C — this
  is why DEC-051 made subscriptions central and why recurring driver claims (T9) exist.
- Swvl's rider flow: "choose your pickup and drop-off stations + preferred time, book a ride".
  Our DEC-120 refines this: pick a ROUTE → boarding point → departure (destination is free
  alighting, DEC-140).

**Borrow:** the mental model ("book a seat on a line"), the subscription emphasis, and the
promise of "on time, every time" (schedule adherence, DEC-119).

## 2. Uber GUI — what to borrow (and what not to)

### The Base design system (Uber's own)
- Near **black-and-white canvas**; the map and content do the colour work. **One accent used
  sparingly** so it always means something. → We already have a two-role accent system
  (violet = go, coral = value); keep it scarce and meaningful.
- **"Go big" on type** for legibility; **"less is more"** on choices (few sizes, few decisions
  per screen).
- Pill-shaped inputs with generous padding; high-contrast primary action.

### Uber rider flow teardown (what works)
1. **"Where to?" is the single hero action** — geolocation auto-fills, suggestions + recent
   places, one unmistakable next step.
2. **The map is the stage; the UI recedes** — bottom sheets carry the decisions.
3. **Price upfront** before confirm (we have a flat fare — show it huge).
4. **Linear status strip** — booked → arriving (live ETA) → onboard → complete.
5. **Best option first, then a couple more** — "Recommended" first (we have the chip).
6. **Two-way ratings, driver name/vehicle/rating up front** — builds trust.
7. Uber scored only **66.75/100** on the SUS — "average". The bar to beat is low; a calm,
   legible flow already wins.

### What we do NOT copy
- Surge/dynamic pricing (DEC-113 bans it — flat fare only).
- Door-to-door destination routing (DEC-067 dropped it).
- Heavy dark "premium" aesthetic — we keep the youth-modern violet/coral pop palette (owner).

## 3. Landing page — what a production ride-share landing needs

(Uber/Swvl/industry convention, matched to what we ship.)

| Section | What it says | Honesty note |
|---|---|---|
| Hero | One value line + primary CTA (create account) | ✅ have |
| How it works | 3 steps (pick route → book → board by code) | ✅ have |
| **For riders** | book a seat, one fixed price, track live, get off anywhere | **add** |
| **For drivers** | apply, claim a slot in two taps, earn, weekly payouts | **add** |
| **Safety/trust** | verified drivers, boarding code, SOS/share, support | **add** (M4 items labelled honestly) |
| **Policies footer** | Terms, Privacy, Safety, license | **add** (legal text = owner's, DEC-030) |
| Social proof / FAQ | optional | later |

## 4. Desktop density & adaptive sizing — best practice (2026)

- **No single "desktop size"; design for ranges.** Baseline mobile ~360px; content container
  **~1140–1200px** centred on desktop (we already use `--landing-max:1120px` /
  `--shell-max:1600px` / `--content-max:840px`).
- **Reading measure**: keep text lines at **45–75ch**; on desktop, split wide screens into
  columns rather than stretching one column to 1920px.
- **Density on desktop = smaller controls + tighter spacing than touch** (a mouse is precise,
  no 44px thumb rule needed). Material-style "comfortable vs compact": desktop gets a compact
  density (smaller type, tighter rows, denser tables) while touch keeps 44px+ targets.
- **Fluid type with `clamp()`** and container queries for component-level responsiveness; use
  `rem`/`%`/`clamp`, not fixed px, for anything that scales.
- **Breakpoints where content breaks**, not per device: we already use Material 3 classes
  (compact <600 / medium ≥600 / expanded ≥840 / large ≥1200 / x-large ≥1600).
- **Desktop-specific**: hover states, denser tables (our staff tables already get the wide
  treatment), and a *visually distinct* desktop shell — smaller chrome, more white space used
  productively (two-pane where useful), not a stretched phone.

## 5. Decisions this research fed

- DEC-199 — the "pick start & end → recommend best journey(s)" planner is a **post-core search
  layer** on top of the route-ticket model (single-leg first, 2-leg mixes after).
- DEC-200 — **desktop gets its own density/shell** (compact controls, tighter rows, two-pane
  where useful) while touch keeps the 44px standard; same tokens, different values per
  breakpoint.
- DEC-201 — **landing page grows** the "for riders / for drivers / safety / policies" sections
  above; legal text stays the owner's (DEC-030).
