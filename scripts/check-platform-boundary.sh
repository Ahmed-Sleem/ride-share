#!/usr/bin/env bash
# P7.1 one-codebase rule: screens and feature files must not import
# @capacitor/* — only packages/platform (and the Capacitor project itself)
# may name a plugin. A check never seen failing is not a check (§0.2).
set -uo pipefail
cd "$(dirname "$0")/.."

examined=0
hits=0

# Feature / screen trees — never a Capacitor import.
while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] || continue
  examined=$((examined+1))
  if grep -nE "@capacitor/" "$f" >/dev/null 2>&1; then
    echo "  FAIL Capacitor import outside the native shell: $f"
    grep -nE "@capacitor/" "$f" | head -5
    hits=$((hits+1))
  fi
  if grep -nE "isNativePlatform|Capacitor\.Plugins" "$f" >/dev/null 2>&1; then
    echo "  FAIL platform conditional / plugin reach inside a screen: $f"
    hits=$((hits+1))
  fi
done <<< "$(git ls-files -co --exclude-standard | grep -E '^apps/web/src/(screens|lib|shell|data)/' || true)"

# The platform package itself must not static-import plugins either
# (runtime window.Capacitor only) — keeps `pnpm --filter web` working
# when android/ is deleted.
while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] || continue
  examined=$((examined+1))
  if grep -nE "from ['\"]@capacitor/|require\\(['\"]@capacitor/" "$f" >/dev/null 2>&1; then
    echo "  FAIL packages/platform static-imports @capacitor: $f"
    hits=$((hits+1))
  fi
done <<< "$(git ls-files -co --exclude-standard | grep -E '^packages/platform/src/' || true)"

echo
echo "platform-boundary check: examined $examined files, $hits hit(s)"
[ "$hits" -eq 0 ]
