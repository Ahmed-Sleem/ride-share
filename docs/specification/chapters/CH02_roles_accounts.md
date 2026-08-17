# CHAPTER 2 — Roles, Accounts, Identity & Permissions

Status: DRAFT v1 (each decision individually confirmed by MCQ; see DECISIONS_REGISTER)
Depends on: CH1
Implements: DEC-026..DEC-035

---

## 2.1 The four roles

There are exactly four roles. There is no Organization role (DEC-031: organizations are removed
from the product entirely; universities and companies are offline sales channels only).

| Role | Arabic (UI) | Exists to | Key limits |
|---|---|---|---|
| **Rider** | راكب | Book and take rides | Books only for themselves (INV-11 / DEC-024) |
| **Driver** | سائق | Carry riders and earn | Cannot drive until fully verified (DEC-035) |
| **Support Agent** | دعم | Resolve live problems and complaints | Explicitly bounded powers — see 2.4 |
| **Platform Admin** | مسؤول | Run the platform | Full power, fully audited |

### 2.1.1 One account, many roles (DEC-027)
A single User account may hold Rider and Driver simultaneously and switch inside the app.
Support Agent and Platform Admin are STAFF roles: they are granted by an existing Admin, are never
self-service, and (rule) a staff account must not also carry Rider/Driver on the same login in
production — staff use a separate personal account if they want to ride. Rationale: a support agent
must never be able to act on their own bookings.

---

## 2.2 Identity model (DEC-028)

- **Phone number is MANDATORY and is the identity of record.** Verified by SMS OTP at signup.
- **Passcode/password is OPTIONAL** and added after signup, so daily logins do not require an SMS
  (this saves real money at scale and works when SMS delivery is unreliable).
- **Email is OPTIONAL**, used for receipts, recovery and notifications — never as the primary identity.
- One phone number = one account. Changing a phone number is a sensitive, audited operation
  requiring re-verification of both the old and the new number.
- Number recycling (a real problem in Egypt): if a number is re-verified on a new device after a
  long dormancy, the account enters a re-verification state rather than silently handing over the
  old account's history and wallet. [Design detail to be finalised in CH12.]

### Login methods summary
| Method | Purpose | Required? |
|---|---|---|
| Phone + SMS OTP | Signup, identity of record, recovery, sensitive actions | MANDATORY |
| Phone + passcode | Fast everyday login | Optional, recommended |
| Email | Receipts, recovery, notifications | Optional |
| Biometric (device) | Unlocks the stored session locally | Optional, device-level only |

---

## 2.3 Vehicle supply: two doors, one registry (DEC-033, DEC-034)

```
DOOR 1: Self-service                DOOR 2: Admin entry
Driver signs up, uploads            Admin creates the Vehicle record
documents, adds their vehicle       directly (fleet deals, DEC-005 channel)
        \                                   /
         \                                 /
          v                               v
          ONE VEHICLE REGISTRY  ──> ONE APPROVAL STATE MACHINE
```

### 2.3.1 The Fleet Label (DEC-033 option C)
A Vehicle may optionally carry a `fleet_label` (free text + an internal fleet id created by an
admin). It exists SOLELY so admins can filter, review, suspend and report on a group of vehicles
that belong to the same real-world owner.

Explicitly, a fleet label is NOT:
- an account, - a login, - a billing entity, - a permission scope, - visible to riders,
- a rider-pool boundary.

This satisfies "a company with 20 vans" without reintroducing organizations.

### 2.3.2 Vehicle approval states
`DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED | REJECTED(reason) -> SUSPENDED -> RETIRED`
- Only an APPROVED vehicle, driven by an APPROVED driver, may appear on any Journey.
- Any document expiry automatically moves the vehicle to SUSPENDED (see 2.5).

---

## 2.4 Permissions matrix

Legend: Y = allowed, N = forbidden, A = allowed but audited, L = allowed within a configured limit.

| Capability | Rider | Driver | Support | Admin |
|---|---|---|---|---|
| Create a Ride Request | Y | Y (as a rider) | N | N |
| **Claim a departure (a published slot)** | N | Y | N | A |
| Create/edit a Route or its slot grid | N | **N** | N | A (Ops/Manager) |
| View own bookings/journeys | Y | Y | — | — |
| View ANY user's active journey | N | N | Y | Y |
| View a user's full ride history | N | N | L (recent only) | A |
| View full personal data (ID docs) | N | N | **N** | A |
| Contact rider/driver via masked channel | Y (own) | Y (own) | Y | Y |
| Cancel a live ride | Y (own) | Y (own) | Y | Y |
| Issue a refund | N | N | **L** (small, capped, per-incident) | A |
| Adjust a fare | N | N | **N** | A |
| Credit/debit a wallet | N | N | **N** | A |
| Approve/reject a vehicle | N | N | **N** | A |
| Approve/reject a driver | N | N | **N** | A |
| Suspend a user | N | N | **N** (may only escalate) | A |
| Delete/anonymise an account | N | N | **N** | A |
| Export data in bulk | N | N | **N** | A |
| Change pricing rules | N | N | N | A |
| Change matching parameters | N | N | N | A |
| View audit log | N | N | N | Y |
| Grant staff roles | N | N | N | A |

### 2.4.1 The Support Agent boundary (DEC-032) — why it is drawn here
The most common insider fraud in ride platforms is a support employee who can move money or read
identity documents. Support can therefore *fix a rider's day* (cancel, refund a small amount,
contact, escalate) but can never *change the ledger* or *see identity documents*. Anything beyond
the limit becomes an escalation ticket for an Admin.

### 2.4.2 Audit rule
Every action marked A or L writes an immutable audit record: who, when, what, before/after values,
target user, reason text (mandatory), and the ticket/incident reference. Audit records are
append-only and cannot be edited or deleted by anyone, including Admins.

---

## 2.5 Driver verification (DEC-035) — strict and human-reviewed

### Required before a driver may accept ANY ride
1. Verified mobile phone (OTP).
2. National ID — front and back images + the ID number.
3. Driving licence — images + expiry date.
4. Vehicle licence (رخصة المركبة) — images + expiry date + plate number.
5. A live selfie, matched by a human against the ID photo.
6. Vehicle photos: front, back, both sides, interior, and the plate.

### The state machine
```
REGISTERED -> DOCS_SUBMITTED -> UNDER_REVIEW -> APPROVED
                                    |-> NEEDS_FIX(reason) -> back to DOCS_SUBMITTED
                                    |-> REJECTED(reason)
APPROVED -> SUSPENDED (document expired / incident / admin action) -> APPROVED after re-review
APPROVED -> DEACTIVATED (driver chose to stop)
```

### Rules
- A human admin makes the final decision. Automation may PRE-CHECK (image quality, expiry parsing,
  duplicate ID detection) but never auto-approves.
- Every rejection/needs-fix must carry a reason shown to the driver in their language.
- **Expiry monitoring:** the system warns the driver 30/14/7/1 days before any document expires and
  automatically SUSPENDS the driver at expiry. A suspended driver keeps their account, history and
  earnings; they simply cannot accept rides.
- **Face-match on duty (proposed, to be decided in CH12):** periodic selfie check that the person
  driving is the approved driver. Not decided here.

---

## 2.6 Rider verification (lighter, by design)
- Phone OTP is mandatory (this is already a real-world identity in Egypt).
- Name and photo optional at signup, encouraged for trust.
- Payment method verification handled in CH6.
- Escalating verification is triggered by risk signals (many cancellations, disputes, chargebacks)
  rather than applied to everyone up front. [Detail in CH12.]

---

## 2.7 Open questions carried forward (NOT closed by the agent)
- ~~Q2.1 staff 2FA~~ — CLOSED by DEC-151: mandatory for all staff roles.
- Q2.2 Number-recycling recovery: DESIGN RULE — a long-dormant number re-verified on a new device enters a re-verification state; wallet balance and history are NOT transferred until an admin confirms. Detailed flow is an implementation task.
- ~~Q2.3 face-match~~ — CLOSED by DEC-157: not implemented; risk accepted and monitored (G-056).
- ~~Q2.4 support refund limit~~ — CLOSED by DEC-155: one ride fare per incident, max 3 per agent per day.
- ~~Q2.5~~ — CLOSED by DEC-039: driver-accountable, vehicle is a declared+approved attribute.
- ~~Q2.6 parcels~~ — CLOSED by DEC-037: people only.

---

## 2.8 CONFIRMED CLOSURES (user MCQ, 2026-07-29)
- **Q2.5 CLOSED by DEC-036** — owner-only: the vehicle licence holder's name must match the driver's
  national ID. New invariant:
  - INV-12 A Vehicle may only be driven by the User whose verified national ID matches the vehicle
    licence holder. (SUBJECT TO REVIEW — see G-019, this conflicts with fleet supply.)
- **Q2.6 CLOSED by DEC-037** — no parcels, ever, in this product. People only.

## 2.9 REVISION NOTE — vehicle ownership model (DEC-039, supersedes 2.8's INV-12)
Owner-only driving is REVOKED. The model is now Uber-like:
- The **Driver** is the accountable, verified entity.
- A **Vehicle** is declared by the driver, verified by an admin, and linked to that driver.
- The system does **not** assert or enforce legal ownership; document legality is handled outside
  the software (DEC-030).
- A driver may hold several approved vehicles and switch the ACTIVE one; every switch is audited,
  and every Journey permanently records which vehicle actually carried the riders.
- INV-12 is revoked; INV-12b applies (see DECISIONS_REGISTER Batch 11).
