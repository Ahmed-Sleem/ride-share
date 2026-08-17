# ARCHITECTURE ANALYSIS (append-only)

## A1 — Answer to "where does processing happen?" (user question D1, Q7)

### What the evidence says
1. Matching quality depends on GLOBAL knowledge — a match is only good if you can see all nearby
   requests and all nearby vehicles at once. A device only knows about itself. (R4.2, R4.4)
2. Batching requests for ~20-80s beats instant matching by a large margin (R4.5). Batching is only
   possible in a place where all requests arrive — i.e. the server.
3. Anything that decides MONEY or ASSIGNMENT must be server-authoritative, because clients can be
   modified, GPS can be spoofed, and drivers/riders have financial incentive to cheat.
4. But: Egyptian mobile networks are uneven, and low-end Android is common. A pure thin client
   breaks in tunnels, underground garages, and dead zones — exactly where pickups happen.
5. Sending every GPS ping to the server is the main cost driver in these systems; devices should
   filter/compress locally before transmitting.

### RECOMMENDATION: Hybrid, with a strict rule about WHO DECIDES
- SERVER decides, always and only: matching, pricing, fare splitting, routing plan, stop assignment,
  ETA published to users, payments, ratings, permissions, and every state transition.
- DEVICE handles, never authoritatively: map rendering, cached stop/POI data, GPS smoothing and
  noise filtering, "distance to my stop" display, local notifications, an OFFLINE OUTBOX that queues
  actions (I boarded / I arrived / I cancelled) and replays them with idempotency keys when the
  network returns, plus optimistic UI so the app never looks frozen.
- Rule of thumb to write into the spec: "If it affects money, safety, or who rides with whom, the
  server computes it. If it affects only what this one user sees right now, the device may compute it."
This is option B from MCQ Q7 and it is the recommendation. [Reasoned from R4.x + local network reality]

## A2 — Consequence for the algorithm service
The matching engine becomes a separate server-side service with a queue and a tick loop
(batch window), not a function called inside an HTTP request. This matters for the whole
backend design and will be specified in the algorithm chapter.

---

## A3 — Open-source candidates found (NOT yet vetted; gap G-010)

Recorded as CANDIDATES ONLY. Nothing enters the spec until licence/maintenance/security are checked.

| Candidate | What it is | Possible role | First impression |
|---|---|---|---|
| OSRM | C++ routing engine on OSM data | travel-time matrices, routes | Strong: fastest matrices (R5.1); rigid profiles |
| Valhalla | Routing engine, multi-modal, flexible | routing + isochrones | Strong: flexible, slower |
| GraphHopper | Routing engine, runtime custom models | routing for mixed vehicle types | Strong: good for multi-profile fleets |
| OpenTripPlanner (OTP) | Java multimodal planner, GTFS + GTFS-flex, LGPLv3 | fixed-route shuttle planning, transit integration | Very relevant to Mode 3 (shuttle timetables) |
| Google OR-Tools | Optimisation toolkit (VRP/CP-SAT), Apache-2.0 | the offline/scheduled VRP solver (Layer 4) | Best-in-class, well documented |
| FleetPy (TUM-VT) | Agent-based ride-pooling fleet SIMULATION framework | offline simulation to test our algorithm before launch | High value as a TEST HARNESS, not production code |
| DRTsim | Demand-responsive transport simulator (OTP + jsprit) | alternative simulator | Smaller, older; reference only |
| H3 (Uber) | Hexagonal geospatial index, Apache-2.0 | Layer-0 candidate pre-filtering, demand heatmaps | Standard tool for this job |
| Nafezly/payments | PHP/Laravel wrapper for Paymob/Fawry/Kashier/wallets | reference for Egyptian payment integration | Reference-only unless backend is PHP |
| icare (diowa) | Ruby open-source carpooling platform | reference for carpool domain model | Reference-only (Ruby, commercial-derived) |
| openride / LibreTaxi / assorted "Uber clones" | Small demo-grade ride-hailing apps | none | REJECT as a base: demo quality, stale, no pooling |

### A3-CONCLUSION (important, states the honest position)
There is NO open-source project that is "a pooled Uber you can just deploy". The mature open source
in this domain is INFRASTRUCTURE (routing engines, optimisation solvers, geo indexes, simulators),
not the product. So the correct strategy is:
  BUILD the product (accounts, booking, matching orchestration, payments, dashboards) ourselves,
  BUY/HOST the hard math (OSRM/Valhalla for routing, OR-Tools for optimisation, H3 for geo),
  SIMULATE with FleetPy before going live.
The "Uber clone" repos are a trap: they look like a shortcut and cost more than they save.

---

## A4 — Stack decision (delegated by user, DEC-011)

### Evidence gathered
Sources: metacto Expo alternatives 2026; agilesoftlabs Flutter vs RN 2026; dev.to RN/Flutter/Expo/Lynx
2026; mobisoftinfotech 2026; dev.to Redis geohashing; HN "best geospatial indexing for real-time".
- A4.1 Flutter reportedly leads raw performance (Impeller, ~350-450ms startup vs ~700-900ms) and has
       ~46% cross-platform market share vs React Native ~35-38% (Statista, cited 2026).
- A4.2 React Native's New Architecture (JSI, Fabric, TurboModules) is production-ready in 2026 and
       has "significantly closed the performance gap"; Expo SDK 55 (Feb 2026) makes it mandatory.
- A4.3 DECISIVE for us: Expo EAS Update ships JavaScript fixes to production WITHOUT app-store
       review. Flutter requires a full rebuild and store submission for any non-asset change.
- A4.4 Also cited in RN's favour: sharing code/logic with a React web frontend, and integrating
       JS-native services (Mapbox GL JS, Stripe.js, Firebase JS SDK).
- A4.5 Geospatial: consensus across sources is Redis GEO for hot real-time "who is near me" lookups
       (in-memory, sorted-by-distance, atomic) and PostGIS for authoritative persistence and real
       spatial logic. One commenter states explicitly: for ride-hailing-style nearby lookups Redis
       is a solid choice, for deeper spatial logic and long-term persistence PostGIS is better.

### AGENT DECISION (DEC-012) and WHY
Chosen: TypeScript everywhere + one Python service for optimisation only.

| Layer | Choice | Reason tied to THIS project |
|---|---|---|
| Rider app / Driver app | React Native + Expo (SDK 55+, New Architecture) | A4.3 is the killer argument: a 2-person team cannot wait days for app-store review to fix a live dispatch bug affecting real commuters. OTA updates are an operational safety net. |
| Web app + Admin dashboards | Next.js (App Router) | Same language and much shared logic with the apps; server-rendered pages needed for marketing/SEO to universities; dashboards are data-heavy web UIs, which is Next.js's home turf. |
| Backend API | NestJS (Node + TypeScript) | Opinionated modular structure = essential when tasks are handed to hired developers (DEC-007). Shares types with frontend via a shared package: one definition of "Trip" across the whole system. |
| Realtime | WebSockets (Socket.IO) + Redis pub/sub | Live vehicle positions, ride state pushes. |
| Primary DB | PostgreSQL 16 + PostGIS | Authoritative spatial + relational + transactional in ONE database. Stops, zones, routes, trips, money — all ACID. (A4.5) |
| Hot geo cache | Redis (GEO + streams) | Sub-millisecond "vehicles near this point" during matching; ephemeral by nature. (A4.5) |
| Routing / matrices | Self-hosted OSRM (+ Valhalla where flexibility is needed) | R5.1: ~21ms per 100x100 matrix vs ~2,500ms and ~$510/day on Google. Non-negotiable at our call volume. |
| Geocoding / autocomplete | Commercial provider (Mapbox or Google), behind an interface | R5.2: open-source autocomplete quality is not good enough for consumer address entry. Honest trade-off. |
| Offline optimiser | Python service using Google OR-Tools | Scheduled and recurring trips are solved overnight as a real VRP; OR-Tools is best-in-class and Apache-2.0. Only ONE non-TS service, isolated behind a queue. |
| Simulation / testing | FleetPy | Validate the matching engine against synthetic Alexandria demand BEFORE any real user rides. |
| Infra | Docker + managed Postgres/Redis, one cloud region near Egypt | Small team = managed services wherever it is not a differentiator. |

### Rejected and why (recorded so we never revisit blindly)
- Flutter: better raw performance, but no OTA updates and a third ecosystem for a 2-person team. The
  performance edge does not outweigh A4.3 for a logistics app that is mostly maps, lists and state.
- Full Python backend: would force a second language for the API layer; OR-Tools is the only real
  reason to want Python, and that is satisfied by one isolated service.
- MongoDB / NoSQL primary: this domain is deeply relational and money-bearing; PostGIS is the point.
- "Uber clone" repos: rejected in A3.
