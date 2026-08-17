# CHAPTER 10 — UX: Screens, Flows & Interaction Design

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
