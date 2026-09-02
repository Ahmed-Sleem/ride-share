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
- **Shipped (round 5):** the family is self-hosted, not linked. The deliverable is one
  HTML file with no network, so `apps/web/assets/fonts/fonts.json` names the faces and
  `build.js` inlines them as `data:` URIs after checking each file's sha256, its woff2
  magic, its own budget and the bundle's total.
  - **Text and UI — Cairo** (OFL-1.1), variable on the `wght` axis 200–1000, subset to
    the Arabic ranges: 29,816 bytes of woff2. One file, so every `--fw-*` weight is a
    real outline and no browser emboldens a glyph — the reported "Arabic is never bold"
    was a missing bold face, not a missing rule.
  - **Poster display in Arabic — Jomhuria** (OFL-1.1), the Egyptian newspaper masthead
    face, offered by the owner and measured against Katibeh before choosing: its ink box
    is 0.64 em where the fallback's is 1.05 em, so the `@font-face` carries
    `size-adjust: 124%` and no component carries a per-language size fudge.
  - **Routing is by range, never by a rule:** each face declares `unicode-range` over
    Arabic only, so the Latin runs keep the brand's system stack and the letterforms
    nobody asked to change stay untouched. Measured: the Latin advance width is identical
    with and without these faces (498.07 px on a probe string), and the Arabic one moves
    to Cairo's (350.78 vs 362.56).
  - `Katibeh` stays in `assets/fonts/` with its licence, held out of the bundle: the
    manifest marks one face `display:true`, and flipping that flag is the whole change.
  - **One chain**: `packages/brand/brand.json` names the families, `body` and `.landing`
    both read `var(--brand-font)`. `body` had carried a second literal copy of the eight
    names, and the landing had no `font-family` at all — the poster had been rendering in
    whatever the user agent called its default. Both are fixed, and the duplicate is a
    tracked-then-closed gap (G-081).
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
> **SUPERSEDED BY DEC-176.** The Android application is built with **Capacitor** wrapping the web
> app, not Expo/React Native. One UI codebase. See BUILD_PLAN Phase 7 for the reason and for the
> P7.4 gate at which the driver app alone could revert to React Native.

- **Mobile application** (Expo/React Native): the **component structure and props port; the CSS does
  not** — React Native has no stylesheets, media queries or `backdrop-filter`. Tokens must be
  re-expressed as a JavaScript theme object shared through `packages/shared-logic` (DEC-085).

### 10a.11.4 Palette direction (DEC-169, supersedes the placeholder in DEC-127)
Adopt the reference's structure — near-black text on white, muted secondary text, hairline borders,
a soft neutral panel fill — and replace the pastel accents with the semantic tokens in §10a.1.
The exact brand hue remains open; the token architecture means it is a single-value change.
