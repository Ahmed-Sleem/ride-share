#!/usr/bin/env bash
# DEC-170 mitigation 4 — migrations are the only way the schema changes.
# Applies every migration to a SCRATCH database (up), dumps its schema,
# compares it to the committed infra/schema.sql, then proves the
# down migrations work (down-all → up-again) and drops the scratch database.
#
# Requires: a reachable Postgres/PostGIS (DATABASE_URL), pg_dump on PATH,
# and a superuser role able to create/drop databases.
#
#   DATABASE_URL=postgres://localhost:5432/db bash scripts/check-migrations.sh
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DATABASE_URL:?DATABASE_URL is required}"

SCRATCH_DB="rideshare_migcheck"
ADMIN_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's#(postgres(ql)?://[^/]+/)[^?]+#\1postgres#')"
SCRATCH_URL="$(printf '%s' "$DATABASE_URL" | sed -E "s#(postgres(ql)?://[^/]+/)[^?]+#\1${SCRATCH_DB}#")"

MIGRATE="pnpm exec node-pg-migrate -m infra/migrations --migration-file-language sql"

# ── fresh scratch database ────────────────────────────────────────────────
psql_here() { node -e '
  const {Client}=require("pg");
  const c=new Client({connectionString:process.argv[1]});
  c.connect().then(()=>c.query(process.argv[2])).then(()=>c.end())
    .catch(e=>{console.error(e.message);process.exit(1)});' "$1" "$2"; }

echo "▶ preparing scratch database $SCRATCH_DB"
psql_here "$ADMIN_URL" "DROP DATABASE IF EXISTS $SCRATCH_DB" >/dev/null
psql_here "$ADMIN_URL" "CREATE DATABASE $SCRATCH_DB" >/dev/null

# ── up → dump → compare ───────────────────────────────────────────────────
echo "▶ migrations up (scratch)"
DATABASE_URL="$SCRATCH_URL" $MIGRATE up >/dev/null

echo "▶ dump schema"
pg_dump --schema-only --no-owner --no-privileges --no-comments "$SCRATCH_URL" \
  | sed -E '/^(--|SET |SELECT pg_catalog|\\[a-z])/d' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' | grep -v '^$' \
  > /tmp/schema-actual.sql

if ! diff -u infra/schema.sql /tmp/schema-actual.sql > /tmp/schema.diff; then
  echo "✗ FAIL: schema drift detected (scratch ≠ committed schema.sql)"
  head -30 /tmp/schema.diff | sed 's/^/     /'
  psql_here "$ADMIN_URL" "DROP DATABASE IF EXISTS $SCRATCH_DB" >/dev/null || true
  exit 1
fi
echo "  schema matches infra/schema.sql"

# ── down-all → up-again (proves every migration has a working down) ───────
echo "▶ down-all / up-again"
while true; do
  n="$(node -e '
    const {Client}=require("pg");
    const c=new Client({connectionString:process.argv[1]});
    c.connect().then(()=>c.query("SELECT count(*)::int AS n FROM pgmigrations"))
      .then(r=>{console.log(r.rows[0].n);return c.end();})
      .catch(()=>console.log(0));' "$SCRATCH_URL" | tr -d '[:space:]')"
  n="${n:-0}"
  [ "$n" -le 0 ] && break
  DATABASE_URL="$SCRATCH_URL" $MIGRATE down >/dev/null
done
DATABASE_URL="$SCRATCH_URL" $MIGRATE up >/dev/null
echo "  up → down → up cycle clean"

# ── cleanup ────────────────────────────────────────────────────────────────
psql_here "$ADMIN_URL" "DROP DATABASE IF EXISTS $SCRATCH_DB" >/dev/null

echo
echo "migration check: examined 1 database, 0 drift, cycle clean"
