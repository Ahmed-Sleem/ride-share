# CHAPTER 20 — Notification & Message Catalogue

Status: DRAFT v1. Implements DEC-146, DEC-147, CH10 §10.6. Evidence: R18.
Every message the system can send, its trigger, tier, channel, and whether it can be turned off.

## 20.0 The three tiers (R18.1)
| Tier | Meaning | Cap | Can the user disable it? | Retried? |
|---|---|---|---|---|
| **TRANSACTIONAL** | Something happened to a thing you bought or are doing | **Unlimited** — never suppressed by other caps | **No** (operationally essential) | **Yes** |
| **BEHAVIOURAL** | Prompted by your action or inaction | 2/day, 4h gap | Yes | No |
| **PROMOTIONAL** | Marketing | 1/day, 5/week | Yes (opt-in only) | No |
Global cap on non-transactional: **3 per 24h**. Quiet hours apply to behavioural and promotional
only. All caps are configuration (CH19 §19.1.6).

## 20.1 Channel policy (DEC-147)
**Push only. No SMS fallback except OTP.** Consequence accepted and mitigated (G-055):
- The arrival alarm must fire from **cached schedule data**, not from a live push (DEC-053).
- The waiting screen must show stop, time and QR from cache when offline (CH10 R-20).
- **Push-delivery failure rate is instrumented and reviewed weekly.**
In-app messages are always available as the reliable channel; push is best-effort.

---

## 20.2 RIDER MESSAGES

### Transactional (cannot be disabled)
| ID | Trigger | Channel | Content (both languages) | Notes |
|---|---|---|---|---|
| N-R01 | OTP requested | **SMS** | Verification code | The only SMS |
| N-R02 | Booking confirmed | push + in-app | Route, boarding point, departure, price, seats | Includes "get off anywhere on the route" |
| N-R03 | Departure lock approaching | push | "Bookings close in X minutes" | Only if unpaid/unconfirmed |
| N-R04 | **Leave now** | push + **local alarm** | "Leave now to reach {stop} by {time}" | **Must fire from cache** (DEC-147 mitigation) |
| N-R05 | **Vehicle arriving** | push + **local alarm + vibration** | "{Plate} arriving at {stop}" | Escalating (DEC-053) |
| N-R06 | Vehicle arrived | push + strong local alarm | "{Plate} is at {stop} now" | |
| N-R07 | Boarded (QR scanned) | in-app | Confirmation, seat count | Sound + haptic |
| N-R08 | Approaching your area | push | "Next stop: {stop}" | Helps riders who did not signal |
| N-R09 | Journey complete | push + in-app | Receipt summary | |
| N-R10 | Departure delayed beyond `MaxScheduleSlip` | push | Plain reason + new expected time | Honest, never silent |
| N-R11 | **Driver released the departure** | push | "Your 07:15 is being reassigned" + alternatives | Early, never at departure time (CH18 §18.7) |
| N-R12 | Journey aborted (breakdown) | push + in-app | Concrete next step, never a generic error | Support contacts proactively |
| N-R13 | Booking cancelled by system | push | Reason + full credit confirmation | |
| N-R14 | Refund/credit issued | push + in-app | Amount, reason, new wallet balance | Labelled as **credit**, not card refund |
| N-R15 | Payment failed | push + in-app | Plain reason + how to fix | Never a raw provider code |
| N-R16 | Wallet low before a subscription renewal | push | Amount needed | |
| N-R17 | Subscription renewed / expiring | push + in-app | Dates, next 5 rides | |
| N-R18 | **Subscription seat could not be provided** | push + in-app | Apology, full day credit + compensation (DEC-130) | |
| N-R19 | Incident/report outcome | in-app | Outcome of what they reported | **Mandatory** (CH12 §12.2) |
| N-R20 | SOS acknowledged | push + in-app | Who is responding | **Silent mode: in-app text only, no push sound** |
| N-R21 | Account/security change | push + in-app | What changed, and how to report it if not them | |

### Behavioural (disableable)
| ID | Trigger | Content |
|---|---|---|
| N-R30 | Searched a route with no coverage, then a slot gets claimed | "A 07:15 on {route} is now available" |
| N-R31 | Rode the same route 3+ times | Suggest a subscription **with the trial day** (DEC-100) |
| N-R32 | Streak at risk | "Ride today to keep your {n}-day streak" |
| N-R33 | Someone joined a journey they shared | "You earned {amount}" (DEC-139) |
| N-R34 | Referral completed a first ride | "You both earned {amount}" |
| N-R35 | Left a booking unconfirmed | "Your seat hold expires in X minutes" |

### Promotional (opt-in only)
| ID | Trigger | Content |
|---|---|---|
| N-R40 | Manager flash sale targeting this rider's route | Discount, validity window |
| N-R41 | New route opened near them | Route, fare, frequency |
| N-R42 | Product news | Rare, batched |

---

## 20.3 DRIVER MESSAGES

### Transactional
| ID | Trigger | Channel | Content |
|---|---|---|---|
| N-D01 | Document approved / needs fix / rejected | push + in-app | Reason in the driver's language |
| N-D02 | Document expiring | push | 30/14/7/1 days before (CH2 §2.5) |
| N-D03 | **Auto-suspended (document expired)** | push + in-app | What expired, how to fix |
| N-D04 | Slot claim confirmed | push + in-app | Route, slot, date, vehicle |
| N-D05 | Departure starting soon | push | "Your 07:15 starts in 30 min · 6 riders booked" |
| N-D06 | Rider booked / cancelled on their departure | in-app | Updated manifest count |
| N-D07 | Rider signalled alighting | in-app + audio | "Stop at {stop} — 1 alighting" (DEC-117) |
| N-D08 | Payout sent / failed | push + in-app | Amount, or plain failure reason |
| N-D09 | **Cash liability approaching limit** | push + in-app | "Settle {amount} to keep accepting cash" — **before** the block (CH18 §18.8) |
| N-D10 | Cash bookings blocked | push + in-app | Why, and how to clear it |
| N-D11 | Incident opened / precautionary suspension | push + in-app | What happens next, appeal path |
| N-D12 | Low battery during a journey | in-app + audio | Warning, not silent degradation (F-34) |
| N-D13 | Sync restored, queued actions sent | in-app | Count synced |

### Behavioural
| ID | Trigger | Content |
|---|---|---|
| N-D20 | **Uncovered high-demand slot nearby** | "07:15 {route} · 8 riders waiting · unclaimed" (CH4a §4a.6) |
| N-D21 | Incentive offered on an uncovered slot | Amount and expiry |
| N-D22 | Recurring claim about to lapse | Renew prompt |
| N-D23 | Went offline during their usual hours | Gentle nudge, respects caps |

---

## 20.4 STAFF MESSAGES (email/push, no caps — operational)
| ID | Recipient | Trigger |
|---|---|---|
| N-S01 | On-call | **SOS activated** — immediate, bypasses everything |
| N-S02 | Ops | Severe incident reported / precautionary suspension applied |
| N-S03 | Ops | Journey aborted with riders on board |
| N-S04 | Ops | Driver phone offline mid-journey |
| N-S05 | Ops | Approval queue exceeds SLA age |
| N-S06 | Manager | Coverage gap with waiting demand (G-11) |
| N-S07 | Manager | Promotion budget 80% / 100% consumed |
| N-S08 | Manager | Occupancy threshold breach (DEC-101 alerts) |
| N-S09 | Super Admin | Reconciliation discrepancy (CH6 §6.9) |
| N-S10 | Super Admin | Backup or restore-drill failure |
| N-S11 | Ops | Subscription sold against a slot that lost committed coverage (INV-33 risk) |

---

## 20.5 Content rules
1. **Both languages, always.** Content is a translation key, never server-side English (CH9 §9.3).
2. **One purpose, one action** per message.
3. **Plain words.** No internal vocabulary (Journey, slot, policy) in rider messages (U6).
4. **Never a raw provider or system error.** Always a human sentence.
5. **Times in local wall-clock** (DEC-118), numerals per user preference.
6. **Plate numbers and codes render LTR** inside Arabic text (CH10a §10a.5).
7. Deep-link every message to the exact screen it refers to.

## 20.6 Suppression and safety rules
- Transactional messages are **never** suppressed by caps or quiet hours (R18.2).
- Safety messages (SOS, incident) ignore every cap and every preference.
- **Silent-mode SOS produces no audible push** (CH18 §18.1) — a sound could endanger the rider.
- Only transactional messages are retried (R18.4).
- Campaign sends are rate-limited **per user**, not per campaign (CH10 §10.6).

## 20.7 Required metrics (screen G-18)
Delivery rate per channel · **push-delivery failure rate (G-055)** · open rate by tier ·
**7-day rolling opt-out rate, reviewed weekly (R18.6)** · uninstalls following a send ·
alarm-fired-vs-boarded rate for N-R05/N-R06.

## 20.8 Open items
- Exact copy for each message in Arabic and English (a copywriting task)
- Whether N-R08 "approaching your area" is useful or noisy — measure after the beta
