# GUI-POLISH — desktop density + landing page completeness (DEC-200, DEC-201)

> Owner direction (2026-08-19): the desktop GUI must feel like a desktop app (smaller,
> denser, two-pane where useful) while touch keeps its 44px standard; and the landing page
> must speak to riders AND drivers with policies. Uber/Swvl are the references (R19).
> One box is ticked only when a command proved it (§0.1); proof in `IMPLEMENTATION_LOG.md`.

## A — Desktop density & shell (DEC-200)

- [ ] A `--density` (comfortable/compact) token: touch keeps comfortable; the `large`/`x-large` breakpoints switch to compact (smaller type scale, tighter `--tap`, denser rows/tables).
- [ ] The desktop shell uses the extra width: two-pane (list + detail) for staff screens where it helps; content stays within a centred ~1120–1200px working width (45–75ch reading measure).
- [ ] Fluid type via `clamp()` so no size "jumps" between breakpoints.
- [ ] Hover states are desktop-visible (they already exist); no regressions to touch targets (44px rider / 56px driver on compact).
- [ ] RTL + light/dark + reduced-motion all still hold at every breakpoint.
- [ ] Layout suite green across the viewport matrix (320→2560) — desktop no longer looks like a stretched phone.

## B — Landing page completeness (DEC-201)

- [x] **For riders** section — the existing 4 feature cards now sit under a "For riders" heading.
- [x] **For drivers** section — apply to drive / claim a slot in two taps / earn weekly.
- [x] **Safety / trust** section — verified drivers, board by code, help within reach (SOS/share labelled "arrive with the safety centre").
- [x] **Policies footer** — Terms / Privacy / Safety open honest structured pages (legal text marked the operator's, DEC-030); Streamline credit stays an <a>.
- [x] EN + AR copy added; RTL safe (logical properties).
- [x] Unit tests: 9 new landing assertions + 2 break cases (drivers section, policies) observed failing; 293 unit green.
- [x] a11y 14 + landing 47 green.

## C — Verification

- [ ] `pnpm verify` green; commit + push; remote matches local.
