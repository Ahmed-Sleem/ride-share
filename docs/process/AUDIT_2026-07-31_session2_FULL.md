# FULL AUDIT #3 — 2026-07-31 (start of session 2)
Requested by user: "first do a full audit, then lets discuss any remaining gaps".
Everything below was VERIFIED by running commands, not by memory.

---

## PART 1 — DEFECTS FOUND AND FIXED IN THIS AUDIT

| # | Defect | Severity | Status |
|---|--------|----------|--------|
| D-1 | **Git repository was broken.** `.git/` existed with only HEAD/hooks/info — no objects, no refs. `git status` returned "not a repository". Every session-1 claim about version control was therefore false. | HIGH | FIXED — repo re-initialised, .gitignore added, 2 commits made, working tree clean |
| D-2 | **Stale `[MCQ PENDING]` markers in CH03.** Boarding proof, recurring-commute model and cancellation policy were all marked undecided, but had been decided by DEC-049, DEC-051 and DEC-055. A developer reading the chapter would think they were open. | HIGH | FIXED — 6 markers replaced with RESOLVED-by-DEC references |
| D-3 | **Stale conflict in CH04.** The "conflict between DEC-004 tiers and DEC-058 fixed pricing" was still written as unresolved; it was resolved by DEC-063/DEC-067. Also the walking ceiling was marked undecided though DEC-064 settled it. | HIGH | FIXED — both sections rewritten as RESOLVED |
| D-4 | **Duplicate G-021 row** in AUDIT_AND_TODO (one OPEN, one CLOSED — contradictory). | MEDIUM | FIXED — stale OPEN row removed |
| D-5 | **5 duplicated DEC rows** (DEC-012, 019, 021, 024, 058) where an early PROPOSED row and a later CONFIRMED row both existed with no link between them. | MEDIUM | FIXED — earlier rows now marked "SUPERSEDED by the later row" |
| D-6 | **MASTER_SPECIFICATION.md was stale** — assembled before these fixes. | MEDIUM | FIXED — regenerated as v1.1 (3,694 lines / 37,081 words) |

## PART 2 — VERIFIED HEALTHY

| Check | Result |
|---|---|
| DEC numbering | 112 unique, DEC-001..112, **no gaps, no missing** |
| G numbering | 50 rows, 50 unique, G-001..050, **no duplicates** |
| Chapter files | 14 files, all non-empty, 2,493 lines total |
| Master spec | contains Parts I-V, all 17 chapters present in dependency order |
| Research | R1..R13, every claim carries a source; unverifiable items marked [UNVERIFIED] |
| Thinking files | empty, per rules §18.7 |
| Superseded decisions | DEC-026, DEC-036, DEC-042 correctly marked as superseded |
| Git | clean working tree, 2 commits, history intact |

## PART 3 — COVERAGE CHECK OF THE F-01..F-40 TOPIC LIST
Mechanically checked every F-item against the decisions register and chapters.

**36 of 40 are covered.** Four are genuinely absent from the entire specification:

| ID | Topic | Why it matters | New gap |
|----|-------|----------------|---------|
| F-05 | **Surge / dynamic pricing** | Never raised, never decided. DEC-058 (fixed route price) implicitly rules it out, but that implication was never stated or confirmed. Highly sensitive in Egypt. | G-047 |
| F-30 | **Destination change mid-ride** | Undecided. Uber forbids it on pooled rides. Touches the algorithm (re-insertion), the locked fare (DEC-056) and the promise rule (F6). | G-048 |
| F-35/36 | **DST + Ramadan** | Egypt observes DST — a scheduled 07:30 journey must not shift when clocks change. Ramadan massively alters demand and travel times. Neither appears in the overnight planner or subscription design. | G-049 |

## PART 4 — REMAINING OPEN ITEMS (32 OPEN gaps)

### Category A — Product questions needing a user decision (11)
G-015 stranded rider after a failed second leg · G-024 the dynamic walking rule detail ·
G-026 QR fallback specifics · G-028 subscription guarantee-failure remedy ·
G-033 price precedence confirmation · G-034 share-attribution design ·
G-035 rider-chosen-stop feasibility rendering · G-040 DST/Ramadan/holiday handling ·
G-047 surge pricing · G-048 destination change mid-ride · G-049 DST + Ramadan

### Category B — Specification detail still to write (7)
G-022 Stop Mapping Tool full spec · G-023 Manager-role product surfaces detail ·
G-027 data-collection scope · G-032 manager-controlled service activation detail ·
G-042 cold-storage tiering · G-043 movement-store security detail · G-044 incident-flow thresholds

### Category C — Monitor after launch, no action now (4)
G-025 comfort vs selling every seat · G-031 cancellation-policy churn ·
G-036 driver earnings distribution · G-038 accessibility follow-through

### Category D — External / handed off (6)
G-002, G-006, G-017, G-041 → legal team (DEC-030) · G-009 → user (DEC-111/112) ·
G-039 operational failure responses (specified in CH12, needs ops process)

### Category E — Research/verification tasks (4)
G-003 Alexandria OSM data quality · G-007 OSM coverage survey ·
G-010 open-source component vetting · G-005 (superseded by CH5, can be closed)

### Category F — Documentation (0 after this audit)
G-050 master spec regeneration — CLOSED in this audit

## PART 5 — THE BIGGEST REMAINING GAPS (agent judgement)
Ranked by how much they would block a developer starting work:

1. **Complete screen inventory.** CH10 specifies rules and the key screens, not every screen for
   every role. This is the single largest missing artefact.
2. **Configuration key catalogue.** The spec references configuration constantly
   (prices, bands, tolerances, windows, weights) but never enumerates every key with type, range,
   default and scope. CH8a §8a.4 promises it; it does not exist.
3. **The four never-discussed topics** (G-047..G-049).
4. **Wireframes / visual design.** No visual artefact exists at all — no wireframe, no design
   system, no component library definition.
5. **Alexandria OSM data-quality survey** (G-003/G-007) — a factual prerequisite that has never
   been performed and could change the routing strategy.

## PART 6 — HONEST STATEMENT OF WHAT THIS DOCUMENT IS NOT
- It contains **no code**; nothing has been built or tested. No test claims are made anywhere.
- It contains **no visual design**.
- It contains **no legal analysis** (DEC-030) and **no timeline or hiring plan** (DEC-111/112).
- Cost figures in CH15 are a **structure with no real quotes** in it.
- The FleetPy simulation that is supposed to set launch parameters **has not been run**.
