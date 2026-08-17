# CHAPTER 9 — Data Model & API Contract

Status: DRAFT v2 — updated for the ROUTE-TICKET model (DEC-114..120). Implements DEC-088..091 and every entity decision from CH1-CH6.
Depends on: CH1 (domain), CH2 (roles), CH3 (states), CH4 (geo), CH5 (algorithm), CH6 (money)
This is the chapter a developer builds directly from.

---

## 9.1 Conventions (binding on all tables)
- Primary keys: UUID v7 (time-ordered, index-friendly).
- All timestamps: `timestamptz`, stored UTC, rendered in the city's timezone.
- Money: `bigint` minor units (piastres) + a `currency` char(3). **Never floating point** (INV-30).
- Soft-delete is FORBIDDEN except where explicitly stated; use lifecycle states instead.
- Every table has `created_at`, `updated_at`; mutable business tables also carry `version` for
  optimistic locking.
- Every table belongs to a module (CH8a §8a.2); cross-module foreign keys only to stable IDs.
- Spatial columns: `geography(Point,4326)` for points, `geography(Polygon,4326)` for zones, with
  GIST indexes.

---

## 9.2 Core tables

### identity module
```
users(id, phone_e164 UNIQUE, phone_verified_at, passcode_hash NULL, email NULL,
      email_verified_at NULL, display_name, photo_url NULL, preferred_language,
      status[ACTIVE|SUSPENDED|ANONYMISED], created_at, updated_at)
user_roles(user_id, role[RIDER|DRIVER|SUPPORT|OPS_ADMIN|MANAGER|SUPER_ADMIN],
           granted_by, granted_at, revoked_at NULL)     -- PK(user_id, role)
sessions(id, user_id, device_id, platform, refresh_token_hash, expires_at, revoked_at NULL)
otp_challenges(id, phone_e164, code_hash, purpose, attempts, expires_at, consumed_at NULL)
```
Indexes: `users(phone_e164)`, `user_roles(user_id) WHERE revoked_at IS NULL`.

### drivers module
```
driver_profiles(id, user_id UNIQUE, status[REGISTERED|DOCS_SUBMITTED|UNDER_REVIEW|APPROVED|
                NEEDS_FIX|REJECTED|SUSPENDED|DEACTIVATED], approved_at NULL, approved_by NULL,
                rejection_reason NULL, rating_avg, rating_count)
driver_documents(id, driver_id, type[NATIONAL_ID|DRIVING_LICENCE|VEHICLE_LICENCE|SELFIE],
                 file_refs jsonb, number NULL, expires_at NULL,
                 status[PENDING|APPROVED|REJECTED], reviewed_by NULL, reviewed_at NULL)
driver_duty(driver_id PK, state[OFFLINE|ONLINE_IDLE|ASSIGNED|DRIVING|BREAK],
            active_vehicle_id NULL, last_seen_at, last_position geography(Point,4326))
```
Rule: a nightly job SUSPENDS any driver whose document `expires_at` has passed (CH2 §2.5).

### vehicles module
```
vehicles(id, city_id, plate UNIQUE_per_city, make, model, colour, year,
         seat_capacity, status[DRAFT|SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED|SUSPENDED|RETIRED],
         fleet_label NULL, fleet_id NULL, created_by, approved_by NULL, approved_at NULL)
driver_vehicles(driver_id, vehicle_id, is_active, linked_at, unlinked_at NULL)  -- PK(driver_id,vehicle_id)
vehicle_documents(...)  -- same shape as driver_documents
```
Note (DEC-039): no ownership relationship is asserted; a driver may hold several approved vehicles.

### geo module
```
cities(id, country_code, name, timezone, currency, default_language, map_provider_config jsonb,
       status[ACTIVE|INACTIVE])
stops(id, city_id, public_code UNIQUE, name_ar, name_en, location geography(Point,4326),
      status[PROPOSED|ACTIVE|SUSPENDED|RETIRED],
      night_safe bool NULL, accessible bool NULL, description NULL,
      created_by, verified_by NULL, verified_at NULL)          -- DEC-043: only name+location required
stop_photos(id, stop_id, file_ref, taken_at, taken_by)
zones(id, city_id, name, boundary geography(Polygon,4326), parent_zone_id NULL)
route_templates(id, city_id, name_ar, name_en, direction_label, active bool,
                flat_fare_minor,                     -- DEC-115: ONE price for the whole route
                service_window_start, service_window_end,   -- DEC-132: operating hours
                slot_interval_minutes,               -- DEC-132: the published grid
                target_frequency_minutes,            -- DEC-119 timetable target
                published_timetable jsonb)
route_slots(id, route_template_id, local_time, days_of_week int[],  -- DEC-132 the SLOT GRID
            active bool, max_vehicles int DEFAULT 1,   -- CH4a T5 collision control
            incentive_minor DEFAULT 0)                 -- CH4a §4a.6 uncovered-slot bonus
slot_claims(id, slot_id, service_date, driver_id, vehicle_id,
            claim_type[ONE_OFF|RECURRING], committed bool,  -- CH4a §4a.7 subscription backing
            claimed_at, released_at NULL, journey_id NULL,
            UNIQUE(slot_id, service_date, driver_id))
route_template_stops(route_template_id, sequence, stop_id)     -- PK(route_template_id, sequence)
service_areas(id, city_id, name, geometry geography(Polygon,4326) NULL,
              corridor_ids uuid[] NULL, active bool, activates_at NULL, deactivates_at NULL,
              changed_by, changed_at)
```
Indexes: GIST on all geography columns; `stops(city_id, status)`.

### journeys module
```
journeys(id, city_id, driver_id, vehicle_id, route_template_id, slot_id, slot_claim_id,
         timetable jsonb,                     -- DEC-119: published schedule this journey must keep
         schedule_slip_seconds int DEFAULT 0, -- live measure against the timetable
         supply_policy[PEER_CARPOOL|OPERATOR_FLEET|PLATFORM_DISPATCH],
         route_policy[FIXED|DEVIATION_ALLOWED|DYNAMIC],
         boarding_policy[STOPS_ONLY|STOPS_PLUS_ONROUTE],
         state[DRAFT|PUBLISHED|OPEN_FOR_BOOKING|LOCKED|IN_PROGRESS|COMPLETED|CANCELLED|ABORTED],
         seats_total, seats_taken, departs_at, locks_at, started_at NULL, completed_at NULL,
         config_version_id)                     -- INV-22: which config priced this journey
journey_stops(id, journey_id, sequence, stop_id NULL, adhoc_location geography(Point,4326) NULL,
              planned_arrival_at, actual_arrival_at NULL, skipped bool DEFAULT false)
journey_events(id, journey_id, type, payload jsonb, occurred_at, actor_id NULL)  -- append-only
```
Constraint: `seats_taken <= vehicles.seat_capacity` (INV-2), enforced in a transaction with a row lock.

### requests & bookings modules
```
ride_requests(id, rider_id, city_id, route_template_id, boarding_stop_id NULL,
              boarding_location geography(Point,4326) NULL,   -- for STREET tickets
              depart_after NULL, seats, ticket_type[STOP|STREET],
              state[CREATED|SEARCHING|OFFERED|CONFIRMED|OFFER_EXPIRED|NO_SUPPLY|EXPIRED|CANCELLED],
              created_at, expires_at)
offers(id, request_id, journey_id, pickup_stop_id NULL,
       quoted_fare_minor, walk_seconds, wait_seconds,
       held_until, state[OFFERED|ACCEPTED|EXPIRED|WITHDRAWN])
bookings(id, request_id NULL, journey_id, rider_id, seats, route_template_id,
         pickup_journey_stop_id,
         dropoff_journey_stop_id NULL,        -- DEC-114: NO destination is declared at booking
         alight_signalled_at NULL,            -- DEC-117: when the rider signalled
         alight_signalled_by[RIDER|DRIVER] NULL,
         actual_alight_stop_id NULL,          -- filled when they actually get off
         ticket_type[STOP|STREET], fare_minor, currency, config_version_id,
         payment_method[WALLET|CASH|CARD|MOBILE_WALLET|INSTAPAY|APPLE_PAY],
         state[RESERVED|CONFIRMED|EN_ROUTE|WAITING|ON_BOARD|COMPLETED|NO_SHOW|
               CANCELLED_RIDER|CANCELLED_DRIVER|CANCELLED_SYSTEM],
         cash_collected_at NULL, boarded_at NULL, completed_at NULL)
booking_qr(booking_id, seat_index, code_secret, rotates_every_seconds, issued_at)  -- DEC-083 multi-seat
booking_events(id, booking_id, type, payload jsonb, occurred_at, actor_id)  -- append-only
```
DEC-083: one booking with `seats = 3` issues 3 QR codes, all owned by the same rider.

### payments module
```
wallets(id, owner_type[USER|PLATFORM], owner_id, currency, balance_minor)  -- balance is a cached projection
ledger_entries(id, account_type, account_id, direction[DEBIT|CREDIT], amount_minor, currency,
               cause_type[BOOKING|REFUND|PAYOUT|PROMOTION|TOPUP|CASH_COLLECTION|ADJUSTMENT],
               cause_id, counter_entry_id, config_version_id, created_at, created_by)  -- APPEND-ONLY
payment_intents(id, user_id, provider, provider_ref, amount_minor, status, raw jsonb)
payouts(id, driver_id, period_start, period_end, gross_minor, cash_liability_minor,
        fees_minor, net_minor, provider_ref, status, executed_at NULL)
subscriptions(id, rider_id, route_template_id, period[WEEKLY|MONTHLY], days_of_week int[],
              depart_time, seats, price_minor, starts_on, ends_on, status, paused_ranges jsonb)
```
INV-27: every ledger entry has a counter-entry; the ledger always balances.

### config, promotions, audit
```
config_values(id, key, scope_type[GLOBAL|COUNTRY|CITY|CORRIDOR|ROUTE|VEHICLE_CLASS|TIME_WINDOW],
              scope_id NULL, value jsonb, version int, effective_from, effective_to NULL,
              changed_by, reason, created_at)                  -- versioned, never overwritten
promotions(id, city_id, type[FLASH_SALE|REFERRAL|SHARE_REWARD|STREAK], rules jsonb,
           budget_minor, spent_minor, starts_at, ends_at, active bool, created_by)
audit_log(id, actor_id, action, target_type, target_id, before jsonb, after jsonb,
          reason, ip, occurred_at)                             -- APPEND-ONLY, no updates or deletes
```

---

## 9.3 API design (DEC-088: REST + WebSockets)

### Principles
- Versioned base path: `/api/v1/...`
- Every mutating request carries an **`Idempotency-Key`** header; replays return the original result.
- Errors are structured: `{ code, message_key, details }` — `message_key` is translated client-side
  so errors work in Arabic and English (DEC-017).
- Every list endpoint is cursor-paginated. No offset pagination.
- Auth: short-lived access token + refresh token; every request carries the acting role.

### Rider endpoints
```
POST /v1/auth/otp/request          {phone}
POST /v1/auth/otp/verify           {phone, code}          -> tokens
POST /v1/auth/passcode/set         {passcode}
GET  /v1/geo/stops?bbox=&city=                            -> stops for the map (DEC-065)
GET  /v1/routes                    ?city=&near=         -> routes list/map (DEC-120)
GET  /v1/routes/:id/boarding_points ?near=               -> stops on this route + walk times
POST /v1/requests                  {route_id, boarding_stop_id|location, seats, ticket_type}
                                                          -> {request_id, offers[] (max 3 departures)}
POST /v1/requests/:id/accept       {offer_id}             -> booking (seat hold -> CONFIRMED)
GET  /v1/bookings                  ?status=               -> my bookings
GET  /v1/bookings/:id                                     -> detail + live journey link
GET  /v1/bookings/:id/qr                                  -> rotating QR payload(s), one per seat
POST /v1/bookings/:id/alight                              -> DEC-117 "I'm getting off at the next stop"
POST /v1/bookings/:id/cancel                              -> forfeit applied per DEC-055
GET  /v1/wallet                                           -> balance + entries
POST /v1/wallet/topup              {amount, method}       -> payment intent
POST /v1/subscriptions             {route_template, days, time, seats}
POST /v1/subscriptions/:id/skip    {date}
POST /v1/subscriptions/:id/pause   {from, to}
```

### Driver endpoints
```
POST /v1/driver/duty               {state}                -> ONLINE_IDLE / OFFLINE
POST /v1/driver/location           {points[]}             -> batched, adaptive (DEC-090)
GET  /v1/driver/journeys/active                           -> journey + full manifest
POST /v1/driver/journeys/:id/start
POST /v1/driver/stops/:id/arrived                         -> offline-queueable (DEC-091)
POST /v1/driver/bookings/:id/scan  {qr_payload, seat}     -> ON_BOARD; offline-queueable
POST /v1/driver/bookings/:id/cash  {collected: true}      -> cash liability (DEC-078)
POST /v1/driver/bookings/:id/alight {stop_id}             -> driver marks a rider alighting (DEC-117)
POST /v1/driver/bookings/:id/no_show
POST /v1/driver/journeys/:id/complete
GET  /v1/driver/routes                                   -- DEC-132: routes open to this driver
GET  /v1/driver/routes/:id/slots   ?date=                -- the published slot grid + demand
POST /v1/driver/slots/:id/claim    {date|recurring, vehicle_id}
GET  /v1/driver/claims
DELETE /v1/driver/claims/:id                             -- release, penalty per CH4a T6
GET  /v1/driver/earnings           ?period=
```

### Manager endpoints (DEC-045, DEC-062)
```
GET  /v1/manage/occupancy/live                            -> vehicles, seats free, by zone
GET  /v1/manage/metrics            ?from=&to=&groupBy=
GET  /v1/manage/config             ?scope=&key=
PUT  /v1/manage/config             {key,scope,value,reason}   -> versioned write
POST /v1/manage/config/preview     {change}               -> impact on recent journeys BEFORE publish
POST /v1/manage/config/rollback    {version_id}
POST /v1/manage/promotions         {type,rules,budget,window}
POST /v1/manage/promotions/:id/stop
POST /v1/manage/service-areas      {geometry|corridors, activates_at}
POST /v1/manage/campaigns          {audience, message, channel, schedule}
```

### Ops Admin endpoints
```
GET  /v1/ops/queue/drivers         ?status=UNDER_REVIEW
POST /v1/ops/drivers/:id/decision  {approve|needs_fix|reject, reason}
GET  /v1/ops/queue/vehicles
POST /v1/ops/vehicles/:id/decision {...}
POST /v1/ops/routes                {name, stops[], flat_fare, service_window}  -- DEC-132
POST /v1/ops/routes/:id/slots      {interval, days, max_vehicles}   -- publish the slot grid
GET  /v1/manage/coverage           ?date=&route=          -- claimed vs uncovered slots (CH4a §4a.6)
POST /v1/manage/slots/:id/incentive {amount, budget}      -- bonus for an uncovered slot
POST /v1/ops/stops                 {name, location, optional attrs}   -- Stop Mapping Tool (G-022)
PUT  /v1/ops/stops/:id
POST /v1/ops/stops/bulk_import     {geojson|csv}
GET  /v1/ops/live-map                                     -> all active journeys
POST /v1/ops/users/:id/suspend     {reason}
```

### Support endpoints (bounded per CH2 §2.4)
```
GET  /v1/support/lookup            ?phone=|booking=       -> limited view, no ID documents
POST /v1/support/bookings/:id/cancel {reason}
POST /v1/support/bookings/:id/refund {amount, reason}     -> rejected above SupportRefundLimit
POST /v1/support/escalate          {target, reason}
```

### WebSocket channels (DEC-089 — only what matters)
```
ws /v1/live
  subscribe: booking:{id}     -> state changes, vehicle position, ETA, stop arrival alarm (DEC-053)
  subscribe: journey:{id}     -> driver's manifest updates, stop progress
  subscribe: ops:city:{id}    -> live map for ops (throttled)
  subscribe: manage:city:{id} -> occupancy snapshot every 5-10s (near-live, not per-event)
```

---

## 9.4 Offline behaviour (DEC-091)

### What works offline (driver app)
QR scans, stop-arrival marking, journey start/complete, cash-collected marking, no-show marking.

### Mechanism
1. Action is applied **optimistically** to local state so the UI never freezes.
2. It is written to a durable local **outbox** with a generated `Idempotency-Key`.
3. On reconnect, the outbox replays in order; the server deduplicates by key.
4. Conflicts (e.g. the ride was already cancelled server-side) resolve with **server authority**,
   and the driver is shown a clear, plain-language explanation of what changed.
5. QR payloads are **signed and time-bounded**, so a scan can be validated locally without network.

### What does NOT work offline
Booking, payment, and anything that allocates a scarce resource — because seat availability cannot
be verified without the server, and promising an unavailable seat is worse than failing honestly.

---

## 9.5 Location pipeline (DEC-090)
- Device samples GPS adaptively: high frequency near a stop, during pickup, or when a rider is
  actively watching; low frequency on long stretches.
- Points are **batched** and compressed before sending; a single request may carry several samples.
- Server writes to Redis (hot, for matching and live view) and appends to a durable store for
  analytics and disputes (DEC-050).
- Map-matching snaps points to roads before display (reduces jitter, improves ETA quality).
- Battery guard: if the device reports low battery, sampling reduces further and the driver is
  warned rather than the app silently degrading (F-34).

---

## 9.6 Invariants enforced at the database level
- INV-2 seats: enforced by a transactional check with row locking on `journeys`.
- INV-11 self-booking: `bookings.rider_id` is always the authenticated user.
- INV-31 seat release: a seat is counted as occupied for all remaining stops until
  `alight_signalled_at` is set (DEC-116/117). No speculative release.
- INV-27 ledger balance: enforced by requiring `counter_entry_id` on every entry.
- INV-18 stops never deleted: no DELETE grant on `stops`; only status transitions.
- Audit and event tables: INSERT-only grants; no UPDATE or DELETE for any role.

## 9.7 Open items
- ~~Config key catalogue~~ — DELIVERED as Chapter 19.
- ~~Wallet balance storage~~ — CLOSED by DEC-153: materialised projection, reconciled nightly; the ledger remains the source of truth.
- ~~Retention periods~~ — CLOSED by DEC-094/DEC-137: everything retained indefinitely, cold-storage tiered after `ColdStorageAfterDays` (CH19).


---

## 9.8 Route-ticket changes (v2, DEC-114..120)

| Change | Detail |
|---|---|
| Destination removed from booking | `ride_requests` no longer carries a destination; `bookings.dropoff_journey_stop_id` is NULLABLE and is filled only after the rider actually alights |
| Route is now first-class | `bookings.route_template_id` is required; `route_templates` carries `flat_fare_minor` (DEC-115) and `published_timetable` (DEC-119) |
| Alighting is an event, not a plan | `alight_signalled_at`, `alight_signalled_by`, `actual_alight_stop_id` |
| Schedule adherence is measured | `journeys.timetable` and `journeys.schedule_slip_seconds` support the F6 replacement (DEC-119) |
| New endpoints | `GET /v1/routes`, `GET /v1/routes/:id/boarding_points`, `POST /v1/bookings/:id/alight`, `POST /v1/driver/bookings/:id/alight` |
| Wall-clock scheduling (DEC-118) | Timetables and subscriptions store LOCAL time + IANA timezone, never a bare UTC instant, so DST never shifts a commute |


---

## 9.9 Supply-model additions (DEC-132 / CH4a)
| Table | Purpose |
|---|---|
| `route_slots` | The published grid a driver claims from. `max_vehicles` implements the collision rule (CH4a T5); `incentive_minor` implements the uncovered-slot bonus (CH4a §4a.6) |
| `slot_claims` | A driver's claim on a slot for a service date. `committed` marks coverage that subscriptions may be sold against (CH4a §4a.7) — the honesty rule for DEC-130 |
| `journeys.slot_id`, `journeys.slot_claim_id` | Every Journey now originates from a claimed slot |
**Invariant added**
- INV-32 A Journey may only exist for a slot that has an active `slot_claim`, and the number of
  Journeys per (slot, service_date) may never exceed `route_slots.max_vehicles`.
- INV-33 A subscription may only be sold against slots whose claim has `committed = true` (CH4a §4a.7).
