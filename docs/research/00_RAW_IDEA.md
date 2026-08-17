# DISCOVERY LOG (append-only)

## Session 1 — Raw idea as stated by the user (verbatim intent, cleaned wording)

The user wants to build "something like Uber, but each car can carry more than one person"
(shared / pooled rides). Key stated elements:

1. Special meeting points on the map where passengers and cars meet.
2. A very strong matching algorithm.
3. Admins with dashboards inside the app.
4. Admin-side entry of new cars with identifiers and properties (e.g. seat capacity).
5. Booking a trip in advance (one day or more before).
6. Recurring/periodic trips, e.g. daily commute to work.
7. The app must encourage people to use shared rides more than their current option.
8. Platforms: web (desktop + mobile responsive) AND a mobile app.
9. Account types: normal users, car/driver accounts, admin accounts; anyone can register a car.
10. Open architecture question: processing on server, on device, or hybrid.
11. Quality bar: every detail considered, nothing left vague.

Working rules for this project: MCQ-only questions with recommendations, append-only documentation,
strict step-by-step progress, deep research before decisions, final single master build document.

---

## Session 1 — Decision Batch 1 (confirmed by user via MCQ)

### D1.1 Product concept = TRI-MODAL HYBRID (user chose A + B + C together)
One platform hosting three supply modes simultaneously:
- MODE 1 "Commercial pooled ride": earning drivers, platform commission, on-demand + scheduled.
- MODE 2 "Commuter carpool": ordinary car owners on their existing route, cost-sharing, 2-3 passengers.
- MODE 3 "Managed shuttle/vanpool": operator- or admin-owned vans, defined vehicles/routes/stops, seat booking, B2B (employers, universities, compounds).
Implication: one shared core (identity, vehicles, matching, payments, trust) with mode-specific rules
layered on top. Must be designed as a MODE-AWARE platform from day one, not bolted on later.

### D1.2 Market = Alexandria (Egypt) first -> then Cairo -> then generic
- Launch city: Alexandria, Egypt.
- Second city: Cairo / Greater Cairo.
- Constraint: the system must be MARKET-AGNOSTIC in architecture (multi-city, multi-country,
  multi-currency, multi-language, pluggable payment providers, pluggable map/routing providers)
  so scaling to any new city is configuration, not re-engineering.
- Day-one localization: Arabic + English, full RTL, low-end Android support, weak-network tolerance.

### D1.3 Vehicle supply = BOTH entry doors, one registry
- Self-service registration by any car owner -> lands in an approval queue.
- Admins can also create vehicles/drivers directly (fleet mode).
- Single vehicle registry + single approval state machine serves both.

### D1.4 Pickup model = FULL HYBRID, system-decided, priced in tiers
- Tier 1 (base price): fixed meeting points / virtual stops. If no passenger is assigned to a stop,
  the driver is instructed to SKIP it (no wasted stop).
- Tier 2 (higher price): on-route curbside pickup — passenger is close enough to the car's path that
  the detour is small; costs more than a stop.
- Tier 3 (highest price): explicit door-to-door request; costs the most.
- The matching/pricing engine decides what is offered to each passenger, based on detour cost,
  walking distance, time of day and passenger profile (accessibility/elderly/night = auto-upgrade).

### D1.5 Risk noted by agent (for the audit file)
The tri-modal + tri-tier scope is roughly 2-2.5x a single-mode product. Mitigation to be proposed:
build ONE core with mode flags, and phase the launch (which mode ships first) rather than reducing
the architecture. Phasing decision will be raised in a later MCQ batch.

---

## Session 1 — Decision Batch 2 (confirmed by user via MCQ)

### D2.1 Go-to-market = universities first, then companies that own vehicles
- Primary launch channel: marketing inside UNIVERSITIES (Alexandria).
- Parallel channel: direct sales calls to COMPANIES THAT ALREADY OWN VEHICLES (they bring supply).
- Constraint restated by user: "the design must be ready and suitable for all" — the architecture
  must support all three modes from day one even if only some are switched on at launch.

### D2.2 Scope stance = FULL PRODUCT, not an MVP
- User explicitly does NOT want an MVP; wants the complete system.
- AGENT NOTE (audit G-009): "full product" and "two developers" are in tension. The resolution the
  agent will propose is: design and build the FULL architecture and the FULL data model with no
  shortcuts (nothing fake, nothing stubbed), but deliver it in strict vertical slices where each
  slice is production-complete. "Full thing" = no fake features, not "everything on day one".
  This must be confirmed with the user.

### D2.3 Team/resources = the user + the AI agent, open-source-first
- Two-person effective team.
- Explicit instruction: search GitHub and reuse/adapt existing open-source wherever it helps.
- Therefore: heavy bias to proven open-source components + managed services; minimal bespoke
  infrastructure; every adopted project must pass the rules-section-16 vetting (licence,
  maintenance, security, maturity).

### D2.4 Processing location = deferred to agent recommendation (see 02_ARCHITECTURE_ANALYSIS.md)
