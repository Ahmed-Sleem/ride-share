# Audit — GUI rebuild to final-app form

## Defects reported by the user

### D1 — bottom dock scrolled away on mobile
Root cause: `.nav` was `position:absolute; bottom:16px` inside `.stage`, whose
height grew with content. Nothing tied it to the viewport, so on any screen
taller than the stage it travelled with the page.
Fix: real app shell. `#root` is `100dvh`; `.app` is a flex column; `.main` is
the only element with `overflow-y:auto` and carries `min-height:0` so it
shrinks instead of pushing; `.dock` is a sibling with `flex:none`. The dock is
now structurally incapable of scrolling. Safe-area inset added for the phone
home bar.
Guarded by 9 assertions; 4 break tests.

### D2 — "Search a route" was the wrong size
Root cause: `class="rowitem card"`. Both classes declare `padding`
(12px vs 16px), so the cascade picked one and the control rendered at a
different height from the cards beneath it, while still drawing a card border.
It was also grey placeholder text styled to look like a text field it was not.
Fix: `.searchbar`, a component that owns its own box (52px, full width). Two
variants: a button that navigates (home) and a real labelled input (lists).
No element now takes its padding from two competing classes.
Guarded by 8 assertions; 2 break tests.

## Defects found by the audit (not reported)

| # | Finding | Fix |
|---|---|---|
| 1 | `.qrcode` hardcoded `#151A21`; QR/switch/danger/attribution used `#fff` | Added `--qr-paper`, `--qr-ink`, `--knob`, `--on-solid`. QR ink is a deliberate, documented departure: it must stay dark-on-light in dark mode or a scanner cannot read it. |
| 2 | Test read `document.body.textContent`, which includes the inline script, so the role-boundary check matched source code rather than the screen — a test failing for the wrong reason (§7.0) | Scoped to `.app`. |
| 3 | 15 of 27 rider screens and most staff screens fell through to "Screen not in this prototype" | All 30 screens implemented. |
| 4 | No auth flow existed | R-01…R-05 added. |
| 5 | Back buttons hardcoded a destination; some screens had none | Real navigation stack; `back()` pops it. |
| 6 | Navigation defined in 4 places (`NAV`, `NAV_LABEL`, `SCREEN_ID`, `screenFor` map) — adding a screen meant editing four | One `PAGES` table. Adding a screen = one entry. |
| 7 | Demo harness (role/lang/theme/offline pills, screen-ID badge) shipped as product chrome | Removed. Language and theme now live in Profile, where a user would look. |
| 8 | Sheets could not be dismissed by scrim or Escape | Scrim click + Escape handler. |
| 9 | Seat stepper had no bounds feedback | Min/max now disable. |
| 10 | Driver demand forecast showed a bare number | Shows its evidence: "12 riders searched this slot yesterday" (settles G-059 in the UI). |

## Verification
- `app/verify.sh` — one command.
- 123 assertions, 0 failing.
- 18 break tests: each breaks the guarded thing, confirms red, restores. 18/18 caught.
- Anti-empty-set guards: assertions that examine a collection first assert it is
  non-empty, so `.every()` on nothing can never report success.

## Deliberate departures from the obvious choice
1. QR ink/paper not themed — scanner legibility beats theme consistency.
2. Vehicle colour `#1B62D6` allowed as a literal in the colour allow-list: it is
   sample *data* (the colour of a specific van), not interface chrome.
3. Role switcher retained in the top bar. In a signed-in build the account fixes
   the role and it is not rendered. It exists only because five products share
   one file for review.
