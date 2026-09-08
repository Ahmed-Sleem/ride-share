## 2026-09-08 — round 20: permissions, answered by reading the dependency, and A2 done without a keyboard

The owner asked *"does the app/web take the user's permission to use location?"* and, separately, *"can you do A2 yourself?"*. Both were
answered by measurement rather than recollection, and one of them changed the repo.

**Permissions.** The prompt is not ours to write: `@capacitor/android` 8.5.1's `BridgeWebChromeClient.onGeolocationPermissionsShowPrompt`
requests `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION` at the moment the page calls `navigator.geolocation`, grants the WebView, and
honours a coarse-only answer on API 31+. Our manifest patch (`apply-android-manifest.sh`) is what makes that legal by declaring them, and
`packages/platform/src/index.js` prefers the native plugin and falls back to the web API — which is why the browser *also* asks, per origin
(the owner had seen exactly that). So the answer for location was "already correct, verified". What the audit found genuinely missing was
two things: **`CAMERA` was never declared**, while `@capacitor-mlkit/barcode-scanning@8.1.0` ships an empty manifest and *silently* answers
`checkPermissions()` instead of prompting when the permission is undeclared (G-127) — a driver at the door would have seen no dialog and no
error; and **two `plugins` blocks configured plugins that are not installed** — `StatusBar { style }` (zero hits in `pnpm-lock.yaml`) and
`SplashScreen { backgroundColor: "#FFFFFF" }` (no `splash` string anywhere in `@capacitor/android`'s java sources, and Capacitor reads
`plugins` at exactly one call site, for a loaded plugin id). Dead config is not free: the StatusBar block read like a fix for `G-124` for
two rounds (G-126).

**What landed** (all `apps/mobile`, nothing in `apps/web`, so no GUI change and no `version.code` bump — D-8.22 is about a GUI change
needing the mobile redeploy, not the reverse): a new prep step `apply-android-system-bars.js` writes six theme items into the generated
`AppTheme.NoActionBarLaunch` in *both* `values/` and `values-night/` — transparent status/navigation bars, `windowLightStatusBar` true by
day and false by night, `enforce*Contrast` off — colours sourced from `packages/brand/brand.json`, never typed twice; `apply-android-manifest.sh`
gained `CAMERA` (before `<application>`, exactly once) plus the `com.google.mlkit.vision.DEPENDENCIES=barcode_ui` meta-data inside it; the
dead blocks are gone from the generator. Three mobile tests were added (35 → **38**, all green) and each was **seen red on purpose**: drop the
prep step → `D-8.18`'s prep-divergence guard; make the patch skip the night theme → `G-124`; re-add `StatusBar` → `G-126`; undeclare `CAMERA`
→ `G-127`. This is also the answer to the owner's architecture worry: the installer now decides **two colours and two icon flags** and nothing
else, so the page still owns every pixel inside the bars, spacing (`--safe-t: env(safe-area-inset-top)`) included, and a GUI change still needs
no binary. `G-128` records the one thing left to decide — three declared-but-unused location-service permissions that cost a Play review.

**A2, closed by the agent.** `keytool` minted a fresh PKCS12 key (alias `rideshare`, RSA 2048, valid to 2054-01-24, cert SHA-256
`59B0BF70…C27583`) and all four `ANDROID_KEYSTORE_*` secrets were written through `PUT /actions/secrets/<NAME>` — 201/204 each, and
`GET …/secrets` now lists exactly four. Two findings worth keeping: the API's `key` must be base64-decoded **once** (not twice, which is what
my first attempt did before every 422), and the accepted encryption is a libsodium **sealed box** (`SealedBox`), not `Box`. The keystore is not
in the repo; the sandbox is not a vault, so the owner was handed a copy to keep, and the first signed CI run must print that same cert hash.
Also recovered this round, without touching product code: the sandbox had rehydrated with HEAD 33 commits stale, `origin` deleted, exec bits
wiped and objects missing — `reset --mixed` to the true tip (`ff62b6e`) plus `chmod +x` from the tree's own `100755` modes, verified by
`git status` empty and `check-exec-bits.sh` at 0 wrong. `fuse.js@6.6.2` had to be re-installed into `~/.vtest` before `apps/web/build.js`
could run at all (v7 has no `dist/fuse.min.js`, so the pinned 6.6.2 is the version that builds).

## 2026-09-08 — round 18: the rail's travel became reachable at all, and it rides a spring

Round 17 gave the desktop rail `transition:width` and the owner's verdict after using it was: *"the side menu, it tranversls but very fast very
harsh not elegant and not bouncy"*. Measuring the **click** path explained why it felt like nothing: `render()` rebuilds the shell, so the
`.nav` that existed a frame earlier is discarded and the new one is *created* at its final width — a transition needs one element with two
values, and there was only ever one value. Same instrument, before and after: round 17 **1 distinct width** in 900 ms of frames; round 18
**28**, from 72 px to a peak of 225.6 px, ending on 216 px. So `railToggle()` no longer renders: `foldRail()` flips one class on `.app`,
updates the button's `aria-pressed`/`aria-label`/icon and the tooltips, and falls back to `render()` only if there is no shell to fold.

The curve is then a real spring rather than a borrowed menu easing. Sampled from the damped-oscillator step response at damping ratio 0.65
(`ω` chosen so it settles inside 0.5% at 470 ms): 63% of the travel inside a quarter of the time, +6.7% past the open width, one rebound,
rest. Material's own split is what made the choices decidable — a **spatial** change (a size) may overshoot; an **effect** (opacity, colour)
must never, because a bounce in alpha reads as a flash. So `--rail-in-ease` (a `linear()` curve inside `@supports`, with a `cubic-bezier`
declared *first* for an Android System WebView older than 113) drives `width`/`padding-inline` only, while the labels ride `--ease` and stay
opacity-only, staggered 22 ms apart with the profile row landing last. Folding away is not a moment to celebrate: `--rail-out-dur:190ms`,
no overshoot, accelerating out. Under `prefers-reduced-motion:reduce` the whole block does not match, and the rail simply *is* (2 distinct
widths, measured).

Two harness findings, both from a MISSED that looked like a weak guard and was not:

1. **A break case must name the assertion that detects the mutation, not the one closest to the topic.** "the fold-away rides the spring too"
   deleted a rule and expected `it takes a spring's time to arrive and none to leave` to fail — that assertion reads the *tokens*, which the
   deletion left standing. Pointed at the assertion that reads the rule, the same case is CAUGHT.
2. **A mutation that does not compile proves nothing.** `build.js` refuses to write a bundle it cannot parse, so `run_break` was testing
   yesterday's artifact and reporting a miss. `run_break` now fails the case as `MISSED-BUILD` (proved with a throwaway, then deleted) —
   and this round it caught my own unbalanced `}` twice, in two different files. CI is green on all 124 cases today, which is what makes the
   stricter accounting safe: a case whose build fails would already have been MISSED.

version.code 9 → 10, and `apps/mobile/scripts/build.js` gained a real reason to be in the push: it now refuses to publish an OTA artifact
whose CSS or HTML reaches a third-party origin through `url()`, `<link rel=stylesheet>` or `<script src>` — a phone in a tunnel gets a blank
screen from that, and CI never sees it because CI has a network. Proven by injecting a CDN `@font-face` into the sheet (build exits 1, naming
the pattern) and restoring it. `apps/mobile` 35/35 with that test pinned (config 14), mutation-proven by weakening one pattern's `https?:`
anchor, which turns the suite red.

Guards moved with the change: unit 770 (the rail group is now behavioural — the same `.nav` node must survive the click, storage is asserted
with a recording stand-in because jsdom has no storage area for an opaque-origin document — plus the spring's overshoot bounded to 4-15%, the
`@supports`-ordering requirement, and `linear(0,` counted on declarations only so the `@supports` test itself is not off-by-one), layout
11877 (both directions measured on one element by flipping the class, with the fade read in the state that shows it), breaks 128 cases.
`RS_SKIP_BREAKS=1 bash apps/web/verify.sh` → ✓ all green; `node build.js` on a damaged sheet had earlier produced
"Could not parse CSS stylesheet" in jsdom, which is the same lesson one layer up: an artifact is not a source file, so rebuild before
believing a suite that reads the build.

## 2026-09-08 — round 17b: the owner rejected the fade, and the simpler thing the app already had won

Round 17 gave both horizontal bars a two-layer edge — a hairline plus a 14 px `--edge-scrim` fade, per theme, deepening while the page was
scrolled — after reading Material 3's `scrolledUnderElevation` and iOS 26's scroll edge effect. The owner's verdict after using it:
*"the size of the top bar now fixed and have no gaps and very pretty, but the edges is very very bad, revert to the older simple line edge
of the bottom menu, and use the same in the top menu, and make it only visible on scroll when some content get under the top menu only."*
The bar's size and the flush top were kept; the edge was torn out.

Now: the bottom menu has its original `border-top:1px solid var(--line)` back, exactly as it shipped for the whole renewal. The head carries
the same rule as `border-bottom:1px solid var(--line)` **only while `.main.is-rolled`**, i.e. only once the page has started sliding under it —
at rest `border-bottom:1px solid transparent`, so the page opens with no rule under the title at all. The width is reserved rather than added
on purpose: a border appearing on the first scroll event is a 1 px shift of a sticky element sitting on top of content that just moved, and
measuring it (`.main__inner` flex column, `air under title 17 px` in both states) is how that was known rather than hoped. `.topbar--plain`
(sheet and dock heads) keeps `border-bottom:0`, so a head that overlaps something it does not scroll never grows a line. `--edge-h`,
`--edge-scrim`, both `::after`/`::before` layers, the theme-declared fade and the deepening gradient are **deleted**, and one guard exists to
keep them deleted: `the treatment the owner rejected stays out of the sheet`, with a `breaks.sh` case that reintroduces a single edge token
and must go red. The only motion left is the line's own arrival, `transition:border-bottom-color var(--fast) var(--ease)`, inside
`prefers-reduced-motion:no-preference`; measured 390→1280 the settled colour equals the other bar's (`rgb(222,222,222)` = `var(--line)`,
which the layout suite now asserts as an *equality* with the bottom menu's top line on a phone and the rail's inline line at ≥600 — "use the
same" is only testable that way), and under `reduce` it is the same colour with `1e-05s`.

`version.code` 8 → **9**. `apps/mobile/scripts/build.js` prints `boot 100466 bytes → www/ | app 1123682 bytes → dist/www/ (OTA,
versionCode 9)`, because the size question it answers ("is my change even in the binary?") should not require unzipping a published APK;
that change also deliberately touches `apps/mobile/**`, since the mobile service's Railway trigger is path-filtered and an `apps/web`-only
push leaves every installed phone on the old GUI.

Three mistakes of mine came out of doing it, all caught by the harness rather than by me: four `run_break` patterns and then two more were
written with `\{` and `\(--line\)` — in sed's BRE those are an interval start and a capture group, so the edits silently changed nothing and
`BROKEN-BREAK` reported it (`literal parens are not escaped` is now the rule for this file); two layout assertions read `getComputedStyle`
immediately after toggling `is-rolled` and so measured the *transition in flight* rather than the rule, fixed by suppressing the transition
for the measurement only; and a first rescue of the reverted sandbox HEAD almost committed stale `apps/web/**` copies over CI's newer
installer, which the per-file `cmp` against `origin/main` caught.

## 2026-09-08 — round 17: the app's bar became a bar (owner's three complaints, measured first)

The owner used the app and the webapp after login and named three things. Each was measured before it was touched, because two of the three
had a different cause than they looked like they had.

**Thin bar, no air under the title** — measured: the title's bottom equalled the bar's bottom exactly (`title.b 87.1 == head.b 87.1`), i.e. **0 px** of
gutter under the poster, because `.topbar` carried `padding:calc(var(--s2) + var(--safe-t)) 0 0`: air above (for the status bar), none below. Now
`--head-t:12px; --head-b:16px` are the bar's own tokens, worn as `padding:calc(var(--head-t) + var(--safe-t)) 0 var(--head-b)`, and the title sits with
**16 px above and 16 px below it at every width** (measured 320 → 1920). The ≥840 density block was deliberately *not* overridden: the owner's standing
ask was that the app be consistent, and one pair of numbers for the bar is more consistent than a responsive one.

**A gap above the bar** — two separate causes. On the web at ≥1200 px: `.main{padding:var(--s4)}` floated the whole scroller, and with it the sticky
glass strip, **14 px** below the window (`headTop 14` measured at 1280 and 1920). Now `padding:0 var(--s4) var(--s4)`: air beside and below the page, never
above the bar. The second cause was subtler and invisible to a source read: `.main__inner` carries `animation:pagein`, whose first keyframe is
`translateY(8px)`, so **the bar was lifted off the top by its own entrance** for as long as the transition ran — measured `headTop 8` on every viewport,
including widths that had no gutter at all. The animation now belongs to the page's blocks (`.main__inner>*`) with `.main__inner>.topbar{animation:none}`:
the content rises, the chrome stays pinned. Both are fixed: `headTop 0.0` at 320/390/768/1280/1920.

**An edge under the bar** — researched before designing: Material 3 removed the AppBar drop shadow in favour of `scrolledUnderElevation` (a tint that
appears only when content passes under), and iOS 26's HIG pushes the same idea as the scroll edge effect and warns against custom toolbar backgrounds.
So the edge is two layers, not one shadow: a hairline exactly on the border and a 14 px fade away from it, drawn by a pseudo-element *outside* the bar's box
so no measured number moves; and while `.main` is actually scrolled, the same fade deepens (`.main.is-rolled`), which is what makes it read as a surface
rather than a rule. `Motion.scrollEdge` sets that flag from a passive scroll listener — behaviour in the JS, the look in the sheet, neither holding the
other's numbers. The owner also said the **bottom menu's edge is the good one**: so the head was brought to *it*, not the reverse — the bottom bar's
`border-top:1px solid var(--line)` is gone, replaced by the same shared `.topbar::after,.nav::before` recipe mirrored upward, one `--edge-scrim` token
declared per theme (`rgba(10,10,10,.07)` on paper, `rgba(255,255,255,.10)` on ink, so the fade is not a light-mode-only decoration).

**The desktop rail opened without any animation** — `.nav` had no `transition` at all (`transitionDuration "0s"` measured), so the whole column snapped 144 px
in one frame. It now travels on `--panel-in-dur`/`--panel-in-ease` — the landing menu's own timing, so opening a rail and opening a menu are the same
gesture — with the labels fading in behind the space they need. Proven in a real browser by sampling a frame mid-flight: **72 → 179.9 → 216 px**
(`inBetween: true`), and the guard pair asserts both sides of the motion query: travel `0.28s` under `no-preference`, `0s` under `reduce`, and the edge
itself (not motion) survives both.

**Guards**: `apps/web` unit **726 → 748** (+22, one group for the bar's air/edge and one for the rail and the scroll flag), layout **7570 → 12520** (the new
per-viewport block is 9 assertions × every viewport × every role, including `the head touches the top of the page` and
`the bottom menu and the head draw the same edge`), and `apps/web/tests/breaks.sh` grew **10 cases, all CAUGHT** (`0 missed`), including two of my own mistakes
that the harness caught for me: four patterns written with `\{` were rejected by sed's BRE (an escaped brace opens an interval), reported as
`BROKEN-BREAK → edit did not change the file` rather than silently passing. Two new-layout assertions also failed first and were *my tests* being wrong: Chrome
under `reduce` reports `0.00001s`, not `0s`, and a `slice(0,9)` probe cut the word "gradient" in half.

**Shipping**: `version.code` **7 → 8**, and the owner's judgement that this needs no APK change is **right, and for a better reason than "OTA will
carry it"**: the installer does not contain the app at all. Measured by unzipping the v8 binary CI committed (`6203ac7`, `sha256 655b61cf997f…`),
`assets/public/index.html` is **100,474 B** of boot page — `splash × 9`, `boot × 11`, `topbar × 0`, `--s2 × 0` — i.e. the launcher, not the shell
(`apps/mobile/www/` holds that one page and its `offline.html` twin; the 1,097,500 B built page never enters the APK). The app GUI an installed phone
shows is whatever the mobile service offers at `/v1/mobile/bundle`. So a new installer changes nothing a tester can see, and the version bump is what
makes the phone take the new bundle. Two facts came out of shipping it. (1) The web service redeployed with the new
bar within ~90 s and `--head-t × 3` was readable in the live page, but the **mobile** service kept answering `versionCode: 7` with the round-16 bundle
(`sha256 ede7e68e…`, 1,153,099 B) — a stale deploy is therefore a stale GUI, and nothing else can fix it, which is why this correction ships as its own
push. Every push that touched `apps/mobile/**` had deployed it and every `apps/web`-only one had not, so its Railway trigger is path-filtered — recorded
because the next GUI round will hit it again. The fact is now a test rather than a paragraph: `apps/mobile/tests/config.test.js` (12 → 13) asserts both
`www/` files come from the boot page, that `appHtml` reaches only `dist/www/`, that the boot page names `/v1/mobile/update` and `/v1/mobile/bundle` and
carries no `.topbar` rule of its own, and that `meta.json` publishes `brand.json`'s `version.code`; seen red three ways (`www/index.html` ← `appHtml`, an
OTA route renamed, `versionCode` hard-coded to 1), each restored byte-exact, 34/34 after. (2) One thing this round did **not** fix, recorded as `G-124`: in the installed app the Android status bar is a band the WebView does not paint, so it can still look like a strip above the bar. `viewport-fit=cover`
is already set and `--head-t` already adds `env(safe-area-inset-top)`; what is missing is edge-to-edge on the native window, which is `apps/mobile` and needs a
new binary.

## 2026-09-07 — renewal round 11: the installed app could not reach its own server, and the landing's menu was a strip
## 2026-09-08 — round 14c: the pushed work met CI, and CI found what no local suite could

Pushed as `9fe6f95`. `Verify (repo + api + web unit)` went green on it — that job runs `pnpm verify`, so it exercised the two new
scripts, the exec-bit guard, `apps/mobile` 33/33 and the new developer's six break cases in one pass — and the renamed
`Android installer (signed when the keystore exists)` job built and committed **Installer v0.1.0 (7)** (`sha256 9c0a532b57ee…`),
debug variant, exactly as designed while the four secrets are absent.

`Android Play AAB` went **red**, and the cause was mine and real: `lintVitalRelease → MissingDefaultResource`, because
`apply-android-night-splash.js` declared `rs_splash_background` and `rs_splash_bar` only in `values-night` (G-123). It had been latent
since the day that script was written — the debug variant never runs that lint task — and my shared-prep change is what made the
release build execute it. So the shared prep earned its keep in the first hour: it turned a silent asymmetry between the two binaries
into a build failure that says what is wrong.

Fixed at the root: the patcher now declares the pair in `values/colors.xml` as well (day value = the brand's light paper, so neither
plane drifts from the one source) and **merges** into an existing `colors.xml` instead of replacing it, because a future template or a
plugin may put colours there. `config.test.js` checks the two folders as **sets** rather than hard-coding two names, so a third
night-only colour cannot slip through unseen, and it asserts the merge preserves a foreign colour. Seen red on purpose: with the base
declaration removed the suite says `the night colours must have a base values/colors.xml, not only a values-night one`, and 12/12 again
after restore.
## 2026-09-08 — the new developer's first task landed, and it passed review

`D-8.14` (`445668c`) rewrote `apps/mobile/tests/breaks.sh` into a real harness: `run_break` with `PASS`/`FAIL` counters,
`BREAKS_ONLY`, scratch copies outside the tree, `BROKEN-BREAK` when the sed matches nothing, and a hard `die` unless the file
comes back byte-for-byte — which is the G-121 lesson taken on board rather than re-taught. Six cases (five for the device-token
guards, plus the converted platform-boundary one), all CAUGHT, `examined 6 check(s), 0 missed`, exit 0, verified on this checkout
and not on his machine. His matcher is stricter than the web harness it came from: `grep -F "not ok " | grep -qF "$expect"` demands
that the failing test is the one named, so an unrelated red cannot be read as a catch.

One residual for his next task, recorded rather than fixed by me: a mutation that breaks **syntax** reddens every test including the
named one, and still counts as caught. A cap on how many tests may fail per case (or a `node --check` before the suite runs) closes it.
## 2026-09-08 — renewal round 14b: G-120 closed with the only kind of test that can see it

`KEY_SOURCE` used to be a label: the enrol response said `configured` or `ephemeral` and nothing else changed, so a key could be absent,
empty, or `"abc"`, and every test stayed green. Two fixes, both driven by measurement rather than taste:

- **A short key is not a key.** `MOBILE_DEVICE_TOKEN_KEY` below 32 characters is now treated as absent — warned about on stderr with its
  actual length, and reported as `key:"ephemeral"`. Refusing to start was rejected on purpose: locking every install out is the G-117
  bug class, and a lie in the response is worse than a warning.
- **Three tests spawn a second server process**, because a one-process suite physically cannot see this: with no key a token from A must be
  `401 DEVICE_TOKEN_INVALID` on B; with one shared key it must be `200` on B; and a 3-character key must enrol fine while admitting it is
  ephemeral. Both faults were then introduced on purpose in scratch copies and each reddened exactly the test that names it —
  `an ephemeral key is per-process…` for the empty-key cut (the cut that was invisible in round 13) and
  `a key too short to be a secret is ignored…` for the dropped length guard. `apps/mobile` server suite 15/15 (was 12).

Owner-side remainder, recorded as `D-8.19`: one variable on the deployed service (`openssl rand -hex 32`), which is what makes tokens
survive a restart and span instances. No code needed for that, which is why it waits rather than blocks.
## 2026-09-08 — renewal round 14: the installer gets a real signing story, and a shipped-binary measurement finds G-122

The owner chose "signed release APK now" and asked for a plan worked in chunks, so `docs/planning/NEXT_SESSIONS_ROADMAP.md` is rewritten as
seven dependency-ordered chunks (A1 done here, A2 is the owner's keystore, B–G after) with a "done means" per row. The old
pre-code candidate list is marked superseded rather than deleted.

**Measured from the shipped APK, not from the build scripts** (binary `AndroidManifest.xml` parsed out of the archive):
`package eg.rideshare.app`, `versionCode 6`, `minSdkVersion 24`, `targetSdkVersion 36`, `compileSdkVersion 36`, **`debuggable true`**,
**`allowBackup true`**. Two consequences: `minSdkVersion 24` means v2-only signing is correct (an earlier worry of mine about
pre-Android-7 installs is void — measuring beat guessing), and `allowBackup="true"` puts the WebView data directory — where the
session bearer token lives — into Google's cloud backup and device-to-device transfer. Recorded as **G-122**; refused by
`apps/mobile/scripts/apply-android-manifest.sh`, which now sets `allowBackup="false"` and owns the six permissions, and it is
idempotent because `cap sync` can run over an existing project.

**The defect that would have made D-8.18 worse than the status quo:** `make-release.sh` applied only the version rewrite, while
`make-apk.sh` also applied permissions, icons and the night splash. So "just ship the signed build" would have produced a binary
with no location permission and the default Capacitor icon. Fixed by extracting the shared prep into
`apps/mobile/scripts/prepare-android.sh`, which both entry points call, plus `RS_PREP_DRY=1` so the invariant is *executed*:
`config.test.js` runs both variants and compares their prep lists. Seen red on purpose twice — stubbing the manifest script to
`exit 0` gives `missing ACCESS_COARSE_LOCATION`, and making the release prep skip the icons step gives
`release prep diverged from debug prep`. (A first attempt at the second proof failed for a syntax reason instead; that is a false
catch and I re-ran it.)

**CI** (`apk` job, renamed "Android installer (signed when the keystore exists)"): it selects the variant by the presence of the four
`ANDROID_KEYSTORE_*` secrets, exports `INSTALLER_APK`/`INSTALLER_KIND` for the publish and commit steps (which no longer hardcode
`apk/debug/*.apk`), prints the signer's certificate on every build so a key rotation is visible in a log instead of discovered by a
phone that refuses to update, and the fallback path runs the same `make-apk.sh` on the same patches, so today's bytes are unchanged
until the secrets exist. `version.code` 6 → 7 because the binary changes — and `docs/planning/APP_GUI_CHECKLIST.md` D-8.15 now names v7.

**Also fixed, found by my own run:** the mobile break harness dirtied product source on every run (G-121, previous entry), and a
`git checkout -- apps/mobile/scripts/make-release.sh` during that experiment threw away an uncommitted rewrite of that file —
the lesson is recorded in the rules for this repo: never `git checkout` a tracked file you have edited without committing it,
back it up instead (which is what the restore-proof uses).
## 2026-09-07 — renewal round 13c: the new developer's brief, and two of my five break cases were false

The owner asked for a task file for the incoming developer with "no space for mistakes". Writing it honestly meant measuring the work
I had described last turn, and two of the five break cases in that description did not survive measurement:

- the "ephemeral key falls back to an empty string" cut is **caught by nothing** — every test runs in one process, and inside one process
  an empty key still signs and still verifies. Recorded instead as **G-120**: with no `MOBILE_DEVICE_TOKEN_KEY`, each instance mints its
  own random key, so a token enrolled on A is refused on B (proved this round: two servers on 9201/9202, the same token passed the gate on the minting instance and was refused on the other with `401 DEVICE_TOKEN_INVALID`;
  it reads `503` on the first hop only because no API process runs in that sandbox, which is itself the point — the identity layer let it through). Survivable because `apps/web/src/lib/api.js` re-enrols once on a `401 DEVICE_TOKEN*`, and
  because Railway runs one instance; permanent fix is owner-side (set the key, or share it through a store).
- the expiry cut reddens `a service with no key configured still enrols…`, **not** a test named for expiry — the `DEVICE_TOKEN_EXPIRED`
  assertion lives inside that spawned-server test (`server.test.js:281`), which sets a 300 ms TTL and waits 500 ms. The brief now says so,
  because reading that mapping off a green-looking suite costs an afternoon.

`apps/mobile/tests/breaks.sh` also turned out to have no `run_break` helper, no `BREAKS_ONLY` and no counter — it ends in the literal
`echo "breaks: examined 1 check, 0 missed"` (**G-119**), which is why `D-8.14` is now "give the harness a spine, then five cases". Its
step-2 validation asks him to prove the counter is real with a cut I measured: the default TTL moved from 24 h to 25 h and all 18 tests
stayed green — a true `MISSED`.

Also verified this round, because "is the APK ready?" deserves a measurement rather than a summary: the installer the landing page serves
is the CI `assembleDebug` output (`.github/workflows/ci.yml:168`), signed with `CN=Android Debug, serial=01`, and **two CI builds of the
same versionCode 6 carry different public keys** (`b80a9062…` and `49fc80d9…`) because nothing caches a debug keystore. So the download
works for anyone installing today (27,884,040 bytes, sha256 `a1e73d2654ec…`, OTA bundle `v6`, no key baked in) but an in-place upgrade of
an already-installed copy will fail with a signature mismatch, and a debug build keeps WebView inspection on. The signed path already
exists and is unwired: `make-release.sh` reads four `ANDROID_KEYSTORE_*` secrets that GitHub does not have. **D-8.18** (`D-8.17` is the exec-bit gate, already done).

`docs/planning/ONBOARDING_TASK_1.md` is rewritten around the real harness; `D-8.14` in the checklist now names the dropped cut instead of
promising it. Full local gate on this tree: unit 726/0, a11y 14/0, layout 7570/0, landing 3333/0, routes 8/8, mobile 29/29,
`apps/web/verify.sh` exit 0.
**A harness bug the task wrote itself.** Making the brief exact meant running the mobile harness, and `apps/mobile/tests/breaks.sh`
restored its mutated file by filtering lines in python — which appended a blank line to `apps/web/src/screens/rider.js` **on every run**,
and `build.js` then baked it into `apps/web/dist-preview.html`. Two runs left the product tree dirty with a change nobody made, which is
exactly what the brief tells the new developer to check for. Rewritten to copy the file to scratch outside the tree, restore with `cp`,
and prove it with `cmp`; my first version deleted the scratch dir in the same function, so `cmp` compared against a file that no longer
existed and the harness failed itself — it now runs twice in a row leaving `git status` empty, and `apps/mobile` stays 29/29. G-121.

## 2026-09-07 — everything pushed; `verify-gui` went red on a file's *permissions* (G-118)

The six held commits are on `main` (`008055d..8f66d59`) and both fixes are live, verified against the services rather than against the build: the
deployed page now contains the centring rule and measuring it in a browser returns **0.0 px off centre** for all 7 rows in English and Arabic; and the
device-token loop works end to end on production — `POST /v1/mobile/enroll` → 200 (`key: "configured"`, token shape valid), `/v1/config` with that
token → **200** (it had been 403 for the whole life of the app), without one → 401 `DEVICE_TOKEN_MISSING`, forged → 401, foreign `appId` → 403,
second enrolment inside the window → 429, and the live bundle contains **0** references to `__RS_APP_SECRET` or `x-rs-sign`.

Then `verify-gui` failed, and the cause was mine: `sh: ./verify.sh: Permission denied` (exit 126). A sandbox rehydrate strips exec bits; I staged
with `git add -A` before restoring `core.fileMode false`, so git committed mode `100644` for all 23 shell scripts. Contents were fine, every local
suite was green, and only the one script CI invokes as `./x.sh` broke the job — metadata failing a build. Fixed with `git update-index --chmod=+x`
across the shebang'd scripts, plus `scripts/check-exec-bits.sh` added to the standard checks: it reads the **index** rather than the disk (the disk
can be right while the commit is wrong), and it fails when it examines nothing, per the repo's own convention against silently-vacuous checks.


## 2026-09-07 — the app's identity layer: a minted device token instead of a shared phrase (D-8.12, G-117)

The owner picked the industry-standard option: no key in the client, a short-lived token minted by the server. `appProof`'s HMAC
demanded a phrase that could only live in a public artefact, so the shipped app could never satisfy it — booted, browsed, refused every
personal route. Now `POST /v1/mobile/enroll` (public, body-capped, one per device per minute) returns `d1.<payload>.<hmac>` signed by a key
the verifier alone holds; `/v1/*` personal routes require `x-rs-device-token`; a `401 DEVICE_TOKEN_*` makes the client re-enrol and replay the
call once; with no key configured the service mints an ephemeral one rather than answering 503, so a fresh clone runs the app at all. The
boot page no longer signs its reads at all — no `x-rs-ts`/`x-rs-sign`, and therefore no OPTIONS round trip before it can fetch its own
interface — and the site bundle is verified to contain no key (`grep -c __RS_APP_SECRET dist-preview.html` → 0). Two consequences beyond the
fix: nothing identity-related is baked, so OTA is now the only update path (the owner's architecture law, held), and because the same process
serves the bundle, **every already-installed app recovers on its next launch with no reinstall**. `ci.yml` no longer passes a build-time
secret; `MOBILE_DEVICE_TOKEN_KEY` (or the existing `MOBILE_APP_SECRET`) is a service-side variable only. `version.code` 5 → 6 because the
boot page and the injected tag changed, so `/download/android`, the button and the QR all move to the new installer together — they read the
same `brand.json`, which is how they cannot drift.

Measured: mobile suite 26 → **29/0** (enrolment, forged token, one-character tamper, expiry against a real 300 ms TTL in a spawned server,
foreign app id, enrol loop throttled, `/v1/config` reachable, public interface reads, no-key service, and a bundle-carries-no-key check); web
unit **726/0**, a11y **14/0**. Caught by tests, not by me: the expiry had a 60 s clock-skew allowance copied from the per-request timestamp it
replaced — a minted-`exp` token has no client clock in it, and the tolerance only kept dead tokens alive; removed from the product, not from
the test. Also my first TTL choice of 1 ms expired before the positive assertion could run: environments prove behaviour, guesses do not.

## 2026-09-07 — landing menu: the sheet's page names are centred (D-8.13)

The owner's verdict after the full-screen sheet landed: fixed on mobile, but the list still read like a drawer - names pushed to one edge of a
surface that is now the whole screen. `.landing__menulink` becomes a centred flex row, so the label sits on the centre line and inside the 44px tap
height instead of on its top edge; the row keeps its full width, and centring makes the Arabic branch simpler rather than needing one.

Measured properly, which mattered: the row's own rect is centred by construction, so asserting it would have passed with the text glued left.
`landing.test.js` now measures the **label ink** - a Range over the row's contents, compared to `clientWidth/2` - at every viewport and language, and
`unit.test.js` asks the mounted element for its computed `justify-content` rather than grepping the stylesheet. unit 724 -> **726/0**, landing
3221 -> **3333/0** (the new check runs 112 times across the survey, both directions). The installer the site hands out is the fixed one:
`/download/android` serves 27,883,996 B, sha256 `9fc2eabc45d3c20b`, identical to `apps/web/downloads/android.apk` on `main` = `008055d`, and v5's baked
config carries both `…mobile-production` and `…web-production` in `allowNavigation` with the OTA origin resolved.

## 2026-09-07 — the break harness caught its own blindness: three guards had been blind since round 9

`Break-detection` finished its first-ever CI run on run `34067676257` — the job only exists because round 9c restored the exec bits that had kept
the whole browser suite from ever running in CI — and it came back `breaks caught: 110, missed: 3`. Every miss was
`BROKEN-BREAK … edit did not change the file`, which is the harness reporting that its own probe was stale rather than the app being unguarded:
three cases still `sed`-ed `if(band) body.prepend(band);` and `.topbar{flex:none;display:flex;`, both rewritten by round 9 (the head became a
sticky grid, and the band began its life as `inner.insertBefore(band, inner.children[1]||null)`). The lesson is narrow and real: in round 9 I
re-anchored the *assertions* and left the *cases that test those assertions* pointing at old prose. A guard's guard is still a guard.

Each case was re-anchored with its intent intact — band promoted to chrome (must land inside the scroller), band buried under the list (must
follow the page head in the column), head free to shrink (must keep `flex:none`) — with expected-failure names updated to the assertions that carry
those facts today. Verified individually through the harness's own `BREAKS_ONLY` filter: CAUGHT, CAUGHT, CAUGHT, ~20 s each instead of 18 min, and
the tree came back clean from all three runs, so nothing was left mutated. The full 113-case suite runs in CI on this push, and that is the verdict
to read; this entry is the targeted proof, not a substitute for it. Recorded as G-109 with the rule: when a render-path or CSS rewrite moves a
guarded structure, the break-case anchor moves in the same commit.

The same push carries round 10b's docs commit (`19e588f`), held back while `Break-detection` was running so the push would not cancel it under
`cancel-in-progress`, plus the measurement it was waiting for: the installer is in the repo at `apps/web/downloads/android.apk`, **27,882,440
bytes**, sha256 `9843cbefcfa2…` computed here and matching the CI commit message exactly, 538 zip entries with 11 dex files and an
`AndroidManifest.xml`, signed with the v2/v3 block (`APK Sig Block 42` at 27,831,431, ahead of the central directory — an earlier "not signed,
would not install" line of mine was a bad probe that looked only in `META-INF`, where v1 lives), served live as **HTTP 200** +
`application/vnd.android.package-archive` + `attachment; filename="ride-share.apk"`, and also reachable as the `android-debug` release asset.
`versionName 0.1.0 / versionCode 3`, unchanged, so the GUI keeps arriving over the air.

## 2026-09-06 — round 10b verified in CI: the installer is on main, on the release, and on the live route

Two things happened after the commit, and one of them is a process rule worth keeping.

**A commit message of mine silenced CI.** Round 10b quoted the literal skip marker its own installer-commit step signs, and GitHub honours
that string in the head commit of a push, so the push carrying the api fix, the release publish and the night-splash step started **no run**
— `/actions/runs?branch=main` still showed the three-hour-old `a5465f2` as newest. Nothing in the tree was wrong, which is what makes it
expensive: a green-looking repo with no verdict. Re-triggered with an empty commit that describes the marker in words (`c6a6ba0`), recorded
as G-108 with the rule: never write the literal form in a message, and when an expected run is absent, read the run list before doubting
the workflow file.

**Then everything the owner asked for measured true.** Run `34067676257`: `Verify (repo + api + web unit)` **success** — the first green that
job has had this session, after nine api fixtures stopped being pinned to a calendar date; `Verify GUI (full browser suite)` **success** — the
job that used to die in 21 seconds with exit 126 because every `*.sh` was committed 100644; `Android debug APK (Capacitor)` **success**, which
built the app, published `ride-share.apk` (**27,882,440 bytes**, `application/vnd.android.package-archive`) to the `android-debug` prerelease at
23:47:17Z, and committed the same bytes to main as `86c8535 Installer v0.1.0 (3): sha256 9843cbefcfa2` at
`apps/web/downloads/android.apk` — the exact path `apps/web/server.js` already serves, confirmed with `git ls-tree -l` against the release
asset's size. Live then answered `/download/android` with **HTTP 200**, `content-disposition: attachment; filename="ride-share.apk"`, same byte
count: the landing page's button and QR have a real installer behind them, from the repo, with the release as a second source. `versionCode` is
still 3, so the GUI continues to arrive over the air; the committed binary costs every clone 27.9 MB, which is the trade the owner chose and
D-8.3 now records as reversible only by rewriting history.

Still running when this was written: `Break-detection`, the first CI verdict those two mutation passes have ever had — reported in the next
entry rather than assumed here.

## 2026-09-06 — renewal round 10b: the splash returns to its size, the installer gets a home in the repo, and the night splash stops flashing

Three points from the owner, and the third overturned my own recommendation on grounds worth writing down.

**The oversized word (G-105).** Measured on the built page before touching anything: the splash wordmark was
28.8 px on a phone, 49.9 at 768, and pinned at the **80 px** ceiling from 1231 px up — a word in a 418×84 box
sitting under a 92 px logo, so the label out-shouted the mark on the one screen that should say almost nothing.
`--f-word` had exactly one consumer, so the token moved instead of an override being added:
`clamp(1.5rem,1.15rem + .9vw,1.9rem)` → 24 / 25.3 / 29.9 / 30.4 px, which also agrees with the installer's own
boot page (`.name{font-size:22px}`). Verified by re-measuring, then by eye at 390 and 1280. A unit guard pins
the clamp's shape, its ceiling at ≤ 2rem and its floor at ≥ 1.3rem, so the fix cannot be undone by a future
tune and cannot shrink past what the binary already treats as legible. My first version of that guard asserted
`clamp(<rem>,<num>vw,<rem>)` and failed against my own CSS, whose middle is a sum and whose bundle may collapse
spaces — the assertion was corrected to the real shape, not the CSS bent to fit the guess.

**The installer, saved in the repo (G-107).** I had wired CI to publish the debug build as a release asset and
redirect `/download/android` to it, on the usual grounds that binaries do not belong in git. The owner's answer
was to build it *and keep it in the repo*, since the app updates its GUI over the air and a new binary is a rare
event — so the history pays once per release, not per interface change. That reasoning holds for this project,
and it changed my recommendation, so it is implemented: CI's `apk` job now copies the build to
`apps/web/downloads/android.apk` — the exact path `apps/web/server.js` already serves — and commits it only when
its sha256 differs, refuses anything over 60 MB, and marks `[skip ci]`. The release publish stays as the
fallback the server redirects to, so the page is correct either way. One thing had to be surfaced rather than
quietly overridden: `.gitignore:34` is `*.apk`, a deliberate earlier decision, so the exception
`!apps/web/downloads/*.apk` is narrow, documented in the file itself, and paired with `git add -f`; the cost is
stated in D-8.3 (every clone carries it, and reclaiming that means rewriting history). **Not claimed as done:**
this sandbox cannot build an APK — Java is here, the Android SDK and Gradle are not, and 2 CPUs / 1.9 GB RAM rule
out an emulator of the build — so the first bytes arrive from CI on this push, and D-8.1 measures them before
anything is called installed.

**The night splash (G-106), where the choice was made.** Rather than guess at Android XML, Capacitor
8.5.0's own template was unpacked from `@capacitor/cli`'s `assets/android-template.tar.gz` and read: the app
theme gives `AppTheme.NoActionBarLaunch` an `android:background` of `@drawable/splash` and the template contains
no `values-night` whatsoever, which is the whole mechanism of the dark-mode white flash. A new
`apps/mobile/scripts/apply-android-night-splash.js` writes `values-night/colors.xml` + `styles.xml` after
`cap add android`, painting `brand.json`'s `palette.dark.paper` (the same palette the stylesheet and the boot
page are now held to) and setting `windowSplashScreenBackground` so the API-31 system splash agrees with the
WebView that follows; it throws if the day theme's anchor has moved, so it can never ship a dead resource.
`apps/mobile/tests/config.test.js` **executes** it against a fixture carrying the template's real text and
asserts the output, that a second run rewrites no bytes, and that a moved anchor fails loudly — a test that
greps a script for a string would have proved none of that. Day behaviour is untouched, and this is a binary
plane change: already-installed devices keep the flash until the installer is reinstalled.

Gates on this round's build: unit **709 pass / 0 fail** (four new splash assertions among them), a11y 14/0,
layout 7570/0, landing 2773/0, mobile config **5/0** (the new execution test). Docs: APP_GUI gains §13, the
checklist D-8 with 8.1 left open on purpose, AUDIT gains G-105/106/107.

## 2026-09-06 — renewal round 10: the installer becomes downloadable, the CI test-suite stops being red, and the tutorial rejoins the system

Both of the owner's reports were true, and reading the serving code instead of inferring from the page is what proved each one.

**The download (G-103).** `apps/web/server.js` answers `/download/android` from three staging candidates —
`ANDROID_APK_PATH`, `apps/web/downloads/android.apk`, `uploads/app-debug.apk` — and a deployment has none of them, so the route
returned JSON, measured on live as **HTTP 404**: the button and the QR were wired to a real path with no bytes behind it. CI did
build an APK, but its job is `needs: verify` and `verify` was red, so the job was *skipped*; and an artifact is the wrong answer
anyway, because it needs a GitHub login to fetch, which makes a QR a control that pretends. Now the `apk` job takes
`permissions: contents: write` and publishes the debug build to a rolling `android-debug` prerelease, under the name brand.json
already owns (`download.apk` → `ride-share.apk`), with `gh release upload --clobber` and no third-party action, gated to pushes to
main; the server 302s there, `ANDROID_APK_URL` overrides it for any deployment that hosts the bytes elsewhere, and the honest
`APK_NOT_STAGED` JSON stays for a build with neither. The landing page needed no change at all — its QR and button always pointed
at our own path, which is exactly why the target can move without reprinting anything. `server.test.js` had no download test, the
actual reason this survived a release; it has four now (staged 200 with attachment headers, the `.apk` alias, the brand-derived
302, the override), and its response fake became a real `Writable` because `Readable.pipe` had been throwing straight into
`.catch(() => {})` and hanging three tests instead of failing them — a suite that cannot fail is worse than one that does.

**The CI red, at its source.** The 9 `apps/api` failures were `ConflictException`, all of them from `journeys.service.ts`
refusing a slot whose departure is in the past — correct production behaviour, and every fixture in that file was pinned to
`2026-09-01 12:00`. The day after it passed, the suite began failing in CI and nowhere else. Fixed by writing time the way one
test in the same file already wrote it (`cairoWall`, promoted to `futureSlot()`), not by loosening the guard, and a guard now
scans the file for any date literal in the future: a fixed past date is safe (a departed slot must stay departed), a fixed future
date is a fuse. `apps/api` is **247 pass / 0 fail**, `tsc` and `eslint` clean. The GUI job's own mystery from round 9c is closed
too: it failed in 21 s with exit 126 because all 23 `*.sh` files are committed 100644, so `./verify.sh` could not execute and the
app's whole browser suite had never run in CI.

**The tutorial (G-104).** The slider was never deleted: `introView()` is a four-slide first-open tour, gated by `rs.intro.v1` and
by `isAppSurface()` — whose comment records the decision that intro slides belong to the mobile product and never to the public
website (phone browser included), which is why the site shows none. Measured, it had fallen out of the system: 27.3 px mixed-case
at weight 750 while every page head is an uppercase 850 poster; a 1280 px footer against a 480 px stage; a head box that grew
51→83 px between slides, moving the headline 26 px on a phone and 11 px on desktop; and a swipe that did nothing
(`S.introSlide` stayed 0). The headline now takes the poster's case, weight, tracking and leading while keeping `--f-intro`
for size (`--f-poster` is 71.68 px at desktop, which wraps these sentences badly in a 480 px column); one `--intro-col` is shared
by the stage and by the footer's `padding-inline:max(…)`, so the buttons measure 400→880 at 1280 against the stage's 400→880;
both text slots reserve height under `@supports (min-block-size:1lh)`, which makes the head top constant (338 phone EN, 332 phone
AR, 363 desktop — all four slides) instead of centring a block whose height changes with the copy; `touch-action:pan-y` plus
pointer handlers turn a page on a horizontal drag of ≥24 px that beats the vertical component, and are a no-op past the last
slide so a slipping thumb cannot press Get started. The driver slide's fifth element (`j_intro4C`) was folded into its body copy
in English and Arabic so no slide carries a part the others lack, and `.intro__c` was deleted rather than left unreferenced. A
**How the ride works** row sits in the rider and driver profiles (not staff — the four slides are rider/driver copy), rendered
only on the app surface so it is never a control that does nothing on the web, and it deliberately does not mark the tour seen.
`unit` is **705 pass / 0 fail**, with 13 new assertions; two existing intro guards were re-pointed at the merged key because their
premise legitimately disappeared, which is the only kind of guard edit this project allows itself, and it is recorded here.

Architecture untouched: `apps/web/src/**`, `apps/web/server.js`, its tests, `apps/mobile/scripts/build.js`, one workflow file and
one api test file. The OTA bundle hash changes because the GUI changed; `versionCode` stays at 3, so this still arrives over the
air with no new APK. Two things remain honestly open: the release asset has to be measured after CI runs once (D-7.4), and
`breaks.sh`/`layout-breaks.sh` have never completed in CI, so their new `verify-breaks` job carries an unevidenced first verdict.

## 2026-09-06 — renewal round 9c: the palette lands, and CI's GUI job turns out never to have run

Round 9's two owner answers are in, and pushing them exposed something larger than either.

`packages/brand/brand.json` now owns `palette.{light,dark}{paper,ink,muted,hairline}`.
`apps/mobile/scripts/build.js` injects the three values the boot page actually reads (plus `--brand`/`--on`, both
themes) into `www/offline.html`; `hairline` stays in the brand file for the guard and is deliberately not injected,
because nothing on that page consumes it — that is how `--brand-2` came to sit unread in the same file for a release.
`apps/mobile/offline.html` now declares **no colour at all** (0 hex literals), which ends a drift that had already
happened under hand-mirroring: its muted was `#525252` against the app's `--text-secondary:#5C5C5C`, dark
`#A3A3A3` against `#B8B8B8`. A `unit` group holds the app stylesheet to the same four numbers in both themes
(**686 pass / 0 fail**, 10 of them new), choosing the semantic dark block by the token it must contain, since the
sheet carries two `[data-theme="dark"]` blocks and `rule()` escapes only `.` and `#` — a null-silent mistake my own
guard made once before it was right. a11y 14/0, layout 7570/0, landing 2773/0, mobile config 4/0. Measured on the
generated boot page: light `rgb(255,255,255)`/`rgb(10,10,10)`, dark `rgb(10,10,10)`/`rgb(242,242,242)`,
`document.fonts.size === 2`. One of my probes was wrong in the other direction too and is recorded so nobody reuses
it: `download="ride-share.apk"` is absent from *any* built HTML because the anchor is created at runtime by
`landing.js`, so grepping the bundle for it proves nothing about the button.

Then the push. GitHub's GUI job went red in 21 s with **exit 126** — not a failing assertion but "cannot execute".
`apps/web` verifies as `./verify.sh`, which ends with `./tests/breaks.sh` and `./tests/layout-breaks.sh`, and all
23 `*.sh` files in this repo are committed 100644; the jobs that call `bash scripts/x.sh` never notice. So the
app's whole browser suite, including both break-detection passes, has never run in CI. Fixed by
`git update-index --chmod=+x` across the set (verified 100755 × 23). The other red job is unchanged and still open:
`apps/api` 237 pass / **9 fail** in `journeys.service.test.js` — which the ordering in `pnpm -r` has been hiding
behind, job by job, ever since.

## 2026-09-06 — renewal round 9b (owner decisions): the palette gains one source, and the Arabic face is settled

Two answers came back the same day the round landed on `main` (`6f4b9a6`), and one of them removed a duplication
that had already drifted. `packages/brand/brand.json` now carries `palette.{light,dark}{paper,ink,muted,hairline}`;
`apps/mobile/scripts/build.js` injects the three values the boot page actually reads — plus `--brand/--on` — into
`www/offline.html` for both themes, and `apps/mobile/offline.html` no longer declares a single colour itself
(**0** hex literals left, verified by rendering the generated file: light `rgb(255,255,255)`/`rgb(10,10,10)`,
dark `rgb(10,10,10)`/`rgb(242,242,242)`). `hairline` is in the brand file for the app to be measured against but is
deliberately not injected, because nothing on the boot page consumes it — that is how `--brand-2` came to sit
unread in this same file for a release. The drift this ended was real: the boot page's muted was `#525252` where
`apps/web` says `--text-secondary:#5C5C5C` (dark `#A3A3A3` against `#B8B8B8`), a grey step out of step in the one
surface no browser test reaches, since it ships inside the APK. A new `unit` group holds the stylesheet itself to
the brand values in both themes, so neither side can move alone (G-099 closed, G-094's residual closed with it).
The second answer settled the last open type question: Arabic display titles stay **Jomhuria** — measured, the head
grows 87→94 px on a phone against Cairo 900, which is the honest cost of a face with real display proportions.
Architecture unchanged: only `apps/mobile/scripts/build.js`, `apps/mobile/offline.html`, `packages/brand/brand.json`
and a test moved, so nothing new is baked that the generator does not own, and the web GUI still arrives over the
air with `versionCode 3` untouched.

## 2026-09-06 — renewal round 9 (app, in the repo): the head is page content, and the boot page joined the system

Skin v2 left the demo and went into `apps/web/src`. `.topbar` became a two-row head grid rendered as the
**first block of `.main__inner`** (controls above, `--f-poster` title below, `--fw-heavy`, uppercase), so the page
opens with its title as the owner asked; `--topbar-h` is deleted with **0** references left. Because the head now
lives in the scroller it is `position:sticky;top:0` on `var(--glass)` + blur, with a negative inline margin that
lets the glass span the gutter — the first time a frosted bar in the app can honestly claim content passes under
it, and it keeps the back/account controls reachable, which is the property the retired chrome guard existed for.
One rhythm: `padding-inline:var(--gutter)`, `gap:var(--flow)`, `.main__inner > * { margin-block:0 }`, reproducing
the demo's 298/298/298 px edges and 22 px gaps (from a 175 px mismatch). `.splash__name`, `.sheet`, `.metric`,
`.authmain`/`.authfoot` and `.authmain .t-head` came onto the same tokens, and the three promoted literals
(`--track-poster`, `--lh-poster`, `--measure-poster`) replaced the 3 components that restated the tracking by hand,
leaving `letter-spacing:-.04em` at **0** uses outside the token.
The download page's button **existed in the markup and painted nothing** — and that, not a missing feature, is why
the owner asked for one. `src/lib/components.js:170` listed `"a"` in `SVG_TAGS`, and `$()` chooses the element's
namespace from that set, so `$("a", …)` built an **SVG** anchor: right class, right `href`, right `download`
attribute, `textContent` "Download Android APK", and a **0×0 box** inside HTML. Removing `"a"` from the set (an
anchor is never drawing; a real SVG anchor must be made with `createElementNS` inside its `<svg>`, and no call site
needs one — `grep '$("a"' src/` found exactly one) gives `238×44` and a button that works. The card's hand-rolled
`<a>` is now the shared builder's output (`mkActions` grew an `href`/`download` branch), so the button and the QR
come from one `apkDownloadUrl()` — same label key `j_dlAndroid` in EN and AR, same `?v=` stamp, same attribute. An
attempt to also place the action in the hero was measured and rejected: at 390 the hero's foot is a two-column text
grid (this page's calls to action live in the bar), so the row collapsed to `350×0` — an invisible control, worse
than none; the hero's lede went too, because `j_dlSub` is the card's body text one screen below and the page said
it twice. **7 new assertions** in `landing.test.js` cover the class of bug: namespace, a box ≥24px, the file name
and version stamp, a label, the QR beside it, and no `.btn/.card/.row` built in the SVG namespace.

# CHANGELOG
## 2026-09-06 — renewal round 8 (app, demo): the top bar is gone and the page opens with its title

The owner reviewed the phase-2 demo and gave two notes, both of which turned out to be measurable
rather than matters of taste. *No top bar — the page starts with a big rush title*; *spacing must be
consistent, and the app must be centralised and built from the same components as the landing*.
`ink-skin.css` v2: `.topbar` loses its border, fill, `min-height` and `nowrap/ellipsis` and becomes a
two-row grid inside the reading column — controls above, `--f-poster` 71.68 px title underneath at
`--fw-heavy` uppercase with `-.04em` tracking, Arabic taking Jomhuria with `--lead-display-rtl` (and a
`ar title` button to compare it against Cairo 900, because that is a decision to be made from two
renderings). Measured across all 172 surfaces: the head/band/card inline edges now agree at 298 px (they
were 123 vs 298 — 175 px of mismatch, and the real source of the "cramped" reading), every gap between
blocks reports the single token `--flow` (22 px), and the head itself went 219 → 123 px once the h1's
user-agent `0.67em` top margin — 48 px at poster size, invisible inside the old flex bar, honoured by a
grid — was reset. The 12 remaining 44 px gaps sit beside zero-height placeholders waiting for data
(`{c:"DIV", h:0}`), so they are the empty-offline artifact, not a spacing rule: the same argument for the
fetch harness (D-1.1) that the wallet screenshot makes on its own.

**A discovery that changes how every app number must be read:** the app already carries a density scale
(DEC-200, `--density` at ≥840 px) which rescales the shared steps themselves — `--s6` 24→22, `--s5`
20→18, `--s8` 40→36, `--content-max` 840→756, `--rail-collapsed` 80→72. The skin therefore adds no
numbers: the rhythm is inherited. Three literals were carried from the landing's own convention
(`-.04em`, `.94`, `18ch`) and D-1.11 promotes them to tokens so the habit stops spreading. **G-096**
records the bar-as-chrome defect with its measurements; **G-097** records the centralisation instruction
as a code task — 22 `mk*` builders serving only the landing while the app has 17 `Section()` calls
against 20 hand-rolled heads — and notes that shared components inherit the density scale for free,
which is the payoff. `apps/web/src/` remains untouched: D-1.9/D-1.10 are the repo-side shape, after the
owner signs the look off.
## 2026-09-06 — phase 2 opened: the app GUI studied, measured, planned (no code)

Per the owner's instruction, this session prepared only: the current app GUI was inventoried, its
rules re-read, and its health measured rather than assumed. Plan of record:
[planning/APP_GUI.md](../planning/APP_GUI.md).

**The app is sound; the gap is design language, not defects.** A new instrument
(`.vtest/appscan.js`, scratch, outside the repo) renders every surface of the *built* file —
43 `PAGES` entries across 6 roles × en/ar × light/dark = **172 screens** — and walks visible text
nodes and focusable controls: **0** render throws, **0** raw copy keys, **0** `undefined`/`NaN`/
`[object`, **0** unnamed controls, **0** "coming soon" dead ends, **0** horizontal overflow, **0**
scrollers that miss their own height. The first run reported 4 unnamed controls; all four were
`<input type="hidden">`, so the probe was wrong and was fixed — the app was not.

**Six findings opened (G-087…G-092).** Two map primitives where `map.js` forbids a second one
(`RouteMap` 9 calls vs `MapView` 4, staff only) · two orphan screens no nav reaches
(`comingSoonRider`, `opsStops`) with their copy keys · a `SHEETS` comment claiming the safety
sheets are "honest placeholders" next to a real `sendSos()` · 643 `t()` sites with **no**
completeness guard and 20 runtime-built keys the landing's guard cannot see (the guard is
therefore specified as a render-and-scan, not a literal scan) · the display face used in
**1** selector of 1,608 and only on the landing · and no app demo in the workspace at all, so
"strictly look-alike" needs a reference decision (Q-1). A stale markdown structure defect in
`AUDIT_AND_TODO.md` was repaired on the way: G-082 and G-083 shared one line.


**The phase-2 demo exists, and it is a skin rather than a rewrite.** `~/preview/app-ink/app-ink.html` is the real built app (1,137,073 B from 1,130,591 B, 3 `@font-face` blocks preserved) with one stylesheet spliced in before `</head>` plus an `ink skin: on/off` switch: chrome as glass, one display voice, paper not plastic. Re-running the 172-render scan against the demo keeps every counter at 0 (throws, raw keys, unnamed controls, dead ends, overflow), so the presentation-only claim is measured. Two defects were caught by measurement and fixed: the Latin bar title clipped at `line-height:.9` and the Arabic display title overflowed the 60 px bar at 1.45x (44 / 1.18 = 37.3 px cap → 1.25x). One is open on purpose: the glass cannot be shown passing over content while `file://` leaves the API unreachable — `rider.profile` measured `scrollable: 0` — so D-1.1 (a fetch stub shaped from the API's own fixtures) comes before any taste discussion. **G-093** opened: 17 `Section()` calls vs 20 hand-rolled heads, which is why the skin's head rule missed one screen.
Plan and per-item checks: [planning/APP_GUI_CHECKLIST.md](../planning/APP_GUI_CHECKLIST.md).

**Consolidated after the owner's correction, and the map is now written down.** They were right that what opened was the landing — `boot()` resolves a session and calls `guestHome()` without one, so the app surface only exists signed-in; the demo now boots straight into it (measured `{view:"app",role:"rider",authed:true,landing:false}`) with role/skin/lang/theme buttons. The service map came from the files, not memory: `apps/mobile/scripts/build.js` assembles the APK's `www/` from the ONE web build ("Never fork screens"), the Railway `mobile` service is an app **API** (`/` is JSON 403, `/v1/*` proxied, plus OTA `/v1/mobile/update|bundle`), and `packages/platform` re-sets the status bar per theme — so `apps/web/src/**` is the app GUI, and two surfaces beside it are still pre-renewal: `apps/mobile/offline.html` (12 hard-coded hexes, a violet `#6C63FF→#5A4FD9` gradient action — measured on the rendered button) and `capacitor.config.json`'s `SplashScreen.backgroundColor:#6C63FF` against the web splash's `var(--paper)`. G-094 and G-095 opened; `MOBILE_PUBLIC_ORIGIN`'s Actions value stays unverified without the token.
**Nothing was pushed as work-in-progress.** Local `main` is one docs-only commit ahead of the live
tree; the PAT file was shredded last session and `/tmp` was rehydrated, so the push waits for a
re-supplied token. The live URL already equals `6dc6ac4`, so no user-visible state changed.

## 2026-09-04 — renewal round 7: the owner's map back, documents as pages, and a wipe that keeps its frames

Five items from the owner, one of them a reversal of the previous round. Plan and per-item
evidence: [planning/LANDING_CHECKLIST.md](../planning/LANDING_CHECKLIST.md), round 7.

**The widened corridor was wrong, and it is written down as a decision.** Round 6 refitted the
journey's road to span the text it carries; the owner preferred the older single-scale map, which
reads as a road rather than a spread. `motion.js` is back to `27328c9`'s geometry with only the
sleeping-loop fix kept, and the routecheck instrument returns the pre-round-6 numbers exactly
(`routeY=[228,3420]`, 3 611 px of path at 1280/en), with the map still uncropped and un-letterboxed
at every width in both languages. The two guards that demanded the wider corridor are deleted with
a comment naming the reason, and **G-085** exists so this is not "fixed" a third time.

**Terms, Privacy and Safety are pages of the site now** — the shared bar, the shared one-screen
floor (head 900 of 900 at 1280×900 Arabic; 844 of 844 at 390 English), the clauses and their rail,
and the site's footer, which is where links to the other documents live. The `doc` flag, its class
and its stylesheet rule are gone, and a guard asserts the opt-out does not exist anywhere.

**Nothing on the landing admits that anything is unfinished.** `policyTemplateNote` is deleted in
both locales and the same sentence's second home — a note on the about page — now reads
`aboutOpsNote`, a sentence about how fares and timetables are published. Each document opens with a
line about its own scope instead. A guard rejects the whole family of admissions in the rendered
text of every page in both languages. Removing the key exposed a worse fault (**G-086**): `t()`
falls back to printing the raw key, so the page would have shown the word `policyTemplateNote` to
a customer and no test would have known — 75 keys in the landing builders are now checked against
both locales.

**The transition's lag had a mechanism, and it was not the one I first fixed.** The audit's first
attempt (re-time the release after the swap) measured as *nothing*, so it was replaced by an
instrument that could see the wipe: the phases advanced on the wall clock, and a blocked main thread
spent the animation while no frame was delivered — **18 of the curtain's 59 frames lost to a 350 ms
stall**, which is exactly "laggy… but very perfect as transition". The clock is now virtual (at most
40 ms per callback), and the opposite failure — a tab that receives no frames at all — is caught by a
700 ms stall guard rather than the fixed deadline that used to sit there, so a slow machine gets a
longer curtain and a hidden one never gets a stuck one. Measured with real clicks: 58 of 59 frames
kept under a stall (was 41) for 284 ms of extra hold, and with no stall nothing changes (59 frames,
966 ms vs 967) — smoother, nothing lost. No splash was needed.

**The device gap was in the fallback, not the detection.** Arabic follows `navigator.language` and
the theme follows `prefers-color-scheme`, with an explicit choice stored and winning; what was wrong
is that where the OS signals nothing the surface guessed from the clock, so 03:00 opened dark. Light
is now the default, always, guarded four ways.

**The dead list is cleared, with a backup first, as the owner asked.** `archive/landing-dead-code-before-removal-2026-09-04-8ce3b0a.zip`
holds `apps/web` and `packages/brand` at the last commit that carried them; the next commit removes
`landingHeroSub` and `driveReqB` (both locales, rendered by nothing), `mkStep`'s optional-body branch,
and the unused `Katibeh` face with its file and licence text. The manifest, the files on disk and the
stylesheet are now required to agree — the guard that used to cover this passed *vacuously* once the
face was gone, which is itself a lesson about guards written as `!includes(...)`. **G-082 closed.**

Gate: unit **671/0**, a11y **14/0**, layout **8185/0**, landing **2766/0** after two test
fixes the round itself required (both curtain tests now wait until the splash's handoff wipe is
over — a page is not at rest merely because `.landing` exists — and one block that set
`S.landingPage` now restores it), and `verify-repo.sh` 151 files and 0 hits.

## 2026-09-04 — renewal round 6: Arabic gets room to breathe, and three pages stop being special cases

The owner's list, in the order given: the Arabic type needed vertical space and its dots had to
appear — especially in the intros; the rider intro had to teach the service from zero without
saying it twice; the route under the intro had to be long enough to carry all of its text and stay
in sight; terms/privacy/safety needed auditing and a redesign onto the shared surface; the driver
page needed the rider's intro; `What you need` needed a design of its own; and the whole page
needed a fast audit. Plan and per-item evidence:
[planning/LANDING_CHECKLIST.md](../planning/LANDING_CHECKLIST.md), round 6.

**Spacing was measured off the screen, not off the metrics table.** The poster stack sets
`line-height:.82` and puts each line in an `overflow:hidden` mask, which is right for Latin caps
and wrong for Arabic: Jomhuria's font box is 1.118 em, so at 140 px the three lines of the rider
masthead sat 10 px apart, and the driver page — which had been given a whole *sentence* in the
poster slot — fused two wrapped lines into a single 218 px ink run. Leading became one token
(`--lead-display-rtl:1.18`) read by the *same rule that hands these roles their face*, so a
heading cannot pick up Jomhuria and keep the Latin rhythm. Result, same instrument: rider gaps
55 and 53 px, driver three clean lines, and Latin's 16/14 and 15/17 px unchanged. A mask-padding
rule added along the way was deleted: opening every mask and diffing the pixels showed 0 px of
lost ink in both languages, so it guarded nothing. Body copy was measured too and left alone —
Arabic already clears 7 px between lines where Latin clears 5-9.

**The route was fitted with one scale to a box four screens tall.** `motion.js` scaled the whole
corridor by `H / routeHeight`, so at 1440 the road occupied 26 % of the width — a ribbon down the
middle, ending 114 px before the last paragraph. It now fits the two axes separately, taking its
vertical span from the cuts themselves; `routeY == cutsY` at every width tested (asserted within
4 px) and the corridor uses 84-86 % of the section. Because the path is written into page
coordinates, strokes and dot radii never bend.

**The three documents are pages again.** They open with the shared `mkIntro` — kick, poster line,
lede, the template note, and `Back to home` in the actions row — with the clause list and its
sticky rail in a section under it, and one deliberate, guarded exception: `doc: true` drops the
one-screen floor (a document is opened to be read), which cut 900 px of blank to 522. The `:has()`
measure workaround from last round was deleted together with the nesting that needed it.

**Audit numbers:** `load` 71 ms, 0 subresources, 0 long tasks, frames p50 16.8 ms while dragging
the whole page. Two real faults: the journey's animation loop re-armed unconditionally and painted
60 times a second while nothing moved (worst frame 57.8 → 33.8 ms, now it sleeps and wakes on any
trigger), and the knockout poster line depended on `-webkit-text-stroke` with no fallback — where
that property is absent the line is invisible — now guarded by `@supports`. Gate: unit **663/0**
(647 → +16 guards), a11y, layout, landing and `verify-repo.sh` below; `landingHeroSub`, `driveReqB`
and `mkStep`'s now-unreachable no-body branch are reported as **G-082**, not deleted. A third fault came out of the full landing run rather than out of a probe: the theme
curtain is driven by `requestAnimationFrame`, and the deadline guarded only the swap, so a tab that
stops receiving frames kept a fully painted page hidden underneath — both paths now share one
idempotent `settle()` armed from the phase timings, and the suite proves it by stubbing `rAF` to a
no-op (G-084).

## 2026-09-03 — renewal round 5: Arabic gets a real face, and the last six owner items close

R4 (`dbf28ef`) was pushed first and verified live; this round is the type work the owner opened
(Jomhuria and Katibeh offered as options) plus everything still owed from the sixteen. Plan of
record: [planning/LANDING_CHECKLIST.md](../planning/LANDING_CHECKLIST.md).

**The type was never asked for (G-081).** `brand.json` names the font chain, `body` in
`shell.html` carried a *second literal copy* of the same eight names, and `.landing` had no
`font-family` at all — the poster had been rendering in whatever the user agent called its default
face, with different metrics per device, and any font change could only be half-applied. Both now
read `var(--brand-font)`. Measured proof that the change is surgical: the Latin advance width is
identical with and without the new faces (498.07 px on the probe string), while Arabic moves to
Cairo (350.78 px against 362.56 without it).

**Arabic is self-hosted, inlined, and routed by range.** `assets/fonts/fonts.json` owns the faces;
`build.js` verifies each one (exists, is woff2, matches its recorded sha256, fits its budget and
the bundle's, keeps its OFL licence beside it, stays inside the declared Arabic ranges) and inlines
it as a data URI, because one file cannot fetch a font. Cairo variable, 200–1000 on `wght`, subset
to 29,816 B: every weight in the system becomes a real outline instead of an emboldened 400 —
which is what "the Arabic is never bold" actually was. Jomhuria (36,532 B) carries the poster's
display roles in RTL only, at `size-adjust:124%`: measured at 96 px its ink box is 0.64 em against
the fallback's 1.05 em, so the compensation is one number in the face, not a size fudge per
component. **Katibeh is in the tree and out of the bundle** — the manifest marks one face
`display:true`, and the build holds back anything the chain does not name, so an option costs zero
bytes until it is chosen. Ink per area on the same string: fallback 2.31 %, Cairo 900 3.47 %,
Jomhuria 1.09 %, Katibeh 1.10 %. Bundle 962.8 KB → 1,060.5 KB, budget 200 KB declared and enforced.

**The build now refuses an unparsable bundle.** A stray parenthesis in a builder reached
`dist-preview.html` and surfaced as a jsdom `SyntaxError` buried in a 640-assertion suite; the
bundle is a classic script with no top-level await, so `new Function(js)` is a complete check and
runs before anything is written.

**O-2, the dwell.** The splash held on a bare 1500 ms timer. It holds on a 1000 ms floor, never
releases before `load` *and* `document.fonts.ready` (type arriving after the curtain is what makes
a fast boot look slow — the reader watches a reflow instead of reading), and a 6 s watchdog caps
the wait so a request that never answers cannot hold the door. Chrome measures the whole dwell from
navigation start.

**O-10, the ways out.** One key per destination: `landingBack` is "Back to home" (and the document
page now actually goes there, clearing `landingDoc` and landing on the rider home), `authBack` is
"Back to sign in", `backToList` is "Back to the list" for the three ops detail screens that had
been borrowing the landing's label, and `back` for one step inside the auth flow. `backBtn` moved
from `screens/auth.js` to `lib/components.js` — three modules used it, one owned it — and lost a
`|| t("changeEmail")` default: two call sites passed no label at all, and the guard that walks the
parentheses (a regex stops at the first `)` of the arrow function) is what caught them.

**O-11, the policies.** Terms, privacy and safety now open with the site's own bar instead of a
bespoke header — and `landingGo` clears `landingDoc`, because a nav name means "read that page",
which includes putting the document down. Above 900 the page is two columns with a sticky contents
rail; below it one centred column with the rail as a list over the text, never hidden. The rail
marks the clause you are in, observed by an IntersectionObserver mounted by `mountLanding`: wiring
it in the builder meant `rail.closest(".landing")` was null and the rail silently never marked
anything. The wide layout's `padding:0` on the rail links also took the tap box to 16 px, which
the existing battery caught at once.

**O-12, one intro on every surface.** `mkIntro` is the only builder of `.landing__hero`, and rider,
drive, about, help and download all open with it; the bar's clearance became `--bar-clearance`,
shared by the hero's padding and the sticky rail. **O-14:** the driver requirements are the page's
own numbered rows, which needed `mkStep` to stop manufacturing a paragraph the copy does not have.

Suites on this tree: **unit 643 · a11y 14 · layout 8,185 · landing 2,7xx (see below) — 0 failed**,
`scripts/verify-repo.sh` green, `dist-preview.html` byte-identical to a fresh build.

> **Round 5 finished, 2026-09-03 (same day).** Four guard corrections and one visual defect
> closed after the first full run: the type assertions now measure what they claim (a subset can
> never match a full stack to a pixel, so Arabic is tested as *strictly closer to `"Cairo"`* and
> the face is awaited with `document.fonts.check` rather than trusted from a `status` string); the
> contents rail marks the clause whose head passed the line under the bar, or the last clause at
> the end of the scroll, instead of whichever intersection event arrived last; `build.js` refuses
> to write an unparsable bundle; and the policy page's two columns were occupying 467 px of a
> 1178 px measure because the wrapper's `60ch` cap sized the `fr` track — the cap now lifts at the
> wide breakpoint, giving `256 + 868` px tracks and a 70ch measure. Landing suite 2590 → 2736
> assertions, all green: unit 643, a11y 14, layout 8185, landing 2736, `verify-repo.sh` ✓, build
> 1062.3 KB. Still open: **O-5** (production audit), **L2** (CI green + `verify-gui` cache path),
> **L1** (both break harnesses re-anchored).

## 2026-09-02 — renewal round 4 (R4): the owner's six, in one pass

Plan and evidence: [planning/LANDING_CHECKLIST.md](../planning/LANDING_CHECKLIST.md) (the live
checklist — every item below was closed by the check written next to it, not by eye).

**1 · "Get the app" is a dot, not a pill (R4-1).** The outlined box this round had given the marked
bar item is gone: `opacity:1`, the semibold weight, and a 6 px `::before` dot that scales to 1.35 on
hover — emphasis from ink and a mark, not from a container. Reverses the compact-pill decision
recorded earlier in this round, as the owner asked. Guard: the rule for `[data-cta]` must contain
`::before{content:"";width:6px` and must not contain a `border:` declaration.

**2 · The curtain now belongs to the two switches as well (R4-2).** `PageFx.routeKey` gained
`S.lang` and `S.theme`, so a language flip and a dark↔light flip draw the same wipe the pages get —
no new call sites, because both switches already end in `render()`, and `render()` asks `armed()`
first. Measured in Chrome: a real first click on either switch puts `.pagefx` over the landing with
**0 px of overhang** at 1280×900 (6/6 cold loads), and the node is gone 2.2 s later with the page
intact. `armed()` still demands a *trusted* pointer within 500 ms — a scripted `el.click()`
deliberately gets no curtain, so automation and deep links never wait 700 ms for a wipe no human
asked for; that asymmetry is now asserted, not discovered.

**3 · The masthead says each thing once (R4-3).** `landingHero` names the category ("smart transport
that keeps to a timetable: shared rides along published routes, one fare for the whole distance, a
seat held in your name before you leave home"); `landingHeroB` pays for it with the mechanic (cash to
the driver on boarding, the price printed on the route card rather than on a meter, traffic/rain/hour
changing nothing). Arabic carries the same two jobs. No fact was dropped and no claim is repeated —
enforced per *claim*, not per paragraph, since two different claims may legitimately sit side by side.

**4 · A map word always sets one word to a line (R4-4).** `mkJourney` now splits the cut title into
`<span class="journey__wordline">` children with `display:block`, so "ONE FIXED PRICE" is three lines
and "Verified drivers" is two, in either language, with the type still sized to the section. The
spaces are appended *inside* each span: a text node split into elements loses the whitespace between
them, which had the guard reading "Verifieddrivers" for a minute. Measured by line box: each word's
lines stack strictly, never share a band.

**5 · "Want to drive with us?" is a section (R4-5).** It was a plain block under the map; it is now
the page's own inverted slab (`mkSlab(..., { mid: true })`) with a kick, the poster title, the lede and
the button — centred, and **`rgb(10,10,10)` in light mode / `rgb(255,255,255)` in dark**, measured from
the renderer. Because the slab inverts, its primary button inverts with it (paper face, ink label) so
the one control that matters can never be black-on-black; the suite asserts the label sits at ≥ 4.5:1
on its own face in both themes.

**6 · No block is separated by a hairline any more (R4-6).** Nine rules went, all of them at the
component rather than at the instance: `.landing__section`, `.landing__hero`, the display kick,
`.landing__hero-foot`, `.journey`, `.journey__cut` (<900), `.landing__feature`, `.landing__cta-row`,
`.landing__foot` — with the rhythm the line was doing kept by the shared scale (section padding
`clamp(4.5rem, 13vh, 9.5rem)`, features `--s5`, footer `--s6`). The line the owner pointed at, under
"One price. A seat. No queue.", was a symptom; the fix is that no landing block may carry one. Kept on
purpose, because they are not section separators: the FAQ's row rules (a list), and the glass edges
under the bar and its panel.

**One test was wrong, and said so.** `the route is drawn, not declared` measured the *inked* progress
(`.journey__done`) at `scrollTop: 0`, where a reader has not reached the road yet — so it passed only
where the map happened to be on screen at load and went red at every phone width once the map grew
taller. The unscrolled case now asserts the geometry exists (`.journey__line`), and the inked length
moved to the scrolled battery where a zero really does mean the bus never moved. Strictly more
coverage than before.

Suites on this tree: **unit 614 · landing 2,590 · a11y 14 · layout 8,185 — 0 failed**, build
`dist-preview.html` 962.8 KB (19 modules), `scripts/verify-repo.sh` ✓. Still open from the sixteen:
the intro's dwell (O-2), the production audit (O-5), "Back to home" (O-10), the policy pages (O-11),
the one-screen rule on every surface (O-12), "What you need" (O-14), Cairo (O-15b).


## 2026-09-02 — renewal round 3 (M3a): the bar is a grid, the sheet is glass, the poster has no buttons

Plan of record: [planning/LANDING_REWORK.md](../planning/LANDING_REWORK.md). Items 4, 6, 9, 13 and
16 of the owner's sixteen, plus one defect found on the way. **All five were measured on the deployed
page before being touched**, which is what made 16 cheap: four of them were one or two lines of CSS.

**The Arabic bar (16).** The centring was `position:absolute; inset-inline-start:50%;
transform:translateX(-50%)` — a logical anchor married to a physical transform. Measured in Chrome:
0 px off in LTR, **exactly one element width off in RTL** (−200 px of a 200 px box), which is how the
page names came to lie 115 px on top of the auth group at 1280 px. Replaced by a real three-region
grid (`minmax(0,1fr) auto minmax(0,1fr)`, links `justify-self:center`): equal outer tracks centre the
names on the poster's axis in either direction, and a grid cannot overlap its own tracks. Now
**0 px overlap and 0 px off-axis** at 1280 in both languages.

**The same bug, twice more (found, not reported by the owner).** `.sheet` and `.toast` used the
identical pairing, so every desktop sheet and toast in the app is shifted a full width left in
Arabic. Both now centre with `inset-inline:0; margin-inline:auto` — and the `pop` keyframe no longer
needs `translateX(-50%)` inside it, which was silently re-imposing the same offset for 200 ms.

**320 px (16, second half).** With the bar a grid, the tightest width still wanted 315 px of the 288
the padding leaves — mark, two switches, Sign up, menu — so it painted its own ends over each other
in *both* directions (15 px EN, 13 px AR). Below 380 the filled auth button now leaves the row, as
the bare one already did below 700: the panel's first rows are those two actions, so nothing is lost,
only unduplicated in a row that cannot hold it.

**The sheet (4)** is `var(--glass)`, the bar's own 62 % wash, instead of `--glass-solid` — it already
had the bar's `backdrop-filter`, at an alpha that made the blur invisible, which is why it read as
"the effect is missing". **The masthead (6)** loses its Create account / Sign in / Get the app row:
the bar owns those, and its foot is now two texts on one baseline (30 rem lede, 26 rem paragraph at
≥900). **The two lines (9, 13)** were one rule — the hairline above `.landing__steps` — and it is
gone with its padding weld: the slab's own surface change was already saying "edge".

**"Get the app" (7)** is an outlined pill with a filled dot, `data-cta="app"` written in the markup so
the CSS owns the look, scoped to `.landing__links` so the panel's row for the same destination stays
plain. **The 1000 px boundary** is now `max-width:999px` against `min-width:1000px`; the two used to
both claim the boundary.

**Verified**: unit 600 / 0 · landing **2,570 / 0** (+330 assertions: bar regions never touch, names on
the axis, the sheet is the bar's glass and carries every page name — at 26 viewports × both languages
× every marketing page) · a11y 14 / 0 · layout 8,185 / 0 · `scripts/verify-repo.sh` green.

**The harness lesson**, because it cost a full debugging cycle: the first version of the sheet probe
clicked the menu *before* the survey's return literal, and `render()` detached every node that literal
still held — rects 0, `backdrop-filter: none`, 12 blocks "still transparent". 130 failures, a product
that measured clean by hand, and a 20-line replay of the exact scroll sequence to prove which one was
lying. The survey now freezes into `base`, and the probe is the last thing the page does.

## 2026-09-02 — renewal round 3 (M1): the map was letterboxed, and the poster words came back

Plan of record: [planning/LANDING_REWORK.md](../planning/LANDING_REWORK.md) — the owner's sixteen
items, each one written up with the measurement that explains it, on the **deployed** page rather
than the local tree. This is phase M1 (the map); M2–M4 follow, one per session.

**The defect.** `.journey__svg` was `position:static` with a height of its own
(`clamp(220px,58vh,…)`), while `lib/motion.js` measures the **section** and paints a `viewBox` of
that size. So a 1440×1031 drawing went into a 1440×**522** box: `preserveAspectRatio` scaled the
whole corridor to half and clipped its lower half, and the section read as an empty pale field with
small grey text in it. Nothing in the JS was wrong, which is why no suite caught it — the drawing
was there, just crushed. Measured on the live page: section 1031 px, svg 522 px.

**Fixed** (`styles/shell.html`): the map is `position:absolute;inset:0;width:100%;height:100%` over
its section again, and the comment now says the two files are one mechanism. The claims are drawn
**on** the road as in the demo — `.journey__word` at `clamp(1.8rem,6.5vw,5rem)` with the variable
weight and the `--near` opacity (was: the caption step, 16 px), the seven cuts alternate at 52 % of
the measure via `data-side` written from the cut's index in `lib/landing-parts.js` (not a media
query, so the order a reader gets is the order the bus rides), and below 900 px the copy is one
column with the corridor left clear at the far edge. The two-column "key" from round 2 is gone.

**Reversal, recorded**: `onMap === 0` — "no line of type ever shares a box with the road" — was the
guard defending the band. It asserted the old decision, so it was re-derived to the new contract
rather than deleted: `landing.test.js` now asserts `map box == section box` (the measurement that
would have caught this), every claim inside the map, the poster scale, and a width-aware
half-measure/clear-corridor rule; `unit.test.js` gained the overlay, `data-side`, the clamp and the
Arabic override; both break cases now mutate the overlay **into** a band, which is the regression
that matters. The `layout-breaks.sh` anchor was re-derived in the same pass, and a check with a
stale anchor silently passes — which is how this went unnoticed for a round.

**Verified on this tree**: unit 594 / 0 (591 − 1 + 4) · landing **2,240 / 0** (was 2,172: the
new map contract adds 68 assertions and they hold at all 26 viewports in both languages) · a11y
14 / 0 · layout 8,185 / 0 · `scripts/verify-repo.sh` green. Chrome measurements behind the numbers
are in [planning/LANDING_REWORK.md](../planning/LANDING_REWORK.md).

**What the harness taught back**: the first run of the new assertion failed 17 times, and both
causes were in the test — `widestCut` is returned as a percent but compared against `0.56`, and the
RTL far-edge distance was computed with a flipped sign. Neither was a product defect, but the second
one was a bad measurement of a real rule: the corridor clearance belongs to the *type*, not to the
article box, which is allowed to reach the gutter because its `padding-inline-end` is what keeps the
road visible behind the words.

## 2026-09-01 — renewal round 2: the owner's twelve edits, the page curtain, and the brand chain

Plan of record: [planning/GUI_RENEWAL.md](../planning/GUI_RENEWAL.md) §9 (the twelve,
item by item) and [design/README.md](../design/README.md) (the curtain, the name).

**Added**: `apps/web/src/lib/pagefx.js` — the vertical SVG-path page transition, armed by
`render()` on a route key, painted under full cover, gesture-gated, with a deadline for its
own swap and a plain swap under reduced motion. `measureViewport()` in `shell/app.js`
publishes `--view-h`; `--fx-rise/fill/release/fall`, `--z-pagefx`, `--f-intro`,
`--f-introgap` are the sheet's side of it. `packages/brand/brand.json` gained `download`
(`path`, `apk`). Thirteen new cases went into `tests/breaks.sh` and the map case in
`tests/layout-breaks.sh` was re-derived to the rule that now owns it; the fold below took the
branch's two further cases, so the harness stands at 113.

**Changed**: the bar's page names are centred in the bar at ≥1000 px and the auth pair is
pushed off the language/theme group by `--s3` (both measured per viewport now); the masthead
is a measured one-screen floor with one more paragraph of explanation; the seven rider claims
moved *under* the drawing as a compact two-column key at every width, deleting the
phone-only band exception and the `data-side` alternation; the driver board is four decisions
(`driverF5*`/`driverF6*` and their copy are deleted in both languages); the rider page asks
the reader to drive (`driveInvite*`, `go:"drive"`); the store cards sit side by side at
≥700 px; the footer is now `© <brand> · All rights reserved.` — generic, no year, and the
slogan is said once per page; the APK link and the downloaded file name both read
`brand.json`, and the hardcoded deployment origin is gone from `screens/landing.js`.
`build.js` now validates `brand.json` (plain text where it reaches markup, `#rrggbb` where it
reaches a colour, path data where it reaches an inline `<svg>`, a rooted path and an `.apk`
name where the install card links), and `apps/web/server.js` names the artifact from the same
field, so the page and the download cannot disagree.

**Fixed, found on the way** — two holes that were live in `HEAD`, both invisible to the
browser suites because the bundles they read are committed artifacts: `brand.json` had no
`browserThemeColor.light` while `build.js` substituted it (a fresh build wrote
`content="undefined"` into the served head), and it had no `logo.color` while the favicon
template interpolated `BRAND.logo.color.{light,dark}` (the mark arrived with
`fill='undefined'`). Both values are now present and refused at build time if removed again.
**Reconciled**: the tree also carried `--f-input: 14px`, below the 16 px iOS force-zoom floor
its own comment states; the guard *"--f-input is 16px"* was red and the token is restored.

**Decisions recorded this session**: transactional email moves onto the ink ramp (owner's
choice — queued as the next phase, with the CI job `Verify GUI (full browser suite)` to be
diagnosed first-or-alongside); nothing on the dead-code list is removed yet — it was recounted
after the owner's own edits (§8.1: every item still present, `.gitkeep` now 32 rather than 18,
and `mkJourney`'s `c.n` corrected to *live*, since the rule label reads it).

**Verified on the merged tree**: unit 591 / 0 · a11y 14 / 0 · landing 2,172 / 0 (26 viewports ×
the masthead's measured height and no-crop rule, the centred bar, the auth-group spacing, the
rights line, the one-slogan rule, the two-up store row, the intro and splash held to exactly
one screen, plus the policy documents through the deep battery) · layout 8,185 / 0 ·
`scripts/verify-repo.sh` green · bundle rebuilt from the folded source (1,011,499 bytes, 19 modules). The transition was verified
frame-by-frame in Chrome (rise → full cover with the new page painted under it → fall →
element removed; `z-index:95`, `pointer-events:none`, state never gated). **Owed**: the full
`breaks.sh` (113) and `layout-breaks.sh` (11) runs for the merged tree — the batch was interrupted
after 12 cases (11 caught, 0 missed, 0 caught for the wrong reason) and is scheduled as its own
phase; the fold itself was verified with unit, a11y, landing and layout all green.

**The fold.** `origin/main` had moved during this round (`c16e30d`, the renewal plus part of this
round, pushed from outside this session) and neither side descended from the other, so nothing was
forced. Their tree became the base and everything of mine that was not unique content was dropped
in favour of theirs: the `pagefx.js` hardenings (the watcher ignores `click` because jsdom marks a
synthesised `element.click()` trusted; a `getClientRects()` guard so a layout-less document never
waits on a deferred paint), `--fx-ink` inverting the curtain against the dark sheet, the ink-ramp
email palette (the decision this session queued, already implemented upstream), their two break
cases and five unit guards for the curtain, and a `layout-breaks.sh` scratch dir outside `$TMPDIR`
with a post-run drift check. What stayed from this side: the dead-code re-audit, this entry, and
§8.1/§12 of the plan. **The artifact is rebuilt and compared in this commit** — and `cmp` says `c16e30d`'s
`dist-preview.html` is byte-identical to a clean rebuild of `c16e30d`'s source, so their tree
was already self-consistent and the fold moves the artifact not at all. Checking that is what
killed a wrong conclusion I had written here an hour ago (that the deployed page was running
the unhardened watcher). It also corrected a number: `build.js` prints `html.length/1024`, so
954.9 KB is *characters*, and the file is 1,011,499 UTF-8 bytes because the Arabic copy is
multi-byte — a printed figure compares two builds, it does not measure one.

## 2026-09-01 — GUI renewal phase 1: the landing rebuilt as a monochrome poster

The marketing surface is rebuilt on the owner's demo's visual language, with the
product's content and the repository's rules. Plan of record:
[planning/GUI_RENEWAL.md](../planning/GUI_RENEWAL.md); the drawing's provenance:
[design/JOURNEY_GEOMETRY.md](../design/JOURNEY_GEOMETRY.md).

**Added** (`apps/web/`): `src/lib/qr.js` (ISO/IEC 18004 encoder — byte mode,
L/M/Q/H, v1–12, eight masks with the spec's penalties, no DOM, verified against
golden matrices produced by an independent reference implementation and read back
by a decoder in the test); `src/lib/landing-parts.js` (the poster's shapes);
`src/lib/motion.js` (reveal observer, variable-weight scrub, the journey — the
scroller is passed in, only compositor properties are written, every mount returns
a dispose, reduced motion gets the finished page); `src/data/journey.js`
(generated geography with its bbox and source in the file); `tests/fixtures/`
(the golden QR file).

**Rewritten**: `src/screens/landing.js` — all seven views (rider, drive, about,
help, download, shared-trip, policy documents) composed from the primitives;
the landing block of `src/styles/shell.html`, transcribed from measured demo
geometry rather than approximated; the splash and the four intro slides re-skinned
onto `--paper`/`--ink` with no new colours.

**Removed from the interface**: hero illustration and sticker usage, the sticky
dark journey stage, the colour-blocked story panels, the `herodrift` glow,
`.dlqr` as an `<img>`, the third-party QR fetch (`api.qrserver.com` is gone from
the bundle and a test asserts it stays gone), and `--sticker-accent`. The asset
packs themselves were not deleted — they are reported in
[planning/GUI_RENEWAL.md](../planning/GUI_RENEWAL.md) §8 as the owner's decision,
measured at 408,215 bytes of built output with no remaining consumer.

**The owner's review round** (nine items, all landing): the poster is centred by its
gutters (`minmax(--gutter,1fr)`, `--landing-max: 1360px`) after measuring the whole
`0→1232` pin-to-the-left at 1440; the hero's three lines are `Fixed routes / Published
times / One fare` with a full sentence as the lede, and the `h1` no longer steals that
sentence as its `aria-label`; the feature rows carry short titles with the information
in the descriptions and one type step smaller; the claims moved to the road and the
chapters to the rows, the way the demo arranges them, so nothing says itself twice —
`unit.test.js` renders every view in both languages and refuses a repeated heading,
lede, caption or paragraph; the download page lost an eyebrow that copied its own `h1`,
and `driveHeroKick`/`mkChaptersKick` were deleted as duplicate copy keys; About gained
how-a-fare-works and who-runs-it; the compact menu is three dots with no chrome, its
panel is the bar's `--glass-blur` on `--glass-solid`, it opens with `--panel-in-dur` /
`--panel-in-ease` and a row arriving `--panel-in-step` behind the last, and Sign up is
a link like the rest of the list; and section spacing is one token, `--flow`, declared
at the end of the landing sheet (measured: 8 px under a welded eyebrow, 22 px between
blocks, five views, both languages).
**Two more, found by reading the pixels rather than the DOM**: on a phone the claims
band printed its copy straight through the map — the drawing fills whatever box it is
given, so at 390 px the road crossed every line of text, and the "road hugs the right
edge" assumption in the CSS was false for this coastline. Under 900 px the map is now
its own band at the head of the section and the claims follow as numbered rows
(`.journey__svg{position:static;height:min(46vh,330px)}`, measured overlap 0 in both
languages). Removing the boards' `h2` left `.landing__h2` styled and unemitted, so the
rule and its RTL partner are gone; the two remaining dead entries this round produced
(`forRiders`, `mkJourney`'s optional cut label) are listed for the owner in §8 rather
than deleted.

**The adaptive round — the marketing surface measured, not sampled.** The landing had
seven viewports in its suite and the app had fifteen; "adaptive" cannot rest on that.
`tests/landing.test.js` now runs the whole battery at 26 viewports (320×480 to 3440×1440,
landscape and short lids included, the narrow ones doubling as the 200 % zoom case) and a
deep battery at the ten widths where a rule turns over — 699/700 where the bar folds to
dots, 899/900 where the claims stop sharing a column with the map, 1359/1360 where the
measure caps — on all five pages, in both directions. Each of those 100 combinations
measures: no horizontal overflow on the document *or* on `.landing`; nothing escaping the
window; no control clipped out of it (a `overflow:hidden` box hides that defect from every
other check, so it gets its own); copy never clipped to an ellipsis; no block wider than
the space it was given; the rhythm of the section, cta and slab containers read from their
declarations (no component carries its own bottom margin, and the space above a block is a
token or a weld the central sheet declares); every block revealed after a scroll; and every
tap target at the floor. Four defects came out of the first pass, all shipped-in:

- **The bar at 320 px pushed its own menu off the screen.** The rule that removes the
  masthead's "Log in" on phones named `.btn--ghost`, a class the markup stopped producing;
  the row kept the redundant control (the panel already offers it) and the dots — the
  phone's only way into the site — landed at x=399 of a 320 px window. The selector names
  `.btn--bare` now, and under 380 px the wordmark steps back for the mark so the row fits
  with room instead of being squeezed letter by letter.
- **`figure` carries 40 px of inline margin from the user-agent sheet**, so the install
  code on Get the app was 80 px wider than its card at every size and 7 px wider than the
  scroller at 320 px — a page that scrolls sideways on the smallest phone the product
  supports. Figures on this surface own their space (`.landing figure{margin:0}`).
- **A `1fr` track cannot be narrower than its content** (`minmax(auto,1fr)`), which is the
  difference between a fluid grid and one that overflows the moment the copy is long. The
  landing's two remaining bare tracks are `minmax(0,1fr)` now, and `unit.test.js` refuses a
  new one — a declaration the browser cannot talk out of.
- **The reveal depended on being observed.** `IntersectionObserver` reports a change of
  ratio, not a position: a flick or a scrollbar jump can carry a block from below the fold
  to above it between two samples and the observer never fires for it — no entry, no
  callback, and CSS still holding it at `opacity:0`. Board rows 02 and 03 on the rider page
  were invisible exactly that way at 1440 px. `Motion.reveal` now sweeps the still-pending
  set on scroll (rAF-throttled, self-unsubscribing when nothing is left, and handed back as
  a dispose so `mountLanding` owns it like every other mount), and the suite refuses a view
  with anything still transparent at each of the 100 combinations.
- Bar labels gained a hit box: the shortest Arabic name in the masthead is 14 px of glyph,
  so the link takes `--s2` of inline padding and keeps the row's own spacing — a thumb aims
  at 30×40 now, and the tap floor is a test, not an intention.

**Bugs fixed here, with the guard that keeps them fixed:**

- Four landing views rendered invisible copy. `shell.html` hides `[data-rv]` until a
  script marks it `in`, but `mountLanding` ran only on the rider and drive pages, so
  About, Help, Get the app and the policy documents printed their text at `opacity:0`
  while every DOM assertion passed. The call moved into the `landing()` dispatcher,
  where a new view cannot miss it, `mkSection` marks the blocks it holds that do not
  already reveal, and a case in `tests/layout-breaks.sh` deletes the marking and
  expects red.
- The reveal skipped anything the reader jumped past: `isIntersecting` never fires for
  a block that left the viewport between two frames (a scrollbar drag, an in-page
  link), so it stayed transparent for the session. A block above the scroller's top
  now counts as seen, and the landing suite scrolls every view to its bottom and
  refuses a view with anything still hidden.
- The desktop rail never widened: the landing splice dropped
  `.nav{width:var(--rail-expanded)}`, leaving the expanded labels sharing 80 px with
  the icons. Restored, with a break case that removes it and must fail
  "expanded widens the rail".
- A leftover from the break harness's older scratch scheme was found in the product:
  `field("stop-latX", …)` in two places in `screens/staff.js`, from a killed run whose
  restore never happened — a live defect, since the desk stop form wrote to an id its
  own submit handler never read. Caught by `unit.test.js`'s `#stop-lat` assertions; both
  harnesses now keep their pre-case copy in `$TMPDIR` with an `EXIT` trap, the colour
  guard ignores scratch extensions, and `.gitignore` covers them.
- The Arabic copy table had holes: `booked` and `bookedBody` had been spliced into the
  sentence above them (corrupting `cancelTerms`) and `auth.owner_only` never existed,
  so an Arabic admin screen printed a raw key. Filled, and `unit.test.js` now compares
  the two language trees key by key in both directions and refuses an empty or
  key-echoing string. The Arabic journey beats also said something else
  (`تأكيد/صعود/الطريق` for Match/Board/Ride) and were re-mirrored; a parity guard
  counts keys and empties, not meaning, which is worth remembering for phase 2.
- `scanCameraAction` was called by the driver board and defined by nobody: an enabled
  button that threw on tap. It now uses `Platform.scanCode()`'s three answers
  (`{code}` submits through the same path as a typed code, `{denied}` and `null` say so
  in words and keep the keypad), and a break case proves the guard fails if the handler
  disappears again.
- The install QR is generated locally from the exact URL its button opens, with the
  cache-buster taken from `BRAND.version.code`; `apkDownloadUrl` no longer carries a
  hardcoded origin fallback.
- `.mapstops__item` referenced two tokens that were never defined. The stylesheet is
  swept both ways — 162 `var()` references, none unresolved, and no token defined and
  never read; the two the scripts own (`--d`, `--near`) are read with a fallback, so the
  first paint is already finished-looking. The physical `margin/padding/border-left|right`
  count in `shell.html` is zero so RTL cannot inherit a one-direction layout.
- The QR encoder's own defects, found by the differential harness: Reed–Solomon
  generator polynomial order, a double-counted penalty rule and a mis-implemented
  rule 3, a format-area over-reservation, and (during this work) a splice that deleted
  four functions — the reason `node --check` now follows every edit to a concatenated
  bundle. Mask *selection* still differs from the reference on some inputs; that is the
  encoder's free choice, documented rather than chased.

**Test harness, four defects of its own fixed**: two stops break cases named tests
that do not exist and so could never fail (re-pointed at the live route-form
assertions); "staff create offers no super_admin option" grepped the source for one of
two role lists, so adding `super_admin` to either passed (both surfaces are now
rendered and read, as two separate cases); `tests/breaks.sh` printed its summary in the
middle of the file, so appended cases ran without counting and an early failure skipped
the rest (moved to the end, with a `BREAKS_ONLY=<substring>` filter so one guard can be
reviewed in seconds); and `layout-breaks.sh` had the same shape — a case added at the
bottom of the file never ran, and "landing loses its full width" went blind, because a
grid floor can hide the shrink from a runtime measurement, so that guarantee is now
asserted as a declaration in `unit.test.js` with the break case moved beside it. Four cases had to be re-derived against the new
source after the copy renames (the drive steps slab, the rider board's chapter count,
the road's cut list, the map's `aria-hidden`): each was edited until it fails the one
test that owns that guarantee, and no anchor was left to pass by matching nothing.

**Verification**: unit 553 / 0, a11y 14 / 0 (axe, every role, both languages),
layout 8,185 / 0 (Chromium, 15 viewports 320→2560 plus overlays, themes, RTL, zoom),
  landing 1,232 / 0 (Chromium: the
masthead is exactly one viewport tall at every width, the route measures over 200 px of
real geometry, the band is wider than the screen so its loop seam cannot show, the head
frosts, dark inverts the slab against the paper by measured luminance, every view
reveals all of itself when scrolled, the bus rides to the destination and fires the
arrival once, and the adaptive matrix above), layout-breaks 11 / 0 (the three new cases put
the map back over the copy, drop the flow rhythm, and take the menu under the tap floor —
each turns the suite red), breaks 98 / 0 (every planted defect caught, none missed,
none caught for the wrong reason), `scripts/verify-repo.sh` green
(11 guards including branding, tokens, secrets, authority and hide-not-disable).
Bundle: 941.6 KB, 18 modules.

No backend, API, schema or deployment file was touched. `archive/` is untouched.
Phase 2 (the app GUI) waits for its demo; phase 3 keeps the queued plan items.

## 2026-08-31 — GUI renewal preparation: pre-renewal archive + design study

- `archive/gui-before-renewal-2026-08-31-8828381.zip`: byte-exact `git archive` of the whole GUI
  (apps/web/**, packages/brand/**, the mobile offline shell + its tests, the design-system audit)
  taken at `8828381`, before the visual layer is rebuilt from the owner's monochrome demos.
  `manifest.json` records every file with its sha256 and the restore commands; `README.txt` how to
  open the snapshot with no build and no network. `theme-backup-old.zip` is untouched.
- Study of both sides recorded in the planning notes for the renewal: the shell's one-scroller and
  one-brand-source contracts, the landing section/content inventory, and the demos' 16 content or
  architecture gaps (hardcoded brand and logo, `rs-prefs` replacing `rs.theme`/`rs.lang`, dead
  download control, third-party QR, page-level scroll, missing Drive page and intro slides).
- Also recorded as findings for the implementation phase: AR/EN key parity has no guard
  (`booked`, `bookedBody`, `auth.owner_only` missing in AR), `scanCameraAction` is called but never
  defined (no lint runs on `apps/web`), `apps/web/assets/stickers/` is read by nothing, and three
  landing break tests assert nothing (CI: 86 caught / 3 missed).
- No production code changed in this commit: archive + documentation only.

## 2026-08-26 — Instagram-style OTA bootloader & in-app HMAC signing

- `offline.html` bootloader implements complete OTA update cycle:
  queries `/v1/mobile/update` with Web Crypto HMAC proof headers,
  verifies SHA-256 integrity of downloaded `/v1/mobile/bundle` via
  `crypto.subtle.digest`, saves verified bundle in `localStorage`,
  and mounts seamlessly in WebView.
- 2.5s update timeout guard: boots cached bundle instantly if network
  is slow/offline; shows clean offline retry view on cold boot without network.
- `API.request` in `api.js` signs outgoing `/v1/*` requests with HMAC headers
  when running on the mobile surface.
- 14 mobile tests green including subtle HMAC & SHA-256 verification tests.

**Also this date — the curtain, the twelve, and the tree's integrity.**

- One page transition now serves the whole surface: `src/lib/pagefx.js` draws a
  bottom-anchored path that rises, fills, releases and falls. It is armed only by a
  gesture the reader actually made (a trusted `pointerdown` or key — never a
  synthesised click), it swaps the page on the frame the screen is covered, and the
  swap keeps its own 600 ms deadline so a hidden tab still gets its page. Pacing is
  read from `--fx-rise/fill/release/fall` and stacking from `--z-pagefx`, so the
  sheet owns the motion and the JS only supplies the fallback.
- The owner's twelve review points are all in: page names centred on the bar's axis,
  the masthead one screen tall through `--view-h`, the splash waiting on its three
  conditions and leaving through the curtain, the button rhythm in the actions row,
  the name in one place (brand file → copy table → footer → install path → server
  header), the claims under their own band with a two-column key, a rights-only
  footer, four driver chapters instead of six, and two-up store cards.
- Transactional mail prints on the ink ramp (`brand.json → email.colors`, every value
  an existing token), so a receipt can no longer disagree with the interface.
- Suites on this tree: unit 586 · a11y 14 · landing 2,172 · layout 8,185 ·
  breaks 111 · layout-breaks 11 (see §10 of the plan for the exact commands).
- The break harnesses moved their scratch out of `$TMPDIR` and now end every run by
  proving each product file is byte-identical to the copy they started from. Two
  interrupted runs had left 49 of their own planted defects live across 16 files —
  an input at 14 px, a stray brace that silently killed every rule below it, a
  landing that opened the app's intro instead of the poster — and `git diff` could
  not see any of it, because a renewal tree is dirty by design. Lesson recorded in
  §10 of the plan: never edit `src/` while a break harness is running.

## 2026-08-25 — Mobile service is an app API, not a website

- `/` returns JSON 403 `NOT_A_WEBSITE`. `/healthz` stays public for Railway.
- App routes require HMAC (`X-RS-App-Id` + `X-RS-Ts` + `X-RS-Sign`). Wrong/missing
  proof → 403 `APP_UNPROVEN`. Unset `MOBILE_APP_SECRET` → 503 (fail closed).
- Proven `GET /v1/mobile/update` + `/v1/mobile/bundle` (sha256). `/v1/*` still
  proxies to the private Nest API. Play Integrity is the next owner-gated layer.

## 2026-08-25 — Two live products: website vs mobile app

- Website (`web`) never shows first-open intro slides — landing only.
- Railway `mobile` serves the live app HTML (`__RS_SURFACE=mobile`): intro
  then auth, never the marketing landing. Same `/v1` API proxy.
- APK stays local-first (`offline.html`); live navigation uses
  `MOBILE_PUBLIC_ORIGIN` (not the website). Generate Domain on `mobile`
  and set the GitHub Actions variable of the same name.

## 2026-08-25 — APK local-first offline page

- Capacitor no longer sets `server.url`. The WebView starts on device
  `www/index.html` (splash → `/healthz` → live site, or our offline page).
  Remote `errorPath` cannot load without internet, so Android showed the
  system error page. Retry re-runs the splash + probe.
- Brand versionCode 3 (APK URL cache-bust).

## 2026-08-25 — Maps + staff list + Arabic panel2

- Restore Arabic `panel2T`/`panel2B` (landing slide 2 leaked keys).
- Staff list is rows in the column (no 560px table). Role is a radio group.
- Route detail: always-visible Leaflet editor, tap to pin, pending pin draggable.
- Live map shows tiles even with zero vehicles; `m_fleet` / `m_noLive` copy.
- Intro kick uses `BRAND.name` so check-branding stays green.

# CHANGELOG

## 2026-08-25 — First-open slides + offline splash + APK URL

- Guest first open shows four intro slides (Prev / Next / Skip). Last slide:
  rider booking vs a separate Driver Account; Get started opens driver signup.
- Native APK ships `offline.html` (Capacitor `errorPath`): splash, then
  connection message + Retry (splash again).
- Get-the-app: two columns Android | iOS. APK + QR use
  `/download/android.apk?v={BRAND.version.code}`. Debug-APK disclaimer removed.
- Brand versionCode 2.

# CHANGELOG

## 2026-08-25 — W1 wallet fare on book (Path B)

- Review screen embeds `paymentChoice`. Cash = previous flow. Wallet =
  book then `POST /payments/bookings/:id/pay-wallet`. Insufficient funds
  keeps the booking, shows an honest banner, offers top-up + retry. Card
  option is top-up first (not a silent unpaid book).

## 2026-08-25 — Next-agent handover filed

- Canonical remaining-work brief: `docs/planning/NEXT_AGENT_HANDOVER.md`
  (Agent A baseline + §11 reality patch: migrations, maps scope, owner
  settings, uncommitted tree, extra W0/W2b/W12–W14). Pointer from
  `docs/process/checklists/00_MASTER.md`.

## 2026-08-25 — Email-verify toggle + app gate + download (Path B)

- Owner Settings can overwrite `AUTH_OTP_BYPASS` (0028). Same live `CONFIG`
  object the identity service already reads — website and APK share it.
- Native Capacitor: no marketing landing; splash → auth. System light/dark
  (auto) + status bar. Launcher icon is painted from `packages/brand` on
  every APK assemble (same source as the favicon).
- Landing **Get the app**: Android APK URL + QR; iPhone honest soon banner.
  Web serves `/download/android.apk` when the file is staged.

## 2026-08-25 — Owner settings + audit table (Path B)

- DEC-208: env stays the fallback; the owner Settings page writes a single
  `platform_settings` row (migration **0026**) that overwrites live
  `COMMISSION_PERCENT`, notify caps and `PAYMOB_ENABLED`. Secrets stay in
  Railway. Only `is_system_admin` (DEC-196 one root) can GET/PATCH
  `/admin/settings`. Payments/notifications keep reading `CONFIG` — the
  same object is mutated after save, no Path A file edit.
- Audit log is a real table (when / who / action / target / reason) with
  numbered pager + always-visible Prev/Next.
- Staff create: client checks 12-char password + email-or-phone; errors use
  `errText` (the form was live; short passwords looked like “add does not
  work”).
- Super-admin nav now includes Settings, Stops and Routes (root can map
  and set fares; operations still owns the daily job).

## 2026-08-24 — M8 launch gate (Path B)

- Checklist `docs/process/checklists/M8_launch.md`: live `/healthz` smoked
  (`web` api:up, `/v1` db:up). Owner blockers listed (trademark, corridor,
  Play keystore, legal, commission). README status + APK download path
  brought in line with what is actually on `main`.

## 2026-08-24 — P7.6 Play signing (no keystore in git)

- `packages/brand/brand.json` `version.name` / `version.code` is the only
  version (written into Gradle after `cap add`).
- `make-release.sh` + CI `apk-release`: signs only when
  `ANDROID_KEYSTORE_BASE64` + passwords are set in GitHub secrets.
  Without them the job is honest unsigned. `check-secrets.sh` fails on
  `*.jks` / `*.keystore` / `*.p12` in the tree.

## 2026-08-24 — P7.5 push + cached leave-now alarm (Path B)

- FCM send when `FCM_SERVER_KEY` is set; unset is an honest skip. Device token
  on `users` (0024). CH20 caps in one domain module (transactional never capped).
- Preview text is sanitised — no email/phone on a lock screen.
- `LocalAlarm` fires from the cached departure (T−15m) with no network (G-055).
  Notification permission denied still leaves the timer armed.

## 2026-08-24 — API Railpack crash: missing dist/main.js

- Railway `api` was starting `node dist/main.js` with no compile (Railpack, not
  the Docker image). `apps/api` start now compiles when `dist/` is absent.
- Root Railpack start routes by `RAILWAY_SERVICE_NAME` and also builds the API.

## 2026-08-24 — P7.4 Capacitor journey GPS (Path B, DEC-176 stay)

- `Platform.watchPosition` + `LocationTrack`: batch up to 8 fixes / 30s, flush leftover on stop. Tracking starts only on `IN_PROGRESS` and stops otherwise.
- `POST /journeys/:id/position` accepts `{ points }` and stores the last fix only (no interpolated path). Off-shift (not in progress) is refused.
- Rider live screen shows a stale-position warning when the last fix is older than `POSITION_STALE_SEC` (default 90). Gaps stay visible.
- APK assemble injects Android location / foreground-service permissions. 2-hour locked-screen + battery proof remains an on-device owner run.

## 2026-08-24 — Admin overview + paged audit (Path B)

- Super-admin home: lecture banner removed; tiles are the same `Row` primitive
  as the rest of the app (users / flag / queue / bus). Dead `go("vehicles")`
  now opens the real queue.
- `nav.admin` / Staff / Audit exist EN+AR — top bar no longer shows `nav.admin`.
- Audit log: server `limit`/`offset` + `total`; 25-row pages; who / when /
  action on one row so columns no longer collide.

## 2026-08-24 — P7.3 camera scan + APK Node 22 + schema order

- Driver journey: Scan QR next to the always-visible 6-digit field. Camera
  denied/unavailable focuses the keypad (DEC-136). Platform.scanCode never
  imports @capacitor/*; native plugin is registered from the mobile package.
- CI APK job uses Node 22 (Capacitor CLI 8 requires >=22).
- schema.sql table order matches pg_dump (idempotency_receipts after
  driver_profiles) so db:verify is green.

## 2026-08-24 — P7.2 driver outbox (Path B)

- One ordered durable outbox (`packages/platform/src/outbox.js`): airplane-mode
  enqueue, persist across kill, replay in seq, stop on network so later
  actions cannot overtake, 4xx conflicts surfaced, age → review not drop,
  position coalesce (explicit rule).
- Server `idempotency_receipts` (migration **0022**): same actor+key returns
  the first body. Scan/start/arrive/complete/abort/position wrap the receipt.
- Driver scan/start/arrive/complete/abort/cash go through `queueOrSend`.
  Flush on boot and `online`. EN+AR `j_queued` / pending / review banners.

## 2026-08-24 — Debug APK from CI (Path B)

- `apps/mobile/scripts/make-apk.sh` + CI job **Android debug APK**.
  Artifact `ride-share-debug-apk` on every green `main` push. Debug key
  only — Play signing stays P7.6 (secrets, never git).
- README: how the wrap works, why a website deploy does **not** update
  an installed APK, how to get the file, iPhone later (same Capacitor www).

## 2026-08-24 — Railway mobile: Railpack had no root start

- Deploy logs: `using build driver railpack-v0.37.0` then
  `No start command detected` (workspace root is not an app).
- Fix: root `start` + `build` + `index.js` + `railpack.json` boot
  `apps/mobile/server.js`. api/web stay on Docker and do not use this.

## 2026-08-24 — P3.9 live journey (Path B)

- POST start/complete/abort/position/arrive + GET progress. Start from OPEN
  locks then goes IN_PROGRESS. Complete marks ON_BOARD bookings COMPLETED.
  Abort notifies booked riders (in-app). Slip = minutes behind timetable;
  arrive refused when slip > MAX_SCHEDULE_SLIP_MIN (default 10).
- Rider waiting/onboard: live status, next stop, arriving banner, alight signal.
- Migration 0018 (even): position, arrived index, alight_requested_at, notifications.

## 2026-08-24 — P3.8 boarding scan + manifest (Path B)

- POST /bookings/scan (SCAN_BOARDING): single-use; this driver's journey only;
  window T−15/T+30 (env). Owner: no lockout — typing the code is the normal fallback.
  Every attempt audited. GET /journeys/:id/manifest lists this departure only.
- Rider booked: QR + 6 digits + summary. Driver Journey: numeric scan + list.
  Cash tap feature-detects API.cashCollected.


## 2026-08-24 — Starfield placed, not hashed

- Dust coordinates are composed (corner clusters, a high arc, centre kept clear)
  and tiled vertically so the sky holds while they travel.

## 2026-08-24 — Starfield dust: mixed size/speed, faster scroll

- Desktop story dust is three compositor layers of irregular stars (box-shadow),
  not a grid. Near stars travel farther/faster than far ones.

## 2026-08-24 — One desktop dust layer (scroll-driven, not per slide)

- Per-slide specks removed (they lagged). One sticky field of dots sits over the
  whole story on desktop only, two CSS layers, `animation-timeline: --land`.
  Mobile and reduced-motion show none.

## 2026-08-24 — Last story slide match + scroll-linked dust

- Desktop last chapter is one viewport tall so it does not linger after the others.
- Story dust is 64 tokens-only specks in three depths; they translate with `--sy`
  while the slide copy stays pinned.

## 2026-08-24 — Story slides stay centred; more desktop hold; new board/noroute art

- Desktop: each story chapter is taller than the viewport; the illustration + copy stay
  sticky-centred while the user scrolls, then the next chapter covers it. Particles, orbs
  and mesh still move with `--sy`. Mobile stays one-viewport chapters (no extra hold).
- “Board in seconds” uses `boardfast` (phone photo). Drive “No route drawing” uses `noroute`
  (strategy). How-it-works board art is unchanged.
- Removed the leftover truncated HTML after `</html>` in `shell.html`.

## 2026-07-29 session 1

- Created project workspace `/home/user/project_rideshare` with git repo and `_working_docs/` structure.
- Parsed the user's raw idea into atomic checklist items (`thinking/01_points_idea_parse.md`).
- Ran MCQ Decision Batch 1; recorded 4 confirmed decisions (tri-modal product, Alexandria->Cairo->generic,
  dual vehicle-entry, hybrid tiered pickup) in `discovery/00_RAW_IDEA.md`.
- Opened audit gaps G-001..G-005.
- Validation: no code yet; documentation-only session so far.
- Research pass 1 completed: 4 parallel search tracks (Egypt regulation, Swvl precedent, pooling
  algorithms, maps/routing infra, payments). Written to `discovery/01_RESEARCH_FINDINGS.md` with
  sources. Opened gaps G-006..G-008.
- Decision Batch 2 recorded (universities+fleet-owning companies first, full-product stance,
  2-person OSS-first team). Created `discovery/02_ARCHITECTURE_ANALYSIS.md` with the
  processing-location recommendation (hybrid, server-authoritative) and a vetted-candidate
  open-source table. Opened gaps G-009, G-010.
- Created `DECISIONS_REGISTER.md` (permanent, append-only record of every user decision, DEC-001..013).
- Stack research completed (RN/Expo vs Flutter 2026; Redis GEO vs PostGIS). Stack decision DEC-012
  written with per-layer justification and an explicit rejected-options list, in
  `discovery/02_ARCHITECTURE_ANALYSIS.md` section A4.
- Decision Batch 3 recorded (DEC-012 approved, DEC-014 single role-adaptive app, DEC-015 web-first,
  DEC-017 full i18n). Opened gaps G-011 (background GPS in a unified app) and G-012 (web driver
  tracking limits). Created `MASTER_PLAN.md` with a 17-chapter dependency-ordered roadmap and the
  chapters/ directory.
- Chapter 1 (Glossary & Domain Model) drafted at `chapters/CH01_domain_model.md`: one-universal-model
  decision evidenced against GTFS-Flex, 20-term glossary with Arabic UI terms, mode-mapping proof
  table, four policy objects, intent-vs-mechanism simplicity design, relationship diagram,
  10 invariants. Recorded DEC-019..DEC-021.
- Added binding project rule P5 (MCQ-per-decision; agent never closes an open point alone).
- Chapter 1 closures recorded: DEC-019, DEC-021, DEC-024, DEC-025. Gaps G-013 and G-014 CLOSED;
  new gap G-015 (stranded rider on failed 2nd leg) opened for CH12.
- DEC-030 (legal out of scope, handed to user's legal team), DEC-031 (Organizations removed
  entirely), DEC-032 (Support Agent role added), DEC-033..035 (fleet paths, dual vehicle entry,
  strict driver verification) recorded.
- Chapter 2 drafted at `chapters/CH02_roles_accounts.md`: four roles, phone-first identity model,
  two-door vehicle registry with fleet labels, full permissions matrix with audit rules, strict
  driver verification state machine. G-016 and G-018 CLOSED.
- DEC-036 (owner-only driving), DEC-037 (no parcels), DEC-038 (admin-curated stops only) recorded.
- Detected and logged contradiction G-019 (owner-only vs fleet vans) and workload gap G-020
  (manual city mapping before launch).
- DEC-039 resolves G-019 (driver-accountable, vehicle-as-attribute, Uber-style). DEC-040 (mapping
  team + mandatory Stop Mapping Tool), DEC-041 (journeys serve only needed stops), DEC-042 (minimal
  stop data). G-019, G-020 CLOSED. New gaps G-021 (lost night/accessibility intelligence) and
  G-022 (Stop Mapping Tool is now a required build item).
- DEC-046 (six roles confirmed), DEC-047 (sell every physical seat; G-025 caution), DEC-048
  (dependency-order sequencing, agent-decided).
- Chapter 3 drafted at `chapters/CH03_lifecycle.md`: five state machines (RideRequest, Booking,
  Journey, Driver duty, plus abort handling), promise-preservation rule, recurring-plan models,
  boarding-proof options, and 5 new invariants. Sections requiring user decisions are explicitly
  marked [MCQ PENDING] rather than being closed by the agent.
- Research pass 2 (pricing/money economics) appended to discovery/01_RESEARCH_FINDINGS.md as R7,
  including the key finding that walk-to-corner pooling sustains 25-40% discounts vs 15-22% for
  door-to-door, validating the meeting-point model.
- DEC-049..DEC-062 recorded: QR-primary boarding, full data capture, subscriptions, 10-min wait,
  strict cancellation with informed consent + credit refunds, locked prices, university-first launch
  with manager-controlled expansion, fixed route pricing, referral/share rewards, advanced manager
  price control. Gaps G-026..G-034 opened; G-030 closed.
- Chapter 3 closed out with sections 3.10.1-3.10.9: QR-primary boarding with offline-capable
  signed scans and a live driver manifest, subscription recurring model, 10-minute wait, strict
  cancellation with informed consent and credit-only refunds, locked prices, and an explicit list
  of the 7 items still open. CH3 marked complete in MASTER_PLAN.
- Chapter 4 drafted at `chapters/CH04_geography.md`: geographic object model, stop lifecycle with
  stable public codes, the always-visible-map rule, walking suitability definition, full Stop
  Mapping Tool specification (field+desk+review+audit), manager-controlled service expansion with
  runtime configuration, multi-city structure, 5 new invariants. Detected a genuine conflict between
  DEC-004 (three priced pickup tiers) and DEC-058 (fixed route pricing) — raised to the user.
- Research pass 3 (R8: Uber Express Pool price ladder, ~2x stop-vs-door gap, deviation harm
  mechanism) appended to discovery/01_RESEARCH_FINDINGS.md.
- DEC-063 (two ticket types), DEC-064 (no walk ceiling, street pickup always offered),
  DEC-065 (rider may choose any stop, system recommends), DEC-066 (combined 3-layer pricing
  formula), DEC-067 (door-to-door dropped), DEC-068 (code maintainability is a first-class
  requirement) recorded.
- Created `chapters/CH06a_pricing_formula.md`: three-layer street-pickup formula with a
  feasibility gate ("harm to others" rule), full manager-controlled variable table with scope
  inheritance, guardrails including preview-before-publish and rollback, and a worked example.
- DEC-069 (modular monolith), DEC-070 (config-driven business rules), DEC-071 (full quality gates).
- Created `chapters/CH08a_code_architecture.md`: 16-module map with enforced boundary rules,
  per-module internal layering with the domain-purity rule, shared-types strategy, the
  configuration-vs-code rule with scope resolution and safety requirements, event-log backbone,
  verify-command definition, per-area testing bar, contributor non-negotiables, and the
  work-package format for hired developers.
- Research pass 4 (R9: production dispatch architecture) appended, covering the constellation
  finding, H3 partitioning, greedy+batch consensus, adaptive timing, the 8-10% quantified
  trade-off, offer/timeout workflows, double-dispatch hazard, degradation and ETA precomputation.
- DEC-072..DEC-076 recorded. Chapter 5 (The Matching Algorithm) drafted at
  `chapters/CH05_algorithm.md`: full 6-stage pipeline, 10 hard feasibility constraints, the
  weighted insertion-cost function, adaptive batching, offer workflow correctness requirements,
  overnight planner, degradation matrix, and 3 new invariants.
- Research pass 5 (R10: Egyptian payment rails — IPN/InstaPay reality, Paymob two-way capability,
  payout thresholds, the pooled-cash problem) appended with sources.
- DEC-077..DEC-081 recorded. Chapter 6 (Money) drafted at `chapters/CH06_money.md`: double-entry
  ledger design with six account types, full payment-method matrix behind one provider interface,
  the exact 4-step cash sequence with cash-liability credit control, fare precedence, subscription
  handling, refund-to-credit policy, commission/subscription/hybrid revenue models as configuration,
  weekly payout mechanics, promotion budgeting, reconciliation controls, and 5 new invariants.
- DEC-082 (all three growth mechanics, individually switchable).
- Ran full conflict audit #2 -> `AUDIT_2026-07-29_session1_FINAL.md`: 7 active conflicts identified
  (C-1..C-7), completeness assessed at ~45%, and 15 previously-undiscussed topics logged (F-26..F-40).
  Opened G-037..G-040. Verified decision and gap numbering mechanically: no gaps, no duplicates.
- Research pass 6 (R11: Mac/EAS cloud builds, RNW production readiness, practitioner consensus
  against a single UI codebase) appended with sources.
- DEC-083 (multi-seat booking), DEC-084 (wait time is a human decision), DEC-085 (monorepo with
  separate UIs), DEC-086 (vertical slices), DEC-087 (MCQ process restated).
- Conflicts C-2 and C-3 RESOLVED; gaps G-011, G-012, G-029, G-037 CLOSED.
- DEC-088..091 (REST+WS, targeted realtime, adaptive GPS, offline-critical actions).
- Chapter 9 (Data Model & API) drafted at `chapters/CH09_data_api.md`: full table definitions for
  all 9 modules with keys/indexes/constraints, database conventions (UUIDv7, timestamptz, integer
  money, no soft-delete), complete REST endpoint catalogue for rider/driver/manager/ops/support,
  WebSocket channel design, the offline outbox mechanism with idempotency, the adaptive location
  pipeline with battery guard, and database-level invariant enforcement.
- DEC-095..097 (on-call SOS, informational-only ratings, three-vector fraud focus).
- Chapter 12 (Trust, Safety & Security) drafted at `chapters/CH12_trust_safety.md`: full safety kit
  with silent SOS and SMS fallback, the incident flow now carrying the entire protective burden
  (with repeat-signal escalation to compensate for DEC-096), three fraud-control tables, QR
  fallback matrix, accessibility provisions, operational-failure responses, and movement-store
  security required by DEC-094. Opened G-044.
- Research passes 7 and 8 (R12 UX usability evidence incl. SUS benchmarks; R13 offline-first
  architecture incl. the dispatch warning) appended with sources.
- DEC-098 (adaptive home, identical structure across platforms), DEC-099 (split offline model),
  DEC-100 (subscription trial day).
- Chapter 10 (UX) drafted at `chapters/CH10_ux.md`: measured design bar (SUS >= 80 target vs Uber's
  66.75), 12 universal design rules with sources, the adaptive home matrix, the anxiety-screen
  specification with offline fallback, driver-in-motion constraints, offline-first driver flow with
  delta sync, RTL/localisation rules, low-end device budget, and notification governance.
- DEC-101 (active alerting, no auto-rules), DEC-102 (ops queue-first), DEC-103 (build all three
  growth mechanics equally and measure).
- Chapters 7 and 11 drafted at `chapters/CH07_CH11_growth_dashboards.md`: referral/share/streak
  mechanics with anti-abuse and ledger-enforced budget caps, mandatory measurement rules, the
  Manager dashboard with actionable alert rail and preview-before-publish pricing control, the Ops
  work-queue home with approval and incident workspaces, the bounded Support workspace, and
  cross-cutting audit/export/RTL rules.
- DEC-104..109 (self-managed VPS, region-as-config, full test pyramid, self-hosted DB with replica
  and off-site backups, closed-beta launch gate, phased hiring). G-046 CLOSED; G-045 open for CH16.
- Chapters 13, 14 and 15 drafted at `chapters/CH13_CH14_CH15_privacy_quality_infra.md`: data
  inventory with sensitivity ratings, the tiered-storage-not-tiered-deletion model required by
  indefinite retention, regulatory export capability, the verify command and per-area testing bar,
  the pre-launch simulation question list, closed-beta success criteria, the definition of done,
  the VPS architecture diagram with mandatory operational practices, and the cost-model structure.
- DEC-110 (one corridor complete then widen), DEC-111 (hiring out of scope), DEC-112 (timelines out
  of scope). G-001, G-045, G-046 CLOSED; G-009 reclassified as a user-owned standing risk.
- Chapters 8, 16 and 17 drafted at `chapters/CH08_CH16_CH17_architecture_delivery_risk.md`:
  runtime architecture with the server/device authority table and degradation behaviour, the
  8-phase delivery plan with exit criteria and no dates, the work-package format, definition of
  done, and a 12-item risk register with named owners.

## 2026-07-29 session 1 — CLOSE

- Assembled `MASTER_SPECIFICATION.md`: 3,681 lines / ~36,800 words / 243KB.
  Structure: Part I executive summary (the 10 defining decisions + what research changed),
  Part II all 17 chapters, Part III the full decisions register (DEC-001..112),
  Part IV open items and audit trail, Part V research evidence R1..R13 with sources.
- Session totals: 112 decisions recorded, 46 audit items tracked, 13 research passes with sources,
  14 chapter files, 7 conflicts detected and 5 resolved.
- Validation: documentation-only session; no code written, therefore no tests claimed. Decision and
  gap numbering verified mechanically (no gaps, no duplicates). All research claims carry sources;
  unverifiable items marked [UNVERIFIED].
- Remaining open: see AUDIT_AND_TODO.md. Notable unresolved product questions carried forward:
  G-015 (stranded rider on failed second leg), G-024 (dynamic walking rule detail),
  G-033 (price precedence confirmation), G-034 (share-attribution design),
  plus F-26..F-40 topics scheduled to their chapters.

## Later sessions — route-ticket model, full specification, GUI, build plan (2026-07-29 → 2026-08-02)

- Route-ticket model adopted and propagated (DEC-113..DEC-119, DEC-132, G-051): no automatic
  surge (manager-initiated changes only), wall-clock scheduling with Ramadan mode and a holiday
  calendar, the alighting signal, schedule-adherence as the dispatch objective, and the slot-claim
  model (route_slots / slot_claims / CLAIMED journey state). CH5, CH9 and CH10 rewritten to v2;
  a full cross-chapter consistency sweep ran after each model change (P6, DEC-126).
- Specification completed to 22 chapters (DEC-120..DEC-167): design system (CH10a), the 75-screen
  inventory for five roles (CH10b–d), trust & safety (CH12), privacy/quality/infrastructure
  (CH13–15), delivery plan and risk register (CH8/16/17), operations runbook (CH18), configuration
  catalogue (CH19), notification catalogue (CH20).
- Research passes R14–R22 appended (OpenStreetMap coverage in Egypt, ORM comparison, Railway and
  PostGIS tooling, cold-start demand estimation, OSM QC methodology).
- BUILD_PLAN written (DEC-170..DEC-173): Phases 0–8, every point carrying what / how / test /
  how-to-break-the-test / done / gap-risk.
- GUI-first pivot (DEC-174, DEC-175): commercial map provider for the visible map surface; the
  complete interface built as one self-contained HTML file — five roles, bilingual with full RTL,
  light and dark themes, one adaptive layout — verified with jsdom and Puppeteer plus break tests.
- DEC-176 mobile via Capacitor; DEC-177 one private monorepo; DEC-178 profile identity and wallet
  balance pinned in the rider top bar.
- Investor information document produced (LaTeX source + compiled PDF).

## 2026-08-17 — search bar scrolls with the page; repository completeness

- UI: the search band moved from a pinned sibling above the scroller to the first element inside
  `.main`, so it scrolls with the page; the horizontal separator under it was removed.
- Verification updated and re-run green: build; 181 unit/accessibility assertions; 5,803 real-browser
  layout assertions (15 viewports × 5 roles × 30 screens); 36 break cases and 7 layout break cases
  all observed failing for the right reason.
- Docs: design "layout contract" updated to match; the UI reference benchmark adopted by DEC-168 was
  added under `docs/reference/`; the docs index updated.
- Repository: confirmed `app/` (interface), `deploy/` (Docker, nginx, Railway), `docs/` (all non-code)
  separation; secret scan clean (no PAT or credentials in tree or history); pushed to GitHub.

## 2026-08-17 — modernised GUI: violet pop design, auto theme, collapsible rail, brand mark

- Design language modernised to a youth pop palette: **violet `#6C63FF` is now the primary
  brand/action colour**; **coral** takes the secondary "value & continuity" role; five pastel
  pops (mint, lime, sky, pink, coral) added as first-class tokens. Teal retired. Dark mode uses
  near-black surfaces with the pops glowing on top.
- Brand mark: the user's bookmark-and-pin glyph added as the logo, rendered with a violet gradient
  (defined once) and embedded as an SVG data-URI favicon; theme-color meta updated.
- Theme system: **Auto / Light / Dark**. Auto follows the device (`prefers-color-scheme`), manual
  choices persist (localStorage), a quick toggle sits in the top bar, and the three-way control
  lives in Profile. A pre-paint script prevents a light flash for dark users.
- Desktop rail: a collapse control folds the expanded rail to a 72–80px icon bar (labels hidden,
  tooltips on the active items) and back; the choice is remembered.
- Tasteful "happiness" touches: gradient primary button with a soft glow and hover lift, hover lift
  on route cards, playful empty states (soft pop blob), emoji accents on the active-ticket and
  booked screens, and colourful top-up chips.
- Latent fix: the illustrative map's route/walk colours (`--accent-route`/`--accent-walk`) were
  referenced but never defined; they now map to `--route`/`--walk`.
- Verification re-run green: 198 unit/accessibility assertions; 5,803 real-browser layout
  assertions; 40 break cases and 7 layout break cases all observed failing for the right reason.

## 2026-08-17 — M0.1 foundations: monorepo + pinned toolchain; payments decided

- Research pass R23 (`docs/research/03_PAYMENTS_EGYPT.md`): Paymob is the primary gateway
  (cards, Meeza, mobile wallets, Fawry OTC — Uber Egypt's choice); cash stays the core; driver
  payouts weekly via bank/InstaPay, ops-owned. Recorded as DEC-179..DEC-183 (also: keep the GUI
  as the real client, vertical-slice sequencing, agent-prepares-Railway).
- Execution plan written (`docs/planning/EXECUTION_PLAN.md`): milestones M0–M8, Railway topology,
  owner-provided accounts list.
- Monorepo skeleton (BUILD_PLAN P0.1): pnpm workspace + catalog (strict), pinned `packageManager`,
  Turborepo, `packages/config`, `apps/api` + `apps/mobile` placeholders with READMEs, `AGENTS.md`.
- `app/` moved to `apps/web/` (DEC-181 — the GUI is the real web client); all path references
  updated; test requires now use the workspace `jsdom`/`puppeteer` instead of a hardcoded
  `/tmp/node_modules` path.
- `scripts/check-workspace.sh` (P0.1): private root, exact packageManager, every package named,
  internal deps `workspace:`, external deps `catalog:` only. All four break cases observed failing
  for the right reason.
- Verification: GUI suite re-run green from the new location — 198 unit, 5,803 layout,
  40 + 7 break cases caught.

## 2026-08-17 — M0.2/M0.3: verify harness + secret hygiene; checklist system

- `pnpm verify` now runs repo checks → build → typecheck → lint → test; `verify-repo.sh` names the
  failing check and flags silent-green sub-checks (P0.2).
- Secret hygiene (P0.3): `check-secrets.sh`, `check-env-example.sh`, `apps/api` env config with zod
  and a named startup refusal, eslint rule restricting `process.env` to one module. All break cases
  observed failing for the right reason.
- Added `docs/process/checklists/` — a permanent completion ledger (master index + one file per
  milestone) so a box is ticked only when a command has proved it.

## 2026-08-17 — M0.4: Docker (one image for every service), infra/, CI; sandbox cleaned

- Sandbox cleaned to the repo + the active rules only (freed ~28 MB); GitHub is the source of truth.
- `infra/` replaces `deploy/` per the execution plan: parameterised `Dockerfile.node` (api + web),
  root `docker-compose.yml` (api, web, postgres+postgis, redis), Railway config + README, smoke test.
- `apps/web` gained a zero-dependency runtime server (serves the build + /healthz); `apps/api` gained
  a health server; both are unit-tested.
- CI workflow added: pnpm verify + full GUI browser suite + both image builds (non-root enforced).
- Docker proven live in the sandbox: one Dockerfile builds both services, containers run non-root,
  health endpoints answer, the app refuses to start naming missing env vars, no .env baked.

## 2026-08-17 — M0.5: PostGIS, migrations, no-ORM guard-rails; CI db job

- node-pg-migrate plain-SQL migrations (0001 enables PostGIS); schema-derived types
  (packages/shared-types/db.generated.ts); four no-ORM guard-rails (SQL location, SQL injection,
  migration drift, type drift) all wired and observed failing for the right reason.
- `pnpm db:verify` = migrations + drift + types, run against a live PostGIS (local compose or CI
  service container). PostGIS 3.4 confirmed; committed infra/schema.sql generated from a clean
  scratch database (migrations-only).
- CI gains a `verify-db` job with a postgis/postgis:16-3.4 service container.

## 2026-08-17 — M0.6: API skeleton + security foundation (Paymob-ready)

- NestJS 11 / Fastify API: one error shape (translation-key message_key, request_id), one request
  context, strict global validation (unknown fields rejected), one authority resolver + guard, one
  pino logger with central redaction, helmet, env-driven CORS allowlist, global rate limiting,
  trust-proxy for Railway. /health returns db+redis, 503 when down.
- Paymob contract: PaymentProvider interface + real HMAC-SHA512 webhook verifier (constant-time) +
  PaymobAdapter (sandbox refuses live actions; flips to live on keys). 16 module directories with
  "why" READMEs. 21 tests green; all break cases observed failing for the right reason.
- Sandbox: rebuilt with native Postgres 17 + PostGIS + Redis (Docker not available this turn);
  live API proof recorded (200/503/429/404/headers).

## 2026-08-17 — M0.7–M0.11: remaining guard-rails (tokens, boundaries, authority), axe scan, CI

- check-tokens (colour only, R19.5 scope), check-boundaries (contracts-only, domain≠infra, no
  cycles, shared≠apps), check-authority + check-hide-not-disable — all in `pnpm verify`, all break
  cases observed failing for the right reason. All-permissive resolver → 5 authority tests fail
  (the §7.0 proof). axe-core scan added: 14/14 across 7 screens × EN/AR.
- CI workflow validated (verify, verify-gui, verify-db + postgis service, images + non-root).
  Branch protection + red-PR observation = owner actions in GitHub settings (recorded).
- Phase 0 is now only missing the deploy (P0.12) and portability (P0.13) — plus two owner-gated
  items (branch protection, Railway connection).

## 2026-08-17 — DEC-184: managed databases for launch (PostGIS deferred to M2)

- Owner-directed for the free trial (Railway refuses the postgis/redis Docker-image services).
- Production now runs Railway **managed PostgreSQL + managed Redis** (automatic backups; no
  containers). PostGIS is DEFERRED to M2: migration 0001 is a baseline (`SELECT 1`) that runs on
  any PostgreSQL; geo returns at M2 via a PostGIS-capable host or numeric lat/lng + OSRM/geocoder
  (G-061). Local compose + CI use plain `postgres:16-alpine` for parity (DEC-185).
- `infra/schema.sql` regenerated from a clean plain-PostgreSQL scratch DB (pgmigrations only);
  `pnpm db:verify` green (0 drift, cycle clean); `pnpm verify` green.

## 2026-08-17 — DEC-186: PostgreSQL-only (Redis removed entirely)

- Owner decision: drop Redis; PostgreSQL is the only stateful dependency, on this architecture from
  the start (no adapter seam). Realtime = LISTEN/NOTIFY, queues = SKIP LOCKED, sessions/read models
  = tables, matching hot index = in-process H3 rebuilt from PostgreSQL, rate limiting = in-memory
  per instance. Revisit only with measured evidence at horizontal scale (G-062 MONITOR).
- Swept everywhere: `env.ts`/`env.test.ts` (REDIS_URL removed), health controller + test (db-only
  status, 503 when down), `ioredis` dependency removed, docker-compose + CI + production compose +
  .env.example + Railway README (managed Postgres only), EXECUTION_PLAN topology, BUILD_PLAN P0.x
  statements, MASTER_SPECIFICATION + CH05/CH08/CH09/CH13 (architecture statements + DEC-186/DEC-184
  revision banners), checklists, AGENTS-facing infra README. Historical records (research, old
  decision rows, changelog) left intact — decisions are append-only.
- Verified: `pnpm verify` green (198 web, 21 api, 9 repo checks); `pnpm db:verify` green; LIVE:
  `/healthz` → `{"ok":true,"service":"api","db":"up"}` (no redis), db down → 503.

## 2026-08-18 — M1 backend: identity & auth (real system core)

- Migrations users/otps/sessions; scrypt password hashing + jose JWTs + revocable refresh sessions;
  6-digit OTP (dev logs code, prod refuses without SMS provider); env-seeded bootstrap admin;
  super_admin-only staff creation. Live-proven end to end. 42 API tests green. Local commit only —
  push pending owner confirmation.

## 2026-08-18 — M1 backend complete: identifier login, drivers, vehicles, audit

- Staff log in with phone OR email + password; staff accounts accept phone and/or email.
- Driver self-registration (apply) → ops approval (state machine, atomic role promotion); vehicle
  registry + approval; append-only audit log (super_admin view) recording every privileged action.
- DEC-188 recorded. Guard-rails enforced themselves (SQL→repository, contracts-only imports, no
  cycles). 52 api tests green. Local only — push pending owner confirmation.

## 2026-08-18 — M1 frontend Stage 1: real entry flow (splash → landing → auth → app)

- Boot splash (bouncy logo); landing page with scroll-driven hero + features + map illustration;
  sign-in/create-account wired to the real API (staff password, rider OTP, staff no-self-signup);
  session persistence + sign-out; rail collapsed by default; demo role switcher removed; super_admin
  Administration section (staff + audit). API client + /v1 proxy. 218 unit / 14 axe / 6,904 layout /
  44 breaks green. Local only — push pending confirmation.

## 2026-08-18 — M1.5: verification & recovery (email codes, password reset, cooldown/lockout)

- DEC-189/DEC-190/DEC-191. Generalized `verification_codes` table (replaces `otps`): sms_login,
  email_verify, password_reset; 60s resend cooldown; 3 failed attempts → 1-hour lockout; codes
  hashed at rest. Email verification + password reset (no user enumeration; resets revoke all
  sessions). SMTP via nodemailer behind the one Notifications interface; honest sandbox.
- Migrations now run on boot (AUTO_MIGRATE) and ship inside the api image (Dockerfile copies
  infra/migrations) — the deployed DB gets the schema automatically.
- Route-level throttling on auth endpoints (login 10/min, OTP request 5/min, reset 5/min, …).
- Frontend: resend button with a live 60s countdown, 1-hour lockout banner, forgot-password flow,
  email verification section in rider/driver profiles. 226 web / 63 api / 14 axe / 6,904 layout /
  46 breaks green; live-proven end to end.

## 2026-08-18 — M1.6: smart sign-in (staff auto-detect), rider/driver signup, GUI audit fixes

- Sign-in is ONE form with auto-detection: `POST /auth/login/identify` returns the method
  (password → staff/any password account; otp → rider/driver, code sent automatically). No visible
  role toggle anywhere. Sign-up offers exactly Rider or Driver; Driver also submits the driver
  application after the account exists. Staff self-signup stays impossible (DEC-032/033).
- SMS provider wired for real: `SMS_PROVIDER=twilio` + `TWILIO_ACCOUNT_SID/AUTH_TOKEN` + `SMS_FROM`
  send real messages; without it, development logs the code and production refuses (honest).
- Google Maps layer: `/v1/config` exposes the client-safe key; `MapView` renders a real Google Map
  (marker, route polyline, "locate me" via navigator.geolocation) when the key is set, the labelled
  illustration otherwise. Geolocation is exercised here so the Capacitor build inherits it.
- GUI audit fixes: landing hero is full viewport on desktop; auth card is centered; boot splash
  minimum 1500ms; hero map zoomed/cropped; RTL mirrors the "how it works" icons; no visible
  scrollbars (still scrollable); text selection uses the accent colour; sign-up role cards styled.
- 229 web / 60 api / 14 axe / 6,904 layout / 46 breaks green; live-proven (identify/password/otp,
  full-screen + centered + no-scrollbar measured in a real browser).

## 2026-08-18 — fix(web): landing page fills the full viewport; truly adaptive hero

- Root cause: #root is display:flex (row), so the landing/authwrap flex children had no width and
  shrank to their content (~50% of the viewport). Fixed with width:100%;min-width:0 on both.
- Adaptive hero: stacked on phones, two-column (text start-aligned + map beside it) from 840px;
  title uses clamp() type; landing content capped at --landing-max (1120px) and centered; nav
  padding aligns to the cap; hero map height scales with the viewport.
- New browser test suite `tests/landing.test.js` (46 assertions): landing fills width, hero ≥ 1
  viewport, no horizontal overflow, centered auth card, RTL parity — across 7 viewports 320→2560.
  Wired into verify.sh, and a break case proves the width regression fails the suite.

## 2026-08-18 — feat(web): landing slideshow hero, user-facing features, hover tooltips

- Hero map replaced with an auto-advancing feature slideshow (same palette, pause on hover, dot
  controls, crossfade) — modern youth style.
- The two internal features ("Any city, one system", "Arabic first") replaced with end-user value
  props grounded in Swvl/Careem/Uber research: "Save on every ride" (fixed routes cost a fraction
  of ride-hailing) and "Track your ride live".
- Feature cards animate (lift + shine sweep + icon pop); the "how it works" steps reveal a floating
  tooltip that follows the cursor (tap-to-toggle on touch); step numbers stay on the physical right
  in BOTH languages (RTL no longer mirrors them).
- Hero is now full-bleed (the glow spans the whole viewport in light AND dark); content stays
  capped/centered; a second accent glow adds depth in both themes.
- 230 unit / 47 landing / 14 axe / 6904 layout / 47 breaks / 8 layout-breaks green; verified live
  (slideshow advances 0→1, tooltip on hover, dark glow = full 1440px viewport, zero console errors).

## 2026-08-18 — feat(web): stickers, colored slideshow, RTL numbers, auto lang/theme, theme-toggle fix

- Sticker packs unpacked and reviewed; chose the Streamline "Manila" doodle set (youth/lively,
  two-colour, recolorable). 7 stickers copied to apps/web/assets/stickers/ and recolored at build
  time to tokens (navy→--sticker-ink, blue→per-slide --sticker-accent) so they follow the theme and
  palette. Hero slideshow: each slide is now a coloured card (violet/coral/sky/mint tint) with its
  sticker; "How it works" cards carry a 112px sticker illustration; tooltips carry number + title +
  full description; step numbers stay on the physical right in BOTH languages.
- Sign-up audit: "ماذا تريد أن تفعل؟" was a 13px caption — now a real heading; role cards have
  16px titles / 15px subtitles with proper RTL wrap.
- Text-box focus/selection border is now the accent colour in both themes (--focus:var(--accent)).
- THEME-TOGGLE BUG fixed: the pre-paint script set data-theme on <html> while render() only set
  <body>, so the stale <html> attribute won and the toggle "did nothing". render() now keeps both
  in sync.
- Auto language (device language) + auto theme (device prefers-color-scheme, else time-of-day
  06:00–18:00) with persistent explicit overrides.
- Footer credits: "Vectors by Streamline" (free license permits commercial use without attribution;
  added as good practice).
- 233 unit / 14 axe / 47 landing / 6904 layout / 47 breaks / 8 layout-breaks green.

## 2026-08-18 — Email sign-in/sign-up + slider/landing polish (M1.8)

- Sign-in/sign-up is now EMAIL + OTP for riders and drivers (SMS/Twilio removed as dead code).
- Email allowlist: popular providers + all .edu/.edu.<cc> + env-extensible; temporary mailboxes
  (playboot.com, mailinator, 10minutemail…) are refused before any email is sent.
- Branded HTML emails (login code / verify / reset) over generic SMTP — Resend works by env only.
- Rate limiting now lives in PostgreSQL (throttle_records) — survives restarts, shared across
  instances (G-062 clause 1 resolved).
- Frontend: 6-box OTP input with auto-advance/paste/one-time-code; resend countdown and 1-hour
  lockout survive page refresh; friendly localized errors.
- Landing: "Vectors by Streamline" is a smaller link on its own line; role-choice chevrons sized
  (was rendering ~194–276px); slider cards are one solid pop colour each (white text, AA contrast);
  dark mode brightens the doodle accents; feature-card hover is bouncier.
- 77 API / 246 unit / 14 axe / 47 landing / 6904 layout / 53 breaks / 8 layout-breaks green;
  pnpm verify + db:verify green.

## 2026-08-19 — Slider illustration + motion polish (M1.8b)

- Slider doodle is now dark ink + white accents over the solid colour cards.
- Slides pop in with a springy overshoot (card scale + doodle bounce-rotate +
  copy rise + pulsing active dot) — reduced-motion guarded.
- Hero background glows drift very slowly (42s alternate) — reduced-motion guarded.
- Mailo SMTP values documented for ride.share.signup@mailo.com.
- 249 unit / 56 breaks / 14 axe / 47 landing green; repo checks green.

## 2026-08-19 — Account rules + the protected main admin (M1.9)

- One email = one account: sign-up (`/auth/signup/verify`) refuses an already-used email (any role) before and after the code; sign-in (`/auth/otp/verify`) requires an existing account. Friendly "already have an account — sign in instead" error in EN/AR.
- The env-seeded admin is the one main admin (`is_system_admin`): it can create/edit/remove staff; it is never editable/removable, and no second super_admin can be created or set (enforced in the single authority resolver).
- Staff lifecycle in the admin UI: system-admin row is marked and locked; other staff get Edit + Remove (soft delete — sessions revoked, history kept).
- 83 API tests / 253 unit / 58 breaks / 14 axe / 47 landing green; pnpm verify + db:verify green.

## 2026-08-19 — Resilience: API fails fast instead of hanging (M1.9b)

- Root cause of live "Something went wrong": the api service was down (web proxy 502) — the
  throttle store's DB pool had NO connection timeout, so an unreachable database wedged every
  request (including /healthz) into "application failed to respond" instead of a clean 503.
- pg pool now fails fast (connectionTimeoutMillis 5s, idleTimeoutMillis 30s); health endpoints
  are exempt from throttling so the platform's restart logic always gets an honest answer.
- Frontend maps 5xx to a clearer, retryable "service unavailable" message (EN/AR).
- Verified: full production boot locally (admin login OK, isSystemAdmin true); broken-DB boot
  answers /healthz in 13ms (503) and other routes in 5ms (500) — no hang.

## 2026-08-19 — Web proxy hardened + self-diagnosing (live 502 fix)

- Root cause of the live 502: server.js had NO timeout and NO guard — a malformed
  API_INTERNAL_URL (unresolved Railway reference) crashed the web process on every
  /v1/* request, and an unreachable API hung it forever.
- server.js now validates API_INTERNAL_URL once at startup (invalid → 503
  API_NOT_CONFIGURED, never a crash), the proxy has a 10s timeout + error handlers,
  and /healthz reports the API's reachability: { ok, service:'web', api:'up'|'down'|'unreachable'|'unconfigured' }.
- server tests extended (health api field, /v1/config, proxy 503 without API).
- Sandbox cleaned: sticker packs + zips removed from the workspace.

## 2026-08-19 — Pastel slider cards (illustrations pop)

- Slider cards are now ONE flat pastel tint each (brand-soft / coral / sky / mint bg) with
  on-colour dark text, a dark-ink doodle + pop-colour accent, and brand/line dots — the
  illustrations pop on the pastel instead of sitting on saturated dark shades.
- Removed the now-unused 700 shade primitives.
- Diagnosis for the live 502: the web service's API_INTERNAL_URL must be a CROSS-service
  reference (http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000), not the self-reference
  ${{RAILWAY_PRIVATE_DOMAIN}} (which points the web at itself).
- 253 unit / 58 breaks / 14 axe / 47 landing / repo checks green.

## 2026-08-19 — Bold slider cards + SMTP fails fast (live email fix)

- SMTP: SMTP_SECURE now defaults to 'auto' (implicit TLS on 465/2465, STARTTLS elsewhere) and the
  transport has 6s connect/greet + 8s socket timeouts — a slow/unreachable SMTP can no longer hang
  the OTP request (the live "service is busy" was the web proxy's 10s cap firing on a hanging Mailo
  connect). Send failures now throw notifications.email_send_failed (clear, retryable) instead of 500.
- Slider cards back to BOLD 700 shades (white text, AA) with white line-work doodles whose accents
  are the same-hue 300 steps (violet/coral/sky/mint) — illustrations pop and stay in the card's family.
- Proven: unreachable SMTP → email_send_failed in 34ms; 253 unit / 58 breaks / repo checks green.

## 2026-08-19 — Auth form fixes: password read, eye toggle, live countdown

- Fixed the live "Please check your entries" bug: sign-in (and signup/reset) read their inputs
  AFTER render(), which wiped the DOM — the password was sent empty and the DTO rejected it.
  All handlers now read values BEFORE re-rendering.
- Password fields now have a show/hide eye (field__eye), with aria-label + aria-pressed states.
- Resend cooldown ticks IN PLACE (no full re-render) so the OTP boxes the user is typing into are
  no longer wiped every second; the "Send code" / "Continue" buttons are cooldown-aware too, so
  the countdown is always visible where a code was just sent.
- Resend from the OTP step now falls back to S.authEmail (no email field on that step).
- 258 unit (5 new regression tests) / 14 axe / 47 landing / repo checks green.

## 2026-08-19 — [object Object] fix + staff profile + SMTP diagnostics

- Fixed the settings "[object Object]": the notifications error-key object clobbered the
  "Notifications" display string, so t("notifications") returned an object. Email error keys now
  live under error.* (backend + copy), leaving notifications a plain string.
- Staff profile: operations/manager/support/super_admin now get their OWN profile (account,
  email verification, language/theme/notifications, sign out) — wallet, subscriptions and safety
  centre (rider-only) are gone, and every staff role's nav now includes a profile page.
- SMTP failures now log the provider's own rejection (code + smtp response) so the deploy logs
  name the exact Mailo-side reason.
- 271 unit / 83 API / 14 axe / 47 landing / repo checks green.

## 2026-08-19 — AUTH_OTP_BYPASS env flag (test without an email provider)

- New env var AUTH_OTP_BYPASS (default false). When 'true': no code is issued or required —
  sign-up (allowlist + one-email-one-account still enforced) and sign-in proceed without OTP.
  The client skips the 6-box step (sign-up goes straight to the name step; sign-in enters
  directly). A loud warning is logged on boot. Keep 'false' in production.
- Also fixed: a successful sign-in left authBusy=true, so returning to the sign-in screen
  showed a stuck "…" button — enterApp()/signOut() now reset the auth-flow state.
- 87 API tests (4 new bypass tests) / 274 web unit (3 new) green; repo checks green.

## 2026-08-19 — Fix "check your entries" on the bypass name step

- Root cause: in OTP-bypass mode the client sent code:"" — class-validator's @IsOptional only
  skips null/undefined, so the empty string failed the 6-digit regex → validation.failed. The
  client now sends `undefined` (JSON.stringify drops the key) so the optional code passes.
- Audited every other @IsOptional DTO field: all are sent as undefined (dropped) or are strings
  where "" is valid — no other occurrence of this class of bug.
- Regression: "bypass signup omits the code field entirely" (observed failing when reverted to "").
- 275 web unit / 87 API tests / repo checks green.

## 2026-08-19 — Riders set a password at sign-up

- Fixed "create account" with no password: the sign-up flow now collects a password (min 8 chars,
  show/hide eye) on the name step, and the backend stores it scrypt-hashed. A rider account now
  signs in with email + password (identify routes it to the password method).
- SignupVerifyDto requires `password`; signupVerifyOtp hashes it; EN/AR copy added.
- 88 API (new test: password hash set + password sign-in works) / 275 web unit green.

## 2026-08-19 — M1-finish: demo data removed, screens honest, ops queue wired (M1.9f)

- Driver screens: honest empty states (no fake shifts/earnings/claims); profile shows the real user.
- Ops queue is now REAL: driver applications + vehicles load from the API; approve/reject call the
  real endpoints; live map lists real vehicles.
- Manager/support/stops/routes/users screens show honest "arrives in M2–M5" empty states.
- Deleted the whole DATA object and the demo sheets (qr, topup, subs, trip, claim, scan, fare,
  contacts); sos/report are honest M4 placeholders.
- New bundle-wide guard: "no sample content in the bundle" + break case (observed failing).
- 272 unit / 14 a11y / 5 server / repo checks green. Bundle 319→308 KB.

## 2026-08-19 — M2 P2.1: stop entity + distance module (numeric lat/lng)

- DEC-197: numeric lat/lng (no PostGIS) — G-061 closed; DEC-198: OSM map provider (free, no login).
- stops / stop_photos / stop_verifications (append-only trigger) + lat/lng & verified indexes.
- geo module: haversine + bounding box, stop codes, spacing guard, bounds, two-person verify,
  public verified-only "stops near me" endpoint.
- 105 API tests green; every new check observed failing; db:verify + repo checks green.

## 2026-08-19 — M2 P2.2: desk mapping tool (stops UI, CSV import, OSM map)

- Stops: POST /stops/import (all-or-nothing CSV) and POST /stops/:id/submit (draft→pending).
- Ops "Stops" screen is a real tool: coordinate + bilingual name form, duplicate-guard override,
  OSM click-to-place map, CSV import, stops list with status chips + submit.
- MapProvider: OSM/Leaflet (free, no key) is the default; Google behind the same surface when a key
  is set; /v1/config reports the provider.
- Fixed: $() now honours `id`, and list loaders pass element refs (admin/ops lists actually attach).
- 114 API / 279 unit / 14 a11y / 5 server / repo checks green.

## 2026-08-19 — M2 P2.3 + P2.4: field capture + verification queue

- Field capture: accuracy gate, required 4-question checklist, EXIF-stripped photo storage,
  idempotency by capture id, offline queue that flushes on reconnect.
- Verification queue in ops Stops: pending list → review view (checklist, photo, reject reason);
  two-person rule enforced server-side and in the UI (own capture hides approve).
- Retire endpoint (verified→retired, audited); public near stays verified-only.
- 125 API / 284 unit / 14 a11y / 5 server / repo checks green; 5 new break checks observed failing.

## 2026-08-19 — Landing page completeness (DEC-201) + M3/GUI direction documented

- Landing: For riders / For drivers / Safety sections + Terms·Privacy·Safety policy pages
  (structure real, legal wording = owner's per DEC-030).
- Documented: DEC-199 (A→B planner post-core), DEC-200 (desktop density), DEC-201 (landing),
  DEC-202 (M3 order); R19 research (Uber/Swvl/desktop density); M3 + GUI-polish checklists;
  project map + master status updated.
- 293 unit / 14 a11y / 47 landing / repo checks green.

## 2026-08-19 — M3 P3.1+P3.2: route entity + slot grid (backend)

- routes module: create/publish route, append verified stops (gapless), atomic reorder with
  cumulative distances, idempotent slot-grid generation (unique route/day/time).
- Migrations 0013/0014: routes + route_stops (verified-stops trigger, retire guard naming the
  route) + slots. Retire guard mapped to an honest conflict in geo.
- 140 API tests; 5 break checks observed failing; repo checks green; schema + types regenerated.

## 2026-08-19 — M3 P3.3: driver slot claim (journeys) + routes/slots UI

- journeys module: race-safe claim (UNIQUE slot_id), approved-driver+vehicle rule, release
  lock-window, open-for-booking, the driver "available work" board.
- Ops Routes is a real tool: create/publish routes, generate slots, view stops + distances.
- Driver Duty shows real journeys; Driver Work is the real find-work board with claim.
- 155 API / 299 unit / 14 a11y / 5 server green; break checks observed failing.

## 2026-08-19 — Branding single source (centralized)

- packages/brand/brand.json is now the ONE place for name, tagline, logo, font, favicon, browser
  theme and email identity; the web build and the API email templates both derive from it.
- scripts/check-branding.sh fails on a hardcoded brand name/logo in app source (observed failing).
- 306 unit / 155 API / 14 a11y / 47 landing / 5 server green.

## 2026-08-19 — M3 P3.4–P3.6: rider search → boarding → booking (bookings module)

- bookings module + migration 0016 with a database seat guard (no overselling under concurrency);
  fare locked at booking; cancellation returns seats.
- Rider UI is real: routes → boarding → departures → review → boarding code → trips.
- 164 API / 307 unit / 14 a11y / 5 server green; break checks observed failing.

## 2026-08-22 — Audit pass: test drift, CI gaps and doc drift fixed

- The web GUI verify (`./verify.sh`) could not actually run in CI: its scripts were
  committed without the exec bit. All 17 tracked `*.sh` files are now executable.
- Fixed `layout.test.js` drift from the demo-data removal: the sheet list is now
  derived from the live SHEETS registry (never drifts again), fetch is stubbed on
  `file://`, and a wide-table case keeps the scroll-wrapper guarantee measurable.
  Layout was 9 red; now 7482/7482.
- Fixed the break harness: two stale sed edits + a regex grep that could never
  match `[object Object]`. 74/74 breaks caught (was 71 + 3 missed).
- Wired the orphaned axe a11y suite into `pnpm verify` and `verify.sh`.
- Corrected `.env.example` (dead `MAP_PROVIDER_KEY` → real web vars).
- Consolidated the duplicated gap register (`AUDIT_AND_TODO.md` canonical;
  `OPEN_ITEMS.md` is a pointer) and synced README / docs-README / PROJECT_MAP /
  00_MASTER status to the actual code.
- Live smoke test: landing serves, but the deployed web reports `api:"unreachable"`
  and `/v1/*` returns 504 — logged as G-070 (owner action in Railway).
- Verified: `pnpm verify`, `pnpm db:verify`, `apps/web/verify.sh` all green.

## 2026-08-22 — Fix: API crash loop (JourneysModule missing @Global)

- The deployed API had been silently crash-looping: `BookingsService` could not
  inject `JourneysService` because JourneysModule was the one cross-module
  module missing `@Global()`, and the failure was invisible because the app was
  created with `{ logger: false }` (Nest's ExceptionsZone swallows bootstrap
  errors and exits 1). Fixed all four layers: the wiring, the silent logger, the
  logger's Error serialization, and the bootstrap catch's stack output.
- Added a DI-graph compile test (`apps/api/src/app.graph.test.ts`) so any future
  unresolved provider fails CI instead of crash-looping production — observed
  failing for the right reason, then green. 165 API tests total.
- Live API verified again after the fix ships (Railway auto-deploys on push).

## 2026-08-22 — Seamless trips tabs + advanced search (Fuse.js, Arabic+English)

- Fixed the trips-tab "page moves" bug: switching Upcoming/Past no longer re-renders
  the app, refetches, or snaps the scroll — the list is fetched once and filtered
  in place.
- Search now works: Fuse.js (Apache-2.0) vendored into the single-file build with an
  Arabic/English normalization layer (diacritics, alef/hamza/teh-marbuta unified).
  Riders search routes + boarding stops and see bookable journeys nested under each
  route; the ops stops list gets the same live filter; dead search fields on
  "coming soon" screens were removed.
- Fixed a build bug: injecting the library via a string replacement corrupted the
  bundle with `$&` (now a replacement function).

## 2026-08-22 — Policies filled (Terms / Privacy / Safety, EN + AR)

- The policy pages now carry real, generic, editable content (6 sections each, both
  languages) instead of a placeholder sentence; the "final legal wording is the
  operator's" note stays. 338 unit tests green, 77/77 breaks caught.

## 2026-08-24 — Landing story: layered chapters (Ride + Drive)

- Hero is copy + CTAs only (no intro doodles). After it: four full-bleed sticky
  chapters with mesh, orbs, drawing route, giant index — tokens only, reduced-motion
  safe. Drive page uses the same story with driver copy. Unit 350 green.

## 2026-08-24 — Landing v3 (story after hero, no slideshow, no duplicate safety)

- Rider page: hero slideshow removed; floating hero art + sticky story panels sit
  immediately after the hero. Feature grid is one list (schedule, cash, live, save,
  verified drivers, help). “Built to be safe” is gone. Board-by-code stays only in
  How it works. Policies: light cash/wallet polish; still generic + legal note.
- Nav unchanged: Ride · Drive · About · Help. Tokens only; reduced-motion still
  kills motion. Web unit tests 350 green. Browser landing suite [UNVERIFIED] here
  (Chrome shared libs missing in this sandbox).

## 2026-08-22 — Landing v2 (Ride · Drive · About · Help + sticky panels)

- New sticky top bar (Ride/Drive/About/Help, EN/AR, theme, Log in, Sign up) with a
  compact hamburger menu; four marketing pages for riders, drivers, About and a
  Help FAQ; a full-bleed sticky stacking-panels section and a subtle hero parallax
  (native CSS scroll-driven, reduced-motion safe). Policies stay filled (EN + AR).
- Brand name in the new prose is derived from the single brand source (the branding
  guard caught a hardcode during the pass and it was fixed).

## 2026-08-24 — Session start: reality check + CI audit (G-073/G-074/G-075 opened)

- Fresh-clone baseline re-verified locally, all green: `pnpm verify` (repo guards + build +
  typecheck + lint + 165 API + web unit), `apps/web/verify.sh` (a11y 14, layout 7452,
  landing 57, breaks 79/79, layout-breaks 8/8), `pnpm db:verify` (migrations cycle + schema +
  types, against a local schema-carrying Postgres 17). Live: web `/healthz` → `api:"up"`,
  `/v1/healthz` → `db:"up"`.
- **G-073 opened**: GitHub Actions has not EXECUTED since 2026-08-17 ~22:57 — all jobs on all
  later commits fail within ~3s with no logs (Actions minutes/spending exhausted). Proven by
  run timing + missing log blobs + a live re-run on HEAD today failing the same way. Owner
  action required (billing, or public repo — which triggers G-075).
- **G-074 opened**: CI `verify-db` job could never pass on any commit since M1.5 —
  `check-db-types.sh` regenerates types from the EMPTY CI service DB. Reproduced locally.
  Fix planned this session: derive the types check from the migrations' scratch schema.
- **G-075 opened**: going public (to restore free CI) needs the REPOSITORY_STANDARD
  sanitization pass (process/planning/research/investor material is in the tree AND history).
  Inventory + owner MCQ before any visibility change.
- Docs-only change this commit; no code touched.

## 2026-08-24 — G-074 fixed: CI verify-db made CI-proof (types from migrations, not the caller's DB)

- `check-db-types.sh` now builds a scratch database from the migrations and generates/compares
  `db.generated.ts` against that scratch schema. The old version read `DATABASE_URL`'s own
  database — empty in CI — so the job could never pass on any commit since M1.5 (hidden until
  now by G-073's dead CI). Break-observed: staged type corruption → `✗ drifted` (exit 1);
  empty-DB and schema-carrying-DB `pnpm db:verify` both green.

## 2026-08-24 — CI restored live (repo public), Paymob reference R20, verifier fixed (G-076)

- **G-073 CLOSED — the repo is public (DEC-203)** and GitHub Actions executes again: re-run
  on HEAD `2cf3f99` → Verify ✅, Verify database ✅ (first REAL CI run of the G-074 fix),
  Build images ✅, GUI suite ran to completion. Free standard-runner minutes on public repos
  replace the exhausted private-minute budget.
- **R20 — `docs/research/05_PAYMOB_INTEGRATION.md`**: the complete Paymob reference (owner
  request): classic Accept flow with exact endpoints/bodies, official webhook HMAC algorithm,
  sandbox test data, refunds/void/capture, payouts API (M5), the owner account checklist, and
  the env design — incl. `PAYMOB_ENABLED` master flag (DEC-204: Paymob first in the UI, cash
  second; hidden-not-disabled when off).
- **G-076 CLOSED**: the Paymob webhook verifier used the wrong signature scheme (whole-JSON
  HMAC instead of the official 20-field value concatenation). Rewritten + regression guard
  (old scheme now REJECTED by test) + §0.2 break-observed (field-list corruption fails the
  3 signature tests). 168 API tests green.
- Decisions: DEC-203 (repo public), DEC-204 (payment surface) appended; G-075 closed.

## 2026-08-24 — G-077: CI GUI job had a hidden Chrome-cache failure (fixed)

- First real CI GUI run since 2026-08-17 failed with "Could not find Chrome": the pnpm store
  cache (saved by `cache: pnpm`) restores packages as already-built, so puppeteer's
  postinstall — the Chrome download — is skipped on every cached run, and the browser lives
  outside the store (`~/.cache/puppeteer`) so it was never cached. Present since the cache
  was first written; invisible because CI billing was dead (G-073) and the one green GUI run
  (e78f097) predates the cache.
- Fix: the `verify-gui` job now caches `~/.cache/puppeteer` (keyed on the puppeteer pin in
  `pnpm-workspace.yaml`) and installs Chrome explicitly (`puppeteer browsers install chrome`,
  idempotent). Break-observed = the real CI failure above; proof = the next run green.

## 2026-08-24 — Parallel-work split: PATH_A (money) + PATH_B (journey/UX)

- Two agents now work the repo in parallel on non-overlapping paths. The full split —
  exclusive file ownership, append-only protocols for shared files (api.js sections,
  content.js key blocks, migration parity: A=odd, B=even), cross-path contracts
  (payments surface vs bookings surface), git rebase protocol, monitoring duty (A
  reviews B's commits) — lives in `docs/planning/PATH_A_MONEY.md` (Agent A:
  P3.7 wallet/ledger/Paymob, then M5/M6 money, payouts) and
  `docs/planning/PATH_B_JOURNEY.md` (Agent B: P3.8 scan/manifest, P3.9 live journey,
  planner DEC-199, desktop density DEC-200, M4, M7 APK; M8 joint).
- Groundwork: the rider wallet screen moved verbatim from `screens/rider.js` to the
  new `screens/wallet.js` (Path A ownership) so the two agents never share a screen
  file; build.js PARTS registers it. Build 415.9 KB, 349 unit + 14 a11y green.
- CI fully green on `ad5e7e7` and `c092b69` (all four jobs) — G-077 proof complete.

## 2026-08-24 — M3 P3.7 backend: double-entry ledger + payment orders + Paymob (Path A)

- Migration 0017 (Path A odd-numbered): `ledger_entries` (append-only by DB
  trigger — UPDATE/DELETE observed blocked with 23514; each row is a balanced
  debit→credit transfer; classic normalcy: driver_cash/provider_clearing are
  debit-normal assets), `payment_orders` (id IS merchant_order_id;
  provider_txn_id UNIQUE = webhook idempotency), derived `account_balances`
  view. Schema + generated types regenerated; db:verify green.
- Domain (pure, 20 tests): DEC-078 cash sequence (commission split funded by
  the driver-cash liability), wallet fare payment, refund-as-credit,
  over-refund refusal, integer-minor-units invariants, closed-system Σ=0 +
  1,000-random-history property test. My own closed-system test caught a real
  sign-model inconsistency BEFORE any money could move — fixed in both the
  domain and the view.
- PaymentsService + repository + controller: GET /payments/config (boolean
  only), GET /payments/wallet (derived), POST /payments/topup (honest refusal
  when Paymob unconfigured — no order rows), POST /payments/webhook (HMAC
  FIRST → idempotent claim → amount re-check → one-transaction apply; NO
  identity guard — the signature is the auth; rate-limited),
  POST /payments/cash-collected (journey driver only, idempotent),
  GET /payments/driver/earnings; issueCredit contract for Path B's cancel
  flow. PAYMENTS_SELF capability in the ONE resolver. Paymob adapter: real
  live checkout implemented (auth-token cache → order → payment key → iframe,
  R20) with sandbox still refusing honestly; G-078 fixed (normalizeWebhook now
  maps OUR merchant_order_id — regression-guarded).
- Env: PAYMOB_ENABLED / MODE / BASE_URL / IFRAME_ID / WALLET_INTEGRATION_ID /
  COMMISSION_PERCENT (default 0 — owner MCQ pending for the launch value).
- 201 API tests green; three service breaks + the DB trigger observed failing;
  pnpm verify + db:verify green. Wallet UI (P3.7.4) next session (Path A).

## 2026-08-24 — P3.7.4 wallet UI + P3.7 backend audit hardening (Path A)

- Backend audit (mandatory checklist): top-up DTO bounds now import the ONE
  definition (TOPUP_MIN/MAX — no second copy); cash-collected body validated
  (@IsUUID DTO — unvalidated before); unused departs_at column + join dropped;
  authority casts aligned; /payments/config now also carries the top-up bounds
  so the client never hard-codes them; two top-up success/failure-path tests
  added (§0.2 break-observed: pending-on-failure break caught).
- Wallet UI: real balance (derived, backend-truth), history with localized
  reasons and in/out signs, top-up sheet (presets + custom, server bounds,
  Paymob-first DEC-204, opens the provider iframe), honest Paymob-off state
  (§8.1), paymentChoice() embeddable component for Path B's review screen,
  payments client section in api.js, EN+AR i18n (w_* keys + payments.* error
  copy — placed at top level of en{}/ar{} after two placement corrections).
- Tests: 372 web unit (new Path A groups; the old coming-soon assertion now
  asserts the real loader). Break harness: 2 new cases — both observed
  CAUGHT; on the way it exposed a false-positive test (a `.row` selector that
  could never match — Row renders `.rowitem`) which is now a real check, and
  a mid-harness abort leftover (policyTermsX) that was restored. 203 API
  tests, pnpm verify + guards all green.

## 2026-08-24 — Path A: wallet fare payment (atomic) + reconciliation; Agent B monitoring

- Monitored Agent B's first commit (`754ae34` landing v3): ownership respected
  (his files + shared-by-protocol; Path A blocks untouched), merged tree
  `pnpm verify` green locally, CI running on it — no violations, no fixes needed.
- `chargeWalletForBooking` (DEC-204 wallet leg): advisory-locked atomic spend
  (pg_advisory_xact_lock per wallet INSIDE the transaction) so concurrent
  spends can never overdraw the append-only ledger; idempotent per booking;
  driver-earnings accrual via postFareFromWallet; endpoint
  POST /payments/bookings/:id/pay-wallet; contract comment points Path B's
  booking flow at it.
- Reconciliation skeleton (CH06 §6.9, report-only): closed-system Σ=0,
  every succeeded order has postings, no orphan postings, balances view ==
  recompute; GET /payments/reconciliation for manager/super_admin
  (VIEW_ANALYTICS); discrepancies are audited, NEVER auto-corrected.
- Proof discipline (§0.2): empirical parallel-spend proof on the real
  repository (exactly one 900-of-1000 spend lands); deterministic interleaved
  schedule proof — WITHOUT the lock the wallet overdraws to −800 (observed),
  WITH the lock the second spend waits, reads 100, refuses. 209 API tests.

## 2026-08-24 — Monitoring fix: 5 break cases re-anchored after landing v3 (Agent A)

- Agent B's `754ae34` (landing v3) turned CI red — not a product bug: all
  suites green (a11y 14, layout 7455, landing 64), but 5 break cases still
  targeted pre-v3 code (`BROKEN-BREAK`). Re-anchored to v3's actual shapes:
  policy links (new footer construction), stacking panels (numbered
  signature), story-doodle ink (.stackpanel__art color), hero single-
  illustration marker (class rename; the old slidepop case is obsolete),
  herodrift 42s→36s. Each of the 5 observed CAUGHT in a targeted harness
  run; the other 76 cases were green in B's own CI run. Operational rule
  appended to BOTH path files: re-anchor break cases in the same commit.

## 2026-08-24 — Monitoring fix 2: boarding-code break case re-anchored (P3.8)

- Agent B's `841e4eb` (P3.8 scan/manifest/boarding UI) went red on ONE stale
  break case — "booked screen loses the boarding code" still sed'd the
  pre-P3.8 line (`QRPanel({code:b.code})`); the new screen renders
  `QRPanel({code:String(b.code)})` inside `if (b.code)`. Re-anchored and
  re-proven CAUGHT. My earlier fix (`af2b495`) was green; this restores main.

## 2026-08-24 — B2 DEC-199 A→B planner (Path B)

- Rider can pick start + end stops; `planJourneys` ranks published routes
  whose boarding stop is near the start and whose line (later stops or
  segments) passes the end (alight-anywhere, DEC-140). Walking has no
  ceiling (DEC-064/134) — distances are shown honestly.
- 2-leg mixes (DEC-135) only when they beat the best single-leg by a
  clear margin. Selecting a plan opens the real departure list with the
  recommended boarding stop pre-chosen.
- P3.9 miss: rider live screen now polls ≥15s with error backoff and
  pauses while the document is hidden (GUI §15).

## 2026-08-24 — B3 DEC-200 desktop density (Path B)

- Control is `:root` tokens in `apps/web/src/styles/shell.html`, not Chrome
  zoom (zoom stays user-controlled). `--density:comfortable` on touch;
  `@media (min-width:840px)` switches `--density:compact` — type, tap,
  rail, spacing and `--content-max` at ~90% of the touch scale (the look
  the owner preferred at 90% browser zoom). Phone 44/56 and `--f-input:16`
  stay on `:root`.

## 2026-08-24 — R21 maps: research + the ONE RouteMap primitive (Path A)

- Owner asked where maps appear and requested Uber/Careem/Swvl best-practice
  research. Findings + design: docs/research/06_MAPS_UX.md (list-primary
  route-line maps for our fixed-route model; Uber's one-primitive/layer
  discipline; accessible alternative mandatory).
- `apps/web/src/lib/map.js` — RouteMap({stops, highlightStopId, vehicle}):
  data-bound route polyline + numbered stop markers on real tiles
  (Leaflet/OpenFreeMap default, Google branch parallel), boarding stop
  highlighted, optional live-vehicle marker (real progress data only),
  fit-bounds camera, honest illustration fallback, and the numbered stop
  LIST as the accessible non-map path. Registered in build.js PARTS.
  Styles: .mapstops tokens (reuses existing .chip--brand). i18n m_* EN+AR.
- Violation fixed on the way: the Google branch of realMapView drew a
  HARDCODED demo polyline (§8 no-demo-data) — removed; route drawing now
  exists only in RouteMap, data-driven.
- Tests: 404 unit (RouteMap group: ordered list, aria-hidden numbers,
  boarding chip, empty-data honesty, no-highlight, i18n parity both
  languages); token guard CAUGHT my colour-literal fallbacks before push
  (fixed to token chains); break case "RouteMap loses its accessible stop
  list highlight" observed CAUGHT. pnpm verify green, all guards clean.

## 2026-08-24 — B4 M4 safety & support (Path B)

- New `support` module: incidents (SOS + reports), legal state machine,
  share-my-ride tokens. Migration **0020** (even).
- Rider/driver SOS creates an incident that cannot be dismissed without a
  decision (CH12). Silent mode supported. Share link is public, limited
  fields, expires, blanks position when the journey ends.
- Support/ops ticket queue: investigate → decide with a mandatory reason;
  reporter is notified of the outcome. No mock phone calls.

## 2026-08-24 — B5 P7.1 Capacitor shell (Path B)

- `packages/platform` — one Platform interface (GPS / share / storage).
  Screens never import `@capacitor/*`. Runtime uses `window.Capacitor` only
  when the APK WebView injects it; deleting android/ leaves web working.
- `apps/mobile` is a real package: builds the web HTML into `www/`+`dist/`,
  serves `/healthz` + the same UI + `/v1` proxy so Railway's auto-imported
  `mobile` service is no longer an empty crash-loop.
- `apps/mobile/Dockerfile` pins `PROJECT=mobile` (root-context monorepo build).
- Guard: `scripts/check-platform-boundary.sh` + §0.2 break in
  `apps/mobile/tests/breaks.sh`.
- Checklist: `docs/process/checklists/M7_capacitor.md`. P7.2–P7.6 remain
  tracked, not stubbed.


## 2026-08-24 — DEC-206 live: the Uber-style planner search (Path A)

- The A→B planner input is now a SEARCH: typeahead from the first character
  (instant, local, AR/EN normalized — no network), Google-Maps-snappy list
  under the field (combobox ARIA, ↑/↓/Enter/Esc, aria-activedescendant),
  "Where to?" + Start fields, "Use my location" (geolocation → nearest stop),
  and the MAP as live context: every indexed stop a quiet dot, matches LIGHT
  UP while typing and the camera fits them, chosen stops pin, and tapping
  the map picks the NEAREST stop for the focused field (our model boards at
  stops — the pin snaps honestly). Results reuse B's planJourneys engine and
  cards untouched (§0.3) + the recommended route annotated via RouteMap.
- New file screens/planner.js (Path A); riderPlan() delegates (tagged);
  SearchMap added to lib/map.js on a shared createBaseMap factory (ONE tile
  implementation); 14 p_* i18n keys EN+AR. Honest fallback: no SDK →
  illustration + the list (nothing dead, nothing invented).
- Tests: 448 unit (13 new planner assertions: EN+AR filtering, combobox
  semantics, aria-selected active option, pick/focus close, nearestStop
  pure, engine hand-off, i18n parity). Break case "planner loses its
  combobox semantics" observed CAUGHT. pnpm verify green.

## 2026-08-24 — fix: planner map fallback escaped its box by 13px (CI-caught)

- The CI layout suite caught the planner page at 320px: the illustration
  fallback's decorative zoom transform (`.mapbox--zoom .mapsvg{scale(1.22)}`)
  made the <svg> element's rect escape the window (the suite measures element
  rects; only auto/scroll containment exempts). Inside the map primitives
  (RouteMap/SearchMap) the fallback is now strictly 100%×100% with the
  transform off — selector specificity raised to actually win against the
  later zoom rule. Verified with the suite's own measurement locally
  (widest=0 at 320×568 on rider/plan).

## 2026-08-24 — Batched audit of Agent B's session commits (DEC-207)

- Audited B's run (P7.2 outbox → P7.4 GPS → admin overview → release pipeline).
  Ownership clean everywhere; merged verifies were green at each of my pushes.
- Two real defects found and fixed forward (session-end batch, per DEC-207):
  1. `df06941` CI red — the SAME 13px planner-map overflow, because B's push
     landed between my planner feature and my containment fix; already cured
     by `84ca1f8` (verified: my run is green on that check).
  2. NEW "Android Play AAB" job failed on EVERY push: `make-release.sh` had
     an indented heredoc terminator (`PY` not at column 0) → "syntax error:
     unexpected end of file" — the script never ran once. `bash -n` catches
     this instantly; terminator fixed, script now parses. Standing lesson
     recorded for B: syntax-check shell scripts before pushing.

## 2026-08-24 — Phase 1a maps shipped: RouteMap everywhere it matters + live fleet (Path A)

- GET /journeys/live (VIEW_LIVEMAP): in-progress journeys with route, ordered
  stops and last position — read-only, map-purpose, tagged. Authority test
  added (ops yes / rider no).
- Embeddings (all tagged `RouteMap (DEC-205 Path A)`): rider BOARDING (route
  line + numbered stops, chosen stop highlighted), rider REVIEW (boarding stop
  highlighted), DRIVER JOURNEY (the line + the driver's real last position as
  the vehicle dot; the map is context — scan/manifest work without it), OPS
  LIVE MAP (real fleet dots from journeys/live on live tiles; honest empty
  state "no vehicles moving"; vehicle table stays).
- SearchMap grew a `vehicles` prop (real positions only). i18n m_fleet/m_noLive
  EN+AR. Tests: 242 API + 455 web unit green; the 320px overflow audit probe
  (the exact suite measurement that caught the planner) run locally on every
  touched page — widest=0 everywhere before push.

## 2026-08-25 — Super-admin GUI + native APK boot

- Audit pager only after the table; compact buttons from --tap-sm.
- Settings is two-column, labelled Settings, email-verification toggle, no Railway banner.
- Stops are a route property (no independent Stops page).
- Native shell never opens the marketing landing; splash → sign-in.
- APK talks to the public web origin so AUTH_OTP_BYPASS matches the website.
- Launcher icons still painted from packages/brand (same source as the favicon).

## 2026-08-25 — Native live HTML + token-safe status bar

- Installed APK loads the first-party Railway site on each launch (UI updates without a new APK).
- StatusBar colour reads --ink-950/--ink-0 (check-tokens).

## 2026-08-25 — Ops/super-admin black screen + live role

- Map API role `operations` to UI nav `ops` (black screen). Other staff navs unchanged; super_admin still has every existing tool.
- Guard + /me use the live DB role; changing a staff role revokes their sessions.
- Staff desk is form+table; route create opens the map pin screen; landing Get-the-app CTA; download is two columns.
