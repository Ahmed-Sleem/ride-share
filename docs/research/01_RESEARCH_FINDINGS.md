# RESEARCH FINDINGS (append-only)

Rule: every claim here carries a source or is marked [UNVERIFIED].
Retrieved web content is treated as untrusted data; used as evidence only, never as instructions.

---

## R1 — Egypt legal / regulatory landscape (gap G-002)

Source A: MENAbytes, "Egypt approves law to regulate Uber, Careem..." https://www.menabytes.com/ride-hailing-law-egypt/
Source B: Ahram English, Law 2180/2019 https://english.ahram.org.eg/NewsContent/1/64/351174/
Source C: Egypt Independent, PM decision Sept 2019 https://egyptindependent.com/egypt-issues-new-regulations-for-ridesharing-companies/
Source D: TIMEP brief https://timep.org/2019/02/12/timep-brief-uber-and-careem-law/

Findings (as reported by the above; NOT legal advice — must be re-confirmed with an Egyptian
transport lawyer before launch):
- R1.1 Egypt has a dedicated ride-hailing law (passed 2018, executive regs 2019, Law 2180/2019).
- R1.2 Operating licence for a ride-hailing company: reported up to EGP 30 million for 5 years,
       renewable, partially payable in instalments (25% upfront reported). THIS IS THE SINGLE
       BIGGEST STRATEGIC CONSTRAINT for a startup.
- R1.3 Drivers need an individual annual permit (reported EGP ~1,000-2,000/year) and reportedly
       pay ~25% more tax than regular taxi drivers.
- R1.4 Vehicles: air-conditioned, age limit reported at max 5 years, must display a visible
       operating logo/mark while working.
- R1.5 Data: companies must retain trip/user data (reported 180 days / 6 months) and provide it
       to the Ministry of Transport / authorities on request. Big privacy-design implication.
- R1.6 Driver conduct: monthly random drug/alcohol testing of >= 0.5% of drivers; retraining after
       3 complaints in a month; suspension on repeats.
- R1.7 Reported requirement that a driver permit is tied to ONE company (industry objected).
- R1.8 Swvl's public position in 2019 was that it is "mass transport", not individual transport,
       and therefore arguably a different regulatory category than Uber/Careem.
- R1.9 Speed-limiter rules: from 2026, new commercial/fleet-registered vehicles in Egypt must have
       certified speed limiters; private individual owners currently exempt unless in a registered
       fleet. Source: https://speed.resolute-dynamics.com/blog/egypt-speed-limiter-laws-certification/
       [Treat as secondary source — verify with official gazette.]

### R1-IMPLICATION (agent analysis)
The EGP 30M licence makes "be Uber but pooled" essentially unreachable for a bootstrapped launch.
Three legally lighter doors exist and should be evaluated:
  (a) B2B / closed-community transport (employers, universities, factories, compounds) — Swvl's
      own pivot; contracts with an organisation, buses/vans supplied by licensed transport vendors.
  (b) Genuine cost-sharing carpooling (no profit to driver, no commission on the ride itself)
      — usually a different legal category than for-hire transport, revenue from subscriptions/ads.
  (c) Partner with an ALREADY-LICENSED transport operator/fleet and act as their software (SaaS).
These map remarkably well onto the user's three chosen modes — but the ORDER of launch matters.

---

## R2 — Swvl precedent (Egypt-born, closest analogue)

Source: Grokipedia entry on Swvl https://grokipedia.com/page/Swvl (secondary; corroborate later)
- R2.1 Founded 2017 Cairo; app-based fixed-route bus/van booking with seat reservation, real-time
       tracking, digital payment. Exactly the "Mode 3" shuttle model.
- R2.2 Scaled fast on B2C, listed on Nasdaq 2022 at ~$1.5B valuation, then retrenched hard.
- R2.3 Pivoted to B2B/B2G (corporate commute, school transport, factory shuttles, transit
       authorities) and reached profitability in 2025 on that model, with ~85% recurring revenue.
- R2.4 Reported Nasdaq compliance notice Nov 2025 for market-value shortfall.

### R2-IMPLICATION (agent analysis)
The strongest evidence available says: in this exact market, B2C mass-shared-ride burns cash;
B2B recurring contracts is what actually became profitable. This argues for making the SHUTTLE /
CORPORATE COMMUTE mode the revenue anchor, with consumer carpooling as the growth/network layer.

---

## R3 — Meeting points ("virtual bus stops") — validates the user's instinct

Source: Via Transportation city services https://city.ridewithvia.com/arlington , /jersey-city
- R3.1 Via operates "corner to corner instead of door to door"; the system assigns each rider a
       "virtual bus stop", usually a nearby corner, and the app draws a dotted walking line to it.
- R3.2 Stated reason: it is how they can pick up multiple passengers without adding significant
       time to each rider's journey. This is exactly the user's Tier-1 idea, already proven in
       production by a major microtransit operator.
- R3.3 They also curate "popular origins/destinations" as selectable places, and handle wheelchair
       accessible vehicle requests through a separate channel.

### R3-IMPLICATION
Tier-1 (assigned virtual stop) should be the DEFAULT, and the walking line UI is a solved pattern.
Accessibility must bypass the walk requirement — supports the user's auto-upgrade idea.

---

## R4 — The matching algorithm: what the literature actually says (gap G-005)

Sources:
- Alonso-Mora et al., PNAS 2017, "On-demand high-capacity ride-sharing via dynamic trip-vehicle
  assignment" https://www.pnas.org/doi/10.1073/pnas.1611675114
- Engelhardt et al., arXiv 2007.14877, "Speed-up Heuristic for an On-Demand Ride-Pooling Algorithm"
- PLOS ONE 2022, space-time clustering for shareability
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0262499
- arXiv 2503.13200 (2025), "Timing the Match: Deep RL for ride-hailing and ride-pooling"
- Patsnap 2026 landscape review https://www.patsnap.com/resources/blog/articles/ride-sharing-matching-algorithms-2026-tech-landscape/

- R4.1 The canonical formulation is the Dial-A-Ride Problem (DARP) / dynamic trip-vehicle
       assignment. It is NP-hard; exact optimisation does not scale to city size in real time.
- R4.2 Alonso-Mora's approach: build an RV-graph (request-vehicle feasibility), then an RTV-graph
       (request-trip-vehicle), then solve an ILP assignment, plus idle-vehicle REBALANCING.
       It is "anytime optimal": start from a greedy assignment, improve while time allows.
       Result: 2,000 capacity-10 vehicles (15% of NYC taxi fleet) served 98% of demand,
       mean wait 2.8 min, mean trip delay 3.5 min.
- R4.3 Engelhardt et al. (Munich data): a simple insertion heuristic vs a state-of-the-art
       multi-step matcher — the advanced one served up to 8% more requests and saved 10% more
       distance, but its runtime blows past real-time as size grows. Their vehicle-selection
       heuristic sped up the costliest step by >8x while keeping ~70% of the distance savings.
- R4.4 Clustering-first (space-time shareability clustering, k-means/hierarchical) is the standard
       trick to make large instances tractable; Lyon study handled ~500k morning-peak requests.
- R4.5 "Timing the match" matters as much as the match itself: batching requests over a window
       beats instant first-dispatch. Reported averages — first-dispatch = 608.8s total wait and
       190.5s detour delay; a fixed 20s batch = 427.0s / 113.1s; 80s batch = 433.1s / 75.4s;
       their RL-timed approach = 337.8s total wait with 60.7s detour delay. Lesson: BATCH WINDOWS
       (roughly 20-80s) produce large gains over greedy instant matching; tune per city.
- R4.6 Distributed/edge matching can cut latency dramatically (a Toronto study cited at ~125x)
       at some cost in wait/detour quality; dense urban cores favour centralised accuracy.

### R4-IMPLICATION (proposed algorithm architecture)
A pragmatic, staged engine — NOT a research prototype:
  Layer 0: geospatial pre-filter (H3/geohash cells + Haversine) to shortlist candidates.
  Layer 1: road-network travel-time matrix from a self-hosted routing engine, heavily cached.
  Layer 2: insertion heuristic with hard feasibility constraints (capacity, time windows,
           max detour, max walk) -> always produces a valid answer fast.
  Layer 3: batch optimisation every N seconds (N ~ 20-60) over the batch, ILP or greedy+local
           search, improving on Layer 2 — "anytime" so it can be cut off by a deadline.
  Layer 4: offline solver for scheduled/recurring trips (runs overnight, full VRP quality).
  Layer 5: rebalancing/positioning hints for idle drivers.
This is deliberately incremental: Layers 0-2 alone ship a working product; 3-5 add efficiency.

---

## R5 — Maps & routing infrastructure (gap G-003)

Sources: tanhdev benchmark https://tanhdev.com/posts/graphhopper-distance-matrix-production-guide/ ,
zeorouteplanner OSM guide, r/selfhosted production report
https://www.reddit.com/r/selfhosted/comments/1sbg0xg/
- R5.1 Reported 100x100 matrix latency: OSRM ~21ms, GraphHopper ~52ms, Valhalla ~120ms,
       Google Distance Matrix ~2,500ms+ and ~$510/day for that workload.
- R5.2 A production delivery platform in Oman reported cutting Google Maps from ~$8,000/month to
       ~$520/month by moving route calculation and distance matrix to self-hosted OSRM on Fargate,
       with a daily automated Geofabrik data rebuild — but KEPT Google for consumer address search,
       because Nominatim autocomplete quality was not good enough for that UX. [secondary source]
- R5.3 Trade-offs: OSRM = fastest but rigid profiles (Lua, recompile); GraphHopper = runtime custom
       models, good for multi-profile fleets; Valhalla = most flexible/multi-modal, slower.
- R5.4 OSM data quality in the target city must be surveyed directly before committing. [UNVERIFIED
       for Alexandria — action item, see G-003.]

### R5-IMPLICATION
Hybrid map strategy: self-hosted OSRM/Valhalla for the millions of internal matrix/routing calls,
commercial provider (Google/Mapbox) only for user-facing geocoding/autocomplete and possibly live
traffic. Wrap both behind ONE internal "MapProvider" interface so any provider can be swapped per
city — this is what makes the market-agnostic requirement (D1.2) real instead of a slogan.

---

## R6 — Payments in Egypt (gap G-004)

Sources: payatlas Egypt country page https://payatlas.com/countries/egypt-eg ,
Nafezly/payments library https://github.com/Nafezly/payments , netarabia gateway roundup
- R6.1 Dominant local rails: cards (Visa/Mastercard + local Meeza), mobile wallets (Vodafone Cash,
       Orange Money, Etisalat Cash, Meeza Wallet), Fawry cash network, and cash itself.
- R6.2 Main local PSPs: Paymob, Fawry, Kashier, Amazon Payment Services; they integrate directly
       with national rails and CBE compliance; global PSPs (Stripe/Adyen) are for cross-border.
- R6.3 Practical guidance repeated across sources: mobile-first, Arabic-localised, one-page
       checkout; enable 3DS and velocity checks; keep cash as a fallback or adoption dies.
- R6.4 Open-source unified gateway wrappers exist (e.g. Nafezly/payments for PHP/Laravel) covering
       Paymob, Fawry, Kashier and wallets — useful as a reference implementation, licence and
       maintenance to be checked before adoption (per rules section 16).

### R6-IMPLICATION
Cash cannot be designed out on day one, but cash in a POOLED trip is genuinely hard (multiple
payers, per-seat fares, driver making change, disputes). Design answer to propose: a WALLET-FIRST
model — riders top up via wallet/card/Fawry/cash-in points, seats are debited from the wallet, and
the driver never handles per-seat cash. This is also how Swvl-style seat booking avoids the mess.

---

## R7 — Money & pricing in ride-pooling (research pass 2, for CH6 / DEC-054)

Sources:
- getridewise 2026 guide https://getridewise.com/blog/uber-pool-uberx-share-lyft-shared-complete-guide
- de Ruijter, Cats, Alonso-Mora, Hoogendoorn (2023), Transport Reviews/TPPP
  https://www.tandfonline.com/doi/full/10.1080/03081060.2023.2194874
- markhub24 Uber Pool strategy retrospective; therideshareguy driver-pay analyses
- The Verge on Lyft Shared Saver https://www.theverge.com/2019/2/21/18233440/
- Reddit r/Egypt on Swvl cancellation policy (user report, secondary)

### R7.1 What discounts actually are (vs marketing)
- Pooling discounts are typically quoted at 25-60% off a private ride (Shaheen & Cohen 2019, as
  cited in the 2023 academic paper).
- A 2026 hands-on comparison reports the REAL saving on door-to-door shared products is only
  ~15-22%, and calls "save up to 50%" marketing "a fantasy in 2026".
- CRITICAL FOR US: the same source reports WALK-TO-CORNER models (Lyft Shared Saver / Wait & Save)
  save 25-40%, materially more than door-to-door sharing (10-20%).
  => The user's meeting-point model (DEC-004 Tier 1) is exactly the variant that can offer a real,
     defensible discount. Door-to-door pooling cannot.

### R7.2 The academic finding that should drive our pricing
de Ruijter et al. (2023): mileage savings only materialise if users are genuinely willing to share
AND are offered ~50% discount. They tested adding a small occupancy-based bonus: a 7.5% extra
discount PER CO-RIDER at maximum occupancy, on top of a 50% base discount, "more than doubled the
total reduction in vehicle kilometres" and reduced rejected requests.
=> Design implication: a two-part price — a base sharing discount PLUS a bonus that grows with how
   full the vehicle actually is. This directly rewards the behaviour the platform needs.

### R7.3 Price certainty beats price optimisation
- Modern shared products lock the price at booking: "the price you see when booking is locked in
  even if the system finds zero matches and you end up riding solo" (~31% of shared rides ran solo
  at the discounted price in that sample).
- Old UberPool's variable outcome was widely hated; uncertainty is a bigger deterrent than price.
=> Design rule: QUOTE A GUARANTEED PRICE UP FRONT. The platform absorbs matching risk, not the rider.

### R7.4 Extra time is the real cost to the rider
Reported median extra time on shared rides: ~8 min (short trips), ~13 min (medium), ~17 min (LA
average), worst case 27 min. Riders trade time for money, so the discount must visibly compensate.

### R7.5 Driver pay in pooling (from driver-side analyses)
- Per-mile/per-minute rates for pooled rides are set LOWER than solo rates, but the driver is paid
  for the WHOLE pooled route including detours and inter-passenger pickups.
- Driver resentment is a documented, serious problem ("Why Everyone Hates UberPOOL"): more work,
  more stops, more complexity, unclear pay.
=> Design rule: driver pay must be transparent and must never make a full vehicle feel like a
   punishment. Consider paying a per-seat bonus so a fuller car always earns the driver more.

### R7.6 Density is a precondition, not a nice-to-have
2026 reporting: shared rides are only deployed in ~15 US metros; the rule of thumb given is that
under ~750,000 population, shared rides don't work. Uber Pool itself was discontinued in March 2020
and replaced by a weaker product (UberX Share, max one co-rider).
=> Strategic implication for Alexandria: launch must CONCENTRATE demand on a few corridors, not
   spread thin. This independently confirms the corridor-launch reasoning.

### R7.7 Swvl's cancellation policy in Egypt (nearest local benchmark)
User-reported (Reddit, secondary): 100% refund if cancelled up to 3 HOURS before a scheduled trip;
for immediate trips, within 10 MINUTES. Seat availability shown as "1 or 2 seats left / fully
booked". Cashless only in some markets.
=> A time-based, generous-until-a-clear-cutoff policy is the local norm the market already knows.
   The user's instinct (50% penalty on any cancellation) is HARSHER than the local benchmark.

---

## R8 — Pricing the "stop vs street pickup" gap (research pass 3, for DEC-063)

Sources: The Verge (2018) https://www.theverge.com/2018/2/21/17020484/uber-express-pool-launch-cities ;
Wired https://www.wired.com/story/uber-express-pool-cities-launch/ ; Mashable; AP News;
Condé Nast Traveler — all covering Uber Express Pool's launch and pricing logic.

### R8.1 The actual price ladder Uber used
Uber ran THREE products simultaneously, and the price gap between them is the exact question we face:
- UberX (private, door-to-door): baseline, e.g. $15
- UberPool (shared, door-to-door): ~40% less than X, e.g. $9
- Express Pool (shared, WALK to a meeting point): up to 50% less than Pool and up to 70-75% less
  than X, e.g. $4.50
=> The WALK ITSELF was worth roughly HALF the fare. Walking to a stop vs being collected at your
   door was priced as a ~2x difference. That is the size of the gap, empirically.

### R8.2 Why the walk is worth so much (the mechanism, not just the number)
Stated by Uber's own product director: the point is to keep the vehicle on a "central, straight
path" and eliminate "the lengthy, loopy bits of shared rides" — the runs around the block to collect
someone from wherever they happen to be standing. Reported effects:
- total trip time is LOWER for Express Pool than for door-to-door Pool, because match quality is
  higher and routes are straighter;
- they deliberately ADD 1-2 minutes of matching time before assigning, to get better matches
  (independent confirmation of R4.5's batching finding).
=> The deviation surcharge is not arbitrary: a street/door pickup destroys route straightness for
   EVERY other rider on board. The price must reflect harm done to others, not just extra metres.

### R8.3 Uber kept BOTH products on purpose
Uber explicitly retained door-to-door Pool alongside Express Pool because "there will always be
customers who are unwilling or unable to use their feet", and framed door-to-door as a paid premium
("you'll have to pay a premium for that door-to-door service, but you won't show up for brunch
sopping wet").
=> Directly supports the user's two-ticket model: a cheap stop ticket and a more expensive
   street-pickup ticket, sold side by side.

### R8.4 Cost basis for a surcharge (delivery-industry method)
Per-mile operating cost is normally built from fuel + maintenance + tyres + depreciation +
insurance (a worked example totals ~$0.563/mile). Route-deviation surcharges in transport are
commonly a flat band (an auto-transport example quotes $50-150 for a significant deviation).
=> Two established surcharge philosophies exist: FLAT BAND (simple, predictable) or
   COST-RECOVERY (computed from actual extra distance/time). Both are defensible.

### R8.5 Synthesis — three candidate ways to price the street-pickup ticket
| Model | How the price is set | Pros | Cons |
|---|---|---|---|
| **Flat uplift** | Stop ticket + a fixed amount (e.g. +50% or a fixed EGP figure) | Trivial to understand, advertisable, predictable, easy for subscriptions | Overcharges tiny deviations, undercharges big ones |
| **Banded by detour** | System measures added detour, charges band A/B/C | Fairer, still predictable, protects against expensive pickups | Rider must be shown WHY their price differs; more explaining |
| **Cost-recovery** | Extra distance/time x a rate + a margin | Most economically correct | Unpredictable price, contradicts DEC-056 price certainty unless quoted up front |
All three are compatible with DEC-056 (locked price) PROVIDED the number is computed and shown
BEFORE the rider confirms.

### R8.6 Agent's reading of the evidence
Uber's empirical ~2x gap suggests the street-pickup ticket should be MEANINGFULLY more expensive —
not a token +10%. A large gap is what actually pushes riders to the stop, which is what keeps
vehicles straight and the whole system efficient. A gap that is too small produces the worst
outcome: everyone requests street pickup, routes become loopy, and the product degrades into an
expensive taxi.

---

## R9 — How production dispatch systems are ACTUALLY built (research pass 4, answers Q69)

Sources:
- Engelhardt et al., arXiv 2007.14877 (Munich, insertion vs multi-step) — re-read in detail
- Alonso-Mora et al., PNAS 2017 (anytime optimal, RV/RTV graphs) — already in R4
- systemdesigndoc.com Uber case study https://systemdesigndoc.com/case-studies/how-uber-works/
- dev.to "Architecting an Uber-scale real-time tracking & dispatch system"
- systemdesignschool.io Design Uber
- grokkingthesystemdesign.com Uber system design
- blog.afi.io on building a rideshare dispatch algorithm with route optimisation
(The system-design sources are secondary reconstructions, not official Uber documentation.
Treated as industry consensus, not vendor truth.)

### R9.1 The single most important finding: dispatch is NOT one algorithm
"Production dispatch is a constellation: supply freshness, ETA precomputes, batch optimizers,
fairness constraints, and reoffer logic after timeouts... Interview answers should show state
machines + retries, not a single greedy function."
=> The question "insertion heuristic OR optimisation?" is a false choice. Real systems run BOTH,
   in a pipeline, with different components handling different stages.

### R9.2 Geographic partitioning comes first
Consensus pattern: "Matching is partitioned by geography: convert pickup point → H3 cell, then
compute a k-ring (neighbor cells) to form the initial candidate set. Using H3 reduces the candidate
set dramatically versus a global scan."
=> Confirms the Layer-0 H3 pre-filter already proposed in R4-IMPLICATION.

### R9.3 Greedy first, batch optimisation second — explicitly
"Uber uses a combination of greedy algorithms for initial matching and batch optimization that
considers multiple pending requests simultaneously to find globally better assignments. This batch
matching can reduce average wait times by reassigning requests that were initially matched
suboptimally."
=> This is exactly the layered "anytime" design (MCQ option A), and it is what the largest operator
   in the world reportedly does.

### R9.4 Adaptive timing is standard practice (validates DEC-072)
"The matching algorithm runs as an optimization problem, balancing immediate assignment against
waiting for potentially better matches. In high-demand situations, waiting even a few seconds might
surface a closer driver. In low-demand areas, the algorithm dispatches immediately to minimize
rider wait time."
=> Independent confirmation of the user's adaptive-window choice.

### R9.5 Quantified trade-off (the number that decides the design)
Engelhardt et al. (Munich): the advanced multi-step matcher served up to 8% more requests and saved
10% more driven distance than a simple insertion heuristic — BUT its computation time "exceeds real
time rather fast as problem size increases". Their vehicle-selection heuristic sped up the most
expensive step by >8x while keeping request-service almost constant and retaining ~70% of the
distance savings; overall speed-up 2.5x.
=> Conclusion: the optimiser is worth ~8-10%, and that 8-10% is retrievable at ~70% efficiency with
   smart candidate pruning. So: ALWAYS have the fast path; run the optimiser within a deadline;
   prune aggressively.

### R9.6 Offers, timeouts and re-offers are part of the algorithm
Consensus flow: rank candidates → send offer over WebSocket → driver has a timeout (~15s) → on
decline/timeout, try the next candidate → expand the search radius → eventually tell the rider
honestly that nothing is available.
=> The "algorithm" must be specified as a WORKFLOW with timers and retries, not a function.

### R9.7 The double-dispatch problem is a real correctness hazard
"What if two ride requests simultaneously try to assign the same driver?" Recommended pattern:
ephemeral lock (Redis) + durable compare-and-set + canonical event; keep the assignment workflow in
a durable workflow engine so timers and state survive restarts; make all transitions idempotent.
=> Directly supports INV-16 (serialised transitions) and the event-log backbone (CH8a §8a.5).

### R9.8 Degradation strategy
Hot path must survive dependency failure: keep last-known driver state in a Redis TTL cache so
matching continues if the streaming pipeline lags; analytics consumers may lag without breaking
matching; apply backpressure at the gateway.
=> Matching must never depend on analytics, and must degrade to "good enough" rather than fail.

### R9.9 ETA computation is precomputed, not synchronous
Pattern: compute heavy features in streaming jobs, serve from a low-latency store; use fast
approximate routing for the immediate UI number and refresh when the better model returns.
=> Our OSRM matrices should be cached and precomputed per corridor, not computed per request.

### R9.10 AGENT CONCLUSION — recommended design for Q69
Build the LAYERED PIPELINE (MCQ option A), because the evidence says every serious operator does:
```
0. H3 cell pre-filter                      (microseconds)  — shrink the candidate set
1. Hard feasibility filter                 (fast)          — capacity, time windows, promises, detour budget
2. Insertion heuristic                     (milliseconds)  — ALWAYS yields a valid answer
3. Batch optimisation within a deadline    (bounded)       — improves on step 2; abandonable at any point
4. Offer workflow with timeouts/re-offers  (seconds)       — durable, idempotent, survives restarts
5. Overnight full VRP for scheduled rides  (minutes/hours) — OR-Tools, no time pressure
```
Non-negotiable property: **if step 3 is cut off at any moment, step 2's answer is still valid and
shippable.** No rider ever waits on a solver.

---

## R10 — Egyptian payment rails in detail (research pass 5, for CH6 / DEC-077)

Sources: CBE https://www.cbe.org.eg/en/payment-systems-and-services/instant-payment-network ;
Egyptian Banks Company https://www.egyptianbanks.com/ ; openbanking.ng Egypt overview ;
transfi.com Egypt payment rails ; Paymob Payouts docs
https://payouts.paymobsolutions.com/docs/instant_cashin_api/ ; Paymob developer portal
https://developers.paymob.com/ ; payatlas Egypt country page ; Reddit r/Egypt_Developers.

### R10.1 InstaPay / IPN — what it actually is
- The **Instant Payment Network (IPN)** launched 22 March 2022. It is a national network linking all
  operating banks in Egypt for real-time, 24/7 transfers.
- It is operated by the **Egyptian Banks Company (EBC)**, the CBE's technology arm, connecting
  38 member banks.
- **InstaPay** is an APPLICATION — the first PSP app licensed by the CBE to run on the IPN — not a
  merchant API in itself.
- In designing the IPN the CBE studied India's UPI, Brazil's PIX, EU TIPS and Singapore FAST.
- Explicitly designed for interoperability and "integration with fintech companies".

### R10.2 The critical practical finding for us
There is **no public, self-service InstaPay merchant API** of the kind Stripe offers. Access to IPN
rails is intermediated: banks and licensed PSPs connect to IPN, and businesses connect through them.
Egyptian developer discussion corroborates the absence of an open InstaPay API, with third-party
workarounds circulating (unofficial, not suitable for production).
=> **Design conclusion:** treat "InstaPay" as a payment METHOD offered through a licensed PSP or a
   partner bank, not as an API we integrate directly. Anything else is unverifiable for us and
   would be a compliance question for the user's legal/finance team (DEC-030).
[UNVERIFIED: current commercial terms for IPN access via banks/PSPs — must be confirmed by the user
directly with Paymob/their bank, not assumed from web sources.]

### R10.3 Paymob — the practical primary integration
- Developer portal and docs are public: https://developers.paymob.com/ , https://docs.paymob.com/ ,
  with Egypt-specific documentation and a Checkout API guide.
- Coverage cited: card payments, mobile wallet integration, bank transfers, kiosk payments, cash
  collection, and order management.
- Crucially for us, Paymob also runs a **Payouts / Instant Cashin API**
  (https://payouts.paymobsolutions.com/docs/instant_cashin_api/) supporting disbursement to bank
  accounts, debit cards and cash-transfer channels, with a `customer_bears_fees` option.
=> Paymob can plausibly serve BOTH directions: collecting from riders AND paying out drivers.
   That is unusual and valuable — most gateways only do collection.

### R10.4 Payout thresholds
Reported minimum payout thresholds in Egypt commonly start around EGP 1,000–5,000 depending on the
PSP. => Driver payout cadence must be designed around a threshold, not assumed to be per-ride.

### R10.5 The rails we should support (synthesis with R6)
| Method | Direction | Notes |
|---|---|---|
| Cards (Visa/Mastercard/Meeza) | in | via Paymob; 3DS required |
| Mobile wallets (Vodafone Cash, Orange Money, Etisalat Cash, Meeza Wallet) | in | very high adoption |
| Fawry / kiosk cash-in | in | how cash users fund a wallet without cash entering the vehicle |
| InstaPay / IPN bank transfer | in | via PSP/bank partner, NOT a direct API (R10.2) |
| Cash to driver | in | user says acceptable; see R10.6 for the pooled-vehicle problem |
| Paymob Payouts / Instant Cashin | out | driver payouts to bank/card/cash channels |

### R10.6 The unavoidable problem with cash in a POOLED vehicle
Cash is fine in a solo taxi: one rider, one fare, one hand-over. In a pooled vehicle with per-seat
fixed fares (DEC-058) it creates: multiple payers per journey, change-making while driving,
disputes over who paid, driver cash-handling risk, reconciliation against the platform's ledger,
and slower boarding — which directly harms the 10-minute wait budget (DEC-052) and the QR flow
(DEC-049).
=> If cash is accepted, it must be handled as a RECORDED COLLECTION against a booking (driver marks
   "cash collected" on the scanned booking) and settled against the driver's payout, never as an
   untracked cash sale. This keeps the ledger authoritative.

---

## R11 — Web + mobile: one codebase or two? (research pass 6, answers C-2 / DEC-015)

Sources: reactnativerelay.com "React Native Web + Expo Guide (2026)"
https://reactnativerelay.com/article/react-native-web-expo-cross-platform-2026 ;
Expo EAS docs & GitHub Actions guide https://medium.com/@kgkrool/... ;
openreplay Expo guide; multiple r/reactnative practitioner threads (2023-2026);
matthewwolfe.github.io on code sharing.

### R11.1 The Mac question — ANSWERED, and it is not a problem
- "The builds run on Expo's servers, so you don't need a Mac to build iOS apps."
- EAS cloud builds can be triggered from GitHub Actions on `ubuntu-latest`; a macOS CI runner is not
  required; the cloud side uses a pinned macOS/Xcode image.
- Building iOS LOCALLY does require a Mac + Xcode; building Android locally does not.
=> The user HAS a Mac, so they are in the easiest possible position: local iOS builds work AND cloud
   builds work. The Mac is an advantage, not a constraint. No blocker here.
- Practical requirements regardless: a paid Apple Developer account for TestFlight/App Store, and
  app-store screenshots at required device sizes.

### R11.2 Is React Native Web production-ready? Yes.
"RNW powers the X (formerly Twitter) web client and Major League Soccer... With Expo SDK 54+ the
bundler, routing, styling, and deployment stories are all stable."
Expo Router is universal: the same `app/` directory becomes navigation stacks on native and routed
pages on web; static rendering out of the box, SSR alpha in SDK 55+, RSC preview in SDK 56.

### R11.3 BUT practitioners consistently warn against ONE codebase for everything
Repeated, independent, experienced voices:
- "Having a single code base targeting web and mobile is not a good way to go. The UI becomes too
  complex due to platform differences... if your app is simple, sure it can work, but if you want to
  do anything ambitious, your View layer should be decoupled between web and mobile."
- Their solution: "a mono repo with web, native and shared code. Web and native ran React and RN,
  while shared contained redux, utils, APIs etc. This allows us to reuse a lot of code while still
  being able to optimize each platform well."
- Another, after doing the migration: monorepo with `/apps/web` and `/apps/mobile` plus shared
  packages, "90% of the codebase was still shared... I was stupid to try to close that last 10% gap."
- "Do separate, web is a different beast, especially on desktop."

### R11.4 The official guidance matches the practitioners
From the 2026 RNW guide's own FAQ:
"If your primary product is a mobile app and the web is a companion surface, use RNW with Expo for
one codebase. If your primary product is the website and a mobile app is secondary, use Next.js for
the site and a separate React Native app, optionally with shared utility packages."

### R11.5 What this means for THIS project specifically
Our surfaces are NOT the same product:
- Rider: mobile-first, map-heavy, needs push, background location, QR camera, alarms.
- Driver: mobile-ONLY in practice — continuous background GPS, wake locks, QR scanning, navigation.
  A browser cannot do this (C-2).
- Manager & Ops dashboards: desktop-first, dense tables, charts, bulk editing, multi-panel layouts.
  These are genuinely bad on a phone and genuinely bad in React Native.
- Marketing/public pages: need SEO and fast first load -> Next.js territory.
=> The surfaces have GENUINELY different needs. Forcing them into one UI codebase is the exact
   mistake the practitioners describe.

### R11.6 AGENT RECOMMENDATION
**Monorepo with shared logic, separate UI apps.** This preserves DEC-069 (modular monolith thinking)
and DEC-012 (TypeScript everywhere) while respecting platform reality:
```
/apps
   /mobile     Expo (React Native) — rider + driver, one app, role-adaptive (DEC-014)
   /web        Next.js — public site, rider web booking, manager & ops dashboards
   /api        NestJS backend (the modular monolith of CH8a)
/packages
   /shared-types     entities, DTOs, events — ONE definition of Booking everywhere
   /shared-logic     validation, fare display rules, date/time, i18n strings, formatting
   /shared-api       generated API client used by both apps
```
- Shared: everything that is not pixels — types, validation, business display rules, i18n, API client.
- Not shared: screens and navigation. Web gets React/Next components; mobile gets React Native.
- This is the "90% shared" outcome practitioners report, without the last-10% pain.

---

## R12 — UX research for the rider app (research pass 7)

Sources: Hsu & Chen, "Usability Study on the User Interface Design of Ride-hailing Applications",
Springer 2023 https://link.springer.com/chapter/10.1007/978-3-031-35702-2_15 ;
UX Planet, "Designing a ride-sharing app for the daily commute (Saudi Arabia)"
https://uxplanet.org/designing-a-ride-sharing-app-for-the-daily-commute-ui-ux-case-study-8df8a3943eb9 ;
uxdesign.cc student ridesharing case study; designstudiouiux mobile navigation UX 2026 and the
Snap-E Cabs redesign case study; onde.app ride-hailing UX guide.

### R12.1 Measured usability of the market leaders (the benchmark to beat)
Hsu & Chen tested Uber, Lyft and Gojek with 30 participants across 5 tasks. System Usability Scale
scores: **Uber 66.75, Lyft 60.25, Gojek 62.75**. For context, an SUS of 68 is the conventional
average — so all three leading apps scored AT OR BELOW average usability. This is encouraging:
the incumbents are not a high usability bar.

Their concrete findings, directly applicable:
1. If a page overflows the screen, add **signifiers** so users know more content exists.
2. Unrelated settings/info should be collapsed into a **single modular tab or collapsible panel**.
3. Offer a mode **without advertisements** so users interact with the core service undisturbed.
4. **Frequently used functions belong on the main page or one level down** — never buried.
5. Profile/photo editing should be inline, not on an extra layer.

### R12.2 The Saudi daily-commute case study (closest analogue to our product)
Findings that map directly onto our commuter product:
- For a REPEAT user, showing their **latest search** on return respects their time.
- Once a user has an upcoming booking, "the goal of the app changed to play as a reminder/calendar
  for near bookings" — the upcoming ride becomes the main highlight, with search still available.
- **Arrival time matters more than departure time** to commuters; the designer placed "reaching
  time" ABOVE pickup time because that is what the rider actually cares about.
- Both riders and drivers preferred **starting with a single test day** before committing to a
  recurring arrangement. (Direct implication for our subscriptions, DEC-051: offer a trial day.)
- A home-screen design was tested on 8 users and confused ~75% of them without anyone complaining
  explicitly — evidence that home-screen confusion is silent and must be tested, not assumed.

### R12.3 Student ridesharing case study
- "For ease of use, the **Home screen is the Search function itself**."
- Settings merged into Profile to reduce bottom-nav clutter.
- Notifications reachable from all top-level screens.

### R12.4 Mobile navigation best practice (2026)
- **3-5 primary destinations** in the bottom tab bar; more becomes unscannable.
- **Bottom tab bars and bottom sheets** sit in the thumb-friendly zone — put frequent actions in the
  lower half of the screen.
- Do not bury high-frequency actions in hamburger menus; drawers are for infrequent items.
- Gestures are fast for experts but undiscoverable: always keep a visible control as the primary path.
- Accessibility: clear text labels, large tap targets, visible focus states, strong contrast,
  logical focus order.

### R12.5 Documented pain points in existing ride-hailing apps (what to avoid)
From the Uber redesign case study and the Snap-E Cabs (India) redesign:
- Overwhelming screens with too many features at once.
- Hidden fees — surge/price surprises only revealed at checkout.
- Complex payment flows causing drop-off.
- **Poor GPS accuracy and lack of reliable driver tracking "amplified user anxiety"** — named as the
  single biggest anxiety driver in a congested-traffic market.
- Snap-E's targets after redesign: **sub-3-second app load** and **99%+ crash-free sessions**;
  they added "Verified Driver" badges and an accessible SOS button as trust elements.

### R12.6 AGENT SYNTHESIS for our rider home screen
The evidence supports the ADAPTIVE home (MCQ option C), not a fixed choice:
- First-time user: the home screen IS the search ("Where to?") — R12.3.
- User with an upcoming booking: that booking becomes the main highlight, calendar-style — R12.2.
- Repeat commuter: their saved commute and latest search surface first — R12.2.
This is not three screens; it is ONE screen with a priority order for what occupies the top slot.

---

## R13 — Offline-first architecture (research pass 8, answers the "bullet-proof against signal loss" requirement)

Sources: tekrevol offline-first guide 2026 https://www.tekrevol.com/blogs/offline-first-app-development-guide/ ;
quokkalabs offline-first architecture; xsoneconsultants offline-first practices;
think-it.io offline apps; techbuzzonline offline-first guide.

### R13.1 The critical distinction
- **Offline-CAPABLE**: degrades gracefully when connectivity drops, but fundamentally depends on the
  network and treats failures as exceptions.
- **Offline-FIRST**: the app is architected so **local storage is the primary data source and the
  network is a sync channel**. Android's own architecture guidance states the local data source
  should be the canonical source of truth for higher layers.
=> Our DEC-091 (critical actions work offline) is offline-CAPABLE. The user is now asking for
   "bullet proof", which points toward offline-FIRST for the driver app specifically.

### R13.2 Optimistic UI — the three-phase pattern
1. **Update locally first** — write to local storage, reflect in the UI immediately; the user sees
   the result before any network request.
2. **Sync in the background** — add the operation to a sync queue and flush when ready.
3. **Roll back on failure** — undo the local change and show a calm, non-alarming message such as
   "Couldn't save, tap to retry".
This is cited as why Notion, Gmail and Linear feel instant on poor connections.

### R13.3 Sync strategy comparison (from the research)
| Strategy | Best for | Risk | Complexity |
|---|---|---|---|
| Pull-based | content refresh | stale data between pulls | Low |
| Push-based | server-driven updates | infrastructure overhead | Medium |
| **Queue-then-sync** | **forms, inspections, delayed writes** | retry/failure handling matters | Medium |
| Real-time | shared live state | conflict pressure, cost | High |
"Many business apps benefit most from a **queue-then-sync** approach." — matches our outbox design.

### R13.4 Efficiency rules (important for Egyptian data plans)
- **Delta sync only** — never re-sync the whole dataset on reconnect; send only changed fields/rows.
  Full sync "will consume massive amounts of bandwidth and drain the battery".
- Compress payloads; use efficient formats; batch, throttle and debounce network calls.
- Optimise and lazily load images; adapt loading strategy to detected network quality.

### R13.5 Conflict resolution
- Last-write-wins: simple, but can silently discard important updates.
- CRDTs: for collaborative/data-critical apps.
=> For us, neither: our conflicts are about **authoritative server state** (a seat was taken, a ride
   was cancelled). Correct model is **server authority + explain the change to the user**, which is
   already what CH9 §9.4 specifies.

### R13.6 The explicit warning that applies to us
The research warns AGAINST offline-first for "real-time dispatch" systems, which "often require
immediate server validation, making offline-first risky and expensive."
=> This validates the split already in DEC-091: **booking/matching stays online-only** (it allocates
   a scarce resource), while **the driver's journey execution goes offline-first** (it records what
   already happened). The rider app is offline-capable; the driver app is offline-first.

### R13.7 Required UX affordances for offline states
- Clear offline indicators, a count of queued changes, and a last-synced timestamp.
- Tell users plainly which actions are deferred.
- Never rely on a naive "is online" flag — test against genuinely unstable networks, not just
  airplane mode.

---

## R14 — Fixed-route vs demand-responsive, and who should initiate (research pass 9, for G-054)

Sources:
- ScienceDirect 2026, "Fixed-route or demand-responsive transit? An evaluation framework for transit
  service structures using dual-perspective indicators"
  https://www.sciencedirect.com/science/article/pii/S1077291X26000159 (includes a literature table
  of 14 studies, 2007-2025)
- CivicWell on AC Transit Flex https://civicwell.org/civic-news/microtransit-right-sizing-transportation/
- movmi DRT guide https://movmi.net/blog/exploring-demand-responsive-transit-drt-the-history-business-models-benefits/
- Human Transit, "Microtransit: What I Think We Know" https://humantransit.org/2018/02/microtransit-what-i-think-we-know.html
- Via https://ridewithvia.com/resources/microtransit-myth-on-demand-public-transit-is-too-expensive
- RideCo, N-CATT, Mobility CoE, Shared-Use Mobility Center (Lynden Hop case)
- Swvl Business https://www.swvl.com/en/blog/exploring-employee-transport-solutions

### R14.1 The central finding — it depends on DEMAND DENSITY, and the threshold is known
The 2026 evaluation paper concludes: **FRT performed better on cost, schedule adherence and
ridership**, making it "suitable for areas with regular passenger demand". **DRT performed better
on accessibility in low-density areas** and for transit-captive populations.

Quantified thresholds from the literature table:
- Li & Quadrifoglio (2010): "DRT outperforms FRT when demand is **below 10-50 passengers per square
  mile per hour** depending on layout... **FRT becomes preferable at higher demand**."
- Edwards & Watkins (2013): DRT wins "at low demand levels (under 6 passengers per minute)...
  **FRT becomes more efficient as demand rises**."
- Mehran et al. (2020): "DRT operates at lower cost than FRT at low demand levels, but **FRT is more
  cost-effective as annual ridership increases beyond ~132,573 passengers per year**."
- Yoon et al. (2022): "DRT reduces user waiting and walking time in low-demand settings, but **FRT
  achieves better efficiency (lower VKT, higher vehicle utilization) under high-demand conditions**."
- Berrada & Poulhès (2021): replacing FRT with DRT "**reduces social welfare and ridership**" when
  demand is high.

### R14.2 Real cost figures (the gap is large, not marginal)
- **AC Transit (California):** Flex/microtransit cost **$72 per passenger vs $25** on the fixed
  route it replaced — ~3x. Riders liked it (94% preferred it), but the economics did not work.
- **Rural England (White 2016):** public cost per passenger trip **£1.35-1.62 for FRT vs £9-19.96
  for DRT** — 6-12x.
- Counter-evidence where DRT wins: San Antonio VIA replaced three UNDERPERFORMING routes and cut
  cost per passenger from $11 to $7 (-36%); Hall County GA replaced three underperforming routes and
  halved operating cost. **Note the pattern: DRT wins where fixed routes were already failing.**

### R14.3 Rider satisfaction
Wong et al. (2023): "Passengers were **less satisfied with DRT than FRT**, with FRT scoring higher
service quality except for longer service hours." Punctuality and schedule adherence are better
under FRT — which matters because predictability is what commuters buy.

### R14.4 Explicit guidance against DRT in our exact launch context
movmi's guide lists when NOT to use demand-responsive:
- **"Dense urban routes** — in dense urban environments with short trip distances... fixed-route
  services benefit from economies of scale. DRT's smaller vehicles and dynamic routing are less
  efficient in these settings."
- **"Peak-hour commuter corridors** — during peak commuting periods, predictable travel patterns and
  high passenger volumes favour scheduled, high-capacity transit. Deploying DRT in peak hours can
  increase per-trip costs."
- "When budgets cannot support higher per-trip costs."
=> **Alexandria university corridors at 07:00-09:00 are precisely "dense urban + peak commuter".**
   Every listed contra-indication applies to our launch case.

### R14.5 The economic argument for why fixed routes emerge naturally
Human Transit walks through the logic from first principles: an on-demand shared service, as demand
grows, is forced by economics toward fixed intervals (waiting for a full vehicle is unacceptable to
riders), then toward straight routes (detours punish everyone on board), then toward walking to
stops (door service destroys frequency). Conclusion quoted: "An on-demand, sharing system operates
in a very small window between the fixed route systems — that are cost effective with even moderate
demand — and the taxi cab system (only cheapest when ridership is extremely low)."
**Our design has already independently arrived at all three of those conclusions** (stops not doors
DEC-004/038, straight routes protected by detour limits CH6a, timetables DEC-119).

### R14.6 The consensus resolution: hybrid, not either/or
- Itani et al. (2024): "**DRT should be seen as a complement to FRT, not a replacement.**"
- Calabrò et al. (2023): "**Reallocating service between FRT and DRT reduces waiting time by up to
  36% and operational cost by up to 24% compared to pure FRT** under moderate demand."
=> The best-performing configuration is a fixed-route SPINE with demand-responsive elements at the
   edges (low-density areas, off-peak hours, first/last mile).

### R14.7 What Swvl actually does (the nearest local comparable)
Swvl calls drivers **"Captains"**. Their business product uses **dynamic routing** with GPS
re-optimisation when incidents cause delays, plus "multiple backup systems... so that your employees
are picked up and dropped off on time". Captains do NOT invent routes or set fares — Swvl plans the
network and the Captain drives it. Riders book a **seat on a scheduled run**.

### R14.8 Driver-side evidence
Shared-Use Mobility Center (Lynden Hop, operated in-house) reported that running the service
in-house "gave WTA more control over staffing and scheduling, allowing operators **greater
flexibility in choosing shifts** and opportunities to work on either fixed-route or on-demand
service." A driver interviewed said microtransit built closer relationships with passengers.
=> Drivers value **choosing shifts**, not inventing routes. The flexibility they want is
   *when to work*, not *what to plan*.

### R14.9 AGENT CONCLUSION for G-054
The evidence points one way for the Alexandria launch context (dense corridors, peak commuter
demand, price-sensitive riders, and a small operator that cannot absorb $72-per-passenger economics):

**Fixed routes, operator-defined. Drivers choose WHEN, never WHAT.**

Specifically:
1. The operator owns the route network: stops, sequence, flat fare (DEC-115), service window and
   target frequency (DEC-119). This is R14.1/R14.4/R14.7.
2. Drivers do not invent routes, set prices, or predict demand — that is the "hassle" the user
   correctly identified, and R14.8 says it is not the flexibility drivers actually want.
3. Drivers get flexibility over SHIFTS and DEPARTURES: claim a scheduled departure, or open one on
   an approved route inside its service window with one tap.
4. Demand-responsive behaviour is kept where the evidence says it belongs: **at the edges** —
   street pickup within a detour budget (DEC-063), skipping stops with nobody waiting (DEC-041),
   and adding extra departures when demand appears. This is R14.6's hybrid.
=> This is Model C from the WHO_INITIATES audit, with the operator side strengthened.

---

## R15 — Complaint/report thresholds: is 10% suitable? (research pass 10, for G-044)

Sources: getridewise "Uber and Lyft Driver Ratings Explained" https://getridewise.com/blog/uber-lyft-driver-ratings-explained ;
RideGuru https://ride.guru/content/newsroom/what-do-ratings-mean-for-rideshare-drivers ;
Gridwise deactivation guide https://gridwise.io/blog/gig-driver-deactivation-appeal ;
peanutpolitician (citing a 2023 EPI report).

### R15.1 The industry does NOT use a complaint percentage — it uses a rating average
- Uber: deactivation at roughly **4.6 average over the last 500 trips** (4.65-4.7 in high-volume
  markets like NYC). Not published officially, varies by city.
- Lyft: threshold generally **4.6-4.8** depending on market, over the last ~100 trips.
- Both combine the rating with **acceptance rate, cancellation rate and complaint volume**.

### R15.2 Translating a rating threshold into a complaint rate
A 4.6 average out of 5 means the driver is losing 0.4 stars per trip on average. In practice a
driver sits near 4.9 when ~2-4% of riders rate them 1-3 stars. Falling to 4.6 typically requires
roughly **8-12% of riders rating poorly** — i.e. the industry's effective tolerance before
deactivation review lands close to **~10%**.
=> **The user's 10% instinct is well-calibrated.** It sits in the same band as Uber/Lyft's
   effective tolerance, arrived at independently.

### R15.3 But percentage alone is dangerous at low volume
A driver with 8 completed rides and 1 report is at 12.5% — above threshold, on a single complaint
that may be unfair. Both major platforms mitigate this with a **large rolling window**
(500 trips Uber, ~100 Lyft) so early noise cannot trigger deactivation.
=> A percentage rule needs BOTH a **minimum ride count** and a **rolling window**, or it will
   punish new drivers for statistical noise.

### R15.4 Pattern detection matters more than the raw number
Gridwise, on Uber: "**Multiple complaints about the same behavior pattern — even if no single
incident is severe — can add up.**" Lyft similarly reviews on "safety reports" independently of
rating.
=> Category clustering (3 reports all about the same thing) should escalate even when the overall
   percentage is low.

### R15.5 The fairness problem, documented
A 2023 EPI report (cited secondhand) states **30% of drivers faced deactivation threats due to low
ratings, with no clear recourse**, and that ratings are affected by factors outside a driver's
control (traffic, other passengers). Seattle created the first municipal deactivation appeals panel
in response.
=> Any automatic threshold MUST be paired with: human review before action, a stated reason, and an
   appeal path. An automatic ban on a percentage alone is both unfair and a reputational risk.

### R15.6 AGENT RECOMMENDATION for G-044
The user's 10% is a good headline number. It should be implemented as:
- **Report rate ≥ 10%** of completed rides, **AND** a minimum of **20 completed rides**, measured
  over a **rolling window of the last 100 rides** → raises a HUMAN REVIEW alert to Ops (not a ban).
- **Severe categories** (assault, harassment, dangerous driving, discrimination) → immediate
  precautionary suspension pending investigation, regardless of percentage (already CH12 §12.2).
- **Category clustering**: 3+ reports in the same category within 30 days → human review even if
  below 10% (R15.4).
- **No automatic deactivation ever.** A human decides, states a reason, and the driver may appeal
  (R15.5).
All thresholds are configuration (DEC-070), tunable per city.

---

## R16 — OSM data quality in Egypt (research pass 11, for G-003/G-007)

Source: Barrington-Leigh & Millard-Ball, "The world's user-generated road map is more than 80%
complete", PLOS ONE 2017 https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0180698

### R16.1 The finding that matters, and it is bad news for us
Global OSM road completeness is ~83%. But the paper names Egypt explicitly as one of the WORST:
> "At one extreme, we estimate that **less than one-third of the streets in China, Egypt and
> Pakistan are in the OSM database**, compared to more than 95% in Cuba, Ecuador and Syria as well
> as most European and North American countries."

### R16.2 Mitigating nuance
- The study is from 2017; OSM in Egypt has grown since. Magnitude of improvement is [UNVERIFIED].
- Completeness has a **U-shaped relationship with population density**: "both sparsely populated
  areas and dense cities are the best mapped." Central Alexandria is dense, so it is likely far
  better mapped than the national average.
- Other work finds "high-level roads and urban traffic networks of OSM data have high positional
  accuracy and completeness" — i.e. **main roads are fine; side streets are the gap.**

### R16.3 Why this is survivable for OUR design specifically
Our architecture is unusually insulated from side-street gaps:
1. **Boarding happens only at admin-verified stops** (DEC-038/040) — a human physically visits and
   places each one, so stop positions do not depend on OSM at all.
2. **Routes are operator-defined** along known corridors (DEC-132), which are main roads — exactly
   the part OSM maps well (R16.2).
3. **We do not need door-to-door navigation** into unmapped alleys; door-to-door was dropped
   (DEC-067).
4. Street pickup is bounded by a detour budget on or near the route (CH6a), not deep into side streets.
=> The design decisions already taken have accidentally minimised our exposure to Egypt's weakest
   OSM coverage.

### R16.4 The residual risk and the required action
Risk remains for: walking-route calculation to a stop (needs pedestrian paths), and travel-time
accuracy if a corridor's geometry is wrong or missing turn restrictions.
**Required before committing to self-hosted OSRM (G-003/G-007):**
- Download the Alexandria extract (Geofabrik) and measure: are the launch corridors present, are
  turn restrictions and one-ways tagged, and do walking routes to candidate stops resolve?
- Compare a sample of OSRM travel times against a commercial provider on the same corridors.
- Contribute fixes upstream where the launch corridors are wrong — this is cheap and permanent.
This is a **field/engineering task**, not a product decision. It must be done in Phase 2 (CH16),
before the routing engine is committed.

---

## R17 — Runtime configuration management (research pass 12, for the config catalogue)

Sources: momentslog "Runtime Configuration Change Checklist"
https://www.momentslog.com/development/runtime-configuration-change-checklist-how-to-reduce-production-risk-without-slowing-every-release ;
Ensolvers "Configuration as Architecture" https://www.ensolvers.com/post/configuration-as-architecture-designing-per-client-features-at-scale ;
Unleash feature-flag best practices https://docs.getunleash.io/guides/feature-flag-best-practices ;
medium/subham11 config management; northflank multi-tenant guide.

### R17.1 Config values and feature flags are DIFFERENT things — do not merge them
Ensolvers: feature flag systems "are designed to control release behavior and short-lived runtime
decisions and not to represent the long-term structure of product capabilities. When tenant
customization is primarily based on feature flags, these flags gradually start to describe
permanent system states instead of temporary rollout controls."
=> Our catalogue must separate: (a) BUSINESS PARAMETERS (permanent, e.g. `MaxScheduleSlip`),
   (b) FEATURE TOGGLES (temporary, removable, with an owner and expiry).
Unleash: "Treat feature flags like technical debt. Give them owners, set expiration dates, and add
cleanup tasks to your backlog."

### R17.2 Every key needs a defined SCHEMA before it exists
Recommended per key: "keys, types, scopes, validation rules"; "Validate config with JSON Schema or
custom validators before promotion"; "Confirm validation rules, units, allowed bounds,
missing-value behavior, and fallback behavior."
=> Our catalogue columns are therefore: key · type · unit · allowed range · default · scope ·
   who may change it · risk tier · behaviour if missing.

### R17.3 Safe defaults are where incidents actually happen
momentslog: "**many incidents happen during fallback, not during the initial change.** Ask what the
service does if the config store is temporarily unavailable, if the value cannot be parsed, if the
key is missing... The safest behavior is rarely universal. For a rate limit, failing closed may
protect a dependency but harm users. For an authentication flag, failing open may be unacceptable."
=> Every key must declare its **missing-value behaviour** explicitly. Add a startup fail-safe:
   "if config is unavailable, either use last known good or fail fast with clear logs."

### R17.4 Risk tiers govern how much ceremony a change needs
momentslog proposes three tiers based on **blast radius** (who is affected if wrong),
**reversibility** (can we restore quickly) and **coupling** (does it silently affect billing, auth,
retries, cache, third-party usage).
- Low: narrow, reversible, visible.
- Medium: customer-facing behaviour with a straightforward rollback.
- High: money, security, or wide blast radius.
=> Maps directly onto our roles: Manager may change LOW/MEDIUM commercial keys; SUPER ADMIN only for
   HIGH-risk keys; security and permission rules are NOT configuration at all (CH8a §8a.4).

### R17.5 Rollout and rollback discipline
"Roll out in the smallest practical slice... Define a rollback trigger before rollout expansion...
Leave an audit note with the outcome, timing, dashboard links." Also: "Build a quick rollback: one
click to revert to previous version; alert on error rates after changes."
=> Confirms CH6a §6a.4 and CH8a §8a.4: preview-before-publish, versioning, one-click rollback,
   mandatory reason. Add: **a rollback trigger must be stated before a high-risk change goes live.**

---

## R18 — Notification strategy (research pass 13, for the message catalogue)

Sources: vmobify "Push Notification Strategy 2026" https://vmobify.com/blog/push-notification-strategy ;
MagicBell "SMS Notification Best Practices 2026" https://www.magicbell.com/blog/sms-notification-best-practices ;
NN/g "Transactional Notifications" https://www.nngroup.com/articles/transactional-notifications/ ;
insiderone SMS practices; dualmedia push strategy.

### R18.1 The three-tier model (this is the structural fix)
vmobify: "Segmenting notifications into three tiers — **transactional (always send)**, **behavioural
trigger (action/inaction based)**, and **promotional (explicit opt-in only)** — is the fastest
structural fix for notification fatigue and uninstall rates."

### R18.2 Frequency caps, quantified
| Tier | Cap |
|---|---|
| Transactional | **Unlimited, but only when the trigger fires.** "No transactional event should be suppressed by promotional frequency caps." |
| Behavioural | **Max 2/day, minimum 4-hour gap** |
| Promotional | **Max 1/day, max 5/week** |
| Global (non-transactional) | **Max 3 per 24 hours across all types** |
MagicBell for SMS: promotional 2-4/month recommended, 8/month maximum; transactional as needed.
"Opt-out rate above 1%: review your frequency or relevance."

### R18.3 Channel choice: SMS vs push (directly applicable to us)
NN/g: "Save SMS messages for **urgent and crucial information that users need to refer to later** or
that they need to respond to quickly; use push for nonurgent communications as some users may block
them." Also: "sending push notifications is **connectivity-dependent** and, in environments with
poor data-signal strength, notifications may struggle to reach mobile phones."
=> For Alexandria's uneven networks: **safety-critical and boarding-critical messages need an SMS
   fallback**, not push alone. This matches our offline-first posture.

### R18.4 Retries
MagicBell: "**Only retry transactional messages. Skip promotional retries.**"

### R18.5 Opt-out and control
NN/g: allow users to opt out **per channel**, and to customise frequency/type. Every SMS must carry
an opt-out instruction. Our CH10 §10.6 already requires per-category control with ride-status
non-disableable — R18.1 confirms that transactional messages are legitimately exempt.

### R18.6 The metric that tells you you are over the line
vmobify: "The most reliable signal that you have exceeded your audience's tolerance threshold is a
**rising 7-day opt-out rate** — monitor this weekly."
=> Becomes a required analytics metric (screen G-18).

---

## R19 — Deployment platform and build tooling (research pass 14, for the build plan)

Sources: diyai.io Railway Hosting Review 2026
https://diyai.io/ai-tools/hosting/reviews/railway-hosting-review/ ;
Railway template catalogue (Postgres17 + Extensions) https://railway.com/deploy/daaDbI ;
Railway pgvector template docs; pkgpulse "JavaScript Monorepos 2026"
https://www.pkgpulse.com/guides/javascript-monorepos-2026-best-practices-pitfalls ;
chenguangliang.com "A 2026 Monorepo Setup From Zero to Production" ;
btheo.com Turborepo+pnpm guide ; fintlabs Medium multi-stage Docker with Turborepo+pnpm ;
MetaMask eslint-plugin-design-tokens ; builder.io on stylelint-declaration-strict-value.

### R19.1 Railway: what it does and does not give us
- **Dockerfile is supported** ("Automatic Railpack builds with Dockerfile support"), and deploys can
  come from GitHub, the CLI, or a container image. This is the portability lever: if the unit of
  deployment is our own Dockerfile, the platform is replaceable.
- **Private networking exists** between services, with automatic HTTPS on public domains.
- **Persistent volumes, scheduled volume backups and point-in-time recovery** are available.
- **CRITICAL LIMITATION, stated by the review:** Railway's database templates are
  **unmanaged services** — "You remain responsible for backup strategy, disaster recovery, tuning,
  security, monitoring and maintenance. The button may say PostgreSQL, but the service is closer to
  a preconfigured database container." This does NOT relieve us of DEC-164 (nightly backups,
  30-day retention, monthly restore drill). If anything it makes the drill mandatory.
- Other constraints noted: only four regions listed, no dedicated UK region, community-only support
  on the entry plan, **volume migrations between regions can cause downtime**, and **a hard spending
  limit can take workloads offline** — that last one is an availability risk to configure carefully.

### R19.2 PostGIS on Railway — solvable, but not with the default template
The stock Postgres template does not ship PostGIS. A published Railway template
("Deploy Postgres17 + Extensions", railway.com/deploy/daaDbI) provides PostgreSQL 17 with PostGIS
compiled in, plus pgvector and others, enabled by `CREATE EXTENSION postgis;` after deployment.
=> Our plan must specify a PostGIS-capable Postgres image explicitly and never assume the default.
   Because we control the image, the same image runs locally, on Railway, and on a VPS.
[UNVERIFIED: template maintenance status and version currency must be checked at adoption
time per DEC-143.]

### R19.3 Monorepo tooling — the 2026 consensus
- **pnpm workspaces + Turborepo** is the default recommendation. Turborepo ~2M weekly downloads,
  "became the default monorepo build orchestrator in 2026"; pnpm ~5M, "the standard package manager
  for monorepos". Nx is for enterprise scale; **Lerna is superseded and should not be used**.
- **pnpm catalogs** (shipped 9.5, `catalogMode: strict` in 10.12) solve version drift by forcing one
  version of a dependency across the workspace. Directly serves §0.3 ("to change X everywhere, edit
  one file").
- `packageManager` field in root package.json is called "non-negotiable" — Corepack pins every
  developer and CI runner to the same pnpm version.
- `workspace:*` protocol guarantees the local package is linked, never a same-named npm package.
- Conventional layout confirmed: `apps/` = deployable artifacts, `packages/` = shared libraries,
  including a `packages/config` holding ESLint/tsconfig so children cannot drift.

### R19.4 The Docker pattern for a pnpm monorepo
`turbo prune --scope=<app> --docker` produces an `out/` directory containing (a) `json/` with only
the package.json files needed, (b) `full/` with the pruned source, (c) a pruned lockfile. The
documented multi-stage shape is: alpine base → pruner → builder (install from pruned lockfile,
build, then `pnpm prune --prod`) → minimal runner with a **non-root user**.
=> One Dockerfile parameterised by `ARG PROJECT` can build every service in the monorepo. This is
   both the portability mechanism and a §0.3 "define once" win.

### R19.5 Enforcing the library-first rule (§0.3) with scripts
The rules require automated enforcement, and tooling exists:
- **`stylelint-declaration-strict-value`** — forces `color`, `background-color`, `border-color` to
  be token references; raw values fail the build. Practical advice from the same source:
  **start with colour only**, and only extend to spacing/typography once the token set can answer
  every question the linter will ask — otherwise people invent token names, "which is worse than
  hex values".
- **ESLint `no-restricted-syntax` / custom rules** can ban hardcoded colours inside
  `StyleSheet.create` for React Native, where stylelint does not reach.
- **`eslint-plugin-design-tokens`** (MetaMask) provides a ready `color-no-hex` rule.
- Repo-root **`AGENTS.md`** naming token locations and the no-literals rule is a documented 2026
  convention for keeping AI assistants inside the design system.
=> Module-boundary enforcement (CH8a) is a separate tool: `dependency-cruiser` or
   `eslint-plugin-boundaries`. Both belong in the verify command from the first point.

---

## R20 — Database tooling and OSRM sizing (research pass 15, for the build plan)

Sources: techsy.io "Prisma vs Drizzle: What Prisma 7 Changes" https://techsy.io/en/blog/prisma-vs-drizzle-orm ;
ecosire.com production report https://ecosire.com/blog/drizzle-orm-vs-prisma-2026-comparison ;
bytebase.com comparison; dev.to pockit_tools comparison; designrevision.com ;
sumguy.com "Self-Hosted OSRM in Docker" https://sumguy.com/self-hosted-osrm-docker/ ;
logistimo engineering blog on OSRM data generation; Cacher snippet (North America on EC2).

### R20.1 ORM choice — the decisive factor is PostGIS, not performance
- Both are production-ready. Prisma 7 removed the Rust engine, closing "roughly 70\%" of the
  cold-start gap; Drizzle remains smaller (57KB vs 1.6MB bundle).
- **Prisma wins on migration tooling** — "more mature, handles edge cases better, years of
  battle-testing". Drizzle Kit "still has rough edges with rename detection and data migrations".
- **Drizzle wins on SQL control and raw-SQL escape hatches**, and one source reports running it in
  production on NestJS with "66 schema files, ~100 tables, ~5K queries/sec at peak".
- **Drizzle is still pre-1.0** (v1.0.0-beta at time of writing) — "expect occasional breaking
  changes between minor versions".
- **The deciding factor for THIS project:** we need PostGIS `geography` columns, GIST indexes and
  spatial predicates. Prisma has no first-class PostGIS support and requires `Unsupported()` column
  types plus raw queries for spatial work. Drizzle's SQL-first design and `customType` make PostGIS
  columns and operators expressible in the schema itself.
=> **Recommendation: Drizzle**, with the pre-1.0 churn accepted and pinned by exact version. The
   migration-tooling weakness is mitigated because Drizzle Kit emits **plain SQL files we can edit
   and hand-write** — which is what a PostGIS schema needs anyway.
[Decision to be confirmed by the user before it enters the plan.]

### R20.2 OSRM memory and disk, by extract size
| Extract | PBF size | Prepared graph | RAM needed |
|---|---|---|---|
| Single US state (Texas, California) | 300–900 MB | a few GB | "fits on any box with 4+ GB RAM" |
| A country (Germany, USA) | 1–4 GB | 10–30 GB | 8–16 GB depending on algorithm |
| Continent (North America, Europe) | 10–25 GB | 80–150 GB | "you need real hardware" |
India-sized extract reportedly consumes ~7 GB RAM during generation. A general rule quoted
elsewhere: RAM needed at runtime is roughly 3–5× the map file size; preprocessing peaks far higher
than serving.

**Implication for us:** an **Alexandria-only** extract (a city, far smaller than a US state) is
comfortably in the "any box with 4+ GB RAM" band. Two consequences for the plan:
1. **Preprocessing must not run on the deployment platform.** It is memory-spiky and slow. Build the
   `.osrm` graph in CI (or locally) and **bake it into the image**, or store it on a volume; the
   running container then only serves.
2. DEC-163 (one OSRM instance per city) is validated by these numbers — per-city extracts stay
   small, whereas one multi-city graph would grow into the expensive band.

### R20.3 Consequence for Railway specifically
Because the prepared graph is baked at build time rather than generated at run time, the OSRM
service is a plain container with a modest memory ceiling — deployable on Railway, and equally
deployable on a VPS. If Railway's per-service memory proves insufficient for the chosen extract,
OSRM is the **first service to move to the VPS**, which is why the plan keeps the map provider
behind an interface (CH5 §5.9 already requires a fallback path).

---

## R21 — OSM quality assessment methodology (research pass 16, for P2 sequencing)

Sources: OSM Wiki "Quality assurance" https://wiki.openstreetmap.org/wiki/Quality_assurance ;
HOT toolbox 5.4 Quality Assurance Tools https://github.com/hotosm/toolbox/wiki/5.4-Quality-Assurance-Tools ;
HOT SDG guide part II §5; OSM Wiki "Data Quality Approach LAC" ;
learnosm.org "Reviewing OSM Data" ; State of the Map US 2019 validation talk.

### R21.1 There is an established methodology — this is not guesswork
The OSM community distinguishes **quality control** (find errors already in the data) from
**quality assurance** (prevent them being created). For a pre-launch survey we need QC.

Named tools, with the wiki's own assessment of each:
| Tool | Coverage | Wiki's stated quality |
|---|---|---|
| **JOSM Validator** | local (data loaded in the editor) | "**The best OSM validator, very few false positives**, false positives are quickly fixed" |
| **Osmose** | world, 200+ error types, has an API | "Highlights many things that may be issues that are probably not. Osmose's authors say **not to use as the sole source**" |
| **OSM Inspector** | world/partial, many error types | active |
| **Keep Right** | world, 50+ types | **inactive since 2017** — do not adopt (§16 maintenance check) |
| **BRouter Suspects** | world | **specifically car-routing problems** — directly relevant to us |
| **Turn Restriction validators** | — | "specifically designed to identify turn restrictions mapped in OSM, pointing out restrictions that have some topological inconsistency" |

### R21.2 The four quality dimensions to measure
learnosm and the LAC guide converge on the same four, which become our survey's measurement axes:
1. **Accuracy** — geometry aligns with imagery.
2. **Consistency** — topology is valid; no crossing or overlapping features; ways connect.
3. **Completeness** — are the features we need present at all.
4. **Temporal accuracy** — imagery and edits have dates; data may be stale rather than wrong.

### R21.3 Completeness cannot be measured from inside OSM
Explicit guidance: "In order to identify accuracy and completeness problems, in many cases it is
necessary to use procedures other than the tools described above. — **Comparison with external
sources**: satellite images, aerial photographs or official map data."
=> Our survey must compare against something external. For the launch corridors the cheapest
   credible external reference is (a) satellite imagery and (b) **a commercial routing provider's
   answer for the same origin-destination pairs**, which is a check we need anyway (R5.2).

### R21.4 Fixing what we find is cheap and permanent
JOSM can apply automatic fixes in bulk, and Overpass queries can retrieve exactly the features with
identified issues. Because OSM is editable, corrections to our launch corridors are contributed
upstream once and benefit every future rebuild of the graph.
=> The survey point should therefore budget for **fixing**, not only measuring. This is the rare
   case where the defect and the remedy are the same activity.

---

## R22 — Estimating demand before a service exists (research pass 17, for the driver-facing recommendation feature)

Sources: arterials.co "How to Estimate Transit Ridership"
https://www.arterials.co/how-to-estimate-ridership-for-a-transit-line/ ;
r/transit practitioner discussion; MIT thesis on predicting ridership for bus service changes;
ScienceDirect agent-based transit ridership study (2024).

### R22.1 The cold-start problem is named and has a standard answer
A MIT thesis states the constraint plainly: models built on historical ridership "cannot be applied
to estimate ridership for a new route". Practitioners confirm the workaround is comparison:
"referencing similar projects in other cities, or using heuristic 'rules of thumb'".

### R22.2 The corridor-yield formula — the defensible simple method
For rapid screening before any data exists:
```
ridership ≈ corridor population × trip rate × capture rate × coverage
            (adjusted for fare competitiveness and car competitiveness)
```
The recommended discipline around it:
- **Calibrate against a known corridor.** Pick an existing route with observed ridership, run the
  formula, and adjust capture rate and competitiveness "until the model reproduces observed
  ridership within a sensible margin (e.g. ±10–20%)". Validate on a second corridor if possible.
- Use it for screening and shortlisting, not for promises.

### R22.3 Direct implication for the user's new requirement
The user asks that when a driver opens a departure, the app **recommend times and routes and
estimate how many people** will travel. Before launch there is no history, so the estimate must be
built in stages, and **must be labelled by which stage produced it**:
| Stage | Source of the estimate | Available |
|---|---|---|
| 0 | Corridor-yield heuristic, calibrated against a known microbus line (R22.2) | before launch |
| 1 | **Actual unmet demand** — riders who searched that route and slot and found nothing | from first week |
| 2 | Realised bookings on the same route/slot/weekday, recent-weighted | after ~2–4 weeks |
| 3 | Model combining 1 and 2 with weather, term dates, Ramadan (DEC-118) | later |
The honest presentation rule that follows: **never show a bare number**. Show what it is derived
from ("8 people searched this slot yesterday and found nothing") because a fabricated confident
figure that proves wrong destroys driver trust permanently, and drivers talk to each other.
