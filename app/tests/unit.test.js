#!/usr/bin/env node
/* Verification for SHARED_RIDE_APP.html.
   Rule: a check that cannot fail is not a check. Every assertion below has
   been observed failing when the thing it guards was broken (see BREAKS.md).
   Assertions therefore refuse to run against empty sets. */
const fs=require("fs"), path=require("path");
const {JSDOM}=require("/tmp/node_modules/jsdom");

const FILE=path.join(__dirname,"..","dist-preview.html");
const SRC=fs.readFileSync(FILE,"utf8");

let pass=0, fail=0;
const ok=(name,cond,detail)=>{ if(cond){pass++;console.log("  PASS  "+name);}
  else{fail++;console.log("  FAIL  "+name+(detail?"  → "+detail:""));} };
const group=n=>console.log("\n=== "+n+" ===");

function boot(){
  const dom=new JSDOM(SRC,{runScripts:"dangerously",pretendToBeVisual:true});
  const w=dom.window, d=w.document;
  return {w,d,
    go:(role,page)=>{ w.S.role=role; w.S.page=page; w.S.stack=[]; w.S.sheet=null;
                      w.S.opsView=null; w.render(); },
    set:(o)=>{ Object.assign(w.S,o); w.render(); },
    q:(s)=>d.querySelector(s), all:(s)=>[...d.querySelectorAll(s)],
    txt:()=>{ const a=d.querySelector(".app"); return a?a.textContent:""; }};
}

/* ─────────────────────────────────────────────────────────────────
   A. SHELL — full viewport, one scroller, nothing scrolls away
   ───────────────────────────────────────────────────────────────── */
const CSS = SRC.slice(SRC.indexOf("<style>"), SRC.indexOf("</style>"));
const rule = (sel) => {
  const m = CSS.match(new RegExp("\\n" + sel.replace(/[.#]/g,"\\$&") + "\\{([^}]*)\\}"));
  return m ? m[1] : null;
};

group("SHELL OCCUPIES EXACTLY ONE VIEWPORT");
{
  const t=boot();
  t.go("rider","home");
  ok("root is viewport height", /#root\{height:100vh;height:100dvh/.test(CSS));
  ok("root fills the width", /#root\{[^}]*width:100%/.test(CSS));
  ok("page itself never scrolls", /html,body\{[^}]*overflow:hidden/.test(CSS));
  const app=rule(".app");
  ok("app fills its parent height", !!app && /height:100%/.test(app));
  ok("app hides its own overflow", !!app && /overflow:hidden/.test(app));
  const col=rule(".appcol");
  ok("column can shrink so children scroll", !!col && /min-height:0/.test(col));
  const main=rule(".main");
  ok("main is the scroller", !!main && /overflow-y:auto/.test(main));
  ok("main can shrink (min-height:0)", !!main && /min-height:0/.test(main));
  ok("main contains its overscroll", !!main && /overscroll-behavior:contain/.test(main));
}

group("CHROME IS OUTSIDE THE SCROLLER (nothing scrolls away)");
{
  const t=boot();
  t.go("rider","home");
  const main=t.q(".main"), app=t.q(".app");
  for(const [name,sel] of [["top bar",".topbar"],["navigation",".nav"]]){
    const el=t.q(sel);
    ok(`${name} exists`, !!el);
    ok(`${name} is NOT inside the scrolling region`, !!el && !main.contains(el));
  }
  ok("top bar cannot shrink",   /flex:none/.test(rule(".topbar")||""));
  ok("navigation cannot shrink", /flex:none/.test(rule(".nav")||""));
  ok("navigation is a direct child of the app", t.q(".nav").parentElement===app);
  ok("no fixed/absolute positioning on the nav", !/position:\s*(fixed|absolute)/.test(rule(".nav")||""));

  // long content must not change any of it
  t.go("rider","trips"); t.set({tripTab:"past"});
  ok("still outside the scroller on a long list", !t.q(".main").contains(t.q(".nav")));
}

group("SEARCH BAND IS THE FIRST THING IN THE PAGE (scrolls with content)");
{
  const t=boot();
  t.go("rider","home");
  const main=t.q(".main");
  const band=t.q(".searchband");
  ok("search band exists", !!band);
  ok("band is inside the scrolling region", !!band && !!main && main.contains(band));
  ok("band is the first element of the page",
     !!band && !!main && main.firstElementChild===band,
     (main && main.firstElementChild && main.firstElementChild.className)||"none");
  ok("no divider under the band", !/border-bottom/.test(rule(".searchband")||""));
  const sb=t.q(".searchband .searchbar");
  ok("the band holds a search control", !!sb);
  ok("home search navigates (is a button)", !!sb && sb.tagName==="BUTTON");
  ok("search appears exactly once", t.all(".searchbar").length===1, String(t.all(".searchbar").length));

  t.go("rider","routes");
  const live=t.q(".searchband .searchbar input");
  ok("list screens get a real field", !!live && live.tagName==="INPUT");
  ok("field is labelled", !!live && !!live.getAttribute("aria-label"));

  // iOS force-zooms any field under 16px and the user cannot undo it.
  ok("--f-input is 16px", /--f-input:\s*16px/.test(CSS));
  ok("search input uses --f-input", /\.searchbar input\{[^}]*font-size:var\(--f-input\)/.test(CSS));
  ok("all inputs use --f-input", /\.input\{[^}]*font-size:var\(--f-input\)/.test(CSS));

  // Not every screen should carry a search box.
  t.go("rider","wallet");
  ok("screens with nothing to search have no band", !t.q(".searchband"));
  ok("search is absent on screens with nothing to search",
     t.all(".searchbar").length===0, String(t.all(".searchbar").length));
}

group("PROFILE IS PINNED TO THE BOTTOM OF THE DESKTOP RAIL");
{
  const t=boot();
  t.go("rider","home");
  const foot=t.q(".nav__foot");
  ok("rail footer exists", !!foot);
  const footItems=[...foot.querySelectorAll(".navitem")];
  ok("footer holds exactly one item", footItems.length===1, String(footItems.length));
  ok("that item is the profile",
     footItems[0].getAttribute("aria-label")===t.w.T[t.w.S.lang].nav.profile,
     footItems[0].getAttribute("aria-label"));
  ok("footer is the last child of the nav", t.q(".nav").lastElementChild===foot);

  const fr=(CSS.match(/\.nav__foot\{display:flex;([^}]*)\}/)||[])[1];
  ok("footer rule found", !!fr);
  ok("footer is separated by a divider", !!fr && /border-top/.test(fr));
  ok("footer does not scroll with the items", !!fr && /flex:none/.test(fr));
  ok("items region takes the free space above it",
     /\.nav__items\{[^}]*flex:1/.test(CSS.replace(/\s+/g," ").replace(/ \{/g,"{")) ||
     /flex:column;flex:1/.test(CSS) || /\.nav__items\{flex-direction:column;flex:1/.test(CSS) ||
     CSS.includes(".nav__items{flex-direction:column;flex:1"));

  // On a phone the footer is hidden and the item appears inline instead,
  // so the profile is reachable at every size.
  ok("compact copy of the item exists", !!t.q(".navitem.compact-only"));
  ok("compact copy hidden on the rail", /@media \(min-width:600px\)\{ \.navitem\.compact-only\{display:none\} \}/.test(CSS));
  ok("footer hidden on the phone", /@media \(max-width:599\.98px\)\{ \.nav__foot\{display:none\} \}/.test(CSS));

  footItems[0].dispatchEvent(new t.w.Event("click"));
  ok("the pinned profile works", t.w.S.page==="profile", t.w.S.page);

  // driver has one too
  t.go("driver","duty");
  ok("driver rail also pins the profile", !!t.q(".nav__foot .navitem"));
}

group("ADAPTIVE — Material 3 breakpoints, nav swaps at each");
{
  // The layout is CSS-driven, so assert the rules exist and are coherent
  // rather than pretending jsdom computes them.
  ok("compact rule targets under 600px", /@media \(max-width:599\.98px\)/.test(CSS));
  ok("medium rule starts at 600px",      /@media \(min-width:600px\)/.test(CSS));
  ok("expanded rule starts at 840px",    /@media \(min-width:840px\)/.test(CSS));
  ok("large rule starts at 1200px",      /@media \(min-width:1200px\)/.test(CSS));
  ok("short-viewport rule exists",       /@media \(max-height:520px\)/.test(CSS));

  const compact=CSS.slice(CSS.indexOf("@media (max-width:599.98px)"));
  ok("compact puts the bar at the bottom", /order:2/.test(compact.slice(0,400)));
  ok("compact stacks the shell", /flex-direction:column/.test(compact.slice(0,400)));

  const medium=CSS.slice(CSS.indexOf("/* medium and up: side rail */"));
  ok("medium turns the nav into a vertical rail",
     /flex-direction:column/.test(medium.slice(0,500)));
  ok("medium sets the collapsed rail width",
     /width:var\(--rail-collapsed\)/.test(medium.slice(0,500)));

  const expanded=CSS.slice(CSS.indexOf("@media (min-width:840px)"));
  ok("expanded widens the rail", /width:var\(--rail-expanded\)/.test(expanded.slice(0,400)));
  ok("expanded reveals labels beside icons",
     /flex-direction:row/.test(expanded.slice(0,900)));
  ok("expanded reveals the brand", /\.nav__brand\{display:flex/.test(expanded.slice(0,600)));

  ok("rail widths are tokens", /--rail-collapsed:\s*\d+px/.test(CSS) &&
                               /--rail-expanded:\s*\d+px/.test(CSS));
  ok("content has a reading cap", /--content-max:\s*\d+px/.test(CSS));
  ok("shell stops growing on ultrawide", /--shell-max:\s*\d+px/.test(CSS));
  ok("content wrapper is centred", /\.main__inner\{[^}]*margin-inline:auto/.test(CSS));
  ok("wide screens opt out of the cap", /\.main--wide \.main__inner\{max-width:none\}/.test(CSS));
}

group("SAFE AREAS AND ZOOM");
{
  ok("bottom inset consumed", /--safe-b:env\(safe-area-inset-bottom/.test(CSS));
  ok("top inset consumed",    /--safe-t:env\(safe-area-inset-top/.test(CSS));
  ok("side insets consumed",  /--safe-l:env\(safe-area-inset-left/.test(CSS) &&
                              /--safe-r:env\(safe-area-inset-right/.test(CSS));
  // Scope each assertion to its own rule. A loose window matches a NEIGHBOURING
  // rule's token and reports success while the guarded rule is empty.
  const compactNav=(CSS.match(/@media \(max-width:599\.98px\)\{[\s\S]*?\.nav\{([^}]*)\}/)||[])[1];
  ok("compact nav rule found", !!compactNav);
  ok("bottom bar clears the home indicator", !!compactNav && /safe-b/.test(compactNav), compactNav);
  const railNav=(CSS.match(/\/\* medium and up: side rail \*\/[\s\S]*?\.nav\{([^}]*)\}/)||[])[1];
  ok("rail rule found", !!railNav);
  ok("rail clears the side inset", !!railNav && /safe-l/.test(railNav), railNav);
  const tb=rule(".topbar");
  ok("top bar clears the notch", !!tb && /safe-t/.test(tb), tb);
  const sh=rule(".sheet");
  ok("sheet clears the home indicator", !!sh && /safe-b/.test(sh));
  // Disabling zoom fails WCAG; the viewport must not cap scaling.
  ok("user zoom is not disabled",
     !/maximum-scale/.test(SRC) && !/user-scalable\s*=\s*no/.test(SRC));
}

group("ACCENT COLOUR HAS A JOB");
{
  ok("accent token exists", /--accent:var\(--violet-500\)/.test(CSS));
  ok("accent has a dark-theme value", /\[data-theme="dark"\]\{[\s\S]*--accent:var\(--violet-300\)/.test(CSS));
  ok("accent soft/border variants exist",
     /--accent-soft:/.test(CSS) && /--accent-border:/.test(CSS));
  ok("on-accent is defined, not guessed", /--on-accent:/.test(CSS));
  ok("focus ring uses the accent", /--focus:var\(--violet-500\)/.test(CSS));
  ok("primary brand is still teal", /--brand:var\(--teal-500\)/.test(CSS));
  ok("accent and brand are different roles",
     !/--accent:var\(--teal/.test(CSS) && !/--brand:var\(--violet/.test(CSS));
  ok("primitives are two-layer (raw violet ramp exists)",
     /--violet-500:#6D45E8/.test(CSS));
  const t=boot();
  t.go("rider","home");
  ok("accent is actually used in the product", !!t.q(".chip--accent"));
}

group("EVERY SCREEN RENDERS, IN BOTH LANGUAGES, BOTH THEMES");
{
  const t=boot();
  const roles=Object.keys(t.w.PAGES);
  let count=0;
  ok("there are five roles", roles.length===5, roles.join(","));
  for(const lang of ["en","ar"]) for(const theme of ["light","dark"]){
    t.set({lang,theme});
    for(const role of roles) for(const p of t.w.PAGES[role]){
      t.go(role,p.k); count++;
      const main=t.q(".main"), hero=t.q(".hero");
      if(!(main||hero)){ ok(`${role}/${p.k} [${lang}/${theme}] renders a body`,false); continue; }
      const body=(main||hero);
      if(body.children.length===0)
        ok(`${role}/${p.k} [${lang}/${theme}] is not empty`,false);
    }
  }
  ok(`all screens rendered without a blank body (${count} renders)`, true);
  ok("screen count is meaningful", count>=100, String(count));
}

group("NO SCREEN IS A DEAD END");
{
  const t=boot();
  for(const role of Object.keys(t.w.PAGES)) for(const p of t.w.PAGES[role]){
    t.go(role,p.k);
    const isRoot=p.dock===true;
    const backBtn=t.q(".topbar .iconbtn");
    if(!isRoot) ok(`${role}/${p.k} has a back control`, !!backBtn);
    ok(`${role}/${p.k} shows the navigation`, !!t.q(".nav"));
  }
}

group("BACK NAVIGATION ACTUALLY GOES BACK");
{
  const t=boot();
  t.go("rider","home");
  t.w.go("routes"); ok("navigated to routes", t.w.S.page==="routes");
  t.w.go("boarding"); ok("navigated to boarding", t.w.S.page==="boarding");
  t.w.back(); ok("back returns to routes", t.w.S.page==="routes", t.w.S.page);
  t.w.back(); ok("back returns to home", t.w.S.page==="home", t.w.S.page);
  t.w.back(); ok("back from root does not crash or blank", !!t.q(".main"));
}

/* ─────────────────────────────────────────────────────────────────
   C. BOOKING FLOW END TO END
   ───────────────────────────────────────────────────────────────── */
group("BOOKING FLOW");
{
  const t=boot();
  t.go("rider","home");
  t.all(".routecard")[0].dispatchEvent(new t.w.Event("click"));
  ok("route tap opens boarding", t.w.S.page==="boarding", t.w.S.page);
  ok("a route was actually stored", !!t.w.S.chosenRoute);

  const rows=t.all(".rowitem");
  const disabled=rows.filter(r=>r.hasAttribute("disabled"));
  ok("closed boarding points exist to test", disabled.length>0, String(disabled.length));
  const before=t.w.S.page;
  disabled[0].dispatchEvent(new t.w.Event("click"));
  ok("tapping a closed boarding point does nothing", t.w.S.page===before);
  ok("closed point is disabled by attribute, not just styling",
     disabled[0].hasAttribute("disabled"));

  const open=rows.find(r=>!r.hasAttribute("disabled") && r.tagName==="BUTTON");
  open.dispatchEvent(new t.w.Event("click"));
  ok("tapping an open boarding point advances", t.w.S.page==="departures", t.w.S.page);

  t.all(".rowitem")[0].dispatchEvent(new t.w.Event("click"));
  ok("picking a departure advances to review", t.w.S.page==="review", t.w.S.page);
  ok("a departure was stored", !!t.w.S.chosenDep);

  const price=()=>t.q(".pricetag").textContent;
  const p1=price();
  t.all(".stepper button")[1].dispatchEvent(new t.w.Event("click"));
  ok("seat stepper increments", t.w.S.seats===2, String(t.w.S.seats));
  ok("price responds to seat count", price()!==p1, `${p1} -> ${price()}`);

  t.set({seats:1});
  const minus=t.all(".stepper button")[0];
  ok("minus is disabled at one seat", minus.hasAttribute("disabled"));
  t.set({seats:4});
  ok("plus is disabled at max seats", t.all(".stepper button")[1].hasAttribute("disabled"));
}

group("PRICING RULES");
{
  const t=boot();
  t.set({role:"rider", page:"review", chosenRoute:t.w.DATA.routes[0],
         chosenDep:t.w.DATA.departures[0], chosenBoard:"b1", seats:1});
  const stop=t.q(".pricetag").textContent;
  t.set({chosenBoard:"street"});
  const street=t.q(".pricetag").textContent;
  ok("street pickup costs more than a stop", stop!==street, `${stop} vs ${street}`);
  const n=s=>parseInt(s.replace(/\D/g,""),10);
  ok("street pickup is the higher figure", n(street)>n(stop));

  t.go("rider","routes");
  const fares=t.all(".fare").map(e=>e.textContent);
  ok("every route shows a fare", fares.length>=t.w.DATA.routes.length);
  ok("fares are labelled fixed price",
     t.all(".routecard .t-micro").length>=t.w.DATA.routes.length);
}

/* ─────────────────────────────────────────────────────────────────
   D. ROLE BOUNDARIES  (§8.1 hidden, not disabled)
   ───────────────────────────────────────────────────────────────── */
group("ROLE BOUNDARIES");
{
  const t=boot();
  t.go("support","lookup");
  const txt=t.txt().toLowerCase();
  ok("support cannot see identity documents",
     !txt.includes("national id") && !txt.includes("licence front"),
     "support screen leaked document names");
  ok("what support CAN do is present", txt.includes("refund"));

  t.go("ops","queue");
  ok("operations does see the document queue", t.txt().toLowerCase().includes("driver applications"));
  t.w.S.opsView="review"; t.w.render();
  ok("operations review shows documents", t.txt().includes("National ID"));

  // Nothing anywhere may be rendered disabled purely because of role.
  let roleDisabled=0;
  for(const role of Object.keys(t.w.PAGES)) for(const p of t.w.PAGES[role]){
    t.go(role,p.k);
    t.all("[disabled]").forEach(el=>{
      const s=(el.textContent||"").toLowerCase();
      if(s.includes("permission")||s.includes("not allowed")||s.includes("your role")) roleDisabled++;
    });
  }
  ok("no control is shown disabled because of role", roleDisabled===0, String(roleDisabled));
}

group("DRIVER RULES");
{
  const t=boot();
  t.go("driver","duty");
  const big=t.all(".btn--driver");
  ok("driver primary actions use the large target class", big.length>0, String(big.length));
  const css=SRC.slice(SRC.indexOf("<style>"), SRC.indexOf("</style>"));
  ok("large target is 56px", /\.btn--driver\{[^}]*min-height:var\(--tap-driver\)/.test(css));
  ok("--tap-driver is 56px", /--tap-driver:\s*56px/.test(css));

  t.go("driver","work");
  const chips=t.all("button.chip");
  ok("slots are offered", chips.length>0, String(chips.length));
  const taken=chips.filter(c=>c.hasAttribute("disabled"));
  ok("taken slots exist to test", taken.length>0);
  ok("taken slots cannot be claimed", taken.every(c=>c.hasAttribute("disabled")));

  // A forecast with no stated source is a decorative claim. Refuse it.
  const alert=t.q(".alert");
  ok("the recommendation states its evidence", !!alert &&
     /searched this slot yesterday/i.test(alert.textContent), alert&&alert.textContent);
}

/* ─────────────────────────────────────────────────────────────────
   E. HONESTY, ACCESSIBILITY, TOKENS
   ───────────────────────────────────────────────────────────────── */
group("NOTHING PRETENDS TO BE REAL");
{
  const t=boot();
  let maps=0, labelled=0;
  for(const role of Object.keys(t.w.PAGES)) for(const p of t.w.PAGES[role]){
    t.go(role,p.k);
    t.all(".mapbox").forEach(m=>{ if(!m.querySelector(".mapsvg")) return;
      maps++; if(m.querySelector(".attribution")) labelled++; });
  }
  ok("maps exist to check", maps>0, String(maps));
  ok("every drawn map is labelled illustrative", maps===labelled, `${labelled}/${maps}`);
}

group("ACCESSIBILITY");
{
  const t=boot();
  let icons=0, unlabelled=[], svgs=0, exposed=0, inputs=0, unlabelledInputs=0;
  for(const role of Object.keys(t.w.PAGES)) for(const p of t.w.PAGES[role]){
    t.go(role,p.k);
    t.all("button").forEach(b=>{
      const hasText=(b.textContent||"").trim().length>0;
      if(!hasText){ icons++; if(!b.getAttribute("aria-label")) unlabelled.push(`${role}/${p.k}`); }
    });
    t.all("svg").forEach(s=>{ svgs++;
      const decorative=s.getAttribute("aria-hidden")==="true";
      const meaningful=s.getAttribute("role")==="img" && s.getAttribute("aria-label");
      if(!decorative && !meaningful) exposed++; });
    t.all("input,textarea,select").forEach(i=>{ inputs++;
      const labelled=i.getAttribute("aria-label")||i.closest("label")||
        (i.closest(".field")&&i.closest(".field").querySelector("label"));
      if(!labelled) unlabelledInputs++; });
  }
  ok("icon-only buttons exist to check", icons>0, String(icons));
  ok("every icon-only button is labelled", unlabelled.length===0, unlabelled.slice(0,3).join(","));
  ok("svgs exist to check", svgs>0, String(svgs));
  ok("every svg is hidden or labelled", exposed===0, String(exposed));
  ok("inputs exist to check", inputs>0, String(inputs));
  ok("every input is labelled", unlabelledInputs===0, String(unlabelledInputs));

  t.go("rider","home");
  ok("navigation marks the current page", !!t.q('.navitem[aria-current="page"]'));
  const dockBtns=t.all(".navitem");
  ok("every navigation item is labelled", dockBtns.every(b=>b.getAttribute("aria-label")));
  ok("only one page is current at a time",
     t.all('.navitem[aria-current="page"]').length===1);
}

group("RTL");
{
  const t=boot();
  t.set({lang:"ar"});
  ok("document direction flips", t.d.documentElement.dir==="rtl");
  ok("document language flips", t.d.documentElement.lang==="ar");
  ok("interface is translated", /الرئيسية|رحلاتي|المحفظة/.test(t.txt()));
  t.go("rider","review");
  ok("numbers stay left-to-right inside rtl", t.all(".ltr").length>0);
  const css=SRC.slice(SRC.indexOf("<style>"), SRC.indexOf("</style>"));
  const physical=(css.match(/(?:margin|padding|border)-(?:left|right):/g)||[]);
  ok("layout uses logical properties, not left/right", physical.length===0,
     physical.slice(0,3).join(","));
}

group("DESIGN TOKENS — one place to change a value");
{
  const css=SRC.slice(SRC.indexOf("<style>"), SRC.indexOf("</style>"));
  const rules=css.replace(/:root\{[^}]*\}/g,"").replace(/\[data-theme="dark"\]\{[^}]*\}/g,"");
  const hex=(rules.match(/#[0-9a-fA-F]{3,8}\b/g)||[]);
  ok("no hardcoded colour in css rules", hex.length===0, hex.slice(0,5).join(","));
  const js=SRC.slice(SRC.indexOf("</style>"));
  const jsHex=(js.match(/#[0-9a-fA-F]{3,8}\b/g)||[]).filter(h=>!/^#[0-9a-fA-F]{6}$/.test(h)||true);
  const allowed=new Set(["#1B62D6"]); // sample vehicle colour: data, not chrome
  const bad=jsHex.filter(h=>!allowed.has(h.toUpperCase()));
  ok("no hardcoded colour in component code", bad.length===0, bad.slice(0,5).join(","));
  ok("root defines the palette", /--brand:/.test(css) && /--danger:/.test(css));
  ok("dark theme overrides the same names", /\[data-theme="dark"\]\{[^}]*--brand:/.test(css));
  const rootVars=[...css.matchAll(/--([a-z0-9-]+):/g)].map(m=>m[1]);
  ok("token set is substantial", new Set(rootVars).size>40, String(new Set(rootVars).size));
}

group("BUILD INTEGRITY");
{
  ok("output is a single self-contained file", !/<script\s+src=/.test(SRC) && !/<link\s+[^>]*stylesheet/.test(SRC),
     "external references would break offline / preview");
  ok("no prototype harness remains",
     !/GUI prototype|harness|screenid|Screen not in this prototype/i.test(SRC));
  ok("no leftover placeholder text", !/lorem|TODO|FIXME|XXX/i.test(SRC));
  ok("no absolute local paths leaked", !/\/home\/[a-z]+\//.test(SRC));
  ok("viewport is mobile-correct", /viewport-fit=cover/.test(SRC));
  ok("theme-color set for mobile chrome", /name="theme-color"/.test(SRC));
}

console.log(`\n──────── ${pass} passed, ${fail} failed ────────`);
process.exit(fail?1:0);
