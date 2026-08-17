# CHAPTER 12 — Trust, Safety & Security

Status: DRAFT v1. Implements DEC-092..097, and addresses G-015, G-026, G-038, G-039, G-043, G-044.
Depends on: CH2 (roles/permissions), CH3 (lifecycle), CH6 (money)

---

## 12.0 The safety principle
> A rider is getting into a stranger's vehicle with other strangers. Every safety mechanism must
> work when the rider is frightened, in a hurry, on a cheap phone, with poor signal, possibly at
> night. Anything that only works in ideal conditions is not a safety feature.

---

## 12.1 The safety kit (DEC-092)

### 12.1.1 SOS
- One prominent control, reachable in **one tap from any ride screen** — never buried in a menu.
- Activating it sends: rider identity, live location, journey id, vehicle and driver details, and
  the full manifest, to the on-call responder (DEC-095).
- Works with minimal signal: falls back to SMS with coordinates if data fails.
- The rider is shown clearly that help was reached and who is responding.
- **Silent mode:** SOS can be triggered without an obvious on-screen change, for situations where
  visibly calling for help would escalate danger.
- Every activation creates an incident automatically — it can never be "just dismissed".

### 12.1.2 Share my ride
- Generates a link a family member can open in any browser, no app or account required.
- Shows live vehicle position, ETA, and the plate/driver first name — nothing more.
- Expires automatically at the end of the journey.

### 12.1.3 Masked calling and messaging
- Rider and driver can contact each other; neither ever sees the other's phone number.
- Masking persists for a limited window after the journey (for lost property), then closes.
- All masked contact events are logged (who called whom, when — not content).

### 12.1.4 Two-way ratings (DEC-096 — informational only)
Ratings are collected from riders and drivers and displayed, but trigger **no automatic action**.
Consequence flows entirely through the incident path below.

---

## 12.2 The incident flow — now the ONLY protective mechanism (G-044)

Because ratings carry no consequence (DEC-096), this flow carries the entire safety burden.
It must therefore be strong.

```
REPORT (rider/driver/support/SOS)
   -> TRIAGE (severity assigned automatically by category, upgradeable by a human)
   -> INVESTIGATION (Ops Admin; evidence = event log, GPS trace, manifest, masked-call log)
   -> DECISION (no action | warning | training | suspension | permanent removal)
   -> FOLLOW-UP (reporter is told the outcome)
   -> RECORD (permanent, attached to the person, never deleted)
```

### Mandatory rules
- Every report gets a ticket. Nothing is resolved informally.
- **Severity categories** (assault, harassment, dangerous driving, discrimination, theft, vehicle
  condition, punctuality, other). Sanctions escalate: warning → 7 days → 30 days → permanent (DEC-156). The top categories trigger IMMEDIATE precautionary suspension
  pending investigation — the person stops driving first, and is investigated second.
- **Repeat-signal detection (DEC-138, evidence R15):** three thresholds, all configuration:
  1. **Report rate ≥ 10%** of completed rides — with a **minimum of 20 completed rides**, measured
     over a **rolling window of the last 100 rides** → human review alert to Ops.
     (10% matches the industry's effective tolerance: Uber deactivates near a 4.6/5 average, which
     corresponds to roughly 8-12% poor ratings — R15.2. The volume guard prevents punishing a new
     driver for one unfair report — R15.3.)
  2. **Category clustering:** 3+ reports in the same category within 30 days → review even below 10%
     (R15.4: "multiple complaints about the same behaviour pattern... can add up").
  3. **Severe categories** → immediate precautionary suspension regardless of percentage.
- **No automatic deactivation, ever.** A human decides, records a reason, and the driver may appeal
  (R15.5: a reported 30% of drivers faced deactivation threats with no recourse; Seattle legislated
  an appeals panel in response).
- The reporter is always told what happened. Silence destroys trust in reporting.
- Reports are never visible to the person reported in a way that identifies the reporter.

---

## 12.3 Fraud controls (DEC-097)

### 12.3.1 GPS spoofing / fake completed rides
| Signal | Response |
|---|---|
| Mock-location flag reported by the OS | Block duty, flag account |
| Position jumps faster than physically possible | Discard sample, flag journey |
| Journey "completed" without matching GPS trace | Withhold payout, human review |
| QR scan location far from the expected stop | Flag booking for review |
Cross-check rule: a completed booking must have a **QR scan** (DEC-049) AND a plausible GPS trace.
Either alone is insufficient for payout.

### 12.3.2 Driver–rider collusion
Patterns to detect: the same rider–driver pair repeatedly; rides that always complete instantly;
referral rewards flowing between linked accounts; cash bookings that are always marked collected
with no corresponding trace.
Response: hold rewards, require human review before payout.

### 12.3.3 Promotion and referral abuse
Controls: one reward per verified phone; device fingerprinting; caps per user, per device, per
period; **promotion budget caps enforced in the ledger** (INV-29) so abuse cannot exceed the
allocated budget; rewards released only after a qualifying completed ride, never at signup.

---

## 12.4 QR fallbacks (G-026) — required, since QR is primary
| Failure | Fallback |
|---|---|
| Rider's phone is dead or lost | Driver looks the rider up on the manifest and confirms manually; action is flagged and rate-limited per driver |
| Screen cracked / QR unreadable | Short numeric code shown alongside every QR, typed by the driver |
| No light at night | QR displayed at maximum brightness automatically; numeric code as backup |
| Rider has no smartphone | Booking is not possible in v1 (app-only); documented limitation |
| Any other QR failure | **The numeric code shown beside every QR is the official fallback (DEC-136)** |
| Driver's phone dies mid-journey (F-26) | Journey continues; riders are marked boarded from the manifest afterwards by support; the incident is logged and the driver is prompted about power |
Manual overrides are always **recorded, attributed and rate-limited** — otherwise they become the
fraud path.

## 12.5 Accessibility of a QR-first product (G-038)
QR is visual, which excludes blind and low-vision riders. Required:
- The numeric code is always available and screen-reader accessible.
- The driver's app can complete boarding from the manifest without any scan for a flagged rider.
- Riders may set an accessibility flag on their profile that alerts the driver to assist.
[Full accessibility standard to be specified in CH10.]

## 12.6 Operational failures (F-26, F-27, F-34)
| Event | Designed response |
|---|---|
| Driver's phone dies | 12.4 above; journey completes; support reconciles |
| Vehicle breakdown mid-journey | Journey -> ABORTED; riders auto-prioritised for re-accommodation; charged only for distance travelled or nothing (CH3 §3.6); support contacts riders proactively |
| Low driver battery | Sampling reduced, explicit warning to the driver, prompt to charge (CH9 §9.5) |
| Rider boards the wrong vehicle (F-28) | QR scan fails with a clear message naming the correct vehicle and its plate |
| Two vehicles at one stop (F-29) | Rider screen shows plate, colour and driver name prominently before arrival |

## 12.7 Security of the movement store (G-043, from DEC-094)
Because all location history is retained indefinitely:
- Location history lives in a **separate store** with its own encryption key and tighter access.
- Analytics access is **pseudonymised by default**; re-identification is a separate audited right.
- **No bulk export** without Super Admin approval, always audited (CH2 §2.4).
- Access to another person's movement history is a Super-Admin-only, reason-required action.
- Old data moves to encrypted cold storage — retained, but not in the hot database (G-042).

## 12.8 Platform security baseline
- **Two-factor authentication is MANDATORY for all staff roles** (DEC-151).
- Rate limiting on OTP, login, booking and refund endpoints.
- All secrets in a managed secret store; none in code or configuration files.
- Dependency and secret scanning in the verify command (CH8a §8a.6).
- Least privilege for every service and database user.
- Regular restore-tested backups; an untested backup is not a backup.

## 12.9 Open items
- ~~Suspension durations~~ — CLOSED by DEC-156: warning → 7 days → 30 days → permanent.
- ~~Rider blocking~~ — CLOSED by DEC-158: one-way and silent; the driver is never told.
