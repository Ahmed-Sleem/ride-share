# CHAPTER 6 — Money: Wallet, Payments, Fares, Payouts & the Ledger

Status: DRAFT v1. Implements DEC-054..058, DEC-062, DEC-066, DEC-077..081. Evidence: R6, R7, R8, R10.
Depends on: CH1, CH3, CH5, CH6a

---

## 6.1 The first rule: one ledger, and it is always right

Every movement of value is a double-entry record in a single append-only **ledger**. Nothing else
in the system is allowed to be the source of truth about money.

- Money is stored as **integer minor units** (piastres), never floating point (CH8a §8a.6).
- Every entry is immutable. Corrections are new compensating entries, never edits.
- Every entry references: what caused it (booking, payout, promotion, refund), who it affects, and
  the configuration version that produced the amount (INV-22).
- The sum of all entries for any account equals that account's balance, always, by construction.

### Account types in the ledger
| Account | Belongs to | Purpose |
|---|---|---|
| Rider Wallet | rider | prepaid balance, refunds, rewards |
| Driver Earnings | driver | accrued fares owed to the driver |
| Driver Cash Liability | driver | cash they collected that belongs to the platform |
| Platform Revenue | platform | commission earned |
| Promotion Budget | platform | funds allocated to campaigns (DEC-045) |
| Payment Provider Clearing | platform | money in transit at Paymob etc. |

---

## 6.2 Payment methods (DEC-079)

All methods sit behind ONE internal `PaymentProvider` interface so a method can be added or
disabled per city as configuration.

| Method | Direction | Mechanism | Notes |
|---|---|---|---|
| **App Wallet** | in | internal balance | PRIMARY. Fastest boarding, no provider fee at ride time |
| **Cash** | in | recorded against scanned booking (DEC-078) | creates a Driver Cash Liability |
| **Cards (Visa/Mastercard/Meeza)** | in | Paymob | 3DS required |
| **Mobile wallets** (Vodafone Cash, Orange Money, Etisalat Cash, Meeza) | in | Paymob | very high local adoption |
| **Kiosk / Fawry cash-in** | in | Paymob | how cash users fund a wallet |
| **InstaPay / IPN** | in | via PSP or partner bank — NOT a direct API (R10.2) | commercial terms [UNVERIFIED], to confirm with Paymob/bank |
| **Apple Pay** | in | Paymob / provider support | for iOS users |
| **Paymob Payouts** | out | Instant Cashin API | driver payouts |

### 6.2.1 The wallet is the preferred path, not the only path
Wallet top-ups can be made by every "in" method above. A rider may also pay for a single booking
directly by any method. Wallet is preferred because it makes boarding instant and avoids a provider
round-trip at the moment the vehicle is waiting.

---

## 6.3 How cash actually works (DEC-078) — the exact sequence

```
1. Rider books, choosing "pay cash".        → Booking CONFIRMED, fare locked (DEC-056)
2. Rider boards; driver scans QR.           → Booking ON_BOARD
3. Driver taps "cash collected".            → Ledger: Driver Cash Liability += fare
                                              Ledger: Fare recognised, commission split applied
4. At payout time.                           → Payout = Driver Earnings − Cash Liability − fees
```
- There is **no change-making problem**: fares are fixed and known before boarding (DEC-058).
- If the driver does NOT mark cash collected, the booking is flagged for support review; the rider
  is not chased automatically (avoids false accusations).
- A driver whose cash liability exceeds `MaxCashLiability` (configuration) is automatically blocked
  from accepting further cash bookings until they settle. This is the main fraud/credit control.
- Cash acceptance can be disabled per city, per corridor, or per driver, as configuration.

---

## 6.4 Fares (DEC-058, DEC-062, CH6a)
- **Fixed price per route** is the primary model ("Smouha → Alexandria University = 15 EGP").
- **Per-km rate is NOT a rider-facing price** (DEC-133). It is a manager tool that suggests a fare
  when a new route is created ("6.2 km → suggested 15 EGP"). Riders always pay the route flat fare.
- **Street-pickup ticket** is priced by the three-layer formula in CH6a.
- Precedence: `explicit exception > route flat fare`. There is no per-km fallback (DEC-133).
- The quoted price is **locked at booking** and never recalculated (DEC-056, INV-26).

---

## 6.5 Subscriptions (DEC-051)
- A subscription buys a set of recurring journeys over a period (weekly/monthly) with **guaranteed
  seats**.
- Charged up front; ledger recognises revenue per journey consumed, not all at purchase.
- Controls required: skip a day, pause a range, view next N rides.
- **Guarantee-failure remedy [MCQ PENDING, G-028]:** what the rider receives when a guaranteed seat
  cannot be provided. Options range from full credit for that day, to credit plus compensation, to
  a paid alternative ride at the platform's cost.
- **Unused days EXPIRE** at the end of the period (DEC-154). No rollover, no credit conversion.
  Because this is the least generous option, two things are mandatory: the terms must be stated
  plainly before purchase, and the skip/pause controls must be prominent so a rider can protect
  value in advance rather than lose it.

---

## 6.6 Cancellations & refunds (DEC-055)
- Informed consent is mandatory BEFORE purchase: the exact terms are shown and must be confirmed.
- Rider cancellation after purchase forfeits `CancellationForfeitPercent` (default 50%), rising to
  **100% once the departure LOCKS** (DEC-148) — after lock the seat cannot be resold.
- **No-show: charged 100%** (DEC-150) — the seat was consumed and could not be resold.
- **Driver releases a claimed departure after bookings exist (DEC-149):** the driver loses a fee
  equal to the platform's commission on the lost bookings; every affected rider receives 100% credit
  plus a compensation credit (symmetric with DEC-130). Releasing a slot with NO bookings is free —
  this deliberately encourages early release over a last-minute no-show.
- **All refunds are issued as WALLET CREDIT** (DEC-055), never to the original payment method.
- Driver-caused and system-caused cancellations: rider receives 100% credit plus compensation credit;
  the failure is recorded against the driver (DEC-149).
- Support Agents may refund up to **one ride fare per incident, maximum 3 per agent per day**
  (DEC-155). Beyond that it escalates to Ops — never silently fails.

---

## 6.7 Driver earnings and payouts (DEC-080, DEC-081)

### Earnings
`DriverEarning = Fare − PlatformCommission` where commission is resolved from configuration.

### Revenue model (DEC-081) — all three supported, commission is the default
| Model | How it works | Status |
|---|---|---|
| **Commission** | platform takes `CommissionPercent` of each fare | DEFAULT |
| **Driver subscription** | driver pays a periodic fee, keeps 100% of fares | supported, off by default |
| **Hybrid** | commission with a cap, or a reduced rate above a volume threshold | supported, off by default |
Switchable per city, per corridor, per driver segment, as configuration — no engineering required.

### Payouts
- **Weekly**, via Paymob Payouts / Instant Cashin (DEC-080).
- Subject to `MinPayoutThreshold` (R10.4 suggests EGP 1,000–5,000 territory; exact value config).
- Payout = Driver Earnings − Cash Liability − any fees − any adjustments.
- Every payout produces a statement the driver can inspect line by line, per ride.
- Failed payouts retry automatically and alert operations.

---

## 6.8 Promotions & rewards (DEC-045, DEC-060, DEC-061)
- **Flash sales**: time-boxed, targeted discounts on specific routes/corridors/stops/time windows,
  with a **budget cap** that stops the promotion automatically when exhausted.
- **Share reward** (DEC-060): credit when a rider shares a journey and another rider joins it.
- **Referral reward** (DEC-060): both parties credited when a new user completes a first ride.
- Every mechanism is switchable and configurable from the Manager dashboard (DEC-061).
- Every promotion draws from the **Promotion Budget** ledger account, so the true cost is always
  visible and never hidden inside fare revenue.
- Anti-abuse required: self-referral detection, device/phone fingerprinting, caps per user and per
  period, and manual review above a threshold [detail in CH12].

---

## 6.9 Financial controls and reconciliation
- Daily automated reconciliation: platform ledger vs Paymob settlement reports vs driver cash
  liabilities. Any discrepancy raises an operations alert; it is never auto-corrected.
- No human may edit a balance directly; only posting a compensating, attributed, reasoned entry.
- Every money-affecting configuration change is versioned and attributable (CH8a §8a.4).
- Separation of duties: Managers set prices; only Super Admin can move money manually; Support is
  capped (CH2 §2.4).

---

## 6.10 Invariants added
- INV-26 A Booking's fare is immutable after CONFIRMED; changes occur only as new ledger entries.
- INV-27 Every ledger entry has a matching counter-entry; the ledger always balances.
- INV-28 A driver's payout can never exceed their Driver Earnings balance minus liabilities.
- INV-29 A promotion can never spend beyond its allocated Promotion Budget.
- INV-30 Money values are integers in minor units; floating point is forbidden in money paths.

## 6.11 Open items
