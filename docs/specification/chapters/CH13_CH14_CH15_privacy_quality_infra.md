# CHAPTERS 13, 14, 15 — Privacy, Quality & Infrastructure

Status: DRAFT v1. Implements DEC-030, DEC-050, DEC-071, DEC-094, DEC-104..108.

===============================================================================
# CHAPTER 13 — Privacy & Data Governance
===============================================================================

## 13.0 Position
Legal interpretation is OUT OF SCOPE (DEC-030) — the user's legal team owns it. This chapter
specifies the TECHNICAL CAPABILITIES the system must have so that whatever the legal team decides
can actually be implemented.

## 13.1 What is collected (DEC-050 "collect all the data")
| Category | Examples | Sensitivity |
|---|---|---|
| Identity | phone, name, email, photo | high |
| Verification documents | national ID, licences, selfie | **highest** |
| Movement | GPS traces, stops used, journeys, times | **highest** (reveals home, work, routine) |
| Behaviour | searches, offers shown, offers declined, cancellations | medium |
| Money | bookings, fares, wallet, payouts, cash liabilities | high |
| Device | model, OS, app version, push token, coarse fingerprint | medium |
| Support | tickets, incident records, masked-call metadata | high |

## 13.2 Retention (DEC-094 — keep everything, indefinitely)
The user has chosen indefinite retention. The technical consequences are therefore mandatory,
not optional:
1. **Tiered storage, not tiered deletion.** Data older than a configured age moves to encrypted
   cold storage. Nothing is deleted; cost is controlled by where it lives (G-042).
2. **Separate movement store** with its own encryption key, distinct from the operational database.
3. **Pseudonymised analytics by default** — analytical queries see a hashed rider id;
   re-identification is a separate, audited, Super-Admin-only privilege.
4. **No bulk export without Super Admin approval**, always audited (CH2 §2.4).
5. **Deletion capability must exist** even if unused, because a regulator or court may compel it.
   Deleting a user ANONYMISES them while preserving financial and safety records (INV-9).
6. **Legal referral standing open**: indefinite retention of personal movement data must be cleared
   by the legal team against Egypt's PDPL (G-041). Flagged once, as required; not designed around.

## 13.3 Consent and transparency
- Plain-language privacy notice in Arabic and English, written for a normal reader.
- Explicit consent captured at signup, versioned — we must be able to prove WHICH version a user
  accepted and when.
- Granular controls where they do not break the service: marketing messages, personalisation.
  Ride-status messages and safety data are operationally essential and not optional.
- Users can view and export their own data.

## 13.4 Regulatory export capability (G-008)
Research (R1.5) indicated Egyptian ride-hailing rules require retaining trip data and providing it
to authorities on request. Whatever the legal position, the SYSTEM must be able to:
- produce a complete trip dataset for a defined period,
- do so without granting standing database access to anyone external,
- log every such export: who requested, who approved, what was included, when.

## 13.5 Access control summary
Identity documents: Ops Admin + Super Admin only. Movement history of another user: Super Admin
only, with reason. Money ledger: read for Manager (aggregate), write for nobody (append-only).
Bulk export: Super Admin approval, always audited.

===============================================================================
# CHAPTER 14 — Quality & Verification
===============================================================================

## 14.1 The single verify command (DEC-071, rules §6.2)
`npm run verify` must run, and all must pass before any merge:
type check · lint incl. module-boundary rules · unit tests · integration tests · contract tests ·
build of every app · database migration check · secret scan · dependency audit.

## 14.2 Testing bar by area
| Area | Bar |
|---|---|
| Domain rules | Unit tests mandatory; pure functions |
| **Money** | Highest: exact-value assertions, property-based tests, integer-only arithmetic, ledger-balance assertions |
| **State machines** | Every legal transition tested; every ILLEGAL transition proven rejected |
| **Matching** | Deterministic scenario tests + simulation (14.3) |
| API | Contract tests so apps cannot silently break |
| Offline sync | Tested against flaky networks, not just airplane mode (R13.7) |
| UI | Build + type checks; critical flows end-to-end |
| Accessibility | Screen-reader pass on core rider flows; RTL verified |
| Performance | Cold start <3s and crash-free ≥99% measured on the reference low-end device |

## 14.3 Simulation before launch (DEC-106, FleetPy)
Run against synthetic Alexandria demand to answer, with numbers rather than intuition:
- fleet size vs percentage of requests served,
- walking-distance sensitivity,
- optimal batch window per time of day (DEC-072),
- promise-tolerance setting (CH5 F6),
- street-pickup share at various surcharge levels (CH6a),
- what happens at 2x and 5x demand.
**No launch parameter may be set purely by intuition.**

## 14.4 Closed beta (DEC-108)
One corridor, real riders, real drivers, limited scale, for a defined period.
Explicit success criteria before going public: completion rate, on-time rate, rider return rate,
stop-findability failures, driver manifest errors, support contacts per 100 rides.
Beta findings are triaged as gaps in AUDIT_AND_TODO before any public launch.

## 14.5 Definition of Done (binding on every work package)
A task is done when: the code is merged, `verify` passes, tests genuinely exercise the behaviour,
documentation is updated, the audit entry is closed with evidence, and the implementation log has an
entry with commands and observed output. Nothing is "done pending tests".

===============================================================================
# CHAPTER 15 — Infrastructure & Cost
===============================================================================

## 15.1 Shape (DEC-104, DEC-105, DEC-107)
Self-managed VPS, region as configuration, database self-hosted with replica + off-site backups.

```
[ CDN / static ]     web app (Next.js)
        |
[ Load balancer ] -> API (NestJS, modular monolith, N containers)
                       |-- PostgreSQL 16 + PostGIS  (primary)  --> streaming replica
                       |-- Redis (geo index, cache, queues, pub/sub)
                       |-- OSRM (self-hosted routing + matrices)
                       |-- Optimiser service (Python + OR-Tools) — queue-driven
                       |-- Object storage (documents, stop photos) — encrypted
                       |-- Cold storage (aged movement data)
[ Monitoring / alerting / log aggregation ]  — mandatory from day one
```

## 15.2 Non-negotiable operational practices (DEC-104 mitigations)
1. **Infrastructure as code** — every server reproducible from the repository. No hand-built boxes.
2. **Automated encrypted off-site backups**, plus **documented restore drills** on a schedule.
   An untested backup is not a backup.
3. **Streaming replication** for the database (DEC-107).
4. **Monitoring and paging** from day one: uptime, error rate, latency, queue depth, disk space,
   certificate expiry, replication lag, backup success.
5. **Staging environment** mirroring production.
6. **Zero-downtime deploys** and a one-command rollback.
7. Region is configuration, never assumed in code (DEC-105) — data localisation may become a
   legal requirement.

## 15.3 Cost model (structure; figures to be filled with real quotes)
| Component | Driver of cost | Notes |
|---|---|---|
| API containers | request volume | scales horizontally |
| PostgreSQL primary + replica | data size, IOPS | the money ledger lives here |
| Redis | active vehicles and riders | memory-bound |
| OSRM | city graph size | R5.1: self-hosting avoids ~$510/day Google matrix costs |
| Optimiser | overnight VRP runtime | can run on a cheap burst machine |
| Object storage | documents + stop photos | grows steadily |
| Cold storage | indefinite retention (DEC-094) | the reason tiering exists (G-042) |
| SMS / OTP | logins and notifications | real per-message cost — the passcode option (DEC-028) reduces it |
| Payment provider fees | transaction volume | per-transaction + payout fees |
| Maps geocoding | address searches | the one paid map service (R5.2) |
Three sizing scenarios (pilot corridor / one city / multi-city) to be produced with real quotes
before launch.

## 15.4 Scaling path
1. Vertical first — bigger machines are cheaper than complexity.
2. Then horizontal API containers behind the load balancer.
3. Then read replicas for analytics so reporting never touches the hot path (R9.8).
4. Only then extract a module into a service — `matching` first, on CPU pressure (CH8a Q8a.2).

## 15.5 Open items
- Real cost quotes per scenario — EXTERNAL (vendor quotes needed)
- ~~Backup schedule~~ — CLOSED by DEC-164: nightly, retained 30 days, restore drill monthly.
- ~~OSRM deployment~~ — CLOSED by DEC-163: one instance per city.
