#!/usr/bin/env bash
# §0.2 — observe the platform-boundary check fail, then restore.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
CHECK=scripts/check-platform-boundary.sh
TARGET=apps/web/src/screens/rider.js
MARKER="/* P7.1-BREAK */"

echo "▶ platform-boundary break (plant @capacitor import in a screen)"
if ! grep -qF "$MARKER" "$TARGET"; then
  printf '\n%s\nimport { Camera } from "@capacitor/camera";\n' "$MARKER" >> "$TARGET"
fi
if bash "$CHECK"; then
  echo "  FAIL: check stayed green after a planted Capacitor import"
  git checkout -- "$TARGET"
  exit 1
fi
echo "  CAUGHT planted Capacitor import"
# Strip only the planted lines — never checkout the whole file (that
# would discard legitimate uncommitted work in the same screen).
python3 - "$TARGET" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
lines = p.read_text().splitlines(True)
out = []
skip_next_import = False
for i, line in enumerate(lines):
    if "/* P7.1-BREAK */" in line:
        skip_next_import = True
        continue
    if skip_next_import and "@capacitor/" in line:
        skip_next_import = False
        continue
    out.append(line)
p.write_text("".join(out))
PY
bash "$CHECK"
echo "  restored — check green"
echo
echo "breaks: examined 1 check, 0 missed"
