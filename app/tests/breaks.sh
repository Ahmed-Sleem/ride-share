#!/usr/bin/env bash
# §0.2 — break the thing each check guards, watch it fail for the RIGHT reason,
# then restore. A check never observed failing is an assumption in a test's clothing.
set -u
cd "$(dirname "$0")/../.."
PASS=0; FAIL=0

run_break () {                       # name | file | sed-expr | expected-failing-test
  local name="$1" file="$2" expr="$3" expect="$4"
  cp "$file" "$file.bak"
  sed -i "$expr" "$file"
  if cmp -s "$file" "$file.bak"; then
    echo "  BROKEN-BREAK  $name → edit did not change the file"
    FAIL=$((FAIL+1)); mv "$file.bak" "$file"; return
  fi
  node app/build.js >/dev/null 2>&1
  local out; out="$(node app/tests/unit.test.js 2>&1)"
  mv "$file.bak" "$file"; node app/build.js >/dev/null 2>&1
  local hit=""; IFS='|' read -ra WANT <<< "$expect"
  for e in "${WANT[@]}"; do echo "$out" | grep -q "FAIL  $e" && hit="$e"; done
  if [ -n "$hit" ]; then
    echo "  CAUGHT        $name → \"$hit\""; PASS=$((PASS+1))
  else
    echo "  MISSED        $name → expected FAIL of \"$expect\""
    echo "$out" | grep FAIL | head -3 | sed 's/^/                /'
    FAIL=$((FAIL+1))
  fi
}

echo "=== BREAK TESTS ==="

# ── shell: full viewport, one scroller ───────────────────────────────────
run_break "root not viewport height" app/src/styles/shell.html \
  's|^#root{height:100vh;height:100dvh;width:100%;display:flex}|#root{width:100%;display:flex}|' \
  "root is viewport height"

run_break "body allowed to scroll" app/src/styles/shell.html \
  's|^html,body{height:100%;margin:0;padding:0;overflow:hidden}|html,body{height:100%;margin:0;padding:0}|' \
  "page itself never scrolls"

run_break "main cannot shrink" app/src/styles/shell.html \
  's|^\.main{flex:1;min-height:0;overflow-y:auto;|.main{flex:1;overflow-y:auto;|' \
  "main can shrink (min-height:0)"

# ── chrome must stay out of the scroller ─────────────────────────────────
run_break "nav moved inside the scroller" app/src/shell/app.js \
  's|  app.append(nav());|  col.querySelector(".main").append(nav());|' \
  "navigation is NOT inside the scrolling region"

run_break "search band pinned above the scroller" app/src/shell/app.js \
  's@    if(band) body.prepend(band);@    if(band) col.append(band);@' \
  "band is inside the scrolling region|band is the first element of the page"

run_break "band drops below the content" app/src/shell/app.js \
  's@    if(band) body.prepend(band);@    if(band) body.append(band);@' \
  "band is the first element of the page"

run_break "divider returns under the band" app/src/styles/shell.html \
  's|^\.searchband{width:100%}|.searchband{width:100%;border-bottom:1px solid var(--line)}|' \
  "no divider under the band"

run_break "top bar loses flex:none" app/src/styles/shell.html \
  's|^\.topbar{flex:none;display:flex;|.topbar{display:flex;|' \
  "top bar cannot shrink"

run_break "nav loses flex:none" app/src/styles/shell.html \
  's|^\.nav{flex:none;display:flex;|.nav{display:flex;|' \
  "navigation cannot shrink"

run_break "nav positioned absolutely" app/src/styles/shell.html \
  's|^\.nav{flex:none;display:flex;|.nav{position:absolute;flex:none;display:flex;|' \
  "no fixed/absolute positioning on the nav"

# ── search placement and iOS zoom ────────────────────────────────────────
run_break "no search band at all" app/src/shell/app.js \
  's@  const key = (SEARCHABLE\[S.role\]||{})\[S.page\];@  const key = null;@' \
  "search band exists|the band holds a search control"

run_break "input font below the iOS threshold" app/src/styles/shell.html \
  's|--f-input:16px;|--f-input:14px;|' \
  "--f-input is 16px"

run_break "search reverts to a rowitem card" app/src/lib/components.js \
  's@class:"searchbar", attrs:{type:"button"}@class:"rowitem card", attrs:{type:"button"}@' \
  "the band holds a search control|home search navigates (is a button)"

run_break "user zoom disabled" app/src/styles/shell.html \
  's|initial-scale=1, viewport-fit=cover|initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover|' \
  "user zoom is not disabled"

# ── profile pinned to the rail bottom ────────────────────────────────────
run_break "profile removed from the rail footer" app/src/shell/app.js \
  's|{k:"profile",   ic:"profile", fn:riderProfile,    dock:true, foot:true},|{k:"profile",   ic:"profile", fn:riderProfile,    dock:true},|' \
  "rail footer exists"

run_break "footer no longer last in the rail" app/src/shell/app.js \
  's|    el.append(f);|    el.insertBefore(f, el.firstChild);|' \
  "footer is the last child of the nav"

run_break "footer divider removed" app/src/styles/shell.html \
  's|    padding-top:var(--s3);border-top:1px solid var(--line);margin-top:var(--s3)}|    padding-top:var(--s3);margin-top:var(--s3)}|' \
  "footer is separated by a divider"

run_break "profile unreachable on a phone" app/src/shell/app.js \
  's|    foot.forEach(p=> items.append(navItem(p, "compact-only")));|    /* removed */;|' \
  "compact copy of the item exists"

# ── adaptive behaviour ───────────────────────────────────────────────────
run_break "rail never appears (no medium breakpoint)" app/src/styles/shell.html \
  's|^/\* medium and up: side rail \*/|/* removed */\n@media (min-width:99999px){|' \
  "medium turns the nav into a vertical rail"

run_break "expanded rail never widens" app/src/styles/shell.html \
  's|  .nav{width:var(--rail-expanded);padding-inline:var(--s3)}|  .nav{padding-inline:var(--s3)}|' \
  "expanded widens the rail"

run_break "content cap removed" app/src/styles/shell.html \
  's|^\.main__inner{width:100%;max-width:var(--content-max);margin-inline:auto;|.main__inner{width:100%;|' \
  "content wrapper is centred"

run_break "safe area ignored by the nav" app/src/styles/shell.html \
  's|    padding:var(--s2) var(--s2) calc(var(--s2) + var(--safe-b))}|    padding:var(--s2)}|' \
  "bottom bar clears the home indicator"

# ── accent colour ────────────────────────────────────────────────────────
run_break "accent collapses into the brand" app/src/styles/shell.html \
  's|  --accent:var(--violet-500); --accent-hover:var(--violet-600);|  --accent:var(--teal-500); --accent-hover:var(--violet-600);|' \
  "accent and brand are different roles"

run_break "accent unused in the product" app/src/shell/app.js \
  's|    wrap.append($("button",{class:"chip chip--accent", attrs:{type:"button",|    wrap.append($("button",{class:"chip", attrs:{type:"button",|' \
  "accent is actually used in the product"

run_break "hardcoded hex colour" app/src/styles/shell.html \
  's|^\.btn--primary{background:var(--brand);color:var(--on-brand)}|.btn--primary{background:#0E7C66;color:var(--on-brand)}|' \
  "no hardcoded colour in css rules"

# ── behaviour that must not regress ──────────────────────────────────────
run_break "physical margin breaks rtl" app/src/styles/shell.html \
  's|^\.stops{position:relative;padding-inline-start:var(--s6)}|.stops{position:relative;padding-left:var(--s6)}|' \
  "layout uses logical properties, not left/right"

run_break "icon button loses its label" app/src/lib/components.js \
  's|attrs:{type:"button","aria-label":label}, on:{click:on\|\|(()=>{})}}, icon(name));|attrs:{type:"button"}, on:{click:on\|\|(()=>{})}}, icon(name));|' \
  "every icon-only button is labelled"

run_break "support sees identity documents" app/src/screens/staff.js \
  's|      Btn({label:"Escalate", kind:"ghost", on:()=>toast("Escalated")}))));|      Btn({label:"Escalate", kind:"ghost", on:()=>toast("Escalated")})), KV("Document","National ID")));|' \
  "support cannot see identity documents"

run_break "map loses its illustrative label" app/src/lib/components.js \
  's|    \$("div",{class:"attribution",text:t("mapMock")}));|    null);|' \
  "every drawn map is labelled illustrative"

run_break "taken slot becomes claimable" app/src/screens/driver.js \
  's|        dis: taken \|\| mine,|        dis: false,|' \
  "taken slots cannot be claimed|taken slots exist to test"

run_break "forecast without its source" app/src/data/content.js \
  's|ridersWaiting:"riders searched this slot yesterday",|ridersWaiting:"expected riders",|' \
  "the recommendation states its evidence"

run_break "closed boarding point tappable" app/src/screens/rider.js \
  's|      bordered:true, chev:b.ok, dis:!b.ok, selected:S.chosenBoard===b.id,|      bordered:true, chev:b.ok, selected:S.chosenBoard===b.id,|' \
  "closed point is disabled by attribute, not just styling|closed boarding points exist to test"

run_break "price ignores seat count" app/src/screens/rider.js \
  's|  const unit=street?DATA.streetPickupFare:d.fare, total=unit\*S.seats;|  const unit=street?DATA.streetPickupFare:d.fare, total=unit;|' \
  "price responds to seat count"

run_break "back button goes nowhere" app/src/lib/components.js \
  's|^const back = () => { S.page = S.stack.pop() \|\| DEFAULT_PAGE\[S.role\]; S.sheet=null; render(); };|const back = () => { S.sheet=null; render(); };|' \
  "back returns to routes"

run_break "prototype harness returns" app/src/shell/app.js \
  's|  el.append(\$("div",{class:"nav__brand"}, icon("logo"), \$("span",{text:t("brand")})));|  el.append($("div",{class:"nav__brand"}, icon("logo"), $("span",{text:"GUI prototype"})));|' \
  "no prototype harness remains"

run_break "input loses its label" app/src/lib/components.js \
  's|      \$("input",{attrs:{type:"search", placeholder, "aria-label":placeholder}}))|      $("input",{attrs:{type:"search", placeholder}}))|' \
  "every input is labelled|field is labelled"

echo
echo "──────── breaks caught: $PASS   missed: $FAIL ────────"
[ "$FAIL" -eq 0 ] || exit 1
