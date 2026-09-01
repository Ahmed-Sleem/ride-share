# @ride-share/brand — the single source of brand identity

> The one-change test (§0.3): to rename the product, change the logo, or change
> the wordmark font, edit **brand.json** here — nothing else.

## What lives here

| Field | Feeds |
|---|---|
| `name.en` / `name.ar` | UI copy table, page `<title>`, email subjects/bodies |
| `tagline.*` | UI copy table, hero |
| `description` | `<meta name="description">` |
| `font.family` / `weight` | the wordmark (`--brand-font`) |
| `logo.path` / `viewBox` | the in-app mark — it inherits text ink, so it carries no colour of its own |
| `logo.color.light` / `color.dark` | the favicon (a data URI has no document to inherit from) |
| `browserThemeColor.light` / `.dark` | `<meta name="theme-color">` in both schemes, and the native splash background |
| `email.fromName` / `email.colors` | the API's transactional email identity |

## How it propagates

- **Web** — `apps/web/build.js` reads this file at build time and (a) generates
  the `<title>`, meta description, theme-color and favicon, and (b) injects
  `const BRAND = …` that the copy table and logo component read.
- **API** — `apps/api/src/config/brand.ts` loads this file for email subjects
  and the branded HTML.

## Enforced

`scripts/check-branding.sh` fails if the brand name / logo path are hardcoded
anywhere in `apps/web/src` or `apps/api/src` outside of BRAND references.
