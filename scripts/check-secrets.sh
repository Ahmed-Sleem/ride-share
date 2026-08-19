#!/usr/bin/env bash
# Secret hygiene (P0.3, §10.1). Scans the repository working tree for known
# credential shapes and fails on any hit. A leaked credential is unrecoverable
# — rotation is the only remedy, and only if you notice.
#
# Scanned: every tracked file plus untracked-but-not-ignored files.
# Skipped (the local secret stores and generated noise):
#   .env, .env.* (except .env.example, which may carry dummy values),
#   node_modules, dist, build, .git, .turbo, lockfiles, logs, archives.
set -uo pipefail
cd "$(dirname "$0")/.."

PATTERNS=(
  'AKIA[0-9A-Z]{16}'                          # AWS access key id
  'ghp_[A-Za-z0-9]{20,}'                      # GitHub personal access token
  'github_pat_[A-Za-z0-9_]{20,}'              # GitHub fine-grained PAT
  'sk-[A-Za-z0-9]{20,}'                       # generic secret-key prefix
  '-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----'  # private keys
  '(postgres|postgresql|mysql|redis|mongodb)://[^/@[:space:]]+:[^/@[:space:]]+@'  # conn string with password
  '(api[_-]?key|apikey|secret|password|token)\s*[:=]\s*["'"'"'][A-Za-z0-9+/_-]{16,}["'"'"']'
)

# Collect the files to scan.
# Skipped with a documented reason:
#   docker-compose.yml and infra/compose/* — compose files carry ${VAR}
#     placeholders, never literal secrets; real values come from the
#     environment at `docker compose up` time (12-factor).
#   .github/workflows/*.yml — CI wires a throwaway PostGIS service container
#     with dummy credentials.
# Real secrets live in .env / Railway variables, never in these files.
files="$(git ls-files -co --exclude-standard 2>/dev/null | grep -vE '^(\.env($|\..*$)|node_modules/|dist/|build/|\.git/|\.turbo/|coverage/)' | grep -vE '(^|/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|docker-compose\.yml|infra/compose/.*|\.github/workflows/.*\.yml|.*\.log|.*\.zip|.*\.png|.*\.jpg|.*\.jpeg|.*\.gif|.*\.pdf)$' || true)"

# .env.example is allowed to contain dummy values; scan it separately only for
# private-key headers and real-looking tokens, never the dummy assignments.
examined=0
hits=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ -f "$f" ] || continue
  if [ "$f" = ".env.example" ]; then
    for p in '-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----' 'AKIA[0-9A-Z]{16}' 'ghp_[A-Za-z0-9]{20,}'; do
      if grep -nE "$p" "$f" >/dev/null 2>&1; then
        echo "  FAIL $f matches $p"; hits=$((hits+1))
      fi
    done
    examined=$((examined+1))
    continue
  fi
  examined=$((examined+1))
  for p in "${PATTERNS[@]}"; do
    if grep -nE "$p" "$f" >/dev/null 2>&1; then
      echo "  FAIL $f matches $p"
      grep -nE "$p" "$f" | head -1 | sed 's/^/        /'
      hits=$((hits+1))
    fi
  done
done <<< "$files"

echo
echo "secret scan: examined $examined files, $hits hit(s)"
[ "$hits" -eq 0 ]
