# ARCHIVE — LEGACY THEME & UI BACKUP

This directory preserves the legacy UI and design system of Ride Share prior to the modern black-and-white typographic overhaul.

### Contents:
- `theme-backup-old.zip`: Complete zip archive of all original CSS, styles, components, build scripts, brand definitions, and built standalone HTML preview (`dist-preview.html`).
- Generated: 2026-08-26.

### GUI snapshot before the 2026-08-31 renewal
- `gui-before-renewal-2026-08-31-8828381.zip`: the complete GUI (web `apps/web/**` incl.
  `src/styles/shell.html`, `build.js`, assets, tests, `dist-preview.html`; `packages/brand/**`;
  the mobile `offline.html` + its config, build script and tests; the design-system audit doc),
  captured with `git archive HEAD` at commit `8828381` — byte-exact tracked content.
  `manifest.json` inside the zip lists every file with its sha256 and the restore commands;
  `README.txt` explains how to open it. The point of this archive is that the visual layer is being
  rebuilt from the owner's monochrome "Typeset" demos while the content and architecture of this
  snapshot stay the reference for what must be carried over.
- Git history remains the authoritative revert path; this zip is the portable, server-free record
  (`unzip` it and open `snapshot/apps/web/dist-preview.html` in a browser — no build, no network).
- Generated: 2026-08-31, by the GUI-renewal preparation session.
