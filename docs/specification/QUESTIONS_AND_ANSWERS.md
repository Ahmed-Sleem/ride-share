# QUESTIONS & ANSWERS — COMPLETE RECORD

**Every question asked, and the answer given.** 167 decisions, in order.
Companion to `MASTER_SPECIFICATION.md`. Generated 2026-08-01.

## How to use this file
- **Looking for why something is the way it is?** Find the decision ID (DEC-nnn) and read the reason.
- **Answers in quotation marks are the user's own words**, preserved verbatim.
- **Status** tells you if a decision was later superseded, deferred, or carries a recorded caution.
- Cross-references (DEC-nnn, G-nnn, R-nn) point to other decisions, tracked items, and research.

## Index

- 1. Product Foundation
- 2. Strategy, Team & Platform
- 3. Domain Model
- 4. Roles, Accounts & Vehicles
- 5. Boarding, Waiting & Launch Coverage
- 6. Pricing & Tickets
- 7. Engineering Discipline & Matching
- 8. Money, Payments & Codebase
- 9. Data, Safety & Fraud
- 10. UX Foundations & Growth
- 11. Infrastructure, Testing & Delivery
- 12. The Route-Ticket Model
- 13. Design System & Screens
- 14. Supply Model (M3) & Final Gaps
- 15. Configuration & Notifications
- 16. Business Rules (money & support)
- 17. Final Pre-Launch Decisions

---


# 1. Product Foundation

### DEC-001 — What kind of shared-ride product?

**Answer:** "hybrid between these": A (commercial pooled taxi) + B (commuter carpooling) + C (managed shuttle/vanpool). ALL THREE.

**Why:** User wants one platform covering the full spectrum of shared mobility.

**Status:** CONFIRMED

### DEC-002 — Which market first?

**Answer:** "we will start in alexandria egypt then cairo" AND must also be market-agnostic "to be easy for scaling".

**Why:** Local launch, global architecture.

**Status:** CONFIRMED

### DEC-003 — Who puts cars into the system?

**Answer:** Option C — BOTH: self-service registration into an approval queue AND direct admin creation, one registry.

**Why:** Resolves the conflict in the original idea.

**Status:** CONFIRMED

### DEC-004 — How do passengers and cars meet?

**Answer:** "all and smart system decide": fixed stops (skip stop if nobody assigned), on-route pickup at higher price, door-to-door at highest price.

**Why:** Tiered, system-optimised, monetised comfort.

**Status:** CONFIRMED


# 2. Strategy, Team & Platform

### DEC-005 — Which mode launches first?

**Answer:** "start first by marketing in universities and calling companies that owns vehicles for the start but the design must be ready and suitable for all".

**Why:** Universities = dense, predictable, closed-community demand. Fleet-owning companies = instant supply.

**Status:** CONFIRMED

### DEC-006 — MVP or full product?

**Answer:** "i dont want mvp i want the full thing". Later refined: "we need to build everything before launching".

**Why:** User wants a complete, finished product at launch.

**Status:** CONFIRMED

### DEC-007 — Who builds it?

**Answer:** "we are the only developers" + "i can create you a team when needed but you are the head, give them the files and tasks and they will do them".

**Why:** Agent acts as technical lead producing task-decomposed work packages executable by hired developers.

**Status:** CONFIRMED

### DEC-008 — Reuse open source?

**Answer:** "we can use any open source existings we can search github and adapt things if there is anything can help us".

**Why:** OSS-first, with mandatory vetting per rules section 16.

**Status:** CONFIRMED

### DEC-009 — Where does processing happen?

**Answer:** Delegated to agent: "what is the best practice, what is the outputs of the research". AGENT ANSWER: HYBRID, server-authoritative (see 02_ARCHITECTURE_ANALYSIS.md A1).

**Why:** Matching needs global view + batching; money/safety must be server-side; device handles display, GPS filtering, offline outbox.

**Status:** CONFIRMED (agent-decided by delegation)

### DEC-010 — Depth of the final document?

**Answer:** "build ready thing, with every decision and details everything" + separate file recording all user decisions.

**Why:** This file (DECISIONS_REGISTER.md) is that separate file.

**Status:** CONFIRMED

### DEC-011 — Technology stack?

**Answer:** Delegated to agent: "choose the most suitable the best thing... the more it dynamic and cross platform". AGENT ANSWER: see DEC-012 below.

**Why:** User prioritises best practice, dynamism, cross-platform reach.

**Status:** CONFIRMED (delegated)

### DEC-012 — Technology stack

**Answer:** APPROVED (option A). TypeScript everywhere + Python OR-Tools service.

**Why:** See 02_ARCHITECTURE_ANALYSIS.md A4.

**Status:** CONFIRMED

### DEC-013 — Team model

**Answer:** Agent produces per-role work packages (spec + acceptance criteria + tests) that hired developers execute; agent reviews. Requires a contributor handbook in the final document.

**Why:** DEC-007.

**Status:** PROPOSED

### DEC-014 — How many apps?

**Answer:** "i want one thing that directly detect the account and open the suitable ui, and the website also the same thing". ONE unified product that adapts its UI to the logged-in role.

**Why:** Single brand, single download, single codebase; role detected at login.

**Status:** CONFIRMED

### DEC-015 — Delivery order of platforms

**Answer:** "we will start by website, then convert into app". WEB FIRST, then mobile app.

**Why:** Faster iteration, no store review, immediate demos to universities/companies.

**Status:** CONFIRMED

### DEC-016 — Web responsiveness

**Answer:** Website must work on mobile, tablet and PC (true responsive, cross-platform).

**Why:** Web is the launch surface, so it must serve drivers on phones too.

**Status:** CONFIRMED

### DEC-017 — Localization

**Answer:** Option C — full i18n framework, launching with Arabic + English, full RTL, new language = translation file only.

**Why:** Supports market-agnostic scaling (DEC-002).

**Status:** CONFIRMED

### DEC-018 — Chapter sequencing

**Answer:** "move in the right logical arrangement bec things depend on each other, find the points we need to do and arrange them first then move one by one". Agent must produce a dependency-ordered chapter plan first.

**Why:** Prevents rework from deciding things out of order.

**Status:** CONFIRMED


# 3. Domain Model

### DEC-019 — One model or three?

**Answer:** CONFIRMED option A: ONE universal internal model with policy settings.

**Why:** GTFS-Flex precedent; 1x build cost; shared wallet/history/rating; future GTFS export.

**Status:** CONFIRMED

### DEC-020 — Who creates a journey?

**Answer:** User: "both... the app can suggest the most suitable from existing ones but if the user insists to create new one he can do it... but I want very very very easy to use". AGENT ANSWER: separate INTENT from MECHANISM. Riders only state intent; the system joins an existing Journey or creates a new one invisibly. "Publish a journey" is a driver/admin-only screen.

**Why:** Delivers both capabilities with a one-screen rider experience.

**Status:** PROPOSED — awaiting confirmation

### DEC-021 — Ban the word "Trip"?

**Answer:** CONFIRMED: banned. Use Journey / Booking / RideRequest.

**Why:** Removes a whole class of ambiguity bugs for hired developers.

**Status:** CONFIRMED

### DEC-022 — Process rule

**Answer:** User: "give me things in the MCQ so I can approve them, I don't know what I'm approving" + "things I don't close... do not close things yourself, all must be closed and discussed through the MCQ".

**Why:** Added as binding project rule P5 in AGENT_RULES.md.

**Status:** CONFIRMED

### DEC-023 — Q1.1 Transfers between vehicles

**Answer:** User chose B: YES, support transfers from the start.

**Why:** User wants full capability. AGENT CAUTION: this is the hardest failure mode in shared transport (stranded passenger). Mitigation options must be decided before this is final.

**Status:** CONFIRMED (mitigation OPEN)

### DEC-024 — Booking for others?

**Answer:** CONFIRMED strict: every rider books for themselves ONLY. No org booking, no family booking.

**Why:** User re-confirmed after being shown the cost. Every person in every vehicle is a verified account.

**Status:** CONFIRMED

### DEC-025 — Transfer failure handling

**Answer:** User: "best effort and each one consider separated journey if one succeed the second fail only refund the failed". Transfers are NOT a guaranteed product feature — each leg is an INDEPENDENT Booking, refunded independently.

**Why:** Radically simplifies the model: there is no "transfer" object at all.

**Status:** CONFIRMED


# 4. Roles, Accounts & Vehicles

### DEC-026 — Account types

**Answer:** Option B: FOUR roles — Rider, Driver, Organization Manager, Admin.

**Why:** User chose the simpler set. AGENT CAUTION: no separate Support role means every support employee has full admin power over money and user data. Re-raise before build.

**Status:** CONFIRMED (caution logged G-016)

### DEC-027 — One account, many roles?

**Answer:** Option A: YES. One login can be Rider and Driver simultaneously, with an in-app switch.

**Why:** Essential for carpool supply growth (DEC-003 self-registration).

**Status:** CONFIRMED

### DEC-028 — Identity / login

**Answer:** Phone number + SMS OTP is MANDATORY and is the identity of record. Users may ADDITIONALLY set a passcode/password and add an email to the account.

**Why:** Phone is universal in Egypt; passcode avoids paying for an SMS on every login; email is optional convenience/recovery.

**Status:** CONFIRMED

### DEC-029 — **ORGANIZATION-AGNOSTIC PRODUCT** (major)

**Answer:** User: "it should be organization agnostic, we just ride like uber, the idea of targeting universities or companies is just marketing thing, but you just book and ride you do not know what company or what thing you ride as user normal user". Journeys MAY serve multiple organizations; riders never see organizational boundaries.

**Why:** The product is a PUBLIC open network. Universities/companies are DEMAND ACQUISITION CHANNELS and SUPPLY SOURCES, not walled gardens.

**Status:** CONFIRMED

### DEC-030 — Legal strategy

**Answer:** User: "we do not need to talk about anything legal, there is a legal team who will manage that". LEGAL IS OUT OF SCOPE for this document.

**Why:** The agent will not design legal structure. Agent obligation retained: where a technical choice has a legal dependency, it is FLAGGED once in the risk chapter and handed to the legal team — never silently assumed.

**Status:** CONFIRMED

### DEC-031 — Organizations

**Answer:** User: "no organizations at all in our app, at all". The Organization entity is REMOVED ENTIRELY from the product. No Organization Manager role, no org accounts, no org billing, no org subsidies.

**Why:** Maximum simplicity. Universities and companies remain purely OFFLINE marketing/sales channels; they have no representation in the software.

**Status:** CONFIRMED

### DEC-032 — Support role

**Answer:** Option A: ADD a Support Agent role with limited powers (view active journeys, contact users, cancel a ride, refund up to a limit, escalate) and explicit prohibitions (no fare edits, no wallet edits, no account deletion, no data export, no vehicle approval).

**Why:** Prevents the most common insider-fraud pattern.

**Status:** CONFIRMED

### DEC-033 — Fleet mechanism (G-018)

**Answer:** User chose A + B + C together: (A) fleet drivers can self-register as normal Driver accounts; (B) admins can enter vehicles and link drivers; (C) vehicles carry an optional lightweight FLEET LABEL so admins can view/manage them as a group. NO organization account, NO org login, NO org billing, invisible to riders.

**Why:** Covers every real-world path while keeping DEC-031 (no organizations) intact.

**Status:** CONFIRMED

### DEC-034 — Who can add a vehicle

**Answer:** Confirmed DEC-003 survives: BOTH self-service driver registration (into an approval queue) AND direct admin creation, into ONE vehicle registry.

**Why:** Preserves the "call companies with vehicles" sales channel.

**Status:** CONFIRMED

### DEC-035 — Driver verification

**Answer:** STRICT and manual: national ID + driving licence + vehicle licence + photo + verified mobile phone, all reviewed by a human admin BEFORE the driver may accept any ride.

**Why:** Safety incidents are existential; riders are getting into a stranger's car.

**Status:** CONFIRMED

### DEC-036 — Driving a car you don't own

**Answer:** Option A: a driver may ONLY drive a vehicle registered in their own name (vehicle licence name must match national ID).

**Why:** Simplest, safest, no consent-document handling. AGENT CONFLICT WARNING: this contradicts DEC-033/DEC-034 (company with 20 vans) — a company-owned van is by definition not in the driver's name. See G-019.

**Status:** CONFIRMED (conflict OPEN)

### DEC-037 — Parcels / goods

**Answer:** Option A: NO. People only. Parcels are not part of this product.

**Why:** Keeps scope focused; avoids insurance/liability/chain-of-custody complexity. Recorded as a possible future product, not designed for.

**Status:** CONFIRMED

### DEC-038 — Where meeting points come from

**Answer:** Option A: ADMIN-CURATED ONLY. Every meeting point is created and verified by an admin (lit? can a car stop? near a landmark? safe at night?). No auto-generation, no crowd-sourcing in v1.

**Why:** Stop quality directly determines rider trust. AGENT NOTE: this makes city mapping a launch prerequisite — see G-020.

**Status:** CONFIRMED (workload OPEN)

### DEC-039 — G-019 resolution — vehicle ownership

**Answer:** SUPERSEDES DEC-036. User: "like Uber... the system needs only the account of the driver and does not need the deeper details. If the driver changes the car at some point it is normal, if all the details are accepted and legal — the system does not care." DECISION: the DRIVER is the accountable entity; the VEHICLE is an attribute the driver declares and an admin approves. Ownership matching is NOT enforced by the system. A driver may have multiple approved vehicles and switch between them.

**Why:** Matches how Uber/Careem actually work; unblocks fleet vans and family cars; legality of the paperwork is the legal team's domain (DEC-030), not the software's.

**Status:** CONFIRMED

### DEC-040 — Pre-launch mapping

**Answer:** A dedicated MAPPING TEAM will map all of Alexandria before launch, using purpose-built internal tools. Stops may be updated continuously after the initial mapping.

**Why:** User will resource this. Creates a hard product requirement: an internal Stop Mapping Tool is part of the build (not optional tooling).

**Status:** CONFIRMED

### DEC-041 — Stops served per journey

**Answer:** "each car journey not necessarily stops at each point, it picks some only" — a Journey serves only the subset of stops where someone is actually boarding/alighting. Confirms and generalises DEC-004's skip-empty-stop rule.

**Why:** Core efficiency mechanism.

**Status:** CONFIRMED

### DEC-042 — Stop data richness

**Answer:** Option B: MINIMAL — name + coordinates only.

**Why:** User prioritises mapping speed. AGENT CAUTION: with no night-safety or accessibility attributes, the system cannot make "smart" stop choices (avoid unlit stops at night, suitable stops for elderly/disabled riders), and DEC-004's auto-upgrade-for-accessibility idea becomes unimplementable. Re-survey later would be expensive. Logged as G-021 for review.

**Status:** CONFIRMED (caution logged)

### DEC-043 — Stop data (supersedes DEC-042)

**Answer:** MANDATORY: name + map location ONLY. OPTIONAL and encouraged: night-safe flag, accessible flag, MULTIPLE photos, description, and further attributes.

**Why:** Mapping stays fast (nothing blocks a mapper), while richer data can be added whenever available. Resolves G-021 without slowing the survey.

**Status:** CONFIRMED

### DEC-044 — Walking distance

**Answer:** DYNAMIC, not a fixed radius. For a stops-only journey the rider is offered the CLOSEST suitable stop to them. Walking limits adapt rather than being one global number.

**Why:** Rider comfort first; avoids an arbitrary city-wide constant. Full parameter design deferred to CH4/CH5.

**Status:** CONFIRMED (details OPEN)

### DEC-045 — **NEW ROLE: Manager** (business/operations)

**Answer:** User: "we need the dashboard with managers and so on (not admins) to be able to change rates and money, and to create flash sales... to see numbers, like if we now see a lot of buses with a lot of empty slots, we can launch a flash sale... and send notifications. The admins will answer people and make sure the operations is running seamless." A MANAGER role is added, distinct from Admin.

**Why:** Separates COMMERCIAL control (pricing, promotions, campaigns, analytics) from OPERATIONAL control (support, incidents, approvals).

**Status:** CONFIRMED


# 5. Boarding, Waiting & Launch Coverage

### DEC-046 — Final role list

**Answer:** SIX roles CONFIRMED: Rider, Driver, Support Agent, Operations Admin, Manager, Super Admin.

**Why:** Separates commercial power (Manager) from operational power (Ops Admin) from platform power (Super Admin). Supersedes DEC-026 and the Batch-8 four-role list.

**Status:** CONFIRMED

### DEC-047 — Seats sold per vehicle

**Answer:** Option B: SELL EVERY PHYSICAL SEAT. A vehicle's sellable capacity equals its physical passenger capacity.

**Why:** Maximum revenue per vehicle, lowest price per rider. AGENT CAUTION: 3 adults across the back of a small sedan in Alexandria summer is a known churn driver; comfort complaints and low ratings are the expected cost. Logged as G-025 with cheap mitigations to consider later (vehicle class tiers, or a per-vehicle override).

**Status:** CONFIRMED (caution logged)

### DEC-048 — Work sequencing

**Answer:** Delegated to agent: "you decide the best way". AGENT DECISION: continue in strict dependency order (CH3 next), but front-load any question whose answer would change an earlier chapter. Rationale: option C (deciding all 25 F-items now) would ask questions out of context and produce worse answers; option B (Manager dashboard first) depends on pricing, which depends on the trip lifecycle.

**Why:** Dependency order protects against rework.

**Status:** CONFIRMED (delegated)

### DEC-049 — Boarding proof

**Answer:** QR CODES are the primary validation mechanism EVERYWHERE possible. GPS runs in the background as a supporting signal, never as the main proof.

**Why:** User: "depend fully on QR codes in all the validations possible, the GPS must work in the background but not the main thing". AGENT NOTE: night/low-light, cracked screens, dead phones and no-signal cases need a documented fallback — see G-026.

**Status:** CONFIRMED (fallback OPEN)

### DEC-050 — Data collection

**Answer:** "the app must collect all the data and store them" — comprehensive event/telemetry capture is an explicit product requirement, not a by-product.

**Why:** Enables analytics (DEC-045 Manager dashboards), disputes, algorithm improvement, and any future regulatory export. AGENT NOTE: "collect everything" has privacy, storage-cost and consent consequences; scope must be defined — see G-027.

**Status:** CONFIRMED (scope OPEN)

### DEC-051 — Recurring commutes

**Answer:** Option C: SUBSCRIPTION. Riders buy a weekly/monthly commute with guaranteed seats.

**Why:** Best retention and predictable revenue; matches the model that made Swvl profitable (R2.3). AGENT NOTE: guaranteed seats require guaranteed supply — the platform now carries an obligation it must be able to honour. See G-028.

**Status:** CONFIRMED (supply risk OPEN)

### DEC-052 — Wait time at a stop

**Answer:** DEFAULT 10 MINUTES. The driver may choose to wait longer at their discretion.

**Why:** User's choice. AGENT CAUTION: 10 min is very long for pooling — it delays every rider on board and every downstream stop. Mitigation options logged in G-029.

**Status:** CONFIRMED (caution logged)

### DEC-053 — Boarding UX requirements

**Answer:** Explicit UX demands: rider's phone ALARMS when the vehicle reaches the stop; driver's app scans QR codes and shows WHO IS MISSING, with one-tap contact.

**Why:** Raises boarding from a transaction to a designed experience. Becomes a hard requirement in CH10.

**Status:** CONFIRMED

### DEC-054 — Money model

**Answer:** User: "I think we need to search and think more to create the full picture of how money works". Initial instinct recorded: strict — cancelling a bought ticket loses ~50%; a driver who accepts then cancels also loses fees. NOT FINAL.

**Why:** Money design deferred to a dedicated deep-research pass in CH6.

**Status:** DEFERRED — CH6

### DEC-055 — Cancellation policy

**Answer:** STRICT, with mandatory informed consent BEFORE purchase. The UI must explicitly warn ("this ticket cannot be cancelled without losing ~50%") and require the user to confirm. Refunds are ALWAYS issued as WALLET CREDIT, never back to the card.

**Why:** User: "the UI asks the user if he wants to confirm and tells him no cancellation, then use the strictest thing, and the refund always as credit". Informed consent softens the harshness; wallet credit keeps money in the platform. AGENT CAUTION RETAINED: harsher than the local Swvl benchmark (R7.7). Monitor cancellation-related churn from day one.

**Status:** CONFIRMED

### DEC-056 — Price certainty

**Answer:** GUARANTEED PRICE LOCKED AT BOOKING. The rider pays exactly what was quoted, even if the vehicle ends up empty or full. The platform absorbs matching risk.

**Why:** R7.3: uncertainty deterred riders more than price; ~31% of shared rides run solo at the discounted price anyway.

**Status:** CONFIRMED

### DEC-057 — Launch coverage

**Answer:** Start with UNIVERSITY routes. The platform must let a MANAGER open new routes/areas from the dashboard with no engineering work. The WHOLE map is always visible; areas without journeys simply show no service, making coverage self-evident to users.

**Why:** Concentrated density where it is strongest, plus operator-controlled expansion. Makes "market-agnostic scaling" (DEC-002) concrete: expansion is a dashboard action.

**Status:** CONFIRMED


# 6. Pricing & Tickets

### DEC-058 — Fare shape (resolved)

**Answer:** FIXED PRICE PER ROUTE. "Smouha → University = 15 EGP, always." The rider buys a ticket at a known price.

**Why:** Simplest possible mental model; matches microbus/Swvl expectations; makes subscriptions (DEC-051) natural; advertisable.

**Status:** CONFIRMED

### DEC-059 — Occupancy-based pricing/rewards

**Answer:** REJECTED. Riders have NO visibility of how full the vehicle is and are NOT rewarded for it. "They just book a ticket then ride only."

**Why:** User wants the rider experience to be a simple ticket purchase, disconnected from vehicle economics. Overrides the research-backed occupancy-discount idea (R7.2) in favour of simplicity.

**Status:** CONFIRMED

### DEC-060 — Reward mechanics (what IS rewarded)

**Answer:** Wallet credit is earned for: (a) SHARING A JOURNEY that results in another rider joining that journey (if seats remain), and (b) REFERRING A NEW USER to the app — both users get a reward, Uber-style.

**Why:** Growth loops tied to the two behaviours that actually help the platform: filling existing journeys and acquiring users.

**Status:** CONFIRMED

### DEC-061 — Reward controllability

**Answer:** EVERY reward mechanism must be switchable ON/OFF and configurable from the MANAGER DASHBOARD. Nothing is hard-coded.

**Why:** Business agility; lets the company stop paying for a promotion instantly.

**Status:** CONFIRMED

### DEC-062 — Price control

**Answer:** Managers set prices per route AND a price-per-km rate, can create EXCEPTIONS, and see the effect of changes. Changes take effect immediately. Guardrails required: full change log, sanity limits (no accidental zero fares), and clear preview of impact. "The dashboard should be advanced."

**Why:** Maximum commercial agility with protection against costly mistakes.

**Status:** CONFIRMED

### DEC-063 — Ticket types (resolves the DEC-004 vs DEC-058 conflict)

**Answer:** TWO ticket types only: (1) NORMAL STOP TICKET, (2) STREET/ON-ROUTE PICKUP TICKET (request the driver to stop on or near the route) which costs more. Full door-to-door as a third tier is dropped for now. Exact surcharge method deferred pending research.

**Why:** Simpler than three tiers; preserves the price gap that keeps routes straight.

**Status:** CONFIRMED (surcharge method PENDING)

### DEC-064 — Walking ceiling

**Answer:** NO hard limit. Street pickup is ALWAYS offered as an alternative option.

**Why:** User: "no limit and street pickup always proposed as option". Turns a coverage gap into an upsell instead of a rejection. AGENT CAUTION: with no ceiling the system may still surface a very distant stop; the UI must present distance honestly so the rider self-selects.

**Status:** CONFIRMED

### DEC-065 — Stop selection

**Answer:** The rider SEES all stops on the map and in a list, and may CHOOSE ANY of them. The system RECOMMENDS the best one.

**Why:** Rider autonomy + system guidance. AGENT NOTE: allowing any stop means the rider can pick one that is poor for routing; the price/feasibility must be recomputed for whatever they choose, and infeasible choices must be shown as unavailable rather than failing after booking.

**Status:** CONFIRMED

### DEC-066 — Street-pickup surcharge method

**Answer:** COMBINE all three approaches (flat uplift + detour banding + cost recovery) into ONE formula, with every variable controllable by the Manager from the dashboard.

**Why:** Gives predictability, fairness and cost protection at once; manager retains full commercial control.

**Status:** CONFIRMED

### DEC-067 — Door-to-door tier

**Answer:** DROPPED ENTIRELY. Two ticket types only: Stop ticket and Street/On-route pickup ticket.

**Why:** Cleanest product; street pickup already covers most of the need.

**Status:** CONFIRMED

### DEC-068 — Code organisation (NEW REQUIREMENT)

**Answer:** Code must be organised for very easy maintenance and updates. Architecture must make changes cheap and safe. To be specified as a first-class chapter, not an afterthought.

**Why:** User: "I want to discuss the organization of the code that should be very easy to maintain and update, do not miss this point".

**Status:** CONFIRMED — to design in CH8


# 7. Engineering Discipline & Matching

### DEC-069 — Code structure

**Answer:** MODULAR MONOLITH. One deployable application, internally split into strictly-bounded modules with defined interfaces; no module reaches into another's internals. Seams designed so a module can be extracted into a service later without rewriting it.

**Why:** Right complexity for the team size; avoids the distributed-systems tax while keeping future optionality.

**Status:** CONFIRMED

### DEC-070 — Business rules location

**Answer:** CONFIG-DRIVEN. Prices, bands, limits, wait times, walking rules, reward rules and feature switches live in the DATABASE as versioned configuration, editable by Managers. Code reads and applies; it never hard-codes a business value.

**Why:** Makes the Manager dashboard genuinely powerful; makes multi-city expansion configuration rather than engineering (DEC-002); removes developers from the loop for commercial changes.

**Status:** CONFIRMED

### DEC-071 — Quality gates

**Answer:** FULL DISCIPLINE FROM DAY ONE: automated tests, static type checking, linting, mandatory code review, and a single command that verifies everything. Nothing merges unless it passes.

**Why:** Essential when work is handed to rotating hired developers (DEC-007); also mandated by the user's own agent rules §6.2.

**Status:** CONFIRMED

### DEC-072 — Matching timing

**Answer:** ADAPTIVE batch window: short when demand is high, longer when quiet; the window is a Manager-tunable configuration value.

**Why:** R4.5 (batching beats instant dispatch by a wide margin) and R9.4 (adaptive timing is standard industry practice).

**Status:** CONFIRMED

### DEC-073 — Scheduled vs live

**Answer:** TWO ENGINES: an overnight/offline planner (OR-Tools, full optimisation) for scheduled and subscription journeys, and a fast live engine for same-day/on-demand requests.

**Why:** Subscriptions are the core product (DEC-051) and there is no time pressure overnight; use it.

**Status:** CONFIRMED

### DEC-074 — Matching engine design

**Answer:** APPROVED: the 6-stage layered pipeline (H3 pre-filter → feasibility → insertion heuristic → deadline-bounded batch optimiser → offer workflow → overnight VRP).

**Why:** R9.1/R9.3/R9.5/R9.10. Fast answer always available; optimiser is optional improvement.

**Status:** CONFIRMED

### DEC-075 — Driver fairness in matching

**Answer:** PURE EFFICIENCY. The algorithm always picks the best match for the system; no fairness weighting toward lower-earning drivers.

**Why:** User's choice. AGENT CAUTION: R9/industry practice includes fairness because driver supply is the hardest constraint; consistently poorly-served drivers churn. Logged as G-036 to monitor, with the fairness weight designed as a config value defaulting to zero so it can be enabled without code changes.

**Status:** CONFIRMED (caution logged)

### DEC-076 — No-match behaviour (F-16)

**Answer:** HONEST IMMEDIATE ALTERNATIVES: state plainly that nothing fits, and offer concrete options (a different time, a different stop, street pickup at its price). Never an empty screen, never an endless spinner.

**Why:** This screen determines whether a rider ever returns.

**Status:** CONFIRMED


# 8. Money, Payments & Codebase

### DEC-077 — Payment methods

**Answer:** ALL of: wallet (primary), cash, Paymob (cards + mobile wallets + kiosk), and InstaPay where available. User: "cash is fine wallet, paymob and instapay integrations if possible is great".

**Why:** Maximum inclusion in the Egyptian market.

**Status:** CONFIRMED (mechanism detail below)

### DEC-078 — Cash mechanism

**Answer:** Cash IS allowed, but ALWAYS recorded against the scanned booking: scan QR → driver marks "cash collected" → the fixed fare becomes a driver liability, settled against payout. No untracked cash sale ever exists.

**Why:** Only safe way cash and pooling coexist; keeps the ledger authoritative.

**Status:** CONFIRMED

### DEC-079 — Payment methods (full list)

**Answer:** ALL of: in-app WALLET (primary), CASH (recorded), PAYMOB (cards + mobile wallets + kiosk), INSTAPAY (via PSP/bank, not direct API), DIRECT CREDIT/DEBIT CARD, APPLE PAY. All behind one payment-provider abstraction.

**Why:** Maximum inclusion; user wants every option available.

**Status:** CONFIRMED

### DEC-080 — Driver payouts

**Answer:** WEEKLY payouts via Paymob Payouts / Instant Cashin, subject to a minimum threshold (R10.4: EGP 1,000-5,000 typical).

**Why:** Predictable, low fee overhead, matches PSP thresholds.

**Status:** CONFIRMED

### DEC-081 — Platform revenue

**Answer:** PERCENTAGE COMMISSION is the DEFAULT, but the system must SUPPORT commission / driver-subscription / hybrid models as configuration, switchable without engineering.

**Why:** User: "I want the idea of system support things but the default is commission". Fits DEC-070.

**Status:** CONFIRMED

### DEC-082 — Growth mechanics

**Answer:** ALL THREE: habit/streaks + social (referral & journey sharing) + price events (flash sales/campaigns). Each independently switchable and measurable from the Manager dashboard.

**Why:** Fits DEC-061; lets the business learn which lever works and disable the rest.

**Status:** CONFIRMED

### DEC-083 — F-38 multi-seat booking

**Answer:** ALLOWED: one rider may book multiple seats, all under their own name and responsibility (multiple QR codes issued to them). No named third parties, so DEC-024/INV-11 survives.

**Why:** Covers friends/couples/colleagues travelling together — a normal everyday case Swvl supports.

**Status:** CONFIRMED

### DEC-084 — C-5 wait-time conflict

**Answer:** NOT AN APP CONCERN. The user rules that managing a late rider is handled socially by the driver (asking people, judging the situation), not by system logic. The 10-minute default stands; the app does not enforce a promise-vs-wait trade-off.

**Why:** User: "that's something internal, the driver asks people and so on, that's not an app thing". AGENT NOTE: the app should still SHOW the driver the consequence (who is on board, their promised times) so the human decision is informed.

**Status:** CONFIRMED

### DEC-085 — Codebase shape (resolves C-2, C-3)

**Answer:** MONOREPO WITH SEPARATE UIs. `/apps/mobile` (Expo, rider+driver, role-adaptive), `/apps/web` (Next.js: public site, rider web booking, Manager & Ops dashboards), `/apps/api` (NestJS modular monolith). Shared packages: `shared-types`, `shared-logic`, `shared-api`. UI is NOT shared; everything else is.

**Why:** R11.3/R11.4/R11.5: practitioners and official guidance agree. Driver needs native background GPS (physics, not framework choice); dashboards need real desktop UI; public site needs SEO. Also allows hiring a web dev and a mobile dev in parallel.

**Status:** CONFIRMED

### DEC-086 — Build order

**Answer:** VERTICAL SLICES: one complete feature at a time, working end-to-end across API + web + mobile before starting the next.

**Why:** Matches DEC-006's "nothing fake" stance — nothing is ever half-built.

**Status:** CONFIRMED

### DEC-087 — Process (restated)

**Answer:** ALL discussion continues via MCQ, per rule P5.

**Why:** User restated.

**Status:** CONFIRMED


# 9. Data, Safety & Fraud

### DEC-088 — API style

**Answer:** REST + WebSockets. REST for actions, WebSockets for live push.

**Why:** Simplest to build and debug; universally understood by hired developers; good caching.

**Status:** CONFIRMED

### DEC-089 — Realtime scope

**Answer:** LIVE only where it matters: vehicle position, ride/booking state, driver manifest. Everything else refreshes on demand.

**Why:** Protects battery on low-end Android and keeps server cost low.

**Status:** CONFIRMED

### DEC-090 — GPS sampling

**Answer:** ADAPTIVE: frequent near stops/pickups, sparse on long stretches.

**Why:** Addresses F-34 (driver battery drain as an operational failure cause).

**Status:** CONFIRMED

### DEC-091 — Offline capability

**Answer:** CRITICAL ACTIONS WORK OFFLINE: QR boarding scans, arrival marking, journey progress — queued in an outbox and synced with idempotency keys. Booking/payment remain online-only.

**Why:** Alexandria dead zones, garages, tunnels. Booking offline is unsafe (cannot verify seat availability).

**Status:** CONFIRMED

### DEC-092 — Safety features

**Answer:** FULL KIT: SOS button with live location to support, share-my-ride link, masked calling both directions, two-way ratings, and a tracked incident flow with follow-up.

**Why:** Rider expectation in 2026 and a real marketing advantage in Egypt.

**Status:** CONFIRMED

### DEC-093 — Gender preference

**Answer:** Women may REQUEST women-only vehicles/seats when available (soft preference, not a guarantee). If no suitable vehicle exists, normal options are shown.

**Why:** Research noted ride-hailing is especially popular among women in Egypt partly for safety; strong adoption driver without a hard supply promise.

**Status:** CONFIRMED

### DEC-094 — Data retention

**Answer:** KEEP EVERYTHING INDEFINITELY. No automatic deletion of collected data.

**Why:** User's choice for maximum analytical value. AGENT CAUTION (recorded, not overridden): (a) storage cost grows without bound; (b) a breach would expose years of every rider's movements — home, workplace, daily routine; (c) indefinite retention of personal data conflicts with common data-protection principles and may conflict with Egypt's PDPL — this is a LEGAL question owned by the user's legal team (DEC-030), and it MUST be put to them explicitly. Technical mitigations proposed below.

**Status:** CONFIRMED (caution logged, legal referral required)

### DEC-095 — SOS staffing

**Answer:** On-call phone rota (a real person, 24/7) at launch; upgrade to a staffed desk when volume justifies it.

**Why:** Honest and achievable; the button always reaches a human.

**Status:** CONFIRMED

### DEC-096 — Rating consequences

**Answer:** INFORMATIONAL ONLY. Ratings carry no automatic consequence for drivers.

**Why:** User's choice. AGENT CAUTION: ratings then provide no protective function; the protective role must be carried entirely by the INCIDENT/complaint flow (DEC-092) and by Ops Admin action. Logged as G-044 — the complaint path must therefore be strong, because it is now the only mechanism that removes a dangerous driver.

**Status:** CONFIRMED (caution logged)

### DEC-097 — Fraud focus

**Answer:** Design against the three money-draining vectors: GPS spoofing / fake completed rides, driver-rider collusion, and promotion/referral abuse. Rule-based detection first; pattern detection later.

**Why:** Targets actual financial loss rather than speculative threats.

**Status:** CONFIRMED


# 10. UX Foundations & Growth

### DEC-098 — Rider home screen

**Answer:** ADAPTIVE HOME: one screen whose top slot changes by context — new user sees "Where to?" search; a rider with an upcoming booking sees that booking as the highlight; a repeat commuter sees their saved commute. **The screen LAYOUT stays identical across web and mobile; only the content (banners, top slot) adapts.**

**Why:** R12.2/R12.3 evidence; user added the constraint that the screen must feel the same everywhere, with adaptivity in content not structure.

**Status:** CONFIRMED

### DEC-099 — Offline model

**Answer:** SPLIT: **driver app = offline-FIRST** (local storage is the source of truth; a full journey can run with zero signal), **rider app = offline-capable** (cached stop, time, walking line, ticket QR), **booking/matching = online-only** (a scarce seat cannot be honestly promised offline). Delta sync only; optimistic UI with calm rollback.

**Why:** R13.1/R13.6: research explicitly warns offline-first is risky for real-time dispatch, but journey EXECUTION only records what already happened.

**Status:** CONFIRMED

### DEC-100 — Subscription trial day

**Answer:** YES — a single TRIAL DAY is offered before committing to any recurring subscription.

**Why:** R12.2: both riders and drivers preferred starting with one test day; removes commitment fear on an unproven route.

**Status:** CONFIRMED

### DEC-101 — Manager dashboard behaviour

**Answer:** ACTIVE ALERTING: the system watches occupancy/demand thresholds and raises actionable alerts ("Zone 4: 12 empty seats, 32% occupancy — suggest flash sale"), each with a one-click action. Thresholds are configurable. NOT fully automatic rules (rejected for now: an automated rule with a bug spends real money).

**Why:** Turns DEC-045 into something that works when nobody is watching.

**Status:** CONFIRMED

### DEC-102 — Ops Admin home

**Answer:** WORK-QUEUE FIRST: pending driver approvals, vehicle approvals, open incidents, disputes — in priority order. Live map is a tab.

**Why:** Ops work is clearing queues, not watching dots.

**Status:** CONFIRMED

### DEC-103 — Growth build priority

**Answer:** ALL THREE EQUALLY (referrals, streaks, flash sales), each measurable, and let real data decide which to invest in.

**Why:** Nobody can reliably predict which mechanic works in a new market.

**Status:** CONFIRMED


# 11. Infrastructure, Testing & Delivery

### DEC-104 — Hosting

**Answer:** SELF-MANAGED VPS (Hetzner / DigitalOcean class). Not managed cloud.

**Why:** User's choice: 3-5x cheaper and full control. AGENT CAUTION: the team becomes responsible for backups, patching, uptime, and 3am failures. Mitigations mandated below.

**Status:** CONFIRMED (caution logged)

### DEC-105 — Region

**Answer:** ANY region — no constraint imposed by the user. AGENT DEFAULT: choose a low-latency European region (Frankfurt/Milan class) for Alexandria, with the region treated as configuration so it can move.

**Why:** Latency to Egypt is acceptable and provider maturity is highest. NOTE: if the legal team ever confirms a data-localisation requirement (research R1.5 showed Egypt has debated exactly this), the region must move — so no code may assume a region.

**Status:** CONFIRMED (agent default)

### DEC-106 — Testing depth

**Answer:** FULL PYRAMID: unit + integration + contract + end-to-end + FleetPy simulation against synthetic Alexandria demand before launch.

**Why:** Matches DEC-071 quality gates; validates the algorithm with zero real riders at risk.

**Status:** CONFIRMED

### DEC-107 — Database hosting

**Answer:** SELF-HOSTED with a live REPLICA and automated OFF-SITE backups from day one. Not managed, not a single box.

**Why:** Keeps cost and control while removing the single-point-of-failure. Mandatory: streaming replication to a second machine, automated encrypted off-site backups, point-in-time recovery configured, and DOCUMENTED RESTORE DRILLS on a schedule. A restore that has never been tested does not count.

**Status:** CONFIRMED

### DEC-108 — Launch gate

**Answer:** CLOSED BETA on ONE corridor with real riders before public launch.

**Why:** Finds what simulation cannot: unfindable stops, confusing screens, drivers misreading the manifest.

**Status:** CONFIRMED

### DEC-109 — Team growth

**Answer:** PHASED HIRING: start with user + agent; hire specifically when a phase demands it. CH16 must define, per phase: scope, required skills, hiring trigger, and ready-to-hand-over work packages.

**Why:** Honest about timeline; avoids paying for a team before the work exists.

**Status:** CONFIRMED

### DEC-110 — Phase shape

**Answer:** ONE CORRIDOR WORKING COMPLETELY, then widen. Everything needed for a single real route (signup → stops → booking → matching → QR boarding → payment → driver app → basic ops) before adding corridors and breadth.

**Why:** Reaches real users soonest and proves the model; consistent with DEC-086 vertical slices.

**Status:** CONFIRMED

### DEC-111 — Hiring plan

**Answer:** OUT OF SCOPE. User: "do not talk about this part, when we need someone we will have it." CH16 will contain NO hiring plan and NO role recommendations.

**Why:** User owns resourcing.

**Status:** CONFIRMED

### DEC-112 — Timeline estimates

**Answer:** OUT OF SCOPE. User: "we do not need this part." CH16 will contain NO calendar estimates and NO person-week figures.

**Why:** User owns scheduling.

**Status:** CONFIRMED


# 12. The Route-Ticket Model

### DEC-113 — Surge pricing (G-047)

**Answer:** NO AUTOMATIC SURGE. Prices never rise algorithmically with demand. A MANAGER may raise prices manually for a defined period from the dashboard.

**Why:** Preserves the fixed-price promise (DEC-058) and the simple-ticket philosophy; still allows a human response to a genuine supply crisis. Surge is widely resented in this market.

**Status:** CONFIRMED

### DEC-114 — **ROUTE TICKET, not origin→destination booking** (G-048) — MAJOR MODEL CHANGE

**Answer:** User: "he can get in at any point from the route... he books the route not a fixed destination at all, he picks the route and he can get off the bus at any point." A rider books a **ROUTE**, boards at a point on it, and may alight at ANY point along that route. No fixed destination is committed at booking.

**Why:** Matches how Egyptian microbuses actually work; radically simpler for the rider. AGENT WARNING: this contradicts or reshapes several existing decisions — full impact analysis below, and the consequences MUST be decided before the spec is consistent.

**Status:** CONFIRMED (impact analysis OPEN)

### DEC-115 — Route-ticket pricing (G-051 #1)

**Answer:** ONE FLAT PRICE FOR THE WHOLE ROUTE. "Smouha → University route = 15 EGP" whether the rider travels 2 stops or 12.

**Why:** Exactly like a microbus; simplest possible mental model; ideal for subscriptions. Accepted cost: short-distance riders subsidise long-distance ones.

**Status:** CONFIRMED

### DEC-116 — Route-ticket capacity (G-051 #2)

**Answer:** A SEAT IS HELD FOR THE ENTIRE REMAINING ROUTE. Once boarded, the seat is that rider's until the end of the line; the system never resells it mid-route based on a guess.

**Why:** Never oversells, never wrong. Accepted cost: seats freed early sit empty unless the rider signals (DEC-117).

**Status:** CONFIRMED

### DEC-117 — Alighting signal (G-051 #3)

**Answer:** BOTH: the rider may simply tell the driver, AND an in-app "I'm getting off" button exists. When the app button is used, the system learns the seat is free and may resell it for the remaining stops. Driver may also mark an alighting.

**Why:** Works for everyone including riders not watching their phone; the app path recovers the capacity that DEC-116 would otherwise waste.

**Status:** CONFIRMED

### DEC-118 — Calendar handling (G-049)

**Answer:** Scheduled journeys and subscriptions are stored as LOCAL WALL-CLOCK TIME (e.g. "07:30 Africa/Cairo"), so DST changes never shift a rider's commute. Plus a RAMADAN MODE (managers shift timetables and expectations) and a HOLIDAY CALENDAR that auto-pauses subscriptions.

**Why:** DST-safe by construction; both seasonal features matter enormously in the Egyptian market.

**Status:** CONFIRMED

### DEC-119 — Fairness rule replacing F6 (G-052)

**Answer:** **SCHEDULE ADHERENCE.** Every route has a published timetable. No pickup, deviation, wait or insertion may push the vehicle more than `MaxScheduleSlip` behind that timetable. Riders are protected collectively because they share one schedule.

**Why:** With no declared destinations there are no individual arrival promises; protecting the timetable protects everyone on board. This is how real bus services work and it fits the route model naturally.

**Status:** CONFIRMED

### DEC-120 — Rider intent (replaces "From/To/Arrive by")

**Answer:** Rider **picks a ROUTE** from a list or map, then **picks a boarding point** on it. e.g. "Smouha → University" then "board at Green Square, 6 min walk".

**Why:** Matches how people already think about microbus lines; no destination is committed.

**Status:** CONFIRMED

### DEC-121 — Fix order

**Answer:** Rewrite CH5, CH9 and CH10 for the route model FIRST, then produce the screen inventory.

**Why:** Prevents documenting screens that no longer exist — the exact defect class found in audit #3.

**Status:** CONFIRMED


# 13. Design System & Screens

### DEC-122 — Screen inventory depth

**Answer:** FULL DETAIL per screen: purpose, every element, every action, all states (loading/empty/error/offline/RTL), governing decisions, and the API calls it makes.

**Why:** Build-ready standard (DEC-010); a developer must not need to ask.

**Status:** CONFIRMED

### DEC-123 — Inventory order

**Answer:** Rider → Driver → Ops/Manager/Support.

**Why:** Rider is the largest surface and defines the product's feel.

**Status:** CONFIRMED

### DEC-124 — Web vs mobile documentation

**Answer:** ONE screen spec with explicit notes where web and mobile differ.

**Why:** Matches DEC-098 (identical structure, adaptive content); avoids two specs drifting apart — the defect class found in audits #3 and #4.

**Status:** CONFIRMED

### DEC-125 — Design system

**Answer:** Define the DESIGN SYSTEM FIRST, then the screens reference its components.

**Why:** Shorter inventory, consistent build, one visual language across apps and dashboards.

**Status:** CONFIRMED

### DEC-126 — Standing instruction

**Answer:** Every audit conflict must be FIXED, and DISCUSSED with the user when a decision is needed. Consistency and suitability are continuous obligations, not end-of-project tasks.

**Why:** User instruction, 2026-07-31. Reinforces rules §3 and project rule P5.

**Status:** CONFIRMED

### DEC-127 — Brand palette

**Answer:** PLACEHOLDER for now. The token system means any palette can be swapped by changing hex values in one place; no screen references a raw colour.

**Why:** Branding not yet decided; costs nothing to defer because of the token architecture.

**Status:** CONFIRMED (deferred)

### DEC-128 — Product name

**Answer:** NOT YET CHOSEN. Agent to propose candidates that work in Egyptian Arabic and English. Until chosen, screens use a neutral placeholder.

**Why:** Name appears in every screen, notification, receipt and email.

**Status:** OPEN — naming MCQ

### DEC-129 — Screen inventory delivery

**Answer:** ALL ROLES in one document (~80-100 screens), delivered in parts, rider first (DEC-123).

**Why:** User wants completeness.

**Status:** CONFIRMED

### DEC-130 — Subscription guarantee failure (G-028)

**Answer:** FULL CREDIT for that day **PLUS** a compensation credit. The rider gets the day's value back and something extra for the broken promise. Amounts are configuration (Manager-set).

**Why:** A guarantee that fails like a normal cancellation is not a guarantee. Clear and explainable.

**Status:** CONFIRMED

### DEC-131 — Screen spec format

**Answer:** NO layout diagrams and NO visual prescriptions. Each screen is a PLAIN LIST of everything that must be present: information, controls, interactions, states. Designers choose layout, hierarchy and styling.

**Why:** User: "just list things that must be in each screen... leave them to choose the best layout and styles". Separates requirements (ours) from design (theirs).

**Status:** CONFIRMED


# 14. Supply Model (M3) & Final Gaps

### DEC-132 — Supply model (G-054)

**Answer:** **MODEL M3: operator defines ROUTES and publishes a SLOT GRID; drivers CLAIM a slot (two taps). Drivers never draw routes, set prices, or predict demand.** Uncovered slots are filled by visibility, system suggestion, configurable incentive, and a commitment tier. Subscriptions may only be sold on slots with committed coverage.

**Why:** R14 evidence (14 studies): fixed routes win on cost, schedule adherence and ridership at dense peak demand; demand-responsive is explicitly contra-indicated for "dense urban" and "peak-hour commuter corridors". Drivers want shift choice, not planning (R14.8). Keeps DEC-115 and DEC-119 intact.

**Status:** CONFIRMED

### DEC-133 — Per-km rate purpose (G-033)

**Answer:** The per-km rate is **NOT a rider-facing fallback**. It exists only as a MANAGER TOOL that SUGGESTS a fare when creating a new route ("this route is 6.2 km → suggested 15 EGP"). Riders are never charged per km. Precedence is therefore simply: **route flat fare, always** (DEC-115).

**Why:** Under M3 every journey is on a defined route, so an unpriced pair cannot occur. Keeps fare consistency as the network grows.

**Status:** CONFIRMED

### DEC-134 — Walking rule (G-024)

**Answer:** **No walking rule.** Under M3 the rider chooses their own boarding point from the route's stops. The system simply lists every boarding point **sorted by walking time, with honest distances**, and marks one as recommended. No ceiling (DEC-064), no weighted formula.

**Why:** Consistent with DEC-064/065; M3 removed the need for the system to choose for the rider.

**Status:** CONFIRMED

### DEC-135 — Multi-leg journeys (G-015)

**Answer:** **SUGGEST multi-leg normally**, treated exactly like any single-leg booking. User's reasoning: "it is the same risk as single leg, so if not succeed just refund for the failed leg." No special warnings, no fallback ride, no daylight/hub restrictions. Each leg is an independent booking (DEC-025); a failed leg is refunded like any other failure.

**Why:** Consistency: a single-leg journey can also fail and strand someone at their origin. Treating multi-leg as uniquely dangerous would be inconsistent.

**Status:** CONFIRMED

### DEC-136 — QR fallback (G-026)

**Answer:** **The numeric code IS the fallback**, always displayed alongside the QR. Covers: camera failure, darkness, cracked screen, and screen-reader users (accessibility). No SMS codes, no separate mechanism. Driver manual confirm from the manifest remains available as a rate-limited, audited override (CH12 §12.4).

**Why:** Simple and complete; one mechanism covers every realistic failure.

**Status:** CONFIRMED

### DEC-137 — Data collection scope (G-027)

**Answer:** **EVERYTHING**: every state change, every GPS sample, every offer shown and declined, every price quoted, every notification sent, and in-app behaviour (screens, taps, time on screen). Retained indefinitely (DEC-094), cost controlled by cold-storage tiering, not by collecting less.

**Why:** User: "everything". Maximum analytical and dispute-resolution value. Security/privacy mitigations already mandated in CH13 §13.2 and CH12 §12.7.

**Status:** CONFIRMED

### DEC-138 — Driver report threshold (G-044)

**Answer:** **Report rate ≥ 10% of completed rides, with a minimum of 20 completed rides, over a rolling window of the last 100 rides → raises a HUMAN REVIEW alert to Ops.** Plus: severe categories trigger immediate precautionary suspension regardless of percentage; 3+ reports in the same category within 30 days trigger review even below 10%. **No automatic deactivation ever** — a human decides, states a reason, and the driver may appeal. All values configuration.

**Why:** R15: the user's 10% instinct matches the industry's effective tolerance (Uber deactivates near a 4.6/5 average, which corresponds to roughly 8-12% poor ratings). R15.3 adds the minimum-volume and rolling-window guards; R15.5 requires human review and appeal (30% of drivers reportedly faced deactivation threats with no recourse).

**Status:** CONFIRMED

### DEC-139 — Journey sharing mechanism (G-034)

**Answer:** A **shareable link** carrying the journey id and the sharer's code (WhatsApp-ready, viewable without installing). Whoever books through it credits the sharer once their ride COMPLETES (never at signup — CH12 §12.3.3).

**Why:** Links spread through WhatsApp groups, which is how things actually spread in Egypt; no contacts permission needed.

**Status:** CONFIRMED

### DEC-140 — Boarding-point availability + alighting freedom (G-035)

**Answer:** Unavailable boarding points are shown **greyed out with a plain reason** ("not served by this departure", "too late to reach"), never selectable-then-failing. **Boarding is only at fixed stops; ALIGHTING is free — the rider may get off at any point along the route** (reaffirms DEC-114/117).

**Why:** Rider sees the whole route honestly. Asymmetry is deliberate: boarding must be predictable for the driver and the manifest; alighting does not need to be.

**Status:** CONFIRMED

### DEC-141 — Behavioural bets (G-031, G-025)

**Answer:** KEEP both as decided (strict cancellation, sell every seat) but **INSTRUMENT them from day one** and review after the closed beta (DEC-108). Required metrics: cancellation rate; churn/uninstall after a cancellation charge; seat-comfort complaint rate; ratings segmented by vehicle size and by seat position.

**Why:** Decide with real Alexandria data, not prediction.

**Status:** CONFIRMED

### DEC-142 — Operational failures (G-039)

**Answer:** BOTH: the software behaviour stays in CH12 §12.6, AND a **detailed OPERATIONS RUNBOOK is written into the master document** — who does what, in what order, within what time, for each failure mode.

**Why:** User: "both, and write the operation runbook detailed in the master doc".

**Status:** CONFIRMED

### DEC-143 — Open-source vetting (G-010)

**Answer:** Vet each component **at the moment of adoption**, not in advance. Licence, maintenance activity, security posture and production maturity are checked and recorded in the implementation log when the component is first used.

**Why:** Avoids vetting components that may never be adopted; keeps the record tied to a real decision.

**Status:** CONFIRMED


# 15. Configuration & Notifications

### DEC-144 — Config catalogue structure

**Answer:** THREE categories: **Business parameters** (permanent, Manager-editable) · **Feature toggles** (temporary, owned, with an expiry date, treated as technical debt) · **System tuning** (technical, Super-Admin only).

**Why:** R17.1: merging flags with permanent parameters causes flags to silently become permanent system state.

**Status:** CONFIRMED

### DEC-145 — Config risk tiers

**Answer:** THREE tiers by blast radius, reversibility and hidden coupling: **LOW** (Manager, instant) · **MEDIUM** (Manager, preview required) · **HIGH** (Super Admin, mandatory reason AND a stated rollback trigger before it goes live). Every key also declares its **missing-value behaviour**.

**Why:** R17.3/R17.4: most incidents happen during fallback, not during the change; ceremony should scale with risk.

**Status:** CONFIRMED

### DEC-146 — Notification caps

**Answer:** Adopt the researched caps: **transactional unlimited** (never suppressed by other caps) · **behavioural max 2/day with a 4-hour gap** · **promotional max 1/day and 5/week** · **global non-transactional max 3 per 24h**. All stored as configuration. Only transactional messages are retried.

**Why:** R18.1/R18.2/R18.4.

**Status:** CONFIRMED

### DEC-147 — SMS fallback

**Answer:** **PUSH ONLY. No SMS fallback except OTP.**

**Why:** User's choice, cost-driven. AGENT CAUTION RETAINED: R18.3 states push is connectivity-dependent and "may struggle to reach mobile phones" in poor-signal environments — which describes parts of Alexandria. Consequence: a rider may never learn their vehicle arrived. Mitigations that are now MANDATORY because there is no SMS safety net: (a) the in-app alarm (DEC-053) must work from cached schedule data without a live push, (b) the waiting screen must show the scheduled time from cache when offline (already CH10 R-20), (c) push-delivery failure rate must be instrumented and reviewed. Logged as G-055.

**Status:** CONFIRMED (caution logged)


# 16. Business Rules (money & support)

### DEC-148 — Cancellation forfeit timing (A5)

**Answer:** FLAT 50% at any time after purchase, rising to **100% after the departure LOCKS**. Two steps only.

**Why:** Keeps DEC-055 simple and adds the one step that is economically real: after lock the seat cannot be resold.

**Status:** CONFIRMED

### DEC-149 — Driver cancellation penalty (A2)

**Answer:** A driver who releases a claimed departure **after bookings exist** loses a fee equal to the platform's commission on the lost bookings. Riders receive **100% credit plus a small compensation credit** (symmetric with DEC-130).

**Why:** The penalty scales with harm done; the rider is made whole plus something for the trouble.

**Status:** CONFIRMED

### DEC-150 — Rider no-show (A3)

**Answer:** A no-show rider is charged **100%** — they consumed the seat, which could not be resold.

**Why:** Consistent with DEC-148's post-lock rule.

**Status:** CONFIRMED

### DEC-151 — Staff 2FA (A6)

**Answer:** **MANDATORY for all staff roles** (Support, Ops Admin, Manager, Super Admin).

**Why:** Staff can move money and access personal data. Closes Q2.1.

**Status:** CONFIRMED

### DEC-152 — Support channel (A7)

**Answer:** **In-app chat + phone.** Chat scales and keeps a written record attached to the booking; phone covers urgent and low-literacy cases. Not WhatsApp (conversations would live outside the system, weakening the audit trail).

**Why:** Closes F-40; unblocks screens R-70 and S-10..S-13.

**Status:** CONFIRMED

### DEC-153 — Wallet balance storage (A8)

**Answer:** `wallets.balance_minor` is a **materialised projection** of the ledger, reconciled nightly. The **ledger remains the sole source of truth** (CH6 §6.1).

**Why:** Fast reads without weakening the ledger guarantee.

**Status:** CONFIRMED

### DEC-154 — Unused subscription days (A4)

**Answer:** **EXPIRE.** Rides not taken within the subscription period are lost, like a gym membership. No rollover, no credit conversion.

**Why:** Simplest accounting and forecasting. AGENT NOTE: this is the least generous option; pair it with clear pre-purchase wording and the skip/pause controls (CH3 §3.10.3) so riders can protect value in advance. Monitor complaints.

**Status:** CONFIRMED

### DEC-155 — Support refund limit (A1)

**Answer:** **One ride fare per incident, maximum 3 per agent per day.** Anything larger, or a fourth case in a day, escalates to Ops.

**Why:** Agent can fix a rider's day instantly; caps exposure to any single agent (insider-fraud control, CH2 §2.4.1).

**Status:** CONFIRMED


# 17. Final Pre-Launch Decisions

### DEC-156 — Suspension durations (B1)

**Answer:** Escalating: **warning → 7 days → 30 days → permanent**. Severe categories jump straight to precautionary suspension pending investigation (CH12 §12.2).

**Why:** Predictable and defensible; a driver can see where they stand.

**Status:** CONFIRMED

### DEC-157 — Driver face-match on duty (B4)

**Answer:** **NO periodic face-match.** Verification happens once, at onboarding (DEC-035).

**Why:** User's choice: less driver friction, no extra build. AGENT CAUTION RETAINED: this accepts the risk of ACCOUNT SHARING — an unverified person driving on an approved account, which is the most serious safety failure the platform can have. Compensating controls now carry that weight: strict onboarding (DEC-035), the incident flow (DEC-138), and GPS/behaviour anomaly detection (CH12 §12.3.1). Logged as G-056 to monitor.

**Status:** CONFIRMED (caution logged)

### DEC-158 — Rider blocking (B5)

**Answer:** **YES — one-way and silent.** A rider may block a driver; they are never matched with them again. The driver is never told.

**Why:** Gives riders a remedy for a bad-but-not-reportable experience instead of silently churning. One-way and silent avoids retaliation.

**Status:** CONFIRMED

### DEC-159 — Street pickup at peak (B6)

**Answer:** Manager may **disable street pickup per route during defined peak windows** (configuration). **No subscriber discount** on street pickup — pricing stays simple.

**Why:** Protects journey times when vehicles are full; keeps one price per ticket type.

**Status:** CONFIRMED

### DEC-160 — Explaining unavailability (B7)

**Answer:** **Show the reason** when street pickup or a boarding point is unavailable ("too far off our route today", "not served by this departure"). Never a silently missing option.

**Why:** Consistent with DEC-076 and DEC-140; honesty beats a vanishing control.

**Status:** CONFIRMED

### DEC-161 — SLAs and alert thresholds (B2, B3)

**Answer:** **DEFERRED to after the closed beta.** No values are invented now. The system must support them as configuration from day one, and the beta must produce the data that sets them.

**Why:** User's choice: you cannot set a realistic SLA before you know your volumes. AGENT NOTE: the fields exist and are empty; CH18 §18.13 duties still apply without numeric targets.

**Status:** CONFIRMED

### DEC-162 — Manager analytics visibility

**Answer:** Managers see **pseudonymised** riders in analytics. Re-identification is a separate, audited, Super-Admin-only action (CH13 §13.2).

**Why:** Managers need patterns, not identities.

**Status:** CONFIRMED

### DEC-163 — OSRM deployment

**Answer:** **One OSRM instance per city.** Each city's graph stays small, fast, and independently updatable.

**Why:** Matches "a new city is configuration" (DEC-002); avoids rebuilding every city's graph together.

**Status:** CONFIRMED

### DEC-164 — Backup policy

**Answer:** **Nightly backups, retained 30 days, restore drill monthly** (documented, per CH15 §15.2).

**Why:** Standard cadence; a drill that is never performed is not a backup.

**Status:** CONFIRMED

### DEC-165 — Alarm escalation

**Answer:** Default **15 min before → 5 min before → strong alarm on arrival**. **The rider can change the first reminder** (e.g. to 30 minutes) in their notification preferences.

**Why:** Default suits most; user control handles longer walks and personal habits.

**Status:** CONFIRMED

### DEC-166 — Configuration editing UI

**Answer:** **Guided forms per rule type**, not raw value entry. The field itself enforces the type, unit and range from CH19 — a manager cannot type 5000% into a discount field.

**Why:** Prevents the class of error that risk tiers alone cannot catch.

**Status:** CONFIRMED

### DEC-167 — First module extraction

**Answer:** **`matching`** is the documented first candidate for extraction from the monolith, if load ever demands it. Documented as intent only — not built now.

**Why:** CPU-heaviest, and it already has a natural queue boundary (CH5 §5.5). Stating the intent keeps the seam clean.

**Status:** CONFIRMED

# 18. UI Reference & Palette

### DEC-168 — UI reference artefact

**Answer:** The user's "Daily Plan" HTML demo is adopted as the **visual and architectural BENCHMARK** for this product, stored at `_working_docs/reference/UI_REFERENCE_daily-plan-app.html`. It is a reference brief for designers and web developers, **not** code to be copied wholesale.

**Why:** It independently demonstrates three patterns this specification already requires: a single token layer, one nav component that adapts by CSS alone, and component-as-pure-function structure.

**Status:** CONFIRMED

### DEC-169 — Brand palette (supersedes DEC-127)

**Answer:** The reference file's approach is ADOPTED and adapted: keep the calm neutral base, near-black text, soft layered shadows and generous radii; **replace the pastel accent cards** with a palette that survives direct sunlight on a low-end screen and works in mandatory dark mode.

**Why:** DEC-127 deliberately deferred the palette; the reference supplies a coherent starting point that matches the product's restrained tone.

**Status:** CONFIRMED

---

# APPENDIX A — SUPERSEDED & REVISED DECISIONS

Decisions that were answered once and later changed. Both versions are kept so the history is
never lost. The LATER answer is the one in force.

### DEC-012 — revised
- EARLIER (superseded): TypeScript end-to-end: Next.js (web + admin) + React Native/Expo (rider, driver, and shuttle apps) + NestJS (backend) + PostgreSQL 16 + PostGIS + Redis + self-hosted OSRM/Valhalla + OR-Tools microservice (Python) for the offline optimiser only.
- **IN FORCE**: APPROVED (option A). TypeScript everywhere + Python OR-Tools service.

### DEC-019 — revised
- EARLIER (superseded): Delegated to agent ("search and decide for me"). AGENT ANSWER: ONE universal core model — Journey + Booking + RideRequest, with four named policy objects.
- **IN FORCE**: CONFIRMED option A: ONE universal internal model with policy settings.

### DEC-021 — revised
- EARLIER (superseded): The word "Trip" is banned from code, schema, API and docs — replaced by Journey / Booking / RideRequest.
- **IN FORCE**: CONFIRMED: banned. Use Journey / Booking / RideRequest.

### DEC-024 — revised
- EARLIER (superseded): User chose B: NO, every rider books for themselves only.
- **IN FORCE**: CONFIRMED strict: every rider books for themselves ONLY. No org booking, no family booking.

### DEC-058 — revised
- EARLIER (superseded): DEFERRED — user requested a plain-language explanation before deciding.
- **IN FORCE**: FIXED PRICE PER ROUTE. "Smouha → University = 15 EGP, always." The rider buys a ticket at a known price.


### Decisions superseded by a DIFFERENT decision ID
| Original | Superseded by | What changed |
|---|---|---|
| DEC-020 (who creates a journey) | DEC-114, DEC-120, DEC-132 | Riders state intent → riders pick a ROUTE; operator publishes slots, drivers claim them |
| DEC-026 (four roles) | DEC-046 | Organization Manager removed, Support Agent + Manager added → six roles |
| DEC-036 (owner-only driving) | DEC-039 | Driver is accountable; vehicle is a declared+approved attribute, no ownership enforced |
| DEC-042 (minimal stop data) | DEC-043 | Name+location mandatory; night-safe, accessible, photos, description optional |
| DEC-055 (flat 50% forfeit) | DEC-148 | 50% after purchase, rising to 100% after the departure locks |
| DEC-058 (fare shape deferred) | DEC-115 | One flat price per route, whatever the distance |
| DEC-062 (per-km rate) | DEC-133 | Per-km is a manager suggestion tool only; riders always pay the route flat fare |
| DEC-004 (three pickup tiers) | DEC-063, DEC-067 | Door-to-door dropped; two ticket types only |
| CH5 constraint F6 (arrival promise) | DEC-119 | No declared destinations → schedule adherence replaces per-rider promises |