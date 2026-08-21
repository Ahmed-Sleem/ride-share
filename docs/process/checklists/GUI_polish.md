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

- [ ] **For riders** section — book a seat, one fixed price, track live, get off anywhere.
- [ ] **For drivers** section — apply to drive, claim a slot in two taps, earn, weekly payouts.
- [ ] **Safety / trust** section — verified drivers & stops, boarding code, SOS/share (M4 items labelled "coming soon", never advertised as live).
- [ ] **Policies footer** — Terms / Privacy / Safety links to honest pages (structure present; legal text is the owner's, DEC-030). Streamline credit stays.
- [ ] EN + AR copy for every new string; RTL safe.
- [ ] Unit tests: every section renders, no sample content, policy links exist; break cases observed failing.
- [ ] a11y + landing browser suites green.

## C — Verification

- [ ] `pnpm verify` green; commit + push; remote matches local.
