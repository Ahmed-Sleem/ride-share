#!/usr/bin/env bash
# DEC-170 mitigation 3 — parameterised queries only. Fails on any SQL string
# built by template interpolation or concatenation. This is the check standing
# between the product and the most common serious vulnerability in this class
# of application. It must be a script, not a habit.
set -uo pipefail
cd "$(dirname "$0")/.."

files="$(git ls-files -co --exclude-standard 2>/dev/null | grep -vE '^(node_modules/|\.git/|dist/|build/)' | grep -E '\.(ts|js)$' || true)"

examined=0; hits=0
while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] || continue
  # skip the check itself and the migration/type tooling (they contain the patterns)
  case "$f" in
    scripts/check-sql-*) continue ;;
    scripts/gen-db-types.mjs) continue ;;
  esac
  examined=$((examined+1))
  # 1) template-literal SQL with interpolation: `SELECT ... ${`
  # 2) string-concatenated SQL: "SELECT ... " + var
  if grep -nE '`[^`]*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^`]*\$\{' "$f" >/dev/null 2>&1; then
    echo "  FAIL interpolated SQL template: $f"
    grep -nE '`[^`]*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^`]*\$\{' "$f" | head -1 | sed 's/^/        /'
    hits=$((hits+1))
  fi
  if grep -nE '"[^"]*(SELECT|INSERT|UPDATE|DELETE) [^"]*"\s*\+' "$f" >/dev/null 2>&1; then
    echo "  FAIL concatenated SQL string: $f"
    grep -nE '"[^"]*(SELECT|INSERT|UPDATE|DELETE) [^"]*"\s*\+' "$f" | head -1 | sed 's/^/        /'
    hits=$((hits+1))
  fi
done <<< "$files"

echo
echo "sql-injection check: examined $examined files, $hits hit(s)"
[ "$hits" -eq 0 ]
