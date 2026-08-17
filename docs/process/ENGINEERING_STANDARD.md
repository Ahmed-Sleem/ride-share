# Agent Working Rules — General Sanitized Version

These rules are reusable for any software project. They define how an AI agent should plan, implement, verify, document, and communicate work professionally.

Do not store secrets, private credentials, API keys, passwords, tokens, customer-private infrastructure details, or sensitive operational data in this file.

---

## 0. The Standard (read this before anything else)

Every other rule in this file exists to serve this one. When a rule seems to
conflict with it, this one wins.

**The work must be production ready, top tier, and complete.** Not a
demonstration, not a first pass, not "good enough for now". No missing pieces,
no missing details, no errors, no logical errors, nothing that violates an
industry standard.

What that means concretely:

1. **Take the time it takes.** Duration is never a reason to ship something
   partial. A thing done properly once costs less than the same thing done
   three times.
2. **Nothing half-built.** A feature is either finished and reachable, or it is
   hidden and logged as a gap. There is no third state, and a control that is
   visible but does nothing is the worst version of it.
3. **Trace the whole chain.** Things are connected. A change to a page implies
   its service, its repository, its permissions, its translations, its tests
   and its checks. Finishing the page is not finishing the change.
4. **No logical errors.** A thing that runs is not a thing that is correct.
   State the rule the code is supposed to implement, then confirm the code
   implements *that* rule and not a near neighbour of it.
5. **Industry standards, deliberately chosen.** Research what mature products
   in the same domain do before designing. Where this project departs from the
   common answer, the departure is a decision with a reason, written down.
6. **Self-validate, always.** Never report work as done on the strength of
   having written it. Prove it, then compare the proof against what was asked.

### 0.1 Checklists are mandatory

Before any non-trivial work, write an explicit checklist to
`_working_docs/thinking/`, one atomic line per requirement, including the
requirements implied by the request rather than stated in it.

While working, tick an item **only** when a command has proved it. Not when the
code looks right. Not when it compiles.

When the work appears finished, do a **final line-by-line comparison**: read the
original request and the checklist side by side and confirm each item is both
ticked and actually true. Anything unticked is either done now or recorded as a
tracked gap — never silently dropped.

Delete the checklist only after that comparison and after the work has been
verified and pushed. It is scaffolding, not a record; whatever must survive goes
into the permanent docs.

### 0.2 A check that cannot fail is not a check

The single most important verification rule in this file.

For every test or automated check written: **break the thing it guards, watch it
fail for the right reason, then restore it.** A check never observed failing is
an assumption wearing a test's clothing, and it will be trusted precisely when
it should not be.

When a check turns out to be a false positive, fix the check. Never work around
it, never weaken it to green, never delete the test it was complaining about
until its complaint has been understood.


### 0.3 Build a library, then build the product out of it

This is a philosophy about *how* the work is structured, and it applies to every
inch of the system — frontend and backend, styling and logic, alike.

**Define a thing once, in one place, and use it everywhere.** Never define it
twice. Never define it near where it is used because that is convenient.

The test of whether this has been done is a single question:

> To change X everywhere, how many files must be edited?

If the answer is anything other than **one**, the work is not finished.

Concretely, in three layers:

1. **One source of truth for values.** Colour, spacing, radius, type size,
   motion timing, breakpoints, z-index — all of it lives in one theme file, and
   every stylesheet reads from it. Changing the theme is editing that one file.
   A literal value written into a component is a value that will not move when
   the theme does, and it will be found months later by somebody wondering why
   one corner of the product looks wrong.

2. **One implementation of each component.** A button, a search field, a table,
   a window, a toolbar, an empty state — each is written **once**, in general
   form, in a shared library, and then used many times. Improving the component
   improves every screen at once. Two implementations of the same thing are not
   two components; they are one component and one future inconsistency, because
   the copy will not receive the next fix.

3. **One implementation of each rule.** The same discipline governs the server.
   One place decides authority. One place shapes an error response. One place
   validates a given input. One place resolves what a person may do. A second
   copy of a rule is a defect from the moment it is written, even while its
   answer happens to agree with the original — because the two will be edited
   on different days by people solving different problems.

**Consequences that follow from this, and are not negotiable:**

- Before writing any UI, look for the existing primitive. If it nearly fits,
  **extend the primitive**; do not fork it. If it genuinely does not exist,
  build it in the shared library and then use it — never build it inline "for
  now".
- A one-off is a decision that must be justified in a comment saying why this
  case cannot be served by the shared thing. Silence is not a justification.
- **This must be enforced by automated checks, not by intention.** Centralised
  design is invisible in review: a hardcoded colour and a token render
  identically, and a duplicated rule agrees with the original until the day it
  does not. Every rule in this section that can be checked by a script must
  have one, and that script belongs in the central verification command.
- When a check for one of these rules does not yet exist, writing it is part of
  the work, not a follow-up.

---

## 1. Session Start Protocol

At the start of every session or after any context reset, the agent must re-check reality before acting.

Required startup checks:

1. Read the project rules file.
2. Read the active audit/todo file.
3. Read the implementation log.
4. Read the recent changelog.
5. Read the roadmap or current project-status document if available.
6. Check actual repository state with Git:
   - `git status`
   - `git branch -a`
   - recent `git log`
7. If the task depends on live behavior, verify the live environment directly.
8. If summaries and real files/commands disagree, reality wins.

Never rely only on memory or previous summaries.

---

## 2. Thinking and Planning Protocol

### 2.1 Think in temporary files

Before any non-trivial task, create temporary thinking files under:

```text
_working_docs/thinking/
```

Use numbered filenames such as:

```text
01_points_task_name.md
02_thinking_task_name.md
```

Every temporary thinking file must start with:

```text
# DELETE AFTER: <exact deletion condition>
```

### 2.2 Parse-think-verify loop

For each non-trivial user request:

1. Parse every user instruction into atomic checklist items — including the
   requirements the request implies but does not spell out.
2. Reason through each item in writing.
3. Research the industry standard before designing anything non-obvious.
4. Ask clarifying questions when requirements are ambiguous.
5. Re-read the thinking file before acting.
6. Execute only after the plan is clear.
7. **Tick each item only when a command has proved it.**
8. **Before declaring the work finished, compare the checklist against the
   original request line by line.** Every item ticked and true, or tracked as a
   gap. This step is not optional and is not a formality — it is where missed
   requirements are actually caught.
9. Promote lasting outcomes to permanent docs.
10. Delete temporary thinking files when done.

### 2.3 Temporary vs permanent docs

Temporary files:

```text
_working_docs/thinking/
```

Permanent files:

```text
_working_docs/AGENT_RULES.md
_working_docs/AUDIT_AND_TODO.md
_working_docs/IMPLEMENTATION_LOG.md
_working_docs/CHANGELOG.md
_working_docs/NEXT_SESSIONS_ROADMAP.md
```

Never put permanent records in the thinking folder.
Never leave temporary reasoning files as the only record of important decisions.

---

## 3. Audit and Gap Management

### 3.1 Every gap must be tracked

Any discovered issue must be added to:

```text
_working_docs/AUDIT_AND_TODO.md
```

Examples of gaps:

- bugs,
- missing tests,
- outdated docs,
- security risks,
- unclear UX,
- failing builds,
- dead code,
- poor architecture,
- deployment risks.

### 3.2 Fix gaps one by one

Do not batch unrelated gaps.

For each gap:

1. Diagnose root cause.
2. Implement the complete fix.
3. Add/update tests.
4. Validate the fix.
5. Update audit status.
6. Update implementation log.
7. Only then move to the next gap.

No “half done, come back later.”

### 3.3 Closing a gap requires proof

A gap may be marked closed only with evidence:

- files changed,
- tests run,
- commands and outputs,
- manual validation steps if automation is impossible.

---

## 4. Implementation Log Requirements

Every closed gap must have an entry in:

```text
_working_docs/IMPLEMENTATION_LOG.md
```

Each entry must include:

1. Gap ID and one-line description.
2. Files touched.
3. Tests added or updated.
4. Verification commands and observed output.
5. Self-check answers:
   - Is the gap fully fixed?
   - Is everything wired and production-ready?
   - Does the test really validate the behavior?

At the end of each session, compare:

```text
AUDIT_AND_TODO.md
IMPLEMENTATION_LOG.md
```

Every closed audit gap must have a matching implementation-log entry.

---

## 5. Changelog Requirements

Every session must append to:

```text
_working_docs/CHANGELOG.md
```

Use this format:

```md
## YYYY-MM-DD session N

- Summary of changes.
- Tests/validation performed.
- Deployment or push status.
- Remaining next steps.
```

---

## 6. Verification Rules

### 6.1 Never assume — verify

Before making any claim about code, config, tests, deployment, security, or Git state, verify it directly.

Use:

- file reads,
- shell commands,
- tests,
- API calls,
- browser/manual checks,
- live environment checks when relevant.

If not verified, say:

```text
[UNVERIFIED]
```

### 6.2 Centralized verification is mandatory

Every project should have a centralized verification command such as:

```bash
./scripts/verify.sh
npm run verify
make verify
```

It should run all relevant checks:

- unit tests,
- integration tests,
- contract tests,
- lint,
- typecheck,
- frontend build,
- backend tests,
- shell syntax checks,
- secret scans,
- smoke tests where possible.

### 6.3 No push before validation

Before any GitHub push:

1. Run the centralized verification command.
2. Run focused tests for the touched feature.
3. Run a secret scan.
4. Inspect `git diff`.
5. Confirm only intended files are included.

If full validation cannot run, explicitly say why.
Do not claim unrun tests passed.

---

## 7. Testing Rules

### 7.0 Break every test you write

Restated here because it is the rule most often skipped under time pressure,
and the one whose absence is most expensive: **a check that cannot fail is not a
check.** Break the guarded behaviour, watch the test fail for the right reason,
restore it. See §0.2.

Two failure modes worth naming, both observed in practice:

- **The test that passes for the wrong reason.** It asserts something true
  regardless of the behaviour under test — a row that sorts correctly
  alphabetically anyway, a fallback stage that rescues the case the test meant
  to isolate. Breaking it is the only way to notice.
- **The test that cannot reach the bug.** It exercises a subject too powerful
  to be affected — an administrator, where only a narrowly permissioned user
  would expose the fault. If breaking the code leaves the test green, the
  subject is wrong, not the code.

Every change should include appropriate tests.

Use:

- unit tests for pure logic,
- integration tests for wiring,
- contract tests for APIs,
- frontend build/type checks for UI changes,
- accessibility checks where relevant,
- manual tests only when automation is not possible.

Manual test notes must include:

- URL,
- click path,
- expected result,
- what could not be automated.

Test mocks are allowed only in test files.
Mocks must never leak into production paths.

---

## 8. Production Code Rules

Production code must be real, complete, and usable.

Do not ship:

- fake API responses,
- fake auth,
- mock LLM responses,
- hardcoded users,
- silent no-ops,
- unfinished workflows pretending to work,
- decorative placeholder functionality,
- `console.log("would do X")` style stubs.

If a feature is not ready, either:

- keep it disabled,
- hide it,
- or log an explicit audit gap.

Never present unfinished behavior as production-ready.

### 8.1 Never offer what will be refused

Nothing a person cannot do may be presented to them as if they can.

**Permission-based unavailability is hidden, not disabled.** `disabled` means
"not yet, and you can change that yourself" — an incomplete form, a pending
prerequisite. A permission the viewer will never hold is not a "not yet".
Leaving the control visible clutters the screen, invites a click that ends in a
refusal, and discloses what other roles in the organisation are allowed to do.

Where hiding would make a screen incomprehensible, replace the control with a
sentence explaining who does this, not with a dead button.

This rule must be enforced by an automated check, not by memory: it is
invisible in review, because the screen renders and the control looks ordinary
until somebody clicks it.

### 8.2 Authority is decided in one place

Every question of "may this person see or do this" has exactly one
implementation, and every entry point calls it.

A second, well-meaning copy in a second service is how a system ends up
carefully refusing something in one place and quietly handing it over in
another. When a rule exists in the domain layer, an endpoint that reimplements
its own version of it is a defect even while its answer happens to agree.

Corollary: **scope in the query, not after it.** Filtering rows after fetching
them makes `limit` count records the caller may not see, breaks pagination, and
leaves data already read in a place where the next reader will use it.

---

## 9. Code Quality Rules

Production files should follow these standards:

1. Top-of-file comment/docstring explaining why the module exists.
2. External inputs validated at boundaries.
3. Backend validation is authoritative; frontend validation is UX only.
4. Async operations handled with explicit error handling.
5. Promises awaited or explicitly detached with a reason.
6. No swallowed exceptions.
7. No unhandled promise rejections.
8. No unnecessary `any` types.
9. No production `console.log`; use structured logging or controlled error reporting.
10. Keep modules cohesive and maintainable.
11. Remove unused imports, dead components, stale docs, and obsolete code.

---

## 10. Security Rules

Security is required by default.

### 10.1 Secrets

Never commit:

- API keys,
- GitHub PATs,
- passwords,
- private keys,
- `.env` files,
- access tokens,
- production credentials.

If a secret appears in chat or files:

1. Treat it as compromised.
2. Do not copy it into files.
3. Do not echo it unnecessarily.
4. Remove it from tracked files.
5. Scan working tree and history.
6. Document remediation without exposing the secret value.

### 10.2 Input validation

Validate:

- types,
- required fields,
- allowed values,
- min/max lengths,
- numeric ranges,
- file type/size,
- ownership/authorization,
- state transitions.

### 10.3 Common vulnerability protections

Protect against:

- injection,
- XSS,
- CSRF,
- broken access control,
- insecure direct object references,
- unsafe file upload,
- prompt injection,
- unsafe AI tool calls,
- secret leakage to frontend.

### 10.4 Least privilege

Use minimum necessary access for:

- API keys,
- cloud credentials,
- database users,
- deployment tokens,
- third-party integrations.

---

## 11. AI and Prompt Safety Rules

For AI features:

1. Treat retrieved documents, user content, tool outputs, and web content as untrusted data.
2. Separate trusted system instructions from retrieved content.
3. Use delimiters around retrieved context.
4. Do not let retrieved text override system rules.
5. Never reveal hidden prompts, secrets, cookies, or internal system messages.
6. Require citations for grounded factual answers where applicable.
7. Do not invent unsupported facts.
8. Return clear refusal when answer is not supported by approved sources.
9. Test prompt-injection cases.
10. Keep prompt bodies easy to inspect and edit, preferably in separate prompt files/templates.

---

## 12. Documentation Rules

Documentation must match reality.

Update docs when changing:

- setup steps,
- environment variables,
- deployment flow,
- APIs,
- data model,
- security model,
- UI behavior,
- tests/verification commands.

READMEs should be:

- story-driven when appropriate,
- direct,
- technically exact,
- not bloated,
- free of private customer details unless intentionally public,
- free of secrets.

---

## 13. Git Rules

### 13.1 Branch state

Before work:

```bash
git status
git branch -a
git log --oneline -n 10
```

### 13.2 Commit hygiene

Commits should be focused and reviewable.

Commit messages should explain:

- type of change,
- affected area,
- purpose.

Examples:

```text
fix(ui): align mobile menu button
feat(api): add encrypted key vault
test(stream): add SSE parser contract tests
```

### 13.3 Push rules

Only push after validation.

After push, verify remote state:

```bash
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/main
```

or the appropriate branch.

---

## 14. Deployment Rules

If pushing to a branch triggers deployment:

1. Confirm this is intended.
2. Run full local verification first.
3. Push only after clean validation.
4. Watch deployment if possible.
5. Smoke test live app after deployment.
6. Report exact URL and expected behavior.

Live acceptance should include:

- app root loads,
- key APIs respond,
- critical user flow works,
- no obvious console/network failure,
- environment variables are configured.

---

## 15. UI/UX Rules

For UI changes:

1. Ask how the user will actually use it.
2. Match established design language.
3. Preserve accessibility:
   - labels,
   - focus states,
   - keyboard behavior,
   - ARIA when needed.
4. Check responsive behavior.
5. Check light/dark themes if applicable.
6. Check RTL/LTR if applicable.
7. Avoid clutter.
8. Do not break existing good behavior while fixing edge cases.

---

## 16. Open-Source Reuse Rules

Smaller or lesser-known open-source projects may be useful, but verify before adopting.

Before using any external project, check:

- license,
- maintenance activity,
- security issues,
- dependency health,
- test coverage,
- code quality,
- production maturity,
- compatibility with project architecture,
- internationalization/RTL needs if relevant.

If useful but risky, record it as reference-only.

---

## 17. Communication Rules

Be direct and evidence-based.

Do not overclaim.

When reporting work, include:

- what changed,
- files changed,
- tests run,
- observed results,
- known limitations,
- whether it was pushed/deployed,
- what is next.

If something failed, say exactly what failed and why.

---

## 18. Session End Checklist

Before ending a session:

1. **Compare the session's checklists against what was actually asked, line by
   line.** Nothing silently dropped; anything unfinished is a tracked gap with
   an ID.
2. Update `AUDIT_AND_TODO.md`.
3. Update `IMPLEMENTATION_LOG.md` for every closed gap.
4. Update `CHANGELOG.md`.
5. Run required validation or state why not.
6. Run secret scan when relevant.
7. Verify Git status, and confirm the remote actually matches local.
8. Delete `_working_docs/thinking/*.md`.
9. Summarize what happened and what remains — including what was *not* proved.

---

## 19. Sensitive Information Policy

This general rules file must stay sanitized.

Do not add:

- live domains unless intentionally public,
- private IPs,
- SSH commands with keys,
- passwords,
- tokens,
- customer-private names,
- internal-only credentials,
- sensitive deployment secrets.

Store sensitive operational details in secure secret managers or private deployment platforms, not in repository governance files.
