#!/usr/bin/env bash
# Branding single-source guard (§0.3 one-change test). The product name,
# tagline and logo path are defined ONCE in packages/brand/brand.json. If any
# of them reappears as a hardcoded literal in app source, that is a second
# definition and the build fails — because the two WILL diverge on the day
# someone renames the product in one place and not the other.
set -uo pipefail
cd "$(dirname "$0")/.."

BRAND="packages/brand/brand.json"
[ -f "$BRAND" ] || { echo "  FAIL missing brand source: $BRAND"; exit 1; }

name_en=$(node -e 'console.log(require("./packages/brand/brand.json").name.en)')
name_ar=$(node -e 'console.log(require("./packages/brand/brand.json").name.ar)')
logo_path=$(node -e 'console.log(require("./packages/brand/brand.json").logo.path)')

examined=0; hits=0
while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] || continue
  examined=$((examined+1))
  # the brand source itself is exempt; tests may name the brand too
  case "$f" in
    "$BRAND"|*/tests/*|*/test.*) continue ;;
  esac
  if grep -qF "$name_en" "$f" 2>/dev/null || grep -qF "$name_ar" "$f" 2>/dev/null; then
    echo "  FAIL brand name hardcoded outside the brand source: $f"
    hits=$((hits+1))
  fi
  # a hardcoded logo path (the long SVG 'd') outside the brand source
  if [ ${#logo_path} -gt 200 ] && grep -qF "${logo_path:0:120}" "$f" 2>/dev/null; then
    echo "  FAIL logo path hardcoded outside the brand source: $f"
    hits=$((hits+1))
  fi
done <<< "$(git ls-files -co --exclude-standard | grep -E '^(apps/(web|api))/src/')"

echo
echo "branding check: examined $examined files, $hits hit(s)"
[ "$hits" -eq 0 ]
