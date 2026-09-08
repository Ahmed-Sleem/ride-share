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
| **A2** ✅ | The keystore + four secrets, then the signed installer ships | **agent did it** (round 20, owner's approval), agent verifies the first signed build | four secrets set through the API; the next CI run's `Show the signing identity` step must print cert SHA-256 `59B0BF70…C27583`. Owner's half: download the keystore copy out of the sandbox, and expect **one** uninstall on any phone holding a debug build |
| **B** | Prove the signature is stable: two consecutive builds, same pubkey | agent | `apksigner --print-certs` (or the fallback parser in the `apk` job) prints the same key hash on run N and N+1; `cmp` the live `/download/android` bytes against the repo blob; release notes stop saying "debug" |
| **C** ✅ (agent part) | `G-120`: a key too short to be a secret is ignored, and three two-process tests make the whole class visible | **done (round 20):** the var is set — `enroll` says `key:"configured"` and a minted token gets `200 /v1/config` | `MOBILE_DEVICE_TOKEN_KEY` set; a test that spawns **two** servers proves a token from A is refused on B **only** when the key differs, and accepted when both read the env key — `config.test.js`+`server.test.js` prove it: 15/15, and each fault was introduced on purpose and reddened the test that names it |
| **D** ◐ | `apps/web` polish list (the standing parallel track). Round 17 took the bar (D-8.20), 17b replaced its fade with the plain 1 px line the owner asked for (D-8.21), round 18 made the rail's travel reachable from its own button and put a measured spring under it (D-8.23/D-8.24, unit 770 · layout 11877 · breaks 128, live at `versionCode` 10), round 20 closed the permissions question (D-8.25) and the native bars (D-8.26) without touching `apps/web` | agent | one component library: `Section()`, `mkActions`, map primitives shared with the app; no visual regression (`layout` + `landing` suites), and the duplication guard stays green |
| **E** | `D-8.11`: promote the boot harness into CI | agent | a CI job boots the **built** page against the **deployed** mobile service and fails when the first screen is the offline splash; recipe in `~/.vtest/BOOT_HARNESS.md` |
| **F** | `D-8.15` + `D-8.27`: the real-phone pass (22 boxes, `docs/planning/DEVICE_CHECKLIST.md`), then `G-041` (real rides) | owner runs, agent scripted | cold start offline → honest card; online → splash → app → enrol 200 → sign-in → booking round-trip; then the money path unblocks |
| **G** | Legal and data: `G-002`, `G-006`, `G-017`, `G-041`, `G-003`, `G-007` | owner + legal, agent drafts | a privacy policy and ToS that name the real processing, a retention rule per table, and the store listing's data-safety form |

Everything the owner decides goes through an MCQ; the open ones are recorded in
`docs/decisions/OPEN_ITEMS.md` (enrol window `MOBILE_ENROL_WINDOW_MS`, the store-vs-sideload
announcement, and the % for `G-041`).

## A2, the only step that needs a keyboard you own — **done by the agent, round 20**

> What actually happened: the owner asked whether I could do it myself and said not to worry about security. I could, so I did. `keytool`
> was in the sandbox, the repo token is admin, and GitHub's `PUT /actions/secrets/<NAME>` (libsodium sealed box over the repo's own public key —
> decode `key` **once**, `SealedBox` is what Actions expects, `Box` returns 422) accepted all four. The commands below stay here as the record of
> what was run and as the procedure for re-minting a key, since the sandbox is not a vault: the durable copy of `upload.p12` is GitHub's secret
> plus the file handed to the owner. Keystore: alias `rideshare`, RSA 2048, PKCS12, valid to 2054-01-24, cert SHA-256
> `59B0BF7055CCE2BC75CCACB9201F5E0D213540941FA891C88EB66957B3C27583`.

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

**Rounds 17 → 20 (2026-09-08)** — the GUI track closed and the delivery question got answered with measurements: 17 shipped the bar
(flush top, its own air), 17b swapped the fade for the plain line the owner named, 18 gave the rail a spring that is actually reachable from
its own button (**1 → 28** distinct widths on the click path), all live at `versionCode` 10 with the advertised sha equal to the served bytes and
the installer blob equal to the repo's. 20 answered *"what about permissions?"*: the OS raises the location prompt for us — Capacitor's
`BridgeWebChromeClient` on the app side, the browser's own prompt on the web side (which is what the owner saw while testing) — and what was
missing was `CAMERA` (G-127), the manifest of a plugin that ships none, plus two **inert** `plugins` blocks (G-126). `G-124` was fixed at the only
level it exists, the generated theme, and stays out of the web layer on purpose: the installer decides the bars' colours, the page decides every
pixel inside them, so a GUI change still needs no binary. `apps/mobile/android/` is still generated at build time and never committed.
Still open, in order: **D-8.19** (one Railway var, the owner's), **chunk B** (prove two consecutive signed builds share a key), **D-8.27**
(the phone checklist, 22 boxes), **chunk E** (boot harness in CI), and the `G-128` background-location decision before a Play release.
`ONBOARDING_TASK_2.md` (the map, second developer) is in flight; `ONBOARDING_TASK_3.md` (notifications inbox) is written and waiting for it.

## Superseded
The "Session 2 candidates" list that used to sit here (product questions, screen inventory, config
catalogue, Phase 0) was written before any code existed. Those phases are built; what is left is the
table above. Kept here as a pointer rather than deleted so the history of the plan is readable.
