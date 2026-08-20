#!/usr/bin/env bash
# Confirms a running deployment actually serves the interface (P0.4/P0.12).
# Usage: infra/scripts/smoke.sh [base-url]   (default http://localhost:8080)
set -euo pipefail
BASE="${1:-http://localhost:8080}"
echo "▶ health";   curl -fsS "$BASE/healthz" | grep -q '"ok":true'
echo "▶ document"; curl -fsS "$BASE/" | grep -q '<div id="root">'
echo "▶ scripted"; curl -fsS "$BASE/" | grep -q 'PAGES'
echo "✓ $BASE is serving the interface"
