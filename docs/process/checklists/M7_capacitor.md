# M7 — Capacitor APK wrapper (BUILD_PLAN P7, DEC-176)

Owner: Path B. Tick only with a command as proof.

## P7.1 — Capacitor shell and the one-codebase rule

- [x] `apps/mobile` wraps `@ride-share/web` (no forked screens) — `apps/mobile/scripts/build.js`
- [x] Debug APK assembled in CI (`apps/mobile/scripts/make-apk.sh` + Actions artifact)
- [x] `packages/platform` is the only native seam — screens call `Platform.*`
- [x] `scripts/check-platform-boundary.sh` in `pnpm verify`
- [x] Break observed: planted `@capacitor/camera` in `rider.js` → check fails → restore (`apps/mobile/tests/breaks.sh`)
- [x] Railway `mobile` service has `start` + `/healthz` (`apps/mobile/server.js`, `apps/mobile/Dockerfile`)
- [x] Brand name for the APK comes from `packages/brand/brand.json`
- [x] `pnpm verify` green after the change

## Later points (not this commit — tracked, not half-built)

- [x] P7.2 offline-first driver outbox — durable queue + server receipts (0022); §0.2 tests in packages/platform/src/outbox.test.js
- [ ] P7.3 native camera scan + numeric fallback (numeric already on web)
- [ ] P7.4 background location (DEC-176 gate)
- [ ] P7.5 FCM push + local alarm (G-055)
- [ ] P7.6 signed Play AAB from CI secrets (no keystore in git)

## Railway `mobile` component

Until P7.1 this service had no `start` script, so only `api` and `web` stayed up.
Fix: Dockerfile pinned to `PROJECT=mobile`, health `/healthz`, same HTML as web.

**Owner action:** in Railway, set the mobile service Dockerfile to
`apps/mobile/Dockerfile` and the root directory to the **repository root**.
Variables = the `web` block.
