#!/usr/bin/env bash
# The repository half of `pnpm verify`. Runs every enforcement script in
# order, failing on the first non-zero. Grows as points add checks (P0.2).
set -euo pipefail
cd "$(dirname "$0")/.."

checks=(
  "scripts/check-workspace.sh"
)

for c in "${checks[@]}"; do
  echo "▶ $c"
  bash "$c"
done

echo
echo "✓ repo checks green"
