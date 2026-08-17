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
