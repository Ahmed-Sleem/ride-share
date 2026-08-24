# CHANGELOG

## 2026-08-24 — P7.4 Capacitor journey GPS (Path B, DEC-176 stay)

- `Platform.watchPosition` + `LocationTrack`: batch up to 8 fixes / 30s, flush leftover on stop. Tracking starts only on `IN_PROGRESS` and stops otherwise.
- `POST /journeys/:id/position` accepts `{ points }` and stores the last fix only (no interpolated path). Off-shift (not in progress) is refused.
- Rider live screen shows a stale-position warning when the last fix is older than `POSITION_STALE_SEC` (default 90). Gaps stay visible.
- APK assemble injects Android location / foreground-service permissions. 2-hour locked-screen + battery proof remains an on-device owner run.

## 2026-08-24 — Admin overview + paged audit (Path B)

- Super-admin home: lecture banner removed; tiles are the same `Row` primitive
  as the rest of the app (users / flag / queue / bus). Dead `go("vehicles")`
  now opens the real queue.
- `nav.admin` / Staff / Audit exist EN+AR — top bar no longer shows `nav.admin`.
- Audit log: server `limit`/`offset` + `total`; 25-row pages; who / when /
  action on one row so columns no longer collide.

## 2026-08-24 — P7.3 camera scan + APK Node 22 + schema order

- Driver journey: Scan QR next to the always-visible 6-digit field. Camera
  denied/unavailable focuses the keypad (DEC-136). Platform.scanCode never
  imports @capacitor/*; native plugin is registered from the mobile package.
- CI APK job uses Node 22 (Capacitor CLI 8 requires >=22).
- schema.sql table order matches pg_dump (idempotency_receipts after
  driver_profiles) so db:verify is green.

## 2026-08-24 — P7.2 driver outbox (Path B)

- One ordered durable outbox (`packages/platform/src/outbox.js`): airplane-mode
  enqueue, persist across kill, replay in seq, stop on network so later
  actions cannot overtake, 4xx conflicts surfaced, age → review not drop,
  position coalesce (explicit rule).
- Server `idempotency_receipts` (migration **0022**): same actor+key returns
  the first body. Scan/start/arrive/complete/abort/position wrap the receipt.
- Driver scan/start/arrive/complete/abort/cash go through `queueOrSend`.
  Flush on boot and `online`. EN+AR `j_queued` / pending / review banners.

## 2026-08-24 — Debug APK from CI (Path B)

- `apps/mobile/scripts/make-apk.sh` + CI job **Android debug APK**.
  Artifact `ride-share-debug-apk` on every green `main` push. Debug key
  only — Play signing stays P7.6 (secrets, never git).
- README: how the wrap works, why a website deploy does **not** update
  an installed APK, how to get the file, iPhone later (same Capacitor www).

## 2026-08-24 — Railway mobile: Railpack had no root start

- Deploy logs: `using build driver railpack-v0.37.0` then
  `No start command detected` (workspace root is not an app).
- Fix: root `start` + `build` + `index.js` + `railpack.json` boot
  `apps/mobile/server.js`. api/web stay on Docker and do not use this.

## 2026-08-24 — P3.9 live journey (Path B)

- POST start/complete/abort/position/arrive + GET progress. Start from OPEN
  locks then goes IN_PROGRESS. Complete marks ON_BOARD bookings COMPLETED.
  Abort notifies booked riders (in-app). Slip = minutes behind timetable;
  arrive refused when slip > MAX_SCHEDULE_SLIP_MIN (default 10).
- Rider waiting/onboard: live status, next stop, arriving banner, alight signal.
- Migration 0018 (even): position, arrived index, alight_requested_at, notifications.

## 2026-08-24 — P3.8 boarding scan + manifest (Path B)

- POST /bookings/scan (SCAN_BOARDING): single-use; this driver's journey only;
  window T−15/T+30 (env). Owner: no lockout — typing the code is the normal fallback.
  Every attempt audited. GET /journeys/:id/manifest lists this departure only.
- Rider booked: QR + 6 digits + summary. Driver Journey: numeric scan + list.
  Cash tap feature-detects API.cashCollected.


## 2026-08-24 — Starfield placed, not hashed

- Dust coordinates are composed (corner clusters, a high arc, centre kept clear)
  and tiled vertically so the sky holds while they travel.

## 2026-08-24 — Starfield dust: mixed size/speed, faster scroll

- Desktop story dust is three compositor layers of irregular stars (box-shadow),
  not a grid. Near stars travel farther/faster than far ones.

## 2026-08-24 — One desktop dust layer (scroll-driven, not per slide)

- Per-slide specks removed (they lagged). One sticky field of dots sits over the
  whole story on desktop only, two CSS layers, `animation-timeline: --land`.
  Mobile and reduced-motion show none.

## 2026-08-24 — Last story slide match + scroll-linked dust

- Desktop last chapter is one viewport tall so it does not linger after the others.
- Story dust is 64 tokens-only specks in three depths; they translate with `--sy`
  while the slide copy stays pinned.

## 2026-08-24 — Story slides stay centred; more desktop hold; new board/noroute art

- Desktop: each story chapter is taller than the viewport; the illustration + copy stay
  sticky-centred while the user scrolls, then the next chapter covers it. Particles, orbs
  and mesh still move with `--sy`. Mobile stays one-viewport chapters (no extra hold).
- “Board in seconds” uses `boardfast` (phone photo). Drive “No route drawing” uses `noroute`
  (strategy). How-it-works board art is unchanged.
- Removed the leftover truncated HTML after `</html>` in `shell.html`.

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

## 2026-08-17 — M0.1 foundations: monorepo + pinned toolchain; payments decided

- Research pass R23 (`docs/research/03_PAYMENTS_EGYPT.md`): Paymob is the primary gateway
  (cards, Meeza, mobile wallets, Fawry OTC — Uber Egypt's choice); cash stays the core; driver
  payouts weekly via bank/InstaPay, ops-owned. Recorded as DEC-179..DEC-183 (also: keep the GUI
  as the real client, vertical-slice sequencing, agent-prepares-Railway).
- Execution plan written (`docs/planning/EXECUTION_PLAN.md`): milestones M0–M8, Railway topology,
  owner-provided accounts list.
- Monorepo skeleton (BUILD_PLAN P0.1): pnpm workspace + catalog (strict), pinned `packageManager`,
  Turborepo, `packages/config`, `apps/api` + `apps/mobile` placeholders with READMEs, `AGENTS.md`.
- `app/` moved to `apps/web/` (DEC-181 — the GUI is the real web client); all path references
  updated; test requires now use the workspace `jsdom`/`puppeteer` instead of a hardcoded
  `/tmp/node_modules` path.
- `scripts/check-workspace.sh` (P0.1): private root, exact packageManager, every package named,
  internal deps `workspace:`, external deps `catalog:` only. All four break cases observed failing
  for the right reason.
- Verification: GUI suite re-run green from the new location — 198 unit, 5,803 layout,
  40 + 7 break cases caught.

## 2026-08-17 — M0.2/M0.3: verify harness + secret hygiene; checklist system

- `pnpm verify` now runs repo checks → build → typecheck → lint → test; `verify-repo.sh` names the
  failing check and flags silent-green sub-checks (P0.2).
- Secret hygiene (P0.3): `check-secrets.sh`, `check-env-example.sh`, `apps/api` env config with zod
  and a named startup refusal, eslint rule restricting `process.env` to one module. All break cases
  observed failing for the right reason.
- Added `docs/process/checklists/` — a permanent completion ledger (master index + one file per
  milestone) so a box is ticked only when a command has proved it.

## 2026-08-17 — M0.4: Docker (one image for every service), infra/, CI; sandbox cleaned

- Sandbox cleaned to the repo + the active rules only (freed ~28 MB); GitHub is the source of truth.
- `infra/` replaces `deploy/` per the execution plan: parameterised `Dockerfile.node` (api + web),
  root `docker-compose.yml` (api, web, postgres+postgis, redis), Railway config + README, smoke test.
- `apps/web` gained a zero-dependency runtime server (serves the build + /healthz); `apps/api` gained
  a health server; both are unit-tested.
- CI workflow added: pnpm verify + full GUI browser suite + both image builds (non-root enforced).
- Docker proven live in the sandbox: one Dockerfile builds both services, containers run non-root,
  health endpoints answer, the app refuses to start naming missing env vars, no .env baked.

## 2026-08-17 — M0.5: PostGIS, migrations, no-ORM guard-rails; CI db job

- node-pg-migrate plain-SQL migrations (0001 enables PostGIS); schema-derived types
  (packages/shared-types/db.generated.ts); four no-ORM guard-rails (SQL location, SQL injection,
  migration drift, type drift) all wired and observed failing for the right reason.
- `pnpm db:verify` = migrations + drift + types, run against a live PostGIS (local compose or CI
  service container). PostGIS 3.4 confirmed; committed infra/schema.sql generated from a clean
  scratch database (migrations-only).
- CI gains a `verify-db` job with a postgis/postgis:16-3.4 service container.

## 2026-08-17 — M0.6: API skeleton + security foundation (Paymob-ready)

- NestJS 11 / Fastify API: one error shape (translation-key message_key, request_id), one request
  context, strict global validation (unknown fields rejected), one authority resolver + guard, one
  pino logger with central redaction, helmet, env-driven CORS allowlist, global rate limiting,
  trust-proxy for Railway. /health returns db+redis, 503 when down.
- Paymob contract: PaymentProvider interface + real HMAC-SHA512 webhook verifier (constant-time) +
  PaymobAdapter (sandbox refuses live actions; flips to live on keys). 16 module directories with
  "why" READMEs. 21 tests green; all break cases observed failing for the right reason.
- Sandbox: rebuilt with native Postgres 17 + PostGIS + Redis (Docker not available this turn);
  live API proof recorded (200/503/429/404/headers).

## 2026-08-17 — M0.7–M0.11: remaining guard-rails (tokens, boundaries, authority), axe scan, CI

- check-tokens (colour only, R19.5 scope), check-boundaries (contracts-only, domain≠infra, no
  cycles, shared≠apps), check-authority + check-hide-not-disable — all in `pnpm verify`, all break
  cases observed failing for the right reason. All-permissive resolver → 5 authority tests fail
  (the §7.0 proof). axe-core scan added: 14/14 across 7 screens × EN/AR.
- CI workflow validated (verify, verify-gui, verify-db + postgis service, images + non-root).
  Branch protection + red-PR observation = owner actions in GitHub settings (recorded).
- Phase 0 is now only missing the deploy (P0.12) and portability (P0.13) — plus two owner-gated
  items (branch protection, Railway connection).

## 2026-08-17 — DEC-184: managed databases for launch (PostGIS deferred to M2)

- Owner-directed for the free trial (Railway refuses the postgis/redis Docker-image services).
- Production now runs Railway **managed PostgreSQL + managed Redis** (automatic backups; no
  containers). PostGIS is DEFERRED to M2: migration 0001 is a baseline (`SELECT 1`) that runs on
  any PostgreSQL; geo returns at M2 via a PostGIS-capable host or numeric lat/lng + OSRM/geocoder
  (G-061). Local compose + CI use plain `postgres:16-alpine` for parity (DEC-185).
- `infra/schema.sql` regenerated from a clean plain-PostgreSQL scratch DB (pgmigrations only);
  `pnpm db:verify` green (0 drift, cycle clean); `pnpm verify` green.

## 2026-08-17 — DEC-186: PostgreSQL-only (Redis removed entirely)

- Owner decision: drop Redis; PostgreSQL is the only stateful dependency, on this architecture from
  the start (no adapter seam). Realtime = LISTEN/NOTIFY, queues = SKIP LOCKED, sessions/read models
  = tables, matching hot index = in-process H3 rebuilt from PostgreSQL, rate limiting = in-memory
  per instance. Revisit only with measured evidence at horizontal scale (G-062 MONITOR).
- Swept everywhere: `env.ts`/`env.test.ts` (REDIS_URL removed), health controller + test (db-only
  status, 503 when down), `ioredis` dependency removed, docker-compose + CI + production compose +
  .env.example + Railway README (managed Postgres only), EXECUTION_PLAN topology, BUILD_PLAN P0.x
  statements, MASTER_SPECIFICATION + CH05/CH08/CH09/CH13 (architecture statements + DEC-186/DEC-184
  revision banners), checklists, AGENTS-facing infra README. Historical records (research, old
  decision rows, changelog) left intact — decisions are append-only.
- Verified: `pnpm verify` green (198 web, 21 api, 9 repo checks); `pnpm db:verify` green; LIVE:
  `/healthz` → `{"ok":true,"service":"api","db":"up"}` (no redis), db down → 503.

## 2026-08-18 — M1 backend: identity & auth (real system core)

- Migrations users/otps/sessions; scrypt password hashing + jose JWTs + revocable refresh sessions;
  6-digit OTP (dev logs code, prod refuses without SMS provider); env-seeded bootstrap admin;
  super_admin-only staff creation. Live-proven end to end. 42 API tests green. Local commit only —
  push pending owner confirmation.

## 2026-08-18 — M1 backend complete: identifier login, drivers, vehicles, audit

- Staff log in with phone OR email + password; staff accounts accept phone and/or email.
- Driver self-registration (apply) → ops approval (state machine, atomic role promotion); vehicle
  registry + approval; append-only audit log (super_admin view) recording every privileged action.
- DEC-188 recorded. Guard-rails enforced themselves (SQL→repository, contracts-only imports, no
  cycles). 52 api tests green. Local only — push pending owner confirmation.

## 2026-08-18 — M1 frontend Stage 1: real entry flow (splash → landing → auth → app)

- Boot splash (bouncy logo); landing page with scroll-driven hero + features + map illustration;
  sign-in/create-account wired to the real API (staff password, rider OTP, staff no-self-signup);
  session persistence + sign-out; rail collapsed by default; demo role switcher removed; super_admin
  Administration section (staff + audit). API client + /v1 proxy. 218 unit / 14 axe / 6,904 layout /
  44 breaks green. Local only — push pending confirmation.

## 2026-08-18 — M1.5: verification & recovery (email codes, password reset, cooldown/lockout)

- DEC-189/DEC-190/DEC-191. Generalized `verification_codes` table (replaces `otps`): sms_login,
  email_verify, password_reset; 60s resend cooldown; 3 failed attempts → 1-hour lockout; codes
  hashed at rest. Email verification + password reset (no user enumeration; resets revoke all
  sessions). SMTP via nodemailer behind the one Notifications interface; honest sandbox.
- Migrations now run on boot (AUTO_MIGRATE) and ship inside the api image (Dockerfile copies
  infra/migrations) — the deployed DB gets the schema automatically.
- Route-level throttling on auth endpoints (login 10/min, OTP request 5/min, reset 5/min, …).
- Frontend: resend button with a live 60s countdown, 1-hour lockout banner, forgot-password flow,
  email verification section in rider/driver profiles. 226 web / 63 api / 14 axe / 6,904 layout /
  46 breaks green; live-proven end to end.

## 2026-08-18 — M1.6: smart sign-in (staff auto-detect), rider/driver signup, GUI audit fixes

- Sign-in is ONE form with auto-detection: `POST /auth/login/identify` returns the method
  (password → staff/any password account; otp → rider/driver, code sent automatically). No visible
  role toggle anywhere. Sign-up offers exactly Rider or Driver; Driver also submits the driver
  application after the account exists. Staff self-signup stays impossible (DEC-032/033).
- SMS provider wired for real: `SMS_PROVIDER=twilio` + `TWILIO_ACCOUNT_SID/AUTH_TOKEN` + `SMS_FROM`
  send real messages; without it, development logs the code and production refuses (honest).
- Google Maps layer: `/v1/config` exposes the client-safe key; `MapView` renders a real Google Map
  (marker, route polyline, "locate me" via navigator.geolocation) when the key is set, the labelled
  illustration otherwise. Geolocation is exercised here so the Capacitor build inherits it.
- GUI audit fixes: landing hero is full viewport on desktop; auth card is centered; boot splash
  minimum 1500ms; hero map zoomed/cropped; RTL mirrors the "how it works" icons; no visible
  scrollbars (still scrollable); text selection uses the accent colour; sign-up role cards styled.
- 229 web / 60 api / 14 axe / 6,904 layout / 46 breaks green; live-proven (identify/password/otp,
  full-screen + centered + no-scrollbar measured in a real browser).

## 2026-08-18 — fix(web): landing page fills the full viewport; truly adaptive hero

- Root cause: #root is display:flex (row), so the landing/authwrap flex children had no width and
  shrank to their content (~50% of the viewport). Fixed with width:100%;min-width:0 on both.
- Adaptive hero: stacked on phones, two-column (text start-aligned + map beside it) from 840px;
  title uses clamp() type; landing content capped at --landing-max (1120px) and centered; nav
  padding aligns to the cap; hero map height scales with the viewport.
- New browser test suite `tests/landing.test.js` (46 assertions): landing fills width, hero ≥ 1
  viewport, no horizontal overflow, centered auth card, RTL parity — across 7 viewports 320→2560.
  Wired into verify.sh, and a break case proves the width regression fails the suite.

## 2026-08-18 — feat(web): landing slideshow hero, user-facing features, hover tooltips

- Hero map replaced with an auto-advancing feature slideshow (same palette, pause on hover, dot
  controls, crossfade) — modern youth style.
- The two internal features ("Any city, one system", "Arabic first") replaced with end-user value
  props grounded in Swvl/Careem/Uber research: "Save on every ride" (fixed routes cost a fraction
  of ride-hailing) and "Track your ride live".
- Feature cards animate (lift + shine sweep + icon pop); the "how it works" steps reveal a floating
  tooltip that follows the cursor (tap-to-toggle on touch); step numbers stay on the physical right
  in BOTH languages (RTL no longer mirrors them).
- Hero is now full-bleed (the glow spans the whole viewport in light AND dark); content stays
  capped/centered; a second accent glow adds depth in both themes.
- 230 unit / 47 landing / 14 axe / 6904 layout / 47 breaks / 8 layout-breaks green; verified live
  (slideshow advances 0→1, tooltip on hover, dark glow = full 1440px viewport, zero console errors).

## 2026-08-18 — feat(web): stickers, colored slideshow, RTL numbers, auto lang/theme, theme-toggle fix

- Sticker packs unpacked and reviewed; chose the Streamline "Manila" doodle set (youth/lively,
  two-colour, recolorable). 7 stickers copied to apps/web/assets/stickers/ and recolored at build
  time to tokens (navy→--sticker-ink, blue→per-slide --sticker-accent) so they follow the theme and
  palette. Hero slideshow: each slide is now a coloured card (violet/coral/sky/mint tint) with its
  sticker; "How it works" cards carry a 112px sticker illustration; tooltips carry number + title +
  full description; step numbers stay on the physical right in BOTH languages.
- Sign-up audit: "ماذا تريد أن تفعل؟" was a 13px caption — now a real heading; role cards have
  16px titles / 15px subtitles with proper RTL wrap.
- Text-box focus/selection border is now the accent colour in both themes (--focus:var(--accent)).
- THEME-TOGGLE BUG fixed: the pre-paint script set data-theme on <html> while render() only set
  <body>, so the stale <html> attribute won and the toggle "did nothing". render() now keeps both
  in sync.
- Auto language (device language) + auto theme (device prefers-color-scheme, else time-of-day
  06:00–18:00) with persistent explicit overrides.
- Footer credits: "Vectors by Streamline" (free license permits commercial use without attribution;
  added as good practice).
- 233 unit / 14 axe / 47 landing / 6904 layout / 47 breaks / 8 layout-breaks green.

## 2026-08-18 — Email sign-in/sign-up + slider/landing polish (M1.8)

- Sign-in/sign-up is now EMAIL + OTP for riders and drivers (SMS/Twilio removed as dead code).
- Email allowlist: popular providers + all .edu/.edu.<cc> + env-extensible; temporary mailboxes
  (playboot.com, mailinator, 10minutemail…) are refused before any email is sent.
- Branded HTML emails (login code / verify / reset) over generic SMTP — Resend works by env only.
- Rate limiting now lives in PostgreSQL (throttle_records) — survives restarts, shared across
  instances (G-062 clause 1 resolved).
- Frontend: 6-box OTP input with auto-advance/paste/one-time-code; resend countdown and 1-hour
  lockout survive page refresh; friendly localized errors.
- Landing: "Vectors by Streamline" is a smaller link on its own line; role-choice chevrons sized
  (was rendering ~194–276px); slider cards are one solid pop colour each (white text, AA contrast);
  dark mode brightens the doodle accents; feature-card hover is bouncier.
- 77 API / 246 unit / 14 axe / 47 landing / 6904 layout / 53 breaks / 8 layout-breaks green;
  pnpm verify + db:verify green.

## 2026-08-19 — Slider illustration + motion polish (M1.8b)

- Slider doodle is now dark ink + white accents over the solid colour cards.
- Slides pop in with a springy overshoot (card scale + doodle bounce-rotate +
  copy rise + pulsing active dot) — reduced-motion guarded.
- Hero background glows drift very slowly (42s alternate) — reduced-motion guarded.
- Mailo SMTP values documented for ride.share.signup@mailo.com.
- 249 unit / 56 breaks / 14 axe / 47 landing green; repo checks green.

## 2026-08-19 — Account rules + the protected main admin (M1.9)

- One email = one account: sign-up (`/auth/signup/verify`) refuses an already-used email (any role) before and after the code; sign-in (`/auth/otp/verify`) requires an existing account. Friendly "already have an account — sign in instead" error in EN/AR.
- The env-seeded admin is the one main admin (`is_system_admin`): it can create/edit/remove staff; it is never editable/removable, and no second super_admin can be created or set (enforced in the single authority resolver).
- Staff lifecycle in the admin UI: system-admin row is marked and locked; other staff get Edit + Remove (soft delete — sessions revoked, history kept).
- 83 API tests / 253 unit / 58 breaks / 14 axe / 47 landing green; pnpm verify + db:verify green.

## 2026-08-19 — Resilience: API fails fast instead of hanging (M1.9b)

- Root cause of live "Something went wrong": the api service was down (web proxy 502) — the
  throttle store's DB pool had NO connection timeout, so an unreachable database wedged every
  request (including /healthz) into "application failed to respond" instead of a clean 503.
- pg pool now fails fast (connectionTimeoutMillis 5s, idleTimeoutMillis 30s); health endpoints
  are exempt from throttling so the platform's restart logic always gets an honest answer.
- Frontend maps 5xx to a clearer, retryable "service unavailable" message (EN/AR).
- Verified: full production boot locally (admin login OK, isSystemAdmin true); broken-DB boot
  answers /healthz in 13ms (503) and other routes in 5ms (500) — no hang.

## 2026-08-19 — Web proxy hardened + self-diagnosing (live 502 fix)

- Root cause of the live 502: server.js had NO timeout and NO guard — a malformed
  API_INTERNAL_URL (unresolved Railway reference) crashed the web process on every
  /v1/* request, and an unreachable API hung it forever.
- server.js now validates API_INTERNAL_URL once at startup (invalid → 503
  API_NOT_CONFIGURED, never a crash), the proxy has a 10s timeout + error handlers,
  and /healthz reports the API's reachability: { ok, service:'web', api:'up'|'down'|'unreachable'|'unconfigured' }.
- server tests extended (health api field, /v1/config, proxy 503 without API).
- Sandbox cleaned: sticker packs + zips removed from the workspace.

## 2026-08-19 — Pastel slider cards (illustrations pop)

- Slider cards are now ONE flat pastel tint each (brand-soft / coral / sky / mint bg) with
  on-colour dark text, a dark-ink doodle + pop-colour accent, and brand/line dots — the
  illustrations pop on the pastel instead of sitting on saturated dark shades.
- Removed the now-unused 700 shade primitives.
- Diagnosis for the live 502: the web service's API_INTERNAL_URL must be a CROSS-service
  reference (http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000), not the self-reference
  ${{RAILWAY_PRIVATE_DOMAIN}} (which points the web at itself).
- 253 unit / 58 breaks / 14 axe / 47 landing / repo checks green.

## 2026-08-19 — Bold slider cards + SMTP fails fast (live email fix)

- SMTP: SMTP_SECURE now defaults to 'auto' (implicit TLS on 465/2465, STARTTLS elsewhere) and the
  transport has 6s connect/greet + 8s socket timeouts — a slow/unreachable SMTP can no longer hang
  the OTP request (the live "service is busy" was the web proxy's 10s cap firing on a hanging Mailo
  connect). Send failures now throw notifications.email_send_failed (clear, retryable) instead of 500.
- Slider cards back to BOLD 700 shades (white text, AA) with white line-work doodles whose accents
  are the same-hue 300 steps (violet/coral/sky/mint) — illustrations pop and stay in the card's family.
- Proven: unreachable SMTP → email_send_failed in 34ms; 253 unit / 58 breaks / repo checks green.

## 2026-08-19 — Auth form fixes: password read, eye toggle, live countdown

- Fixed the live "Please check your entries" bug: sign-in (and signup/reset) read their inputs
  AFTER render(), which wiped the DOM — the password was sent empty and the DTO rejected it.
  All handlers now read values BEFORE re-rendering.
- Password fields now have a show/hide eye (field__eye), with aria-label + aria-pressed states.
- Resend cooldown ticks IN PLACE (no full re-render) so the OTP boxes the user is typing into are
  no longer wiped every second; the "Send code" / "Continue" buttons are cooldown-aware too, so
  the countdown is always visible where a code was just sent.
- Resend from the OTP step now falls back to S.authEmail (no email field on that step).
- 258 unit (5 new regression tests) / 14 axe / 47 landing / repo checks green.

## 2026-08-19 — [object Object] fix + staff profile + SMTP diagnostics

- Fixed the settings "[object Object]": the notifications error-key object clobbered the
  "Notifications" display string, so t("notifications") returned an object. Email error keys now
  live under error.* (backend + copy), leaving notifications a plain string.
- Staff profile: operations/manager/support/super_admin now get their OWN profile (account,
  email verification, language/theme/notifications, sign out) — wallet, subscriptions and safety
  centre (rider-only) are gone, and every staff role's nav now includes a profile page.
- SMTP failures now log the provider's own rejection (code + smtp response) so the deploy logs
  name the exact Mailo-side reason.
- 271 unit / 83 API / 14 axe / 47 landing / repo checks green.

## 2026-08-19 — AUTH_OTP_BYPASS env flag (test without an email provider)

- New env var AUTH_OTP_BYPASS (default false). When 'true': no code is issued or required —
  sign-up (allowlist + one-email-one-account still enforced) and sign-in proceed without OTP.
  The client skips the 6-box step (sign-up goes straight to the name step; sign-in enters
  directly). A loud warning is logged on boot. Keep 'false' in production.
- Also fixed: a successful sign-in left authBusy=true, so returning to the sign-in screen
  showed a stuck "…" button — enterApp()/signOut() now reset the auth-flow state.
- 87 API tests (4 new bypass tests) / 274 web unit (3 new) green; repo checks green.

## 2026-08-19 — Fix "check your entries" on the bypass name step

- Root cause: in OTP-bypass mode the client sent code:"" — class-validator's @IsOptional only
  skips null/undefined, so the empty string failed the 6-digit regex → validation.failed. The
  client now sends `undefined` (JSON.stringify drops the key) so the optional code passes.
- Audited every other @IsOptional DTO field: all are sent as undefined (dropped) or are strings
  where "" is valid — no other occurrence of this class of bug.
- Regression: "bypass signup omits the code field entirely" (observed failing when reverted to "").
- 275 web unit / 87 API tests / repo checks green.

## 2026-08-19 — Riders set a password at sign-up

- Fixed "create account" with no password: the sign-up flow now collects a password (min 8 chars,
  show/hide eye) on the name step, and the backend stores it scrypt-hashed. A rider account now
  signs in with email + password (identify routes it to the password method).
- SignupVerifyDto requires `password`; signupVerifyOtp hashes it; EN/AR copy added.
- 88 API (new test: password hash set + password sign-in works) / 275 web unit green.

## 2026-08-19 — M1-finish: demo data removed, screens honest, ops queue wired (M1.9f)

- Driver screens: honest empty states (no fake shifts/earnings/claims); profile shows the real user.
- Ops queue is now REAL: driver applications + vehicles load from the API; approve/reject call the
  real endpoints; live map lists real vehicles.
- Manager/support/stops/routes/users screens show honest "arrives in M2–M5" empty states.
- Deleted the whole DATA object and the demo sheets (qr, topup, subs, trip, claim, scan, fare,
  contacts); sos/report are honest M4 placeholders.
- New bundle-wide guard: "no sample content in the bundle" + break case (observed failing).
- 272 unit / 14 a11y / 5 server / repo checks green. Bundle 319→308 KB.

## 2026-08-19 — M2 P2.1: stop entity + distance module (numeric lat/lng)

- DEC-197: numeric lat/lng (no PostGIS) — G-061 closed; DEC-198: OSM map provider (free, no login).
- stops / stop_photos / stop_verifications (append-only trigger) + lat/lng & verified indexes.
- geo module: haversine + bounding box, stop codes, spacing guard, bounds, two-person verify,
  public verified-only "stops near me" endpoint.
- 105 API tests green; every new check observed failing; db:verify + repo checks green.

## 2026-08-19 — M2 P2.2: desk mapping tool (stops UI, CSV import, OSM map)

- Stops: POST /stops/import (all-or-nothing CSV) and POST /stops/:id/submit (draft→pending).
- Ops "Stops" screen is a real tool: coordinate + bilingual name form, duplicate-guard override,
  OSM click-to-place map, CSV import, stops list with status chips + submit.
- MapProvider: OSM/Leaflet (free, no key) is the default; Google behind the same surface when a key
  is set; /v1/config reports the provider.
- Fixed: $() now honours `id`, and list loaders pass element refs (admin/ops lists actually attach).
- 114 API / 279 unit / 14 a11y / 5 server / repo checks green.

## 2026-08-19 — M2 P2.3 + P2.4: field capture + verification queue

- Field capture: accuracy gate, required 4-question checklist, EXIF-stripped photo storage,
  idempotency by capture id, offline queue that flushes on reconnect.
- Verification queue in ops Stops: pending list → review view (checklist, photo, reject reason);
  two-person rule enforced server-side and in the UI (own capture hides approve).
- Retire endpoint (verified→retired, audited); public near stays verified-only.
- 125 API / 284 unit / 14 a11y / 5 server / repo checks green; 5 new break checks observed failing.

## 2026-08-19 — Landing page completeness (DEC-201) + M3/GUI direction documented

- Landing: For riders / For drivers / Safety sections + Terms·Privacy·Safety policy pages
  (structure real, legal wording = owner's per DEC-030).
- Documented: DEC-199 (A→B planner post-core), DEC-200 (desktop density), DEC-201 (landing),
  DEC-202 (M3 order); R19 research (Uber/Swvl/desktop density); M3 + GUI-polish checklists;
  project map + master status updated.
- 293 unit / 14 a11y / 47 landing / repo checks green.

## 2026-08-19 — M3 P3.1+P3.2: route entity + slot grid (backend)

- routes module: create/publish route, append verified stops (gapless), atomic reorder with
  cumulative distances, idempotent slot-grid generation (unique route/day/time).
- Migrations 0013/0014: routes + route_stops (verified-stops trigger, retire guard naming the
  route) + slots. Retire guard mapped to an honest conflict in geo.
- 140 API tests; 5 break checks observed failing; repo checks green; schema + types regenerated.

## 2026-08-19 — M3 P3.3: driver slot claim (journeys) + routes/slots UI

- journeys module: race-safe claim (UNIQUE slot_id), approved-driver+vehicle rule, release
  lock-window, open-for-booking, the driver "available work" board.
- Ops Routes is a real tool: create/publish routes, generate slots, view stops + distances.
- Driver Duty shows real journeys; Driver Work is the real find-work board with claim.
- 155 API / 299 unit / 14 a11y / 5 server green; break checks observed failing.

## 2026-08-19 — Branding single source (centralized)

- packages/brand/brand.json is now the ONE place for name, tagline, logo, font, favicon, browser
  theme and email identity; the web build and the API email templates both derive from it.
- scripts/check-branding.sh fails on a hardcoded brand name/logo in app source (observed failing).
- 306 unit / 155 API / 14 a11y / 47 landing / 5 server green.

## 2026-08-19 — M3 P3.4–P3.6: rider search → boarding → booking (bookings module)

- bookings module + migration 0016 with a database seat guard (no overselling under concurrency);
  fare locked at booking; cancellation returns seats.
- Rider UI is real: routes → boarding → departures → review → boarding code → trips.
- 164 API / 307 unit / 14 a11y / 5 server green; break checks observed failing.

## 2026-08-22 — Audit pass: test drift, CI gaps and doc drift fixed

- The web GUI verify (`./verify.sh`) could not actually run in CI: its scripts were
  committed without the exec bit. All 17 tracked `*.sh` files are now executable.
- Fixed `layout.test.js` drift from the demo-data removal: the sheet list is now
  derived from the live SHEETS registry (never drifts again), fetch is stubbed on
  `file://`, and a wide-table case keeps the scroll-wrapper guarantee measurable.
  Layout was 9 red; now 7482/7482.
- Fixed the break harness: two stale sed edits + a regex grep that could never
  match `[object Object]`. 74/74 breaks caught (was 71 + 3 missed).
- Wired the orphaned axe a11y suite into `pnpm verify` and `verify.sh`.
- Corrected `.env.example` (dead `MAP_PROVIDER_KEY` → real web vars).
- Consolidated the duplicated gap register (`AUDIT_AND_TODO.md` canonical;
  `OPEN_ITEMS.md` is a pointer) and synced README / docs-README / PROJECT_MAP /
  00_MASTER status to the actual code.
- Live smoke test: landing serves, but the deployed web reports `api:"unreachable"`
  and `/v1/*` returns 504 — logged as G-070 (owner action in Railway).
- Verified: `pnpm verify`, `pnpm db:verify`, `apps/web/verify.sh` all green.

## 2026-08-22 — Fix: API crash loop (JourneysModule missing @Global)

- The deployed API had been silently crash-looping: `BookingsService` could not
  inject `JourneysService` because JourneysModule was the one cross-module
  module missing `@Global()`, and the failure was invisible because the app was
  created with `{ logger: false }` (Nest's ExceptionsZone swallows bootstrap
  errors and exits 1). Fixed all four layers: the wiring, the silent logger, the
  logger's Error serialization, and the bootstrap catch's stack output.
- Added a DI-graph compile test (`apps/api/src/app.graph.test.ts`) so any future
  unresolved provider fails CI instead of crash-looping production — observed
  failing for the right reason, then green. 165 API tests total.
- Live API verified again after the fix ships (Railway auto-deploys on push).

## 2026-08-22 — Seamless trips tabs + advanced search (Fuse.js, Arabic+English)

- Fixed the trips-tab "page moves" bug: switching Upcoming/Past no longer re-renders
  the app, refetches, or snaps the scroll — the list is fetched once and filtered
  in place.
- Search now works: Fuse.js (Apache-2.0) vendored into the single-file build with an
  Arabic/English normalization layer (diacritics, alef/hamza/teh-marbuta unified).
  Riders search routes + boarding stops and see bookable journeys nested under each
  route; the ops stops list gets the same live filter; dead search fields on
  "coming soon" screens were removed.
- Fixed a build bug: injecting the library via a string replacement corrupted the
  bundle with `$&` (now a replacement function).

## 2026-08-22 — Policies filled (Terms / Privacy / Safety, EN + AR)

- The policy pages now carry real, generic, editable content (6 sections each, both
  languages) instead of a placeholder sentence; the "final legal wording is the
  operator's" note stays. 338 unit tests green, 77/77 breaks caught.

## 2026-08-24 — Landing story: layered chapters (Ride + Drive)

- Hero is copy + CTAs only (no intro doodles). After it: four full-bleed sticky
  chapters with mesh, orbs, drawing route, giant index — tokens only, reduced-motion
  safe. Drive page uses the same story with driver copy. Unit 350 green.

## 2026-08-24 — Landing v3 (story after hero, no slideshow, no duplicate safety)

- Rider page: hero slideshow removed; floating hero art + sticky story panels sit
  immediately after the hero. Feature grid is one list (schedule, cash, live, save,
  verified drivers, help). “Built to be safe” is gone. Board-by-code stays only in
  How it works. Policies: light cash/wallet polish; still generic + legal note.
- Nav unchanged: Ride · Drive · About · Help. Tokens only; reduced-motion still
  kills motion. Web unit tests 350 green. Browser landing suite [UNVERIFIED] here
  (Chrome shared libs missing in this sandbox).

## 2026-08-22 — Landing v2 (Ride · Drive · About · Help + sticky panels)

- New sticky top bar (Ride/Drive/About/Help, EN/AR, theme, Log in, Sign up) with a
  compact hamburger menu; four marketing pages for riders, drivers, About and a
  Help FAQ; a full-bleed sticky stacking-panels section and a subtle hero parallax
  (native CSS scroll-driven, reduced-motion safe). Policies stay filled (EN + AR).
- Brand name in the new prose is derived from the single brand source (the branding
  guard caught a hardcode during the pass and it was fixed).

## 2026-08-24 — Session start: reality check + CI audit (G-073/G-074/G-075 opened)

- Fresh-clone baseline re-verified locally, all green: `pnpm verify` (repo guards + build +
  typecheck + lint + 165 API + web unit), `apps/web/verify.sh` (a11y 14, layout 7452,
  landing 57, breaks 79/79, layout-breaks 8/8), `pnpm db:verify` (migrations cycle + schema +
  types, against a local schema-carrying Postgres 17). Live: web `/healthz` → `api:"up"`,
  `/v1/healthz` → `db:"up"`.
- **G-073 opened**: GitHub Actions has not EXECUTED since 2026-08-17 ~22:57 — all jobs on all
  later commits fail within ~3s with no logs (Actions minutes/spending exhausted). Proven by
  run timing + missing log blobs + a live re-run on HEAD today failing the same way. Owner
  action required (billing, or public repo — which triggers G-075).
- **G-074 opened**: CI `verify-db` job could never pass on any commit since M1.5 —
  `check-db-types.sh` regenerates types from the EMPTY CI service DB. Reproduced locally.
  Fix planned this session: derive the types check from the migrations' scratch schema.
- **G-075 opened**: going public (to restore free CI) needs the REPOSITORY_STANDARD
  sanitization pass (process/planning/research/investor material is in the tree AND history).
  Inventory + owner MCQ before any visibility change.
- Docs-only change this commit; no code touched.

## 2026-08-24 — G-074 fixed: CI verify-db made CI-proof (types from migrations, not the caller's DB)

- `check-db-types.sh` now builds a scratch database from the migrations and generates/compares
  `db.generated.ts` against that scratch schema. The old version read `DATABASE_URL`'s own
  database — empty in CI — so the job could never pass on any commit since M1.5 (hidden until
  now by G-073's dead CI). Break-observed: staged type corruption → `✗ drifted` (exit 1);
  empty-DB and schema-carrying-DB `pnpm db:verify` both green.

## 2026-08-24 — CI restored live (repo public), Paymob reference R20, verifier fixed (G-076)

- **G-073 CLOSED — the repo is public (DEC-203)** and GitHub Actions executes again: re-run
  on HEAD `2cf3f99` → Verify ✅, Verify database ✅ (first REAL CI run of the G-074 fix),
  Build images ✅, GUI suite ran to completion. Free standard-runner minutes on public repos
  replace the exhausted private-minute budget.
- **R20 — `docs/research/05_PAYMOB_INTEGRATION.md`**: the complete Paymob reference (owner
  request): classic Accept flow with exact endpoints/bodies, official webhook HMAC algorithm,
  sandbox test data, refunds/void/capture, payouts API (M5), the owner account checklist, and
  the env design — incl. `PAYMOB_ENABLED` master flag (DEC-204: Paymob first in the UI, cash
  second; hidden-not-disabled when off).
- **G-076 CLOSED**: the Paymob webhook verifier used the wrong signature scheme (whole-JSON
  HMAC instead of the official 20-field value concatenation). Rewritten + regression guard
  (old scheme now REJECTED by test) + §0.2 break-observed (field-list corruption fails the
  3 signature tests). 168 API tests green.
- Decisions: DEC-203 (repo public), DEC-204 (payment surface) appended; G-075 closed.

## 2026-08-24 — G-077: CI GUI job had a hidden Chrome-cache failure (fixed)

- First real CI GUI run since 2026-08-17 failed with "Could not find Chrome": the pnpm store
  cache (saved by `cache: pnpm`) restores packages as already-built, so puppeteer's
  postinstall — the Chrome download — is skipped on every cached run, and the browser lives
  outside the store (`~/.cache/puppeteer`) so it was never cached. Present since the cache
  was first written; invisible because CI billing was dead (G-073) and the one green GUI run
  (e78f097) predates the cache.
- Fix: the `verify-gui` job now caches `~/.cache/puppeteer` (keyed on the puppeteer pin in
  `pnpm-workspace.yaml`) and installs Chrome explicitly (`puppeteer browsers install chrome`,
  idempotent). Break-observed = the real CI failure above; proof = the next run green.

## 2026-08-24 — Parallel-work split: PATH_A (money) + PATH_B (journey/UX)

- Two agents now work the repo in parallel on non-overlapping paths. The full split —
  exclusive file ownership, append-only protocols for shared files (api.js sections,
  content.js key blocks, migration parity: A=odd, B=even), cross-path contracts
  (payments surface vs bookings surface), git rebase protocol, monitoring duty (A
  reviews B's commits) — lives in `docs/planning/PATH_A_MONEY.md` (Agent A:
  P3.7 wallet/ledger/Paymob, then M5/M6 money, payouts) and
  `docs/planning/PATH_B_JOURNEY.md` (Agent B: P3.8 scan/manifest, P3.9 live journey,
  planner DEC-199, desktop density DEC-200, M4, M7 APK; M8 joint).
- Groundwork: the rider wallet screen moved verbatim from `screens/rider.js` to the
  new `screens/wallet.js` (Path A ownership) so the two agents never share a screen
  file; build.js PARTS registers it. Build 415.9 KB, 349 unit + 14 a11y green.
- CI fully green on `ad5e7e7` and `c092b69` (all four jobs) — G-077 proof complete.

## 2026-08-24 — M3 P3.7 backend: double-entry ledger + payment orders + Paymob (Path A)

- Migration 0017 (Path A odd-numbered): `ledger_entries` (append-only by DB
  trigger — UPDATE/DELETE observed blocked with 23514; each row is a balanced
  debit→credit transfer; classic normalcy: driver_cash/provider_clearing are
  debit-normal assets), `payment_orders` (id IS merchant_order_id;
  provider_txn_id UNIQUE = webhook idempotency), derived `account_balances`
  view. Schema + generated types regenerated; db:verify green.
- Domain (pure, 20 tests): DEC-078 cash sequence (commission split funded by
  the driver-cash liability), wallet fare payment, refund-as-credit,
  over-refund refusal, integer-minor-units invariants, closed-system Σ=0 +
  1,000-random-history property test. My own closed-system test caught a real
  sign-model inconsistency BEFORE any money could move — fixed in both the
  domain and the view.
- PaymentsService + repository + controller: GET /payments/config (boolean
  only), GET /payments/wallet (derived), POST /payments/topup (honest refusal
  when Paymob unconfigured — no order rows), POST /payments/webhook (HMAC
  FIRST → idempotent claim → amount re-check → one-transaction apply; NO
  identity guard — the signature is the auth; rate-limited),
  POST /payments/cash-collected (journey driver only, idempotent),
  GET /payments/driver/earnings; issueCredit contract for Path B's cancel
  flow. PAYMENTS_SELF capability in the ONE resolver. Paymob adapter: real
  live checkout implemented (auth-token cache → order → payment key → iframe,
  R20) with sandbox still refusing honestly; G-078 fixed (normalizeWebhook now
  maps OUR merchant_order_id — regression-guarded).
- Env: PAYMOB_ENABLED / MODE / BASE_URL / IFRAME_ID / WALLET_INTEGRATION_ID /
  COMMISSION_PERCENT (default 0 — owner MCQ pending for the launch value).
- 201 API tests green; three service breaks + the DB trigger observed failing;
  pnpm verify + db:verify green. Wallet UI (P3.7.4) next session (Path A).

## 2026-08-24 — P3.7.4 wallet UI + P3.7 backend audit hardening (Path A)

- Backend audit (mandatory checklist): top-up DTO bounds now import the ONE
  definition (TOPUP_MIN/MAX — no second copy); cash-collected body validated
  (@IsUUID DTO — unvalidated before); unused departs_at column + join dropped;
  authority casts aligned; /payments/config now also carries the top-up bounds
  so the client never hard-codes them; two top-up success/failure-path tests
  added (§0.2 break-observed: pending-on-failure break caught).
- Wallet UI: real balance (derived, backend-truth), history with localized
  reasons and in/out signs, top-up sheet (presets + custom, server bounds,
  Paymob-first DEC-204, opens the provider iframe), honest Paymob-off state
  (§8.1), paymentChoice() embeddable component for Path B's review screen,
  payments client section in api.js, EN+AR i18n (w_* keys + payments.* error
  copy — placed at top level of en{}/ar{} after two placement corrections).
- Tests: 372 web unit (new Path A groups; the old coming-soon assertion now
  asserts the real loader). Break harness: 2 new cases — both observed
  CAUGHT; on the way it exposed a false-positive test (a `.row` selector that
  could never match — Row renders `.rowitem`) which is now a real check, and
  a mid-harness abort leftover (policyTermsX) that was restored. 203 API
  tests, pnpm verify + guards all green.

## 2026-08-24 — Path A: wallet fare payment (atomic) + reconciliation; Agent B monitoring

- Monitored Agent B's first commit (`754ae34` landing v3): ownership respected
  (his files + shared-by-protocol; Path A blocks untouched), merged tree
  `pnpm verify` green locally, CI running on it — no violations, no fixes needed.
- `chargeWalletForBooking` (DEC-204 wallet leg): advisory-locked atomic spend
  (pg_advisory_xact_lock per wallet INSIDE the transaction) so concurrent
  spends can never overdraw the append-only ledger; idempotent per booking;
  driver-earnings accrual via postFareFromWallet; endpoint
  POST /payments/bookings/:id/pay-wallet; contract comment points Path B's
  booking flow at it.
- Reconciliation skeleton (CH06 §6.9, report-only): closed-system Σ=0,
  every succeeded order has postings, no orphan postings, balances view ==
  recompute; GET /payments/reconciliation for manager/super_admin
  (VIEW_ANALYTICS); discrepancies are audited, NEVER auto-corrected.
- Proof discipline (§0.2): empirical parallel-spend proof on the real
  repository (exactly one 900-of-1000 spend lands); deterministic interleaved
  schedule proof — WITHOUT the lock the wallet overdraws to −800 (observed),
  WITH the lock the second spend waits, reads 100, refuses. 209 API tests.

## 2026-08-24 — Monitoring fix: 5 break cases re-anchored after landing v3 (Agent A)

- Agent B's `754ae34` (landing v3) turned CI red — not a product bug: all
  suites green (a11y 14, layout 7455, landing 64), but 5 break cases still
  targeted pre-v3 code (`BROKEN-BREAK`). Re-anchored to v3's actual shapes:
  policy links (new footer construction), stacking panels (numbered
  signature), story-doodle ink (.stackpanel__art color), hero single-
  illustration marker (class rename; the old slidepop case is obsolete),
  herodrift 42s→36s. Each of the 5 observed CAUGHT in a targeted harness
  run; the other 76 cases were green in B's own CI run. Operational rule
  appended to BOTH path files: re-anchor break cases in the same commit.

## 2026-08-24 — Monitoring fix 2: boarding-code break case re-anchored (P3.8)

- Agent B's `841e4eb` (P3.8 scan/manifest/boarding UI) went red on ONE stale
  break case — "booked screen loses the boarding code" still sed'd the
  pre-P3.8 line (`QRPanel({code:b.code})`); the new screen renders
  `QRPanel({code:String(b.code)})` inside `if (b.code)`. Re-anchored and
  re-proven CAUGHT. My earlier fix (`af2b495`) was green; this restores main.

## 2026-08-24 — B2 DEC-199 A→B planner (Path B)

- Rider can pick start + end stops; `planJourneys` ranks published routes
  whose boarding stop is near the start and whose line (later stops or
  segments) passes the end (alight-anywhere, DEC-140). Walking has no
  ceiling (DEC-064/134) — distances are shown honestly.
- 2-leg mixes (DEC-135) only when they beat the best single-leg by a
  clear margin. Selecting a plan opens the real departure list with the
  recommended boarding stop pre-chosen.
- P3.9 miss: rider live screen now polls ≥15s with error backoff and
  pauses while the document is hidden (GUI §15).

## 2026-08-24 — B3 DEC-200 desktop density (Path B)

- Control is `:root` tokens in `apps/web/src/styles/shell.html`, not Chrome
  zoom (zoom stays user-controlled). `--density:comfortable` on touch;
  `@media (min-width:840px)` switches `--density:compact` — type, tap,
  rail, spacing and `--content-max` at ~90% of the touch scale (the look
  the owner preferred at 90% browser zoom). Phone 44/56 and `--f-input:16`
  stay on `:root`.

## 2026-08-24 — R21 maps: research + the ONE RouteMap primitive (Path A)

- Owner asked where maps appear and requested Uber/Careem/Swvl best-practice
  research. Findings + design: docs/research/06_MAPS_UX.md (list-primary
  route-line maps for our fixed-route model; Uber's one-primitive/layer
  discipline; accessible alternative mandatory).
- `apps/web/src/lib/map.js` — RouteMap({stops, highlightStopId, vehicle}):
  data-bound route polyline + numbered stop markers on real tiles
  (Leaflet/OpenFreeMap default, Google branch parallel), boarding stop
  highlighted, optional live-vehicle marker (real progress data only),
  fit-bounds camera, honest illustration fallback, and the numbered stop
  LIST as the accessible non-map path. Registered in build.js PARTS.
  Styles: .mapstops tokens (reuses existing .chip--brand). i18n m_* EN+AR.
- Violation fixed on the way: the Google branch of realMapView drew a
  HARDCODED demo polyline (§8 no-demo-data) — removed; route drawing now
  exists only in RouteMap, data-driven.
- Tests: 404 unit (RouteMap group: ordered list, aria-hidden numbers,
  boarding chip, empty-data honesty, no-highlight, i18n parity both
  languages); token guard CAUGHT my colour-literal fallbacks before push
  (fixed to token chains); break case "RouteMap loses its accessible stop
  list highlight" observed CAUGHT. pnpm verify green, all guards clean.

## 2026-08-24 — B4 M4 safety & support (Path B)

- New `support` module: incidents (SOS + reports), legal state machine,
  share-my-ride tokens. Migration **0020** (even).
- Rider/driver SOS creates an incident that cannot be dismissed without a
  decision (CH12). Silent mode supported. Share link is public, limited
  fields, expires, blanks position when the journey ends.
- Support/ops ticket queue: investigate → decide with a mandatory reason;
  reporter is notified of the outcome. No mock phone calls.

## 2026-08-24 — B5 P7.1 Capacitor shell (Path B)

- `packages/platform` — one Platform interface (GPS / share / storage).
  Screens never import `@capacitor/*`. Runtime uses `window.Capacitor` only
  when the APK WebView injects it; deleting android/ leaves web working.
- `apps/mobile` is a real package: builds the web HTML into `www/`+`dist/`,
  serves `/healthz` + the same UI + `/v1` proxy so Railway's auto-imported
  `mobile` service is no longer an empty crash-loop.
- `apps/mobile/Dockerfile` pins `PROJECT=mobile` (root-context monorepo build).
- Guard: `scripts/check-platform-boundary.sh` + §0.2 break in
  `apps/mobile/tests/breaks.sh`.
- Checklist: `docs/process/checklists/M7_capacitor.md`. P7.2–P7.6 remain
  tracked, not stubbed.

