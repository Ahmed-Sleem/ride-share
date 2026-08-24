# Mobile (Capacitor, DEC-176)

Android APK wrapping **the same** `@ride-share/web` build. There is no second
UI. Screens never import `@capacitor/*` — they call `Platform` in
`packages/platform`.

## Why Railway has a `mobile` service

Railway auto-imports one service per workspace app. An empty `apps/mobile`
has no `start` script, so the component crash-loops while `api` and `web`
work. This package now:

1. **builds** the web HTML into `www/` + `dist/` (Capacitor `webDir`);
2. **starts** a health-checked server (`/healthz`) that serves that HTML and
   proxies `/v1/*` the same way `apps/web` does.

Set the service:

| Setting | Value |
|---|---|
| Root directory | repository root (`/`) — **not** `apps/mobile` |
| Dockerfile | `apps/mobile/Dockerfile` |
| Healthcheck | `/healthz` |
| Variables | same as `web`: `PORT`, `API_INTERNAL_URL`, `MAP_PROVIDER`, `GOOGLE_MAPS_API_KEY` |

## Local APK (developer machine with Android SDK)

```bash
pnpm --filter @ride-share/mobile build
cd apps/mobile
npx cap add android     # once
npx cap sync android
npx cap open android    # or: ./android/gradlew -p android assembleDebug
```

Signing keys never enter git (`.gitignore` + `check-secrets.sh`). Play
upload (P7.6) uses CI secrets.

## What this point is / is not

**P7.1 (this commit):** shell, one-codebase rule, Railway-healthy service,
boundary check with a proven break.

**Not yet (later P7 points, tracked):** offline outbox (P7.2), native
camera scan (P7.3), background location gate (P7.4), FCM (P7.5), signed
Play AAB (P7.6).
