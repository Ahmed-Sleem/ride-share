#!/usr/bin/env bash
# DEC-170 mitigation 1 (drift side). Regenerates the schema-derived types and
# fails if the committed file differs — schema and types cannot drift because
# drift is a failure.
#
# The types are generated from a SCRATCH database built by the migrations —
# never from DATABASE_URL's own database, which may be empty or stale (as in
# CI, where DATABASE_URL is a bare service container; G-074). The invariant
# under test is "committed types == what the migrations produce", so the
# migrations are the only source. Requires a Postgres reachable at
# DATABASE_URL and a role able to create/drop databases.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DATABASE_URL:?DATABASE_URL is required}"

SCRATCH_DB="rideshare_typescheck"
ADMIN_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's#(postgres(ql)?://[^/]+/)[^?]+#\1postgres#')"
SCRATCH_URL="$(printf '%s' "$DATABASE_URL" | sed -E "s#(postgres(ql)?://[^/]+/)[^?]+#\\1${SCRATCH_DB}#")"

MIGRATE="pnpm exec node-pg-migrate -m infra/migrations --migration-file-language sql"

# Same node-based psql the other DB checks use (no psql binary dependency).
psql_here() { node -e '
  const {Client}=require("pg");
  const c=new Client({connectionString:process.argv[1]});
  c.connect().then(()=>c.query(process.argv[2])).then(()=>c.end())
    .catch(e=>{console.error(e.message);process.exit(1);});' "$1" "$2"; }

cleanup() { psql_here "$ADMIN_URL" "DROP DATABASE IF EXISTS $SCRATCH_DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "▶ preparing scratch database $SCRATCH_DB (from migrations)"
psql_here "$ADMIN_URL" "DROP DATABASE IF EXISTS $SCRATCH_DB" >/dev/null
psql_here "$ADMIN_URL" "CREATE DATABASE $SCRATCH_DB" >/dev/null
DATABASE_URL="$SCRATCH_URL" $MIGRATE up >/dev/null

echo "▶ regenerate db.generated.ts (from the scratch schema)"
DATABASE_URL="$SCRATCH_URL" node scripts/gen-db-types.mjs >/dev/null

if ! git diff --exit-code -- packages/shared-types/src/db.generated.ts >/dev/null 2>&1; then
  echo "✗ FAIL: packages/shared-types/src/db.generated.ts drifted from the schema"
  echo "       run 'pnpm db:types' and commit the result"
  exit 1
fi

echo
echo "db-types check: examined 1 generated file, 0 drift"
