#!/usr/bin/env bash
# Single authority (§8.2, BUILD_PLAN P0.10). Permission decisions may only be
# made by calling the one authority resolver. Any hand-rolled role comparison
# in an API or service file fails the build: a second copy is a defect even
# while its answer agrees, because the two will be edited on different days.
set -uo pipefail
cd "$(dirname "$0")/.."

# The resolver (security/authority/) is the sanctioned home; tests may name roles.
files="$(git ls-files -co --exclude-standard | grep -E '^apps/api/src/.*\.(ts|js)$' | grep -vE 'security/authority/|\.test\.' || true)"

examined=0; hits=0
while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] || continue
  examined=$((examined+1))
  if grep -nE "\.?role\s*[!=]==?\s*['\"]" "$f" >/dev/null 2>&1; then
    echo "  FAIL hand-rolled role decision in $f"
    grep -nE "\.?role\s*[!=]==?\s*['\"]" "$f" | head -1 | sed 's/^/        /'
    hits=$((hits+1))
  fi
done <<< "$files"

echo
echo "authority check: examined $examined files, $hits hit(s)"
[ "$hits" -eq 0 ]
