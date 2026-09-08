# Device checklist — permissions, signature, system bars (round 20)

One page, one phone. Nothing here needs a laptop except reading a log line.
What it is for: everything in this list is a thing that **cannot be proven from the repo** — it lives in
the installer, in Android's permission system, or in how a band of pixels looks at 3 am on a real device.
Every item names the change that made it worth checking, so a fail tells you which commit to read.

**How to run it:** install, then walk the list top to bottom. Mark each line ✓/✗ and send me the ✗ ones
with one sentence each. Do not "clean up" between items — the point is what one install gives you.

---

## A. The one-time signature migration (D-8.18 / A2)

The landing page's installer used to be a **debug** build: its signing key was re-created on every CI
runner, so two builds of the same version could not replace each other. The four `ANDROID_KEYSTORE_*`
secrets are set now, so the next CI build is **release-signed with one key forever**.

- [ ] **A1.** Uninstall the old app, then install the new APK from `/download/android`. *The first move
  from debug-signed to release-signed is one unavoidable uninstall — after it, no update ever asks again.*
- [ ] **A2.** Open the app **once with Wi-Fi and mobile data off**. You should get the boot page saying to
  check the connection — not a system error page, not a blank white screen. *(The local-boot
  architecture: `www/` holds the boot page, the app itself arrives over the air.)*
- [ ] **A3.** Turn the network back on, log in, then change **nothing** on the phone and update the web
  side (`version.code` bump). Next cold start shows the new GUI **without reinstalling**. *(Proves the
  split still holds after the signing change.)*

## B. Location permission (measured, not assumed)

Capacitor 8.5.1's own `BridgeWebChromeClient` catches the WebView's geolocation request and raises the
Android dialog for `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION`. Our `apply-android-manifest.sh`
declares both. So: no permission at install time, one dialog on first real use.

- [ ] **B1.** In the app, go to Plan a ride → *Use my location*. You should see Android's **"Allow
  ride-share to use your location?"** dialog with **Precise / Approximate** choice. If no dialog appears
  and it silently says *Location unavailable*, tell me — that would mean the prompt path is broken.
- [ ] **B2.** Tap the map's **Locate me** button on a screen that has a map (rider pick-up / driver route).
  It must behave like B1: ask once, then work.
- [ ] **B3.** Say **Don't allow** on B1, then use it again. Expected today: the button answers with the
  honest *"Location unavailable"* toast and nothing crashes. What must NOT happen: a spinner that never
  ends, or a re-prompt on every tap.
- [ ] **B4.** Deny, then go to **Settings → Apps → ride-share → Permissions → Location → Allow only while
  using the app**, come back to the app and retry. It should now work with no reinstall. *(This is the
  recovery path the web layer cannot do for you.)*
- [ ] **B5.** Choose **Approximate** only. Android 12+ reports coarse, and Capacitor passes it through —
  so the planner should pin the nearest stop from an approximate position rather than fail. *If
  Approximate fails outright, note it: that is a known WebView weak spot.*
- [ ] **B6.** Same test in the **browser** (Chrome on Android, the site URL): the browser's own permission
  prompt, and after "Block", the little left-of-URL icon lets you reset it. The app and the web are two
  separate permission states — that is normal, not a bug.

## C. Camera / QR (G-127 — arrives with this installer)

`@capacitor-mlkit/barcode-scanning` ships an **empty** Android manifest and, when `CAMERA` is not declared,
its `requestPermissions()` answers `checkPermissions()` instead of prompting: a silent *"denied"*. Our
patch now declares `CAMERA` and adds the `com.google.mlkit.vision.DEPENDENCIES = barcode_ui` meta-data.

- [ ] **C1.** If the driver's *Scan QR* path exists on this build: tapping it must raise Android's **camera
  permission dialog once**. No dialog + no error = the failure this item exists to catch.
- [ ] **C2.** **Deny** the camera. Expected: the message that says type the 6 digits instead — the app
  must stay fully usable by keyboard.
- [ ] **C3.** Grant it, scan a rider's code, and confirm the rider is marked boarded. *(Owner of this
  flow is Task 2; if the scan UI is not in yet, mark C1–C3 "waiting on task 2" and skip.)*

## D. System bars at cold start (G-124 / G-126)

`plugins.StatusBar { style: "DARK" }` and `plugins.SplashScreen { backgroundColor: "#FFFFFF" }` were both
**inert** — the packages that read them are not dependencies, and on a `targetSdk 36` build Android 15/16
ignore the colour knobs anyway. The bars are now decided once, in the generated theme, from
`packages/brand/brand.json`: transparent status + navigation bar, dark icons in daylight, light icons in
night, OS contrast scrim off.

- [ ] **D1.** System dark mode **off**. Cold start: no white/grey strip above the app's head; the status bar
  reads as the page, icons dark.
- [ ] **D2.** System dark mode **on**. Cold start: the splash is the brand's ink, the status bar is ink too
  (not white), icons light. *This is the bug G-124 was: a light band carrying the title row on a dark start.*
- [ ] **D3.** Check the **same two states inside the app** with the in-app theme toggle (if you run the app
  in light theme while the system is dark, expect the bar to keep the *system* answer — that is the one
  limit of a theme-level fix, and it is a known trade, not new damage).
- [ ] **D4.** The head's top spacing: exactly **one** gap above the title row, the same as in the browser.
  If there are **two** stacked gaps, the OS inset is being applied twice — write that down, it means the
  native side needs the follow-up (measuring `env(safe-area-inset-top)` inside the WebView), and it is a
  one-line native change, not a CSS one.
- [ ] **D5.** Swipe-up gesture bar at the bottom: nothing of ours is hidden behind it, and the bar takes the
  page's colour rather than a black box.

## E. Nothing above may change what already works

- [ ] **E1.** The rail's open/close still travels (spring, ~0.47 s), both directions. If the width snaps with
  no motion, the OTA bundle did not reach the device (D-8.22) — not a GUI bug.
- [ ] **E2.** Login, rider plan-a-ride, driver shift, staff/admin pages: same as the web app, no layout
  regressions at the smallest width you use.
- [ ] **E3.** Airplane mode for a minute, then back: the last screen you had open still shows.
- [ ] **E4.** `adb shell dumpsys package eg.rideshare.app | grep -A2 "requested permissions"` (optional, if
  a cable is handy): should list the 7 we declare — 4 location/service/notification pairs plus `CAMERA` —
  and no `CAMERA` duplicates.

---

## Not on this list, on purpose

| Item | Why it waits |
|---|---|
| Notifications at all (inbox, badge, `POST_NOTIFICATIONS` dialog) | Task 3 is mid-flight. The permission is declared, nothing in the app asks yet — asking on launch would be theatre. |
| `ACCESS_BACKGROUND_LOCATION` + `FOREGROUND_SERVICE_LOCATION` are declared but unused | G-128, an owner decision: keep for the driver's live position across a locked screen (needs a foreground service written first), or drop to save a Play-policy form later. No code path uses them today, so they are harmless here and a question at Play review. |
| Real push delivery (FCM) | Needs `google-services.json` (project-side) and the server-side sender — outside what this installer can carry. |
| `@capacitor/status-bar` / `@capacitor/splash-screen` as dependencies | Deliberately **not** added: the theme does the job, and on API 36 the plugins' colour knobs are no-ops. If we ever install one, `config.test.js` will let its config block back in — that is the guard's only blind spot, and it is a human one. |
