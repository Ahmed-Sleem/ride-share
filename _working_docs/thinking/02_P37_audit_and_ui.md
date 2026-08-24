# DELETE AFTER: P3.7 backend audit fixes verified+pushed AND P3.7.4 wallet UI
# verified+pushed, with the line-by-line comparison done.

# Part 1 — P3.7 backend self-audit (fix any miss BEFORE the UI)

- [ ] A1 CI on 1f3bfa4 = success (all 4 jobs) — was left unconfirmed last turn
- [ ] A2 DTO bounds mismatch: TopupDto Min(100)/Max(2_000_000) vs service
      500/1_000_000 → align DTO to 500..1_000_000 (single truth: import the
      exported TOPUP_MIN_MINOR/TOPUP_MAX_MINOR constants — no second copy §0.3)
- [ ] A3 cash-collected @Body('bookingId') has NO validation (empty/undefined
      reaches SQL) → proper DTO class with @IsUUID
- [ ] A4 repository bookingForCashCollected selects departs_at (unused) → remove
- [ ] A5 service casts `actor.role as never` — codebase style is
      `as unknown as Role` → align (6 occurrences)
- [ ] A6 no test for the topup SUCCESS path (order row, pending mark, audit,
      iframeUrl) → add with a stubbed provider
- [ ] A7 re-run API tests + pnpm verify after A2–A6; break-observe not needed
      for A6 (uses the same observed-failing discipline? no — new test must be
      observed failing once: break markOrderPending/order-first logic or the
      stub assertion) → do a §0.2 break for the new test
- [ ] A8 push audit fixes; CI green

# Part 2 — P3.7.4 wallet UI (Path A files only)

- [ ] B1 api.js: Path A marked section — config(), wallet(), topup(),
      cashCollected(), driverEarnings() (same-origin /v1, error keys flow)
- [ ] B2 content.js: Path A marked i18n blocks (EN+AR), keys w_*, incl. the
      API message_keys (payments.disabled etc.) used by errText
- [ ] B3 wallet.js: REAL wallet screen — derived balance, entries list
      (loading/empty/error states), top-up CTA; Paymob FIRST (DEC-204),
      cash explanation second; Paymob HIDDEN + honest sentence when
      /payments/config says off (§8.1)
- [ ] B4 top-up Sheet registered in app.js SHEETS (Path A append marker) —
      presets + custom amount (integer EGP), bounds from TOPUP constants,
      busy/disabled/error states, opens iframe URL in a new tab on success
- [ ] B5 paymentChoice component exported from wallet.js (for B's review
      screen): wallet balance + sufficiency + Paymob/cash/wallet methods,
      feature-detected, no dead controls
- [ ] B6 no colour literals / no brand hardcode (guards enforce); tokens only
- [ ] B7 unit tests appended (Path A group): wallet renders derived balance;
      top-up sheet validates bounds; Paymob hidden when config off; entries
      empty state; paymentChoice sufficiency logic
- [ ] B8 breaks.sh: 2 new Path A break cases appended + observed failing
- [ ] B9 pnpm verify + web unit/a11y green locally; push; CI green
      (browser suite is CI's job)
- [ ] B10 docs: checklist tick P3.7 remaining boxes, changelog,
      implementation log, PATH_A progress; MCQ: G-079 commission + presets
