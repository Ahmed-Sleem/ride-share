#!/usr/bin/env bash
# The one command (GUI rules §18.1). Green here = known-good state.
set -euo pipefail
cd "$(dirname "$0")"
echo "▶ build";          node build.js
echo "▶ unit/a11y";      node tests/unit.test.js
echo "▶ layout (browser)"; node tests/layout.test.js
echo "▶ landing (browser)"; node tests/landing.test.js
echo "▶ breaks";         ./tests/breaks.sh
echo "▶ layout breaks";  ./tests/layout-breaks.sh
echo
echo "✓ all green"
