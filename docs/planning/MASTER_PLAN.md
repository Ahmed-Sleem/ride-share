# MASTER PLAN — dependency-ordered chapter roadmap
(Answers DEC-018. Append-only. Each chapter is finished and confirmed before the next begins.)

## Why this order
Each chapter consumes the outputs of the ones above it. Building out of order causes rework:
you cannot price a trip before you know what a trip IS; you cannot design screens before you know
what states exist; you cannot pick infrastructure before you know the load the algorithm creates.

## Dependency graph (text form)
```
CH1 Glossary+Domain Model
      |
      +--> CH2 Roles, Accounts, Permissions
      |         |
      |         +--> CH3 Trip Lifecycle & State Machines
      |                   |
      |                   +--> CH4 Meeting Points & Geography
      |                   |         |
      |                   |         +--> CH5 THE ALGORITHM
      |                   |                   |
      |                   |                   +--> CH6 Pricing, Fares & Money Flow
      |                   |                             |
      |                   |                             +--> CH7 Incentives & Growth
      |                   |
      |                   +--> CH8 System Architecture & Platform Shape
      |                             |
      |                             +--> CH9 Data Model (schema) & API Contract
      |                                       |
      |                                       +--> CH10 UX: screens & flows per role
      |                                                 |
      |                                                 +--> CH11 Admin & Organization Dashboards
CH12 Trust, Safety & Security  (cuts across, written after flows are known)
CH13 Privacy, Legal & Compliance (Egypt + generic)
CH14 Quality: testing, simulation, verification
CH15 Infrastructure, DevOps, Cost model
CH16 Delivery plan: phases, work packages, hiring plan
CH17 Risk register & open questions
```

## Chapter list with purpose and key questions to resolve

| # | Chapter | Purpose | Major decisions it must settle |
|---|---------|---------|-------------------------------|
| 1 | Glossary & Domain Model | Define every noun precisely so we all mean the same thing | What is a Trip vs Ride vs Booking vs Route vs Journey? What is a Stop? An Organization? |
| 2 | Roles, Accounts & Permissions | Who exists and what they may do | Role list, verification levels, org membership, the single-app role detection |
| 3 | Trip Lifecycle & State Machines | Every state a booking/ride/driver can be in | Booking states, cancellation rules, no-show handling, recurring-trip generation |
| 4 | Meeting Points & Geography | The stops system | How stops are created, curated, ranked; zones; walking radius; the 3 pickup tiers |
| 5 | The Matching Algorithm | The core engine | Batch window, feasibility constraints, objective function, scheduled vs live, recurring |
| 6 | Pricing, Fares & Money Flow | How money moves | Fare formula per mode/tier, splitting among poolers, wallet, cash, payouts, refunds |
| 7 | Incentives & Growth | Make people switch | Rewards, streaks, university/corporate competitions, referrals, subsidies |
| 8 | System Architecture | How the software is shaped | Services, realtime, offline, the single-app role split, web-vs-native capabilities |
| 9 | Data Model & API | Buildable schema + endpoints | Tables, indexes, PostGIS types, REST/WS contract, events |
| 10 | UX Flows & Screens | Every screen for every role | Complete screen inventory, RTL, accessibility, low-end device rules |
| 11 | Admin & Org Dashboards | Operations tooling | Vehicle approval queue, live ops map, disputes, reporting, org self-service |
| 12 | Trust, Safety & Security | Nobody gets hurt or defrauded | KYC, verification, SOS, ratings, fraud detection, gender preferences, incident flow |
| 13 | Privacy, Legal & Compliance | Stay legal in Egypt and elsewhere | Egyptian data retention, PDPL, insurance, licensing posture per mode |
| 14 | Quality & Verification | Prove it works | Test strategy, FleetPy simulation, the mandatory verify command, acceptance criteria |
| 15 | Infrastructure & Cost | Run it affordably | Hosting, OSRM deployment, scaling plan, monthly cost model at 3 sizes |
| 16 | Delivery Plan | Actually build it | Phases, work packages for hired devs, hiring timing, definition of done |
| 17 | Risk Register | Know what can kill it | Ranked risks with mitigations, including the licence problem |

## Status tracker (updated as we go)
- [x] CH1  - [x] CH2  - [x] CH3  - [x] CH4  - [x] CH5  - [x] CH6
- [ ] CH7  - [ ] CH8  - [ ] CH9  - [ ] CH10 - [ ] CH11 - [ ] CH12
- [ ] CH13 - [ ] CH14 - [ ] CH15 - [ ] CH16 - [ ] CH17

## Assembly rule
Each finished chapter is appended to `MASTER_SPECIFICATION.md`, which is the final deliverable.
Chapters are written into `_working_docs/chapters/CH<nn>_<name>.md` first, then concatenated,
so a chapter can be revised without rewriting the whole document.
