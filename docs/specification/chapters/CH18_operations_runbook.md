# CHAPTER 18 — Operations Runbook

Status: DRAFT v1. Implements DEC-142. Complements CH12 §12.6 (what the SOFTWARE does) by defining
what the PEOPLE do: who acts, in what order, within what time.

**How to read a runbook entry:** DETECT (how we know) → IMMEDIATE (first 2 minutes) →
CONTAIN (first 15 minutes) → RESOLVE → RECORD. Every entry ends with a written record; nothing is
resolved informally.

**Roles referenced:** Ops Admin · Support Agent · Manager · Super Admin · On-call responder
(DEC-095). Time targets are configuration and must be reviewed after the closed beta.

---

## 18.1 SAFETY — SOS activated by a rider or driver
| Phase | Action |
|---|---|
| DETECT | SOS event arrives with identity, live location, journey, vehicle, driver, manifest (CH12 §12.1.1). Also arrives by SMS if data failed. |
| IMMEDIATE (< 2 min) | On-call responder acknowledges IN THE SYSTEM so the rider sees someone is responding. Attempt contact on the masked channel; if silent mode was used (CH12 §12.1.1), **do not call** — use in-app text only. |
| CONTAIN (< 15 min) | Establish whether emergency services are needed. Keep the live location open. Notify the other party's side only if safe to do so. |
| RESOLVE | Emergency services if required; otherwise reach a stated outcome with the person. |
| RECORD | An incident is created automatically and **can never be dismissed without a decision** (CH12 §12.1.1). Reporter is told the outcome. |
**Never:** close an SOS as "no answer". Escalate to Ops Admin instead.

## 18.2 SAFETY — severe incident report (assault, harassment, dangerous driving, discrimination)
| Phase | Action |
|---|---|
| DETECT | Report filed via R-62, support, or SOS follow-up. Severity auto-assigned by category. |
| IMMEDIATE | **Automatic precautionary suspension of the accused driver** (CH12 §12.2). The person stops driving first, is investigated second. |
| CONTAIN | Ops Admin opens O-15 with all evidence: event log, GPS trace, manifest, masked-call metadata, prior history. Riders on any in-progress journey of that driver are re-accommodated. |
| RESOLVE | Decision with mandatory reason: no action · warning · training · suspension (duration) · permanent removal. |
| RECORD | Permanent record attached to the person. **Reporter is told the outcome** — mandatory, not optional. |

## 18.3 VEHICLE BREAKDOWN OR ACCIDENT MID-JOURNEY (F-27)
| Phase | Action |
|---|---|
| DETECT | Driver uses D-26 (abort), or Ops sees a stationary vehicle on O-17. |
| IMMEDIATE | Journey → ABORTED. Every rider on board is notified **with a concrete next step**, never a generic error (CH3 §3.6). |
| CONTAIN (< 15 min) | System prioritises these riders above new requests for re-accommodation. **Support contacts them proactively — before they contact support.** If the route has a later claimed departure, they are placed on it. |
| RESOLVE | Riders charged only for distance travelled, or nothing (CH3 §3.6). Driver safety confirmed. Vehicle marked unavailable until cleared. |
| RECORD | Incident logged with severity; repeated aborts by the same driver trigger review (DEC-138). |

## 18.4 DRIVER'S PHONE DIES MID-JOURNEY (F-26)
| Phase | Action |
|---|---|
| DETECT | Location and heartbeat stop while a journey is IN_PROGRESS. |
| IMMEDIATE | Ops attempts masked contact. Riders on board see "last updated HH:MM" rather than a frozen map (CH10 R-20). |
| CONTAIN | **The journey continues physically** — the driver keeps driving. Boarding for remaining stops falls back to the numeric code or verbal confirmation. |
| RESOLVE | After the journey, Support reconciles the manifest: riders are marked boarded/completed from the record, with an audit entry per manual mark. |
| RECORD | Logged; the driver is prompted about charging. Repeated occurrences are a review trigger. |

## 18.5 LOW DRIVER BATTERY (F-34)
| Phase | Action |
|---|---|
| DETECT | Device reports low battery (CH9 §9.5). |
| IMMEDIATE | GPS sampling reduces automatically; the driver is **warned explicitly** rather than the app silently degrading. |
| CONTAIN | If the driver is on a journey and battery is critical, Ops is alerted so 18.4 can be pre-empted. |
| RECORD | Logged for pattern analysis (a driver whose phone dies weekly needs a charger, not a suspension). |

## 18.6 UNCOVERED SLOT WITH WAITING DEMAND (CH4a §4a.6)
| Phase | Action |
|---|---|
| DETECT | Manager coverage board (G-11) shows an uncovered slot with riders waiting; alert also pushed by email/push. |
| IMMEDIATE | Push the slot as a suggestion to suitable nearby drivers. |
| CONTAIN | If still unclaimed, Manager offers a configured incentive (budget-capped, INV-29). |
| RESOLVE | If the slot remains uncovered at lock time, riders searching it receive the honest no-supply answer with alternatives (DEC-076). **Any sold subscription for that slot triggers DEC-130 compensation.** |
| RECORD | Coverage failure logged against the route for planning; repeated failures mean the slot grid or the commitment tier needs changing. |

## 18.7 DRIVER RELEASES A CLAIMED DEPARTURE THAT HAS BOOKINGS (CH4a T6)
| Phase | Action |
|---|---|
| DETECT | Release action on D-12. |
| IMMEDIATE | Slot returns to the pool **and is pushed to nearby drivers as urgent**. |
| CONTAIN | If not re-claimed before lock, affected riders are notified early with alternatives — never at departure time. |
| RESOLVE | Riders fully credited. Driver penalty applied per CH3 §3.8. |
| RECORD | Counted against the driver; repeated releases are a review trigger. |

## 18.8 CASH LIABILITY BREACH (CH6 §6.3)
| Phase | Action |
|---|---|
| DETECT | Driver's cash liability approaches `MaxCashLiability`. |
| IMMEDIATE | Driver is warned **before** the block, on D-10 and D-23 — never blocked as a surprise. |
| CONTAIN | At the limit, cash bookings are blocked; wallet bookings continue. |
| RESOLVE | Settlement, or deduction at the next weekly payout (DEC-080). |
| RECORD | Ledger entries; repeated breaches escalate to Ops. |

## 18.9 PAYMENT PROVIDER OUTAGE
| Phase | Action |
|---|---|
| DETECT | Elevated failure rate on payment intents or payouts. |
| IMMEDIATE | Wallet-funded bookings continue unaffected — **this is why wallet-first matters** (CH6 §6.2.1). Top-ups show an honest message, not a raw provider error. |
| CONTAIN | Manager may temporarily raise cash acceptance where it is enabled. |
| RESOLVE | Retry queued top-ups; reconcile when the provider recovers. |
| RECORD | Daily reconciliation (CH6 §6.9) must show no discrepancy after recovery. |

## 18.10 ROUTING ENGINE (OSRM) DEGRADED
Software behaviour is automatic (CH5 §5.9): cached matrices → Haversine × calibration, ETAs marked
approximate. **Human action:** Ops posts a service notice; Manager considers pausing street pickup
(which depends on accurate detour measurement) until routing recovers.

## 18.11 PLATFORM OUTAGE
| Phase | Action |
|---|---|
| DETECT | Monitoring/paging (CH15 §15.2). |
| IMMEDIATE | **Journeys in progress continue** — the driver app is offline-first (DEC-099) and keeps working. This is the single most valuable property of the architecture during an outage. |
| CONTAIN | Status communicated in-app and on the public site. New bookings blocked with an honest message. |
| RESOLVE | Restore; the offline outbox replays with idempotency keys, so no boarding is lost or duplicated. |
| RECORD | Post-incident review; a written record of cause and fix. |

## 18.12 DATA REQUEST FROM AUTHORITIES (CH13 §13.4)
Never grant direct database access. Produce a scoped export through the audited path; Super Admin
approval required; log who requested, who approved, what was included, when. Legal team is informed
(DEC-030).

---

## 18.13 Standing operational duties
| Cadence | Duty |
|---|---|
| Continuous | On-call SOS responder available 24/7 (DEC-095) |
| Every morning | Coverage board review for the day and the next day (G-11) |
| Daily | Financial reconciliation: ledger vs provider settlement vs cash liabilities (CH6 §6.9) |
| Daily | Clear the approval queues (O-10) |
| Weekly | Driver payouts (DEC-080); failed payouts chased |
| Weekly | Review incidents, DEC-138 threshold alerts, and repeat-signal clusters |
| Monthly | Restore drill from backup, documented (CH15 §15.2) |
| Monthly | Review the behavioural-bet metrics from DEC-141 |
| Per document expiry | Automatic suspension is automatic; Ops chases re-upload (CH2 §2.5) |

## 18.14 Open items
- Exact time targets per phase (to be set after the closed beta)
- Who staffs the on-call rota, and its handover procedure
- Escalation contact tree
