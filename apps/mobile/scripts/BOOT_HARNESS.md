# Boot harness — `verify-boot.js` (D-8.11)

> The only test in this repo that reads a **screen** instead of a file.
> It answers one question and it answers it on every push: *when a phone opens the app for the first
> time, does it get an interface?*

## Why it exists

Two bugs passed the entire suite and were only caught by hand:

| | what happened | why no test saw it |
|---|---|---|
| **G-114** | the installer's boot page was baked with the wrong server address | every test read `www/index.html` as text; text is fine, the *pairing* of page ↔ origin was the bug |
| **G-115** | the mounted bundle's `__RS_ORIGIN` tag was missing, so the app dialled `https://localhost` (the WebView's own host) where nothing answers | the page mounted correctly — the failure appeared one step later, inside the running app |

Both live in the seam between three artifacts (`apps/mobile/www/index.html`, the served bundle, and the
origin baked at build time). Nothing in a unit test crosses a seam.

## What it asserts

| check | pass means | fail means |
|---|---|---|
| **live** the boot page mounts the app | `#root` has children, `#offline` is not shown | offline card, white screen, or a page crash (each reported separately, never merged) |
| **advertised identity** | the harness's own service advertised the bundle that mounted (`versionCode` + `sha256` from `/v1/mobile/update`) | a different bundle is on screen than the one the service claims |
| **dead** the same page with an unreachable service shows the offline card | the tester gets a reason, not a spinner | a silent or invisible failure |

The third row is the one that makes the first row honest. Measured while building this: serve the OTA
app HTML *as* the boot page and the positive check passes happily — only the negative control fails.
A success-only harness would have shipped the wrong file and congratulated itself.

## Files

| path | role |
|---|---|
| `scripts/verify-boot.js` | the driver: mints a cert, starts the front door, drives Chromium, reports |
| `scripts/boot-serve.js` | the front door: serves the boot page over TLS, proxies `/healthz` + `/v1/mobile/{update,bundle}` to a real `server.js` |
| `scripts/lib/boot-assert.js` | the state machine (`app` / `offline` / `pending` / `error`), shared by driver and tests — one definition of "did it boot" |
| `tests/boot-assert.test.js` | the state machine's edge cases + proof that each front-door guard actually fires |

## Running it

```bash
node apps/mobile/scripts/build.js            # the file the installer carries must exist
node apps/mobile/scripts/verify-boot.js      # ~2 s: live mount, identity, offline control
```

Useful switches (`--url` to point at a deployed service, e.g. `--url https://ride-sharemobile-production.up.railway.app`
will not work — that host answers no `/`, so the harness exists; use it against a staging front door you own).

## Deliberate choices (and the traps they avoid)

- **TLS with a throwaway cert.** Chromium has no `crypto.subtle` on an insecure origin, and the boot page
  hashes the bundle before mounting it. Plain http would fail the sha check and report a product bug that
  is not there. The cert is generated per run into a temp dir and deleted.
- **The page is served over `https://boot-live.test.invalid:<port>`, mapped to 127.0.0.1, not over
  `http://localhost`.** Both are potentially trustworthy origins for Chromium (so `crypto.subtle` exists in
  either, which is the constraint that ruled plain remote http out). The alias wins for one reason: the
  front door and the API it proxies share that origin, so the boot page's two fetches are same-origin and the
  run measures the boot path — not `otaCors`, which `apps/mobile/tests/server.test.js` already covers. A
  `localhost` page dialling a different port would have been a CORS test wearing a boot-test costume.
- **`--host-resolver-rules=MAP boot-live.test.invalid 127.0.0.1, MAP boot-dead.test.invalid 127.0.0.1`** and
  *not* `MAP * ~NOTFOUND, EXCLUDE …`: the catch-all swallows the mappings that follow it and the run dies
  with `ERR_NAME_NOT_RESOLVED`, which reads exactly like "the service is down". Found the hard way.
- **`waitUntil: "domcontentloaded"`, never `networkidle`.** A successful boot ends in
  `document.open()/write()`, which throws the boot page's DOM away; an idle-waiting harness can settle
  *after* the app has come and gone and call it a timing failure.
- **The service runs with `API_INTERNAL_URL=""`.** This harness boots an interface; it does not sign anyone
  in. The log line "api proxy: DISABLED" is the expected state.
- **The page is never edited by the harness** except the one bake `scripts/build.js` also performs
  (`window.__RS_PUBLIC_ORIGIN`). If the bake cannot be applied, the front door stops rather than testing a
  page no phone will ever load.

## The break-it-on-purpose switches

They exist so the guards can be *proven*, not so anyone can quietly weaken a run (each is asserted by
`tests/boot-assert.test.js`; CI never sets them).

| switch | what it does |
|---|---|
| `RS_BOOT_KEEP_ORIGIN=1` | ship the page with whatever origin it was baked with — the way to prove a mis-baked origin (G-114's bug class) reddens the suite |
| `RS_BOOT_ALLOW_APP_PAGE=1` | lift the "that is the APP, not the boot page" refusal — the way to prove the refusal fires |
| `RS_BOOT_BAKE_ONLY=1` | run every input check and print the result without binding a socket — how the guards are unit-testable at all |
| `RS_BOOT_PORT` | base port (the driver adds +1/+56/+57 for the other sockets, so parallel runs must not share a base) |
| `--live-only` | skip the negative control; for local poking only, never for CI |

## How a boot actually dies (from the two we have had)

1. **Origin wrong or absent** → the page never reaches a service → offline card with "not given a server
   address" or a connection error. Check the `__RS_PUBLIC_ORIGIN` bake in `scripts/build.js`.
2. **The bundle mounts, then stops** → the app inside the bundle is dialling somewhere else, or the bundle's
   own first request fails. Check the `__RS_*` tag block `build.js` injects, and the RENDER_BLOCKING guard.
3. **The sha check rejects a good bundle** → `dist/www/index.html` changed after `/v1/mobile/update` computed
   its advertised sha (i.e. a commit that is not the one the service is serving). Re-run `build.js`; the fix is
   in the *pairing*, not in the check.

In all three, the tester's screen is the same card. That is why the harness prints the reason line it
observed, and why the reason line is part of the failure message in CI.
