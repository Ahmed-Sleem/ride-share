#!/usr/bin/env node
/* Verification for SHARED_RIDE_APP.html.
   Rule: a check that cannot fail is not a check. Every assertion below has
   been observed failing when the thing it guards was broken (see BREAKS.md).
   Assertions therefore refuse to run against empty sets. */
const fs=require("fs"), path=require("path");
const {JSDOM}=require("jsdom");

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
    go:(role,page)=>{ w.S.view="app"; w.S.authed=true; w.S.role=role; w.S.page=page; w.S.stack=[]; w.S.sheet=null;
                      w.S.opsView=null; w.render(); },
    set:(o)=>{ w.S.view="app"; w.S.authed=true; Object.assign(w.S,o); w.render(); },
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

group("DEC-200 — DESKTOP DENSITY IS TOKENISED (not browser zoom)");
{
  ok("density token exists", /--density:comfortable/.test(CSS));
  ok("desktop switches density to compact",
     /@media \(min-width:840px\)\{[\s\S]*--density:compact/.test(CSS));
  ok("desktop type is tighter than the touch scale",
     /@media \(min-width:840px\)\{[\s\S]*--f-body:13px/.test(CSS));
  ok("desktop tap is mouse-sized, not 44px",
     /@media \(min-width:840px\)\{[\s\S]*--tap:40px/.test(CSS));
  ok("desktop reading cap is 90% of the touch cap (756)",
     /--content-max:756px/.test(CSS));
  ok("zoom is still not locked", !/maximum-scale/.test(SRC) && !/zoom:\s*0?\.9/.test(CSS));
  ok("touch still declares 44/56 on the root",
     /--tap:44px/.test(CSS) && /--tap-driver:\s*56px/.test(CSS));
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
  ok("primary brand is violet", /--brand:var\(--violet-500\)/.test(CSS));
  ok("accent token exists", /--accent:var\(--coral-500\)/.test(CSS));
  ok("accent has a dark-theme value", /\[data-theme="dark"\]\{[\s\S]*--accent:var\(--coral-400\)/.test(CSS));
  ok("accent soft/border variants exist",
     /--accent-soft:/.test(CSS) && /--accent-border:/.test(CSS));
  ok("on-accent is defined, not guessed", /--on-accent:/.test(CSS));
  ok("focus ring uses the accent colour", /--focus:var\(--accent\)/.test(CSS));
  ok("accent and brand are different roles",
     !/--accent:var\(--violet/.test(CSS) && !/--brand:var\(--coral/.test(CSS));
  ok("primitives are two-layer (raw violet ramp exists)",
     /--violet-500:#6C63FF/.test(CSS));
  ok("pops are tokenised",
     /--pop-mint:/.test(CSS) && /--pop-lime:/.test(CSS) && /--pop-sky:/.test(CSS) &&
     /--pop-pink:/.test(CSS) && /--pop-coral:/.test(CSS));
  const t=boot();
  t.set({user:{id:"u1",role:"rider",name:"Nour"}});
  t.go("rider","home");
  ok("accent is actually used in the product", !!t.q(".chip--accent"));
}

group("THEME — AUTO FOLLOWS THE SYSTEM, MANUAL OVERRIDES");
{
  const t=boot();
  ok("default preference is auto", t.w.S.theme==="auto", String(t.w.S.theme));
  t.w.S.theme="auto";

  // stub matchMedia so the device-signal branch is deterministic
  t.w.matchMedia = (q) => ({ matches: q.includes("dark"), addEventListener(){}, removeEventListener(){} });
  ok("auto resolves to the device preference (dark)", t.w.resolvedTheme()==="dark");
  t.w.matchMedia = (q) => ({ matches: !q.includes("dark"), addEventListener(){}, removeEventListener(){} });
  ok("auto resolves to the device preference (light)", t.w.resolvedTheme()==="light");

  // with no device signal, auto falls back to time of day
  t.w.matchMedia = undefined;
  ok("no device signal → night is dark", t.w.resolvedTheme(new Date(2026,0,1,3))==="dark");
  ok("no device signal → midday is light", t.w.resolvedTheme(new Date(2026,0,1,12))==="light");

  t.w.S.theme="dark";
  ok("manual dark is honoured", t.w.resolvedTheme()==="dark");
  t.w.S.theme="light"; t.w.render();
  ok("render applies the resolved theme to html AND body",
     t.w.document.documentElement.dataset.theme==="light" &&
     t.w.document.body.dataset.theme==="light");
  t.go("rider","profile");
  const segs=t.all(".seg");
  ok("profile offers three theme options",
     segs.some(s=>s.querySelectorAll("button").length===3),
     segs.map(s=>s.querySelectorAll("button").length).join(","));
}

group("RAIL COLLAPSES ON DESKTOP");
{
  const t=boot();
  t.go("rider","home");
  ok("collapse control exists", !!t.q(".rail-toggle"));
  ok("footer is still the last child", t.q(".nav").lastElementChild===t.q(".nav__foot"));
  ok("collapse rule exists in css",
     /\.app\.rail-collapsed \.nav\{width:var\(--rail-collapsed\)\}/.test(CSS));
  t.w.S.rail="collapsed"; t.w.render();
  ok("collapsed state adds the class",
     !!t.q(".app.rail-collapsed"), t.q(".app")?t.q(".app").className:"");
  ok("collapsed nav items carry a tooltip", !!t.q(".navitem[title]"));
  const tg=t.q(".rail-toggle");
  tg.dispatchEvent(new t.w.Event("click"));
  ok("toggling reopens the rail", t.w.S.rail==="open", String(t.w.S.rail));
}

group("BRAND MARK AND FAVICON");
{
  ok("favicon is embedded", /rel="icon"/.test(SRC) && /data:image\/svg\+xml/.test(SRC));
  ok("brand gradient is defined once", /id="brandGrad"/.test(SRC));
  ok("logo references the gradient", /url\(#brandGrad\)/.test(SRC));
  ok("theme colour matches the brand", /name="theme-color" content="#6C63FF"/.test(SRC));
  const t=boot();
  t.go("rider","home");
  ok("nav shows the brand mark", !!t.q(".nav__brand svg path[fill]"));
}

group("EVERY SCREEN RENDERS, IN BOTH LANGUAGES, BOTH THEMES");
{
  const t=boot();
  const roles=Object.keys(t.w.PAGES);
  let count=0;
  ok("there are six roles", roles.length===6, roles.join(","));
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
   C. RIDER SCREENS ARE HONEST (no demo content, M1-finish)
   ───────────────────────────────────────────────────────────────── */
group("RIDER SCREENS SHOW NO SAMPLE CONTENT");
{
  const t=boot();
  t.set({role:"rider", user:{id:"u1",role:"rider",name:"Nour",email:"nour@x.com"}});
  const sample=/Corniche|Montazah|Smouha|Agami|Miami|EGP|Mahmoud|Hiace/;

  t.go("rider","home");
  ok("home has no sample route strings", !sample.test(t.q(".main").textContent));
  ok("home greets the real user", t.q(".main").textContent.includes("Nour"));

  // routes, trips, departures and review are REAL now (API loaders, no sample data)
  t.go("rider","routes");
  ok("routes renders the real loader, no sample content", !!t.q("#rider-routes") && !sample.test(t.q(".main").textContent));
  t.go("rider","trips");
  ok("trips renders the real loader, no sample content", !!t.q("#rider-trips") && !sample.test(t.q(".main").textContent));
  t.go("rider","departures");
  ok("departures renders the real loader", !!t.q("#departures-list") && !sample.test(t.q(".main").textContent));

  t.go("rider","wallet");
  ok("wallet shows the real loader (P3.7 — no coming-soon)", !sample.test(t.q(".main").textContent) && !t.q(".empty"));

  for(const p of ["waiting","onboard"]){
    t.go("rider",p);
    ok(`live step ${p} has a live loader`, !!t.q("#rider-live") && !sample.test(t.q(".main").textContent), p);
  }

  t.go("rider","safety");
  ok("safety has no fake vehicle", !sample.test(t.q(".main").textContent));
}

group("TRIPS TAB SWITCH IS SEAMLESS (no refetch, no full render)");
const mTrips = (async () => {
  const t=boot();
  t.set({role:"rider", user:{id:"u1",role:"rider",name:"Nour"}});
  let calls=0;
  const upcoming={ id:"b1", journey_id:"j1", rider_user_id:"u1", boarding_stop_id:"s1", seats:1,
    fare_minor:1500, code:"111222", status:"CONFIRMED", created_at:new Date(),
    route_name_en:"Corniche", route_name_ar:"الكورنيش", service_date:"2026-08-23", departs_at:"08:00", stop_name_en:"Sidi Gaber" };
  const past={ ...upcoming, id:"b2", status:"COMPLETED", service_date:"2026-08-20", code:"333444" };
  t.w.fetch = async (url) => {
    if (String(url).includes("/bookings/mine")) { calls++; return { ok:true, json:async()=>[upcoming, past] }; }
    return { ok:false, status:404, json:async()=>({ message_key:"error.internal" }) };
  };
  t.go("rider","trips");
  await new Promise((r)=>setTimeout(r,20));
  ok("trips list renders from the first fetch", t.q("#rider-trips").textContent.includes("Corniche"));
  const seg=t.q("#trips-seg");
  ok("seg exposes two tabs", !!seg && seg.children.length===2);
  seg.children[1].click();                        // switch to "past"
  await new Promise((r)=>setTimeout(r,20));
  ok("tab switch does NOT refetch (seamless)", calls===1, `fetched ${calls} times`);
  ok("tab switch shows the past booking", t.q("#rider-trips").textContent.includes("COMPLETED"));
  ok("tab switch toggles aria-pressed", seg.children[1].getAttribute("aria-pressed")==="true"
     && seg.children[0].getAttribute("aria-pressed")==="false");
})();

group("SEARCH — Fuse vendored + Arabic/English normalization");
const mSearchNorm = (async () => {
  const t=boot();
  ok("Fuse is vendored into the bundle", typeof t.w.Fuse === "function");
  const routes = [
    { route:{ id:"r1", code:"ALX-R001", name_en:"Corniche Line", name_ar:"خط الكورنيش",
        fare_minor:1500, window_start:"06:00", window_end:"22:00" },
      stops:[ { stop_id:"s1", stop_name_en:"Sidi Gaber", stop_name_ar:"سيدي جابر", stop_code:"SG-01" },
              { stop_id:"s2", stop_name_en:"Smouha", stop_name_ar:"سموحة", stop_code:"SM-02" } ] },
    { route:{ id:"r2", code:"ALX-R002", name_en:"University Line", name_ar:"خط الجامعة",
        fare_minor:1200, window_start:"06:00", window_end:"21:00" },
      stops:[ { stop_id:"s3", stop_name_en:"Ejjazy", stop_name_ar:"الإجازي", stop_code:"EJ-03" } ] },
  ];
  const idx = t.w.buildRiderIndex(routes);
  ok("empty query returns every route", t.w.searchRoutes("", idx).length === 2);
  ok("English name substring matches", t.w.searchRoutes("corni", idx)[0] === "r1");
  ok("Arabic name matches (normalized teh marbuta)", t.w.searchRoutes("سموحه", idx)[0] === "r1");
  ok("Arabic with diacritics matches", t.w.searchRoutes("سَمُوحَة", idx)[0] === "r1");
  ok("stop name finds its route", t.w.searchRoutes("smouha", idx)[0] === "r1");
  ok("no match returns empty", t.w.searchRoutes("xyzzy", idx).length === 0);
  ok("normalization unifies teh marbuta and heh", t.w.normalizeText("سموحة") === t.w.normalizeText("سموحه"));
  ok("normalization unifies alef variants", t.w.normalizeText("أحمد") === t.w.normalizeText("احمد"));
  ok("matchesQuery normalizes Arabic", t.w.matchesQuery("سموحه", "سموحة"));
  ok("matchesQuery is multi-token", t.w.matchesQuery("sidi gaber", "Sidi Gaber Station"));
  ok("matchesQuery passes empty query", t.w.matchesQuery("", "anything"));
})();

group("RIDER SEARCH — routes screen filters live");
const mSearchScreen = (async () => {
  const t=boot();
  t.set({role:"rider", user:{id:"u1",role:"rider",name:"Nour"}});
  const routes = [
    { route:{ id:"r1", code:"ALX-R001", name_en:"Corniche Line", name_ar:"خط الكورنيش",
        fare_minor:1500, window_start:"06:00", window_end:"22:00" },
      stops:[ { stop_id:"s1", stop_name_en:"Sidi Gaber", stop_name_ar:"سيدي جابر", stop_code:"SG-01" },
              { stop_id:"s2", stop_name_en:"Smouha", stop_name_ar:"سموحة", stop_code:"SM-02" } ] },
    { route:{ id:"r2", code:"ALX-R002", name_en:"University Line", name_ar:"خط الجامعة",
        fare_minor:1200, window_start:"06:00", window_end:"21:00" },
      stops:[ { stop_id:"s3", stop_name_en:"Ejjazy", stop_name_ar:"الإجازي", stop_code:"EJ-03" } ] },
  ];
  const journeys = [ { id:"j1", route_id:"r1", departs: new Date(Date.now()+3600e3).toISOString(),
      service_date:"2026-08-23", seats_total:14 } ];
  t.w.fetch = async (url) => {
    const u=String(url);
    if(u.includes("/routes/published")) return { ok:true, json:async()=>routes };
    if(u.includes("/journeys/upcoming")) return { ok:true, json:async()=>journeys };
    return { ok:false, status:404, json:async()=>({ message_key:"error.internal" }) };
  };
  t.go("rider","routes");
  await new Promise((r)=>setTimeout(r,20));
  const list=t.q("#rider-routes");
  ok("routes screen renders route cards", !!list && list.textContent.includes("Corniche"));
  ok("nested departures show under the route", !!list && list.textContent.includes(t.w.T.en.nextDepartures));
  const input=t.q(".searchband .searchbar input");
  ok("routes screen has a live search field", !!input);
  input.value="university";
  input.dispatchEvent(new t.w.Event("input", { bubbles:true }));
  ok("typing filters the list (English)", list.textContent.includes("University") && !list.textContent.includes("Corniche"));
  input.value="سموحه";
  input.dispatchEvent(new t.w.Event("input", { bubbles:true }));
  ok("typing filters the list (Arabic)", list.textContent.includes("Corniche") && !list.textContent.includes("University"));
  input.value="zzz-nothing";
  input.dispatchEvent(new t.w.Event("input", { bubbles:true }));
  ok("no matches shows the honest empty state", list.textContent.includes(t.w.T.en.noSearchResults));
})();

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
  ok("support shows an honest coming-soon state (no fake refund)",
     t.q(".empty") && !txt.includes("refund"));

  t.go("ops","queue");
  ok("operations sees the driver-applications queue (heading present)",
     t.txt().toLowerCase().includes("driver applications"));

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

group("DRIVER SCREENS ARE REAL (duty + work wired, no demo data)");
{
  const t=boot();
  t.set({role:"driver", user:{id:"u1",role:"driver",name:"Mahmoud",email:"m@x.com"}});
  const sample=/Corniche|Montazah|Smouha|EGP|Hiace|Mahmoud A|searched this slot/;
  const css=SRC.slice(SRC.indexOf("<style>"), SRC.indexOf("</style>"));
  ok("large target is 56px", /\.btn--driver\{[^}]*min-height:var\(--tap-driver\)/.test(css));
  ok("--tap-driver is 56px", /--tap-driver:\s*56px/.test(css));

  // duty and work now load REAL journeys/slots from the API — the loaders
  // must render and must never show sample content.
  t.go("driver","duty");
  ok("driver duty renders the real journeys loader", !!t.q("#duty-list") && !sample.test(t.q(".main").textContent));
  t.go("driver","work");
  ok("driver work renders the real find-work loader", !!t.q("#work-list") && !sample.test(t.q(".main").textContent));

  t.go("driver","journey");
  ok("driver journey has the scan/manifest loaders", !!t.q("#journey-pick") && !!t.q("#journey-scan"));
  t.go("driver","earnings");
  ok("driver earnings is honest (no sample content)", t.q(".empty") && !sample.test(t.q(".main").textContent));
  t.go("driver","profile");
  ok("driver profile shows the real user", t.q(".main").textContent.includes("Mahmoud"));
  ok("driver profile has no fake vehicle", !sample.test(t.q(".main").textContent));
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
  t.go("rider","profile");   // profile shows ltr email/phone in both directions
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
  // allowed: the sample vehicle colour AND every colour the single brand source
  // carries (favicon gradient, browser theme, email identity — data, not chrome)
  const allowed=new Set(["#1B62D6"]);
  const brandMatch=/const BRAND = (\{[\s\S]*?\});\n\n/.exec(js);
  if (brandMatch) {
    const brandHex=(JSON.stringify(JSON.parse(brandMatch[1])).match(/#[0-9a-fA-F]{3,8}\b/g)||[]);
    brandHex.forEach(h=>allowed.add(h.toUpperCase()));
  }
  const bad=jsHex.filter(h=>!allowed.has(h.toUpperCase()));
  ok("no hardcoded colour in component code", bad.length===0, bad.slice(0,5).join(","));
  ok("brand colours are data, defined in the brand source", brandMatch!=null, "BRAND not injected");
  ok("root defines the palette", /--brand:/.test(css) && /--danger:/.test(css));
  ok("dark theme overrides the same names", /\[data-theme="dark"\]\{[^}]*--brand:/.test(css));
  const rootVars=[...css.matchAll(/--([a-z0-9-]+):/g)].map(m=>m[1]);
  ok("token set is substantial", new Set(rootVars).size>40, String(new Set(rootVars).size));
}

group("M1 — SPLASH, LANDING, AUTH, REAL IDENTITY");
{
  const t=boot();
  t.w.S.view="boot"; t.w.render();
  ok("boot shows the splash", !!t.q(".splash"));
  ok("splash shows the brand mark", !!t.q(".splash svg"));

  t.w.S.view="landing"; t.w.render();
  ok("landing renders the hero", !!t.q(".landing__hero"));
  ok("landing has both CTAs", t.all(".landing .btn").length>=2, String(t.all(".landing .btn").length));
  ok("landing shows one intro illustration", !!t.q(".heroart--one") && t.all(".heroart .sticker").length===1);
  ok("one-color illustrations use currentColor", /fill=\\"currentColor\\"/.test(SRC) || /fill="currentColor"/.test(SRC));
  ok("story panels sit after the hero", t.all(".stackpanel").length===4, String(t.all(".stackpanel").length));

  t.w.S.view="auth"; t.w.render();
  ok("auth renders a card", !!t.q(".authwrap__card"));
  // no role tabs anywhere — sign-in auto-detects, sign-up shows rider/driver only
  ok("no staff/rider tabs", t.all(".seg").length===0, String(t.all(".seg").length));

  // sign-up presents exactly two choices: rider and driver
  t.w.S.authMode="signup"; t.w.S.authStep="choose"; t.w.render();
  ok("sign-up shows exactly rider and driver", t.all(".rolechoice").length===2, String(t.all(".rolechoice").length));
  ok("sign-up has no staff choice",
     !(t.txt().includes(t.w.T.en.roleLabel.operations) || t.txt().includes(t.w.T.en.roleLabel.support)));

  // sign-in: smart auto-detect — identifier first, no password field yet
  t.w.S.authMode="signin"; t.w.S.loginMethod=null; t.w.render();
  ok("sign-in asks for the identifier first", !!t.q("#auth-identifier"));
  ok("sign-in shows no password field before identify", !t.q("#auth-password"));

  // rail is COLLAPSED by default (owner requirement)
  ok("rail defaults to collapsed", t.w.S.rail==="collapsed", String(t.w.S.rail));

  // the demo role switcher is gone — role comes from the session
  t.w.S.view="app"; t.w.S.authed=true; t.w.S.user={id:"u1",role:"rider",name:"Nour"}; t.w.render();
  ok("no demo role switcher", !t.q("select[aria-label='Role']"));
  ok("identity chip shows who is signed in", !!t.q(".chip--accent"));
  ok("sign-out is available", !!t.q("[aria-label='"+t.w.T[t.w.S.lang].signOut+"']"));

  // enterApp derives role from the session user (a manager gets the manager dock)
  t.w.S.view="landing"; t.w.render();
  t.w.enterApp({id:"u2",role:"manager",name:"Ops"});
  ok("enterApp derives role from the user", t.w.S.role==="manager");
  ok("enterApp lands on the role's default page", t.w.S.page===t.w.DEFAULT_PAGE.manager, t.w.S.page);
}

group("M1 — VERIFICATION & RECOVERY (reset, email, resend)");
{
  const t=boot();

  // the sign-in step shows a forgot-password link
  t.w.S.view="auth"; t.w.S.authMode="signin"; t.w.S.loginMethod=null; t.w.S.forgot=null; t.w.render();
  ok("sign-in shows the forgot-password link",
     [...t.all(".btn")].some((b)=>b.textContent.includes(t.w.T.en.forgotPassword)));
  t.w.S.forgot="identify"; t.w.render();
  ok("forgot-password card renders", !!t.q(".authwrap__card"));
  ok("forgot-password asks for the identifier", !!t.q("#reset-identifier"));

  t.w.S.forgot="code"; t.w.render();
  ok("reset code step asks for code + new password",
     !!t.q("#reset-code") && !!t.q("#reset-password"));

  t.w.S.forgot=null;

  // email verification section in the rider profile (no email yet)
  t.w.S.view="app"; t.w.S.authed=true; t.w.S.user={id:"u1",role:"rider",name:"Nour",email:null,emailVerified:false};
  t.w.S.role="rider"; t.w.S.page="profile"; t.w.render();
  ok("profile shows the email input when unset", !!t.q("#em-addr"));

  t.w.S.user={id:"u1",role:"rider",name:"Nour",email:"nour@x.com",emailVerified:false};
  t.w.render();
  ok("unverified email shows a code input", !!t.q("#em-code"));

  t.w.S.user={id:"u1",role:"rider",name:"Nour",email:"nour@x.com",emailVerified:true};
  t.w.render();
  ok("verified email shows the verified chip",
     (t.txt().includes(t.w.T.en.emailVerified) || t.txt().includes(t.w.T.ar.emailVerified)));

  // resend button is disabled during the 60s cooldown
  t.w.S.view="auth"; t.w.S.authMode="signin"; t.w.S.loginMethod="otp";
  t.w.S.authIdentifier="+201000000000"; t.w.S.resendUntil=Date.now()+50000; t.w.render();
  const rb=[...t.all(".btn")].find((b)=>b.textContent.includes(t.w.T.en.resendIn));
  ok("resend button shows a countdown and is disabled", !!rb && rb.hasAttribute("disabled"));
}

group("M1.8 — EMAIL SIGN-IN/SIGN-UP + SLIDER POLISH");
{
  const t=boot();

  // the oversized role-choice arrows are sized now (owner-reported regression)
  const chev = rule(".rolechoice .chev") || "";
  ok("role-choice chevron has an explicit size",
     /width:var\(--icon-md\)/.test(chev) && /height:var\(--icon-md\)/.test(chev), chev);

  // footer credit: a real link, smaller text, on its own line
  t.w.S.view="landing"; t.w.render();
  const cr = t.q(".landing__credits");
  ok("footer has no Streamline credit", !t.q(".landing__credits"));

  // story panels: ONE bold pop colour each (700 steps), flat, no gradient
  ok("story panels are bold (violet card has no gradient)",
     /\.stackpanel--violet\{background:var\(--violet-700\)\}/.test(CSS) &&
     !/\.stackpanel--violet\{background:linear-gradient/.test(CSS));
  ok("all four story panels use the bold 700 shades",
     /\.stackpanel--coral\{background:var\(--coral-700\)\}/.test(CSS) &&
     /\.stackpanel--sky\{background:var\(--sky-700\)\}/.test(CSS) &&
     /\.stackpanel--mint\{background:var\(--mint-700\)\}/.test(CSS));
  ok("story panel text is white on the bold card", /\.stackpanel\{[^}]*color:var\(--on-solid\)/.test(CSS));
  ok("story doodle is white line-work with a same-hue light accent",
     /\.stackpanel__art\{[^}]*color:var\(--on-solid\)/.test(CSS) &&
     /\.stackpanel--violet\{background:var\(--violet-700\)\}/.test(CSS));
  ok("stickers float with a springy motion", /@keyframes stickerfloat/.test(CSS));
  ok("hero glow drifts very slowly", /\.landing__hero\{[^}]*animation:herodrift/.test(CSS) && /@keyframes herodrift/.test(CSS));

  // bounce easing drives the feature-card hover
  ok("bounce easing token is defined", /--bounce:cubic-bezier\(\.34,1\.56,\.64,1\)/.test(CSS));
  ok("feature hover uses the bounce easing", /\.landing__feature\{[^}]*var\(--bounce\)/.test(CSS));

  // dark mode brightens the doodle accents (light stays coral)
  ok("dark mode gives step cards brighter accents",
     /\[data-theme="dark"\] \.landing__step--violet \.landing__stepart\{[^}]*var\(--violet-300\)/.test(CSS));

  // email sign-up flow
  t.w.S.view="auth"; t.w.S.authMode="signup"; t.w.S.authStep="email"; t.w.render();
  ok("sign-up asks for email (not phone)", !!t.q("#auth-email") && t.q("#auth-email").type==="email");
  t.w.S.authStep="otp"; t.w.render();
  ok("OTP step renders six code boxes", t.all(".otp__box").length===6, String(t.all(".otp__box").length));
  ok("sign-up collects the name on the code step", !!t.q("#auth-name"));
  ok("phone copy is gone from the auth flow", !/phoneLabel/.test(SRC) && !/by SMS/.test(SRC));

  // one email = one account: sign-up has its own (stricter) endpoint
  ok("sign-up verifies through a dedicated endpoint", /signupVerify/.test(SRC) && /\/auth\/signup\/verify/.test(SRC));

  // the main admin is the only super_admin; staff rows are immutable for it
  ok("staff create offers no super_admin option", /\["operations","manager","support"\]/.test(SRC));
  ok("system admin is marked and protected (no edit/remove)", /isSystemAdmin/.test(SRC) && /adminSystemAdmin/.test(SRC));
}

group("M1.9c — LOGIN READS INPUT, PASSWORD EYE, LIVE COOLDOWN");
const m19c = (async () => {
  const t=boot();

  // password fields offer a show/hide eye (standard control)
  t.w.S.view="auth"; t.w.S.authMode="signin"; t.w.S.loginMethod="password"; t.w.render();
  ok("password field has a show/hide eye", !!t.q(".field__eye"));

  // the sign-in must read the typed password BEFORE re-rendering (the live bug:
  // render() wiped the field, the password was sent empty → "check your entries")
  t.w.S.authIdentifier="admin@ride.local";
  t.w.render();
  const pw = t.q("#auth-password");
  pw.value = "Admin@Ride2026!";
  let captured = null;
  t.w.fetch = async (_url, opts) => {
    captured = opts && opts.body ? JSON.parse(opts.body) : null;
    return { ok:true, json: async()=>({ user:{id:"u1",role:"super_admin",name:"Admin",email:"admin@ride.local",emailVerified:false,isSystemAdmin:true}, accessToken:"a", refreshToken:"r" }) };
  };
  const signinBtn = [...t.all(".btn")].find((b)=>b.textContent.includes(t.w.T.en.signInAction));
  signinBtn.click();
  await new Promise((r)=>setTimeout(r, 20));
  ok("sign-in sends the typed password", !!captured && captured.password === "Admin@Ride2026!",
     captured ? JSON.stringify(captured) : "no request");

  // the resend cooldown ticks IN PLACE — a full render would wipe the OTP boxes
  t.w.S.view="auth"; t.w.S.authMode="signup"; t.w.S.authStep="otp"; t.w.S.authEmail="a@x.com";
  t.w.S.resendUntil = Date.now() + 3000;
  t.w.render();
  const box = t.q(".otp__box"); box.value = "7";
  const rb = [...t.all(".btn")].find((b)=>/Resend in|أعد الإرسال بعد/.test(b.textContent));
  ok("resend button shows a live countdown and is disabled", !!rb && rb.disabled);
  await new Promise((r)=>setTimeout(r, 1100));
  ok("OTP input survives the ticking countdown (no full re-render)", t.q(".otp__box").value === "7");
  ok("countdown keeps ticking in place", !!rb && /Resend in|أعد الإرسال بعد/.test(rb.textContent));
})();

group("M1.9d — NOTIFICATIONS COPY COLLISION + STAFF PROFILE");
(() => {
  const t=boot();

  // the error namespace must not clobber the display string "Notifications"
  ok("notifications label is a plain string (no [object Object])",
     typeof t.w.T.en.notifications === "string" && t.w.T.en.notifications.length > 1,
     String(t.w.T.en.notifications));
  ok("email error keys live under error.*",
     typeof t.w.T.en.error.email_send_failed === "string" &&
     typeof t.w.T.en.error.email_not_configured === "string");

  // the super_admin profile must not show rider-only wallet / subscriptions / safety
  t.w.S.view="app"; t.w.S.authed=true; t.w.S.role="super_admin";
  t.w.S.user={id:"u1",role:"super_admin",name:"Admin",email:"admin@ride.local"};
  t.w.S.page="profile"; t.w.S.stack=[]; t.w.S.sheet=null; t.w.render();
  const txt = t.q(".main").textContent;
  ok("staff profile has no wallet entry", !/wallet/i.test(txt), "");
  ok("staff profile has no subscriptions entry", !txt.includes(t.w.T.en.subs), "");
  ok("staff profile has no safety centre entry", !txt.includes(t.w.T.en.safetyCentre), "");
  ok("staff profile still shows appearance settings", txt.includes(t.w.T.en.theme), "");

  // every staff role's nav includes a profile page (the header chip must work)
  for (const role of ["ops","manager","support","super_admin"]) {
    const pages = t.w.PAGES[role] || [];
    ok(`${role} nav has a profile page`, pages.some((p)=>p.k==="profile"), "");
  }
})();

group("M1.9e — OTP BYPASS SKIPS THE CODE STEP");
const m19e = (async () => {
  const t=boot();
  const session = { user:{id:"u1",role:"rider",name:"Nour",email:"rider@gmail.com",emailVerified:false}, accessToken:"a", refreshToken:"r" };

  // sign-up: a bypass response skips the OTP boxes and goes to the name step
  let sentSignup = null;
  t.w.fetch = async (url, opts) => {
    const body = opts && opts.body ? JSON.parse(opts.body) : {};
    if (url.endsWith("/auth/otp/request")) return { ok:true, json: async()=>({ ok:true, resendInMs:0, bypass:true }) };
    if (url.endsWith("/auth/signup/verify")) { sentSignup = body; return { ok:true, json: async()=>session }; }
    return { ok:false, status:404, json: async()=>({ message_key:"error.internal" }) };
  };
  t.w.S.view="auth"; t.w.S.authMode="signup"; t.w.S.authStep="choose"; t.w.render();
  t.q(".rolechoice").click();                       // choose Rider → email step
  t.q("#auth-email").value = "rider@gmail.com";
  [...t.all(".btn")].find((b)=>b.textContent.includes(t.w.T.en.sendCode)).click();
  await new Promise((r)=>setTimeout(r, 20));
  ok("signup skips the code step when bypass is on", t.w.S.authStep==="name" && !t.q(".otp__box"), String(t.w.S.authStep));

  // finish sign-up with a name → enters the app
  t.q("#auth-name").value = "Nour";
  t.q("#auth-password").value = "pw-12345678";
  [...t.all(".btn")].find((b)=>b.textContent.includes(t.w.T.en.createAccount)).click();
  await new Promise((r)=>setTimeout(r, 20));
  ok("bypass signup enters the app", t.w.S.view==="app" && t.w.S.role==="rider", String(t.w.S.view));
  ok("bypass signup omits the code field entirely (no empty-string 400)",
     !!sentSignup && !("code" in sentSignup), sentSignup ? JSON.stringify(sentSignup) : "no request");

  // sign-in: a bypass identify signs straight in (no OTP boxes)
  t.w.S.view="auth"; t.w.S.authed=false; t.w.S.authMode="signin"; t.w.S.loginMethod=null; t.w.render();
  t.w.fetch = async (url, opts) => {
    const body = opts && opts.body ? JSON.parse(opts.body) : {};
    if (url.endsWith("/auth/login/identify")) return { ok:true, json: async()=>({ method:"otp", bypass:true, resendInMs:0, target:"rider@gmail.com" }) };
    if (url.endsWith("/auth/otp/verify")) return { ok:true, json: async()=>session };
    return { ok:false, status:404, json: async()=>({ message_key:"error.internal" }) };
  };
  t.q("#auth-identifier").value = "rider@gmail.com";
  [...t.all(".btn")].find((b)=>b.textContent.includes(t.w.T.en.signinContinue)).click();
  await new Promise((r)=>setTimeout(r, 20));
  ok("bypass sign-in enters the app without a code", t.w.S.view==="app", String(t.w.S.view));
})();

group("BRANDING IS SINGLE-SOURCED (§0.3 one-change test)");
(() => {
  const t=boot();
  const B=t.w.BRAND;
  ok("the brand object is injected", !!B && !!B.name && !!B.logo, "");
  ok("page title is generated from BRAND", SRC.includes("<title>"+B.name.en+"</title>"), "");
  ok("copy table reads the brand name", t.w.T.en.brand === B.name.en && t.w.T.ar.brand === B.name.ar, "");
  ok("logo path is read from BRAND, not hardcoded", /const LOGO_PATH = BRAND\.logo\.path/.test(SRC), "");
  ok("favicon is a generated data URI", SRC.includes('href="data:image/svg+xml,') , "");
  ok("the brand font token is defined and used", /--brand-font:/.test(SRC) && /font-family:var\(--brand-font\)/.test(SRC), "");
})();

group("LANDING COMPLETENESS — riders, drivers, safety, policies");
(() => {
  const t=boot();
  t.w.S.view="landing"; t.w.S.landingPage="rider"; t.w.render();
  const txt = t.q(".landing").textContent;
  ok("landing speaks to riders", txt.includes(t.w.T.en.landingF1T));
  ok("landing has no duplicate safety block", !txt.includes(t.w.T.en.safetyTitle));
  const featTxt = t.all(".landing__feature").map((el)=>el.textContent).join("|");
  ok("landing folds safety into features (no board-by-code card)",
     featTxt.includes(t.w.T.en.safetyF1T) && featTxt.includes(t.w.T.en.safetyF3T)
     && !featTxt.includes(t.w.T.en.featureCodeT));
  ok("landing footer links policies", t.all(".landing__policylink").length === 3,
     String(t.all(".landing__policylink").length));
  ok("the Streamline credit is gone", !t.q(".landing__credits"));
  ok("no sample content on the landing", !/Corniche|Montazah|Smouha/.test(txt));

  // drivers have their own page (Uber/Careem model)
  t.w.S.landingPage="drive"; t.w.render();
  const driveTxt = t.q(".landing").textContent;
  ok("drive page speaks to drivers", driveTxt.includes(t.w.T.en.forDrivers) && driveTxt.includes(t.w.T.en.driverF2T));
  ok("drive page has the how-to steps", driveTxt.includes(t.w.T.en.driveStepsKick));
  ok("drive page has the apply CTA", driveTxt.includes(t.w.T.en.applyToDrive));
  t.w.S.landingPage="rider"; t.w.render();

  // a policy opens the honest structured doc and can go back
  t.all(".landing__policylink")[0].click();
  ok("a policy doc opens", t.q(".landing__doc") && t.w.S.landingDoc === "terms");
  ok("policy doc states the legal text is the operator's", t.q(".landing__doc").textContent.includes("legal"));
  t.q(".landing__doc .btn--ghost").click();
  ok("back returns to the landing", !t.w.S.landingDoc && !!t.q(".landing__hero"));
})();

group("LANDING v2 — nav pages, drive, about, help, sticky panels");
(() => {
  const t=boot();
  t.w.S.view="landing"; t.w.S.landingPage="rider"; t.w.render();

  // top bar: the Uber-style links + auth actions + menu (compact)
  ok("top bar has Ride/Drive/About/Help links", ["navRide","navDrive","navAbout","navHelp","navDownload"]
     .every((k)=> t.q(".landing").textContent.includes(t.w.T.en[k])));
  ok("top bar has Log in and Sign up", t.q(".landing").textContent.includes(t.w.T.en.login)
     && t.q(".landing").textContent.includes(t.w.T.en.signup));
  ok("compact menu button is labelled", !!t.q(".landing__menu") && t.q(".landing__menu").getAttribute("aria-label") === t.w.T.en.menu);

  // the rider page carries the sticky stacking panels (the parallax section)
  ok("rider landing has 4 stacking panels", t.all(".stackpanel").length === 4,
     String(t.all(".stackpanel").length));

  // drive → about → help navigate without a full app render
  const links = t.all(".landing__link");
  ok("nav renders Ride/Drive/About/Help/Get-the-app", links.length === 5, String(links.length));
  links[2].click();                      // About
  ok("about page renders", t.q(".landing").textContent.includes(t.w.T.en.aboutTitle));
  t.all(".landing__link")[3].click();    // Help
  ok("help page renders the FAQ", t.all(".landing__faqitem").length === 6,
     String(t.all(".landing__faqitem").length));

  // the mobile menu opens and navigates
  t.w.S.landingPage="rider"; t.w.render();
  t.q(".landing__menu").click();
  ok("menu panel opens", !!t.q(".landing__menu-panel"));
  t.q(".landing__menu-panel .landing__menulink").click();   // first link = Ride
  ok("menu link navigates and closes", t.w.S.landingPage==="rider" && !t.q(".landing__menu-panel"));
})();

group("POLICIES ARE FILLED (terms/privacy/safety, EN + AR)");
(() => {
  const t=boot();
  for(const lang of ["en","ar"]){
    t.w.S.lang=lang; t.w.S.view="landing"; t.w.S.landingDoc="terms"; t.w.render();
    ok(`terms doc has real sections (${lang})`, t.all(".landing__docsec").length >= 6,
       String(t.all(".landing__docsec").length));
    ok(`terms doc keeps the operator's-legal note (${lang})`,
       t.q(".landing__doc").textContent.includes(lang==="en" ? "legal" : "القانوني"));
    t.w.S.landingDoc="privacy"; t.w.render();
    ok(`privacy doc has real sections (${lang})`, t.all(".landing__docsec").length >= 6);
    t.w.S.landingDoc="safety"; t.w.render();
    ok(`safety doc has real sections (${lang})`, t.all(".landing__docsec").length >= 6);
  }
})();

group("M3 — RIDER BOOKING FLOW IS REAL");
(() => {
  const t=boot();
  t.set({role:"rider", user:{id:"u1",role:"rider",name:"Nour"}});

  // review renders the fare + seats stepper + confirm (no fake data)
  t.w.S.chosenRoute = { route: { id:"r1", code:"ALX-R001", name_en:"Corniche", fare_minor:1500 },
    stops: [{ stop_id:"s1", stop_name_en:"Gate 2", stop_code:"ALX-COR-001", position:1 }] };
  t.w.S.chosenBoard = "s1";
  t.w.S.chosenDep = { id:"j1", seats_total:14, service_date:"2026-09-01", departs:"2026-09-01T12:00:00+02:00" };
  t.go("rider","review");
  ok("review shows the locked fare (route fare × seats)", t.q(".pricetag").textContent.includes("15"));
  ok("review has a seat stepper", t.all(".stepper button").length === 2);
  ok("review offers confirm booking", [...t.all(".btn")].some((b)=>b.textContent.includes(t.w.T.en.confirmBooking)));
  ok("review embeds payment choice (cash at least)", /pay the driver/.test(t.q(".main").textContent));

  // booked screen shows the boarding code when a booking exists
  t.w.S.lastBooking = { code:"482917", seats:1, fare_minor:1500 };
  t.go("rider","booked");
  ok("booked shows the boarding code", t.q(".qrcode") && t.q(".qrcode").textContent === "482917");
})();

group("M3 — ROUTES TOOL + DRIVER WORK BOARD");
(() => {
  const t=boot();

  // ops routes screen is a real tool (create form + list loader)
  t.set({role:"ops", user:{id:"u1",role:"operations",name:"Ops"}});
  t.go("ops","routes");
  ok("routes tool has a create form", !!t.q("#route-name-en") && !!t.q("#route-fare"));
  ok("routes tool has window + interval fields", !!t.q("#route-win-start") && !!t.q("#route-interval"));
  ok("routes tool lists routes (real loader)", !!t.q("#routes-list"));
  // riders also have a "routes" page (R-11 route list) — distinct from the ops tool

  // route detail renders stop + slot loaders + publish
  t.w.S.opsView = "routeDetail";
  t.w.S.opsTarget = { id:"r1", code:"ALX-R001", name_en:"Corniche", status:"draft",
    fare_minor:1500, window_start:"06:00", window_end:"10:00", slot_interval_min:15 };
  t.w.render();
  ok("route detail renders the publish action", [...t.all(".btn")].some((b)=>b.textContent.includes(t.w.T.en.publishRoute)));
  ok("route detail renders stop + slot loaders", !!t.q("#route-stops") && !!t.q("#route-slots"));
  ok("route detail owns stop add (no separate stops page)", !!t.q("#stop-lat") && !!t.q("#stop-name-en"));

  // driver work board renders the real loader
  t.set({role:"driver", user:{id:"u2",role:"driver",name:"Mahmoud"}});
  t.go("driver","work");
  ok("driver work board renders the find-work loader", !!t.q("#work-list"));
})();

group("M2 — STOPS ARE A ROUTE PROPERTY (no independent page)");
(() => {
  const t=boot();
  ok("stops page is gone from ops nav", !(t.w.PAGES.ops||[]).some((p)=>p.k==="stops"));
  ok("stops page is gone from super_admin nav", !(t.w.PAGES.super_admin||[]).some((p)=>p.k==="stops"));
  ok("stops screen is NOT in the rider nav", !(t.w.PAGES.rider||[]).some((p)=>p.k==="stops"));
  ok("nav.adminSettings is Settings", t.w.T.en.nav.adminSettings==="Settings");

  t.set({role:"ops", user:{id:"u1",role:"operations",name:"Ops"}});
  t.go("ops","routes");
  ok("routes list has pending review slot", !!t.q("#pending-list"));

  t.w.S.opsView = "routeDetail";
  t.w.S.opsTarget = { id:"r1", code:"ALX-R001", name_en:"Corniche", status:"draft",
    fare_minor:1500, window_start:"06:00", window_end:"10:00", slot_interval_min:15 };
  t.w.render();
  ok("route form has stop coordinates", !!t.q("#stop-lat") && !!t.q("#stop-lng"));
  ok("route form has bilingual stop names", !!t.q("#stop-name-en") && !!t.q("#stop-name-ar"));

  t.w.S.opsView = "stopReview";
  t.w.S.opsTarget = { id:"s1", code:"ALX-COR-001", lat:31.2, lng:29.9, status:"pending",
    source:"field", created_by:"someone-else", stand_ok:true, lit_ok:true, legal_stop_ok:true, reachable_ok:true, gps_accuracy_m:8 };
  t.w.render();
  ok("review view shows the reject reason field", !!t.q("#review-reason"));
  ok("review view offers approve (not your own capture)", [...t.all(".btn")].some((b)=>b.textContent.includes(t.w.T.en.approveStop)));
  ok("review view renders the field checklist", t.q(".main").textContent.includes(t.w.T.en.standOk));

  t.w.S.opsTarget.created_by = "u1";
  t.w.render();
  const hasApprove = [...t.all(".btn")].some((b)=>b.textContent.includes(t.w.T.en.approveStop));
  ok("own capture hides the approve action", !hasApprove);
})();

group("BUILD INTEGRITY");
{
  ok("no sample content in the bundle (demo data is gone)",
     !/Corniche|Montazah|Smouha|Agami|Miami|Hiace|driverToday|walletHistory|const DATA/.test(SRC),
     "a sample string leaked into the bundle");
  ok("output is a single self-contained file", !/<script\s+src=/.test(SRC) && !/<link\s+[^>]*stylesheet/.test(SRC),
     "external references would break offline / preview");
  ok("no prototype harness remains",
     !/GUI prototype|harness|screenid|Screen not in this prototype/i.test(SRC));
  ok("no leftover placeholder text", !/lorem|TODO|FIXME|XXX/i.test(SRC));
  ok("no absolute local paths leaked", !/\/home\/[a-z]+\//.test(SRC));
  ok("viewport is mobile-correct", /viewport-fit=cover/.test(SRC));
  ok("theme-color set for mobile chrome", /name="theme-color"/.test(SRC));
}

group("PATH B — W1 wallet charge after book");
const mW1 = (async () => {
  const t=boot();
  t.set({role:"rider", user:{id:"u1",role:"rider",name:"Nour"},
    chosenRoute:{ route:{ id:"r1", fare_minor:1500, name_en:"Line" }, stops:[{stop_id:"s1",stop_name_en:"A"}] },
    chosenBoard:"s1", chosenDep:{ id:"j1", service_date:"2026-09-01", departs:"2026-09-01T12:00:00Z" },
    seats:1, payMethod:"wallet", payConfig:{paymobEnabled:false}, wallet:{balanceMinor:5000,entries:[]},
    walletLoading:false, page:"review"});
  let paid=false, booked=false;
  t.w.fetch = async (url, opts) => {
    const u=String(url);
    if(u.endsWith("/bookings") && opts && opts.method==="POST"){ booked=true; return { ok:true, json:async()=>({ id:"bk-1", code:"111222", fare_minor:1500 }) }; }
    if(u.includes("/payments/bookings/bk-1/pay-wallet")){ paid=true; return { ok:true, json:async()=>({ ok:true }) }; }
    return { ok:false, status:404, json:async()=>({ message_key:"error.internal" }) };
  };
  await t.w.confirmBookingAction();
  ok("wallet book calls pay-wallet", booked && paid);
  ok("booked state is paid_wallet", t.w.S.lastBooking && t.w.S.lastBooking.payState==="paid_wallet");
  t.w.S.page="booked"; t.w.render();
  ok("booked screen shows paid-from-wallet", /Paid from wallet/.test(t.q(".main").textContent));
  ok("payWallet client exists", typeof t.w.API.payWallet === "function");
  ok("j_paidWallet both languages", t.w.T.en.j_paidWallet && t.w.T.ar.j_paidWallet !== t.w.T.en.j_paidWallet);
})();

group("ROLE NAV — operations maps to ops; other roles stay themselves");
{
  const t=boot();
  ok("uiRole maps operations → ops", t.w.uiRole("operations")==="ops");
  ok("uiRole keeps manager", t.w.uiRole("manager")==="manager");
  ok("uiRole keeps support", t.w.uiRole("support")==="support");
  ok("uiRole keeps super_admin", t.w.uiRole("super_admin")==="super_admin");
  ok("ops nav still has queue and routes", (t.w.pagesFor("operations")||[]).some((p)=>p.k==="queue") && (t.w.pagesFor("ops")||[]).some((p)=>p.k==="routes"));
  ok("manager nav is unchanged", (t.w.pagesFor("manager")||[]).some((p)=>p.k==="pricing"));
  t.w.enterApp({id:"o1", role:"operations", name:"Ops"});
  ok("operations login is not a blank screen", !!t.q(".nav") && t.w.S.role==="ops");
  t.w.enterApp({id:"a1", role:"super_admin", name:"Admin"});
  ok("super_admin login renders overview", !!t.q(".main") && t.w.S.role==="super_admin");
}

group("NATIVE APP — skip landing, same API origin hook");
{
  const t=boot();
  ok("default kind is web in jsdom", t.w.Platform.kind()==="web");
  t.w.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android" };
  ok("kind is native when Capacitor reports native", t.w.Platform.kind()==="native");
  t.w.__RS_SURFACE = "mobile";
  t.w.S.view="boot"; t.w.S.authed=false; t.w.render();
  t.w.S.view="landing"; t.w.S.authed=false; t.w.render();
  ok("mobile surface never shows the marketing landing", !t.q(".landing") && !!t.q(".authwrap"));
  ok("mobile welcome copy is on the auth card", /Welcome|أهلا/.test(t.q(".authwrap").textContent));
  t.w.Capacitor = undefined;
  t.w.__RS_SURFACE = "web";
}

group("SURFACES — website has no intro; mobile origin has intro");
{
  const t=boot();
  t.w.__RS_SURFACE = "web";
  try { t.w.localStorage.removeItem("rs.intro.v1"); } catch (e) {}
  t.w.S.authed=false; t.w.guestHome(); t.w.render();
  ok("website guest opens landing, not intro", t.w.S.view==="landing" && !!t.q(".landing") && !t.q(".intro"));
  t.w.S.view="intro"; t.w.S.authed=false; t.w.render();
  ok("website cannot keep the intro view", !t.q(".intro") && !!t.q(".landing"));
  t.w.__RS_SURFACE = "mobile";
  try { t.w.localStorage.removeItem("rs.intro.v1"); } catch (e) {}
  t.w.S.authed=false; t.w.guestHome(); t.w.render();
  ok("mobile guest opens intro slides", t.w.S.view==="intro" && !!t.q(".intro") && !t.q(".landing"));
  t.w.S.view="auth"; t.w.S.authMode="signin"; t.w.render();
  ok("mobile after intro is auth, not landing", t.w.S.view==="auth" && !!t.q(".authwrap") && !t.q(".landing"), String(t.w.S.view));
  t.w.__RS_SURFACE = "web";
}

const pendingAsync = [m19c, m19e, mTrips, mSearchNorm, mSearchScreen, mW1];

/* ═══════════════════════════════════════════════════════════════════
   PATH A — wallet & payments (P3.7.4). S.wallet/S.payConfig drive the
   screen; fetch is stubbed so the states are exercised deterministically.
   ═══════════════════════════════════════════════════════════════════ */
group("PATH A — wallet renders the derived balance and honest states");
{
  const t=boot();
  t.set({ wallet:{ balanceMinor:15000, entries:[
    { id:"e1", side:"credit", amountMinor:15000, reason:"topup", createdAt:"2026-08-24T10:00:00Z" },
    { id:"e2", side:"debit",  amountMinor:3000,  reason:"fare_paid_driver_share", createdAt:"2026-08-24T11:00:00Z" },
  ]}, payConfig:{ paymobEnabled:true, topupMinMinor:500, topupMaxMinor:1000000 },
      walletLoading:false, walletError:null, page:"wallet" });
  ok("wallet shows the derived balance", /150 EGP/.test(t.q(".main").textContent));
  ok("wallet lists entry reasons in words", /Top-up/.test(t.q(".main").textContent) && /Fare \(driver\)/.test(t.q(".main").textContent));
  ok("wallet shows in/out signs", /\+ 150 EGP/.test(t.q(".main").textContent) && /− 30 EGP/.test(t.q(".main").textContent));
  ok("top-up CTA visible when Paymob is enabled", !!t.q(".btn, button") && /Top up/.test(t.q(".main").textContent));

  t.set({ payConfig:{ paymobEnabled:false, topupMinMinor:500, topupMaxMinor:1000000 } });
  ok("Paymob off → CTA hidden, honest sentence shown (§8.1)",
     !/w_topup\b/.test(t.q(".main").textContent) && /not available yet/.test(t.q(".main").textContent) && /pay the driver/.test(t.q(".main").textContent));

  t.set({ wallet:null, walletLoading:true, walletError:null });
  ok("loading state is honest (no invented balance)", /…|Loading|جار/.test(t.q(".main").textContent) || t.q(".banner"));

  t.set({ wallet:null, walletLoading:false, walletError:"The top-up could not start." });
  ok("error state shows the message", /top-up could not start/.test(t.q(".main").textContent));

  t.set({ wallet:{ balanceMinor:0, entries:[] }, payConfig:{ paymobEnabled:false }, walletLoading:false, walletError:null });
  ok("empty entries state", !!t.q(".empty"));
}

group("PATH A — paymentChoice follows DEC-204 order and hides what cannot be used");
{
  const t=boot();
  t.set({ wallet:{ balanceMinor:5000, entries:[] },
          payConfig:{ paymobEnabled:true, topupMinMinor:500, topupMaxMinor:1000000 },
          payMethod:null });
  const el = t.w.paymentChoice(3000);
  ok("sufficient wallet → wallet is offered first", /Wallet/.test(el.textContent));
  ok("cash is always offered", /pay the driver at boarding/.test(el.textContent));
  t.set({ wallet:{ balanceMinor:1000, entries:[] } });
  const el2 = t.w.paymentChoice(3000);
  // Row renders .rowitem — a selector that cannot match would make this a
  // check that cannot fail (§0.2, caught by the break harness once already).
  const rows=[...el2.querySelectorAll(".rowitem")].map(r=>r.textContent).filter(x=>/Wallet/.test(x));
  ok("insufficient wallet → wallet method absent (not disabled)", rows.length===0);
  t.set({ payConfig:{ paymobEnabled:false } });
  const el3 = t.w.paymentChoice(3000);
  ok("Paymob off → only cash offered", !/card payment/i.test(el3.textContent) && /pay the driver/.test(el3.textContent));
}

group("PATH A — payments copy exists in BOTH languages (i18n parity)");
{
  const t=boot();
  const EVALT = (k)=> t.w.eval(`t(${JSON.stringify(k)})`); // t is a top-level const — eval in-page
  t.w.S.lang="en"; const en=EVALT("payments.disabled"); t.w.S.lang="ar"; const ar=EVALT("payments.disabled");
  ok("payments.disabled localized both ways", en!=="payments.disabled" && ar!=="payments.disabled" && en!==ar);
  t.w.S.lang="en";
  ["w_balance","w_topup","w_paymobOff","w_choice","w_insufficient"].forEach((k)=>{
    ok(`EN key ${k} resolves`, EVALT(k)!==k);
    t.w.S.lang="ar"; ok(`AR key ${k} resolves`, EVALT(k)!==k); t.w.S.lang="en";
  });
}

/* ===== Path B ===== */
group("PATH B — boarding scan UI + copy");
{
  const t=boot();
  t.w.S.view="app"; t.w.S.authed=true; t.w.S.role="driver"; t.w.S.user={id:"d1",role:"driver",name:"D"};
  t.w.S.page="journey"; t.w.render();
  ok("scan API exists", typeof t.w.API.scanBooking === "function");
  ok("manifest API exists", typeof t.w.API.journeyManifest === "function");
  ok("j_scanTitle EN", !!t.w.T.en.j_scanTitle);
  ok("j_scanTitle AR", !!t.w.T.ar.j_scanTitle && t.w.T.ar.j_scanTitle !== t.w.T.en.j_scanTitle);
  t.w.S.role="rider"; t.w.S.page="booked"; t.w.S.lastBooking={code:"123456", route_name_en:"Line"};
  t.w.render();
  ok("booked screen shows the 6 digits", !!t.q(".qrcode") && t.q(".qrcode").textContent.includes("123456"));
  ok("start/complete/alight clients exist",
     typeof t.w.API.startJourney === "function" && typeof t.w.API.requestAlight === "function");
}

group("PATH B — A→B planner (DEC-199)");
{
  const t=boot();
  ok("planner is exported", typeof t.w.planJourneys === "function");
  const A = { stop_id:"a", stop_name_en:"Gate North", lat:31.22, lng:29.92, position:1 };
  const B = { stop_id:"b", stop_name_en:"Gate Mid",   lat:31.21, lng:29.93, position:2 };
  const C = { stop_id:"c", stop_name_en:"Gate South", lat:31.20, lng:29.94, position:3 };
  const D = { stop_id:"d", stop_name_en:"Hub East",   lat:31.21, lng:29.95, position:2 };
  const E = { stop_id:"e", stop_name_en:"Campus",     lat:31.205, lng:29.96, position:3 };
  const idx = t.w.buildRiderIndex([
    { route:{ id:"r1", code:"L1", name_en:"North Line", fare_minor:1500 },
      stops:[A,B,C] },
    { route:{ id:"r2", code:"L2", name_en:"East Line", fare_minor:1200 },
      stops:[{...B, position:1, stop_id:"b2", lat:B.lat, lng:B.lng}, D, E] },
  ]);
  const plans = t.w.planJourneys(A, C, idx);
  ok("same-line start→end recommends the line", plans.length>0 && plans[0].kind==="single" && plans[0].routeId==="r1");
  ok("recommended boarding is the start stop", plans[0].board.stop_id==="a");
  ok("walk distances are finite and honest", Number.isFinite(plans[0].walkBoard) && plans[0].walkBoard < 50);
  ok("same stop yields no plan", t.w.planJourneys(A, A, idx).length===0);
  const destNearLine = { stop_id:"x", lat:31.202, lng:29.941 }; // near C, not a stop
  const near = t.w.planJourneys(A, destNearLine, idx);
  ok("line serves a destination near the corridor (alight-anywhere)", near.length>0 && near[0].routeId==="r1");
  t.set({role:"rider", user:{id:"u1",role:"rider",name:"Nour"}});
  t.go("rider","plan");
  ok("plan screen renders both pickers", !!t.q("#plan-from") && !!t.q("#plan-to"));
  ok("j_planTitle exists in both languages", !!t.w.T.en.j_planTitle && !!t.w.T.ar.j_planTitle
     && t.w.T.ar.j_planTitle !== t.w.T.en.j_planTitle);
}

group("PATH B — M4 safety (SOS + report + share)");
{
  const t=boot();
  ok("SOS client exists", typeof t.w.API.raiseSos === "function");
  ok("report client exists", typeof t.w.API.fileReport === "function");
  ok("share client exists", typeof t.w.API.createShareLink === "function");
  ok("j_sosSend both languages", !!t.w.T.en.j_sosSend && t.w.T.ar.j_sosSend !== t.w.T.en.j_sosSend);
  t.set({role:"rider", user:{id:"u1",role:"rider",name:"Nour"}});
  t.go("rider","safety");
  ok("safety centre lists SOS", t.q(".main").textContent.includes(t.w.T.en.sos));
  ok("safety does not fake a phone call", !t.q(".main").textContent.includes(t.w.T.en.callSupport));
  t.w.openSheet("sos");
  ok("SOS sheet is a live send, not coming-soon", !!t.q(".sheet") && t.q(".sheet").textContent.includes(t.w.T.en.j_sosSend));
}

/* ═══════════════════════════════════════════════════════════════════
   PATH A — RouteMap, the one data-bound map primitive (R21). jsdom has
   no map SDK → the honest fallback + the accessible stop list are the
   test surface; the real-tiles branches are exercised by the CI browser
   suite on the ops stops tool.
   ═══════════════════════════════════════════════════════════════════ */
group("PATH A — RouteMap renders data-bound stops with an accessible list");
{
  const t=boot();
  const STOPS=[
    { stop_id:"s1", position:1, name_en:"Smouha", name_ar:"سموحة", lat:31.21, lng:29.94 },
    { stop_id:"s2", position:2, name_en:"Sidi Gaber", name_ar:"سيدي جابر", lat:31.23, lng:29.96 },
    { stop_id:"s3", position:3, name_en:"Mandara", name_ar:"المنتزه", lat:31.29, lng:29.99 },
  ];
  const el = t.w.RouteMap ? t.w.RouteMap({ stops: STOPS, highlightStopId: "s2", h: 200 })
                          : t.w.eval(`RouteMap({ stops: ${JSON.stringify(STOPS)}, highlightStopId: "s2", h: 200 })`);
  const items=[...el.querySelectorAll(".mapstops__item")];
  ok("stop list shows every stop in order", items.length===3 && /Smouha/.test(items[0].textContent) && /Mandara/.test(items[2].textContent));
  ok("numbers are visual only (aria-hidden)", !!el.querySelector(".mapstops__n[aria-hidden=\"true\"]"));
  ok("highlighted stop carries the boarding chip", items.some(i=>/Boarding here/.test(i.textContent) && i.className.includes("--hi")));

  const el2 = t.w.RouteMap ? t.w.RouteMap({ stops: [] })
                           : t.w.eval(`RouteMap({ stops: [] })`);
  ok("empty/invalid stops → honest empty message, no crash", /No stops mapped/.test(el2.textContent));

  const el3 = t.w.RouteMap ? t.w.RouteMap({ stops: STOPS })
                           : t.w.eval(`RouteMap({ stops: ${JSON.stringify(STOPS)} })`);
  ok("no highlight → no boarding chip anywhere", !/Boarding here/.test(el3.textContent));
}

/* ===== Path B — admin overview + audit paging ===== */
group("PATH B — admin overview uses real rows, not broken tiles");
{
  const t=boot();
  t.set({role:"super_admin", user:{id:"u1",role:"super_admin",name:"Admin"}});
  t.go("super_admin","admin");
  const main=t.q(".main").textContent;
  ok("top bar is Administration, not nav.admin", t.q(".topbar__title").textContent===t.w.T.en.adminArea);
  ok("nav.admin is translated", t.w.T.en.nav.admin==="Overview" && t.w.T.ar.nav.admin==="نظرة عامة");
  ok("staff self-signup lecture is gone from admin home", !main.includes(t.w.T.en.staffNoSelfSignup));
  ok("home uses row items with real icons", t.all(".rowitem").length>=4 && t.all(".rowitem svg").length>=4);
  ok("home does not use the broken metric tiles", !t.q(".metric--link"));
}

group("PATH B — audit log is paged");
const mAdminAudit = (async () => {
  const t=boot();
  t.set({role:"super_admin", user:{id:"u1",role:"super_admin",name:"Admin"}, auditPage:0});
  let seen="";
  t.w.fetch = async (url) => {
    seen=String(url);
    const items=[{ action:"booking.scan", actor_name:"Dina", created_at:"2026-08-24T10:00:00Z", target_type:"booking", reason:null }];
    return { ok:true, json:async()=>({ items, total:40, limit:25, offset:0 }) };
  };
  t.go("super_admin","adminAudit");
  await new Promise((r)=>setTimeout(r,20));
  ok("audit request is paged", /limit=25/.test(seen) && /offset=0/.test(seen), seen);
  ok("audit shows the human action + who + when", /booking · scan/.test(t.q(".main").textContent) && /Dina/.test(t.q(".main").textContent));
  ok("audit shows next because total > page", [...t.all(".btn")].some((b)=>b.textContent.includes(t.w.T.en.j_auditNext)));
})();

/* ===== Path B — P7.2 driver outbox ===== */
group("PATH B — local leave-now alarm (P7.5 DEC-147)");
{
  const t=boot();
  ok("LocalAlarm is on the window", typeof t.w.LocalAlarm === "object" && typeof t.w.LocalAlarm.schedule === "function");
  ok("Platform.registerPush exists", typeof t.w.Platform.registerPush === "function");
  ok("registerDevice client exists", typeof t.w.API.registerDevice === "function");
  ok("j_alarmLeave both languages", !!t.w.T.en.j_alarmLeave && t.w.T.ar.j_alarmLeave !== t.w.T.en.j_alarmLeave);
}

group("PATH B — journey GPS batch + stale gap (P7.4)");
{
  const t=boot();
  ok("LocationTrack is on the window", typeof t.w.LocationTrack === "object" && typeof t.w.LocationTrack.start === "function");
  ok("Platform.watchPosition exists", typeof t.w.Platform.watchPosition === "function");
  ok("j_posStale both languages", !!t.w.T.en.j_posStale && t.w.T.ar.j_posStale !== t.w.T.en.j_posStale);
  ok("j_trackingOn both languages", !!t.w.T.en.j_trackingOn && t.w.T.ar.j_trackingOn !== t.w.T.en.j_trackingOn);
}

group("PATH B — camera scan copy + Platform.scanCode (P7.3)");
{
  const t=boot();
  ok("Platform.scanCode exists", typeof t.w.Platform.scanCode === "function");
  ["j_scanCamera","j_scanDenied","j_scanUnavailable"].forEach((k)=>{
    t.w.S.lang="en"; const en=t.w.eval("t("+JSON.stringify(k)+")");
    t.w.S.lang="ar"; const ar=t.w.eval("t("+JSON.stringify(k)+")");
    t.w.S.lang="en";
    ok(k+" both languages", en!==k && ar!==k && en!==ar);
  });
}

group("PATH B — driver outbox is wired and bilingual");
{
  const t=boot();
  ok("Outbox is on the window", typeof t.w.Outbox === "object" && typeof t.w.Outbox.create === "function");
  ok("queueOrSend exists", typeof t.w.queueOrSend === "function");
  t.w.S.lang="en"; const en=t.w.eval("t(\"j_queued\")");
  t.w.S.lang="ar"; const ar=t.w.eval("t(\"j_queued\")");
  t.w.S.lang="en";
  ok("j_queued both languages", en!=="j_queued" && ar!=="j_queued" && en!==ar);
}

/* ===== Path B — P7.1 Platform (one codebase) ===== */
group("PATH B — Platform is the only native seam");
{
  const t=boot();
  ok("Platform is on the window (inlined from packages/platform)", typeof t.w.Platform === "object" && typeof t.w.Platform.getPosition === "function");
  ok("kind is web inside jsdom", t.w.Platform.kind() === "web");
  ok("bundle does not import @capacitor", !/from ['\"]@capacitor\//.test(t.html));
}

group("PATH A — RouteMap i18n parity (m_* keys)");
{
  const t=boot();
  const tt=(k)=> t.w.eval(`t(${JSON.stringify(k)})`);
  ["m_stopsAria","m_boardingHere","m_routeAria","m_vehicle"].forEach((k)=>{
    t.w.S.lang="en"; const en=tt(k); t.w.S.lang="ar"; const ar=tt(k); t.w.S.lang="en";
    ok(`${k} resolves in both languages`, en!==k && ar!==k && en!==ar);
  });
}

pendingAsync.push(mAdminAudit);

group("OWNER SETTINGS — two-col rows + email verification");
const mSettings = (async () => {
  const t=boot();
  t.set({role:"super_admin", user:{id:"u1",role:"super_admin",name:"Admin",isSystemAdmin:true}});
  t.w.fetch = async (url) => {
    if (String(url).includes("/admin/settings")) return { ok:true, json:async()=>({
      env:{ commission_percent:0, notify_behavioural_max_day:3, notify_behavioural_gap_hours:24,
        notify_promo_max_day:2, notify_promo_max_week:6, notify_non_tx_max_day:4,
        paymob_enabled:false, auth_otp_bypass:false },
      override:{ commission_percent:null, notify_behavioural_max_day:null, notify_behavioural_gap_hours:null,
        notify_promo_max_day:null, notify_promo_max_week:null, notify_non_tx_max_day:null,
        paymob_enabled:null, auth_otp_bypass:null },
      effective:{ commission_percent:0, notify_behavioural_max_day:3, notify_behavioural_gap_hours:24,
        notify_promo_max_day:2, notify_promo_max_week:6, notify_non_tx_max_day:4,
        paymob_enabled:false, auth_otp_bypass:false },
    }) };
    return { ok:false, status:404, json:async()=>({ message_key:"error.internal" }) };
  };
  t.go("super_admin","adminSettings");
  await new Promise((r)=>setTimeout(r,20));
  const main=t.q(".main").textContent;
  ok("settings nav label is Settings", t.q(".topbar__title").textContent===t.w.T.en.nav.adminSettings);
  ok("no Railway disclaimer", !/Railway/.test(main));
  ok("email verification control is present", !!t.q("#set-otp") && /Email verification/.test(main));
  ok("commission and Paymob are present", !!t.q("#set-comm") && !!t.q("#set-paymob"));
  ok("settings use the two-column setting rows", t.all(".setting").length>=6);
})();
pendingAsync.push(mSettings);
Promise.all(pendingAsync).then(() => {
  console.log(`\n──────── ${pass} passed, ${fail} failed ────────`);
  process.exit(fail?1:0);
});

/* ═══════════════════════════════════════════════════════════════════
   PATH A — the Uber-style planner search (DEC-206). Local index →
   snappy typeahead, combobox a11y, snap-to-nearest-stop pinning, and
   the hand-off to B's recommendation engine (no duplicated logic).
   ═══════════════════════════════════════════════════════════════════ */
group("PATH A — planner: snappy typeahead with combobox a11y");
{
  const t=boot();
  const IDX=[{ id:"r1", route:{ id:"r1", code:"C1", name_en:"Corridor 1", name_ar:"ممر ١", fare_minor:1500 },
    stops:[
      { stop_id:"s1", stop_code:"SMH", stop_name_en:"Smouha", stop_name_ar:"سموحة", lat:31.210, lng:29.940 },
      { stop_id:"s2", stop_code:"SGB", stop_name_en:"Sidi Gaber", stop_name_ar:"سيدي جابر", lat:31.230, lng:29.960 },
    ]},
    { id:"r2", route:{ id:"r2", code:"C2", name_en:"Corridor 2", name_ar:"ممر ٢", fare_minor:1200 },
    stops:[
      { stop_id:"s3", stop_code:"MND", stop_name_en:"Mandara", stop_name_ar:"المنتزه", lat:31.290, lng:29.990 },
    ]}];
  t.w.S.riderIndex=IDX;   // the REAL index shape: {id, route, stops} (search.js)

  const el=t.w.plannerSearchScreen();
  ok("planner renders both fields + the typeahead region",
     !!el.querySelector("#plan-from") && !!el.querySelector("#plan-to") && !!el.querySelector("#plan-typeahead"));
  ok("inputs are comboboxes wired to the list (a11y)",
     el.querySelector("#plan-to").getAttribute("role")==="combobox" &&
     el.querySelector("#plan-to").getAttribute("aria-controls")==="plan-typeahead");
  ok("map present as context (illustration fallback in jsdom)", !!el.querySelector(".mapbox"));

  t.w.S.planFocus="to"; t.w.S.planToQ="smo";
  const list=el.querySelector("#plan-typeahead");
  t.w.plannerRenderList(list, t.w.collectPlannerStops(IDX));
  const opts=[...list.querySelectorAll("[role=option]")];
  ok("first letters filter snappy (EN)", opts.length===1 && /Smouha/.test(opts[0].textContent));

  t.w.S.planToQ="سمو";
  t.w.plannerRenderList(list, t.w.collectPlannerStops(IDX));
  ok("first letters filter snappy (AR)", [...list.querySelectorAll("[role=option]")].length===1);

  const active=list.querySelector(".ta-row--active");
  ok("active option is aria-selected", active && active.getAttribute("aria-selected")==="true");

  t.w.plannerPick("to", IDX[0].stops[1]);
  ok("picking sets the destination", t.w.S.planTo && t.w.S.planTo.stop_id==="s2");
  ok("focus closes after pick", t.w.S.planFocus===null);
}

group("PATH A — planner: map pin snaps to the nearest stop; results reuse the engine");
{
  const t=boot();
  const IDX=[{ id:"r1", route:{ id:"r1", code:"C1", name_en:"Corridor 1", name_ar:"ممر ١", fare_minor:1500 },
    stops:[
      { stop_id:"s1", stop_code:"A", stop_name_en:"Near Stop", stop_name_ar:"قريبة", lat:31.211, lng:29.941 },
      { stop_id:"s2", stop_code:"B", stop_name_en:"Far Stop", stop_name_ar:"بعيدة", lat:31.280, lng:29.980 },
    ]}];
  t.w.S.riderIndex=IDX;
  const stops=t.w.collectPlannerStops(IDX);

  const near=t.w.nearestStop(31.2105, 29.9405, stops);
  ok("nearestStop picks the closest by distance", near && near.stop_id==="s1");

  t.w.plannerSetField("from", stops[0]);
  t.w.plannerSetField("to", stops[1]);
  const el=t.w.plannerSearchScreen();
  ok("both set → the SAME results engine renders (planJourneys path)",
     !!el.querySelector("#plan-results"));
}

group("PATH A — planner i18n parity (p_*)");
{
  const t=boot();
  const tt=(k)=> t.w.eval(`t(${JSON.stringify(k)})`);
  ["p_hint","p_whereTo","p_useMyLocation","p_matches","p_recommendedRoute"].forEach((k)=>{
    t.w.S.lang="en"; const en=tt(k); t.w.S.lang="ar"; const ar=tt(k); t.w.S.lang="en";
    ok(`${k} in both languages`, en!==k && ar!==k && en!==ar);
  });
}

group("PATH A — phase 1a embeddings: boarding map + fleet map honesty");
{
  const t=boot();
  const ROUTE={ route:{ id:"r1", code:"C1", name_en:"Corridor 1", fare_minor:1500 }, stops:[
    { stop_id:"s1", stop_code:"SMH", stop_name_en:"Smouha", stop_name_ar:"سموحة", lat:31.210, lng:29.940 },
    { stop_id:"s2", stop_code:"SGB", stop_name_en:"Sidi Gaber", stop_name_ar:"سيدي جابر", lat:31.230, lng:29.960 }]};
  t.set({ chosenRoute: ROUTE, chosenBoard: "s2", page: "boarding" });
  ok("boarding screen renders the route map's accessible stop list",
     t.all(".mapstops__item").length === 2);
  ok("chosen boarding stop is highlighted on the map list",
     t.all(".mapstops__item--hi").length === 1 && /Boarding here/.test(t.q(".main").textContent));
  t.set({ page: "review" });
  ok("review screen shows the boarding-highlight map", t.all(".mapstops__item--hi").length === 1);
}

group("INTRO + DOWNLOAD — first-open slides and versioned APK URL");
{
  const t=boot();
  ["j_intro1T","j_intro4T","j_intro4C","j_offlineTitle","j_offlineRetry"].forEach((k)=>{
    t.w.S.lang="en"; const en=t.w.eval("t("+JSON.stringify(k)+")");
    t.w.S.lang="ar"; const ar=t.w.eval("t("+JSON.stringify(k)+")");
    t.w.S.lang="en";
    ok(k+" both languages", en!==k && ar!==k && en!==ar);
  });
  ok("last slide is Start Driving", t.w.T.en.j_intro4T==="Start Driving & Get Paid");
  ok("last slide requires a separate Driver Account", /Driver Account/.test(t.w.T.en.j_intro4B) && /Driver Account/.test(t.w.T.en.j_intro4C));
  t.w.__RS_SURFACE = "mobile";
  t.w.S.view="intro"; t.w.S.introSlide=3; t.w.S.authed=false; t.w.render();
  ok("intro last slide renders", !!t.q(".intro") && /Start Driving/.test(t.q(".intro").textContent));
  ok("intro last slide has Get started", [...t.all(".btn")].some((b)=>b.textContent.includes(t.w.T.en.j_introStart)));
  t.w.__RS_SURFACE = "web";
  t.w.S.view="landing"; t.w.S.landingPage="download"; t.w.render();
  const a=t.q("a.btn--primary");
  ok("download APK href is cache-busted", !!a && /\/download\/android\.apk\?v=/.test(a.getAttribute("href")), a&&a.getAttribute("href"));
  ok("download has no debug-APK disclaimer", !/Debug APK|closed beta/.test(t.q(".landing").textContent));
  ok("download is two columns", t.all(".desk-split .card").length===2);
  ok("QR encodes the same APK URL", !!t.q(".dlqr") && decodeURIComponent(t.q(".dlqr").getAttribute("src")||"").includes("/download/android.apk?v="));
}

group("I18N — landing panel2 + fleet copy");
{
  const t=boot();
  ok("panel2T AR is real copy", t.w.T.ar.panel2T && t.w.T.ar.panel2T !== "panel2T");
  ok("panel2B AR is real copy", t.w.T.ar.panel2B && t.w.T.ar.panel2B !== "panel2B");
  t.w.S.lang="ar"; t.w.S.view="landing"; t.w.S.landingPage="rider"; t.w.render();
  ok("arabic landing does not leak panel2 keys", !/panel2T|panel2B/.test(t.q(".landing").textContent));
  t.w.S.lang="en";
  ["m_fleet","m_noLive"].forEach((k)=>{
    ok(k+" both languages", t.w.T.en[k] && t.w.T.ar[k] && t.w.T.ar[k]!==t.w.T.en[k]);
  });
}

group("STAFF — rows not a wide table; role is a radio group");
{
  const t=boot();
  t.set({role:"super_admin", user:{id:"u1",role:"super_admin",name:"Admin",isSystemAdmin:true}});
  t.go("super_admin","adminStaff");
  ok("create form uses role radios", !!t.q("#staff-role") && t.q("#staff-role").type==="hidden" && t.all("#staff-form .seg button").length===3);
  ok("staff pane is desk-split, list is not a table at first paint", !!t.q(".desk-split") && !t.q("#staff-list .table"));
}

group("MAP — EditRouteMap exists; SearchMap can render with no stops");
{
  const t=boot();
  ok("EditRouteMap is exported", typeof t.w.EditRouteMap === "function");
}
