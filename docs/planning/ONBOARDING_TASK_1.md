# ONBOARDING TASK 1 — break cases for the device-token guards (`D-8.14`)

Owner's new team member: this is your first task. It is deliberately **test-only** — you cannot
break the product with it, and it teaches you the one habit this repo is built on: **a guard that has
never been seen failing is a comment, not a check.**

Work it to completion and push. Report back with the four numbers in "Definition of done".

---

## 0. Set up (do this exactly; the environment is unusual)

```bash
git clone https://github.com/Ahmed-Sleem/ride-share.git && cd ride-share
pnpm install
git config core.fileMode false          # MANDATORY. Without it, a stray chmod shows up as a 23-file
                                        # change and you can commit it (that red one is in the log
                                        # as G-118 — it cost a whole CI cycle).
node apps/web/build.js                  # writes apps/web/dist/index.html + dist-preview.html
cd apps/web && bash verify.sh           # the gate CI runs; expect all suites green before you start
```

Baseline you must reproduce before writing anything (if these differ, stop and ask — do not
"fix" a suite to make it match):

| suite | expected |
| --- | --- |
| `apps/web` unit | **726 passed / 0 failed** |
| `apps/web` a11y | **14 / 0** |
| `apps/web` layout | **7570 / 0** |
| `apps/web` landing | **3333 / 0** |
| `apps/web` routes (`node --test tests/server.test.js`) | **8 / 8** |
| `apps/mobile` (`node --test tests/*.test.js`) | **29 / 29** |

Sandbox note: if `node build.js` dies with `fuse.js … ENOENT`, or puppeteer dies with
`MODULE_NOT_FOUND`, your dependencies are gone (this workspace rehydrates between sessions) —
`bash ~/.vtest/ensure-deps.sh` here, or `pnpm install` in a normal checkout. A suite killed by a
10-minute timeout *looks* like a product failure; re-run with a longer timeout before believing a red.

## 1. What to build

`apps/mobile/tests/breaks.sh` mutates the source on purpose and asserts the guards **fail**. Every
recent guard ships with a case; the device-token work (G-117) does not yet. Add five cases.

Read first, in this order — they are short and they contain the reasons:

1. `docs/process/AUDIT_AND_TODO.md` → rows **G-110, G-114, G-115, G-116, G-117, G-118**.
2. `apps/mobile/server.js` → `issueDeviceToken`, `deviceToken`, `enrollAllowed`, `KEY_SOURCE`.
3. `apps/mobile/tests/breaks.sh` → the `run_break` function and its existing cases; copy the shape.
4. `docs/planning/APP_GUI_CHECKLIST.md` → D-8.8 and D-8.14 (your task), and the standing law they
   encode: *a break case is added in the same commit as its guard.*

A case is: `run_break "<human sentence>" <file> '<sed expression that inserts a real bug>' "<what must go red>"`.
Before it runs, the file is backed up; after it, the script proves the tree came back whole. That
backup-then-verify is not ceremony — a leftover mutation becomes a corrupted build the next suite
reads as truth (it has happened here once).

### The five cases

| # | the cut | the guard that must fail, and why it matters |
| --- | --- | --- |
| 1 | In `deviceToken`, replace `if (sign1(payload) !== sig) throw` with `if (false) throw` | a token whose signature is never checked is a token anyone can forge. Message must name the forged/invalid-token test |
| 2 | In `deviceToken`, replace `Date.now() > body.e` with `Date.now() - 86400000 > body.e` | a day of grace on a day-long TTL means the expiry is decorative. Must fail `DEVICE_TOKEN_EXPIRED` |
| 3 | In `enrollAllowed`, make it `return true` unconditionally | the enrol route is public, so an unlimited dispenser is a way to mint tokens forever. Must fail the 429 throttle test |
| 4 | In the `KEY_SOURCE` fallback, replace `require("node:crypto").randomBytes(32).toString("hex")` with `""` | this is what stops a misconfigured deploy answering 503 and locking every install out. Must fail the spawned-server "no key configured" test |
| 5 | In `offline.html`, re-add a signing header to the boot reads (insert `"x-rs-sign": "0".repeat(64),` into the `bootHeaders()` return) | the boot page must send nothing that needs a preflight, because fetching the UI cannot depend on a credential. Must fail the "no signing in the boot page" test |

Cut 5 is a *product* file and you are only allowed to touch it inside the harness — the script's
back-and-restore is what makes that safe. Never leave a mutation on disk: finish with
`git status --porcelain` showing nothing.

## 2. Rules of the house (these are the owner's, not suggestions)

- **Fix the code, not the guard.** If one of your cases makes an *existing* test fail, the existing
  test is telling you something. Only rewrite a guard when its premise is dead — and then rewrite it
  to assert its **intent**, with a comment saying why (there are ~10 examples in the git log; search
  `must not contradict` and `the intent is`).
- **No placeholders, no dead code, nothing commented out.** If a case cannot be written yet, say so in
  your report instead of shipping a stub.
- **Do not** add `server.url` to `apps/mobile/capacitor.config.json`, do not put a deployment host in
  `apps/web/dist-preview.html` (a guard counts them; must stay 0), and do not "fix" the mobile
  service answering `/` with 403 `NOT_A_WEBSITE` — that is the design.
- **Do not touch** `apps/web/src/**` or `packages/brand/**`. Another developer is in there right now
  (the polish list: `Section()`, one component library, map primitives). Your task is
  `apps/mobile/tests/` and nothing else. If you find a product bug, write it up in your report rather
  than fixing it.
- Copy must never admit placeholder state and never name the brand literally (it comes from
  `brand.json`). Your case *messages* are prose that a guard test may later read — keep token names out
  of your comments when the assertion greps for them (this has bitten this repo: grepping a token name
  inside your own comment makes a guard pass vacuously).

## 3. How to validate your work

```bash
cd apps/mobile
BREAKS_ONLY="token" bash tests/breaks.sh        # iterate on one case at a time, ~20 s each
bash tests/breaks.sh                            # full: every case must be CAUGHT, "missed 0"
node --test tests/*.test.js                      # 29/29 must stay green with the file restored
cd ../web && bash verify.sh                      # the whole web gate, green
git status --porcelain                           # MUST be empty before you commit
```

Read the report line, not the exit code. `breaks.sh` prints `caught N / missed M`. **`missed` is the
number that matters**: a `missed` case means a guard is decorative — which is a finding about the
guard, and worth writing down even when your own case is the one that was missed.

Then commit and push (pushing is part of finishing; Railway redeploys from `main`):

```bash
git add -A && git commit -m "D-8.14: break cases for the device-token guards (G-117) — 5 cases, missed 0"
git push origin main
```

CI has `cancel-in-progress: true`, so a push cancels the in-flight run; that is fine here — your
push re-runs everything against your commit. Watch `Verify (repo + api + web unit)`,
`Verify GUI (full browser suite)` and `Break-detection`:

```bash
curl -s "https://api.github.com/repos/Ahmed-Sleem/ride-share/actions/runs?branch=main&per_page=1"
```

`Break-detection` is the job that runs `breaks.sh`. **A red CI is your task, not background noise** —
stay with the run until it is green, and if `Break-detection` reports a case of yours as `missed`,
that is the work not being done yet.

## 4. Definition of done (report these four numbers)

1. `bash apps/mobile/tests/breaks.sh` → **caught N / missed 0**, and N is **5 higher** than before you
   started.
2. Each of your five cuts was **seen red for the right reason** — paste the one-line failure each
   produced (a failure with the wrong message is a false catch; it has happened here).
3. `apps/mobile` suite **29/29**, `apps/web` `verify.sh` all green, `git status` clean.
4. The CI run on your commit: all jobs success (say which run id).

Also append one row to `docs/process/AUDIT_AND_TODO.md` (next free id is **G-119** — check first, the
numbering moves fast) only if you found something real while doing this. Most people do. If you did
not, say so plainly — that is a fine answer; do not invent a row.

## 5. If you get stuck

Ask, with: the command you ran, its full output, and what you expected. Do not restructure the
harness to get around a failure, and do not delete or weaken a case to reach green — every shortcut
here becomes the next developer's mystery bug. Two hours stuck is a question, not a challenge.
