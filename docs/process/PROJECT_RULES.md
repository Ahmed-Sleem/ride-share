# Project Rules Pointer

Binding rules for this project = the user-supplied general agent rules.
Source of truth copy: `_working_docs/AGENT_RULES_GENERAL.md` (copied from user upload).

Project-specific additions:
- P1. Communication with the user happens ONLY through MCQ questions (ask_user tool),
      always with recommended option marked, then wait for the answer.
- P2. Everything discussed must be appended (never rewritten) to docs so nothing is lost.
- P3. Work proceeds step by step; each step is fully confirmed before the next.
- P4. Final deliverable = one organized master specification document used to build the app.

## Project rule P5 (added 2026-07-29, on user instruction)
- P5.1 NEVER present a whole chapter for blanket approval. Break every chapter into its individual
      decisions and put EACH ONE in an MCQ so the user knows exactly what they are approving.
- P5.2 The agent must NOT close, settle or assume any open point on its own. Every open point is
      carried into an MCQ with options and an explicit agent recommendation.
- P5.3 Where the agent has an opinion it must state it, but the user makes the call.
- P5.4 Unresolved points stay visibly OPEN in AUDIT_AND_TODO.md until closed by a user MCQ answer.
- P6. (2026-07-31) After ANY model change, run a full cross-chapter consistency sweep. Audits #3
      and #4 both found that rewriting the obviously-affected chapters leaves other chapters
      silently contradicting the new model. Fix every occurrence; raise anything needing a
      decision as an MCQ. Consistency is a continuous obligation (DEC-126).
