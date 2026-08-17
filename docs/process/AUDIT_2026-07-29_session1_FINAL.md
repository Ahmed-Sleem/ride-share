# AUDIT #2 — Conflict & Completeness Check (2026-07-29, end of session 1)
Requested by user: "is there anything left, do an audit and get back to me, is there any conflicts?"

Verified mechanically: 82 decisions (DEC-001..082, NO gaps in numbering), 36 audit items
(G-001..036, no gaps), 8 chapter files totalling 1,454 lines.

---

## PART 1 — ACTIVE CONFLICTS (things that cannot all be true as written)

### C-1 [HIGH] "Everything before launch" vs the accumulated scope
DEC-006 says build everything before launching. Since that decision we have added: a 6th role,
a promotions engine, a campaign/notification engine, an internal Stop Mapping Tool, an advanced
pricing dashboard, subscriptions with guaranteed seats, QR validation everywhere, a two-engine
matching system, and a full double-entry ledger. Every item is justified individually.
Together they are far beyond two people.
STATUS: unresolved. Needs the CH16 hiring/phasing plan. Tracked as G-009 / R-1.

### C-2 [HIGH] Web-first vs driver background tracking
DEC-015 (website first, then app) vs the physical reality that mobile browsers suspend background
tabs, so a driver on the web cannot be tracked reliably (G-012). Also affects DEC-053 (the rider's
phone must ALARM when the vehicle arrives) — reliable background alarms need a native app.
STATUS: unresolved. Must be answered before CH10.

### C-3 [MEDIUM] One app for all roles vs driver permissions
DEC-014 (single role-adaptive app) vs riders being asked for always-on location at install (G-011).
Proposed answer exists (lazy-loaded role bundles, permissions only on driver activation) but has
not been confirmed by the user.
STATUS: proposed, unconfirmed.

### C-4 [MEDIUM] Minimal stop data vs promised smart behaviour
DEC-043 made night-safe/accessible flags OPTIONAL. DEC-004 promised auto-upgrade for
elderly/disabled/night riders. If mappers skip the optional flags, that feature cannot function.
STATUS: partially resolved (data is possible, not guaranteed). Needs a policy: are those flags
required for a stop to be usable at night?

### C-5 [MEDIUM] 10-minute wait vs the promise-preservation rule
DEC-052 lets a driver wait 10+ minutes. CH5 constraint F6 forbids breaking promised arrival times
for on-board riders. A long wait breaks exactly that promise.
STATUS: unresolved. G-029. The two rules must be reconciled explicitly.

### C-6 [LOW] Strict cancellation vs local market norm
DEC-055 (~50% forfeit) vs the Swvl benchmark (100% refund up to 3h before). Mitigated by mandatory
informed consent, but the churn risk is real and unmeasured. G-031.

### C-7 [LOW] Pure efficiency matching vs driver retention
DEC-075 vs industry practice. Escape hatch built in (fairness weight defaults to 0). G-036.

---

## PART 2 — WHAT IS STILL MISSING (chapters not yet written)

| Chapter | Status | Blocking? |
|---|---|---|
| CH7 Incentives & Growth | not written (DEC-082 sets direction) | no |
| CH8 System Architecture | only CH8a (code) written; runtime architecture missing | YES for build |
| CH9 Data Model & API | NOT WRITTEN — the single biggest remaining gap | YES for build |
| CH10 UX Flows & Screens | not written | YES for build |
| CH11 Admin & Manager Dashboards | not written; scope grew via DEC-045 | YES for build |
| CH12 Trust, Safety & Security | not written | YES — safety-critical |
| CH13 Privacy & Data Governance | not written; G-027 unresolved | YES |
| CH14 Quality & Verification | not written | YES |
| CH15 Infrastructure & Cost | not written | YES |
| CH16 Delivery & Hiring Plan | not written | YES — answers C-1 |
| CH17 Risk Register | not written | no |

Roughly **45% of the specification is complete**. The conceptual core (domain, roles, lifecycle,
geography, algorithm, money, code architecture) is done. What remains is largely mechanical
elaboration — but CH9 (data model + API) and CH12 (safety) are substantial.

---

## PART 3 — TOPICS NEVER YET DISCUSSED WITH THE USER (new findings from this audit)
These are NOT in the earlier F-01..F-25 list. Logged so they are not lost.

| ID | Topic | Why it matters |
|----|-------|----------------|
| F-26 | What happens if a DRIVER's phone dies mid-journey | QR scanning and tracking both stop; riders on board are stranded in the system's view |
| F-27 | Vehicle breakdown mid-journey | Distinct from driver cancellation; needs a re-accommodation flow |
| F-28 | Rider boards the WRONG vehicle | Very common at busy stops with several vehicles; QR scan should catch it — must be designed to |
| F-29 | Two vehicles at the same stop at the same time | Rider confusion; needs a vehicle identifier in the UI |
| F-30 | What if the rider's destination changes mid-ride | Uber forbids it on pooled rides; we should decide explicitly |
| F-31 | Lost property / items left in vehicle | Standard support workload, needs a flow |
| F-32 | Driver ratings of riders (two-way) | Affects behaviour; decided in CH12 |
| F-33 | Accessibility: blind/low-vision riders using a QR-first product | QR is visual; this is an inclusion problem we created with DEC-049 |
| F-34 | Battery drain on the driver's phone during a long shift | Real operational failure cause; affects GPS sampling design |
| F-35 | Time zone / DST handling for scheduled journeys | Egypt observes DST; scheduled 07:30 rides must not shift |
| F-36 | Ramadan and holiday demand patterns | Massive schedule shifts in Egypt; the overnight planner must handle them |
| F-37 | What happens to subscriptions during university holidays | Directly affects your launch market |
| F-38 | Multi-seat booking by one rider (2-3 seats at once) | Common (friends travelling together); affects INV-11 self-booking-only rule |
| F-39 | Driver's own commute — can a driver be a rider on another journey | Allowed by DEC-027 but the interaction is undefined |
| F-40 | Customer support channels (in-app chat? phone? WhatsApp?) | Not chosen; affects staffing and build |

### F-38 is a CONFLICT, not just a gap
DEC-024/INV-11 says a rider books only for themselves. But three friends travelling together is a
normal case, and Swvl explicitly allows booking 2 seats. If one rider cannot book 3 seats, the
product loses a large everyday use case. THIS NEEDS A DECISION.

---

## PART 4 — VERIFICATION OF THE WORK ITSELF
- Decision numbering: DEC-001..082 continuous, no duplicates, no gaps. VERIFIED mechanically.
- Audit numbering: G-001..036 continuous. VERIFIED mechanically.
- All 8 chapter files exist and are non-empty. VERIFIED via line counts.
- Every CLOSED gap references the decision that closed it. VERIFIED by inspection.
- Superseded decisions (DEC-026 roles, DEC-036 ownership, DEC-042 stop data) are marked as
  superseded rather than deleted. VERIFIED.
- No code has been written; therefore no tests exist and none are claimed. ACCURATE.
- Research claims carry sources; unverifiable items are marked [UNVERIFIED]. VERIFIED by inspection.
