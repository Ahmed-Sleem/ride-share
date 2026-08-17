#!/usr/bin/env bash
# DEC-170 mitigation 1 (drift side). Regenerates the schema-derived types and
# fails if the committed file differs — schema and types cannot drift because
# drift is a failure. Requires DATABASE_URL.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DATABASE_URL:?DATABASE_URL is required}"

echo "▶ regenerate db.generated.ts"
node scripts/gen-db-types.mjs >/dev/null

if ! git diff --exit-code -- packages/shared-types/src/db.generated.ts >/dev/null 2>&1; then
  echo "✗ FAIL: packages/shared-types/src/db.generated.ts drifted from the schema"
  echo "       run 'pnpm db:types' and commit the result"
  exit 1
fi

echo
echo "db-types check: examined 1 generated file, 0 drift"
