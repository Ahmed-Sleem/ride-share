#!/usr/bin/env bash
# §0.2 — break the thing each check guards, watch it fail for the RIGHT reason,
# then restore. A check never observed failing is an assumption in a test's clothing.
set -u
cd "$(dirname "$0")/.."
PASS=0; FAIL=0

run_break () {                       # name | file | sed-expr | expected-failing-test
  local name="$1" file="$2" expr="$3" expect="$4"
  cp "$file" "$file.bak"
  sed -i "$expr" "$file"
  if cmp -s "$file" "$file.bak"; then
    echo "  BROKEN-BREAK  $name → edit did not change the file"
    FAIL=$((FAIL+1)); mv "$file.bak" "$file"; return
  fi
  node build.js >/dev/null 2>&1
  local out; out="$(node tests/unit.test.js 2>&1)"
  mv "$file.bak" "$file"; node build.js >/dev/null 2>&1
  local hit=""; IFS='|' read -ra WANT <<< "$expect"
  # -F: expectation names are LITERAL strings (e.g. "(no [object Object])" —
  # a regex grep treats the brackets as a character class and can never match).
  for e in "${WANT[@]}"; do echo "$out" | grep -Fq "FAIL  $e" && hit="$e"; done
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
run_break "root not viewport height" src/styles/shell.html \
  's|^#root{height:100vh;height:100dvh;width:100%;display:flex}|#root{width:100%;display:flex}|' \
  "root is viewport height"

run_break "body allowed to scroll" src/styles/shell.html \
  's|^html,body{height:100%;margin:0;padding:0;overflow:hidden}|html,body{height:100%;margin:0;padding:0}|' \
  "page itself never scrolls"

run_break "main cannot shrink" src/styles/shell.html \
  's|^\.main{flex:1;min-height:0;overflow-y:auto;|.main{flex:1;overflow-y:auto;|' \
  "main can shrink (min-height:0)"

# ── chrome must stay out of the scroller ─────────────────────────────────
run_break "nav moved inside the scroller" src/shell/app.js \
  's|  app.append(nav());|  col.querySelector(".main").append(nav());|' \
  "navigation is NOT inside the scrolling region"

run_break "search band pinned above the scroller" src/shell/app.js \
  's@    if(band) body.prepend(band);@    if(band) col.append(band);@' \
  "band is inside the scrolling region|band is the first element of the page"

run_break "band drops below the content" src/shell/app.js \
  's@    if(band) body.prepend(band);@    if(band) body.append(band);@' \
  "band is the first element of the page"

run_break "divider returns under the band" src/styles/shell.html \
  's|^\.searchband{width:100%}|.searchband{width:100%;border-bottom:1px solid var(--line)}|' \
  "no divider under the band"

run_break "top bar loses flex:none" src/styles/shell.html \
  's|^\.topbar{flex:none;display:flex;|.topbar{display:flex;|' \
  "top bar cannot shrink"

run_break "nav loses flex:none" src/styles/shell.html \
  's|^\.nav{flex:none;display:flex;|.nav{display:flex;|' \
  "navigation cannot shrink"

run_break "nav positioned absolutely" src/styles/shell.html \
  's|^\.nav{flex:none;display:flex;|.nav{position:absolute;flex:none;display:flex;|' \
  "no fixed/absolute positioning on the nav"

# ── search placement and iOS zoom ────────────────────────────────────────
run_break "no search band at all" src/shell/app.js \
  's@  const key = (SEARCHABLE\[S.role\]||{})\[S.page\];@  const key = null;@' \
  "search band exists|the band holds a search control"

run_break "input font below the iOS threshold" src/styles/shell.html \
  's|--f-input:16px;|--f-input:14px;|' \
  "--f-input is 16px"

run_break "search reverts to a rowitem card" src/lib/components.js \
  's@class:"searchbar", attrs:{type:"button"}@class:"rowitem card", attrs:{type:"button"}@' \
  "the band holds a search control|home search navigates (is a button)"

run_break "user zoom disabled" src/styles/shell.html \
  's|initial-scale=1, viewport-fit=cover|initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover|' \
  "user zoom is not disabled"

# ── profile pinned to the rail bottom ────────────────────────────────────
run_break "profile removed from the rail footer" src/shell/app.js \
  's|{k:"profile",   ic:"profile", fn:riderProfile,    dock:true, foot:true},|{k:"profile",   ic:"profile", fn:riderProfile,    dock:true},|' \
  "rail footer exists"

run_break "footer no longer last in the rail" src/shell/app.js \
  's|    el.append(f);|    el.insertBefore(f, el.firstChild);|' \
  "footer is the last child of the nav"

run_break "footer divider removed" src/styles/shell.html \
  's|    padding-top:var(--s3);border-top:1px solid var(--line);margin-top:var(--s3)}|    padding-top:var(--s3);margin-top:var(--s3)}|' \
  "footer is separated by a divider"

run_break "profile unreachable on a phone" src/shell/app.js \
  's|    foot.forEach(p=> items.append(navItem(p, "compact-only")));|    /* removed */;|' \
  "compact copy of the item exists"

# ── adaptive behaviour ───────────────────────────────────────────────────
run_break "rail never appears (no medium breakpoint)" src/styles/shell.html \
  's|^/\* medium and up: side rail \*/|/* removed */\n@media (min-width:99999px){|' \
  "medium turns the nav into a vertical rail"

run_break "expanded rail never widens" src/styles/shell.html \
  's|  .nav{width:var(--rail-expanded);padding-inline:var(--s3)}|  .nav{padding-inline:var(--s3)}|' \
  "expanded widens the rail"

run_break "content cap removed" src/styles/shell.html \
  's|^\.main__inner{width:100%;max-width:var(--content-max);margin-inline:auto;|.main__inner{width:100%;|' \
  "content wrapper is centred"

run_break "safe area ignored by the nav" src/styles/shell.html \
  's|    padding:var(--s2) var(--s2) calc(var(--s2) + var(--safe-b))}|    padding:var(--s2)}|' \
  "bottom bar clears the home indicator"

# ── accent colour ────────────────────────────────────────────────────────
run_break "accent collapses into the brand" src/styles/shell.html \
  's|  --accent:var(--coral-500); --accent-hover:var(--coral-600);|  --accent:var(--violet-500); --accent-hover:var(--coral-600);|' \
  "accent and brand are different roles"

run_break "accent unused in the product" src/shell/app.js \
  's|    wrap.append($("button",{class:"chip chip--accent", attrs:{type:"button",|    wrap.append($("button",{class:"chip", attrs:{type:"button",|' \
  "accent is actually used in the product"

run_break "hardcoded hex colour" src/styles/shell.html \
  's|^\.btn--primary{background:linear-gradient(135deg,var(--brand),var(--brand-2));|.btn--primary{background:linear-gradient(135deg,#6C63FF,var(--brand-2));|' \
  "no hardcoded colour in css rules"

# ── behaviour that must not regress ──────────────────────────────────────
run_break "physical margin breaks rtl" src/styles/shell.html \
  's|^\.stops{position:relative;padding-inline-start:var(--s6)}|.stops{position:relative;padding-left:var(--s6)}|' \
  "layout uses logical properties, not left/right"

run_break "icon button loses its label" src/lib/components.js \
  's|attrs:{type:"button","aria-label":label}, on:{click:on\|\|(()=>{})}}, icon(name));|attrs:{type:"button"}, on:{click:on\|\|(()=>{})}}, icon(name));|' \
  "every icon-only button is labelled"

run_break "support regains a fake refund action" src/screens/staff.js \
  's|  w.append(Empty("lookup", t("nav.lookup"), t("supportComing")));|  w.append(Btn({label:"Refund (max 1 fare)", on:()=>toast("Refunded")}));|' \
  "support shows an honest coming-soon state (no fake refund)"

run_break "map loses its illustrative label" src/lib/components.js \
  's|    \$("div",{class:"attribution",text:t("mapMock")}));|    null);|' \
  "every drawn map is labelled illustrative"

run_break "driver duty reverts to fake earnings" src/screens/driver.js \
  's|  w.append($("h2",{class:"t-head",text:t("myJourneysTitle")}));|  w.append($("div",{class:"metric",text:"412 EGP"}));  w.append($("h2",{class:"t-head",text:t("myJourneysTitle")}));|' \
  "driver duty renders the real journeys loader"

run_break "sample content returns to the bundle" src/data/content.js \
  's|const T = {|const T = {\n  sample:"Corniche Line",|' \
  "no sample content in the bundle (demo data is gone)"

run_break "stops tool loses its coordinate form" src/screens/staff.js \
  's|      field("stop-lat", t("latLabel"), "text", "off"),|      field("stop-latX", t("latLabel"), "text", "off"),|' \
  "stops tool has a coordinate form"

run_break "stops tool loses its CSV import" src/screens/staff.js \
  's|    $("textarea",{class:"input", attrs:{id:"stop-csv"|    $("textarea",{class:"input", attrs:{id:"stop-csvX"|' \
  "stops tool has a CSV import"

run_break "landing loses the drive how-to steps" src/screens/landing.js \
  's|$("h2", { class: "landing__h2", text: t("driveStepsKick") })|$("h2", { class: "landing__h2", text: t("driveStepsKickX") })|' \
  "drive page has the how-to steps"

run_break "landing loses its policy links" src/screens/landing.js \
  's|      policyLink("terms"), policyLink("privacy"), policyLink("safety")));|      null));|' \
  "landing footer links policies"

run_break "policies revert to empty placeholders" src/data/content.js \
  's|policyTerms:\[|policyTermsX:[|' \
  "terms doc has real sections (en)"

run_break "landing loses the page nav links" src/screens/landing.js \
  's|const links = \[\["rider", "navRide"\], \["drive", "navDrive"\], \["about", "navAbout"\], \["help", "navHelp"\]\];|const links = [["rider", "navRide"]];|' \
  "top bar has Ride/Drive/About/Help links"

run_break "landing loses the sticky stacking panels" src/screens/landing.js \
  's|      stackPanel("seat",  "1", "violet", t("panel1T"), t("panel1B"), t("panelKick")),|      null,|' \
  "rider landing has 4 stacking panels"

run_break "logo path hardcoded again (second definition)" src/lib/components.js \
  's|const LOGO_PATH = BRAND.logo.path;|const LOGO_PATH = "M0 0";|' \
  "logo path is read from BRAND, not hardcoded"

run_break "copy table stops reading the brand name" src/data/content.js \
  's|brand:BRAND.name.en, tagline:BRAND.tagline.en,|brand:"X", tagline:BRAND.tagline.en,|' \
  "copy table reads the brand name"

run_break "routes tool loses its create form" src/screens/staff.js \
  's|      field("route-name-en", t("stopNameEn"), "text", "off"),|      field("route-name-enX", t("stopNameEn"), "text", "off"),|' \
  "routes tool has a create form"

run_break "driver work board loses its loader" src/screens/driver.js \
  's|  const list = $("div",{id:"work-list"});|  const list = $("div",{id:"work-listX"});|' \
  "driver work board renders the find-work loader"

run_break "booked screen loses the boarding code" src/screens/rider.js \
  's|    w.append(QRPanel({code:b.code}));|    /* removed */;|' \
  "booked shows the boarding code"

run_break "own capture shows approve (two-person rule UI)" src/screens/staff.js \
  's|    mine ? null : Btn({label:t("approveStop"), on:()=>reviewStopAction(s.id, "approved")}),|    Btn({label:t("approveStop"), on:()=>reviewStopAction(s.id, "approved")}),|' \
  "own capture hides the approve action"

run_break "rider home reverts to sample routes" src/screens/rider.js \
  's|  loadRiderRoutesInto(list);|  loadRiderRoutesInto(list); w.append($("div",{class:"routecard",text:"Corniche Line"}));|' \
  "home has no sample route strings"

run_break "trips tab switch reverts to full render (refetch)" src/screens/rider.js \
  's|on:{click:()=>{ if(S.tripTab===k) return; S.tripTab=k; tripsSyncTabs(); tripsRenderList(); }}|on:{click:()=>{ S.tripTab=k; render(); }}|' \
  "tab switch does NOT refetch (seamless)"

run_break "search normalization drops teh-marbuta unification" src/lib/search.js \
  's|u0647|u0648|' \
  "normalization unifies teh marbuta and heh"

run_break "back button goes nowhere" src/lib/components.js \
  's|^const back = () => { S.page = S.stack.pop() \|\| DEFAULT_PAGE\[S.role\]; S.sheet=null; render(); };|const back = () => { S.sheet=null; render(); };|' \
  "back returns to routes"

run_break "prototype harness returns" src/shell/app.js \
  's|  el.append($("div",{class:"nav__brand"}, logoSVG(), $("span",{text:t("brand")})));|  el.append($("div",{class:"nav__brand"}, logoSVG(), $("span",{text:"GUI prototype"})));|' \
  "no prototype harness remains"

# ── modernisation: rail collapse, auto theme, brand mark ─────────────────
run_break "rail never collapses" src/styles/shell.html \
  's|  .app.rail-collapsed .nav{width:var(--rail-collapsed)}|  .app.rail-collapsed .nav{width:var(--rail-expanded)}|' \
  "collapse rule exists in css"

run_break "theme loses its auto option" src/screens/rider.js \
  's|\[\["auto",t("themeAuto")\],\["light",t("themeLight")\],\["dark",t("themeDark")\]\]|\[\["light",t("themeLight")\],\["dark",t("themeDark")\]\]|' \
  "profile offers three theme options"

run_break "favicon removed" src/styles/shell.html \
  's|rel="icon"|rel="iconx"|' \
  "favicon is embedded"

run_break "logo loses its gradient" src/lib/components.js \
  's|"url(#brandGrad)"|"currentColor"|' \
  "logo references the gradient"

run_break "input loses its label" src/lib/components.js \
  's|attrs:{type:"search", placeholder, "aria-label":placeholder}|attrs:{type:"search", placeholder}|' \
  "every input is labelled|field is labelled"


# ── M1: splash, landing, collapsed-by-default, no demo switcher ──────────
run_break "rail not collapsed by default" src/lib/components.js \
  's|rail: storeGet("rs.rail") ?? "collapsed",|rail: storeGet("rs.rail") ?? "open",|' \
  "rail defaults to collapsed"

run_break "splash loses its container" src/shell/app.js \
  's|return \$("div",{class:"splash"|return $("div",{class:"nosplash"|' \
  "boot shows the splash"

run_break "landing loses its hero" src/screens/landing.js \
  's|class: "landing__hero"|class: "landing__heroX"|' \
  "landing renders the hero"

run_break "demo role switcher returns" src/shell/app.js \
  's|  wrap.append(themeToggle());|  wrap.append($("select",{class:"chip", attrs:{"aria-label":"Role"}}));\n  wrap.append(themeToggle());|' \
  "no demo role switcher"


# ── M1.5: verification & recovery UI ─────────────────────────────────────
run_break "forgot-password link removed" src/screens/auth.js \
  's|text:t("forgotPassword")|text:t("forgotPasswordX")|' \
  "sign-in shows the forgot-password link"

run_break "resend button removed" src/screens/auth.js \
  's|    resendButton(onResend),|    null,|' \
  "resend button shows a countdown and is disabled"


# ── M1.7: hero art (no slideshow) ─────────────────────────────────────────
run_break "story panels removed from the rider page" src/screens/landing.js \
  's|stackPanel("seat",  "1", "violet", t("panel1T"), t("panel1B"), t("panelKick")),|null,|' \
  "story panels sit after the hero|rider landing has 4 stacking panels"

# ── M1.8: email auth + slider polish ──────────────────────────────────────
run_break "role-choice chevron loses its size" src/styles/shell.html \
  's|.rolechoice .chev{color:var(--text-muted);width:var(--icon-md);height:var(--icon-md);flex:none}|.rolechoice .chev{color:var(--text-muted);flex:none}|' \
  "role-choice chevron has an explicit size"

run_break "streamline credit returns" src/screens/landing.js \
  's|policyLink("safety")));|policyLink("safety")), $("a",{class:"landing__credits",text:"Vectors by Streamline"}));|' \
  "footer has no Streamline credit|the Streamline credit is gone"

run_break "story panel returns a gradient" src/styles/shell.html \
  's|.stackpanel--violet{background:var(--violet-700)}|.stackpanel--violet{background:linear-gradient(160deg,var(--brand-soft),transparent)}|' \
  "story panels are bold (violet card has no gradient)"

run_break "feature hover loses the bounce" src/styles/shell.html \
  's|transform var(--slow) var(--bounce),border-color|transform var(--slow) var(--ease),border-color|' \
  "feature hover uses the bounce easing"

run_break "dark doodle accents removed" src/styles/shell.html \
  's|\[data-theme="dark"\] \.landing__step--violet \.landing__stepart{--sticker-accent:var(--violet-300)}|[data-theme="dark"] .landing__step--violet .landing__stepart{--sticker-accent:var(--accent)}|' \
  "dark mode gives step cards brighter accents"

run_break "otp boxes collapse to five" src/lib/components.js \
  's|for (let i = 0; i < 6; i++)|for (let i = 0; i < 5; i++)|' \
  "OTP step renders six code boxes"

run_break "story doodle loses its white ink" src/styles/shell.html \
  's|.stackpanel__art{width:min(260px,56vw);height:min(200px,42vw);flex:none;color:var(--on-solid)}|.stackpanel__art{width:min(260px,56vw);height:min(200px,42vw);flex:none;color:var(--ink-900)}|' \
  "story doodle is white line-work with a same-hue light accent"

run_break "hero loses its single-illustration marker (v3 one-color rule)" src/screens/landing.js \
  's|  return $("div", { class: "heroart heroart--one", attrs: { "aria-hidden": "true" } },|  return $("div", { class: "heroart heroart--multi", attrs: { "aria-hidden": "true" } },|' \
  "landing shows one intro illustration"

run_break "hero drift animation removed" src/styles/shell.html \
  's|  animation:herodrift 36s ease-in-out infinite alternate}|  /* drift removed */}|' \
  "hero glow drifts very slowly"

run_break "signup name field dropped from the code step" src/screens/auth.js \
  's|      { nameField:true, btnLabel:t("createAccount") });|      { });|' \
  "sign-up collects the name on the code step"

run_break "password eye removed" src/screens/auth.js \
  's|class:"field__eye"|class:"field__eyeX"|' \
  "password field has a show/hide eye"

run_break "login reads the password after re-render" src/screens/auth.js \
  's|  const password = val("auth-password");|  const password = "";|' \
  "sign-in sends the typed password"

run_break "cooldown re-renders the whole screen" src/screens/auth.js \
  's|      setTimeout(tick, 1000);|      setTimeout(()=>render(), 1000);|' \
  "OTP input survives the ticking countdown (no full re-render)"

run_break "notifications label clobbered by an object" src/data/content.js \
  's|notifications:"Notifications"|notifications:{email_send_failed:"x"}|' \
  "notifications label is a plain string (no [object Object])"

run_break "staff profile shows rider wallet" src/shell/app.js \
  's|{k:"profile",    ic:"profile",  fn:staffProfile,  dock:true, foot:true}|{k:"profile",    ic:"profile",  fn:riderProfile,  dock:true, foot:true}|' \
  "staff profile has no wallet entry|staff profile has no subscriptions entry"

run_break "client ignores the OTP bypass flag" src/screens/auth.js \
  's|    if (res.bypass) {|    if (false) {|' \
  "signup skips the code step when bypass is on"

run_break "bypass sends an empty code string" src/screens/auth.js \
  's|const code = S.otpBypass ? undefined : otpValue();|const code = S.otpBypass ? "" : otpValue();|' \
  "bypass signup omits the code field entirely (no empty-string 400)"

run_break "super_admin offered at staff creation" src/screens/admin.js \
  's|        \["operations","manager","support"\].map(r=>|        ["operations","manager","support","super_admin"].map(r=>|' \
  "staff create offers no super_admin option"

# ── Path A — wallet & payments (P3.7.4) ──────────────────────────────────
run_break "wallet loses its honest paymob-off sentence" src/screens/wallet.js \
  's|Banner("info", t("w_paymobOff"))|Banner("info", t("w_balance"))|' \
  "Paymob off → CTA hidden, honest sentence shown (§8.1)"

run_break "paymentChoice offers a dead insufficient-wallet row" src/screens/wallet.js \
  's|  if(sufficient){|  if(true){|' \
  "insufficient wallet → wallet method absent (not disabled)"

# ── Path B — boarding (P3.8) ─────────────────────────────────────────────
run_break "scan client removed" src/lib/api.js \
  's|scanBooking: (journeyId, code) => API.request("POST", "/bookings/scan", { journeyId, code }),|scanBookingX: (journeyId, code) => API.request("POST", "/bookings/scan", { journeyId, code }),|' \
  "scan API exists"

echo
echo "──────── breaks caught: $PASS   missed: $FAIL ────────"
[ "$FAIL" -eq 0 ] || exit 1
