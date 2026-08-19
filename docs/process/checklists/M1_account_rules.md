# M1.9 — Account rules & the protected main admin

> Owner requests (2026-08-19): one email = one account (can't sign up twice, can't
> be rider and driver), production-grade signup/sign-in separation, and the
> env-seeded admin is the ONE main admin — it creates/edits/removes staff, can
> never be edited/removed itself, and no second super_admin can be created.
> One box ticked only on command proof (§0.1); proof in `IMPLEMENTATION_LOG.md`.

## A — One email = one account (DEC-197)

- [x] `/auth/signup/verify` (new) creates the account and refuses an email already used by ANY account (`auth.email_taken`)
- [x] Sign-up code request refuses a taken email BEFORE anything is sent
- [x] `/auth/otp/verify` is sign-in only — requires an existing account (`auth.invalid_credentials` otherwise)
- [x] Raced duplicate sign-ups map to the same error via the UNIQUE constraint (23505)
- [x] Driver = rider account approved to drive (no separate account to collide with); apply is idempotent
- [x] Frontend: sign-up collects name on the code step and calls the dedicated signup endpoint; EN/AR error copy

## B — The main admin (DEC-196)

- [x] Migration `0010`: `users.is_system_admin` + `users.deleted_at` (soft delete)
- [x] Seeder marks the env-seeded admin as the system admin (with backfill for pre-0010 databases)
- [x] `createStaff` can never create a super_admin (resolver `assertGrantableStaffRole`)
- [x] `updateStaff` / `deleteStaff` (new endpoints) refuse the system admin (`auth.main_admin_protected`)
- [x] Staff delete is soft (history + audit intact) and revokes every session
- [x] Admin UI: system-admin row marked & locked; other staff have Edit + Remove; no super_admin option in the create/edit selects
- [x] Authority stays in ONE place (resolver) — `check-authority.sh` green

## C — Verification

- [x] API tests green (83): signup-taken (request+verify), sign-in-requires-account, no-second-super_admin, main-admin-immutable, edit/delete-other-staff, role-cannot-become-super_admin
- [x] Web: 253 unit + 58 breaks (new checks observed failing first) + 14 axe + 47 landing green
- [x] `pnpm verify` green; `pnpm db:verify` migrations up→down→up + schema drift clean (post-commit)
- [x] Committed + pushed; remote matches local
