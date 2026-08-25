# Mobile (Capacitor, DEC-176)

The Railway **`mobile` service is an app API, not a website.** `/` is JSON 403.
The APK proves itself with HMAC headers, then calls `/v1/*` (proxied to the
private Nest API) and OTA (`/v1/mobile/update`, `/v1/mobile/bundle`).

Screens never import `@capacitor/*` — they call `Platform` (`packages/platform`).

## How it works

```
[ rider / driver phone ]
        │
        │  installed APK  (Capacitor Android project)
        ▼
  WebView loads www/index.html   ← a copy of the web build, baked in at APK build time
        │
        │  /v1/*  (same origin as the WebView’s start URL, or the live API via the
        │          web/mobile proxy — same contract as the browser)
        ▼
  Railway  api  +  Postgres
```

- **Browser** (ride-share web URL, or the Railway `mobile` URL): always the
  latest deploy. Refresh = new UI.
- **Installed APK**: local `www/index.html` splash, then (when online)
  `location.replace` to the Railway **`mobile`** public origin — not the
  website. Intro slides live on that origin so they can change without a
  new APK. Set `MOBILE_PUBLIC_ORIGIN` (GitHub Actions variable + Railway)
  to the mobile service's Generate Domain URL. The native shell (icon,
  permissions, plugins) still needs a new binary when those change.

## Do website updates auto-update the APK?

| Surface | Auto-updates when you push `main`? |
|---|---|
| Web (Railway `web`) | **Yes** — next page load |
| Railway `mobile` URL (browser) | **Yes** — same HTML server |
| Installed APK / future iPhone app | **No** — new binary (Play / TestFlight / sideload) |

API/data changes (routes, bookings, SOS) apply immediately: the APK talks to
the live API. Only **UI and client logic** baked into the APK stay old until
you rebuild.

## How to get an APK

### A. GitHub Actions (no Android Studio)

Every push to `main` runs the **Android debug APK** job.

1. Open https://github.com/Ahmed-Sleem/ride-share/actions
2. Open the latest green **CI** run → **Android debug APK (Capacitor)**
3. Download the artifact `ride-share-debug-apk`
4. On the phone: allow “install unknown apps”, open the `.apk`

This APK is **debug-signed** (fine for you, drivers in a closed trial, QA).
It is **not** a Play Store release (P7.6: upload key in GitHub secrets, never
in git).

### B. Your machine (Android Studio / SDK)

```bash
pnpm install --frozen-lockfile
export ANDROID_HOME=...          # or ANDROID_SDK_ROOT
bash apps/mobile/scripts/make-apk.sh
# → apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Signing keys never enter git.

## iPhone later

Capacitor supports iOS the same way (`npx cap add ios`). We **do not ship
iPhone in P7** (DEC-176: Android first). When you want it:

1. Apple Developer Program (~$99/year)
2. A Mac with Xcode
3. `npx cap add ios` + `cap sync` — **same** `www/` and `Platform` code
4. TestFlight, then App Store

The rider/driver UI is not rewritten. The DEC-176 gate (P7.4 background GPS)
is Android-first; if Capacitor background location fails the bar, **only the
driver app** may move to React Native — riders stay on Capacitor, including
iPhone.

## Railway `mobile` service

Auto-import used **Railpack** on the monorepo root (no root `start` → red).
Fixed: root `start` / `index.js` / `railpack.json` boot `apps/mobile/server.js`.
Optional: switch that service to Dockerfile `apps/mobile/Dockerfile`.

Variables: same as `web` (`PORT`, `API_INTERNAL_URL`, maps).

## Remaining M7 points (not half-built)

See `docs/process/checklists/M7_capacitor.md`: P7.2 outbox, P7.3 camera,
P7.4 background GPS, P7.5 push, P7.6 Play signing.
