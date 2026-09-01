#!/usr/bin/env bash
# §18.2 for the layout suite: break a layout guarantee, confirm the browser
# measurement catches it, restore. Any FAIL is a catch — the point is that the
# suite goes red, not which assertion name fires first.
set -u
cd "$(dirname "$0")/.."
P=0; F=0
lb(){ _lb "$1" "$2" "$3" "node tests/layout.test.js"; }
lbl(){ _lb "$1" "$2" "$3" "node tests/landing.test.js"; }
LB_TMP="${HOME}/.vtest/layout-breaks-scratch.$$"   # not $TMPDIR: a sandbox rehydrate wipes it
mkdir -p "$LB_TMP/orig"
SCRATCH="$LB_TMP"
LB_INFLIGHT=""
lb_restore () {
  [ -n "$LB_INFLIGHT" ] || return 0
  cp "$LB_TMP/${LB_INFLIGHT//\//_}" "$LB_INFLIGHT" 2>/dev/null
  LB_INFLIGHT=""
}
trap 'lb_restore; rm -rf "$LB_TMP"' EXIT INT TERM
_lb(){ local n="$1" f="$2" e="$3" testcmd="$4"
  local bak="$LB_TMP/${f//\//_}"
  cp "$f" "$bak"; LB_INFLIGHT="$f"; sed -i "$e" "$f"
  if cmp -s "$f" "$bak"; then echo "  BROKEN-BREAK  $n → edit did not change the file"; F=$((F+1)); cp "$bak" "$f"; LB_INFLIGHT=""; return; fi
  node build.js >/dev/null 2>&1
  local out; out="$(eval "$testcmd" 2>&1)"
  cp "$bak" "$f"; LB_INFLIGHT=""; rm -f "$bak"; node build.js >/dev/null 2>&1
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

# The landing width regression moved to tests/breaks.sh: the browser suite can
# measure the landing as full width with the declaration gone (a grid floor hides
# the shrink), so what guards it now is unit.test.js asserting the rule itself.
lbl "a landing section loses its reveal" src/lib/landing-parts.js \
  's|kid.setAttribute("data-rv", "");|kid.setAttribute("data-rvX", "");|'

# Three more, for guarantees the adaptive matrix now measures on every marketing
# page, in both directions, at the widths where a rule turns over.
# The claims are a key under the drawing at every width now, so the overlay is not a
# phone-only temptation any more: put it back and the type lands on the road anywhere.
lbl "the map goes back behind the copy" src/styles/shell.html \
  's@.journey__svg{position:static;width:100%;@.journey__svg{position:absolute;inset:0;width:100%;@'

lbl "the landing flow rhythm is dropped" src/styles/shell.html \
  's@^\.landing__section>\*+\*,\.landing__cta>\*+\*,\.landing__slab>\*+\*{margin-block-start:var(--flow)}@.landing__section>*+*,.landing__cta>*+*,.landing__slab>*+*{margin-block-start:0}@'

lbl "the compact menu goes under the tap floor" src/styles/shell.html \
  's@width:var(--tap);height:var(--tap);align-items:center@width:20px;height:20px;align-items:center@' 

echo
# Every case backs up before it mutates; this proves the product tree came back whole.
# A leftover mutation is not a test failure — it is a corrupted build that the next suite
# would read as truth, which has already happened here.
drift=0
if [ -d "$SCRATCH/orig" ]; then
  for f in "$SCRATCH/orig"/*; do
    [ -e "$f" ] || continue
    rel="$(echo "$f" | sed "s#$SCRATCH/orig/##; s#_#/#g; s#/styles#/#; s#/shell#/#; s#/screens#/#; s#/lib#/#; s#/tests#/#")"
    cmp -s "$f" "$rel" || { echo "  RESTORE FAILED  $rel"; cp "$f" "$rel" 2>/dev/null; drift=1; }
  done
fi
[ "$drift" -eq 0 ] || exit 1

echo "──────── layout breaks caught: $P   missed: $F ────────"
[ "$F" -eq 0 ] || exit 1
