# DECISIONS REGISTER — permanent, append-only

Purpose: the single place where EVERY decision the user made is recorded, so nothing is ever
forgotten and any decision can be found again instantly.

Format: ID | Date | Question asked | DECISION | Rationale / source | Status
Status values: CONFIRMED (user said it) | PROPOSED (agent suggests, awaiting user) | SUPERSEDED

---

## Batch 1 — Product foundation (2026-07-29)

| ID | Question | DECISION (user's words preserved) | Rationale | Status |
|----|----------|-----------------------------------|-----------|--------|
| DEC-001 | What kind of shared-ride product? | "hybrid between these": A (commercial pooled taxi) + B (commuter carpooling) + C (managed shuttle/vanpool). ALL THREE. | User wants one platform covering the full spectrum of shared mobility. | CONFIRMED |
| DEC-002 | Which market first? | "we will start in alexandria egypt then cairo" AND must also be market-agnostic "to be easy for scaling". | Local launch, global architecture. | CONFIRMED |
| DEC-003 | Who puts cars into the system? | Option C — BOTH: self-service registration into an approval queue AND direct admin creation, one registry. | Resolves the conflict in the original idea. | CONFIRMED |
| DEC-004 | How do passengers and cars meet? | "all and smart system decide": fixed stops (skip stop if nobody assigned), on-route pickup at higher price, door-to-door at highest price. | Tiered, system-optimised, monetised comfort. | CONFIRMED |

## Batch 2 — Strategy and resources (2026-07-29)

| ID | Question | DECISION (user's words preserved) | Rationale | Status |
|----|----------|-----------------------------------|-----------|--------|
| DEC-005 | Which mode launches first? | "start first by marketing in universities and calling companies that owns vehicles for the start but the design must be ready and suitable for all". | Universities = dense, predictable, closed-community demand. Fleet-owning companies = instant supply. | CONFIRMED |
| DEC-006 | MVP or full product? | "i dont want mvp i want the full thing". Later refined: "we need to build everything before launching". | User wants a complete, finished product at launch. | CONFIRMED |
| DEC-007 | Who builds it? | "we are the only developers" + "i can create you a team when needed but you are the head, give them the files and tasks and they will do them". | Agent acts as technical lead producing task-decomposed work packages executable by hired developers. | CONFIRMED |
| DEC-008 | Reuse open source? | "we can use any open source existings we can search github and adapt things if there is anything can help us". | OSS-first, with mandatory vetting per rules section 16. | CONFIRMED |
| DEC-009 | Where does processing happen? | Delegated to agent: "what is the best practice, what is the outputs of the research". AGENT ANSWER: HYBRID, server-authoritative (see 02_ARCHITECTURE_ANALYSIS.md A1). | Matching needs global view + batching; money/safety must be server-side; device handles display, GPS filtering, offline outbox. | CONFIRMED (agent-decided by delegation) |
| DEC-010 | Depth of the final document? | "build ready thing, with every decision and details everything" + separate file recording all user decisions. | This file (DECISIONS_REGISTER.md) is that separate file. | CONFIRMED |
| DEC-011 | Technology stack? | Delegated to agent: "choose the most suitable the best thing... the more it dynamic and cross platform". AGENT ANSWER: see DEC-012 below. | User prioritises best practice, dynamism, cross-platform reach. | CONFIRMED (delegated) |

## Batch 2b — Agent decisions made under delegation (2026-07-29)

| ID | Decision area | AGENT DECISION | Evidence | Status |
|----|---------------|----------------|----------|--------|
| DEC-012 | Stack | *(mobile clause SUPERSEDED by DEC-176.)* TypeScript end-to-end: Next.js (web + admin) + React Native/Expo (rider, driver, and shuttle apps) + NestJS (backend) + PostgreSQL 16 + PostGIS + Redis + self-hosted OSRM/Valhalla + OR-Tools microservice (Python) for the offline optimiser only. | See 02_ARCHITECTURE_ANALYSIS.md A4. | PROPOSED — awaiting user confirmation → **SUPERSEDED by the later row for DEC-012** |
| DEC-013 | Team model | Agent produces per-role work packages (spec + acceptance criteria + tests) that hired developers execute; agent reviews. Requires a contributor handbook in the final document. | DEC-007. | PROPOSED |

## Batch 3 — Platform shape (2026-07-29)

| ID | Question | DECISION (user's words preserved) | Rationale | Status |
|----|----------|-----------------------------------|-----------|--------|
| DEC-012 | Technology stack | APPROVED (option A). TypeScript everywhere + Python OR-Tools service. | See 02_ARCHITECTURE_ANALYSIS.md A4. | CONFIRMED |
| DEC-014 | How many apps? | "i want one thing that directly detect the account and open the suitable ui, and the website also the same thing". ONE unified product that adapts its UI to the logged-in role. | Single brand, single download, single codebase; role detected at login. | CONFIRMED |
| DEC-015 | Delivery order of platforms | "we will start by website, then convert into app". WEB FIRST, then mobile app. | Faster iteration, no store review, immediate demos to universities/companies. | CONFIRMED |
| DEC-016 | Web responsiveness | Website must work on mobile, tablet and PC (true responsive, cross-platform). | Web is the launch surface, so it must serve drivers on phones too. | CONFIRMED |
| DEC-017 | Localization | Option C — full i18n framework, launching with Arabic + English, full RTL, new language = translation file only. | Supports market-agnostic scaling (DEC-002). | CONFIRMED |
| DEC-018 | Chapter sequencing | "move in the right logical arrangement bec things depend on each other, find the points we need to do and arrange them first then move one by one". Agent must produce a dependency-ordered chapter plan first. | Prevents rework from deciding things out of order. | CONFIRMED |

## Batch 4 — Domain model (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-019 | One model or three? | Delegated to agent ("search and decide for me"). AGENT ANSWER: ONE universal core model — Journey + Booking + RideRequest, with four named policy objects. | Mirrors GTFS-Flex (official spec since March 2024) which handles fixed/deviated/dial-a-ride as attributes of one structure; 1x build cost instead of 3x; future GTFS-Flex export. | PROPOSED — awaiting confirmation → **SUPERSEDED by the later row for DEC-019** |
| DEC-020 | Who creates a journey? | User: "both... the app can suggest the most suitable from existing ones but if the user insists to create new one he can do it... but I want very very very easy to use". AGENT ANSWER: separate INTENT from MECHANISM. Riders only state intent; the system joins an existing Journey or creates a new one invisibly. "Publish a journey" is a driver/admin-only screen. | Delivers both capabilities with a one-screen rider experience. | PROPOSED — awaiting confirmation |
| DEC-021 | Banned terminology | The word "Trip" is banned from code, schema, API and docs — replaced by Journey / Booking / RideRequest. | Ambiguity was already causing confusion in session 1. | PROPOSED → **SUPERSEDED by the later row for DEC-021** |

## Batch 5 — Chapter 1 detail decisions (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-022 | Process rule | User: "give me things in the MCQ so I can approve them, I don't know what I'm approving" + "things I don't close... do not close things yourself, all must be closed and discussed through the MCQ". | Added as binding project rule P5 in AGENT_RULES.md. | CONFIRMED |
| DEC-023 | Q1.1 Transfers between vehicles | User chose B: YES, support transfers from the start. | User wants full capability. AGENT CAUTION: this is the hardest failure mode in shared transport (stranded passenger). Mitigation options must be decided before this is final. | CONFIRMED (mitigation OPEN) |
| DEC-024 | Q1.2 Booking for someone else | User chose B: NO, every rider books for themselves only. | Simplest and safest identity model. AGENT CAUTION: this blocks school transport, parents booking for students, and HR booking for visitors — all relevant to the university/corporate go-to-market (DEC-005). Consequence must be confirmed. | CONFIRMED (consequence review OPEN) → **SUPERSEDED by the later row for DEC-024** |

## Batch 6 — Chapter 1 closure (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-019 | One model or three? | CONFIRMED option A: ONE universal internal model with policy settings. | GTFS-Flex precedent; 1x build cost; shared wallet/history/rating; future GTFS export. | CONFIRMED |
| DEC-021 | Ban the word "Trip"? | CONFIRMED: banned. Use Journey / Booking / RideRequest. | Removes a whole class of ambiguity bugs for hired developers. | CONFIRMED |
| DEC-024 | Booking for others? | CONFIRMED strict: every rider books for themselves ONLY. No org booking, no family booking. | User re-confirmed after being shown the cost. Every person in every vehicle is a verified account. | CONFIRMED |
| DEC-025 | Transfer failure handling | User: "best effort and each one consider separated journey if one succeed the second fail only refund the failed". Transfers are NOT a guaranteed product feature — each leg is an INDEPENDENT Booking, refunded independently. | Radically simplifies the model: there is no "transfer" object at all. | CONFIRMED |

### DEC-025 consequences (agent analysis, IMPORTANT — simplifies the architecture)
Because each leg is an independent Booking with independent refunding:
1. There is NO transfer entity, no linked-booking table, no connection-protection logic. The domain
   model of CH1 is unchanged and stays simple.
2. The system may still SUGGEST a two-leg option, but it must be presented honestly as two separate
   bookings with a clear warning that the second is not guaranteed.
3. Refund of a failed leg is just the normal single-booking cancellation/refund path — no new code.
4. RESIDUAL RISK (must stay visible): a rider whose second leg fails is refunded but still stranded.
   The reputational damage of a stranded student is real even when the money is returned. Proposed
   mitigations, to be decided later in CH12 (Trust & Safety), NOT closed here:
   - only offer multi-leg options in daylight hours,
   - only offer them at hubs with high vehicle frequency,
   - show a plain warning before booking,
   - surface a "get me home" fallback (paid private ride) rather than nothing.

## Batch 7 — Chapter 2 foundation (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-026 | Account types | Option B: FOUR roles — Rider, Driver, Organization Manager, Admin. | User chose the simpler set. AGENT CAUTION: no separate Support role means every support employee has full admin power over money and user data. Re-raise before build. | CONFIRMED (caution logged G-016) |
| DEC-027 | One account, many roles? | Option A: YES. One login can be Rider and Driver simultaneously, with an in-app switch. | Essential for carpool supply growth (DEC-003 self-registration). | CONFIRMED |
| DEC-028 | Identity / login | Phone number + SMS OTP is MANDATORY and is the identity of record. Users may ADDITIONALLY set a passcode/password and add an email to the account. | Phone is universal in Egypt; passcode avoids paying for an SMS on every login; email is optional convenience/recovery. | CONFIRMED |
| DEC-029 | **ORGANIZATION-AGNOSTIC PRODUCT** (major) | User: "it should be organization agnostic, we just ride like uber, the idea of targeting universities or companies is just marketing thing, but you just book and ride you do not know what company or what thing you ride as user normal user". Journeys MAY serve multiple organizations; riders never see organizational boundaries. | The product is a PUBLIC open network. Universities/companies are DEMAND ACQUISITION CHANNELS and SUPPLY SOURCES, not walled gardens. | CONFIRMED |

### DEC-029 consequences (agent analysis — this is the biggest re-framing so far)
POSITIVE:
1. One liquidity pool. Every vehicle can serve every rider -> far better matching density, which is
   the single strongest driver of pooling quality (R4.x). Walled gardens fragment liquidity.
2. Radically simpler rider UX, consistent with DEC-020 (intent, not mechanism) and the "very very
   very easy" requirement: the rider never picks a mode, an operator, or an organization.
3. Organizations become a SUPPLY and SUBSIDY layer, not a partition of the network.
NEGATIVE / MUST BE FACED:
4. **LEGAL: this re-opens G-006.** A closed-community/B2B transport service is the legally light
   path in Egypt (R1.8, Swvl's own position). An OPEN PUBLIC service where any person books any
   vehicle is precisely what the ride-hailing law targets (R1.1-R1.7), including the reported
   EGP 30M operating licence. Being organization-agnostic moves us INTO the regulated category.
   This must be confronted, not glossed over. -> new gap G-017.
5. The role "Organization Manager" (DEC-026) still exists, but its meaning changes: it manages the
   organization's VEHICLES, DRIVERS, SUBSIDIES and REPORTING — it does NOT own a private rider pool.
6. Billing model changes: organizations pay for subsidies/benefits consumed by their members, not
   for a private service. Needs a design in CH6.

## Batch 8 — Major simplification (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-030 | Legal strategy | User: "we do not need to talk about anything legal, there is a legal team who will manage that". LEGAL IS OUT OF SCOPE for this document. | The agent will not design legal structure. Agent obligation retained: where a technical choice has a legal dependency, it is FLAGGED once in the risk chapter and handed to the legal team — never silently assumed. | CONFIRMED |
| DEC-031 | Organizations | User: "no organizations at all in our app, at all". The Organization entity is REMOVED ENTIRELY from the product. No Organization Manager role, no org accounts, no org billing, no org subsidies. | Maximum simplicity. Universities and companies remain purely OFFLINE marketing/sales channels; they have no representation in the software. | CONFIRMED |
| DEC-032 | Support role | Option A: ADD a Support Agent role with limited powers (view active journeys, contact users, cancel a ride, refund up to a limit, escalate) and explicit prohibitions (no fare edits, no wallet edits, no account deletion, no data export, no vehicle approval). | Prevents the most common insider-fraud pattern. | CONFIRMED |

### Final role list after DEC-031 + DEC-032 (supersedes DEC-026)
1. **Rider** 2. **Driver** 3. **Support Agent** 4. **Platform Admin**
(Still four roles: Organization Manager removed, Support Agent added.)

### DEC-031 consequences (agent analysis)
REMOVED from the entire specification — no work will be done on any of these:
- Organization entity, org membership, org verification, org billing, org dashboards,
  org subsidies, org-private journeys, multi-org cost splitting, corporate reporting.
SIMPLIFIED as a result:
- Chapter 11 shrinks from "Admin + Organization dashboards" to "Admin dashboard" only.
- The permissions model drops an entire dimension (no per-org scoping of data access).
- Fare model (CH6) has only ONE payer type: the rider (plus platform promotions).
- The vehicle registry keeps its two entry doors (DEC-003) but "who owns the vehicle" becomes a
  simple attribute on the Vehicle record, not a relationship to an Organization account.
QUESTION THIS RE-OPENS (must be asked, not assumed):
- If a company owns 20 vans and wants them on the platform, HOW do those vans get in, and who
  manages them day to day, now that there is no organization account? -> MCQ next.

## Batch 9 — Supply & verification (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-033 | Fleet mechanism (G-018) | User chose A + B + C together: (A) fleet drivers can self-register as normal Driver accounts; (B) admins can enter vehicles and link drivers; (C) vehicles carry an optional lightweight FLEET LABEL so admins can view/manage them as a group. NO organization account, NO org login, NO org billing, invisible to riders. | Covers every real-world path while keeping DEC-031 (no organizations) intact. | CONFIRMED |
| DEC-034 | Who can add a vehicle | Confirmed DEC-003 survives: BOTH self-service driver registration (into an approval queue) AND direct admin creation, into ONE vehicle registry. | Preserves the "call companies with vehicles" sales channel. | CONFIRMED |
| DEC-035 | Driver verification | STRICT and manual: national ID + driving licence + vehicle licence + photo + verified mobile phone, all reviewed by a human admin BEFORE the driver may accept any ride. | Safety incidents are existential; riders are getting into a stranger's car. | CONFIRMED |

## Batch 10 — Vehicle ownership, scope, stops (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-036 | Driving a car you don't own | Option A: a driver may ONLY drive a vehicle registered in their own name (vehicle licence name must match national ID). | Simplest, safest, no consent-document handling. AGENT CONFLICT WARNING: this contradicts DEC-033/DEC-034 (company with 20 vans) — a company-owned van is by definition not in the driver's name. See G-019. | CONFIRMED (conflict OPEN) |
| DEC-037 | Parcels / goods | Option A: NO. People only. Parcels are not part of this product. | Keeps scope focused; avoids insurance/liability/chain-of-custody complexity. Recorded as a possible future product, not designed for. | CONFIRMED |
| DEC-038 | Where meeting points come from | Option A: ADMIN-CURATED ONLY. Every meeting point is created and verified by an admin (lit? can a car stop? near a landmark? safe at night?). No auto-generation, no crowd-sourcing in v1. | Stop quality directly determines rider trust. AGENT NOTE: this makes city mapping a launch prerequisite — see G-020. | CONFIRMED (workload OPEN) |

## Batch 11 — Vehicle binding & stop mapping (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-039 | G-019 resolution — vehicle ownership | SUPERSEDES DEC-036. User: "like Uber... the system needs only the account of the driver and does not need the deeper details. If the driver changes the car at some point it is normal, if all the details are accepted and legal — the system does not care." DECISION: the DRIVER is the accountable entity; the VEHICLE is an attribute the driver declares and an admin approves. Ownership matching is NOT enforced by the system. A driver may have multiple approved vehicles and switch between them. | Matches how Uber/Careem actually work; unblocks fleet vans and family cars; legality of the paperwork is the legal team's domain (DEC-030), not the software's. | CONFIRMED |
| DEC-040 | Pre-launch mapping | A dedicated MAPPING TEAM will map all of Alexandria before launch, using purpose-built internal tools. Stops may be updated continuously after the initial mapping. | User will resource this. Creates a hard product requirement: an internal Stop Mapping Tool is part of the build (not optional tooling). | CONFIRMED |
| DEC-041 | Stops served per journey | "each car journey not necessarily stops at each point, it picks some only" — a Journey serves only the subset of stops where someone is actually boarding/alighting. Confirms and generalises DEC-004's skip-empty-stop rule. | Core efficiency mechanism. | CONFIRMED |
| DEC-042 | Stop data richness | Option B: MINIMAL — name + coordinates only. | User prioritises mapping speed. AGENT CAUTION: with no night-safety or accessibility attributes, the system cannot make "smart" stop choices (avoid unlit stops at night, suitable stops for elderly/disabled riders), and DEC-004's auto-upgrade-for-accessibility idea becomes unimplementable. Re-survey later would be expensive. Logged as G-021 for review. | CONFIRMED (caution logged) |

### DEC-039 consequences (agent analysis)
- INV-12 (from CH2) is REVOKED. Replaced by:
  - INV-12b A Journey references exactly one approved Driver and one approved Vehicle; the vehicle
    must be in that driver's list of approved vehicles. No ownership relationship is asserted.
- Vehicle records still capture plate, model, colour, capacity, and document images/expiries,
  because riders must identify the car and admins must verify it. What is NOT captured or enforced
  is a legal ownership link to the driver.
- The `fleet_label` (DEC-033) still works: an admin can tag many vehicles as one real-world fleet.
- Driver may hold N approved vehicles; exactly one is ACTIVE at any time; switching is an audited
  action so every Journey record knows which car actually carried the riders.

## Batch 12 — Stop data, walking, and a NEW role requirement (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-043 | Stop data (supersedes DEC-042) | MANDATORY: name + map location ONLY. OPTIONAL and encouraged: night-safe flag, accessible flag, MULTIPLE photos, description, and further attributes. | Mapping stays fast (nothing blocks a mapper), while richer data can be added whenever available. Resolves G-021 without slowing the survey. | CONFIRMED |
| DEC-044 | Walking distance | DYNAMIC, not a fixed radius. For a stops-only journey the rider is offered the CLOSEST suitable stop to them. Walking limits adapt rather than being one global number. | Rider comfort first; avoids an arbitrary city-wide constant. Full parameter design deferred to CH4/CH5. | CONFIRMED (details OPEN) |
| DEC-045 | **NEW ROLE: Manager** (business/operations) | User: "we need the dashboard with managers and so on (not admins) to be able to change rates and money, and to create flash sales... to see numbers, like if we now see a lot of buses with a lot of empty slots, we can launch a flash sale... and send notifications. The admins will answer people and make sure the operations is running seamless." A MANAGER role is added, distinct from Admin. | Separates COMMERCIAL control (pricing, promotions, campaigns, analytics) from OPERATIONAL control (support, incidents, approvals). | CONFIRMED |

### DEC-045 consequences — role list REVISED again (supersedes DEC-026/DEC-032 role list)
| Role | Purpose | Examples of powers |
|---|---|---|
| Rider | Books and rides | — |
| Driver | Carries riders | — |
| **Support Agent** | Front-line problem solving | contact users, cancel a ride, small capped refund, escalate |
| **Operations Admin** | Keeps the service running | approve drivers/vehicles, manage stops, live ops map, suspend users, handle incidents |
| **Manager** (commercial) | Runs the business side | change fares/rates, create flash sales & promotions, send campaigns/notifications, view analytics & dashboards |
| **Super Admin** | Owns the platform | grants roles, changes system parameters, sees audit log, everything |

This is now SIX roles. The user's earlier preference for four (DEC-026) is superseded by their own
later requirements. Both are recorded; DEC-045 is the current truth.

### New product surface implied by DEC-045 (must be specified, currently unspecified)
1. **Real-time commercial analytics** — live occupancy: "how many vehicles are running with how many
   empty seats, where, right now". This is a genuine live-data requirement, not a nightly report.
2. **Flash sale / promotion engine** — create a time-boxed, targeted discount on SPECIFIC journeys,
   corridors, stops or time windows; with budget caps, eligibility rules and automatic expiry.
3. **Campaign / notification engine** — targeted push/SMS/in-app messaging tied to those promotions.
4. **Manager dashboard** — separate from the operations dashboard, commercially focused.
5. **Trigger/alerting** — "alert me when occupancy in zone X drops below Y%" so a manager can act.

## Batch 13 — Roles confirmed, capacity, sequencing (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-046 | Final role list | SIX roles CONFIRMED: Rider, Driver, Support Agent, Operations Admin, Manager, Super Admin. | Separates commercial power (Manager) from operational power (Ops Admin) from platform power (Super Admin). Supersedes DEC-026 and the Batch-8 four-role list. | CONFIRMED |
| DEC-047 | Seats sold per vehicle | Option B: SELL EVERY PHYSICAL SEAT. A vehicle's sellable capacity equals its physical passenger capacity. | Maximum revenue per vehicle, lowest price per rider. AGENT CAUTION: 3 adults across the back of a small sedan in Alexandria summer is a known churn driver; comfort complaints and low ratings are the expected cost. Logged as G-025 with cheap mitigations to consider later (vehicle class tiers, or a per-vehicle override). | CONFIRMED (caution logged) |
| DEC-048 | Work sequencing | Delegated to agent: "you decide the best way". AGENT DECISION: continue in strict dependency order (CH3 next), but front-load any question whose answer would change an earlier chapter. Rationale: option C (deciding all 25 F-items now) would ask questions out of context and produce worse answers; option B (Manager dashboard first) depends on pricing, which depends on the trip lifecycle. | Dependency order protects against rework. | CONFIRMED (delegated) |

## Batch 14 — Boarding, recurring, waiting (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-049 | Boarding proof | QR CODES are the primary validation mechanism EVERYWHERE possible. GPS runs in the background as a supporting signal, never as the main proof. | User: "depend fully on QR codes in all the validations possible, the GPS must work in the background but not the main thing". AGENT NOTE: night/low-light, cracked screens, dead phones and no-signal cases need a documented fallback — see G-026. | CONFIRMED (fallback OPEN) |
| DEC-050 | Data collection | "the app must collect all the data and store them" — comprehensive event/telemetry capture is an explicit product requirement, not a by-product. | Enables analytics (DEC-045 Manager dashboards), disputes, algorithm improvement, and any future regulatory export. AGENT NOTE: "collect everything" has privacy, storage-cost and consent consequences; scope must be defined — see G-027. | CONFIRMED (scope OPEN) |
| DEC-051 | Recurring commutes | Option C: SUBSCRIPTION. Riders buy a weekly/monthly commute with guaranteed seats. | Best retention and predictable revenue; matches the model that made Swvl profitable (R2.3). AGENT NOTE: guaranteed seats require guaranteed supply — the platform now carries an obligation it must be able to honour. See G-028. | CONFIRMED (supply risk OPEN) |
| DEC-052 | Wait time at a stop | DEFAULT 10 MINUTES. The driver may choose to wait longer at their discretion. | User's choice. AGENT CAUTION: 10 min is very long for pooling — it delays every rider on board and every downstream stop. Mitigation options logged in G-029. | CONFIRMED (caution logged) |
| DEC-053 | Boarding UX requirements | Explicit UX demands: rider's phone ALARMS when the vehicle reaches the stop; driver's app scans QR codes and shows WHO IS MISSING, with one-tap contact. | Raises boarding from a transaction to a designed experience. Becomes a hard requirement in CH10. | CONFIRMED |
| DEC-054 | Money model | User: "I think we need to search and think more to create the full picture of how money works". Initial instinct recorded: strict — cancelling a bought ticket loses ~50%; a driver who accepts then cancels also loses fees. NOT FINAL. | Money design deferred to a dedicated deep-research pass in CH6. | DEFERRED — CH6 |

## Batch 15 — Money & launch coverage (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-055 | Cancellation policy | STRICT, with mandatory informed consent BEFORE purchase. The UI must explicitly warn ("this ticket cannot be cancelled without losing ~50%") and require the user to confirm. Refunds are ALWAYS issued as WALLET CREDIT, never back to the card. | User: "the UI asks the user if he wants to confirm and tells him no cancellation, then use the strictest thing, and the refund always as credit". Informed consent softens the harshness; wallet credit keeps money in the platform. AGENT CAUTION RETAINED: harsher than the local Swvl benchmark (R7.7). Monitor cancellation-related churn from day one. | CONFIRMED |
| DEC-056 | Price certainty | GUARANTEED PRICE LOCKED AT BOOKING. The rider pays exactly what was quoted, even if the vehicle ends up empty or full. The platform absorbs matching risk. | R7.3: uncertainty deterred riders more than price; ~31% of shared rides run solo at the discounted price anyway. | CONFIRMED |
| DEC-057 | Launch coverage | Start with UNIVERSITY routes. The platform must let a MANAGER open new routes/areas from the dashboard with no engineering work. The WHOLE map is always visible; areas without journeys simply show no service, making coverage self-evident to users. | Concentrated density where it is strongest, plus operator-controlled expansion. Makes "market-agnostic scaling" (DEC-002) concrete: expansion is a dashboard action. | CONFIRMED |
| DEC-058 | Fare shape | DEFERRED — user requested a plain-language explanation before deciding. | Agent to re-present in simple terms with Alexandria examples. | PENDING → **SUPERSEDED by the later row for DEC-058** |

## Batch 16 — Fares, rewards, price control (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-058 | Fare shape (resolved) | FIXED PRICE PER ROUTE. "Smouha → University = 15 EGP, always." The rider buys a ticket at a known price. | Simplest possible mental model; matches microbus/Swvl expectations; makes subscriptions (DEC-051) natural; advertisable. | CONFIRMED |
| DEC-059 | Occupancy-based pricing/rewards | REJECTED. Riders have NO visibility of how full the vehicle is and are NOT rewarded for it. "They just book a ticket then ride only." | User wants the rider experience to be a simple ticket purchase, disconnected from vehicle economics. Overrides the research-backed occupancy-discount idea (R7.2) in favour of simplicity. | CONFIRMED |
| DEC-060 | Reward mechanics (what IS rewarded) | Wallet credit is earned for: (a) SHARING A JOURNEY that results in another rider joining that journey (if seats remain), and (b) REFERRING A NEW USER to the app — both users get a reward, Uber-style. | Growth loops tied to the two behaviours that actually help the platform: filling existing journeys and acquiring users. | CONFIRMED |
| DEC-061 | Reward controllability | EVERY reward mechanism must be switchable ON/OFF and configurable from the MANAGER DASHBOARD. Nothing is hard-coded. | Business agility; lets the company stop paying for a promotion instantly. | CONFIRMED |
| DEC-062 | Price control | Managers set prices per route AND a price-per-km rate, can create EXCEPTIONS, and see the effect of changes. Changes take effect immediately. Guardrails required: full change log, sanity limits (no accidental zero fares), and clear preview of impact. "The dashboard should be advanced." | Maximum commercial agility with protection against costly mistakes. | CONFIRMED |

### Note on DEC-058 + DEC-062 together
Fixed route prices are the PRIMARY model, but a per-km rate also exists. Interpretation to confirm
in CH6: the per-km rate is the FALLBACK used to auto-price any origin/destination pair that does not
have an explicit fixed route price, and is also the basis managers use to generate suggested prices
for new routes. Exceptions override both. [To be verified with the user in the CH6 MCQ.]

## Batch 17 — Ticket types and stop choice (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-063 | Ticket types (resolves the DEC-004 vs DEC-058 conflict) | TWO ticket types only: (1) NORMAL STOP TICKET, (2) STREET/ON-ROUTE PICKUP TICKET (request the driver to stop on or near the route) which costs more. Full door-to-door as a third tier is dropped for now. Exact surcharge method deferred pending research. | Simpler than three tiers; preserves the price gap that keeps routes straight. | CONFIRMED (surcharge method PENDING) |
| DEC-064 | Walking ceiling | NO hard limit. Street pickup is ALWAYS offered as an alternative option. | User: "no limit and street pickup always proposed as option". Turns a coverage gap into an upsell instead of a rejection. AGENT CAUTION: with no ceiling the system may still surface a very distant stop; the UI must present distance honestly so the rider self-selects. | CONFIRMED |
| DEC-065 | Stop selection | The rider SEES all stops on the map and in a list, and may CHOOSE ANY of them. The system RECOMMENDS the best one. | Rider autonomy + system guidance. AGENT NOTE: allowing any stop means the rider can pick one that is poor for routing; the price/feasibility must be recomputed for whatever they choose, and infeasible choices must be shown as unavailable rather than failing after booking. | CONFIRMED |

## Batch 18 — Pricing formula & code maintainability (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-066 | Street-pickup surcharge method | COMBINE all three approaches (flat uplift + detour banding + cost recovery) into ONE formula, with every variable controllable by the Manager from the dashboard. | Gives predictability, fairness and cost protection at once; manager retains full commercial control. | CONFIRMED |
| DEC-067 | Door-to-door tier | DROPPED ENTIRELY. Two ticket types only: Stop ticket and Street/On-route pickup ticket. | Cleanest product; street pickup already covers most of the need. | CONFIRMED |
| DEC-068 | Code organisation (NEW REQUIREMENT) | Code must be organised for very easy maintenance and updates. Architecture must make changes cheap and safe. To be specified as a first-class chapter, not an afterthought. | User: "I want to discuss the organization of the code that should be very easy to maintain and update, do not miss this point". | CONFIRMED — to design in CH8 |

## Batch 19 — Engineering discipline (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-069 | Code structure | MODULAR MONOLITH. One deployable application, internally split into strictly-bounded modules with defined interfaces; no module reaches into another's internals. Seams designed so a module can be extracted into a service later without rewriting it. | Right complexity for the team size; avoids the distributed-systems tax while keeping future optionality. | CONFIRMED |
| DEC-070 | Business rules location | CONFIG-DRIVEN. Prices, bands, limits, wait times, walking rules, reward rules and feature switches live in the DATABASE as versioned configuration, editable by Managers. Code reads and applies; it never hard-codes a business value. | Makes the Manager dashboard genuinely powerful; makes multi-city expansion configuration rather than engineering (DEC-002); removes developers from the loop for commercial changes. | CONFIRMED |
| DEC-071 | Quality gates | FULL DISCIPLINE FROM DAY ONE: automated tests, static type checking, linting, mandatory code review, and a single command that verifies everything. Nothing merges unless it passes. | Essential when work is handed to rotating hired developers (DEC-007); also mandated by the user's own agent rules §6.2. | CONFIRMED |

| DEC-072 | Matching timing | ADAPTIVE batch window: short when demand is high, longer when quiet; the window is a Manager-tunable configuration value. | R4.5 (batching beats instant dispatch by a wide margin) and R9.4 (adaptive timing is standard industry practice). | CONFIRMED |
| DEC-073 | Scheduled vs live | TWO ENGINES: an overnight/offline planner (OR-Tools, full optimisation) for scheduled and subscription journeys, and a fast live engine for same-day/on-demand requests. | Subscriptions are the core product (DEC-051) and there is no time pressure overnight; use it. | CONFIRMED |
| DEC-074 | Matching engine design | APPROVED: the 6-stage layered pipeline (H3 pre-filter → feasibility → insertion heuristic → deadline-bounded batch optimiser → offer workflow → overnight VRP). | R9.1/R9.3/R9.5/R9.10. Fast answer always available; optimiser is optional improvement. | CONFIRMED |
| DEC-075 | Driver fairness in matching | PURE EFFICIENCY. The algorithm always picks the best match for the system; no fairness weighting toward lower-earning drivers. | User's choice. AGENT CAUTION: R9/industry practice includes fairness because driver supply is the hardest constraint; consistently poorly-served drivers churn. Logged as G-036 to monitor, with the fairness weight designed as a config value defaulting to zero so it can be enabled without code changes. | CONFIRMED (caution logged) |
| DEC-076 | No-match behaviour (F-16) | HONEST IMMEDIATE ALTERNATIVES: state plainly that nothing fits, and offer concrete options (a different time, a different stop, street pickup at its price). Never an empty screen, never an endless spinner. | This screen determines whether a rider ever returns. | CONFIRMED |

| DEC-077 | Payment methods | ALL of: wallet (primary), cash, Paymob (cards + mobile wallets + kiosk), and InstaPay where available. User: "cash is fine wallet, paymob and instapay integrations if possible is great". | Maximum inclusion in the Egyptian market. | CONFIRMED (mechanism detail below) |
| DEC-078 | Cash mechanism | Cash IS allowed, but ALWAYS recorded against the scanned booking: scan QR → driver marks "cash collected" → the fixed fare becomes a driver liability, settled against payout. No untracked cash sale ever exists. | Only safe way cash and pooling coexist; keeps the ledger authoritative. | CONFIRMED |
| DEC-079 | Payment methods (full list) | ALL of: in-app WALLET (primary), CASH (recorded), PAYMOB (cards + mobile wallets + kiosk), INSTAPAY (via PSP/bank, not direct API), DIRECT CREDIT/DEBIT CARD, APPLE PAY. All behind one payment-provider abstraction. | Maximum inclusion; user wants every option available. | CONFIRMED |
| DEC-080 | Driver payouts | WEEKLY payouts via Paymob Payouts / Instant Cashin, subject to a minimum threshold (R10.4: EGP 1,000-5,000 typical). | Predictable, low fee overhead, matches PSP thresholds. | CONFIRMED |
| DEC-081 | Platform revenue | PERCENTAGE COMMISSION is the DEFAULT, but the system must SUPPORT commission / driver-subscription / hybrid models as configuration, switchable without engineering. | User: "I want the idea of system support things but the default is commission". Fits DEC-070. | CONFIRMED |
| DEC-082 | Growth mechanics | ALL THREE: habit/streaks + social (referral & journey sharing) + price events (flash sales/campaigns). Each independently switchable and measurable from the Manager dashboard. | Fits DEC-061; lets the business learn which lever works and disable the rest. | CONFIRMED |
| DEC-083 | F-38 multi-seat booking | ALLOWED: one rider may book multiple seats, all under their own name and responsibility (multiple QR codes issued to them). No named third parties, so DEC-024/INV-11 survives. | Covers friends/couples/colleagues travelling together — a normal everyday case Swvl supports. | CONFIRMED |
| DEC-084 | C-5 wait-time conflict | NOT AN APP CONCERN. The user rules that managing a late rider is handled socially by the driver (asking people, judging the situation), not by system logic. The 10-minute default stands; the app does not enforce a promise-vs-wait trade-off. | User: "that's something internal, the driver asks people and so on, that's not an app thing". AGENT NOTE: the app should still SHOW the driver the consequence (who is on board, their promised times) so the human decision is informed. | CONFIRMED |

## Batch 20 — Codebase shape & build order (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-085 | Codebase shape (resolves C-2, C-3) | *(mobile clause SUPERSEDED by DEC-176: Capacitor, not Expo.)* MONOREPO WITH SEPARATE UIs. `/apps/mobile` (Expo, rider+driver, role-adaptive), `/apps/web` (Next.js: public site, rider web booking, Manager & Ops dashboards), `/apps/api` (NestJS modular monolith). Shared packages: `shared-types`, `shared-logic`, `shared-api`. UI is NOT shared; everything else is. | R11.3/R11.4/R11.5: practitioners and official guidance agree. Driver needs native background GPS (physics, not framework choice); dashboards need real desktop UI; public site needs SEO. Also allows hiring a web dev and a mobile dev in parallel. | CONFIRMED |
| DEC-086 | Build order | VERTICAL SLICES: one complete feature at a time, working end-to-end across API + web + mobile before starting the next. | Matches DEC-006's "nothing fake" stance — nothing is ever half-built. | CONFIRMED |
| DEC-087 | Process (restated) | ALL discussion continues via MCQ, per rule P5. | User restated. | CONFIRMED |
| DEC-088 | API style | REST + WebSockets. REST for actions, WebSockets for live push. | Simplest to build and debug; universally understood by hired developers; good caching. | CONFIRMED |
| DEC-089 | Realtime scope | LIVE only where it matters: vehicle position, ride/booking state, driver manifest. Everything else refreshes on demand. | Protects battery on low-end Android and keeps server cost low. | CONFIRMED |
| DEC-090 | GPS sampling | ADAPTIVE: frequent near stops/pickups, sparse on long stretches. | Addresses F-34 (driver battery drain as an operational failure cause). | CONFIRMED |
| DEC-091 | Offline capability | CRITICAL ACTIONS WORK OFFLINE: QR boarding scans, arrival marking, journey progress — queued in an outbox and synced with idempotency keys. Booking/payment remain online-only. | Alexandria dead zones, garages, tunnels. Booking offline is unsafe (cannot verify seat availability). | CONFIRMED |

## Batch 21 — Safety, gender, retention (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-092 | Safety features | FULL KIT: SOS button with live location to support, share-my-ride link, masked calling both directions, two-way ratings, and a tracked incident flow with follow-up. | Rider expectation in 2026 and a real marketing advantage in Egypt. | CONFIRMED |
| DEC-093 | Gender preference | Women may REQUEST women-only vehicles/seats when available (soft preference, not a guarantee). If no suitable vehicle exists, normal options are shown. | Research noted ride-hailing is especially popular among women in Egypt partly for safety; strong adoption driver without a hard supply promise. | CONFIRMED |
| DEC-094 | Data retention | KEEP EVERYTHING INDEFINITELY. No automatic deletion of collected data. | User's choice for maximum analytical value. AGENT CAUTION (recorded, not overridden): (a) storage cost grows without bound; (b) a breach would expose years of every rider's movements — home, workplace, daily routine; (c) indefinite retention of personal data conflicts with common data-protection principles and may conflict with Egypt's PDPL — this is a LEGAL question owned by the user's legal team (DEC-030), and it MUST be put to them explicitly. Technical mitigations proposed below. | CONFIRMED (caution logged, legal referral required) |

### DEC-094 required technical mitigations (agent-proposed, not yet approved)
Because the data is kept forever, the protections around it must be stronger, not weaker:
1. **Encrypt location history at rest** with a separate key from the main database.
2. **Separate the movement store** from the operational database, with its own tighter access rules.
3. **No bulk export without Super Admin approval**, always audited (already in CH2 §2.4).
4. **Pseudonymise on access**: analytics queries see a hashed rider id by default; re-identification
   is a separate, audited privilege.
5. **Age-based cold storage**: data older than N months moves to cheaper archival storage —
   still kept, just not in the hot database. This controls cost without deleting anything.
6. **Right-to-deletion path** must still exist technically even if unused, because a regulator or
   court may compel it. Deleting a user anonymises rather than destroys financial records (INV-9).
| DEC-095 | SOS staffing | On-call phone rota (a real person, 24/7) at launch; upgrade to a staffed desk when volume justifies it. | Honest and achievable; the button always reaches a human. | CONFIRMED |
| DEC-096 | Rating consequences | INFORMATIONAL ONLY. Ratings carry no automatic consequence for drivers. | User's choice. AGENT CAUTION: ratings then provide no protective function; the protective role must be carried entirely by the INCIDENT/complaint flow (DEC-092) and by Ops Admin action. Logged as G-044 — the complaint path must therefore be strong, because it is now the only mechanism that removes a dangerous driver. | CONFIRMED (caution logged) |
| DEC-097 | Fraud focus | Design against the three money-draining vectors: GPS spoofing / fake completed rides, driver-rider collusion, and promotion/referral abuse. Rule-based detection first; pattern detection later. | Targets actual financial loss rather than speculative threats. | CONFIRMED |

## Batch 22 — UX foundations (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-098 | Rider home screen | ADAPTIVE HOME: one screen whose top slot changes by context — new user sees "Where to?" search; a rider with an upcoming booking sees that booking as the highlight; a repeat commuter sees their saved commute. **The screen LAYOUT stays identical across web and mobile; only the content (banners, top slot) adapts.** | R12.2/R12.3 evidence; user added the constraint that the screen must feel the same everywhere, with adaptivity in content not structure. | CONFIRMED |
| DEC-099 | Offline model | SPLIT: **driver app = offline-FIRST** (local storage is the source of truth; a full journey can run with zero signal), **rider app = offline-capable** (cached stop, time, walking line, ticket QR), **booking/matching = online-only** (a scarce seat cannot be honestly promised offline). Delta sync only; optimistic UI with calm rollback. | R13.1/R13.6: research explicitly warns offline-first is risky for real-time dispatch, but journey EXECUTION only records what already happened. | CONFIRMED |
| DEC-100 | Subscription trial day | YES — a single TRIAL DAY is offered before committing to any recurring subscription. | R12.2: both riders and drivers preferred starting with one test day; removes commitment fear on an unproven route. | CONFIRMED |
| DEC-101 | Manager dashboard behaviour | ACTIVE ALERTING: the system watches occupancy/demand thresholds and raises actionable alerts ("Zone 4: 12 empty seats, 32% occupancy — suggest flash sale"), each with a one-click action. Thresholds are configurable. NOT fully automatic rules (rejected for now: an automated rule with a bug spends real money). | Turns DEC-045 into something that works when nobody is watching. | CONFIRMED |
| DEC-102 | Ops Admin home | WORK-QUEUE FIRST: pending driver approvals, vehicle approvals, open incidents, disputes — in priority order. Live map is a tab. | Ops work is clearing queues, not watching dots. | CONFIRMED |
| DEC-103 | Growth build priority | ALL THREE EQUALLY (referrals, streaks, flash sales), each measurable, and let real data decide which to invest in. | Nobody can reliably predict which mechanic works in a new market. | CONFIRMED |

## Batch 23 — Infrastructure & testing (2026-07-29)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-104 | Hosting | SELF-MANAGED VPS (Hetzner / DigitalOcean class). Not managed cloud. | User's choice: 3-5x cheaper and full control. AGENT CAUTION: the team becomes responsible for backups, patching, uptime, and 3am failures. Mitigations mandated below. | CONFIRMED (caution logged) |
| DEC-105 | Region | ANY region — no constraint imposed by the user. AGENT DEFAULT: choose a low-latency European region (Frankfurt/Milan class) for Alexandria, with the region treated as configuration so it can move. | Latency to Egypt is acceptable and provider maturity is highest. NOTE: if the legal team ever confirms a data-localisation requirement (research R1.5 showed Egypt has debated exactly this), the region must move — so no code may assume a region. | CONFIRMED (agent default) |
| DEC-106 | Testing depth | FULL PYRAMID: unit + integration + contract + end-to-end + FleetPy simulation against synthetic Alexandria demand before launch. | Matches DEC-071 quality gates; validates the algorithm with zero real riders at risk. | CONFIRMED |

### DEC-104 required mitigations (because self-managed means self-responsible)
1. **Everything as code**: servers reproducible from scripts/containers; no hand-configured machines.
   If a server dies, a new one is rebuilt from the repository, not from memory.
2. **Automated backups with tested restores.** An untested backup is not a backup (CH12 §12.8).
   A restore drill must be performed and documented on a schedule.
3. **Managed exception**: the PRIMARY DATABASE is the one place where the agent recommends paying
   for a managed service even on a VPS-first strategy, because losing the ledger is unrecoverable.
   [Raised as an MCQ rather than assumed.]
4. **Monitoring and paging** from day one: uptime, error rate, queue depth, disk space, certificate
   expiry. Self-hosting without alerting is how outages become multi-hour.
5. **Staging environment** that mirrors production, because there is no provider safety net.
| DEC-107 | Database hosting | SELF-HOSTED with a live REPLICA and automated OFF-SITE backups from day one. Not managed, not a single box. | Keeps cost and control while removing the single-point-of-failure. Mandatory: streaming replication to a second machine, automated encrypted off-site backups, point-in-time recovery configured, and DOCUMENTED RESTORE DRILLS on a schedule. A restore that has never been tested does not count. | CONFIRMED |
| DEC-108 | Launch gate | CLOSED BETA on ONE corridor with real riders before public launch. | Finds what simulation cannot: unfindable stops, confusing screens, drivers misreading the manifest. | CONFIRMED |
| DEC-109 | Team growth | PHASED HIRING: start with user + agent; hire specifically when a phase demands it. CH16 must define, per phase: scope, required skills, hiring trigger, and ready-to-hand-over work packages. | Honest about timeline; avoids paying for a team before the work exists. | CONFIRMED |
| DEC-110 | Phase shape | ONE CORRIDOR WORKING COMPLETELY, then widen. Everything needed for a single real route (signup → stops → booking → matching → QR boarding → payment → driver app → basic ops) before adding corridors and breadth. | Reaches real users soonest and proves the model; consistent with DEC-086 vertical slices. | CONFIRMED |
| DEC-111 | Hiring plan | OUT OF SCOPE. User: "do not talk about this part, when we need someone we will have it." CH16 will contain NO hiring plan and NO role recommendations. | User owns resourcing. | CONFIRMED |
| DEC-112 | Timeline estimates | OUT OF SCOPE. User: "we do not need this part." CH16 will contain NO calendar estimates and NO person-week figures. | User owns scheduling. | CONFIRMED |

### Consequence of DEC-111 + DEC-112
Risk R-1 / gap G-009 ("build everything before launch" vs team capacity) can no longer be resolved
by a hiring or timeline plan in this document. It is therefore RECLASSIFIED: it stops being an open
gap for the agent to solve, and becomes a standing risk owned by the user, recorded once in CH17.
The agent will not raise it again unless the user asks.

## Batch 24 — Post-audit decisions (2026-07-31, session 2)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-113 | Surge pricing (G-047) | NO AUTOMATIC SURGE. Prices never rise algorithmically with demand. A MANAGER may raise prices manually for a defined period from the dashboard. | Preserves the fixed-price promise (DEC-058) and the simple-ticket philosophy; still allows a human response to a genuine supply crisis. Surge is widely resented in this market. | CONFIRMED |
| DEC-114 | **ROUTE TICKET, not origin→destination booking** (G-048) — MAJOR MODEL CHANGE | User: "he can get in at any point from the route... he books the route not a fixed destination at all, he picks the route and he can get off the bus at any point." A rider books a **ROUTE**, boards at a point on it, and may alight at ANY point along that route. No fixed destination is committed at booking. | Matches how Egyptian microbuses actually work; radically simpler for the rider. AGENT WARNING: this contradicts or reshapes several existing decisions — full impact analysis below, and the consequences MUST be decided before the spec is consistent. | CONFIRMED (impact analysis OPEN) |

### DEC-114 IMPACT ANALYSIS — what this changes (agent analysis, requires user decisions)
This is the largest single model change since DEC-019. It affects:

1. **Pricing (DEC-058).** A fixed route price now means one price for the whole route regardless of
   how far you ride — OR a price per segment. UNDECIDED. This is the biggest open question.
2. **Capacity (INV-2).** If the drop-off is unknown, the system cannot know when a seat frees up.
   Either a seat is assumed occupied for the WHOLE remaining route (safe, wasteful) or the rider
   declares an intended alighting point that is non-binding (efficient, imprecise). UNDECIDED.
3. **Matching (CH5).** Constraint F3 (pickup precedes drop-off in the sequence) and the insertion
   cost function both assume a known drop-off. The algorithm must be re-specified for unknown
   destinations.
4. **The rider's stated intent (DEC-020).** The intent screen was "from / to / arrive by". With a
   route ticket, the rider picks a ROUTE, not a destination. The core rider flow changes.
5. **Data model (CH9).** `bookings.dropoff_journey_stop_id` becomes nullable; `ride_requests`
   may not carry a destination.
6. **Journey stops (DEC-041).** "Skip a stop if nobody is assigned" breaks: if drop-offs are not
   declared, the driver cannot know which stops to skip. Either riders signal to alight (like a bus
   bell) or every stop is served.
7. **Boarding/alighting proof (DEC-049).** QR scan at boarding still works; alighting has no scan,
   so completion becomes driver-marked or automatic at the route end.
8. **The promise rule (CH5 F6).** Promised arrival times cannot exist if destinations are unknown.
   The core fairness constraint of the algorithm loses its meaning.
9. **The street-pickup tier (DEC-063, CH6a).** A deviation to collect someone still works, but a
   deviation to DROP someone at their door cannot exist without a declared destination.

**Nothing in the specification should be rewritten for DEC-114 until points 1, 2 and 6 are decided.**
| DEC-115 | Route-ticket pricing (G-051 #1) | ONE FLAT PRICE FOR THE WHOLE ROUTE. "Smouha → University route = 15 EGP" whether the rider travels 2 stops or 12. | Exactly like a microbus; simplest possible mental model; ideal for subscriptions. Accepted cost: short-distance riders subsidise long-distance ones. | CONFIRMED |
| DEC-116 | Route-ticket capacity (G-051 #2) | A SEAT IS HELD FOR THE ENTIRE REMAINING ROUTE. Once boarded, the seat is that rider's until the end of the line; the system never resells it mid-route based on a guess. | Never oversells, never wrong. Accepted cost: seats freed early sit empty unless the rider signals (DEC-117). | CONFIRMED |
| DEC-117 | Alighting signal (G-051 #3) | BOTH: the rider may simply tell the driver, AND an in-app "I'm getting off" button exists. When the app button is used, the system learns the seat is free and may resell it for the remaining stops. Driver may also mark an alighting. | Works for everyone including riders not watching their phone; the app path recovers the capacity that DEC-116 would otherwise waste. | CONFIRMED |
| DEC-118 | Calendar handling (G-049) | Scheduled journeys and subscriptions are stored as LOCAL WALL-CLOCK TIME (e.g. "07:30 Africa/Cairo"), so DST changes never shift a rider's commute. Plus a RAMADAN MODE (managers shift timetables and expectations) and a HOLIDAY CALENDAR that auto-pauses subscriptions. | DST-safe by construction; both seasonal features matter enormously in the Egyptian market. | CONFIRMED |

### DEC-115..117 combined effect — the model is now coherent again
- Rider books a ROUTE at a flat price, boards at any point (QR scan), rides as far as they like.
- The seat is reserved to the end of the line, so capacity is never oversold.
- If the rider signals they are alighting (app button, or telling the driver who marks it), the seat
  is released for the remaining stops and can be resold — recovering utilisation safely.
- The driver knows where to stop from: declared boarding points + alighting signals.

### Remaining DEC-114 consequences now RESOLVED or REDUCED
| # | Area | Resolution |
|---|------|-----------|
| 1 | Pricing | DEC-115 flat route price |
| 2 | Capacity | DEC-116 hold to end of line, released by DEC-117 signal |
| 3 | Matching F3 (pickup precedes drop-off) | Now trivially satisfied: drop-off is effectively end-of-route unless signalled |
| 4 | Rider intent screen | Changes from "from → to" to "pick your route, board here". CH10 must be rewritten. OPEN |
| 5 | Data model | `dropoff_journey_stop_id` becomes NULLABLE; add `alight_signalled_at`, `actual_alight_stop_id`. CH9 must be updated. OPEN |
| 6 | Stop skipping (DEC-041) | Driver serves stops with declared boardings + signalled alightings; other stops skipped |
| 7 | Alighting proof (DEC-049) | No scan on alighting; completion is by signal, driver mark, or automatically at end of route |
| 8 | Promise rule F6 | **WEAKENED**: with no declared destination there is no promised arrival time to protect. F6 now protects only the ROUTE's overall schedule, not individual riders' arrival promises. Significant change to CH5. OPEN |
| 9 | Street-pickup tier | Boarding deviation still works; there is no drop-off deviation, since there is no declared destination |
| DEC-119 | Fairness rule replacing F6 (G-052) | **SCHEDULE ADHERENCE.** Every route has a published timetable. No pickup, deviation, wait or insertion may push the vehicle more than `MaxScheduleSlip` behind that timetable. Riders are protected collectively because they share one schedule. | With no declared destinations there are no individual arrival promises; protecting the timetable protects everyone on board. This is how real bus services work and it fits the route model naturally. | CONFIRMED |
| DEC-120 | Rider intent (replaces "From/To/Arrive by") | Rider **picks a ROUTE** from a list or map, then **picks a boarding point** on it. e.g. "Smouha → University" then "board at Green Square, 6 min walk". | Matches how people already think about microbus lines; no destination is committed. | CONFIRMED |
| DEC-121 | Fix order | Rewrite CH5, CH9 and CH10 for the route model FIRST, then produce the screen inventory. | Prevents documenting screens that no longer exist — the exact defect class found in audit #3. | CONFIRMED |

## Batch 25 — Design system & screen inventory (2026-07-31)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-122 | Screen inventory depth | FULL DETAIL per screen: purpose, every element, every action, all states (loading/empty/error/offline/RTL), governing decisions, and the API calls it makes. | Build-ready standard (DEC-010); a developer must not need to ask. | CONFIRMED |
| DEC-123 | Inventory order | Rider → Driver → Ops/Manager/Support. | Rider is the largest surface and defines the product's feel. | CONFIRMED |
| DEC-124 | Web vs mobile documentation | ONE screen spec with explicit notes where web and mobile differ. | Matches DEC-098 (identical structure, adaptive content); avoids two specs drifting apart — the defect class found in audits #3 and #4. | CONFIRMED |
| DEC-125 | Design system | Define the DESIGN SYSTEM FIRST, then the screens reference its components. | Shorter inventory, consistent build, one visual language across apps and dashboards. | CONFIRMED |
| DEC-126 | Standing instruction | Every audit conflict must be FIXED, and DISCUSSED with the user when a decision is needed. Consistency and suitability are continuous obligations, not end-of-project tasks. | User instruction, 2026-07-31. Reinforces rules §3 and project rule P5. | CONFIRMED |
| DEC-127 | Brand palette | PLACEHOLDER for now. The token system means any palette can be swapped by changing hex values in one place; no screen references a raw colour. | Branding not yet decided; costs nothing to defer because of the token architecture. | CONFIRMED (deferred) |
| DEC-128 | Product name | NOT YET CHOSEN. Agent to propose candidates that work in Egyptian Arabic and English. Until chosen, screens use a neutral placeholder. | Name appears in every screen, notification, receipt and email. | OPEN — naming MCQ |
| DEC-129 | Screen inventory delivery | ALL ROLES in one document (~80-100 screens), delivered in parts, rider first (DEC-123). | User wants completeness. | CONFIRMED |
| DEC-130 | Subscription guarantee failure (G-028) | FULL CREDIT for that day **PLUS** a compensation credit. The rider gets the day's value back and something extra for the broken promise. Amounts are configuration (Manager-set). | A guarantee that fails like a normal cancellation is not a guarantee. Clear and explainable. | CONFIRMED |
| DEC-131 | Screen spec format | NO layout diagrams and NO visual prescriptions. Each screen is a PLAIN LIST of everything that must be present: information, controls, interactions, states. Designers choose layout, hierarchy and styling. | User: "just list things that must be in each screen... leave them to choose the best layout and styles". Separates requirements (ours) from design (theirs). | CONFIRMED |

## Batch 26 — Supply model resolved (2026-07-31)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-132 | Supply model (G-054) | **MODEL M3: operator defines ROUTES and publishes a SLOT GRID; drivers CLAIM a slot (two taps). Drivers never draw routes, set prices, or predict demand.** Uncovered slots are filled by visibility, system suggestion, configurable incentive, and a commitment tier. Subscriptions may only be sold on slots with committed coverage. | R14 evidence (14 studies): fixed routes win on cost, schedule adherence and ridership at dense peak demand; demand-responsive is explicitly contra-indicated for "dense urban" and "peak-hour commuter corridors". Drivers want shift choice, not planning (R14.8). Keeps DEC-115 and DEC-119 intact. | CONFIRMED |
| DEC-133 | Per-km rate purpose (G-033) | The per-km rate is **NOT a rider-facing fallback**. It exists only as a MANAGER TOOL that SUGGESTS a fare when creating a new route ("this route is 6.2 km → suggested 15 EGP"). Riders are never charged per km. Precedence is therefore simply: **route flat fare, always** (DEC-115). | Under M3 every journey is on a defined route, so an unpriced pair cannot occur. Keeps fare consistency as the network grows. | CONFIRMED |
| DEC-134 | Walking rule (G-024) | **No walking rule.** Under M3 the rider chooses their own boarding point from the route's stops. The system simply lists every boarding point **sorted by walking time, with honest distances**, and marks one as recommended. No ceiling (DEC-064), no weighted formula. | Consistent with DEC-064/065; M3 removed the need for the system to choose for the rider. | CONFIRMED |
| DEC-135 | Multi-leg journeys (G-015) | **SUGGEST multi-leg normally**, treated exactly like any single-leg booking. User's reasoning: "it is the same risk as single leg, so if not succeed just refund for the failed leg." No special warnings, no fallback ride, no daylight/hub restrictions. Each leg is an independent booking (DEC-025); a failed leg is refunded like any other failure. | Consistency: a single-leg journey can also fail and strand someone at their origin. Treating multi-leg as uniquely dangerous would be inconsistent. | CONFIRMED |
| DEC-136 | QR fallback (G-026) | **The numeric code IS the fallback**, always displayed alongside the QR. Covers: camera failure, darkness, cracked screen, and screen-reader users (accessibility). No SMS codes, no separate mechanism. Driver manual confirm from the manifest remains available as a rate-limited, audited override (CH12 §12.4). | Simple and complete; one mechanism covers every realistic failure. | CONFIRMED |
| DEC-137 | Data collection scope (G-027) | **EVERYTHING**: every state change, every GPS sample, every offer shown and declined, every price quoted, every notification sent, and in-app behaviour (screens, taps, time on screen). Retained indefinitely (DEC-094), cost controlled by cold-storage tiering, not by collecting less. | User: "everything". Maximum analytical and dispute-resolution value. Security/privacy mitigations already mandated in CH13 §13.2 and CH12 §12.7. | CONFIRMED |
| DEC-138 | Driver report threshold (G-044) | **Report rate ≥ 10% of completed rides, with a minimum of 20 completed rides, over a rolling window of the last 100 rides → raises a HUMAN REVIEW alert to Ops.** Plus: severe categories trigger immediate precautionary suspension regardless of percentage; 3+ reports in the same category within 30 days trigger review even below 10%. **No automatic deactivation ever** — a human decides, states a reason, and the driver may appeal. All values configuration. | R15: the user's 10% instinct matches the industry's effective tolerance (Uber deactivates near a 4.6/5 average, which corresponds to roughly 8-12% poor ratings). R15.3 adds the minimum-volume and rolling-window guards; R15.5 requires human review and appeal (30% of drivers reportedly faced deactivation threats with no recourse). | CONFIRMED |
| DEC-139 | Journey sharing mechanism (G-034) | A **shareable link** carrying the journey id and the sharer's code (WhatsApp-ready, viewable without installing). Whoever books through it credits the sharer once their ride COMPLETES (never at signup — CH12 §12.3.3). | Links spread through WhatsApp groups, which is how things actually spread in Egypt; no contacts permission needed. | CONFIRMED |
| DEC-140 | Boarding-point availability + alighting freedom (G-035) | Unavailable boarding points are shown **greyed out with a plain reason** ("not served by this departure", "too late to reach"), never selectable-then-failing. **Boarding is only at fixed stops; ALIGHTING is free — the rider may get off at any point along the route** (reaffirms DEC-114/117). | Rider sees the whole route honestly. Asymmetry is deliberate: boarding must be predictable for the driver and the manifest; alighting does not need to be. | CONFIRMED |
| DEC-141 | Behavioural bets (G-031, G-025) | KEEP both as decided (strict cancellation, sell every seat) but **INSTRUMENT them from day one** and review after the closed beta (DEC-108). Required metrics: cancellation rate; churn/uninstall after a cancellation charge; seat-comfort complaint rate; ratings segmented by vehicle size and by seat position. | Decide with real Alexandria data, not prediction. | CONFIRMED |
| DEC-142 | Operational failures (G-039) | BOTH: the software behaviour stays in CH12 §12.6, AND a **detailed OPERATIONS RUNBOOK is written into the master document** — who does what, in what order, within what time, for each failure mode. | User: "both, and write the operation runbook detailed in the master doc". | CONFIRMED |
| DEC-143 | Open-source vetting (G-010) | Vet each component **at the moment of adoption**, not in advance. Licence, maintenance activity, security posture and production maturity are checked and recorded in the implementation log when the component is first used. | Avoids vetting components that may never be adopted; keeps the record tied to a real decision. | CONFIRMED |

## Batch 27 — Configuration & notifications (2026-07-31)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-144 | Config catalogue structure | THREE categories: **Business parameters** (permanent, Manager-editable) · **Feature toggles** (temporary, owned, with an expiry date, treated as technical debt) · **System tuning** (technical, Super-Admin only). | R17.1: merging flags with permanent parameters causes flags to silently become permanent system state. | CONFIRMED |
| DEC-145 | Config risk tiers | THREE tiers by blast radius, reversibility and hidden coupling: **LOW** (Manager, instant) · **MEDIUM** (Manager, preview required) · **HIGH** (Super Admin, mandatory reason AND a stated rollback trigger before it goes live). Every key also declares its **missing-value behaviour**. | R17.3/R17.4: most incidents happen during fallback, not during the change; ceremony should scale with risk. | CONFIRMED |
| DEC-146 | Notification caps | Adopt the researched caps: **transactional unlimited** (never suppressed by other caps) · **behavioural max 2/day with a 4-hour gap** · **promotional max 1/day and 5/week** · **global non-transactional max 3 per 24h**. All stored as configuration. Only transactional messages are retried. | R18.1/R18.2/R18.4. | CONFIRMED |
| DEC-147 | SMS fallback | **PUSH ONLY. No SMS fallback except OTP.** | User's choice, cost-driven. AGENT CAUTION RETAINED: R18.3 states push is connectivity-dependent and "may struggle to reach mobile phones" in poor-signal environments — which describes parts of Alexandria. Consequence: a rider may never learn their vehicle arrived. Mitigations that are now MANDATORY because there is no SMS safety net: (a) the in-app alarm (DEC-053) must work from cached schedule data without a live push, (b) the waiting screen must show the scheduled time from cache when offline (already CH10 R-20), (c) push-delivery failure rate must be instrumented and reviewed. Logged as G-055. | CONFIRMED (caution logged) |

## Batch 28 — Build-blocking business rules (2026-08-01)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-148 | Cancellation forfeit timing (A5) | FLAT 50% at any time after purchase, rising to **100% after the departure LOCKS**. Two steps only. | Keeps DEC-055 simple and adds the one step that is economically real: after lock the seat cannot be resold. | CONFIRMED |
| DEC-149 | Driver cancellation penalty (A2) | A driver who releases a claimed departure **after bookings exist** loses a fee equal to the platform's commission on the lost bookings. Riders receive **100% credit plus a small compensation credit** (symmetric with DEC-130). | The penalty scales with harm done; the rider is made whole plus something for the trouble. | CONFIRMED |
| DEC-150 | Rider no-show (A3) | A no-show rider is charged **100%** — they consumed the seat, which could not be resold. | Consistent with DEC-148's post-lock rule. | CONFIRMED |
| DEC-151 | Staff 2FA (A6) | **MANDATORY for all staff roles** (Support, Ops Admin, Manager, Super Admin). | Staff can move money and access personal data. Closes Q2.1. | CONFIRMED |
| DEC-152 | Support channel (A7) | **In-app chat + phone.** Chat scales and keeps a written record attached to the booking; phone covers urgent and low-literacy cases. Not WhatsApp (conversations would live outside the system, weakening the audit trail). | Closes F-40; unblocks screens R-70 and S-10..S-13. | CONFIRMED |
| DEC-153 | Wallet balance storage (A8) | `wallets.balance_minor` is a **materialised projection** of the ledger, reconciled nightly. The **ledger remains the sole source of truth** (CH6 §6.1). | Fast reads without weakening the ledger guarantee. | CONFIRMED |
| DEC-154 | Unused subscription days (A4) | **EXPIRE.** Rides not taken within the subscription period are lost, like a gym membership. No rollover, no credit conversion. | Simplest accounting and forecasting. AGENT NOTE: this is the least generous option; pair it with clear pre-purchase wording and the skip/pause controls (CH3 §3.10.3) so riders can protect value in advance. Monitor complaints. | CONFIRMED |
| DEC-155 | Support refund limit (A1) | **One ride fare per incident, maximum 3 per agent per day.** Anything larger, or a fourth case in a day, escalates to Ops. | Agent can fix a rider's day instantly; caps exposure to any single agent (insider-fraud control, CH2 §2.4.1). | CONFIRMED |

## Batch 29 — Final pre-launch rules (2026-08-01)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-156 | Suspension durations (B1) | Escalating: **warning → 7 days → 30 days → permanent**. Severe categories jump straight to precautionary suspension pending investigation (CH12 §12.2). | Predictable and defensible; a driver can see where they stand. | CONFIRMED |
| DEC-157 | Driver face-match on duty (B4) | **NO periodic face-match.** Verification happens once, at onboarding (DEC-035). | User's choice: less driver friction, no extra build. AGENT CAUTION RETAINED: this accepts the risk of ACCOUNT SHARING — an unverified person driving on an approved account, which is the most serious safety failure the platform can have. Compensating controls now carry that weight: strict onboarding (DEC-035), the incident flow (DEC-138), and GPS/behaviour anomaly detection (CH12 §12.3.1). Logged as G-056 to monitor. | CONFIRMED (caution logged) |
| DEC-158 | Rider blocking (B5) | **YES — one-way and silent.** A rider may block a driver; they are never matched with them again. The driver is never told. | Gives riders a remedy for a bad-but-not-reportable experience instead of silently churning. One-way and silent avoids retaliation. | CONFIRMED |
| DEC-159 | Street pickup at peak (B6) | Manager may **disable street pickup per route during defined peak windows** (configuration). **No subscriber discount** on street pickup — pricing stays simple. | Protects journey times when vehicles are full; keeps one price per ticket type. | CONFIRMED |
| DEC-160 | Explaining unavailability (B7) | **Show the reason** when street pickup or a boarding point is unavailable ("too far off our route today", "not served by this departure"). Never a silently missing option. | Consistent with DEC-076 and DEC-140; honesty beats a vanishing control. | CONFIRMED |
| DEC-161 | SLAs and alert thresholds (B2, B3) | **DEFERRED to after the closed beta.** No values are invented now. The system must support them as configuration from day one, and the beta must produce the data that sets them. | User's choice: you cannot set a realistic SLA before you know your volumes. AGENT NOTE: the fields exist and are empty; CH18 §18.13 duties still apply without numeric targets. | CONFIRMED |

## Batch 30 — Final technical decisions (2026-08-01)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-162 | Manager analytics visibility | Managers see **pseudonymised** riders in analytics. Re-identification is a separate, audited, Super-Admin-only action (CH13 §13.2). | Managers need patterns, not identities. | CONFIRMED |
| DEC-163 | OSRM deployment | **One OSRM instance per city.** Each city's graph stays small, fast, and independently updatable. | Matches "a new city is configuration" (DEC-002); avoids rebuilding every city's graph together. | CONFIRMED |
| DEC-164 | Backup policy | **Nightly backups, retained 30 days, restore drill monthly** (documented, per CH15 §15.2). | Standard cadence; a drill that is never performed is not a backup. | CONFIRMED |
| DEC-165 | Alarm escalation | Default **15 min before → 5 min before → strong alarm on arrival**. **The rider can change the first reminder** (e.g. to 30 minutes) in their notification preferences. | Default suits most; user control handles longer walks and personal habits. | CONFIRMED |
| DEC-166 | Configuration editing UI | **Guided forms per rule type**, not raw value entry. The field itself enforces the type, unit and range from CH19 — a manager cannot type 5000% into a discount field. | Prevents the class of error that risk tiers alone cannot catch. | CONFIRMED |
| DEC-167 | First module extraction | **`matching`** is the documented first candidate for extraction from the monolith, if load ever demands it. Documented as intent only — not built now. | CPU-heaviest, and it already has a natural queue boundary (CH5 §5.5). Stating the intent keeps the seam clean. | CONFIRMED |

## Batch 31 — UI reference and palette (2026-08-02)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-168 | UI reference artefact | The user's "Daily Plan" HTML demo is adopted as the **visual and architectural BENCHMARK** for this product, stored at `_working_docs/reference/UI_REFERENCE_daily-plan-app.html`. It is a reference brief for designers and web developers, **not** code to be copied wholesale. | It independently demonstrates three patterns this specification already requires: a single token layer, one nav component that adapts by CSS alone, and component-as-pure-function structure. | CONFIRMED |
| DEC-169 | Brand palette (supersedes DEC-127) | The reference file's approach is ADOPTED and adapted: keep the calm neutral base, near-black text, soft layered shadows and generous radii; **replace the pastel accent cards** with a palette that survives direct sunlight on a low-end screen and works in mandatory dark mode. | DEC-127 deliberately deferred the palette; the reference supplies a coherent starting point that matches the product's restrained tone. | CONFIRMED |

## Batch 32 — Build plan foundations (2026-08-02)

| ID | Question | DECISION | Rationale | Status |
|----|----------|----------|-----------|--------|
| DEC-170 | Database layer | **NO ORM.** Hand-written SQL with a thin typed query layer, and `node-pg-migrate` for migrations. | Total control over PostGIS; no abstraction leaking at exactly the point the logic is hardest; no pre-1.0 dependency churn. AGENT NOTE: the cost is that database↔TypeScript type safety must be built deliberately — see the mitigation below, which is now a required part of the plan. | CONFIRMED |
| DEC-171 | Plan structure | Grouped into the **8 CH16 phases**, numbered points within each (P0.1, P0.2, P1.1 …). Each point self-contained. | Preserves traceability to the specification and to DEC-086 vertical slices. | CONFIRMED |
| DEC-172 | Plan detail level | **Full detail per point:** what, why, files touched, commands, how to test, **how to BREAK the test** (§0.2), definition of done, and the DEC/chapter it implements. | User asked for tight; §0.2 requires the break-step to be planned, not remembered. | CONFIRMED |

### DEC-170 mandatory mitigations (no ORM means these are not optional)
Because there is no ORM generating types, the plan must include, as first-class work:
1. **A single generated type source.** Types are derived FROM the database schema (e.g. `pg-to-ts`
   or an equivalent introspection step run in CI), never hand-maintained in parallel — otherwise the
   schema and the types drift and §0.3 is violated.
2. **One query layer, not scattered SQL.** Every table has exactly one repository module; SQL lives
   only there. An automated check forbids SQL strings outside `infra/` directories.
3. **Parameterised queries only.** An automated check forbids string-concatenated SQL. This is the
   injection defence (§10.3) and it must be a script, not a habit.
4. **A migration is the only way the schema changes.** No manual `psql` alterations in any
   environment; drift detection runs in CI.
| DEC-173 | OSRM placement | OSRM must be **deployable to Railway AND to the VPS, from the same image**, with no code change and no configuration change beyond the service URL. Placement is an operational choice made per environment, not a design constraint. | User: "it should be able to run on railway and also in the vps". Consistent with DEC-105 (region as configuration) and the portability requirement. Enforced by P0.13's portability audit and by the routing provider staying behind an interface (CH5 §5.9). | CONFIRMED |
| DEC-174 | Map provider (supersedes the OSRM-first assumption for the GUI stage) | Use a **commercial map provider (Google Maps class)** for the map surface. Self-hosted OSRM is NOT abandoned — it remains behind the `MapProvider` interface (R5-IMPLICATION) for matrices and routing at volume — but the visible map and geocoding use a commercial provider. | User: "for maps I want to use something like google maps". Removes the OSM-quality risk from the launch path; the cost trade-off (R5.1: ~$510/day vs ~$20/month at matrix volume) is accepted for now and revisited when volume justifies it. | CONFIRMED |
| DEC-175 | Immediate priority change | **Pause plan-writing. Build the full GUI as a single HTML file first**, for the user to run, inspect and edit. Implementation follows GUI approval. | User: "skip the little things for now and move directly to the implementation... create me the full app in html so I can test it see the gui or edit it... then after approval for the gui we move directly to complete the implementation". | CONFIRMED |
| DEC-176 | Mobile application technology | Android APK built with **Capacitor** wrapping the web app, not React Native. Supersedes the mobile clause of DEC-085. | One UI codebase. The product is lists, forms, a map and a scanner; native widgets buy nothing users can identify and cost every screen twice. Reversible for the driver app only, at the P7.4 background-location gate. | CONFIRMED |
| DEC-177 | Repository model | **One private monorepo**; public repository only if and when the owner chooses. | Nothing leaks while the product is unbuilt. Working docs excluded from any future public push per GitHub Upload Law §1.2. | CONFIRMED |
| DEC-178 | Rider top bar content | Profile identity and wallet balance are **pinned in the top bar** on rider root screens. | User request. Balance drives the decision to book; it should not require scrolling. Both halves are controls (profile, wallet), not decoration. | CONFIRMED |
