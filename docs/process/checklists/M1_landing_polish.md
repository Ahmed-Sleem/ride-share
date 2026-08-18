# M1.7 — Landing page: stickers, slideshow color, RTL numbers, auto lang/theme, audit fixes

> One box at a time. A box is ticked only when a command proved it. The
> stickers come from the "Streamline Manila" free pack (chosen over the other
> two — it is the "lively doodling / youth" style, and it recolors to our
> palette). License: Streamline free license = commercial use without
> attribution, so it is NOT required — but a small "Vectors by Streamline"
> line is added to the footer anyway (owner's preference).

## A — Sign-up page audit (Arabic "ماذا تريد أن تفعل؟" sizes corrupted)

- [x] Reproduce the broken layout in RTL at phone + desktop width (browser measure)
- [x] Fix the role-choice cards (overflow / wrap / font-size in Arabic)
- [x] Verify: title, role titles and subtitles render correctly at 320→1440 in BOTH languages
- [x] Add a regression assertion (sign-up cards render, no overflow) to the landing/unit suite

## B — Text-box selection/focus border in the accent colour

- [x] `--focus` token becomes the accent (coral) in light AND dark
- [x] Global `:focus-visible` outline + `.input:focus` + `.searchbar:focus-within` all use accent
- [x] Verify by test: focus rules reference `var(--accent)`

## C + D — Sticker packs → colored slider cards

- [x] Copy the 7 chosen Streamline stickers to `apps/web/assets/stickers/` (outside src — token-safe)
- [x] build.js: read + minify + recolor stickers (navy→`--sticker-ink`, blue→`--sticker-accent`) and inject
- [x] Define `--sticker-ink` (text-primary, theme-aware) and per-slide `--sticker-accent`
- [x] Slideshow cards get a coloured background tint (violet/coral/sky/mint) + their sticker
- [x] Verify: 4 slides render with stickers, coloured, no hardcoded hex in the bundle

## E — Floating tooltips carry ALL needed info

- [x] Tooltip shows the step number + title + full description
- [x] Verified in a browser (hover shows all three)

## F — Bigger illustration in "How it works"

- [x] Each step card shows a large sticker illustration (not a 22px icon)
- [x] Verify: stickers present and sized in step cards at 320→1440

## G — Step numbers fixed in RTL

- [x] Numbers 1/2/3 stay on the physical RIGHT in both languages (no mirror)
- [x] Verify: browser measure in EN and AR gives the same side

## H — Theme toggle reliability audit

- [x] Root cause: the pre-paint script sets `data-theme` on `<html>`, render() sets it on `<body>`
      — when they disagree, the html attribute wins and the toggle "does nothing"
- [x] Fix: render() sets the attribute on `<html>` (single source of truth), body no longer used
- [x] Verify: toggle dark↔light in a browser repeatedly, attribute always matches

## I — Auto language + auto theme

- [x] Language defaults to the device language (ar → Arabic, else English); explicit choice persists
- [x] Auto theme: device `prefers-color-scheme` when the OS signals it; else time-of-day
      (06:00–18:00 light, otherwise dark); explicit choice persists
- [x] Verify by test: resolvedTheme() fallback logic + lang detection

## License / attribution

- [x] Footer line "Vectors by Streamline" (small, muted)

## Final validation

- [x] `pnpm verify` green (unit + a11y + repo checks)
- [x] Layout suite green (6,904) + landing suite green + break harnesses green
- [x] Commit + push
