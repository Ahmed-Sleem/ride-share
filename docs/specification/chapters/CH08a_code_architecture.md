# CHAPTER 8a — Code Architecture & Maintainability

Status: DRAFT v1. Implements DEC-068, DEC-069, DEC-070, DEC-071, and DEC-012 (stack).
Purpose: make change cheap and safe, especially when the work is done by hired developers who did
not design the system.

---

## 8a.1 The governing principle

> Every part of the system should be understandable on its own, changeable without fear, and
> impossible to break from a distance.

Three mechanisms deliver that: **module boundaries** (8a.2), **configuration instead of constants**
(8a.4), and **automated gates** (8a.6).

---

## 8a.2 Modular monolith (DEC-069)

One deployable backend application, internally divided into modules. Each module owns its data, its
rules and its public interface.

### Module list
| Module | Owns | Must never be touched by others |
|---|---|---|
| `identity` | users, roles, phone/OTP, sessions, permissions | password/OTP internals |
| `drivers` | driver profiles, documents, verification state machine | document storage |
| `vehicles` | vehicle registry, approval, fleet labels | approval state |
| `geo` | stops, zones, corridors, service areas, walking calculations | stop lifecycle |
| `journeys` | journeys, journey stops, publication, journey state machine | state transitions |
| `requests` | ride requests, offers, seat holds | offer expiry |
| `bookings` | bookings, boarding (QR), no-shows, booking state machine | state transitions |
| `matching` | the algorithm, batching, feasibility, assignment | internal solver |
| `pricing` | fare calculation, surcharge formula, quotes | formula internals |
| `payments` | wallet, ledger, refunds, payouts, providers | the ledger, absolutely |
| `promotions` | flash sales, rewards, referrals, campaigns | budget accounting |
| `notifications` | push/SMS/in-app delivery, templates, preferences | provider adapters |
| `analytics` | live occupancy, dashboards, reporting | read models |
| `support` | tickets, incidents, escalation | — |
| `audit` | append-only audit log | append-only, no deletes |
| `config` | versioned business configuration, scope resolution | version history |

### Boundary rules (enforced automatically, not by good intentions)
1. A module may only be used through its **public interface**; direct imports of another module's
   internals fail the build (enforced by lint rules / dependency-cruiser).
2. Modules communicate by **calling interfaces** or **publishing domain events** — never by reading
   each other's database tables.
3. Each module owns its tables. No cross-module foreign keys except to stable identity keys.
4. **No cycles.** If two modules need each other, a third concept is missing; find it.
5. Any module can be extracted into its own service later without changing its callers.

### Layering inside each module
```
module/
  api/         HTTP + WebSocket handlers — thin, no business logic
  application/ use cases, orchestration, transactions
  domain/      entities, value objects, business rules, state machines  ← the valuable part
  infra/       database, external providers, queues
  contracts/   the module's public interface + published events
  tests/       unit + integration tests for this module
```
Rule: `domain/` must have **no imports** from `infra/`. Business rules never know about databases,
HTTP or providers. This is what makes them testable and durable.

---

## 8a.3 The shared-types rule (why TypeScript everywhere pays off)
A single shared package defines every entity, request, response and event. The mobile app, the web
app, the admin dashboard and the backend all import the SAME definitions. A change to `Booking`
breaks the build everywhere it matters, immediately, at compile time — instead of at 7am in
Alexandria with real riders waiting.

---

## 8a.4 Configuration, not constants (DEC-070)

### The absolute rule
> If a business person could ever reasonably want to change it, it is CONFIGURATION, not code.

Configuration is stored in the database, versioned, scoped, and editable from the dashboard.

### Scope resolution
`global → country → city → corridor → route → vehicle class → time window`
Most specific wins. The dashboard always shows which level a value was inherited from.

### What must be configuration (non-exhaustive)
prices and base fares; the entire surcharge formula's variables; detour bands and budgets;
promise tolerance; wait time at a stop; walking preferences and weights; batch window length;
seat-hold duration; cancellation percentages and cutoffs; reward amounts and switches; referral
values; notification templates and timings; service-area activation; feature switches per city.

### What must NOT be configuration
security rules, permission definitions, state-machine legality, invariants, audit behaviour.
Those are code, reviewed and tested — a business user must never be able to switch off a safety rule.

### Configuration safety requirements
- Every change versioned, attributed, timestamped, with a mandatory reason.
- Validation on write (ranges, types, sanity limits — no accidental zero fare).
- **Preview before publish** against real recent journeys.
- Scheduled activation and automatic expiry.
- One-click rollback.
- **Historical correctness:** a past booking must always be explainable by the configuration that
  was live when it was made (INV-22). Configuration is never destructively overwritten.

---

## 8a.5 Event log as the backbone
Every meaningful action publishes an immutable domain event (INV-10). Events drive: analytics and
live dashboards, notifications, the audit trail, dispute resolution, and algorithm improvement
(DEC-050 "collect all the data"). Modules subscribe to events instead of calling each other, which
is what keeps the boundaries clean.

---

## 8a.6 Quality gates (DEC-071)

### One command verifies everything
`npm run verify` must run: type checking, lint (including module-boundary rules), unit tests,
integration tests, contract tests for the public interfaces, a build of every app, a secret scan,
and database migration checks. Required by the project rules §6.2. Nothing merges unless it passes.

### Testing requirements by area
| Area | Requirement |
|---|---|
| `domain/` business rules | Unit tests mandatory; pure functions, no mocks needed |
| Money (`payments`, `pricing`) | Highest bar: property-based tests, exact-value assertions, no floats for currency |
| State machines | Every legal transition tested; every illegal transition proven to be rejected |
| `matching` | Deterministic scenario tests + simulation runs (FleetPy) |
| API | Contract tests so the apps cannot silently break |
| UI | Build + type checks; critical flows covered end-to-end |

### Non-negotiables for hired developers (the contributor handbook)
- No business logic in HTTP handlers.
- No direct cross-module imports.
- No hard-coded business values.
- No money in floating point — integer minor units only.
- No swallowed errors; no `any`; no `console.log` in production paths.
- Every pull request: what changed, why, tests added, how it was verified.
- Every new module ships with its own README explaining why it exists.

---

## 8a.7 How work is handed to hired developers (DEC-007, DEC-013)
Each task is issued as a **work package** containing: the goal in one sentence, the module it lives
in, the interface it must implement, the business rules (with links to the decision IDs in the
register), acceptance criteria, required tests, and explicit out-of-scope notes. A developer should
never need to guess a business rule — if it is not written, that is a specification bug, not a
developer error.

---

## 8a.8 Open items
- ~~Q8a.1 Monorepo?~~ — CLOSED by DEC-085: monorepo with separate UI apps.
- ~~Q8a.2 first extraction~~ — CLOSED by DEC-167: `matching`, documented as intent only.
- ~~Q8a.3 config UI~~ — CLOSED by DEC-166: guided forms enforcing CH19 type/unit/range.
