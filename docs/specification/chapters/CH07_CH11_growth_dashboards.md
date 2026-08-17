# CHAPTER 7 — Growth & Incentives  +  CHAPTER 11 — Dashboards

Status: DRAFT v1. Implements DEC-045, DEC-060, DEC-061, DEC-062, DEC-082, DEC-101..103.
Depends on: CH2 (roles), CH6 (money/ledger), CH9 (API)

===============================================================================
# PART A — CHAPTER 7: GROWTH & INCENTIVES
===============================================================================

## 7.0 The requirement
The user's original words: the app "must encourage people to do these more than the now thing" —
i.e. shift people from their current transport habit to shared rides.

## 7.1 The three mechanics (DEC-082, DEC-103 — built equally, measured honestly)

### 7.1.1 Referrals
- Both parties are credited **only after the invitee completes a first ride** (never at signup —
  that is the classic abuse vector, CH12 §12.3.3).
- Unique code + shareable link per user; attribution on first install or first booking.
- Reward amount, caps per user/period, and the entire mechanic are Manager-configurable (DEC-061).
- Anti-abuse: one reward per verified phone, device fingerprinting, linked-account detection.

### 7.1.2 Journey sharing (DEC-060)
- A rider can share a specific journey ("I'm going to campus at 07:30, join me").
- If another rider books a seat on that journey via the share, the sharer earns credit.
- This is the mechanic that directly fills empty seats — the platform's core economic need.
- Attribution: the shared link carries a journey id + sharer id; the reward fires on the joiner's
  booking becoming COMPLETED.

### 7.1.3 Commuter streaks
- Reward consistency: N consecutive commuting days → bonus wallet credit or a free ride.
- Streaks tolerate configured "protected" days (weekends, holidays, an allowed skip) so a single
  sick day does not destroy months of habit — the point is habit, not punishment.
- Feeds directly into subscription conversion (DEC-051) and the trial day (DEC-100).

## 7.2 Flash sales & campaigns (DEC-045)
- A flash sale = a time-boxed discount targeted at specific routes / corridors / stops / time
  windows / rider segments.
- **Hard budget cap** enforced in the ledger (INV-29): when the budget is exhausted, the promotion
  stops automatically. It cannot overspend.
- Automatic expiry at the scheduled end time; no promotion runs forever by accident.
- A campaign (notification send) can be attached to a promotion, subject to the per-user rate limits
  in CH10 §10.6.

## 7.3 Measurement (non-negotiable)
Every mechanic must report, per city and per period: cost, rides generated, new users acquired,
retention effect at 7/30 days, and cost per retained rider. A mechanic that cannot be measured is
switched off. This is what makes DEC-103 ("let the data decide") real rather than rhetorical.

## 7.4 Rules that protect the business
- No mechanic may pay out more than its allocated budget (INV-29).
- Rewards are wallet credit, not cash — they return value to the platform (consistent with DEC-055).
- Every reward is a ledger entry against the Promotion Budget account, so true cost is always visible.
- Any single user's total lifetime rewards are capped, configurable.

===============================================================================
# PART B — CHAPTER 11: DASHBOARDS
===============================================================================

## 11.0 Two distinct dashboards
Per DEC-045/DEC-046, commercial and operational power are separated. They are therefore two
different products with different home screens, not one dashboard with tabs.

---

## 11.1 MANAGER dashboard (commercial)

### 11.1.1 Home: live map + active alerts (DEC-101, DEC-045)
The main screen is a **live city map with an occupancy overlay** — vehicles running, seats free,
demand density by zone — with an **alert rail** beside it.

### 11.1.2 Alerts (the core innovation)
Each alert is a sentence plus an action:
```
⚠ Zone 4 (Smouha)   occupancy 32%   12 empty seats now
   [ Launch flash sale ]  [ Notify riders ]  [ Dismiss ]

⚠ Corridor: Sidi Gaber → University   8 unserved requests in 20 min
   [ Open route ]  [ Alert drivers ]  [ Dismiss ]
```
- Thresholds are configuration (DEC-070), tunable per city and per time window.
- Alerts are actionable in one click; dismissal is recorded.
- Alerts can also be delivered by email/push so a manager is not required to watch the screen.
- **Deliberately NOT automatic:** a human confirms every money-spending action. Automatic rules were
  considered and rejected for now (DEC-101) because a buggy rule spends real money.

### 11.1.3 Pricing control (DEC-062, CH6a)
- Edit **route flat fares** (DEC-115), the **per-km SUGGESTION rate** used only to propose a fare when
  creating a new route (DEC-133 — riders are never charged per km), and every variable of the
  street-pickup formula.
- Scope inheritance shown explicitly (global → country → city → corridor → route → time window),
  with an indicator of where each value came from.
- **Preview before publish**: the effect of the change on real recent journeys, including how many
  street pickups would have been refused.
- Versioned, attributed, reason required, scheduled activation, one-click rollback.
- Sanity limits prevent zero or absurd fares.

### 11.1.4 Promotions & campaigns
Create/stop flash sales, referral and streak parameters, budgets and audiences; live spend against
budget; per-mechanic performance (7.3).

### 11.1.5 Analytics
Rides, revenue, commission, occupancy, fill rate, unserved requests, cancellation rate, street-pickup
share, subscription growth, reward cost — all by city, corridor, route and time.

### 11.1.6 Service expansion (DEC-057, G-032)
Create and activate service areas and routes from the dashboard, with scheduled go-live and
graceful deactivation that honours in-flight bookings.

---

## 11.2 OPERATIONS ADMIN dashboard

### 11.2.1 Home: the work queue (DEC-102)
```
Pending driver approvals        14   ← oldest 2 days
Pending vehicle approvals        9
Open incidents                   3   ← 1 HIGH severity
Disputes awaiting decision       5
Expiring documents (7 days)     22
Stops awaiting verification     41
```
Priority order, oldest-first within severity, with SLA age visible. Clearing queues is the job.

### 11.2.2 Approval workspace
Driver/vehicle documents side by side with the submitted data; approve / needs-fix / reject with a
mandatory reason shown to the applicant in their language. Identity documents are visible **only**
to Ops Admin and Super Admin (CH2 §2.4).

### 11.2.3 Incident workspace (CH12 §12.2)
Full evidence in one place: event log, GPS trace, manifest, masked-call log, prior history of both
parties. Decision options with mandatory reason; automatic precautionary suspension for severe
categories.

### 11.2.4 Live operations map
Every active journey, delayed vehicles, stranded riders, aborted journeys — for intervening in real
time, not for browsing.

### 11.2.5 The Stop Mapping Tool (G-022, DEC-040)
Specified in CH4 §4.4; it lives inside this dashboard, plus a phone-friendly field mode.

---

## 11.3 SUPPORT workspace (bounded, CH2 §2.4)
Deliberately minimal: look up a rider by phone or booking, see the active journey only, contact via
masked channel, cancel, refund up to the configured limit, escalate. **Identity documents are never
visible.** Every action is audited with a mandatory reason.

## 11.4 Cross-cutting dashboard rules
- Desktop-first layouts (dense tables, keyboard shortcuts, bulk actions) — this is why the web app
> **SUPERSEDED BY DEC-176.** The Android application is built with **Capacitor** wrapping the web
> app, not Expo/React Native. One UI codebase. See BUILD_PLAN Phase 7 for the reason and for the
> P7.4 gate at which the driver app alone could revert to React Native.

  is Next.js and not React Native (DEC-085, R11.5).
- Every destructive or money-moving action requires a typed reason and is written to the audit log.
- Every list is exportable — and every export is audited (CH12 §12.7).
- Arabic/English with full RTL, same as the apps (DEC-017).

## 11.5 Open items
- ~~Alert threshold defaults~~ — DEFERRED to post-beta by DEC-161; fields exist, unset.
- ~~Manager analytics visibility~~ — CLOSED by DEC-162: pseudonymised; re-identification is Super-Admin-only and audited.
- ~~SLA targets per queue~~ — DEFERRED to post-beta by DEC-161; fields exist, unset.
