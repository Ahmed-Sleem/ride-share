#!/usr/bin/env bash
# The one command (GUI rules §18.1). Green here = known-good state.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "▶ build";          node app/build.js
echo "▶ unit/a11y";      node app/tests/unit.test.js
echo "▶ layout (browser)"; node app/tests/layout.test.js
echo "▶ breaks";         ./app/tests/breaks.sh
echo "▶ layout breaks";  ./app/tests/layout-breaks.sh
echo
echo "✓ all green"
