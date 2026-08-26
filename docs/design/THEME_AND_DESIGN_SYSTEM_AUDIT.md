# THEME & DESIGN SYSTEM COMPREHENSIVE AUDIT & BLUEPRINT

**Date:** 2026-08-26 (Africa/Cairo)  
**Status:** Baseline Audited & Preserved  
**Backup Archive:** `/home/user/theme-backup-current.zip` & `apps/web/dist-preview.html`  
**Binding Reference Standards:** `GENERAL_GUI_AGENT_RULES.md`, `AGENT_RULES_SANITIZED_ACTIVE (1).md`, `docs/process/GUI_STANDARD.md`

---

## 1. Executive Summary & Centralization Architecture

The entire user interface across all surfaces (Marketing Website, PWA Web App, Mobile Capacitor Shell, Staff/Admin Desks) is **100% centralized** and follows strict single-source-of-truth (§0.3) design laws.

### How the Frontend is Structured & Assembled
1. **No Frontend Framework / Zero CDN:** Pure vanilla JavaScript + native DOM APIs (`$` helper) concatenated into a single self-contained HTML deliverable by `apps/web/build.js`.
2. **One Stylesheet Entrypoint:** All CSS tokens, variables, resets, layout grids, components, and responsive media queries live **strictly** in `apps/web/src/styles/shell.html`.
3. **One Brand Definition:** Brand name (EN + AR), tagline, description, logo SVG path, brand gradient, font family/weight, and email palette live **strictly** in `packages/brand/brand.json`.
4. **One Component Library:** All UI primitives (buttons, cards, banners, chips, badges, sheets, modals, forms, inputs, tables, tabs, map views, QR codes) live in `apps/web/src/lib/components.js`.
5. **One Internationalization Dictionary:** All copy and translations live in `apps/web/src/data/content.js` (`T.en` and `T.ar`).
6. **One Map Layer:** Data-driven map visualization and base tiles factory live in `apps/web/src/lib/map.js`.

---

## 2. Complete Design Token Hierarchy

The design system uses a **two-layer token architecture** (Primitives → Semantic Tokens) per WCAG 2.2 guidance.

### A. Color Token Architecture (`apps/web/src/styles/shell.html`)

```
Primitives (Raw Palette)
  ├── --violet-* (50, 100, 200, 300, 400, 500, 600, 700, 900)
  ├── --coral-*  (50, 100, 300, 400, 500, 600, 700, 900)
  ├── --mint-*   (50, 100, 300, 400, 500, 600, 700, 900)
  ├── --lime-*   (50, 100, 300, 400, 500, 600, 900)
  ├── --sky-*    (50, 100, 300, 400, 500, 600, 700, 900)
  ├── --pink-*   (50, 100, 300, 400, 500, 600, 900)
  └── --ink-*    (0, 25, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000)
        │
        ▼
Semantic Tokens (What Components Reference)
  ├── Surfaces: --bg-base, --bg-raised, --bg-sunken, --bg-inset, --bg-page
  ├── Text:     --text-primary, --text-secondary, --text-muted, --text-inverse
  ├── Brand:    --brand, --brand-hover, --brand-2, --brand-soft, --brand-border, --on-brand
  ├── Accent:   --accent, --accent-hover, --accent-soft, --accent-border, --on-accent, --accent-text
  ├── Pops:     --pop-mint(-bg,-text), --pop-lime(-bg,-text), --pop-sky(-bg,-text), --pop-pink(-bg,-text)
  ├── Status:   --ok(-bg), --warn(-bg), --danger(-bg), --info(-bg), --offline
  ├── Lines:    --line, --line-strong, --scrim, --focus, --focus-width, --focus-offset
  ├── Map:      --map-land, --map-water, --map-park, --map-road, --map-road-minor, --map-building
  └── Fixed:    --qr-paper, --qr-ink, --knob, --on-solid (Never inverted in dark mode)
```

### B. Geometry, Sizing, Typography & Motion Tokens

| Token Category | Variables | Standard Values | Purpose / Invariant |
|---|---|---|---|
| **Radii** | `--r-xs`, `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-full` | `6px`, `10px`, `14px`, `20px`, `28px`, `999px` | Consistent corner curvature across controls, cards, sheets, and pills. |
| **Spacing (4px base)** | `--s1` through `--s10` | `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`, `64px` | Strict vertical/horizontal rhythm. No random margins. |
| **Type Scale** | `--f-display`, `--f-title`, `--f-head`, `--f-lg`, `--f-body`, `--f-cap`, `--f-micro`, `--f-input` | `32px`, `22px`, `18px`, `16px`, `15px`, `13px`, `11px`, `16px` | `--f-input` **must never go below 16px** to prevent iOS Safari auto-zoom breaking mobile viewport. |
| **Font Weights** | `--fw-normal`, `--fw-med`, `--fw-semi`, `--fw-bold` | `400`, `550`, `650`, `750` | Hierarchical contrast. |
| **Line Heights** | `--lh-tight`, `--lh-snug`, `--lh-body` | `1.2`, `1.35`, `1.5` | Readable measure. |
| **Touch Targets** | `--tap`, `--tap-sm`, `--tap-driver` | `44px`, `36px`, `56px` | 44px WCAG 2.2 touch target minimum; 56px driver glove target. |
| **Icon Sizes** | `--icon-sm`, `--icon-md`, `--icon-lg` | `16px`, `20px`, `24px` | Unified SVG bounding boxes. |
| **Layout Dimensions** | `--rail-collapsed`, `--rail-expanded`, `--topbar-h`, `--dock-h`, `--content-max`, `--landing-max`, `--shell-max` | `80px`, `248px`, `60px`, `64px`, `840px`, `1120px`, `1600px` | Material 3 breakpoint adaptation. |
| **Elevation Shadows** | `--sh-1`, `--sh-2`, `--sh-3` | Multi-layer rgba shadows | Card, dropdown, and bottom-sheet depth. |
| **Z-Index Scale** | `--z-base`, `--z-sticky`, `--z-nav`, `--z-scrim`, `--z-sheet`, `--z-toast` | `0`, `10`, `30`, `55`, `60`, `80` | Named stacking order; no magic z-index numbers. |
| **Motion Curves** | `--ease`, `--fast`, `--med`, `--slow`, `--bounce` | `cubic-bezier(.2,.7,.3,1)`, `140ms`, `240ms`, `420ms` | GPU-accelerated transforms & transitions. |

---

## 3. Light & Dark Theme Architecture

Themes are toggled via the `data-theme="light"` and `data-theme="dark"` attributes on `<html>` and `<body>`.

### How Theme Switching Works:
1. **Pre-paint Script:** In `shell.html`, an inline `<script>` runs immediately before body render, reading `localStorage.getItem("rs.theme")` or querying `window.matchMedia("(prefers-color-scheme: dark)")` and setting `document.documentElement.dataset.theme`. This eliminates any white/dark flash on load.
2. **Central Dark Overrides:** In `shell.html`, `[data-theme="dark"]` overrides only the semantic tokens:
   - `--bg-base`, `--bg-raised`, `--bg-sunken`, `--bg-page` shift to dark ink levels (`--ink-950`, `--ink-850`, `--ink-1000`).
   - `--text-primary` shifts to `#F2F5F8`, `--text-secondary` to `#9AA5B2`.
   - `--brand` and `--brand-hover` shift to accessible pastel tints (`--violet-400`, `--violet-300`).
   - `--line` and `--line-strong` adjust to dark-mode line alphas.
3. **Components are Theme-Agnostic:** Components **never** write custom dark-mode selectors or hardcoded colors; they consume `var(--bg-base)`, `var(--text-primary)`, `var(--brand)`, etc.

---

## 4. Bilingual Internationalization & RTL Architecture

The application is natively bilingual in **English (LTR)** and **Arabic (RTL)**.

1. **Logical CSS Properties:** All layout styling uses CSS logical properties:
   - `margin-inline`, `padding-inline`, `inset-inline-start`, `inset-inline-end`, `border-inline-start`.
   - Never use physical `left` or `right` margins/paddings.
2. **Typography Support:** System fonts fall back gracefully to Arabic system typefaces:
   - `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Arabic", sans-serif`.
3. **Automatic Direction Switching:** When `S.lang === "ar"`, `document.documentElement.dir = "rtl"` and `lang = "ar"`. Navigation arrows and directional icons flip automatically via `[dir="rtl"] .icon--flip { transform: scaleX(-1); }`.

---

## 5. Screen Hierarchy & Component Inventory

| File | Primary Role & Views | Key Visual Patterns |
|---|---|---|
| `apps/web/src/screens/landing.js` | Public Landing Page (`landing`), Subpages (Ride, Drive, About, Help, Safety, Privacy, Terms), Intro Slides (`introView`). | Parallax hero header, interactive stack panels with gradient mesh, download QR badges, live route calculator banner. |
| `apps/web/src/screens/rider.js` | Rider Experience: Home (`riderHome`), Routes Search (`riderRoutes`), Stop Picker (`riderBoarding`), Departure Grid (`riderDepartures`), Review & Pay (`riderReview`), Booking Success (`riderBooked`), Waiting & In-Ride (`riderWaiting`, `riderOnboard`), Trip History (`riderTrips`), Safety Center (`riderSafety`). | Route cards with flat fares, interactive stops selector, live map tracking, boarding QR card + 6-digit numeric fallback, alight request button. |
| `apps/web/src/screens/driver.js` | Driver Experience: Duty Switch (`driverDuty`), Slot Claims Board (`driverWork`), Active Journey (`driverJourney`), Passenger Manifest (`driverManifest`), Earnings Statements (`driverEarnings`), Profile. | High-contrast 56px touch targets, trip start/arrive/complete action buttons, live passenger boarding checkboxes, QR scanner modal. |
| `apps/web/src/screens/wallet.js` | Financial Experience: Wallet Card (`riderWallet`), Paymob Top-up Sheet (`topupSheet`), Double-Entry Ledger History. | Current EGP balance, transaction list with debit/credit icons, quick top-up amount pills (50, 100, 200 EGP), Paymob iframe sheet. |
| `apps/web/src/screens/planner.js` | Spatial Trip Planner: A→B Search Screen (`riderPlan`), Location autocomplete, Snapped stop suggestions. | Search pins, live stops map, Haversine walk time estimations. |
| `apps/web/src/screens/staff.js` | Staff & Operations: Verification Queue (`opsQueue`), Live Ops Fleet Map (`opsLiveMap`), Stops Desk Tool (`opsStops`, `EditRouteMap`), Manager Route Board (`managerBoard`), Incident Triage (`supportTickets`). | Wide tables (`main--wide`), coordinate pin-drop map, status chips, quick review modals. |
| `apps/web/src/screens/admin.js` | Administration: Staff Accounts (`adminStaff`), Audit Log Viewer (`adminAudit`), Owner Settings (`adminSettings`). | Paged table view, dynamic platform settings form (commission %, OTP bypass). |
| `apps/web/src/screens/auth.js` | Authentication: Smart Signin/Signup (`auth`), OTP 6-box input (`OtpInput`), Role selection cards. | Centered auth card, countdown resend timer, role cards. |

---

## 6. Build Pipeline & Asset Bundle Architecture

```
apps/web/src/
  ├── styles/shell.html     (HTML shell + CSS tokens + Base CSS rules)
  ├── data/content.js       (Copy table T.en & T.ar)
  ├── lib/components.js     (Shared UI primitives & state S)
  ├── lib/search.js         (Fuse.js wrapper & Arabic normalizer)
  ├── lib/api.js            (API client)
  ├── lib/map.js            (Map primitive & tile factory)
  ├── screens/*.js          (Role screens & views)
  └── shell/app.js          (App router & navigation shell)
        │
        ▼ (node apps/web/build.js)
  apps/web/dist-preview.html & apps/web/dist/index.html (Single Deliverable)
```

1. **Build Process:** `node apps/web/build.js` reads `packages/brand/brand.json`, injects `__BRAND_*` tokens into `shell.html`, concatenates all modules in exact dependency order, optimizes SVG illustrations (`assets/undraw/*.svg`), and outputs a standalone, production-ready single HTML bundle (`~815 KB`).
2. **Zero Runtime Dependencies:** No external CDNs, no external font downloads, no remote scripts.

---

## 7. Verification Guards & Quality Assurance Rules

When modifying the theme, colors, typography, or styling, the following automated checks enforce the design system:

| Check Script | Target | Enforcement Rule |
|---|---|---|
| `scripts/check-tokens.sh` | All CSS & JS sources | **Zero raw color literals** (hex, rgb, hsl) outside `shell.html` `:root` and `[data-theme="dark"]`. |
| `scripts/check-branding.sh` | All sources | Product name and logo must originate solely from `packages/brand/brand.json`. |
| `scripts/check-hide-not-disable.sh` | Screens & components | Unfinished or unauthorized controls must be hidden, never disabled (§8.1). |
| `apps/web/tests/layout.test.js` | Headless Chrome (Puppeteer) | **8,185 layout assertions** across 7 viewports (320px to 1920px), 2 themes (light/dark), and 2 languages (EN/AR). |
| `apps/web/tests/a11y.test.js` | Axe Core | Zero WCAG 2.2 AA accessibility/contrast violations. |
| `apps/web/tests/layout-breaks.sh` | Break Harness | Deliberately breaks 8 core layout rules to prove harness sensitivity. |

---

## 8. Backup Manifest

A full backup archive of the entire current UI, HTML, CSS, build pipeline, brand JSON, and built preview is preserved at:
- **Zip Archive:** `/home/user/theme-backup-current.zip`
- **Built Preview HTML:** `apps/web/dist-preview.html` (815 KB standalone deliverable)
- **Brand Definition:** `packages/brand/brand.json`
