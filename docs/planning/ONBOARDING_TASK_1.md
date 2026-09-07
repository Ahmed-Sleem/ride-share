# ONBOARDING TASK 1 — give the mobile break harness a spine, then five cases (`D-8.14`)

Welcome. This is your first task and it is **test-only**: you cannot break the product with it. It also
teaches the habit this repo is built on: **a guard that has never been seen failing is a comment, not
a check.** Every step below has a command to run and the exact output that step must produce. If a
step's output does not match, stop and fix that before moving on — do not carry a mismatch forward.

You will touch **one file**: `apps/mobile/tests/breaks.sh`. Nothing else. Not the server, not the web
app, not `brand.json`.

---

## 0. Why this file is in this state (read once, it is 60 seconds)

`apps/mobile/tests/breaks.sh` today contains one hand-written case and ends with:

```bash
echo "breaks: examined 1 check, 0 missed"
```

That line is **hardcoded**. It does not count anything. To be exact about what that costs: the single
case below it *does* `exit 1` if its check stays green, so the harness is not blind — but there is no
per-case accounting, so the report is `1 check` forever and every case you add in that ad-hoc style
needs its own `if`/`exit` bolted on, which is how a case ends up silently uncounted. The web harness
(`apps/web/tests/breaks.sh`, 114 cases, helper at line 27) has a real `run_break` with counters and a
`BREAKS_ONLY` filter; the mobile one was written before that pattern existed and never caught up.
That gap is `G-119`, and step 2 is you closing it.

Two runs in a row must leave `git status` empty — that is the test of a well-behaved case, and it now actually works.

Also: `apps/mobile`'s cases run inside the CI job **`Verify (repo + api + web unit)`**, via root
`package.json` → `pnpm verify` → `pnpm -r --if-present test` → `apps/mobile`'s
`"test": "node --test … && bash tests/breaks.sh"`. They are **not** in the `Break-detection` job
(that one runs the two web files only). So if your case is red on CI, look at `Verify`, not
`Break-detection`.

---

## 1. Set up (exactly, in this order)

```bash
git clone https://github.com/Ahmed-Sleem/ride-share.git && cd ride-share
pnpm install
git config core.fileMode false     # MANDATORY, repo-wide. Without it a stray chmod is recorded as a
                                   # 23-file "change" and can be committed; that cost this repo a
                                   # whole CI cycle (row G-118, and it is why step 9 exists).
node apps/web/build.js             # writes apps/web/dist/index.html + dist-preview.html
```

### Step 1 validation — the baseline you must reproduce before writing anything

```bash
cd apps/mobile && node --test tests/server.test.js tests/config.test.js tests/boot.test.js 2>&1 \
  | grep -E "^# (tests|pass|fail)"
```

You must see exactly:

```
# tests 29
# pass 29
# fail 0
```

If these differ, **stop and ask**. Do not "fix" a suite to make it match the number; a mismatch means
your environment or the branch is not what this document describes.

Two environment traps, both real here, neither a product bug:

- `node apps/web/build.js` dies with `fuse.js … ENOENT`, or puppeteer with `MODULE_NOT_FOUND` →
  dependencies are gone (this workspace rehydrates between sessions). On the shared sandbox:
  `bash ~/.vtest/ensure-deps.sh`. A normal checkout: `pnpm install`.
- A suite killed by a tool **timeout looks exactly like a failure**. `apps/mobile/tests/config.test.js`
  shells out to the web bundler; if it fails in well under 500 ms, suspect the environment and re-run
  with a longer timeout before believing it.

---

## 2. Step 2 — build the helper (this is the part that makes the task worth doing)

Port the web harness's shape into `apps/mobile/tests/breaks.sh`. Read the original first — it is
short and every line has a reason: `apps/web/tests/breaks.sh`, the `run_break` function at line 27.

Your mobile `run_break` must satisfy this contract. Do not copy the web one verbatim — the web
variant runs `node build.js` then `node tests/unit.test.js`; the mobile gate is different, and using
the web's commands would make every mobile case pass or fail for reasons unrelated to the mutation.

| requirement | why it is in the contract |
| --- | --- |
| signature `run_break "<sentence>" <file-from-repo-root> '<sed expr>' "<literal failing-test name>"` | same shape as web, so the next person reads both files the same way |
| `cd` to the repo root, like the existing case does (`ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"`) | the case files are named from the root; a wrong cwd is the #1 way this harness silently no-ops |
| back the file up **outside the tree**, e.g. `"${HOME}/.vtest/breaks-scratch.$$"`, and restore in an `EXIT`/`INT`/`TERM` trap | a `.bak` next to the source is a real trap that fired here: an interrupted run leaves the product file mutated, and `verify-repo` read the leftovers as CSS |
| if `cmp -s` says the sed changed nothing, report `BROKEN-BREAK` and count it as a **fail**, not a pass | a case whose anchor drifted is not a caught bug — it is an untested one, dressed as a pass |
| gate = `node --test --test-reporter=tap tests/server.test.js tests/boot.test.js` | `tap` is what makes the match below exact; the default reporter's names are not greppable |
| a case is CAUGHT only if the output contains a line starting `not ok ` **and** containing the expected test name, matched literally (`grep -F`) | `-F` matters: names contain `(` and `?`, which grep would read as regex |
| honour `BREAKS_ONLY="<words>"` to run one case (same mechanism as web, line 31) | 5 cases × a ~1 s suite is fine; 114 would not be. He needs it to iterate |
| count `PASS`/`FAIL` and end with `echo "breaks: examined $((PASS+FAIL)) check(s), $FAIL missed"` and `exit 1` if `FAIL` | this replaces the hardcoded line — the actual point of the task |
| restore with `cp` from the scratch copy, then `cmp -s` against it **before** deleting the scratch dir | G-121, found while writing this brief: the old case rewrote the file's lines and appended a blank line to `apps/web/src/screens/rider.js` on *every* run, which `build.js` then baked into `dist-preview.html`. My own first fix deleted the scratch dir inside the same function, so `cmp` compared against a missing file and the harness failed itself — proof the assertion is worth having |
| keep the existing platform-boundary case working, converted to the same accounting | its `echo "0 missed"` line must not survive as a second summary |

### Step 2 validation — the helper must be honest about a *known* miss

Add one throwaway case that plants a **real** product change no test observes. This one is measured:
the default device-token TTL goes from 24 hours to 25, and the suite stays entirely green — because
no test reads the default.

```bash
run_break "deliberate miss" apps/mobile/server.js \
  's|Number(process.env.MOBILE_DEVICE_TOKEN_TTL_MS || 24 \* 60 \* 60 \* 1000)|Number(process.env.MOBILE_DEVICE_TOKEN_TTL_MS || 25 * 60 * 60 * 1000)|' \
  "nothing is expected to fail here"
```

```bash
bash apps/mobile/tests/breaks.sh 2>&1 | grep -E "MISSED|BROKEN-BREAK|examined"
```

You must see a `MISSED` line **and** a non-zero exit (`echo $?` → `1`). A `BROKEN-BREAK` instead
means your sed matched nothing — the helper's `cmp` guard is doing its job, fix the expression. If a case
that catches nothing reports success, the helper is decorative — fix it before writing real cases.
Then **delete the throwaway case**. Never ship it.

---

## 3. What to read before writing the cases

1. `docs/process/AUDIT_AND_TODO.md` → rows **G-110, G-114, G-115, G-116, G-117, G-118, G-119, G-120**.
2. `apps/mobile/server.js` → `KEY_SOURCE` (:42), `issueDeviceToken` (:58), `deviceToken` (:84,
   signature check :92, expiry :98), `enrollAllowed` (:114), the enrol route (:272-288).
3. `apps/mobile/offline.html` → `bootHeaders()` (:136), used by the update fetch (:173) and the
   bundle fetch (:197).
4. `apps/mobile/tests/server.test.js` → the four tests your cuts must turn red (:82, :115, :123, :232).

---

## 4. The five cases — every cut below was **executed** on this commit and what it reddens is measured

Copy these exactly. Each is `run_break` + the `sed`; the "must go red" string is the literal test
title from the TAP line, so `grep -F` matches it.

| # | cut (sed) | the test it must redden — measured, not guessed | why it matters |
| --- | --- | --- | --- |
| 1 | `s|if (sign1(payload) !== sig) throw new Error("sig");|if (false) throw new Error("sig");|` | `a personal route with nothing to present is refused, and says which thing is missing` | a signature nobody checks is a token anyone can forge |
| 2 | `s|Date.now() > body.e|Date.now() - 86400000 > body.e|` | `a service with no key configured still enrols, instead of locking everyone out` | one day of grace on a day-long TTL makes expiry decorative. It reddens the *spawned-server* test because that is the case that waits 500 ms and asserts `DEVICE_TOKEN_EXPIRED` (`server.test.js:281`) — knowing that saves you an hour |
| 3 | insert `  return true;` as the first line of `enrollAllowed` | `a device cannot enrol in a loop` | the enrol route is public; an unlimited dispenser mints tokens forever |
| 4 | insert `    const gate = deviceToken(req); if (!gate.ok) return json(res, 401, { ok: false, code: gate.code });` as the first line inside `if (url === "/v1/mobile/enroll") {` | `enrolment mints a token, and that token opens the personal routes` (and 3 others) | **this is the bug that shipped**: requiring a token in order to receive a token dead-locks every install. This case is the regression lock on G-117 |
| 5 | insert `      "x-rs-sign": "0".repeat(64),` into the object `bootHeaders()` returns | `the boot page asks for its interface without a credential, and without a preflight` | if fetching the UI needs a signed header, every Android install fails on the preflight before it can download the UI |

### Cuts that are known NOT to work — do not spend an evening on them

- `require("node:crypto").randomBytes(32).toString("hex")` → `""` : caught by **nothing**. Every test
  runs in one process, and in one process an empty key still signs and verifies. That is not your
  failure to fix; it is recorded as **G-120** and the reason is written there. If you have appetite,
  write up how you *would* test it as a comment in your report — do not add a case that cannot fail.
- Any cut whose anchor text is not unique in the file. `sed` will rewrite every occurrence and the
  suite will go red for a reason unrelated to your intent. Check first:
  `grep -c 'the text you are matching' apps/mobile/server.js` must print `1`.

---

## 5. Rules of the house (the owner's, not suggestions)

- **Fix the code, not the guard.** If a case reddens something you did not predict, that red may be
  the harness telling you the cut was wrong, or the product telling you there is a bug. Write down
  which one you concluded and why.
- **No placeholders, no dead code, nothing commented out, no stub that prints "TODO".** If a case
  cannot be written, say so in your report instead of shipping a shell.
- **Do not** add `server.url` to `apps/mobile/capacitor.config.json`; **do not** put a deployment
  host in `apps/web/dist-preview.html` (a guard counts them, must stay 0); **do not** "fix" the
  mobile service answering `/` with `403 NOT_A_WEBSITE` — that is deliberate; **do not** touch
  `apps/web/src/**` or `packages/brand/**` (the other developer is in there right now — you would
  collide and both lose).
- A mutation must never survive your run. `git status --porcelain` after `breaks.sh` must be **empty**.
- Copy and prose rule that has bitten this repo twice: never write a token or header name into a
  comment in a file that a guard later greps — `"x-rs-sign"` inside your own comment can make a guard
  pass vacuously. In case 5's comment, write "the signing header" instead of its name.

---

## 6. Validate every step as you go

```bash
cd /home/user/repo   # or your checkout

# one case at a time (write it, run it, read it, then the next)
BREAKS_ONLY="forge" bash apps/mobile/tests/breaks.sh

# all of them: every case CAUGHT, and the summary is a real count
bash apps/mobile/tests/breaks.sh 2>&1 | tail -5

# the tree came back whole — this is not optional
git status --porcelain          # must print nothing

# the suites you just leaned on are still green with the file restored
cd apps/mobile && node --test tests/server.test.js tests/config.test.js tests/boot.test.js 2>&1 | grep -E "^# (tests|pass|fail)"
# again: # tests 29 / # pass 29 / # fail 0

cd ../web && bash verify.sh     # the gate CI runs; expect every line green, exit 0
```

### Step-by-step self-check table — fill this in for your report

For each of the five cases, run it alone and paste the two lines you got:

| # | the `CAUGHT …` line your run printed | did you also see it go red for *that* reason? |
| --- | --- | --- |
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |

A case that "catches" because the build died, or because the suite crashed, is a **false catch**.
The way to tell: read the TAP line. `not ok 3 - a personal route …` with an assertion message naming
the forged token is a catch. `not ok` with `SyntaxError`, `ENOENT`, or `ECONNREFUSED` is your sed.

---

## 7. Definition of done — report these six numbers, in this format

1. `bash apps/mobile/tests/breaks.sh` → **`examined 6 check(s), 0 missed`** (the 5 new ones plus the
   platform-boundary case you converted), exit 0.
2. Your throwaway no-op case from step 2 produced **`MISSED` and exit 1** before you deleted it. Paste
   that output — it is the proof the counter is real and not the old hardcoded line.
3. `apps/mobile` node tests **29 / 29 / 0**.
4. `apps/web` `bash verify.sh` → all suites green, **exit 0**.
5. `git status --porcelain` → **empty**.
6. The CI run on your commit → all jobs success, and say which job you watched
   (**`Verify (repo + api + web unit)`** is the one that executes your file) with its run id.

If G-119 is genuinely closed by your change, tick it in `docs/process/AUDIT_AND_TODO.md` by editing
that row's Status to `CLOSED` and appending one sentence of evidence. Do not add a new row for it.
Add a row (next id **G-121** — check first, the numbering moves) only if you found something real;
if you found nothing, say so plainly, that is a fine answer and inventing a row is worse.

---

## 8. Commit and push (pushing is part of finishing — the owner's rule)

```bash
git add apps/mobile/tests/breaks.sh docs/process/AUDIT_AND_TODO.md
git commit -m "D-8.14: mobile break harness counts, and 5 cases for the device-token guards (G-119, G-117)"
git push origin main
```

Before you push, prove the exec bit survived (this is the trap that took down CI once):

```bash
git ls-files -s apps/mobile/tests/breaks.sh    # must be 100755, not 100644
```

If it says `100644`: `chmod +x` it, `git add` it, and amend. `scripts/check-exec-bits.sh` will fail
CI otherwise — and CI failing on file *metadata* is still your task.

CI has `cancel-in-progress`, so your push cancels the run in flight; that is expected. Watch it with:

```bash
curl -s "https://api.github.com/repos/Ahmed-Sleem/ride-share/actions/runs?branch=main&per_page=1"
```

**A red CI is part of the task, not background noise.** Stay with the run until it is green.

---

## 9. If you get stuck

Ask, and include: the command you ran, its **full** output, and what you expected. Do not restructure
the harness to route around a failure, and never delete or weaken a case to reach green — every
shortcut here becomes the next developer's mystery bug. Two hours stuck is a question, not a challenge.

The owner reads short. One line per finding, number where you have one, no adjectives.
