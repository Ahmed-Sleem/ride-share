# Task 3 — the inbox that already has a server (notifications)

Owner's brief for you, 2026-09-08, after round 18. Work on `main`. Read `AGENTS.md`,
`docs/process/AUDIT_AND_TODO.md` (the G register), `docs/planning/APP_GUI.md` §15–§19, and
`docs/planning/APP_GUI_CHECKLIST.md` before you type anything. This task is **front-end only**.

Do Task 2 (maps) first and let it land. This task must not touch `src/lib/map.js`,
`apps/web/vendor/**`, or `loadMapsConfig()` in `src/shell/app.js` — those are Task 2's files and
a change in both of your trees at once is how two careful people produce one incoherent merge.

## The finding, in order, with the numbers

Everything below was measured in this repo today, not assumed.

1. **The client function exists and nobody calls it.** `apps/web/src/lib/api.js:255` is
   `myNotifications: () => API.request("GET", "/notifications/mine")` and `:254` is
   `registerDevice: (token, platform) => API.request("POST", "/notifications/device", …)`.
   Grepping `myNotifications` across `apps/web/src` returns **one** hit: its own definition
   (`lib/api.js:255`). It has never been called. So the request half of an inbox already exists in
   the client and the screen half does not. (`registerDevice` is the opposite case — step 4: that
   one *is* wired, and you must not wire it again.)
2. **The server answers.** `apps/api/src/modules/notifications/api/notifications.controller.ts`
   has exactly two routes, both `@UseGuards(IdentityGuard)`:
   - `GET notifications/mine` → `assertCan(actor.role, Capability.MANAGE_OWN_ACCOUNT)` then
     `notes.forUser(actor.id)`.
   - `POST notifications/device` → `registerDevice(actor, token, platform||"web")` (the body DTO
     is `{ token: string (MinLength 8), platform?: string }`).
   Nothing else. No unread count endpoint, no mark-read endpoint, no SSE, no websockets.
3. **The row you will receive** (`apps/api/.../infra/notifications.repository.ts:38-45`, verbatim SQL):
   `SELECT id, user_id, kind, title_en, title_ar, body_en, body_ar, ref_type, ref_id, read_at, created_at`
   `FROM in_app_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`.
   So: newest first, **hard-capped at 50**, `read_at` is `null` until something writes it (nothing
   in this repo does), and the text is split `*_en` / `*_ar` — never render `title_en` to an
   Arabic reader.
4. **What the app shows about notifications today** is a *preference*, not an inbox:
   `apps/web/src/screens/rider.js:603` and `apps/web/src/screens/admin.js:36` each render
   `Row({icon:"bell", title:t("notifications"), right:switchEl(true)})`, and `rider.js:689` wires
   that switch to `aria-checked`. Meanwhile `src/data/content.js:108-110` tells the user that
   support, live SOS and in-app reporting "arrive with safety & support (M4)". A person reading
   that copy has no reason to believe there is anything to read.
5. **Why this is the right next thing**: it needs no new server code, no new secret, no
   keystore, no native binary, no third-party dependency — the three things that are actually
   blocking other features (A2 keystore, D-8.19 `MOBILE_DEVICE_TOKEN_KEY`, Task 2's map vendor) are
   all irrelevant here. It is the largest visible "the app is finished" gain per line of code in
   the register today, and it is the one feature that makes the *rest* of the app legible (a trip
   notification that opens the trip, a booking receipt that opens the wallet).

## What to build

Six steps. Each one ends with a command you ran and its output in your report — a number, not a
description. If a step's gate does not run, the step is not done.

### 1. A store, not a fetch sprinkled through a screen — `apps/web/src/lib/notes.js` (new file)

- One exported object with `list()`, `unread()`, `open(id)`, `refresh()`, `subscribe(cb)`.
- `list()` calls the existing `myNotifications()` client. **Do not add a second request helper.**
- Language selection belongs here, once: pick `title_ar`/`body_ar` when the document is `dir=rtl`,
  else `title_en`/`body_en`, and fall back to the other language when the chosen one is empty
  (an unset `body_ar` must not print as a blank row).
- Unread state: `read_at` is authoritative when present. There is **no** mark-read endpoint, so
  keep the on-device ledger in `localStorage` under one key (`rs.notes.read`, an array of ids,
  capped so it cannot grow forever) and treat a row as read when `read_at || ledger.has(id)`.
  Say so in the UI in one honest line (see the ADMIT rule in `tests/unit.test.js` — the phrase
  must state the limit, not hide it): read state lives on this device.
- Failure is a state, not an exception. `401`/`403` → the person is not signed in with a role that
  owns notifications; `503`/network → "not reachable"; a malformed payload → "not readable".
  Each gets its own copy and a retry control. Never an empty list, because an empty list is a
  claim that there is nothing to see.
- `refresh()` must not stack. One in flight at a time; a second call while one is running resolves
  to the same promise.

### 2. Poll like a guest on someone's phone bill

- Fetch on open, then on a timer **only while the tab is visible**: pause on `visibilitychange`,
  resume on becoming visible, and refresh on `online`. A background tab must never hit the API.
- Interval 60 s with ±10% jitter (many devices, same server, same second is a self-inflicted
  spike). Exponential backoff on failure (60 → 120 → 240, ceiling 15 min), reset on success.
- No request at all when `location.protocol === "file://"` **and** there is no configured origin —
  the local boot is a first-class surface here; look at `loadMapsConfig()`'s early return for the
  pattern, and at `apps/mobile/scripts/build.js`'s `__RS_PUBLIC_ORIGIN` tag for how the app knows
  where its API is. A `file://` preview that spams retries is a defect, not a demo.
- `subscribe(cb)` must return an unsubscribe, and the screen must call it on teardown. A listener
  that outlives its screen re-fetches forever; `tests/unit.test.js` will catch it only if you
  write the assertion (step 5), so write it.

### 3. The screen — `apps/web/src/screens/notes.js` (new file), registered in `PAGES`

- A plain list: newest first, `role`-less `<ul>`/`<li>` (a `list` role on a `ul` is a duplicate),
  each item a `<button>` with `min-height:var(--tap)` and `gap`s from the spacing scale — the
  renewal's rule is that a screen never invents a pixel value that a token already owns.
- One row shows: title (bold when unread), the body clamped to 2 lines, a human date, and a kind
  label derived from `kind`
  (`N-S…`/transactional, `N-R3…`/behavioural, `N-R4…`/promotional — see
  `apps/api/src/modules/notifications/domain/tiers.ts:21-26`, which is the only place that
  mapping exists; do not re-derive it differently).
  **Dates have an idiom already — use it.** `screens/admin.js:225` and `screens/wallet.js:55` do
  `d.toLocaleString(S.lang === "ar" ? "ar-EG" : "en-GB", { … })`, which is also how Arabic digits get
  decided, so an absolute date is a one-liner with the behaviour the app already has. There is **no**
  relative-time helper anywhere in `apps/web/src` (0 hits for `timeAgo`/`relativeTime`), so if you
  want `"4 m"` you write it: in `lib/`, locale-aware the same way, handing over to the absolute form
  after 24 h, and tested at the boundary (yesterday 23:59 must not read as "1 m").
- **Unread must not be colour alone.** A 6 px dot *plus* the row's `aria-label` naming "unread" is
  the pattern this codebase already uses for status.
- Tapping a row marks it read (locally, and via the ledger) and routes on `ref_type`/`ref_id`:
  `trip` → the trip/bookings screen with that id, `wallet` → `screens/wallet.js`, `support` → the
  support row, anything unknown → the inbox stays open and the row says "no screen for this yet"
  rather than navigating to a blank page. Route through the existing `S.page`/`S.stack` path; a
  `location.hash` jump breaks the app shell's own history handling.
- Empty state is a real sentence ("Nothing yet — trip updates, receipts and support replies
  arrive here"), with the same retry control as the failure state. Full state gets a
  "Mark all as read" control; when the server returns 50 rows, the footer says the list shows the
  50 most recent (that is the truth of the SQL and it must be the truth of the UI).
- The bell entry goes in the **nav item**, not the head. Rounds 17/18 are the head's contract:
  `border-bottom:1px solid transparent` on `.topbar`, painted to `var(--line)` only under
  `.main.is-rolled`, `--head-t`/`--head-b` as its air, and the rail travelling on
  `--rail-in-dur/--rail-in-ease`. Do not touch those rules — `unit.test.js` and `layout.test.js`
  compare the head's line to the bottom menu's *as an equality*, so an "improvement" there fails
  the suite and rightly so. If you want a count visible on the bar, put it in the existing
  `.navitem__label`/badge of the rail item (the same component serves phone and desktop).

### 4. What already exists, and must not be duplicated

- **Push registration is done.** `lib/components.js:91-95`: once the auth path settles,
  `if (typeof Platform !== "undefined" && typeof API.registerDevice === "function")` calls
  `Platform.registerPush()` and posts the token, `.catch(() => {})`. In a browser `Platform` is
  undefined so nothing happens — which is the correct behaviour: no service worker, and no promise
  of a notification that will never arrive. Do not add a second registration and do not surface
  push to a web user.
- **There is a local reminder channel: `LocalAlarm`**, in the same file
  (`LocalAlarm.restore({ onFire: (item) => { S.page = item.page || "waiting"; render(); } })`). An
  inbox row that deserves a device-side nudge goes *through* that API — never a `setTimeout`, never
  a second scheduler — and anything scheduled has to survive a cold start, which is what `restore`
  is for. If you use it, test the restore path in `unit.test.js`.
- **Do not invent a mark-read endpoint.** `apps/api` answers `GET notifications/mine` and
  `POST notifications/device` and nothing else; a `PATCH` that 404s behind a swallowed `.catch` is
  the G-110 / G-115 / G-125 shape — a green run over something that never happened. The on-device
  ledger from step 1 is the honest design *because the UI says so*.

### 5. Tests, appended — never replacing one

- `apps/web/tests/unit.test.js` (new `group(...)` at EOF): the store's language choice (ar vs en
  with an empty `body_ar`), the read ledger capping, `refresh()` dedup, `subscribe()` unsubscribe
  actually unsubscribing, `kind` → tier mapping matching `tiers.ts`, and a `503` rendering the
  not-reachable state with its retry control rather than an empty list.
- `apps/web/tests/layout.test.js`: the list at 320/390/599/840/1280 — no horizontal overflow,
  tap targets ≥ `--tap`, 2-line clamp actually clamping (measure the box, do not trust CSS), and
  the badge's text included in the accessible name.
- `apps/web/tests/breaks.sh`: **append** at least 5 cases, each seen red before you call it done.
  Name the assertion that *detects* the mutation — a case that deletes a rule cannot fail a guard
  that reads a token (that exact mistake cost a round here yesterday). And remember the harness
  now reports `MISSED-BUILD`: if your `sed` produces source that does not compile, the case is
  invalid, not the guard weak. In BRE, literal `( ) { }` need **no** backslash; `var\(--line\)`
  matches `var--line`, never the parens.
- `apps/mobile/tests/breaks.sh` is yours (D-8.14). If the store's origin rule deserves a device-side
  case — a `file://` boot that never reaches `/v1` — add it there, append-only, same accounting.

### 6. Docs, in the same commit

- `docs/process/CHANGELOG.md`: a new entry at the top, the way round 17b/18 write them — what the
  owner asked, what you measured, what changed, what the guards now pin. Numbers, not adjectives.
- `docs/planning/APP_GUI_CHECKLIST.md`: the next free `D-8.2x` row (the register's last one is
  D-8.24), checked only when its gate is green.
- If a claim in `AUDIT_AND_TODO.md` changes state, move the row's status and append one evidence
  sentence. Never open a G row for a preference; never close one without a command output.

## What "done" means

```bash
cd apps/web && bash verify.sh            # build → unit → a11y → server → layout → landing → breaks
cd . && bash scripts/verify-repo.sh      # exec bits, tokens, branding, boundaries, secrets
git status --porcelain                   # empty after the runs
```

`verify.sh` runs `breaks.sh` unless `RS_SKIP_BREAKS=1` is set — the CI job sets it, so **your run
must not**: a green run with the break suite skipped is not green, it is unfinished. Paste the six
numbers (unit / a11y / server / layout / landing / breaks) in your report, plus the count of cases
you appended and the red output you saw for each before it went green.

House rules that are not negotiable:

* Touch `apps/web/**` (plus `docs/`). No `apps/mobile/**` product code, no `packages/brand/**`,
  no CI YAML. **Consequence you must plan for:** shipping a GUI change to an installed phone needs
  `packages/brand/brand.json`'s `version.code` bumped *and* a push that touches `apps/mobile/**`,
  because the mobile service's Railway trigger is path-filtered to that directory (D-8.22, measured:
  three `apps/web`-only pushes left `versionCode 7` stuck for half an hour; a push touching
  `apps/mobile/tests/` moved it to 8 in under a minute). Do not do either yourself — put
  `needs: version.code bump + mobile redeploy` in your commit body and the agent lands both at
  review. Without it your inbox is correct in `main`, in CI and on the web, and invisible on every
  phone, which reads as though you did nothing.
* `apps/web` tests read the **built** artifact. Edit a source file, rebuild, then believe the run.
  A round here was spent debugging a stylesheet that no longer existed because the artifact was
  stale — do not repeat it.
* Behaviour is proven through the user's entry point. A guard that pokes an internal function, or
  sets a class itself instead of clicking the control, certifies the cascade and not the app: that
  is how a `transition` shipped in round 17 that could never fire, because the button that
  triggered it rebuilt the node (G-125).
* No `server.url` in the Capacitor config; the local-boot + OTA architecture is guarded, and a
  misconfiguration must never lock installs out.
* Never overwrite a long doc wholesale — edit with anchors and assert the anchor matched. Several
  aborts here came from anchors remembered instead of read from the file.
* Screenshots are not evidence; a number in a failing assertion is.
* If you add anything the person can read, both languages, in the same commit. The parity guard is
  `unit.test.js:2106` ("Both languages, every key, checked as a SHAPE"), and note *why* it exists: a
  missing string does not throw — `t()` falls back to printing the raw key (`data/content.js:20`),
  so a half-translated feature looks like a working one with `notes.markAllRead` on screen.

## Two things you will be tempted to fix that you must not

1. **The head's edge and the rail's travel.** They are the owner's words, twice over: the bottom
   menu's plain `1px var(--line)`, the head's same rule only while content is under it
   (`.main.is-rolled`), and a 470 ms / damping-ratio-0.65 spring on the rail that overshoots the
   open width by 6.7% and settles — with a 190 ms non-overshooting fold-away and no motion at all
   under `prefers-reduced-motion`. `APP_GUI.md` §16 and §19 record why a gradient fade was tried
   **and rejected**, and the script that regenerates the spring, so nobody re-invents either.
2. **Faking a mark-read endpoint.** `apps/api` has two notification routes; a third would need
   the API owner and a migration. The on-device ledger is honest *if the copy says so*. A
   `PATCH` that quietly 404s behind a `.catch(() => {})` is the kind of thing this repo has a
   register entry for (G-110, G-115, G-125 are all the same shape: a green test over a thing that
   never happened).
