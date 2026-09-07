# NEXT SESSIONS ROADMAP

## How to resume
Read, in this order: `AGENTS.md` (binding rules), `docs/process/AUDIT_AND_TODO.md`, `docs/process/CHANGELOG.md`,
`docs/planning/APP_GUI_CHECKLIST.md`, then `docs/specification/` for anything a doc disagrees with.
Rule P5 applies: every open point goes to the owner as an MCQ; the agent closes nothing alone.
Two developers work here at once, so: **the new developer owns `apps/mobile/tests/`** (his brief:
`docs/planning/ONBOARDING_TASK_1.md`) and **the agent owns `apps/web/src/**`, `apps/mobile/scripts/**` and the docs.**
Nobody edits the other's area.

## Chunks, in dependency order
Each chunk is one session and ends with a push, a green CI, and a report. Nothing below is "nice to have"
and nothing is scheduled because it is easy.

| chunk | what | who | done means |
| --- | --- | --- | --- |
| **A1** ✅ | Signing infrastructure: one prep for both installer variants, CI picks the variant, manifest hardened, version 7 | agent | pushed in round 14; `config.test.js` compares the two prep lists and was seen red both ways |
| **A2** | The keystore + four secrets, then the signed installer ships | **owner**, then agent verifies | see "A2, the only step that needs a keyboard you own" below |
| **B** | Prove the signature is stable: two consecutive builds, same pubkey | agent | `apksigner --print-certs` (or the fallback parser in the `apk` job) prints the same key hash on run N and N+1; `cmp` the live `/download/android` bytes against the repo blob; release notes stop saying "debug" |
| **C** ✅ (agent part) | `G-120`: a key too short to be a secret is ignored, and three two-process tests make the whole class visible | owner sets one Railway var (`D-8.19`) | `MOBILE_DEVICE_TOKEN_KEY` set; a test that spawns **two** servers proves a token from A is refused on B **only** when the key differs, and accepted when both read the env key — `config.test.js`+`server.test.js` prove it: 15/15, and each fault was introduced on purpose and reddened the test that names it |
| **D** | `apps/web` polish list (the standing parallel track) | agent | one component library: `Section()`, `mkActions`, map primitives shared with the app; no visual regression (`layout` + `landing` suites), and the duplication guard stays green |
| **E** | `D-8.11`: promote the boot harness into CI | agent | a CI job boots the **built** page against the **deployed** mobile service and fails when the first screen is the offline splash; recipe in `~/.vtest/BOOT_HARNESS.md` |
| **F** | `D-8.15`: the real-phone pass, then `G-041` (real rides) | owner runs, agent scripts | cold start offline → honest card; online → splash → app → enrol 200 → sign-in → booking round-trip; then the money path unblocks |
| **G** | Legal and data: `G-002`, `G-006`, `G-017`, `G-041`, `G-003`, `G-007` | owner + legal, agent drafts | a privacy policy and ToS that name the real processing, a retention rule per table, and the store listing's data-safety form |

Everything the owner decides goes through an MCQ; the open ones are recorded in
`docs/decisions/OPEN_ITEMS.md` (enrol window `MOBILE_ENROL_WINDOW_MS`, the store-vs-sideload
announcement, and the % for `G-041`).

## A2, the only step that needs a keyboard you own
Run this **once**, on your own machine, and never commit the output. Losing the keystore means an
updated app cannot be installed over the old one — so keep a copy somewhere it survives a laptop.

```bash
keytool -genkeypair -v -keystore rideshare-release.jks -storetype JKS \
  -alias rideshare -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Ride Share, O=Ride Share, C=SY"        # it asks for a store password; pick a real one
base64 -w0 rideshare-release.jks                    # this whole blob is ANDROID_KEYSTORE_BASE64
```

Then in GitHub → this repo → **Settings → Secrets and variables → Actions → New repository secret**, four of them:

| name | value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the single long line `base64 -w0` printed |
| `ANDROID_KEYSTORE_PASSWORD` | the store password |
| `ANDROID_KEY_ALIAS` | `rideshare` |
| `ANDROID_KEY_PASSWORD` | the key password (same as the store's, if you pressed Enter) |

Nothing else to do. No rebuild command, no config: the `apk` job already looks for exactly those four
and switches itself to the signed variant, and the landing page's button and QR follow the repo copy
without a separate step. If you would rather not keep a keystore at all, say so and the fallback is
`gradle signingReport` + Play App Signing (Google holds the key; the AAB path is already wired).

**One consequence to expect:** the first signed build cannot be installed *over* a debug build. Anyone
who already has the debug installer must uninstall it once. That is Android refusing to let a
different key replace an app, and it is the thing A2 exists to prevent from happening again.

## Superseded
The "Session 2 candidates" list that used to sit here (product questions, screen inventory, config
catalogue, Phase 0) was written before any code existed. Those phases are built; what is left is the
table above. Kept here as a pointer rather than deleted so the history of the plan is readable.
