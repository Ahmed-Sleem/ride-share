#!/usr/bin/env bash
# DEC-170 mitigation 2 — SQL lives only in repository modules. A query string
# outside `**/infra/*.repository.ts` (or the migration files) fails the build.
# Every table has exactly one repository; SQL nowhere else (§0.3).
set -uo pipefail
cd "$(dirname "$0")/.."

# Files that legitimately contain SQL: repositories and migrations.
files="$(git ls-files -co --exclude-standard 2>/dev/null | grep -vE '^(node_modules/|\.git/|dist/|build/)' | grep -E '\.(ts|js)$' || true)"

examined=0; hits=0
while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] || continue
  examined=$((examined+1))
  # a file "contains SQL" if it has a statement: SELECT/INSERT/UPDATE/DELETE
  # followed by a table, star, FROM or INTO.
  if grep -qE '\b(SELECT|INSERT|UPDATE|DELETE)\s+(\*|FROM|INTO|[A-Za-z_`"'"'"'])' "$f" 2>/dev/null; then
    case "$f" in
      */infra/*.repository.ts) : ;;   # sanctioned home
      *.repository.ts)        : ;;
      *migrations/*.sql)      : ;;
      *)
        echo "  FAIL SQL outside a repository: $f"
        grep -nE '\b(SELECT|INSERT|UPDATE|DELETE)\s+(\*|FROM|INTO|[A-Za-z_`"'"'"'])' "$f" | head -1 | sed 's/^/        /'
        hits=$((hits+1))
        ;;
    esac
  fi
done <<< "$files"

echo
echo "sql-location check: examined $examined files, $hits hit(s)"
[ "$hits" -eq 0 ]
