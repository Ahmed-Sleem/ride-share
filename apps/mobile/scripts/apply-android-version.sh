#!/usr/bin/env bash
# P7.6 — versionName / versionCode come from packages/brand/brand.json only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BRAND="$ROOT/packages/brand/brand.json"
GRADLE="${1:-$ROOT/apps/mobile/android/app/build.gradle}"
[ -f "$BRAND" ]
NAME="$(node -e 'console.log(require(process.argv[1]).version.name)' "$BRAND")"
CODE="$(node -e 'console.log(require(process.argv[1]).version.code)' "$BRAND")"
[ -n "$NAME" ] && [ -n "$CODE" ]
if [ ! -f "$GRADLE" ]; then
  echo "apply-android-version: no gradle yet ($GRADLE)"
  exit 0
fi
# Capacitor's template uses versionCode 1 / versionName "1.0"
python3 - "$GRADLE" "$CODE" "$NAME" <<'PY'
import re, sys
path, code, name = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding="utf-8").read()
text2 = re.sub(r"versionCode\s+\d+", f"versionCode {code}", text, count=1)
text2 = re.sub(r'versionName\s+"[^"]*"', f'versionName "{name}"', text2, count=1)
if text2 == text and "versionCode" not in text:
    sys.exit("FAIL: gradle has no versionCode to rewrite")
open(path, "w", encoding="utf-8").write(text2)
print(f"android versionCode={code} versionName={name}")
PY
