# CHANGELOG

## 2026-07-29 session 1

- Created project workspace `/home/user/project_rideshare` with git repo and `_working_docs/` structure.
- Parsed the user's raw idea into atomic checklist items (`thinking/01_points_idea_parse.md`).
- Ran MCQ Decision Batch 1; recorded 4 confirmed decisions (tri-modal product, Alexandria->Cairo->generic,
  dual vehicle-entry, hybrid tiered pickup) in `discovery/00_RAW_IDEA.md`.
- Opened audit gaps G-001..G-005.
- Validation: no code yet; documentation-only session so far.
- Research pass 1 completed: 4 parallel search tracks (Egypt regulation, Swvl precedent, pooling
  algorithms, maps/routing infra, payments). Written to `discovery/01_RESEARCH_FINDINGS.md` with
  sources. Opened gaps G-006..G-008.
- Decision Batch 2 recorded (universities+fleet-owning companies first, full-product stance,
  2-person OSS-first team). Created `discovery/02_ARCHITECTURE_ANALYSIS.md` with the
  processing-location recommendation (hybrid, server-authoritative) and a vetted-candidate
  open-source table. Opened gaps G-009, G-010.
- Created `DECISIONS_REGISTER.md` (permanent, append-only record of every user decision, DEC-001..013).
- Stack research completed (RN/Expo vs Flutter 2026; Redis GEO vs PostGIS). Stack decision DEC-012
  written with per-layer justification and an explicit rejected-options list, in
  `discovery/02_ARCHITECTURE_ANALYSIS.md` section A4.
- Decision Batch 3 recorded (DEC-012 approved, DEC-014 single role-adaptive app, DEC-015 web-first,
  DEC-017 full i18n). Opened gaps G-011 (background GPS in a unified app) and G-012 (web driver
  tracking limits). Created `MASTER_PLAN.md` with a 17-chapter dependency-ordered roadmap and the
  chapters/ directory.
- Chapter 1 (Glossary & Domain Model) drafted at `chapters/CH01_domain_model.md`: one-universal-model
  decision evidenced against GTFS-Flex, 20-term glossary with Arabic UI terms, mode-mapping proof
  table, four policy objects, intent-vs-mechanism simplicity design, relationship diagram,
  10 invariants. Recorded DEC-019..DEC-021.
- Added binding project rule P5 (MCQ-per-decision; agent never closes an open point alone).
- Chapter 1 closures recorded: DEC-019, DEC-021, DEC-024, DEC-025. Gaps G-013 and G-014 CLOSED;
  new gap G-015 (stranded rider on failed 2nd leg) opened for CH12.
- DEC-030 (legal out of scope, handed to user's legal team), DEC-031 (Organizations removed
  entirely), DEC-032 (Support Agent role added), DEC-033..035 (fleet paths, dual vehicle entry,
  strict driver verification) recorded.
- Chapter 2 drafted at `chapters/CH02_roles_accounts.md`: four roles, phone-first identity model,
  two-door vehicle registry with fleet labels, full permissions matrix with audit rules, strict
  driver verification state machine. G-016 and G-018 CLOSED.
- DEC-036 (owner-only driving), DEC-037 (no parcels), DEC-038 (admin-curated stops only) recorded.
- Detected and logged contradiction G-019 (owner-only vs fleet vans) and workload gap G-020
  (manual city mapping before launch).
- DEC-039 resolves G-019 (driver-accountable, vehicle-as-attribute, Uber-style). DEC-040 (mapping
  team + mandatory Stop Mapping Tool), DEC-041 (journeys serve only needed stops), DEC-042 (minimal
  stop data). G-019, G-020 CLOSED. New gaps G-021 (lost night/accessibility intelligence) and
  G-022 (Stop Mapping Tool is now a required build item).
- DEC-046 (six roles confirmed), DEC-047 (sell every physical seat; G-025 caution), DEC-048
  (dependency-order sequencing, agent-decided).
- Chapter 3 drafted at `chapters/CH03_lifecycle.md`: five state machines (RideRequest, Booking,
  Journey, Driver duty, plus abort handling), promise-preservation rule, recurring-plan models,
  boarding-proof options, and 5 new invariants. Sections requiring user decisions are explicitly
  marked [MCQ PENDING] rather than being closed by the agent.
- Research pass 2 (pricing/money economics) appended to discovery/01_RESEARCH_FINDINGS.md as R7,
  including the key finding that walk-to-corner pooling sustains 25-40% discounts vs 15-22% for
  door-to-door, validating the meeting-point model.
- DEC-049..DEC-062 recorded: QR-primary boarding, full data capture, subscriptions, 10-min wait,
  strict cancellation with informed consent + credit refunds, locked prices, university-first launch
  with manager-controlled expansion, fixed route pricing, referral/share rewards, advanced manager
  price control. Gaps G-026..G-034 opened; G-030 closed.
- Chapter 3 closed out with sections 3.10.1-3.10.9: QR-primary boarding with offline-capable
  signed scans and a live driver manifest, subscription recurring model, 10-minute wait, strict
  cancellation with informed consent and credit-only refunds, locked prices, and an explicit list
  of the 7 items still open. CH3 marked complete in MASTER_PLAN.
- Chapter 4 drafted at `chapters/CH04_geography.md`: geographic object model, stop lifecycle with
  stable public codes, the always-visible-map rule, walking suitability definition, full Stop
  Mapping Tool specification (field+desk+review+audit), manager-controlled service expansion with
  runtime configuration, multi-city structure, 5 new invariants. Detected a genuine conflict between
  DEC-004 (three priced pickup tiers) and DEC-058 (fixed route pricing) — raised to the user.
- Research pass 3 (R8: Uber Express Pool price ladder, ~2x stop-vs-door gap, deviation harm
  mechanism) appended to discovery/01_RESEARCH_FINDINGS.md.
- DEC-063 (two ticket types), DEC-064 (no walk ceiling, street pickup always offered),
  DEC-065 (rider may choose any stop, system recommends), DEC-066 (combined 3-layer pricing
  formula), DEC-067 (door-to-door dropped), DEC-068 (code maintainability is a first-class
  requirement) recorded.
- Created `chapters/CH06a_pricing_formula.md`: three-layer street-pickup formula with a
  feasibility gate ("harm to others" rule), full manager-controlled variable table with scope
  inheritance, guardrails including preview-before-publish and rollback, and a worked example.
- DEC-069 (modular monolith), DEC-070 (config-driven business rules), DEC-071 (full quality gates).
- Created `chapters/CH08a_code_architecture.md`: 16-module map with enforced boundary rules,
  per-module internal layering with the domain-purity rule, shared-types strategy, the
  configuration-vs-code rule with scope resolution and safety requirements, event-log backbone,
  verify-command definition, per-area testing bar, contributor non-negotiables, and the
  work-package format for hired developers.
- Research pass 4 (R9: production dispatch architecture) appended, covering the constellation
  finding, H3 partitioning, greedy+batch consensus, adaptive timing, the 8-10% quantified
  trade-off, offer/timeout workflows, double-dispatch hazard, degradation and ETA precomputation.
- DEC-072..DEC-076 recorded. Chapter 5 (The Matching Algorithm) drafted at
  `chapters/CH05_algorithm.md`: full 6-stage pipeline, 10 hard feasibility constraints, the
  weighted insertion-cost function, adaptive batching, offer workflow correctness requirements,
  overnight planner, degradation matrix, and 3 new invariants.
- Research pass 5 (R10: Egyptian payment rails — IPN/InstaPay reality, Paymob two-way capability,
  payout thresholds, the pooled-cash problem) appended with sources.
- DEC-077..DEC-081 recorded. Chapter 6 (Money) drafted at `chapters/CH06_money.md`: double-entry
  ledger design with six account types, full payment-method matrix behind one provider interface,
  the exact 4-step cash sequence with cash-liability credit control, fare precedence, subscription
  handling, refund-to-credit policy, commission/subscription/hybrid revenue models as configuration,
  weekly payout mechanics, promotion budgeting, reconciliation controls, and 5 new invariants.
- DEC-082 (all three growth mechanics, individually switchable).
- Ran full conflict audit #2 -> `AUDIT_2026-07-29_session1_FINAL.md`: 7 active conflicts identified
  (C-1..C-7), completeness assessed at ~45%, and 15 previously-undiscussed topics logged (F-26..F-40).
  Opened G-037..G-040. Verified decision and gap numbering mechanically: no gaps, no duplicates.
- Research pass 6 (R11: Mac/EAS cloud builds, RNW production readiness, practitioner consensus
  against a single UI codebase) appended with sources.
- DEC-083 (multi-seat booking), DEC-084 (wait time is a human decision), DEC-085 (monorepo with
  separate UIs), DEC-086 (vertical slices), DEC-087 (MCQ process restated).
- Conflicts C-2 and C-3 RESOLVED; gaps G-011, G-012, G-029, G-037 CLOSED.
- DEC-088..091 (REST+WS, targeted realtime, adaptive GPS, offline-critical actions).
- Chapter 9 (Data Model & API) drafted at `chapters/CH09_data_api.md`: full table definitions for
  all 9 modules with keys/indexes/constraints, database conventions (UUIDv7, timestamptz, integer
  money, no soft-delete), complete REST endpoint catalogue for rider/driver/manager/ops/support,
  WebSocket channel design, the offline outbox mechanism with idempotency, the adaptive location
  pipeline with battery guard, and database-level invariant enforcement.
- DEC-095..097 (on-call SOS, informational-only ratings, three-vector fraud focus).
- Chapter 12 (Trust, Safety & Security) drafted at `chapters/CH12_trust_safety.md`: full safety kit
  with silent SOS and SMS fallback, the incident flow now carrying the entire protective burden
  (with repeat-signal escalation to compensate for DEC-096), three fraud-control tables, QR
  fallback matrix, accessibility provisions, operational-failure responses, and movement-store
  security required by DEC-094. Opened G-044.
- Research passes 7 and 8 (R12 UX usability evidence incl. SUS benchmarks; R13 offline-first
  architecture incl. the dispatch warning) appended with sources.
- DEC-098 (adaptive home, identical structure across platforms), DEC-099 (split offline model),
  DEC-100 (subscription trial day).
- Chapter 10 (UX) drafted at `chapters/CH10_ux.md`: measured design bar (SUS >= 80 target vs Uber's
  66.75), 12 universal design rules with sources, the adaptive home matrix, the anxiety-screen
  specification with offline fallback, driver-in-motion constraints, offline-first driver flow with
  delta sync, RTL/localisation rules, low-end device budget, and notification governance.
- DEC-101 (active alerting, no auto-rules), DEC-102 (ops queue-first), DEC-103 (build all three
  growth mechanics equally and measure).
- Chapters 7 and 11 drafted at `chapters/CH07_CH11_growth_dashboards.md`: referral/share/streak
  mechanics with anti-abuse and ledger-enforced budget caps, mandatory measurement rules, the
  Manager dashboard with actionable alert rail and preview-before-publish pricing control, the Ops
  work-queue home with approval and incident workspaces, the bounded Support workspace, and
  cross-cutting audit/export/RTL rules.
- DEC-104..109 (self-managed VPS, region-as-config, full test pyramid, self-hosted DB with replica
  and off-site backups, closed-beta launch gate, phased hiring). G-046 CLOSED; G-045 open for CH16.
- Chapters 13, 14 and 15 drafted at `chapters/CH13_CH14_CH15_privacy_quality_infra.md`: data
  inventory with sensitivity ratings, the tiered-storage-not-tiered-deletion model required by
  indefinite retention, regulatory export capability, the verify command and per-area testing bar,
  the pre-launch simulation question list, closed-beta success criteria, the definition of done,
  the VPS architecture diagram with mandatory operational practices, and the cost-model structure.
- DEC-110 (one corridor complete then widen), DEC-111 (hiring out of scope), DEC-112 (timelines out
  of scope). G-001, G-045, G-046 CLOSED; G-009 reclassified as a user-owned standing risk.
- Chapters 8, 16 and 17 drafted at `chapters/CH08_CH16_CH17_architecture_delivery_risk.md`:
  runtime architecture with the server/device authority table and degradation behaviour, the
  8-phase delivery plan with exit criteria and no dates, the work-package format, definition of
  done, and a 12-item risk register with named owners.

## 2026-07-29 session 1 — CLOSE

- Assembled `MASTER_SPECIFICATION.md`: 3,681 lines / ~36,800 words / 243KB.
  Structure: Part I executive summary (the 10 defining decisions + what research changed),
  Part II all 17 chapters, Part III the full decisions register (DEC-001..112),
  Part IV open items and audit trail, Part V research evidence R1..R13 with sources.
- Session totals: 112 decisions recorded, 46 audit items tracked, 13 research passes with sources,
  14 chapter files, 7 conflicts detected and 5 resolved.
- Validation: documentation-only session; no code written, therefore no tests claimed. Decision and
  gap numbering verified mechanically (no gaps, no duplicates). All research claims carry sources;
  unverifiable items marked [UNVERIFIED].
- Remaining open: see AUDIT_AND_TODO.md. Notable unresolved product questions carried forward:
  G-015 (stranded rider on failed second leg), G-024 (dynamic walking rule detail),
  G-033 (price precedence confirmation), G-034 (share-attribution design),
  plus F-26..F-40 topics scheduled to their chapters.

## Later sessions — route-ticket model, full specification, GUI, build plan (2026-07-29 → 2026-08-02)

- Route-ticket model adopted and propagated (DEC-113..DEC-119, DEC-132, G-051): no automatic
  surge (manager-initiated changes only), wall-clock scheduling with Ramadan mode and a holiday
  calendar, the alighting signal, schedule-adherence as the dispatch objective, and the slot-claim
  model (route_slots / slot_claims / CLAIMED journey state). CH5, CH9 and CH10 rewritten to v2;
  a full cross-chapter consistency sweep ran after each model change (P6, DEC-126).
- Specification completed to 22 chapters (DEC-120..DEC-167): design system (CH10a), the 75-screen
  inventory for five roles (CH10b–d), trust & safety (CH12), privacy/quality/infrastructure
  (CH13–15), delivery plan and risk register (CH8/16/17), operations runbook (CH18), configuration
  catalogue (CH19), notification catalogue (CH20).
- Research passes R14–R22 appended (OpenStreetMap coverage in Egypt, ORM comparison, Railway and
  PostGIS tooling, cold-start demand estimation, OSM QC methodology).
- BUILD_PLAN written (DEC-170..DEC-173): Phases 0–8, every point carrying what / how / test /
  how-to-break-the-test / done / gap-risk.
- GUI-first pivot (DEC-174, DEC-175): commercial map provider for the visible map surface; the
  complete interface built as one self-contained HTML file — five roles, bilingual with full RTL,
  light and dark themes, one adaptive layout — verified with jsdom and Puppeteer plus break tests.
- DEC-176 mobile via Capacitor; DEC-177 one private monorepo; DEC-178 profile identity and wallet
  balance pinned in the rider top bar.
- Investor information document produced (LaTeX source + compiled PDF).

## 2026-08-17 — search bar scrolls with the page; repository completeness

- UI: the search band moved from a pinned sibling above the scroller to the first element inside
  `.main`, so it scrolls with the page; the horizontal separator under it was removed.
- Verification updated and re-run green: build; 181 unit/accessibility assertions; 5,803 real-browser
  layout assertions (15 viewports × 5 roles × 30 screens); 36 break cases and 7 layout break cases
  all observed failing for the right reason.
- Docs: design "layout contract" updated to match; the UI reference benchmark adopted by DEC-168 was
  added under `docs/reference/`; the docs index updated.
- Repository: confirmed `app/` (interface), `deploy/` (Docker, nginx, Railway), `docs/` (all non-code)
  separation; secret scan clean (no PAT or credentials in tree or history); pushed to GitHub.

## 2026-08-17 — modernised GUI: violet pop design, auto theme, collapsible rail, brand mark

- Design language modernised to a youth pop palette: **violet `#6C63FF` is now the primary
  brand/action colour**; **coral** takes the secondary "value & continuity" role; five pastel
  pops (mint, lime, sky, pink, coral) added as first-class tokens. Teal retired. Dark mode uses
  near-black surfaces with the pops glowing on top.
- Brand mark: the user's bookmark-and-pin glyph added as the logo, rendered with a violet gradient
  (defined once) and embedded as an SVG data-URI favicon; theme-color meta updated.
- Theme system: **Auto / Light / Dark**. Auto follows the device (`prefers-color-scheme`), manual
  choices persist (localStorage), a quick toggle sits in the top bar, and the three-way control
  lives in Profile. A pre-paint script prevents a light flash for dark users.
- Desktop rail: a collapse control folds the expanded rail to a 72–80px icon bar (labels hidden,
  tooltips on the active items) and back; the choice is remembered.
- Tasteful "happiness" touches: gradient primary button with a soft glow and hover lift, hover lift
  on route cards, playful empty states (soft pop blob), emoji accents on the active-ticket and
  booked screens, and colourful top-up chips.
- Latent fix: the illustrative map's route/walk colours (`--accent-route`/`--accent-walk`) were
  referenced but never defined; they now map to `--route`/`--walk`.
- Verification re-run green: 198 unit/accessibility assertions; 5,803 real-browser layout
  assertions; 40 break cases and 7 layout break cases all observed failing for the right reason.
