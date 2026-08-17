#!/usr/bin/env bash
# §18.2 for the layout suite: break a layout guarantee, confirm the browser
# measurement catches it, restore. Any FAIL is a catch — the point is that the
# suite goes red, not which assertion name fires first.
set -u
cd "$(dirname "$0")/.."
P=0; F=0
lb(){ local n="$1" f="$2" e="$3"
  cp "$f" "$f.bak"; sed -i "$e" "$f"
  if cmp -s "$f" "$f.bak"; then echo "  BROKEN-BREAK  $n → edit did not change the file"; F=$((F+1)); mv "$f.bak" "$f"; return; fi
  node build.js >/dev/null 2>&1
  local out; out="$(node tests/layout.test.js 2>&1)"
  mv "$f.bak" "$f"; node build.js >/dev/null 2>&1
  local n_fail; n_fail=$(echo "$out" | grep -c '^  FAIL')
  if [ "$n_fail" -gt 0 ]; then
    echo "  CAUGHT        $n  ($n_fail failures, first: $(echo "$out"|grep '^  FAIL'|head -1|sed 's/^  FAIL  //;s/ *→.*//'))"
    P=$((P+1))
  else
    echo "  MISSED        $n → suite stayed green"; F=$((F+1))
  fi }

echo "=== LAYOUT BREAK TESTS ==="
lb "table gets a wider floor than the phone" src/styles/shell.html \
  's@^\.table{width:100%;border-collapse:collapse;font-size:var(--f-body);min-width:560px}@.table{width:100%;border-collapse:collapse;font-size:var(--f-body);min-width:560px}\n.tablewrap{overflow-x:visible}@'
lb "content cap removed on ultrawide" src/styles/shell.html \
  's@^\.main__inner{width:100%;max-width:var(--content-max);margin-inline:auto;@.main__inner{width:100%;@' 
lb "button rows no longer wrap" src/styles/shell.html \
  's@^\.row{display:flex;align-items:center;min-width:0;flex-wrap:wrap}@.row{display:flex;align-items:center;min-width:0}@'
lb "bottom bar not pinned to the bottom" src/styles/shell.html \
  's@\.nav{order:2;border-top:1px solid var(--line);@.nav{order:0;border-top:1px solid var(--line);@'
lb "expanded rail hides its labels" src/styles/shell.html \
  's@  .navitem__label{font-size:var(--f-body);font-weight:var(--fw-semi)}@  .navitem__label{display:none}@'
lb "shell taller than the viewport" src/styles/shell.html \
  's@^#root{height:100vh;height:100dvh;width:100%;display:flex}@#root{min-height:100vh;width:100%;display:flex}@'
lb "main no longer scrolls (content pushes the shell)" src/styles/shell.html \
  's@^\.main{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;@.main{flex:1;@'
echo
echo "──────── layout breaks caught: $P   missed: $F ────────"
[ "$F" -eq 0 ] || exit 1
