# Interface

One self-contained HTML file, assembled from `src/` by `build.js`.

## Build

```bash
node build.js      # writes dist-preview.html: verifies and inlines assets/fonts/*.woff2,
                   # and refuses to write a bundle that does not parse or whose faces moved
```

Edit `src/`. Never edit `dist-preview.html` — it is regenerated.

## Layout

| Path | Holds |
|---|---|
| `src/styles/shell.html` | The document, and every CSS rule. All design tokens live in `:root` here |
| `src/data/content.js` | Every readable string in both languages, and the sample content |
| `src/lib/components.js` | State, helpers, the icon registry, and the shared components |
| `src/screens/rider.js` | Auth and rider screens |
| `src/screens/driver.js` | Driver screens |
| `src/screens/staff.js` | Operations, manager and support screens |
| `src/shell/app.js` | Sheets, the navigation table, chrome, and render |

## How to change things

| To change | Edit |
|---|---|
| A colour, spacing value, radius, font size, breakpoint | `src/styles/shell.html`, the `:root` block — one line, everywhere |
| A **font face** (file, ranges, licence, budget) | `assets/fonts/fonts.json` — inlined by `build.js`, hashed, never a CDN |
| Which family a **role** asks for | `packages/brand/brand.json` (`font.family`, `font.weight`) |
| Any visible text | `src/data/content.js` |
| A shared component's behaviour | `src/lib/components.js` |
| Add a screen | One row in `PAGES` in `src/shell/app.js`, plus the screen function |

If changing something requires editing more than one place, that is a defect in
the architecture, not a task. Say so.

## Tests

```bash
./verify.sh          # everything
node tests/unit.test.js   # jsdom: semantics, a11y, logic, tokens
node tests/layout.test.js # real browser: 15 viewports × 5 roles × 30 screens
./tests/breaks.sh         # proves the unit checks can fail
./tests/layout-breaks.sh  # proves the layout checks can fail
```

Requires `jsdom` and `puppeteer`.

## Rules this code follows

- **One definition.** A value appears once. Changing it everywhere means
  editing one line.
- **Nothing decorative.** Every control does what it says. Where behaviour is
  simulated, the interface says so — the map is labelled an illustration.
- **Hidden, not disabled.** A control a role may never use is not rendered.
  `disabled` means "not yet", such as a boarding point closed for road works.
- **A check that cannot fail is not a check.** Assertions that examine a
  collection first assert the collection is not empty.
