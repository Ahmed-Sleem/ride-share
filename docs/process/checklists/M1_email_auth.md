# M1.8 — Email sign-in/sign-up, styled emails, DB-backed throttle, landing & slider polish

> Owner requests (2026-08-18): replace phone sign-in/sign-up with **email +
> OTP** (industry-standard), reject temporary/disposable emails via an
> **allowlist** of known-good providers + all `.edu`/`.edu.<cc>` domains,
> send a **styled** HTML email from an owner-provided account (Resend),
> 60s resend cooldown + 3 tries → 1h lockout that survives refresh, track
> attempts **and IP throttling in the same PostgreSQL database**, and the UI
> polish: smaller linked Streamline credit on its own line, fix the oversized
> role-choice chevrons, vivid single-colour slider cards (no gradient),
> dark-mode sticker colours, bouncier feature-card hover.
> One box is ticked only when a command proved it (§0.1); proof goes in
> `IMPLEMENTATION_LOG.md`.

## A — Email allowlist (the ONE place that decides, §8.2)

- [x] `email-policy.ts` in identity/domain: education rule (`edu`, `*.edu`, `*.edu.<cc>`) + built-in allowlist of popular providers + env-extended domains (exact or subdomain), case-insensitive
- [x] Allowlist covers gmail/googlemail, outlook/hotmail/live/msn, yahoo/ymail, icloud/me/mac, aol, proton, zoho, mail.com, gmx/web.de, fastmail, tuta, hey, hushmail, mailfence, yandex, mail.ru, qq/163/126, naver, rediff
- [x] Unit tests: accepts `gmail.com`, `ejust.edu.eg`, `mit.edu`, `student.ejust.edu.eg`, extra env domain; rejects `playboot.com`, `mailinator.com`, `10minutemail.com`, unknown corporate domain — and the rejection case is **observed failing** when the policy is broken (§0.2)

## B — Email OTP backend (reuse DEC-189 verification machinery)

- [x] `email_login` verification kind added (TTL 5 min) to `verification.ts`; `sms_login` removed from the type/table CHECK
- [x] Migration `0008_email_login.sql` alters the `verification_codes.kind` CHECK (up + down clean)
- [x] `/auth/otp/request {email}` and `/auth/otp/verify {email, code, name}` — DTO validates email; service enforces the allowlist + cooldown + lockout; account created with `email` (role rider)
- [x] Smart sign-in `identify` sends the login code **by email** for OTP accounts
- [x] All state stays in PostgreSQL: `verification_codes` (cooldown/lockout/attempts) + `audit_log` events for signup / login / otp-request / code-lockout
- [x] Existing identity service tests updated to email; new tests for domain-blocked signup (403) and email-login happy path

## C — Styled email (matches the app look; generic SMTP = works with Resend)

- [x] `notifications.ts` sends styled HTML (brand colours, big code block, expiry + ignore-if-not-you footer) for login / email-verify / password-reset, with a plain-text fallback
- [x] SMS path removed (Twilio dead code out, §9); password reset goes to email
- [x] Production refuses to send without SMTP + `EMAIL_FROM`; development logs the code (honest sandbox, unchanged)
- [x] `.env.example` + env.ts: `SMTP_HOST/PORT/USER/PASS/SECURE`, `EMAIL_FROM`, `EMAIL_ALLOWED_DOMAINS` documented; `check-env-example.sh` green

## D — Same-user / IP protection, all in PostgreSQL

- [x] DB-backed throttler storage (`throttle_records` table, migration `0009`) replaces the in-memory store — IP rate limits survive restart & scale (closes G-062's first clause)
- [x] Pure `nextThrottleState()` logic unit-tested (increment, block-at-limit+1, block expiry reset, ttl expiry reset) and break-observed
- [x] `app.module.ts` wires `ThrottlerModule.forRootAsync` with the Postgres storage

## E — Frontend email flow (timer + lockout survive refresh)

- [x] Sign-up: choose role → **email** → 6-box OTP input (auto-advance, backspace, paste, `autocomplete=one-time-code`) → name
- [x] Sign-in: email → password (staff) or OTP code (riders/drivers); "code sent to <email>"
- [x] Resend countdown (60s) + "attempts left" hint + 1-hour lockout banner, all restored from localStorage after a page refresh
- [x] Temp-mail rejection shows a friendly, translated message (`auth.email_domain_not_allowed`)
- [x] EN + AR copy for every new string; RTL safe

## F — Landing & slider polish

- [x] "Vectors by Streamline" is smaller, on its own line, and links to Streamline (rel=noopener)
- [x] Role-choice screen fixed: chevron icons sized (no more giant arrows); adaptive + regression-checked at 320→1440 in EN & AR
- [x] Slider cards: one **solid pop colour** each (violet/coral/sky/mint, no gradient), white text, white doodle sticker — contrast ≥ 4.5:1 (700-level shades added to the palette)
- [x] Dark mode: sticker/illustration accents use brighter 300-level tints (per-card pops for the "how it works" steps) — light mode untouched
- [x] Feature-card hover: bouncier, longer, smoother (new `--bounce` easing + `--slow` duration tokens, reduced-motion guarded)

## G — Verification (every box proven by a command)

- [x] Web build clean; unit + axe + layout + landing suites green (existing + new assertions: chevron rule, footer link, solid slide colours, bounce token, email flow)
- [x] `breaks.sh` entries added for the new checks and each observed failing (§0.2)
- [x] API: `pnpm --filter @ride-share/api test` green (incl. new email-policy + throttle-logic tests)
- [x] `pnpm db:verify` green (migrations up/down/up + schema drift + db types)
- [x] `pnpm verify` green; secret scan clean
- [x] Committed + pushed to GitHub; remote matches local

## Explicitly NOT in this box (tracked elsewhere)

- Removing the remaining `DATA.*` demo content / wiring every screen to the API (M1 checklist §G — next box)
- Journeys/routes/geo data models → M2/M3 (DEC-184)
- Resend API key + verified domain → owner sets in Railway (I provide the exact values)
