#!/usr/bin/env bash
# The repository half of `pnpm verify`. Runs every enforcement script in
# order, failing on the first non-zero. Two failure modes are treated as
# failures, not just one (BUILD_PLAN P0.2):
#   1. a sub-check exits non-zero            → report WHICH check failed;
#   2. a sub-check exits 0 but reports that it examined zero files, or prints
#      nothing at all → report it. A check that silently matches nothing is
#      the most common false green in this plan.
# Convention: every sub-check must print a line matching /examined [0-9]+/.
set -uo pipefail
cd "$(dirname "$0")/.."

checks=(
  "scripts/check-workspace.sh"
  "scripts/check-secrets.sh"
  "scripts/check-env-example.sh"
  "scripts/check-sql-location.sh"
  "scripts/check-sql-injection.sh"
)

fail=0
for c in "${checks[@]}"; do
  echo "▶ $c"
  out="$(bash "$c" 2>&1)"; rc=$?
  printf '%s\n' "$out" | sed 's/^/   /'
  if [ $rc -ne 0 ]; then
    echo "✗ FAIL: $c exited $rc"
    fail=1
  elif ! printf '%s\n' "$out" | grep -Eq 'examined [0-9]+'; then
    echo "✗ FAIL: $c reported no examined-file count (silent green)"
    fail=1
  fi
  [ $fail -eq 0 ] || break
done

if [ $fail -ne 0 ]; then
  echo
  echo "verify-repo: FAILED"
  exit 1
fi

echo
echo "✓ repo checks green"
