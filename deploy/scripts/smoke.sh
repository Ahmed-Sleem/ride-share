#!/usr/bin/env bash
# Confirms a running deployment actually serves the interface.
set -euo pipefail
BASE="${1:-http://localhost:8080}"
echo "▶ health";   curl -fsS "$BASE/healthz" | grep -q ok
echo "▶ document"; curl -fsS "$BASE/" | grep -q '<div id="root">'
echo "▶ scripted"; curl -fsS "$BASE/" | grep -q 'PAGES'
echo "✓ $BASE is serving the interface"
