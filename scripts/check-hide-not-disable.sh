#!/usr/bin/env bash
# Hide, don't disable (§8.1, BUILD_PLAN P0.10). A control may not be rendered
# disabled on the basis of a permission: `disabled` means "not yet, and you
# can change that yourself"; a permission the viewer will never hold must be
# HIDDEN (or replaced with a sentence), never left as a dead control. This is
# invisible in review — the screen renders and the control looks ordinary
# until somebody clicks it — so it must be a script.
#
# Patterns caught (web source):
#   - `dis:` / `disabled:` props whose value mentions a role/permission check
#   - JSX `disabled={!can(` / `disabled={can(` (future-proofing)
set -uo pipefail
cd "$(dirname "$0")/.."

files="$(git ls-files -co --exclude-standard | grep -E '^apps/web/src/.*\.(js|html)$' || true)"

examined=0; hits=0
while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] || continue
  examined=$((examined+1))
  if grep -nE 'dis(abled)?:\s*[^,}]*\b(S\.role|can\(|hasPermission|permission)' "$f" >/dev/null 2>&1; then
    echo "  FAIL permission-based disabled control in $f"
    grep -nE 'dis(abled)?:\s*[^,}]*\b(S\.role|can\(|hasPermission|permission)' "$f" | head -1 | sed 's/^/        /'
    hits=$((hits+1))
  fi
  if grep -nE 'disabled=\{[^}]*!?can\(' "$f" >/dev/null 2>&1; then
    echo "  FAIL disabled={can(...)} in $f"
    hits=$((hits+1))
  fi
done <<< "$files"

echo
echo "hide-not-disable check: examined $examined files, $hits hit(s)"
[ "$hits" -eq 0 ]
