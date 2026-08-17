# CHAPTER 10c — Screen Inventory · PART 2: DRIVER

Status: DRAFT v1. Implements DEC-099 (driver app is OFFLINE-FIRST), DEC-049 (QR), DEC-053 (manifest
+ contact), DEC-078 (recorded cash), DEC-117 (alighting), CH10 §10.3 (driver-in-motion constraints).
All five states defined per CH10a §10a.7. **[M]** = mobile only.

## Driver design law (binding on every screen here)
> **The driver is driving.** 56pt minimum touch targets · high contrast · automatic day/night ·
> audio confirmation of every key event · **never require typing while the vehicle is moving** ·
> every screen readable at a glance in sunlight.

**Offline-first (DEC-099):** local storage is the source of truth. The journey, manifest and QR
validation keys are downloaded **before departure**. Every action writes locally first and appears
instantly. A persistent indicator always shows: offline state · queued action count · last sync.

---

## D-00 · Driver onboarding — start [W available]
**Purpose** A driver can complete signup on the WEB (DEC-085: web serves signup, documents,
schedule, earnings; only *driving* requires the app).
**Contents** What's required listed up front (national ID, driving licence, vehicle licence, selfie,
vehicle photos — DEC-035), realistic expectation of review time, "Start".
**States** Empty n/a · Offline: read-only · RTL: mirrored.

## D-01 · Document upload [W available]
**Contents** One card per document with example images, camera or file upload, expiry date entry,
per-document status chip (`Badge`: pending / approved / needs fix / rejected).
**Rules** Rejections always show the human reason in the driver's language (CH2 §2.5).
Compression before upload (P5). Partial progress is saved — never lose work.
**States** Loading: per-file progress · Error: per-file inline, others unaffected · **Offline:
photos captured and queued, upload resumes automatically** · RTL: mirrored.
**API** `POST /v1/driver/documents`

## D-02 · Vehicle registration [W available]
**Contents** Plate (LTR), make, model, colour, year, **seat capacity** (DEC-047 sells every
physical seat), vehicle photos (front, back, sides, interior, plate).
**Note** DEC-039: no ownership is asserted; the driver declares, an admin approves.
**States** as D-01.

## D-03 · Verification status
**Contents** Clear stage indicator (submitted → under review → approved / needs fix), what is
outstanding, expected time, support contact.
**Rule** Never a silent wait — always say what happens next (P3).

## D-04 · Vehicle switcher
**Contents** List of the driver's approved vehicles, one marked ACTIVE (DEC-039).
**Rules** Switching is **audited**; every Journey permanently records which vehicle carried riders.
Cannot switch while a journey is IN_PROGRESS.

---

## D-10 · DUTY HOME ★
**Purpose** One decision: online or offline.
**Must contain**
- Which vehicle is active (plate), with a way to switch (D-04)
- Sync status: online/offline, queued action count, last sync time
- **One dominant control: go online / go offline** — the largest interactive element on the screen
- Today's summary: journeys completed, earnings
- **Cash still to settle** (liability owed), always visible
- Primary navigation: Duty · Journeys · Earnings · Profile
**Blocked states shown plainly, never a silent failure:** documents expired (DEC-035 auto-suspend) ·
vehicle suspended · **cash liability above `MaxCashLiability`** (CH6 §6.3) · account suspended.
Each states the reason and the way to fix it.
**States** Loading: skeleton · Error: cached state usable · **Offline: can still go online; work is
queued** · RTL: mirrored.
**API** `POST /v1/driver/duty`

## D-11 · Find work — browse routes and slots (DEC-132 / CH4a) ★ NEW
**Purpose** The driver's entire supply action: **pick a route → pick a slot → confirm.** Two taps.
Drivers never draw routes, set prices, or predict demand.
**Must contain**
- Routes available to this driver, nearest/most relevant first: route name, flat fare, service
  window, typical demand indication
- For a chosen route, its **published slot grid** (e.g. every 15 min, 06:00-10:00) with per slot:
  time, whether it is unclaimed / claimed by someone else / claimable, and **riders already waiting**
- Clear marking of **uncovered high-demand slots**, including any incentive offered (CH4a §4a.6)
- A one-tap claim action per slot
- A **recurring claim** action ("every weekday 07:15") — one action, not twenty (CH4a T9)
- Lead-time rules made visible: how far ahead a slot can be claimed, and the latest moment to claim
**States** Loading: skeleton grid · Empty: "No routes available near you" + when to check back ·
Error: retry · Offline: browsing from cache allowed, **claiming requires connection** (it allocates
a scarce resource) and says so plainly · RTL: mirrored, times LTR.
**API** `GET /v1/driver/routes`, `GET /v1/driver/routes/:id/slots`, `POST /v1/driver/slots/:id/claim`

## D-12 · My claimed departures
**Must contain** Upcoming departures this driver has claimed: route, slot time (wall-clock,
DEC-118), seats sold so far, vehicle, and whether it is locked yet. Automatic offline download
shown as done. A release/cancel action with **the consequence stated plainly** before confirming
(CH4a T6: penalty, and riders already booked are affected).
**States** Empty: "You haven't claimed any departures" + a link to D-11 · Offline: cached list.
**API** `GET /v1/driver/claims`, `DELETE /v1/driver/claims/:id`

---

## D-20 · ACTIVE JOURNEY ★ the main working screen
**Must contain**
- Offline indicator with queued-action count and last sync time — **only visible when offline**
- The next stop: name, distance, time to arrive
- **On-time or late against the route timetable** (DEC-119), stated in words a driver can act on
- Who is **boarding** at this stop: name, seat count, scanned or not scanned
- Who is **alighting** at this stop
- Two dominant actions: **SCAN** and **ARRIVED**
- Access to: the rest of the route's stops, navigation handoff, SOS
**Also** Next stop + distance + ETA + **on-time/late against the route timetable (DEC-119)** ·
`Manifest` for this stop · `StopList` for the rest of the route · navigation handoff · SOS.
**Rules** Skipped stops are shown as skipped (DEC-041/117 — a stop is served only if it has a
boarding, a signalled alighting, or is a timetable anchor).
**States** Loading: cached journey shown immediately · Error: never blocks the drive · **Offline:
fully functional** · RTL: mirrored; plate and digits LTR.
**API** `GET /v1/driver/journeys/active`, `WS journey:{id}`

## D-21 · Scan (boarding)
**Contents** `ScanFrame` — camera opens instantly; **scanning is the DEFAULT state at a stop, not a
mode you enter** (CH10 §10.3). Live list of who is still missing.
**Success** full-screen green + sound + haptic; name and seat count announced audibly so the driver
need not look.
**Failure** plain reason on screen and spoken: wrong vehicle / wrong route / already boarded /
expired code — and for "wrong vehicle" it names the correct plate (F-28).
**Fallbacks (CH12 §12.4)** numeric code entry · manual confirm from the manifest — both
**recorded, attributed and rate-limited**, because an unlimited override is the fraud path.
**States** **Offline: validates locally against the signed payload and queues** (DEC-091) ·
Error (camera unavailable): fall straight to numeric entry, no dead end · RTL: instructions
mirrored, code LTR.
**API** `POST /v1/driver/bookings/:id/scan`

## D-22 · Missing riders / wait
**Contents** Who has not boarded, one-tap **masked call** each (DEC-053, CH12 §12.1.3),
wait timer (default 10 min, DEC-052), and **the consequence made visible: who is already on board
and how far behind timetable the vehicle is** (DEC-084 — the app informs, the driver decides).
**Actions** Mark no-show · continue waiting · depart.
**States** Offline: calling still works (it is a phone call); marks are queued.

## D-23 · Cash collection (DEC-078)
**Contents** Per-booking row with the **exact fixed fare** (no change-making problem, DEC-115) and a
single large "Cash collected" toggle. Running total for this journey and total liability owed.
**Rules** Marking cash creates a **Driver Cash Liability** ledger entry (CH6 §6.3). Above
`MaxCashLiability` the driver is blocked from accepting further cash bookings — shown here plainly
before it happens, not as a surprise.
**States** Offline: queued; the total updates locally · Error: never silently lost.
**API** `POST /v1/driver/bookings/:id/cash`

## D-24 · Alighting (DEC-117)
**Contents** Riders who signalled they are getting off at the next stop, plus a control for the
driver to mark someone who **told them verbally** (both paths supported).
**Effect** Releases the seat for the remaining stops — the mechanism that recovers utilisation.
**States** Offline: queued.
**API** `POST /v1/driver/bookings/:id/alight`

## D-25 · Journey complete
Summary: stops served, riders carried, earnings for this journey, cash collected. One tap to go
back online.

## D-26 · Journey problem / abort (CH3 §3.6)
**Contents** Reason picker (breakdown, accident, safety, illness), immediate consequence explained,
confirm.
**Effect** Journey → ABORTED; every affected rider is notified with a next step; support is alerted
proactively; riders are prioritised for re-accommodation.
**Rule** This screen must be reachable in two taps but never be an accidental tap
(`ConfirmSheet` with the consequence stated).

---

## D-30 · Earnings
**Contents** `EarningsSummary`: today · this week · next payout date (weekly, DEC-080) ·
**cash liability owed** · minimum payout threshold progress.
**Rule** Every payout is inspectable **line by line, per ride** (CH6 §6.7).
**States** Offline: cached figures with last-updated stamp.

## D-31 · Payout detail
Gross − commission (DEC-081) − cash liability − fees = net. Every component itemised. Status and
provider reference. Failed payouts explained in plain words with what happens next.

## D-32 · Documents & expiry
All documents with expiry dates and status. **Warnings at 30/14/7/1 days; automatic suspension at
expiry** (DEC-035). Re-upload path directly from here.

---

## D-40 · Driver profile & settings
Photo, languages spoken, notification preferences, day/night theme override, audio-cue volume,
**battery-saver notice** (adaptive GPS explained honestly, DEC-090/F-34), support, log out.

## D-41 · Driver safety
SOS (same one-tap rule as riders), incident reporting, emergency contacts.

---

## Driver screen count: 20
D-00,01,02,03,04 · D-10,11,12 · D-20,21,22,23,24,25,26 · D-30,31,32 · D-40,41

## Cross-checks performed (P6)
- Every screen's offline behaviour matches DEC-099 (driver = offline-first).
- Cash flow matches CH6 §6.3 exactly (scan → collect → liability → payout deduction).
- Wait-time screen implements DEC-084 (app informs, human decides) rather than enforcing a rule.
- Alighting supports BOTH paths required by DEC-117 (rider signal, driver mark).
- No screen requires typing while in motion.
