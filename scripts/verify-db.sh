#!/usr/bin/env bash
# The database half of verification (BUILD_PLAN P0.5). Requires a live
# Postgres/PostGIS reachable at DATABASE_URL. Run locally with
# `docker compose up db` and `pnpm db:verify`; CI runs it against a service
# container. Not part of `pnpm verify` (which must run anywhere, no DB).
set -euo pipefail
cd "$(dirname "$0")/.."

checks=(
  "scripts/check-migrations.sh"
  "scripts/check-db-types.sh"
)

for c in "${checks[@]}"; do
  echo "▶ $c"
  bash "$c"
done

echo
echo "✓ db checks green"
