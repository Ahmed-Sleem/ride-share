# Documentation

Everything here is not code. The interface lives in `apps/web/`, the backend
will live in `apps/api/`, and deployment lives in `deploy/`.

## If you are new, read in this order

1. **[specification/MASTER_SPECIFICATION.md](specification/MASTER_SPECIFICATION.md)** —
   Part I alone (the executive summary, twelve defining decisions) tells you
   what the product is in about ten minutes. Read the rest when you need it.
2. **[decisions/DECISIONS_REGISTER.md](decisions/DECISIONS_REGISTER.md)** —
   every decision with its reason. When you wonder "why is it like this",
   the answer is here, and if it is not, that is a gap worth raising.
3. **[planning/BUILD_PLAN.md](planning/BUILD_PLAN.md)** — how it gets built.
   Start at "How to read a point", then Phase 0.
4. **[decisions/OPEN_ITEMS.md](decisions/OPEN_ITEMS.md)** — what is unresolved
   and which risks were accepted deliberately.
5. **[process/](process/)** — the standards this project is held to. Read
   these before writing code; they are the reason the codebase looks the way
   it does.

## Where to start work

The interface is complete. The next work is **BUILD_PLAN Phase 0** —
repository, toolchain, Docker, database, and the automated guard-rails, all
before any feature exists. Each point in the plan states what to do, how to
test it, how to prove the test can fail, and what "done" means.

Do not start at Phase 3 because it is the interesting part. Phase 0 exists so
that the rules are enforced by scripts before there is code to argue with.

## Contents

### specification/
The product in full.

| File | Contents |
|---|---|
| `MASTER_SPECIFICATION.md` | 22 chapters: domain model, roles, lifecycle, geography, supply model, matching, money, pricing, architecture, data and API, UX, design system, 75 screens, trust and safety, privacy, operations runbook, configuration catalogue, notification catalogue |
| `QUESTIONS_AND_ANSWERS.md` | Every question asked during design and the answer given, grouped by topic |
| `chapters/` | The same chapters as individual files, easier to diff and review |

### planning/
| File | Contents |
|---|---|
| `EXECUTION_PLAN.md` | How the spec + GUI become a deployed product: milestones M0–M8, Railway topology, what the owner must provide |
| `BUILD_PLAN.md` | Phases 0–8. Every point has: what, how, test, break, done, gap risk |
| `MASTER_PLAN.md`, `NEXT_SESSIONS_ROADMAP.md`, `READINESS_ASSESSMENT.md` | Earlier planning, kept for context |

### decisions/
| File | Contents |
|---|---|
| `DECISIONS_REGISTER.md` | DEC-001 onward. Superseded rows are marked, not deleted |
| `OPEN_ITEMS.md` | Gap register. Open questions, accepted risks, and what closed them |

### research/
Sourced findings behind the decisions — routing cost, batching, fixed versus
demand-responsive transit, OpenStreetMap coverage in Egypt, driver
deactivation thresholds, monorepo tooling, cold-start demand estimation. Each
finding carries its source.

### design/
The design system chapter: tokens, type scale, spacing, component rules, and
the reasoning behind the two-colour model.

### process/
| File | Contents |
|---|---|
| `ENGINEERING_STANDARD.md` | The engineering standard: centralisation, verification, authority |
| `GUI_STANDARD.md` | The interface standard: tokens, adaptation, accessibility, completion gate |
| `REPOSITORY_STANDARD.md` | How this repository is published and kept clean |
| `PROJECT_RULES.md` | Rules specific to this project |
| `AUDIT_*.md` | Audit records. Each lists defects found and how they were fixed |
| `IMPLEMENTATION_LOG.md` | Every closed gap and non-trivial change, with proof |
| `CHANGELOG.md` | What changed, when |
| `GITHUB_SETUP.md` | Branching, secrets, protection |

### reference/
The investor-facing information document (PDF + LaTeX source) and the UI
reference benchmark (`UI_REFERENCE_daily-plan-app.html`, adopted by DEC-168 as
the visual benchmark for this product).

## Two conventions worth knowing

**Decisions are numbered and never deleted.** When a decision is replaced, the
old row stays and is marked superseded, with a pointer to the one that replaced
it. `DEC-176` supersedes the mobile clause of `DEC-085`; both are readable.

**Gaps are tracked, not forgotten.** Anything unresolved is a `G-` row in
`OPEN_ITEMS.md` with its current state. A thing is either done or a tracked
gap. There is no third state.
