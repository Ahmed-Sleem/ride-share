# M8 — Launch validation (JOINT Path A + Path B)

Tick only with a command or a dated owner action. This file is the launch
gate — not a wish list.

**Smoked 2026-08-24 (Cairo):**
```
curl -sS https://ride-shareweb-production.up.railway.app/healthz
→ {"ok":true,"service":"web","api":"up"}

curl -sS https://ride-shareweb-production.up.railway.app/v1/healthz
→ {"ok":true,"service":"api","db":"up"}
```

## Railway services (so nobody mixes them up)

| Service | Job | Who opens it |
|---|---|---|
| `api` | Backend. No public product UI. | Other services via `/v1` |
| `web` | Browser site + app. Auto-updates on deploy. | Humans in a browser |
| `mobile` | Same HTML for the APK WebView + `/healthz`. | The installed APK. A deploy here does **not** update phones that already installed an APK. |

## Built and live (code) — not a launch

- [x] M0–M2 except corridor survey (P2.5)
- [x] M3 booking + scan + live journey + wallet/ledger (paths A+B)
- [x] A→B planner / desktop density / M4 SOS & support
- [x] M7 P7.1–P7.6 Capacitor wrap, outbox, scan, GPS, FCM, Play *pipeline*
- [x] Live web + api health (command above)

## Production blockers (cannot open the corridor until these move)

| ID | Blocker | Owner | Status |
|---|---|---|---|
| G-060 | Product name is still a placeholder — no trademark check. Blocks Play listing. | OWNER | OPEN |
| G-017 | Egypt ride-hailing legal pack (permits, retention). | Legal team | HANDED OFF |
| P2.5 | Launch corridor surveyed and verified in the tool. | OWNER fieldwork | OPEN |
| P7.6 secrets | `ANDROID_KEYSTORE_*` in GitHub Actions (never git). Without them CI cannot ship a Play-signed AAB. | OWNER | OPEN |
| G-079 | `COMMISSION_PERCENT` still 0 until you set the launch %. | OWNER MCQ | OPEN |
| Paymob live | Card top-up stays hidden until `PAYMOB_ENABLED` + live keys. Cash still works. | OWNER | Optional for cash-only beta |
| FCM | `FCM_SERVER_KEY` on `api`. Unset = no push; local leave-now alarm still works. | OWNER | Optional (G-055) |
| M3 e2e | One real corridor pass: publish → claim → book → scan → complete → wallet/cash. | JOINT A+B + you | Not recorded |

## Security (fast audit 2026-08-24)

- [x] Repo public (DEC-203). `scripts/check-secrets.sh` is in CI. No keystore in git (P7.6).
- [x] Staff cannot self-signup. Authority is one resolver.
- [x] Ledger is append-only. Boarding codes are single-use.
- [x] Share-ride links are capability-scoped (no phone).
- [x] JWT / SMTP / Paymob / keystore live only in Railway or Actions secrets.
- [ ] Rotate `JWT_SECRET` if it was ever pasted into a ticket or screenshot.
- [ ] Restrict `ADMIN_PASSWORD` after first login; do not keep the seed password.

## Owner-only (agents cannot finish these)

1. Play Console account + upload keystore → GitHub secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
2. Trademark / final product name (G-060).
3. Corridor survey P2.5 (two people, photos, verified stops).
4. Legal sign-off (G-017).
5. Commission % (G-079) and whether Paymob goes live for beta.
6. Restore drill (DEC-164) — restore a Railway backup and query it.

## How to get the debug APK (until Play)

1. GitHub → **Actions** → latest green **CI** on `main`.
2. Job **Android debug APK**.
3. Artifact **`ride-share-debug-apk`**.
4. Debug-signed only. Website deploys do not replace it.

## Joint next (when you say go)

Closed beta on the surveyed corridor (P8.3): measure schedule slip, alighting-signal use, cancellations, complaints. Exit criteria **before** seeing results.
