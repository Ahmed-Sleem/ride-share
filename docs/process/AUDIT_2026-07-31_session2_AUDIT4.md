# FULL AUDIT #4 — 2026-07-31 (post route-ticket rewrite)
All findings verified by running commands, not from memory.

## PART 1 — DEFECTS FOUND AND FIXED

| # | Defect | Why it mattered | Status |
|---|--------|-----------------|--------|
| D-7 | **6 stale route-model references survived the v2 rewrite**: CH03 promise-preservation rule and RecurringPlan (origin/destination), CH06a `PromiseTolerance` ×2, CH04 stop-suitability referencing "the rider's destination", CH05 §5.10 same. | The v2 rewrite touched CH1/5/9/10 but these lived in CH3/4/6a. A developer would have implemented per-rider arrival promises that cannot exist. | FIXED |
| D-8 | **INV-26 defined twice** — fare immutability (CH6) and seat-release (CH5/CH9). | Two different rules with one identifier; tests and constraints would collide. | FIXED — seat-release renumbered **INV-31** |
| D-9 | **DEC-020 still marked "still PROPOSED"** in CH01, though superseded by DEC-114/120. | Reader cannot tell whether the intent model is settled. | FIXED — marked SUPERSEDED with what survives and what changed |
| D-10 | **Tier 3 (door-to-door) still presented as current** in CH01 BoardingPolicy and CH04 §4.2, despite DEC-067 dropping it. | Would have been built. | FIXED — struck through, marked dropped |
| D-11 | **5 gap statuses stale**: G-029 body said CLOSED but flag said OPEN; G-048, G-040, G-005, G-004 were resolved by later decisions but never updated. | Inflated the open-item count and hid true progress. | FIXED |
| D-12 | Git identity not set at repo level after re-init; one commit silently failed earlier. | Commits appeared to succeed but did not. | FIXED — identity set globally and locally; verified 12 commits, clean tree |

## PART 2 — VERIFIED HEALTHY
| Check | Result |
|---|---|
| DEC numbering | 121 unique, DEC-001..121, no gaps; 5 duplicated IDs all correctly marked SUPERSEDED |
| Gap numbering | 53 rows, 53 unique, G-001..053, no duplicates |
| Cross-references | **Zero invalid DEC references** and **zero invalid G references** across all 14 chapters |
| Invariants | 32 defined, INV-1..INV-31 + INV-12b, no remaining collisions |
| Stale rider-intent language | zero occurrences of `arrive_by`, `PromiseTolerance`, `promised arrival` |
| Git | 12 commits, working tree clean |

## PART 3 — OPEN ITEMS AFTER THIS AUDIT: 25 (was 30)
Closed in this audit: G-004, G-005, G-029, G-040, G-048.

### A. Needs a user decision (7)
G-015 stranded rider on a failed 2nd leg · G-024 dynamic walking rule detail ·
G-026 QR fallback specifics · G-028 subscription guarantee-failure remedy ·
G-033 price precedence (route flat fare vs per-km fallback) · G-034 share-attribution design ·
G-035 rider-chosen-stop feasibility rendering

### B. Specification detail still to write (7)
G-022 Stop Mapping Tool full spec · G-023 Manager surfaces detail · G-027 data-collection scope ·
G-032 service-activation detail · G-042 cold-storage tiering · G-043 movement-store security ·
G-044 incident-flow thresholds

### C. Monitor after launch (5)
G-025 comfort · G-031 cancellation churn · G-036 driver earnings distribution ·
G-038 accessibility follow-through · G-053 alighting-signal usage rate

### D. Handed off (4)
G-006, G-008 legal · G-010 OSS vetting · G-039 operational process

### E. Field research never performed (2)
G-003 / G-007 Alexandria OSM data-quality survey

## PART 4 — CHAPTER-LEVEL OPEN ITEMS
45 "open items" bullets remain across 11 chapters (CH01:4, CH02:6, CH04:3, CH06:7, CH06a:4,
CH07/11:3, CH08a:3, CH09:3, CH10:4, CH12:5, CH13-15:3). These are detail-level, not blocking
decisions; most resolve while writing the screen inventory and configuration catalogue.

## PART 5 — WHAT IS STILL ABSENT ENTIRELY
1. **Complete screen inventory** — the largest missing artefact (next task).
2. **Configuration key catalogue** — referenced constantly, never enumerated.
3. **Any visual design** — no wireframes, no design system, no component definitions.
4. **Alexandria OSM survey** — a factual prerequisite never performed.
5. **Real cost quotes** — CH15 has structure, no numbers.
6. **FleetPy simulation** — specified, never run.
7. **No code, no tests.** Nothing has been built; no test claims are made anywhere.
