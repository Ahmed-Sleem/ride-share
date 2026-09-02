#!/usr/bin/env bash
# §0.2 — break the thing each check guards, watch it fail for the RIGHT reason,
# then restore. A check never observed failing is an assumption in a test's clothing.
set -u
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
# Scratch lives OUTSIDE the tree and the trap restores on any exit. A `.bak`
# beside the source is a trap: an interrupted run leaves the product file
# mutated with its only good copy sitting next to it — which has already
# happened here, and it made `verify-repo` read the harness's leftovers as CSS.
BREAKS_TMP="${HOME}/.vtest/breaks-scratch.$$"   # not $TMPDIR: a sandbox rehydrate wipes it
mkdir -p "$BREAKS_TMP/orig"
SCRATCH="$BREAKS_TMP"
INFLIGHT=""
_breaks_restore () {
  [ -n "$INFLIGHT" ] || return 0
  cp "$BREAKS_TMP/${INFLIGHT//\//_}" "$INFLIGHT" 2>/dev/null
  INFLIGHT=""
}
trap '_breaks_restore; rm -rf "$BREAKS_TMP"' EXIT INT TERM

run_break () {                       # name | file | sed-expr | expected-failing-test
  local name="$1" file="$2" expr="$3" expect="$4"
  # BREAKS_ONLY="some words" runs a single case, for reviewing one guard in
  # seconds instead of eighteen minutes. The full run stays the default.
  if [ -n "${BREAKS_ONLY:-}" ]; then case "$name" in *"$BREAKS_ONLY"*) ;; *) return;; esac; fi
  local bak="$BREAKS_TMP/${file//\//_}"
  cp "$file" "$bak"; mkdir -p "$SCRATCH/orig/$(dirname "$file")"; cp -n "$file" "$SCRATCH/orig/$file"; INFLIGHT="$file"
  sed -i "$expr" "$file"
  if cmp -s "$file" "$bak"; then
    echo "  BROKEN-BREAK  $name → edit did not change the file"
    FAIL=$((FAIL+1)); cp "$bak" "$file"; INFLIGHT=""; return
  fi
  node build.js >/dev/null 2>&1
  local out; out="$(node tests/unit.test.js 2>&1)"
  cp "$bak" "$file"; INFLIGHT=""; rm -f "$bak"; node build.js >/dev/null 2>&1
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

run_break "desktop rail never widens" src/styles/shell.html \
  's|^  \.nav{width:var(--rail-expanded);padding-inline|  .nav{padding-inline|' \
  "expanded widens the rail"

run_break "the landing's full-width declaration is dropped" src/styles/shell.html \
  's@^\.landing{width:100%;min-width:0;height:100%@.landing{height:100%@' \
  "the landing is declared full width"

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
  's|  --accent:var(--ink-700); --accent-hover:var(--ink-600);|  --accent:var(--ink-900); --accent-hover:var(--ink-600);|' \
  "brand and accent are different roles|accent is a distinct ink step"

run_break "accent unused in the product" src/shell/app.js \
  's|    wrap.append($("button",{class:"chip chip--accent", attrs:{type:"button",|    wrap.append($("button",{class:"chip", attrs:{type:"button",|' \
  "accent is actually used in the product"

run_break "hardcoded hex colour" src/styles/shell.html \
  's|^\.btn--primary{background:var(--brand);color:var(--on-brand)}|.btn--primary{background:#6C63FF;color:var(--on-brand)}|' \
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

run_break "the stop form loses its coordinate field" src/screens/staff.js \
  's|      field("stop-lat", t("latLabel"), "text", "off"),|      field("stop-latX", t("latLabel"), "text", "off"),|' \
  "route form has stop coordinates|route detail owns stop add (no separate stops page)"

# Retired: a "stops tool loses its CSV import" case used to sit here. The only
# CSV control is in opsStops(), which no nav reaches since stops became a route
# property (M2), so its check could only ever watch dead markup; the endpoint it
# calls is covered server-side. If the owner keeps opsStops on purpose, the live
# form is where an import belongs — add the guard with the control, not before.

run_break "super_admin offered at staff creation" src/screens/admin.js \
  's|  \["operations","manager","support"\].forEach((r) => {|  ["operations","manager","support","super_admin"].forEach((r) => {|' \
  "staff create offers no super_admin option"

run_break "super_admin offered at staff editing" src/screens/admin.js \
  's|        \["operations","manager","support"\].map(r=>|        ["operations","manager","support","super_admin"].map(r=>|' \
  "staff edit offers no super_admin option"

run_break "landing loses the drive how-to steps" src/screens/landing.js \
  's|mkSlab("driveStepsKick", "driveStepsT", \[|mkSlab("driveStepsKickX", "driveStepsT", \[|' \
  "drive page has the how-to steps"

run_break "landing loses its policy links" src/screens/landing.js \
  's|policyLink("terms"), policyLink("privacy"), policyLink("safety")|policyLink("terms")|' \
  "landing footer links policies"

run_break "policies revert to empty placeholders" src/data/content.js \
  's|policyTerms:\[|policyTermsX:[|' \
  "terms doc has real sections (en)"

run_break "landing loses the page nav links" src/screens/landing.js \
  's|\["about", "navAbout"\],||' \
  "nav renders Ride/Drive/About/Help/Get-the-app|top bar has Ride/Drive/About/Help links"

run_break "landing loses the chapter panels" src/screens/landing.js \
  's|        mkPanels(RIDER_PANELS),|        null,|' \
  "rider landing lists the four chapters"

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
  's|    w.append(QRPanel({code:String(b.code)}));|    /* removed */;|' \
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

run_break "the board screen's camera handler disappears" src/screens/driver.js \
  's|async function scanCameraAction(journeyId) {|async function scanCameraActionGone(journeyId) {|' \
  "the board screen's camera handler exists|a denied camera says so and keeps the keypad"

run_break "the logo stops inheriting the ink" src/lib/components.js \
  's|p.setAttribute("fill", fill [|][|] "currentColor")|p.setAttribute("fill", fill \|\| "#111111")|' \
  "the logo inherits ink"

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
run_break "the journey is removed from the rider page" src/screens/landing.js \
  's|mkJourney(RIDER_CUTS, {|mkJourney([], {|' \
  "the journey carries the seven claims"

# ── M1.8: email auth + slider polish ──────────────────────────────────────
run_break "role-choice chevron loses its size" src/styles/shell.html \
  's|.rolechoice .chev{color:var(--text-muted);width:var(--icon-md);height:var(--icon-md);flex:none}|.rolechoice .chev{color:var(--text-muted);flex:none}|' \
  "role-choice chevron has an explicit size"

run_break "streamline credit returns" src/screens/landing.js \
  's|policyLink("safety"))|policyLink("safety"), $("a",{class:"landing__credits",text:"Vectors by Streamline"}))|' \
  "footer has no Streamline credit|the Streamline credit is gone"

run_break "the chapters come back as colour blocks" src/styles/shell.html \
  's|.landing__feature{display:grid;|.landing__feature{background:var(--stage);display:grid;|' \
  "the chapters are ink on paper, never a colour block"

run_break "feature hover loses the bounce" src/styles/shell.html \
  's|transform var(--slow) var(--bounce),background|transform var(--slow) var(--ease),background|' \
  "feature hover uses the bounce easing"

run_break "dark mode forgets to invert the slab" src/styles/shell.html \
  's|  --stage:var(--ink-0); --stage-line:rgba(10,10,10,.16);|  --stage:var(--ink-900); --stage-line:rgba(255,255,255,.16);|' \
  "only the slab inverts, and dark inverts the slab"

run_break "otp boxes collapse to five" src/lib/components.js \
  's|for (let i = 0; i < 6; i++)|for (let i = 0; i < 5; i++)|' \
  "OTP step renders six code boxes"

run_break "the map stops being decoration" src/lib/landing-parts.js \
  's|attrs: { "data-journey-map": "", "aria-hidden": "true", focusable: "false" },|attrs: { "data-journey-map": "", focusable: "false" },|' \
  "the map is decoration and every label on it comes from the copy table"

run_break "the masthead loses its third line" src/screens/landing.js \
  's|{ k: "mkDisplay2" }, { k: "mkDisplay3", out: true }|{ k: "mkDisplay2" }|' \
  "the masthead prints three lines and no illustration"

run_break "the running band stops looping" src/styles/shell.html \
  's|  .landing__marquee-in{animation:landingslide var(--marquee) linear infinite}|  /* loop removed */|' \
  "the running band is one row doubled and shifted by half|the band only moves when the reader allows motion"

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


# ── Path A — wallet & payments (P3.7.4) ──────────────────────────────────
run_break "wallet loses its honest paymob-off sentence" src/screens/wallet.js \
  's|Banner("info", t("w_paymobOff"))|Banner("info", t("w_balance"))|' \
  "Paymob off → CTA hidden, honest sentence shown (§8.1)"

run_break "paymentChoice offers a dead insufficient-wallet row" src/screens/wallet.js \
  's|  if(sufficient){|  if(true){|' \
  "insufficient wallet → wallet method absent (not disabled)"

# ── Path B — boarding (P3.8) ─────────────────────────────────────────────
run_break "wallet book loses the pay-wallet call" src/screens/rider.js \
  's|await API.payWallet(booking.id);|/* pay-wallet removed */;|' \
  "wallet book calls pay-wallet"

run_break "scan client removed" src/lib/api.js \
  's|scanBooking: (journeyId, code) => API.request("POST", "/bookings/scan", { journeyId, code }),|scanBookingX: (journeyId, code) => API.request("POST", "/bookings/scan", { journeyId, code }),|' \
  "scan API exists"

run_break "planner ranking removed" src/lib/search.js \
  's|function planJourneys(start, dest, index) {|function planJourneysX(start, dest, index) {|' \
  "planner is exported|same-line start→end recommends the line"

run_break "desktop density reverts to stretched-phone tokens" src/styles/shell.html \
  's|--density:compact;|--density:comfortable;|' \
  "desktop switches density to compact"

run_break "SOS client removed" src/lib/api.js \
  's#raiseSos: (body) => API.request("POST", "/support/sos", body || {}),#raiseSosX: (body) => API.request("POST", "/support/sos", body || {}),#' \
  "SOS client exists"

# ── Path A — RouteMap, the one map primitive (R21) ───────────────────────
run_break "RouteMap loses its accessible stop list highlight" src/lib/map.js \
  's|text: t("m_boardingHere")|text: t("m_stopsAria")|' \
  "highlighted stop carries the boarding chip"

# ── Path A — planner search (DEC-206) ────────────────────────────────────
run_break "planner loses its combobox semantics" src/screens/planner.js \
  's|role: "combobox", "aria-expanded"|role: "textbox", "aria-expanded"|' \
  "inputs are comboboxes wired to the list (a11y)"

run_break "website guest home shows intro slides" src/lib/components.js \
  's|  S.view = "landing";|  S.view = "intro"; S.introSlide = 0;|' \
  "website guest opens landing, not intro"

echo
# ── the renewal's own rules: a real QR, and a complete copy table ─────────
run_break "the install code goes back to a third-party service" src/lib/components.js \
  's|const q = QR.encode(text, "M");|const q = (() => { const i = document.createElement("img"); i.className = "dlqr"; i.src = "https://api.qrserver.com/q/?data=" + encodeURIComponent(text); return i; })();|' \
  "no QR is fetched from anywhere|the install code is drawn locally from the same URL the button opens"

run_break "a key is dropped from the Arabic table" src/data/content.js \
  's|  mkStop1:"اطلب",||' \
  "every key exists in both languages"

run_break "the QR encoder starts truncating instead of refusing" src/lib/qr.js \
  's|if (!version) throw new Error("QR: payload does not fit|if (false) throw new Error("QR: payload does not fit|' \
  "an oversized payload fails loudly instead of truncating"

run_break "the format bits stop being masked" src/lib/qr.js \
  's|bchRemainder(data, 0x537)) ^ 0x5412;|bchRemainder(data, 0x537)) ^ 0x5413;|' \
  "v1L writes a format area a scanner can read|QR matches the reference"

run_break "mask 0 stops matching its definition" src/lib/qr.js \
  's|(r, c) => (r + c) % 2 === 0|(r, c) => (r + c) % 2 === 1|' \
  "QR matches the reference"

# The summary goes last: every case above must have run before the count is
# printed, and the exit code is what CI reads.
run_break "a landing grid track goes back to content-bound" src/styles/shell.html \
  's@grid-template-columns:minmax(0,1fr);gap:var(--flow)@grid-template-columns:1fr;gap:var(--flow)@' \
  "no landing grid leaves a track at its content width"

# ── the renewal: one name, one curtain, one measured screen ─────────────────
run_break "the curtain is armed per view instead of per route" src/shell/app.js \
  's@PageFx.armed(PageFx.routeKey(S), render)@PageFx.armed(S.view, render)@' \
  "the transition is armed where every view change passes"

run_break "the curtain forgets to invert for the dark sheet" src/styles/shell.html \
  's|  --fx-ink:var(--ink-50);||' \
  "the curtain is visible on the dark sheet too"

run_break "the curtain rises under the sticky bar" src/styles/shell.html \
  's@--z-pagefx:95;@--z-pagefx:5;@' \
  "the curtain covers the sticky bar"

run_break "the splash leaves before the page has loaded" src/shell/app.js \
  's@Promise\.all(\[minDelay, session, loaded\])@Promise.all([minDelay, session])@' \
  "the splash waits for the page to load before it leaves"

run_break "the splash stops handing off through the curtain" src/shell/app.js \
  's@PageFx.handoff(swap);@swap();@' \
  "the splash hands off through the same curtain"

run_break "the masthead goes back to a guessed unit" src/styles/shell.html \
  's@min-height:var(--view-h,100dvh);@min-height:100vh;@' \
  "the viewport is measured and published"

run_break "the intro goes back to width-only type" src/styles/shell.html \
  's@--f-intro:clamp(1.45rem,min(7vw,6.2vh),2.6rem);@--f-intro:clamp(1.45rem,7vw,2.6rem);@' \
  "the intro is measured on both axes"

run_break "the store cards stack again" src/styles/shell.html \
  's@.landing__dlcards{grid-template-columns:repeat(2,minmax(0,1fr))}@.landing__dlcards{grid-template-columns:minmax(0,1fr)}@' \
  "the two stores share a row once there is room"

run_break "the map is put back in a band of its own height" src/styles/shell.html \
  's@.journey__svg{position:absolute;inset:0;width:100%;height:100%;@.journey__svg{position:static;width:100%;height:520px;@' \
  "the map covers the section it belongs to"

run_break "the bar puts every control on one line" src/styles/shell.html \
  's@.landing__actions>.btn{margin-inline-start:var(--s3)}@.landing__actions>.btn{margin-inline-start:0}@' \
  "the auth pair is set apart from the switches"

# Re-anchored 2026-09-03: the bar stopped centring with `position:absolute` and a transform
# (a logical anchor with a physical shift, one element width off in RTL), so the pair the case
# must disturb is now `justify-self:center` on the grid item — and the guard was renamed with it.
run_break "the page names leave the centre of the bar" src/styles/shell.html \
  's@letter-spacing:-.005em;min-width:0;justify-self:center}@letter-spacing:-.005em;min-width:0}@' \
  "the page names are centred by equal tracks, in either direction"

run_break "the foot line goes back to the slogan" src/screens/landing.js \
  's@t("rights")@t("landingFoot")@' \
  "the foot line is built from the brand, not typed out"

run_break "a cut driver chapter comes back" src/screens/landing.js \
  's@  { t: "driverF3T", b: "driverF3B" },@  { t: "driverF3T", b: "driverF3B" },\n  { t: "driverF5T", b: "driverF5B" },@' \
  "the driver page states four decisions|the deleted driver claims are deleted, not hidden"

run_break "the installer file name is typed out again" src/lib/landing-parts.js \
  's@download: BRAND.download.apk@download: "ride-share.apk"@' \
  "the installer's file name comes from brand.json"

# Every case backs up before it mutates; this proves the product tree came back whole.
# A leftover mutation is not a test failure — it is a corrupted build that the next suite
# would read as truth, which has already happened here.
drift=0
if [ -d "$SCRATCH/orig" ]; then
  while IFS= read -r f; do
    rel="${f#$SCRATCH/orig/}"
    cmp -s "$f" "$rel" || { echo "  RESTORE FAILED  $rel"; cp "$f" "$rel" 2>/dev/null; drift=1; }
  done < <(find "$SCRATCH/orig" -type f)
fi
[ "$drift" -eq 0 ] || exit 1

run_break "the curtain's pacing token is renamed in the sheet" src/styles/shell.html \
  's|  --fx-rise:220ms;|  --fx-rise-ms:220ms;|' \
  "every pacing token the curtain reads is defined in the sheet"

echo "──────── breaks caught: $PASS   missed: $FAIL ────────"
[ "$FAIL" -eq 0 ] || exit 1
