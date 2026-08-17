# GitHub setup

Governed by `uploads/GITHUB_PROJECT_UPLOAD_LAW.md`. Decision: **DEC-177 — one private
monorepo**, public only if and when the owner chooses.

---

## 1. What goes in, what stays out

The repository is private, so internal documents may live in it. But they are **ignored from
any future public push** from the start, because the Law is explicit that publishing first and
sanitising later is not allowed (§5.2), and because a file that was never tracked cannot leak
from history.

| Tracked (private repo) | Never tracked, ever |
|---|---|
| `apps/`, `packages/`, `infra/`, `scripts/` | `.env` with values |
| `apps/web/` (the approved GUI source + build) | signing keystores, `*.jks`, `*.keystore` |
| `.env.example` with empty placeholders | Play service-account JSON |
| `docs/` — architecture, API, deploy runbook | provider API keys, webhook secrets |
| `MASTER_SPECIFICATION.md`, `BUILD_PLAN.md` | database URLs with passwords |

`_working_docs/` (audits, thinking, agent rules, implementation log) is tracked in the private
repo — it is the project's memory — but is listed in `.gitignore-public` and excluded by the
publish script, per Law §1.2.

## 2. `.gitignore`

```gitignore
# secrets
.env
.env.*
!.env.example
*.pem
*.key
*.jks
*.keystore
**/google-services.json
**/play-service-account*.json
**/*secret*
**/*credential*

# build
node_modules/
dist/
build/
.next/
.turbo/
coverage/
*.log
android/app/build/
ios/App/build/

# osrm graphs — large, regenerated
*.osrm*

# local
.DS_Store
.vscode/
.idea/
```

## 3. First push

```bash
cd project_rideshare
git branch -M main
gh repo create <name> --private --source=. --remote=origin
git push -u origin main
```

Branch is `main` (Law §2.2). Repo name: short, lowercase, hyphenated, matching the product name
once DEC-128 is settled — **do not create the repo under the placeholder "sekka" if the name may
change**, because renaming a repo after it has clones is avoidable friction. If the name is not
yet decided, use a neutral working name.

## 4. Branching

Small project, so keep it simple and boring:

- `main` is always deployable. CI green is the merge condition.
- One branch per plan point: `p3.6-seat-inventory`.
- Commit messages name the point: `feat(P3.6): atomic seat inventory`. Law §6.2 forbids
  diary-style messages; the point ID is a fact, not a diary entry.
- Squash on merge, so `main` reads as one commit per completed point.

## 5. Protecting `main`

Enable on the GitHub repo:
- require the CI check to pass before merge;
- no direct pushes to `main`;
- no force push.

This matters more than usual here, because the whole verification argument of this project rests
on checks that actually run.

## 6. Secrets

Never in the repository, including history (Law §1.3). They live in:
- local development: `.env`, git-ignored, created from `.env.example`;
- Railway: the platform variable store;
- CI: GitHub Actions secrets;
- Android signing: GitHub Actions secrets, injected at build time.

`.env.example` carries **names only**, with empty values:

```bash
DATABASE_URL=
SESSION_SECRET=
MAP_PROVIDER_KEY=
PAYMOB_API_KEY=
PAYMOB_HMAC_SECRET=
FCM_SERVER_KEY=
```

`scripts/check-secrets.sh` runs in CI and scans the tracked tree **and history** for the patterns
in Law §5.1. It is part of `pnpm verify`, not a separate ritual.

## 7. If the repository is ever made public

Then, and only then, the full Law §9 checklist applies: sanitised tree, README in the fixed
section order, LICENSE, screenshots of the real current UI, honest status table, no dates, no
sales copy, and `_working_docs/` excluded. That is a deliberate future task, not a side effect of
development.
