#!/usr/bin/env bash
# The one command (GUI rules §18.1). Green here = known-good state.
set -euo pipefail
cd "$(dirname "$0")"
echo "▶ build";          node build.js
echo "▶ unit/a11y";      node tests/unit.test.js && node tests/a11y.test.js
echo "▶ server routes"; node --test tests/server.test.js   # G-112: the download routes are a product surface, not a side note
echo "▶ layout (browser)"; node tests/layout.test.js
echo "▶ landing (browser)"; node tests/landing.test.js
# The two break-detection passes mutate src/ and take ~45 min between them, so CI runs them in a
# job of their own (RS_SKIP_BREAKS=1) instead of making the browser suite wait for them. Locally,
# with no flag set, this file stays the one command that means "known-good state" (§18.1).
if [ "${RS_SKIP_BREAKS:-0}" != "1" ]; then
  echo "▶ breaks";         ./tests/breaks.sh
  echo "▶ layout breaks";  ./tests/layout-breaks.sh
fi
echo
echo "✓ all green"
