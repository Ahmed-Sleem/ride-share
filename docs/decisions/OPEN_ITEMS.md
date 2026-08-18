# AUDIT_AND_TODO

## Open items (append-only)

| ID | Type | Description | Status |
|----|------|-------------|--------|
| G-001 | Scope risk | Addressed by DEC-110 (one corridor complete, then widen). Residual scope-vs-capacity risk is owned by the user per DEC-111/112. | CLOSED |
| G-002 | Legal | Researched (R1). HANDED OFF to legal team per DEC-030. | HANDED OFF |
| G-003 | Data | RESEARCHED (R16): a PLOS ONE study names Egypt among the worst OSM coverage (<1/3 of streets, 2017), BUT dense cities and main roads are the best-mapped, and our design (verified stops, operator routes on main corridors, no door-to-door) is largely insulated. Converted to a PHASE-2 ENGINEERING TASK: measure the Alexandria extract before committing to self-hosted OSRM. | TASK — Phase 2 |
| G-004 | Payments | CLOSED — R10 researched the rails; CH6 specifies the ledger, all payment methods behind one interface, and the exact cash sequence (DEC-078). | CLOSED |
| G-005 | Algorithm | CLOSED — CH5 v2 specifies the full 6-stage pipeline for on-demand, scheduled, recurring and route-ticket operation. | CLOSED |
| G-006 | Legal/strategy | HANDED OFF — licensing strategy belongs to the user's legal team (DEC-030). Recorded once in CH17 R-2; the technical system can satisfy per-driver permits, vehicle age limits and trip-data export whatever they decide. | HANDED OFF — legal team |
| G-007 | Data | Merged into G-003 (same task): download the Alexandria Geofabrik extract, verify launch corridors, turn restrictions, one-ways and walking routes; benchmark OSRM times against a commercial provider; contribute upstream fixes. | TASK — Phase 2 |
| G-008 | Legal/technical | SPECIFIED — CH13 §13.4 defines the technical export capability: scoped export, no standing external access, every export logged with requester/approver/scope. | SPECIFIED |
| G-009 | Scope | RECLASSIFIED: hiring and timeline are out of scope (DEC-111, DEC-112). Recorded once as a standing user-owned risk in CH17. Agent will not re-raise. | HANDED OFF — user |
| G-010 | OSS vetting | CLOSED by DEC-143 — components vetted at adoption, recorded in the implementation log. | CLOSED |
| G-011 | Architecture | CLOSED by DEC-085 — rider+driver remain ONE Expo app (DEC-014 preserved) with role-adaptive UI; driver permissions requested only on driver activation; role code lazy-loaded. Native app provides the background GPS the browser cannot. | CLOSED |
| G-012 | Delivery | CLOSED by DEC-085 — web serves riders, public site and dashboards; driving requires the native app. Web still supports driver signup, documents, schedule and earnings. DEC-015 (web first) survives as a SEQUENCING preference, now reconciled with platform reality. | CLOSED |
| G-013 | Product risk | Transfers: CLOSED by DEC-025 — no transfer entity; each leg is an independent Booking, refunded independently. Residual stranded-rider risk moved to G-015. | CLOSED |
| G-014 | Go-to-market risk | Booking-for-others: CLOSED by DEC-024 — strict self-booking only. Accepted loss: school transport, parent-for-student, HR-for-visitor. | CLOSED (accepted) |
| G-015 | Trust/safety | CLOSED by DEC-135 — multi-leg suggested normally; each leg independent; failed leg refunded like any other failure. User's rationale: same risk profile as a single leg. | CLOSED |
| G-016 | Security | CLOSED by DEC-032 — Support Agent role added with limited, explicitly-bounded powers. | CLOSED |
| G-017 | Legal (CRITICAL) | Product is an OPEN PUBLIC ride service (DEC-029), which per research R1.x sits inside Egypt's ride-hailing law. HANDED TO THE LEGAL TEAM per DEC-030. Not designed by the agent. Remains listed so it is never forgotten; the technical system must be able to satisfy whatever the legal team requires (per-driver permits, vehicle age limits, trip-data retention/export). | HANDED OFF — legal team |
| G-018 | Product gap | CLOSED by DEC-033 — three combined paths: self-registering fleet drivers, admin-entered vehicles, and an optional admin-only fleet label for grouping. | CLOSED |
| G-019 | Contradiction | CLOSED by DEC-039 — driver is the accountable entity, vehicle is a declared+approved attribute, no ownership enforcement. DEC-036 superseded, INV-12 revoked. | CLOSED |
| G-020 | Launch workload | CLOSED by DEC-040 — dedicated mapping team resourced by the user; internal Stop Mapping Tool becomes a required product component (see G-022). | CLOSED |
| G-022 | Required tooling | SPECIFIED — CH4 §4.4 (capabilities) and screens O-18/O-19 (desk + offline field mode). Now a BUILD TASK in Phase 2, not a spec gap. | SPECIFIED |
| G-021 | Product capability | CLOSED by DEC-043 — mandatory name+location, optional night-safe/accessible flags, photos and description. | CLOSED |
| G-023 | New scope | SPECIFIED — all five Manager surfaces exist: live occupancy (G-10), coverage board (G-11), pricing control (G-13), promotions (G-15), campaigns (G-17), plus alerting throughout. | SPECIFIED |
| G-024 | Design gap | CLOSED by DEC-134 — no walking rule; boarding points listed sorted by honest walking time, one recommended. | CLOSED |
| G-025 | Product quality | CLOSED by DEC-141 — kept as decided, instrumented (complaints + ratings by vehicle size), reviewed after the closed beta. | CLOSED (measuring) |
| G-026 | Design gap | CLOSED by DEC-136 — the always-visible numeric code is the fallback; manifest confirm remains as an audited override. | CLOSED |
| G-027 | Privacy/cost | CLOSED by DEC-137 — collect everything including in-app behaviour; indefinite retention with cold-storage tiering; security mitigations in CH13 §13.2 / CH12 §12.7. | CLOSED |
| G-028 | Business risk | CLOSED by DEC-130 — guarantee failure pays full day credit + compensation credit, amounts Manager-configurable. Unblocks screen R-51. | CLOSED |
| G-029 | Efficiency risk | CLOSED by DEC-084 — treated as a human/driver judgement, not system logic; app shows consequences to inform the driver. Original note: DEC-052 sets a 10-minute wait. Every minute waited is inflicted on all riders on board and all downstream stops. Mitigations to consider: only allow long waits when the vehicle is empty/near-empty, or when no downstream promise is breached; show riders on board what is happening. | CLOSED |
| G-030 | Strategy | CLOSED by DEC-057 — map city-wide, operate university routes first, expand via Manager dashboard. | CLOSED |
| G-031 | Business risk | CLOSED by DEC-141 — kept as decided, instrumented from day one, reviewed after the closed beta. | CLOSED (measuring) |
| G-032 | Required capability | SPECIFIED — CH4 §4.5 (manager-controlled activation), CH8 §8.5 (runtime configuration, no deploy), screen O-21/O-23. | SPECIFIED |
| G-033 | Design detail | CLOSED by DEC-133 — per-km is a manager pricing-suggestion tool only; riders always pay the route flat fare. | CLOSED |
| G-034 | Growth mechanic | CLOSED by DEC-139 — shareable link with sharer code; reward on the joiner's COMPLETED ride. | CLOSED |
| G-035 | Design detail | CLOSED by DEC-140 — unavailable boarding points greyed with a plain reason; boarding fixed to stops, alighting free anywhere on the route. | CLOSED |
| G-036 | Supply risk | MONITOR — fairness weight exists as configuration defaulting to 0; track driver earnings distribution and churn by decile after launch. | MONITOR |
| G-037 | CONFLICT | CLOSED by DEC-083 — multi-seat booking allowed under one rider's name. Original: F-38: DEC-024/INV-11 (book only for yourself) blocks a rider booking multiple seats for friends travelling together — a normal everyday case that Swvl supports. Needs a decision. | CLOSED |
| G-038 | Accessibility | CLOSED by DEC-136 — the numeric code is always present and screen-reader accessible, giving blind/low-vision riders a non-visual boarding path. | CLOSED |
| G-039 | Operational | CLOSED by DEC-142 — software behaviour in CH12 §12.6 plus a detailed Operations Runbook (CH18) in the master document. | CLOSED |
| G-040 | Local reality | CLOSED by DEC-118 — wall-clock scheduling (DST-safe), Ramadan mode, holiday calendar that auto-pauses subscriptions. Implementation detail lands in CH5/CH6 rewrites. | CLOSED |
| G-041 | Legal (CRITICAL) | DEC-094 keeps all personal movement data indefinitely. This must be explicitly cleared by the user's legal team against Egypt's data-protection law (PDPL) and any sector rules. The agent has flagged it once, as required; it is not designed around. | HANDED OFF — legal team |
| G-042 | Cost | SPECIFIED — CH13 §13.2 (tiered storage, not tiered deletion) and CH15 §15.3 (cold storage as a cost line). Real quotes still needed at build time. | SPECIFIED |
| G-043 | Security | SPECIFIED — CH12 §12.7 (separate encrypted movement store, pseudonymised analytics, Super-Admin-only bulk export) and CH13 §13.2. | SPECIFIED |
| G-044 | Safety (important) | CLOSED by DEC-138 — 10% report rate over a 100-ride rolling window with a 20-ride minimum triggers human review; severe categories suspend immediately; category clustering escalates; no automatic deactivation, appeal required. | CLOSED |
| G-045 | Operational risk | DEC-104 self-managed VPS: mitigations defined in CH15 §15.2 (infra-as-code, tested restores, monitoring, staging). Staffing/costing is user-owned per DEC-111/112. | CLOSED (mitigations specified) |
| G-046 | Data loss risk | CLOSED by DEC-107 — self-hosted with live replica + automated off-site backups + documented restore drills. | CLOSED |
| G-048 | Product gap | CLOSED by DEC-114 — the question dissolved: no destination is declared, so there is nothing to change. The rider simply stays on longer or gets off earlier, signalling per DEC-117. | CLOSED |
| G-050 | Documentation | CLOSED — master regenerated as v1.1, then v1.2 after the route-ticket rewrites. | CLOSED |
| G-047 | Product gap | CLOSED by DEC-113 — no automatic surge; manager-initiated temporary price changes only. | CLOSED |
| G-049 | Product gap | CLOSED by DEC-118 — wall-clock scheduling, Ramadan mode, holiday calendar. | CLOSED |
| G-051 | MAJOR MODEL CHANGE | CLOSED — DEC-115/116/117 decided the model; CH5, CH9 and CH10 all rewritten to v2 for the route-ticket model. | CLOSED |
| G-052 | Algorithm | CLOSED by DEC-119 — F6 replaced with SCHEDULE ADHERENCE (`MaxScheduleSlip` against the published route timetable). CH5 v2 written. | CLOSED |
| G-053 | Launch metric | MONITOR — instrument alighting-signal usage rate from day one (analytics G-18); if low, make the control more prominent or revisit DEC-116. | MONITOR |
| G-054 | CONTRADICTION (major) | CLOSED by DEC-132 — Model M3 adopted. Swept and fixed across 8 areas: CH02 permissions, CH01 model table + SupplyPolicy, CH03 journey states (CLAIMED), CH05 slot awareness, CH09 route_slots/slot_claims/endpoints/INV-32-33, CH10c driver claim screens (D-11/D-12), CH10d O-23 slot management + G-11 coverage board. | CLOSED |
| G-055 | Delivery risk | DEC-147 (push only, no SMS fallback) means a rider on a poor connection may never receive "your vehicle has arrived". Mandatory mitigations: local scheduled-time alarm that fires without a live push; cached waiting screen; instrumented push-delivery failure rate reviewed weekly. If failure rates are material after the beta, revisit DEC-147 for boarding-critical messages only. | MONITOR |
| G-056 | Safety risk | DEC-157 declines periodic driver face-match, accepting the risk of ACCOUNT SHARING (an unverified person driving on an approved account). Compensating controls: strict onboarding (DEC-035), incident flow (DEC-138), GPS/behaviour anomaly detection. Monitor for signals of shared accounts (device changes, driving-pattern shifts, rider reports of "a different driver"). Revisit if any signal appears. | MONITOR |
| G-057 | Deferred | OSM survey (G-003/G-007) is DEFERRED by DEC-174 — a commercial map provider removes it from the launch path. It returns only if/when self-hosted OSRM is adopted for matrix volume. | DEFERRED |
| G-058 | Deferred | BUILD_PLAN Phases 2-8 are unwritten. P0 and P1 are complete and remain valid. Resume after GUI approval (DEC-175). | **CLOSED** — Phases 2-8 written (P2 geography, P3 routes/slots/journey, P4 safety, P5 commercial, P6 recurring, P7 Capacitor APK, P8 validation/launch). |
| G-059 | Open question | Driver recommendation display (single number vs number-with-source) was not resolved before the priority change. | **CLOSED** — resolved as *a number with its evidence*: "12 · 12 riders searched this slot yesterday". Satisfies the request for a single figure without a confident forecast built on no data (§8 decorative placeholder prohibition). Enforced by test "the recommendation states its evidence" with a break case. |
| G-060 | Open | Product name (DEC-128) is still the placeholder **Sekka**; no trademark check done. Blocks the Play Store listing and the GitHub repository name, not development. | OPEN |
| G-061 | Open | PostGIS is DEFERRED (DEC-184). Geo features (stops, corridors, matching) land in M2. Decision required then: (a) PostGIS-capable host once off the free trial, or (b) numeric lat/lng columns + OSRM/geocoder with no spatial extension. Until then, migration 0001 is a baseline and no geo code exists. | OPEN — decide at M2 |
| G-062 | Scale monitor | DEC-186 removed Redis. Clause 1 (distributed rate limiting) is **RESOLVED by DEC-195** — the throttler now keeps its state in PostgreSQL (`throttle_records`), so limits survive restarts and are shared across instances. Clause 2 (pub-sub fan-out latency at volume) remains MONITOR — LISTEN/NOTIFY stays correct; measure delivery latency only with measured evidence. | MONITOR (clause 2 only) |
