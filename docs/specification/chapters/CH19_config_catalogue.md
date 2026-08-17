# CHAPTER 19 — Configuration Key Catalogue

Status: DRAFT v1. Implements DEC-070, DEC-144, DEC-145. Evidence: R17.
**Every value the business can change lives here.** Nothing in this catalogue may be hard-coded.

## 19.0 How to read this
- **Scope**: the levels at which a key may be set. Resolution is most-specific-wins
  (`global → country → city → corridor → route → vehicle class → time window`).
- **Risk** (DEC-145): **L** = Manager, instant · **M** = Manager, preview required ·
  **H** = Super Admin, mandatory reason AND a stated rollback trigger before it goes live.
- **If missing**: the behaviour when the key is absent or unparseable (R17.3 — most incidents happen
  during fallback, not during the change).
- Security rules, permissions, state-machine legality and invariants are **NOT configuration**
  (CH8a §8a.4). They are code, reviewed and tested.

---

# 19.1 BUSINESS PARAMETERS (permanent · Manager-editable)

## 19.1.1 Fares and pricing (CH6, CH6a)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `RouteFlatFare` | int | minor units | 500-100000 | — (required per route) | route | **M** | Route cannot be sold; fail loudly |
| `PerKmSuggestionRate` | int | minor/km | 0-10000 | 250 | city | L | Suggestion feature disabled only |
| `UpliftMultiplier` | decimal | ratio | 0-3.0 | 0.5 | global→route→time | **M** | Street pickup disabled |
| `BandA_Max` / `BandB_Max` / `BandC_Max` | int | minutes | 0-30 | 2 / 5 / 9 | city→corridor | **M** | Street pickup disabled |
| `BandA_Fee` / `BandB_Fee` / `BandC_Fee` | int | minor units | 0-50000 | 0 / 400 / 900 | city→corridor | **M** | Street pickup disabled |
| `CostPerKm` | int | minor/km | 0-10000 | 300 | city→vehicle class | **M** | Layer 3 skipped |
| `CostPerMinute` | int | minor/min | 0-5000 | 50 | city→vehicle class | **M** | Layer 3 skipped |
| `MinPrice` / `MaxPrice` | int | minor units | — | fare+100 / fare×3 | route | **H** | Clamps disabled — dangerous, alert |
| `TemporaryPriceMultiplier` | decimal | ratio | 1.0-2.0 | 1.0 | route→time window | **H** | 1.0 (no change) |
| `StreetPickupPeakDisabled` | bool | — | — | false | route→time window | **M** | false |

## 19.1.2 Routes, slots and coverage (CH4a)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `SlotIntervalMinutes` | int | minutes | 5-120 | 15 | route | **M** | Route publishes no slots |
| `ServiceWindowStart` / `End` | time | local | — | 06:00 / 22:00 | route | **M** | Route inactive |
| `TargetFrequencyMinutes` | int | minutes | 5-120 | 15 | route | L | No coverage target shown |
| `MaxVehiclesPerSlot` | int | count | 1-10 | 1 | route→slot | **M** | 1 |
| `MaxClaimLeadDays` | int | days | 1-30 | 7 | city | L | 7 |
| `MinClaimLeadMinutes` | int | minutes | 0-240 | 30 | city | L | 30 |
| `LockBeforeDepartureMinutes` | int | minutes | 0-120 | 10 | route | **M** | 10 |
| `MinViableSeats` | int | count | 0-20 | 0 (always run) | route | **M** | 0 |
| `AlwaysRunClaimedSlots` | bool | — | — | true | route | **M** | true |
| `UncoveredSlotIncentive` | int | minor units | 0-100000 | 0 | slot | **M** | 0 (no incentive) |

## 19.1.3 Matching and service quality (CH5)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `MaxScheduleSlip` | int | minutes | 1-60 | 10 | city→route | **M** | 10 |
| `JourneyDetourBudget` | int | minutes | 0-60 | 12 | city→corridor | **M** | 0 (no deviations) |
| `HighOccupancyThreshold` | decimal | ratio | 0-1.0 | 0.8 | city→vehicle class | **M** | 0.8 |
| `MinBatchWindow` / `MaxBatchWindow` | int | seconds | 5-180 | 20 / 60 | city | **H** | 20 / 60 |
| `OptimiserDeadlineMs` | int | ms | 50-5000 | 800 | city | **H** | 800 |
| `SeatHoldSeconds` | int | seconds | 30-600 | 120 | city | **M** | 120 |
| `w_detour` `w_walk` `w_wait` `w_ride` `w_slip` `w_empty` | decimal | weight | 0-10 | 1.0 / 1.0 / 1.0 / 1.0 / 3.0 / 0.5 | city→time | **H** | 1.0 each; `w_slip` 3.0 |
| `w_fairness` | decimal | weight | 0-10 | **0** (DEC-075) | city | **H** | 0 |
| `DriverWaitAtStopMinutes` | int | minutes | 0-30 | 10 (DEC-052) | route | **M** | 10 |

## 19.1.4 Money, cancellation and payouts (CH6)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `CancellationForfeitPercent` | int | % | 0-100 | 50 (DEC-055) | city | **H** | 0 (fail generous, never over-charge) |
| `PostLockForfeitPercent` | int | % | 0-100 | 100 (DEC-148) | city | **H** | 0 (fail generous) |
| `NoShowChargePercent` | int | % | 0-100 | 100 (DEC-150) | city | **H** | 0 (fail generous) |
| `DriverReleasePenaltyBasis` | enum | — | COMMISSION_ON_LOST / FLAT / NONE | COMMISSION_ON_LOST (DEC-149) | city | **H** | NONE (fail generous to the driver) |
| `SubscriptionUnusedDayPolicy` | enum | — | EXPIRE / ROLLOVER / CREDIT | EXPIRE (DEC-154) | city | **H** | EXPIRE |
| `CommissionPercent` | decimal | % | 0-50 | 20 | city→route→driver segment | **H** | Block payouts; alert. Never guess a commission |
| `RevenueModel` | enum | — | COMMISSION / DRIVER_SUBSCRIPTION / HYBRID | COMMISSION | city | **H** | COMMISSION |
| `MinPayoutThreshold` | int | minor units | 0-500000 | 100000 | city | **M** | 100000 |
| `PayoutCadence` | enum | — | WEEKLY / DAILY / ON_DEMAND | WEEKLY | city | **H** | WEEKLY |
| `MaxCashLiability` | int | minor units | 0-500000 | 50000 | city→driver | **H** | 0 (block cash — fail closed) |
| `SupportRefundLimit` | int | minor units | 0-50000 | 1 ride fare (DEC-155) | global | **H** | 0 (escalate everything) |
| `SupportRefundsPerAgentPerDay` | int | count | 0-20 | 3 (DEC-155) | global | **H** | 0 (escalate everything) |
| `CashEnabled` | bool | — | — | true | city→route→driver | **M** | false (fail closed) |
| `SubscriptionFailureCompensation` | int | minor units | 0-100000 | 2000 | city | **M** | 0 (day credit only) |

## 19.1.5 Growth and rewards (CH7)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `ReferralRewardAmount` | int | minor units | 0-100000 | 2000 | city | **M** | 0 |
| `ShareRewardAmount` | int | minor units | 0-100000 | 1000 | city | **M** | 0 |
| `StreakThresholdDays` / `StreakReward` | int | days / minor | 2-30 / 0-100000 | 5 / 2000 | city | **M** | Streaks off |
| `RewardCapPerUserPerPeriod` | int | minor units | 0-500000 | 20000 | city | **H** | 0 (fail closed) |
| `PromotionBudget` | int | minor units | 0-∞ | — (required) | promotion | **H** | Promotion cannot start |

## 19.1.6 Notifications (CH20)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `BehaviouralCapPerDay` | int | count | 0-10 | 2 | city | L | 2 |
| `BehaviouralMinGapHours` | int | hours | 0-24 | 4 | city | L | 4 |
| `PromotionalCapPerDay` / `PerWeek` | int | count | 0-5 / 0-20 | 1 / 5 | city | L | 1 / 5 |
| `GlobalNonTransactionalCapPer24h` | int | count | 0-10 | 3 | city | L | 3 |
| `QuietHoursStart` / `End` | time | local | — | 22:00 / 07:00 | city | L | No quiet hours |
| `AlarmFirstReminderMinutes` | int | minutes | 5-60 | 15 (DEC-165, rider-adjustable) | city→user | L | 15 |
| `AlarmSecondReminderMinutes` | int | minutes | 1-30 | 5 (DEC-165) | city | L | 5 |

## 19.1.7 Safety (CH12)
| Key | Type | Unit | Range | Default | Scope | Risk | If missing |
|---|---|---|---|---|---|---|---|
| `ReportRateReviewThreshold` | decimal | ratio | 0-1.0 | 0.10 (DEC-138) | city | **H** | 0.10 |
| `ReportRateMinRides` | int | count | 1-500 | 20 | city | **H** | 20 |
| `ReportRateWindowRides` | int | count | 10-1000 | 100 | city | **H** | 100 |
| `CategoryClusterCount` / `WindowDays` | int | count / days | 2-10 / 1-90 | 3 / 30 | city | **H** | 3 / 30 |
| `SuspensionLadderDays` | list | days | — | [warning, 7, 30, permanent] (DEC-156) | city | **H** | permanent (fail safe) |
| `RiderBlockingEnabled` | bool | — | — | true (DEC-158) | city | **M** | true |
| `OpsQueueSlaHours` | map | hours | — | **unset — set after beta (DEC-161)** | city→queue | **M** | no SLA enforced |
| `AlertOccupancyThreshold` / `AlertWindowMinutes` | decimal / int | ratio / min | — | **unset — set after beta (DEC-161)** | city→zone | **M** | alerting off |
| `SevereCategories` | list | — | — | assault, harassment, dangerous driving, discrimination | global | **H** | All categories treated as severe (fail safe) |

---

# 19.2 FEATURE TOGGLES (temporary · owned · expiring)
Per R17.1 and Unleash guidance, every toggle has an **owner** and an **expiry date**, and is
**deleted** after rollout. A toggle still present past its expiry is a defect raised in the audit.

| Toggle | Purpose | Owner | Expiry | Default |
|---|---|---|---|---|
| `ff_street_pickup` | Enable the street-pickup ticket per city | Product | at launch+90d | off |
| `ff_subscriptions` | Enable subscription sales per city | Product | at launch+90d | off |
| `ff_recurring_claims` | Driver recurring slot claims | Product | at launch+90d | off |
| `ff_batch_optimiser` | Matching stage 3 on/off | Eng | when proven | off |
| `ff_overnight_planner` | Matching stage 5 on/off | Eng | when proven | off |
| `ff_women_preference` | Women-only vehicle preference (DEC-093) per city | Product | when supply allows | off |
| `ff_alight_signal_prompt` | Extra prompting for the alight button (G-053 response) | Product | after beta review | off |

---

# 19.3 SYSTEM TUNING (technical · Super Admin only)
| Key | Type | Default | Notes |
|---|---|---|---|
| `H3Resolution` | int | 8 | Changing this invalidates the geo index |
| `InitialKRing` / `MaxKRing` / `MinCandidates` | int | 1 / 4 / 10 | Candidate search expansion |
| `GpsHighFrequencySeconds` / `GpsLowFrequencySeconds` | int | 4 / 45 | Adaptive sampling (DEC-090) |
| `GpsLowBatteryFrequencySeconds` | int | 90 | Battery guard (F-34) |
| `OutboxRetryBackoffMs` | int | 1000 base, exponential | Offline sync |
| `RoutingProvider` | enum | OSRM | Per city (DEC-105) |
| `GeocodingProvider` | enum | commercial | Per city |
| `ColdStorageAfterDays` | int | 180 | Tiering, not deletion (DEC-094) |
| `BackupRetentionDays` | int | 30 | DEC-164; nightly backups, monthly restore drill |
| `ConfigCacheTtlSeconds` | int | 30 | How fast a change propagates |

---

## 19.4 Rules that apply to every key
1. **Versioned, never overwritten.** A past booking must be explainable by the config live at the
   time (INV-22).
2. **Attributed with a mandatory reason.**
3. **Validated on write** against type, range and unit. An out-of-range write is refused with a
   plain message naming the limit.
4. **Preview before publish** for MEDIUM and HIGH risk (CH6a §6a.4).
5. **A rollback trigger must be stated before a HIGH-risk change goes live** (R17.5).
6. **One-click rollback** to the previous version.
7. **Startup fail-safe**: if the config store is unavailable, use last-known-good and alert; never
   start with silent defaults for HIGH-risk keys (R17.3).
8. Changes propagate within `ConfigCacheTtlSeconds`; the dashboard shows when a change is live.

## 19.5 Open items
- Real default values for Alexandria must be set by simulation before launch (CH14 §14.3) —
  the defaults above are starting points, not evidence-based settings.
