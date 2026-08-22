#!/usr/bin/env bash
# Enforce the design system (§0.3 layer 1, BUILD_PLAN P0.8). Colour literals
# (hex, rgb, hsl) may exist ONLY inside the theme file. A hardcoded colour and
# a token render identically, so this must be a script, not a habit.
#
# Deliberate scope limit (R19.5): colour only at first. Spacing/typography
# enforcement lands once the token scale can answer every linter question.
set -uo pipefail
cd "$(dirname "$0")/.."

THEME="apps/web/src/styles/shell.html"
# Sample vehicle colour — data, not chrome (same allowance as the unit test).
ALLOWED="#1B62D6"

examined=0; hits=0
while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] || continue
  case "$f" in
    */tests/*|*/test.*) continue ;;               # tests may reference colours by name
    $THEME) continue ;;                            # the theme file: tokens live here
  esac
  examined=$((examined+1))
  # colour literals outside the theme file (case-insensitive hex/rgb/hsl)
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    ln="${line%%|*}"; rest="${line#*|}"
    # skip the documented sample vehicle colour
    printf '%s' "$ln" | grep -qi "1B62D6" && continue
    echo "  FAIL hardcoded colour in $f: $ln"
    hits=$((hits+1))
  done <<< "$(grep -niE '#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(' "$f" | sed 's/^[[:space:]]*//' | cut -c1-100)"
done <<< "$(git ls-files -co --exclude-standard | grep -E '^apps/(web|mobile)/src/' || true)"

# The theme file's own component rules must not contain literals either —
# only the :root and [data-theme="dark"] token blocks may.
examined=$((examined+1))
tfile_css="$(sed -n '/<style>/,/<\/style>/p' "$THEME" 2>/dev/null)"
tfile_tokens="$(printf '%s' "$tfile_css" | sed -n '/:root{/,/^}/p; /\[data-theme="dark"\]{/,/^}/p')"
tfile_rest="$(printf '%s' "$tfile_css" | sed '/:root{/,/^}/d; /\[data-theme="dark"\]{/,/^}/d')"
while IFS= read -r line; do
  [ -n "$line" ] || continue
  echo "  FAIL hardcoded colour in theme component rules: ${line##*|}"
  hits=$((hits+1))
done <<< "$(printf '%s' "$tfile_rest" | grep -niE '#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(' | sed 's/^[[:space:]]*//' | cut -c1-100)"

echo
echo "token check: examined $examined files, $hits hit(s)"
[ "$hits" -eq 0 ]
