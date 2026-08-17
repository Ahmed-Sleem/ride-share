# IMPLEMENTATION LOG

Every closed gap and every non-trivial change gets one entry here, in the
format below. Closing a gap requires proof (files changed, tests run, observed
output) — see the engineering standard §3.3 and §4.

## Format

```text
## <date> — <Gap ID or change one-liner>

- What: <one-line description>
- Files: <paths>
- Tests: <tests added or updated>
- Verified: <commands and observed output>
- Self-check: <fully fixed? wired and production-ready? does the test really validate the behaviour?>
```

---

## 2026-08-17 — Search bar scrolls with the page; separator removed

- What: The search band moved from a pinned sibling above the scroller to the
  first element inside `.main`, so it scrolls with the page content, and the
  horizontal separator under it was removed. (User request.)
- Files: `app/src/shell/app.js`, `app/src/styles/shell.html`,
  `app/tests/unit.test.js`, `app/tests/breaks.sh`, `app/tests/layout.test.js`,
  `docs/design/README.md`.
- Tests: unit section rewritten to assert the band is inside the scroller, is
  the first element, and has no divider; break cases added for "band pinned
  above the scroller", "band drops below the content", and "divider returns
  under the band"; layout check changed to "search band sits inside the
  scroller".
- Verified: `./app/verify.sh` green — 181 unit/accessibility assertions;
  5,803 real-browser layout assertions across 15 viewports × 5 roles × 30
  screens; 36 break cases and 7 layout break cases all caught. Also confirmed
  directly in a browser: the band's top moved from 81px to −48px after
  scrolling (scrolls with the page) and its border-bottom-width is 0.
- Self-check: fully fixed — the band is genuinely part of the scrollable page
  and no separator line remains; every changed check was observed failing for
  the right reason before passing.

## 2026-08-17 — GUI modernisation (violet pop design)

- What: Re-skinned the interface to a youth "pop" design — violet primary, coral secondary, five
  pastel pops, near-black dark mode, gradient brand mark + favicon, Auto/Light/Dark theme with a
  top-bar quick toggle, collapsible desktop rail, and tasteful motion/emoji accents. (User-approved
  decisions via MCQ: full re-skin; violet-first; Auto+Light+Dark; gradient mark; collapse-to-icons;
  moderate shapes; tasteful happiness set; near-black dark; violet as primary action, coral as
  secondary role.)
- Files: `app/src/styles/shell.html` (tokens, favicon, gradient defs, buttons, chips, empty,
  rail collapse), `app/src/lib/components.js` (state, resolvedTheme, storage, logoSVG, sun icon,
  Empty), `app/src/shell/app.js` (logo, railToggle, themeToggle, render), `app/src/screens/rider.js`
  (themeSeg 3-way, auth logo, emoji accents), `app/src/data/content.js` (i18n keys),
  `app/tests/unit.test.js`, `app/tests/breaks.sh`.
- Tests: unit rewritten (accent group for violet/coral, new THEME/RAIL/BRAND groups); break cases
  updated for the new tokens and 4 added (rail collapse, auto theme, favicon, gradient logo).
- Verified: `./app/verify.sh` green — 198 unit/accessibility; 5,803 real-browser layout (15
  viewports × 5 roles × 30 screens); 40 + 7 break cases caught. Functional browser check:
  auto resolves to the system, dark gives `#0B0C0F` surfaces, the rail collapses to 80px with
  labels hidden, the gradient logo and favicon render.
- Self-check: fully wired — the theme preference persists, the rail preference persists, every new
  check was observed failing for the right reason, and the RTL/Arabic + light/dark matrix still
  renders all 30 screens.
