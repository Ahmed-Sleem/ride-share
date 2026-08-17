# CHAPTER 4 — Geography: Meeting Points, Zones, Routes & Service Areas

Status: DRAFT v2 — tier-pricing conflict and walking ceiling RESOLVED (DEC-063/064/067).
Depends on: CH1, CH2, CH3
Implements: DEC-004, DEC-038, DEC-040..044, DEC-057
Addresses gaps: G-022 (mapping tool), G-024 (dynamic walking), G-032 (manager-controlled areas)

---

## 4.0 Why geography is the foundation of the whole product

Everything the algorithm can do is limited by the quality of the places it can use. A pooling system
with bad stops is a bad product no matter how good the mathematics is. Research (R3) confirms the
approach: Via runs "corner to corner instead of door to door", assigning each rider a virtual stop
and drawing a walking line to it — that is precisely the user's Tier-1 concept, already proven in
production.

---

## 4.1 The geographic objects

| Object | What it is | Created by | Mandatory data | Optional data |
|---|---|---|---|---|
| **Stop** | A named physical point where boarding/alighting happens | Admin only (DEC-038) | name, map location | night-safe flag, accessible flag, photos (many), description, landmark, notes (DEC-043) |
| **Zone** | A polygon grouping an area (a district, a campus, an industrial area) | Admin | name, polygon | parent zone, display colour |
| **Corridor / Route Template** | A named ordered list of Stops that vehicles commonly run | Admin / Manager | name, ordered stops | direction pair, default schedule |
| **Service Area** | The set of zones/corridors where the service is ACTIVE and accepting bookings | **Manager** (DEC-057) | name, geometry or corridor list, active flag | schedule of activity, launch date |

### 4.1.1 The whole map is always visible (DEC-057)
Users always see the entire city map. Areas with no service simply have no journeys and no stops
shown, which makes coverage self-evident without an error message or an artificial boundary wall.
Rule: never block a user from looking; only from booking where there is no service.

### 4.1.2 Stop identity and lifecycle
`PROPOSED -> ACTIVE -> (SUSPENDED) -> RETIRED`
- Stops are never hard-deleted; historical Bookings must keep resolving to a real place.
- A retired stop stays readable forever but cannot be assigned to new journeys.
- Every stop carries a stable public code (e.g. `ALX-SMO-014`) usable by support and drivers.

---

## 4.2a The boarding/alighting asymmetry (DEC-140) — important
> **Boarding happens ONLY at fixed stops** (or a priced street pickup). It must be predictable so
> the driver knows where to stop and the manifest is accurate.
> **Alighting is FREE** — the rider may get off at any point along the route (DEC-114), signalled
> per DEC-117.
This asymmetry is deliberate: pickups need certainty, drop-offs do not.

## 4.2 The three pickup tiers (DEC-004) — and an unresolved conflict

The user's original tiering:
- **Tier 1 — Stop pickup**: rider walks to an assigned Stop. Base price. If nobody is assigned to a
  stop, the driver is told to SKIP it (DEC-041).
- **Tier 2 — On-route pickup**: the vehicle stops for a rider who is close to its existing path.
  Costs more than Tier 1.
- ~~**Tier 3 — Door-to-door**~~: **DROPPED entirely by DEC-067.** Retained here only as the
  reasoning record; it is not part of the product.

### RESOLVED — reconciliation with fixed-route pricing (DEC-063, DEC-067)
The conflict between DEC-004 (three priced tiers) and DEC-058 (one fixed route price) was resolved:
- **Tier 3 (full door-to-door) is DROPPED entirely** (DEC-067).
- **Two ticket types remain**: the STOP ticket at the fixed route price, and the STREET/ON-ROUTE
  PICKUP ticket priced by the three-layer formula in CH6a (DEC-063, DEC-066).
- Both numbers are shown to the rider before booking and locked at booking (DEC-056).

---

## 4.3 Walking rules (DEC-044) — "dynamic, closest suitable stop"

The user rejected a fixed radius and specified: for a stops-only journey, offer the rider the
CLOSEST suitable stop.

### 4.3.1 What "suitable" must mean (proposed definition, [MCQ PENDING] on the weights)
A stop is *suitable* for a rider if ALL of the following hold:
1. It is ACTIVE and inside an active Service Area.
2. It lies on the ROUTE the rider selected (DEC-120), or can be inserted into a Journey on that
   route without breaking its timetable (DEC-119).
3. The walking route to it is reachable (not across a motorway, not through a closed area).
4. It does not violate any rider-specific constraint (accessibility need, night-safety preference)
   where that data exists (DEC-043 optional flags).

**Resolved by DEC-134:** there is no weighted formula. Boarding points are listed **sorted by
walking time, with honest distances shown**, and one is marked as recommended. The rider chooses
(DEC-065). No walking ceiling exists (DEC-064); street pickup is always offered alongside.

### 4.3.2 Hard walking ceiling — RESOLVED (DEC-064)
There is **NO hard walking ceiling**. However far the nearest suitable stop is, it is shown, and the
STREET PICKUP option is **always offered alongside it** (DEC-064) — turning a coverage gap into a
priced alternative rather than a rejection.
Requirement this places on the UI: walking distance and time must be stated **honestly and
prominently** so the rider self-selects; a 25-minute walk must never be presented as if it were
convenient.

---

## 4.4 The Stop Mapping Tool (G-022) — a required internal product

DEC-040 commits a dedicated team to mapping Alexandria before launch. That makes the mapping tool a
first-class build item, not a convenience script.

### 4.4.1 Required capabilities
- **Field mode on a phone**: drop a pin at your current GPS position, name it, save; works offline
  and syncs later (mappers will be standing in the street with poor signal).
- **Desk mode on a laptop**: place, move, merge, split, rename, bulk-edit stops on a large map.
- **Duplicate detection**: warn when a new stop is within X metres of an existing one.
- **Coverage view**: heat/grid display of mapped vs unmapped areas, and progress per district.
- **Photo capture**: multiple photos per stop, compressed, geotagged.
- **Optional attributes**: night-safe, accessible, description — never blocking, always skippable
  (DEC-043).
- **Import/Export**: CSV/GeoJSON in and out; the ability to seed from OSM candidate points is
  allowed as INPUT ONLY, since every stop must still be admin-approved (DEC-038).
- **Review queue**: a second person can verify a mapper's stops before they go ACTIVE.
- **Audit**: who created/edited each stop and when.

### 4.4.2 Quality rules for mappers (to be written into the field handbook)
A stop must be a place where a vehicle can legally and safely halt briefly, where a person can stand
and be seen, and which can be described in a short phrase a stranger would understand.

---

## 4.5 Manager-controlled service expansion (DEC-057, G-032)

Opening a new area or route must be a DASHBOARD ACTION, with no code deployment.
- A Manager can create a Service Area, attach corridors/zones, set prices, and activate it.
- Activation is scheduled (e.g. "goes live Sunday 06:00") and reversible.
- Deactivation must handle in-flight bookings gracefully: existing bookings are honoured; new
  bookings stop.
- Every activation/deactivation is logged with who, when, and why.

### 4.5.1 What this requires technically (feeds CH8)
Service areas, prices, walking ceilings, wait times and matching parameters must all be
CONFIGURATION stored in the database and editable at runtime — never constants in the source code.
This is also what makes DEC-002 (scale to any city) real: a new city is a new configuration row set,
not a new deployment.

---

## 4.6 Multi-city structure (DEC-002)
- Every geographic object belongs to a **City**, and every City to a **Country** with its own
  currency, language default, timezone, and map/routing provider configuration.
- No code may assume Egypt, EGP, Arabic, or Africa/Cairo.
- Stop codes, route names and prices are all scoped per city.

---

## 4.7 Invariants added by this chapter
- INV-18 A Stop referenced by any historical Booking can never be deleted, only RETIRED.
- INV-19 A Journey Stop must reference an ACTIVE Stop at the time the Journey was published.
- INV-20 A Booking cannot be created for a location outside an ACTIVE Service Area.
- INV-21 Every geographic object belongs to exactly one City.
- INV-22 Service-area and pricing configuration changes are versioned and never overwrite history:
  a past Booking must always be explainable by the configuration that was live when it was made.

## 4.8 Open items carried from this chapter
- ~~Whether riders may choose a different stop~~ — RESOLVED by DEC-065 (rider may choose any stop; system recommends)
- ~~Drop-off symmetry~~ — RESOLVED by DEC-114/117: there is no declared drop-off; the rider alights
  at any stop on the route, signalled at the time (DEC-117).
