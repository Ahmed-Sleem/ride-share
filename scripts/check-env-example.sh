#!/usr/bin/env bash
# Env documentation drift check (P0.3). `.env.example` must document every
# variable that `apps/api/src/config/env.ts` reads, so the two cannot drift.
# Extra keys in `.env.example` (future phases) are allowed and expected.
set -uo pipefail
cd "$(dirname "$0")/.."

schema="apps/api/src/config/env.ts"
example=".env.example"

examined=2
fail=0

[ -f "$schema" ]  || { echo "  FAIL missing $schema"; exit 1; }
[ -f "$example" ] || { echo "  FAIL missing $example"; exit 1; }

# Schema keys: lines shaped "  NAME: z." inside the envSchema object.
keys="$(grep -oE '^  [A-Z][A-Z0-9_]+: z\.' "$schema" | sed -E 's/^  ([A-Z0-9_]+):.*/\1/' | sort -u)"

missing=0
while IFS= read -r k; do
  [ -n "$k" ] || continue
  if ! grep -qE "^${k}=" "$example"; then
    echo "  FAIL $example does not document $k (read by $schema)"
    missing=$((missing+1))
  fi
done <<< "$keys"

if [ "$missing" -eq 0 ]; then
  echo "  $schema and $example agree on $(printf '%s' "$keys" | grep -c .) variable(s)"
fi
fail=$missing

echo
echo "env-doc check: examined $examined files, $fail failure(s)"
[ "$fail" -eq 0 ]
