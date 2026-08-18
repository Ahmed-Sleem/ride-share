/* ══════════════════════════════════════════════════════════════════════
   12. SHEETS
   ══════════════════════════════════════════════════════════════════════ */
const SHEETS = {
  qr: () => Sheet(t("boardingCode"),
    $("div",{class:"t-cap",text:`${DATA.ticket.route} · ${DATA.ticket.boarding} · ${DATA.ticket.time}`}),
    QRPanel({code:DATA.ticket.code}),
    $("div",{class:"t-cap",text:`${t("seats")}: ${DATA.ticket.seats} · ${money(DATA.ticket.fare)}`})),

  sos: () => Sheet(t("sos"),
    Banner("danger", t("sos")),
    $("div",{class:"t-cap",text:"Choose what you need. Operations sees this immediately."}),
    Btn({label:"Call emergency services", kind:"danger", block:true, icon:"phone",
         on:()=>{closeSheet(); toast("Calling");}}),
    Btn({label:t("callSupport"), kind:"secondary", block:true, icon:"phone",
         on:()=>{closeSheet(); toast(t("callSupport"));}}),
    Btn({label:t("shareTrip"), kind:"secondary", block:true, icon:"share",
         on:()=>{closeSheet(); toast(t("shareTrip"));}})),

  report: () => Sheet(t("reportProblem"),
    ...["Driver behaviour","Vehicle condition","Route or timing","Payment","Something else"]
      .map(r=> Row({title:r, chev:true, on:()=>{closeSheet(); toast(t("submit"));}}))),

  contacts: () => Sheet(t("emergency"),
    Row({icon:"profile", title:"Hana", sub:"+20 100 000 0001", bordered:true}),
    Row({icon:"profile", title:"Karim", sub:"+20 100 000 0002", bordered:true}),
    Btn({label:"Add contact", icon:"plus", block:true, on:()=>{closeSheet(); toast("Added");}})),

  topup: () => Sheet(t("addMoney"),
    $("div",{class:"row wrap gap2"},
      ...[["mint",50],["lime",100],["sky",200],["pink",500]].map(([k,v])=>
        Chip({label:money(v), kind:k, on:()=>{}}))),
    $("div",{class:"field"},
      $("label",{text:t("addMoney")}),
      $("input",{class:"input ltr",attrs:{type:"number",placeholder:"100"}})),
    Row({icon:"card", title:"Card ending 4821", chev:true, bordered:true}),
    Btn({label:t("continue"), block:true, on:()=>{closeSheet(); toast(t("addMoney"));}})),

  subs: () => Sheet(t("subs"),
    $("div",{class:"t-cap",text:t("subsBody")}),
    ...DATA.subs.map(s=> Row({
      icon:"trips", title:L(s), sub:`${t("save")||"Save"} ${money(s.save)} / ${s.per}`,
      right:$("div",{class:"fare",text:money(s.price)}), bordered:true, chev:true,
      on:()=>{closeSheet(); toast(t("buySub"));}}))),

  trip: () => Sheet(t("trips"),
    Card("card--tight",
      KV("Route", DATA.ticket.route),
      KV("Boarding", DATA.ticket.boarding),
      KV("Departure", DATA.ticket.time),
      KV("Fare", money(DATA.ticket.fare))),
    Btn({label:t("showQr"), icon:"qr", block:true, on:()=>openSheet("qr")}),
    Btn({label:t("reportProblem"), kind:"secondary", block:true, on:()=>openSheet("report")})),

  claim: () => Sheet(t("claimSlot"),
    $("div",{class:"stack center gap3"},
      $("div",{class:"logomark",style:{background:"var(--ok-bg)",color:"var(--ok)"}}, icon("check")),
      $("h2",{class:"t-head",text:t("claimed")}),
      $("div",{class:"t-cap",text:"07:15 · "+L(DATA.routes[0])})),
    Btn({label:"OK", block:true, driver:true, on:()=>{closeSheet(); toast(t("claimed"));}})),

  scan: () => Sheet(t("scan"),
    $("div",{class:"mapbox",style:{height:"200px",display:"grid",placeItems:"center",
      background:"var(--bg-inset)"}},
      $("div",{class:"stack center gap3"}, icon("qr"),
        $("div",{class:"t-cap",text:"Camera viewfinder"}))),
    $("div",{class:"field"},
      $("label",{text:t("boardingCode")}),
      $("input",{class:"input ltr",attrs:{placeholder:"4 8 2 9 1 7",inputmode:"numeric"}})),
    Btn({label:t("cashCollected"), kind:"secondary", block:true, driver:true,
         on:()=>{closeSheet(); toast(t("cashCollected"));}})),

  fare: () => Sheet("Edit fare",
    Banner("info","Price is locked for anyone who already booked."),
    $("div",{class:"field"}, $("label",{text:"Stop fare"}),
      $("input",{class:"input ltr",attrs:{type:"number",value:"15"}})),
    $("div",{class:"field"}, $("label",{text:"Street fare"}),
      $("input",{class:"input ltr",attrs:{type:"number",value:"20"}})),
    $("div",{class:"field"}, $("label",{text:t("reason")}),
      $("textarea",{class:"input",attrs:{placeholder:t("reason")}})),
    Btn({label:t("save"), block:true, on:()=>{closeSheet(); toast(t("save"));}}))
};

/* ══════════════════════════════════════════════════════════════════════
   13. NAVIGATION — one table. Add a screen here and it exists everywhere.
   Each entry: page key, icon, screen function, title, and whether the
   dock shows it. Nothing about navigation is defined anywhere else.
   ══════════════════════════════════════════════════════════════════════ */
const PAGES = {
  rider:[
    {k:"home",      ic:"home",    fn:riderHome,       dock:true},
    {k:"trips",     ic:"trips",   fn:riderTrips,      dock:true},
    {k:"wallet",    ic:"wallet",  fn:riderWallet,     dock:true},
    {k:"safety",    ic:"safety",  fn:riderSafety,     dock:true},
    {k:"profile",   ic:"profile", fn:riderProfile,    dock:true, foot:true},
    {k:"routes",    ic:"routes",  fn:riderRoutes,     title:"searchRoute"},
    {k:"boarding",  ic:"stops",   fn:riderBoarding,   title:"whereBoard"},
    {k:"departures",ic:"clock",   fn:riderDepartures, title:"pickDeparture"},
    {k:"review",    ic:"check",   fn:riderReview,     title:"confirmBooking"},
    {k:"booked",    ic:"check",   fn:riderBooked,     title:"booked"},
    {k:"waiting",   ic:"bus",     fn:riderWaiting,    title:"yourRide"},
    {k:"onboard",   ic:"bus",     fn:riderOnboard,    title:"yourRide"}
  ],
  driver:[
    {k:"duty",     ic:"duty",     fn:driverDuty,      dock:true},
    {k:"work",     ic:"work",     fn:driverWork,      dock:true},
    {k:"journey",  ic:"journey",  fn:driverJourney,   dock:true},
    {k:"earnings", ic:"earnings", fn:driverEarnings,  dock:true},
    {k:"profile",  ic:"profile",  fn:driverProfile,   dock:true, foot:true}
  ],
  ops:[
    {k:"queue",   ic:"queue",   fn:opsQueue,   dock:true, wide:true},
    {k:"livemap", ic:"livemap", fn:opsLiveMap, dock:true, wide:true},
    {k:"stops",   ic:"stops",   fn:opsStops,   dock:true, wide:true},
    {k:"routes",  ic:"routes",  fn:opsRoutes,  dock:true, wide:true},
    {k:"users",   ic:"users",   fn:opsUsers,   dock:true, wide:true}
  ],
  manager:[
    {k:"board",     ic:"board",     fn:managerBoard,     dock:true, wide:true},
    {k:"coverage",  ic:"coverage",  fn:managerCoverage,  dock:true, wide:true},
    {k:"pricing",   ic:"pricing",   fn:managerPricing,   dock:true, wide:true},
    {k:"promos",    ic:"promos",    fn:managerPromos,    dock:true, wide:true},
    {k:"analytics", ic:"analytics", fn:managerAnalytics, dock:true, wide:true}
  ],
  support:[
    {k:"lookup",  ic:"lookup",  fn:supportLookup,  dock:true, wide:true},
    {k:"tickets", ic:"tickets", fn:supportTickets, dock:true, wide:true},
    {k:"lost",    ic:"lost",    fn:supportLost,    dock:true, wide:true}
  ],
  super_admin:[
    {k:"admin",      ic:"board",    fn:adminHome,     dock:true, wide:true},
    {k:"adminStaff", ic:"users",    fn:adminStaff,    dock:true, wide:true},
    {k:"adminAudit", ic:"flag",     fn:adminAudit,    dock:true, wide:true},
    {k:"queue",      ic:"queue",    fn:opsQueue,      dock:true, wide:true},
    {k:"board",      ic:"coverage", fn:managerBoard,  dock:true, wide:true},
    {k:"profile",    ic:"profile",  fn:riderProfile,  dock:true, foot:true}
  ]
};
const DEFAULT_PAGE = Object.fromEntries(
  Object.entries(PAGES).map(([r,list])=>[r, list[0].k]));
const pageDef = () => PAGES[S.role].find(p=>p.k===S.page) || PAGES[S.role][0];

/* ══════════════════════════════════════════════════════════════════════
   14. CHROME
   ══════════════════════════════════════════════════════════════════════ */
function topbar({title, back:onBack, right, plain}){
  const bar=$("header",{class:"topbar"+(plain?" topbar--plain":"")});
  if(onBack) bar.append(IconBtn({name:"back", label:t("cancel"), on:onBack, flip:true}));
  bar.append($("h1",{class:"topbar__title",text:title||""}));
  if(right) bar.append(right);
  return bar;
}

/* Search band — the first element of the page, inside the scroller, so it
   scrolls with the content. Present on the screens where finding a route or a
   record is the primary job. */
const SEARCHABLE = {
  rider:  {home:"searchHint", routes:"searchRoute"},
  ops:    {stops:"searchRoute", users:"Name, phone or ID"},
  support:{lookup:"Phone or booking reference"}
};
function searchBand(){
  const key = (SEARCHABLE[S.role]||{})[S.page];
  if(!key) return null;
  const label = t(key)===key ? key : t(key);
  const def=pageDef();
  const band=$("div",{class:"searchband"+(def.wide?" searchband--wide":"")});
  const inner=$("div",{class:"searchband__inner"});
  // On the rider home the search navigates to the list; elsewhere it filters
  // the list already on screen, so it is a real field.
  inner.append(S.role==="rider" && S.page==="home"
    ? SearchBar({placeholder:label, on:()=>go("routes")})
    : SearchBar({placeholder:label, live:true}));
  band.append(inner);
  return band;
}

/* Navigation. One definition, four presentations — the CSS decides which,
   so there is no JS branch per screen size and no resize listener. */
function nav(){
  const el=$("nav",{class:"nav",attrs:{"aria-label":"Primary"}});
  el.append($("div",{class:"nav__brand"}, logoSVG(), $("span",{text:t("brand")})));

  const items=$("div",{class:"nav__items"});
  PAGES[S.role].filter(p=>p.dock && !p.foot).forEach(p=> items.append(navItem(p)));
  el.append(items);

  // Rail footer: profile pinned to the bottom on medium and up. On compact
  // the same item sits inline in the bottom bar — one component either way.
  // The collapse control sits above the footer so the footer stays last.
  el.append(railToggle());
  const foot=PAGES[S.role].filter(p=>p.foot);
  if(foot.length){
    const f=$("div",{class:"nav__foot"});
    foot.forEach(p=> f.append(navItem(p)));
    el.append(f);
    // compact: the footer is hidden by CSS, so the item must also be in the bar
    foot.forEach(p=> items.append(navItem(p, "compact-only")));
  }
  return el;
}
function railToggle(){
  const collapsed = S.rail==="collapsed";
  return $("button",{class:"rail-toggle",
    attrs:{type:"button", "aria-pressed":String(collapsed),
      "aria-label": collapsed ? t("expandMenu") : t("collapseMenu")},
    on:{click:()=>{ S.rail = collapsed ? "open" : "collapsed";
                    storeSet("rs.rail", S.rail); render(); }}},
    icon(collapsed ? "fwd" : "back"));
}
function navItem(p, extra){
  const label=t("nav."+p.k);
  return $("button",{class:"navitem"+(extra?" "+extra:""),
    attrs:{type:"button","aria-label":label,
      "aria-current":S.page===p.k?"page":null,
      title: S.rail==="collapsed" && extra!=="compact-only" ? label : null},
    on:{click:()=>{ S.stack=[]; S.page=p.k; S.sheet=null; S.opsView=null; render(); }}},
    $("span",{class:"navitem__ico"}, icon(p.ic)),
    $("span",{class:"navitem__label",text:label}));
}

/* ══════════════════════════════════════════════════════════════════════
   15. RENDER
   ══════════════════════════════════════════════════════════════════════ */
function render(){
  document.documentElement.lang = S.lang;
  document.documentElement.dir  = S.lang==="ar" ? "rtl" : "ltr";
  // One source of truth: the pre-paint script sets <html data-theme>, so
  // render() must update <html> too — if only <body> is set, the stale <html>
  // attribute wins and the theme toggle "does nothing" (reported bug).
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;

  const root=document.getElementById("root");
  root.innerHTML="";

  /* view machine: boot splash → landing → auth → the signed-in app */
  if(S.view==="boot"){ root.append(bootSplash()); return; }
  if(S.view==="landing"){ root.append(landing()); return; }
  if(S.view==="auth"){ root.append(auth()); return; }
  if(!S.authed){ S.view="landing"; root.append(landing()); return; }

  const app=$("div",{class:"app"+(S.rail==="collapsed" ? " rail-collapsed" : "")});

  const def=pageDef();
  const col=$("div",{class:"appcol"});
  const isRoot = def.dock === true;

  col.append(topbar({
    title: def.title ? t(def.title) : t("nav."+def.k),
    back: isRoot ? null : back,
    right: isRoot ? headerActions() : null
  }));
  /* Every screen returns a .main. The reading-width wrapper is applied here,
     once, rather than in each of the thirty screen functions. Staff tables
     opt out of the cap because wide data needs the room. The search band is
     the first element inside the scroller, so it scrolls with the page. */
  const body=def.fn();
  if(body.classList.contains("main")){
    const inner=$("div",{class:"main__inner"});
    while(body.firstChild) inner.append(body.firstChild);
    body.append(inner);
    if(def.wide) body.classList.add("main--wide");
    const band=searchBand();
    if(band) body.prepend(band);
  }
  col.append(body);

  app.append(nav());
  app.append(col);

  if(S.sheet && SHEETS[S.sheet]){
    app.append($("div",{class:"scrim",on:{click:closeSheet}}));
    app.append(SHEETS[S.sheet]());
  }
  if(S.toast) app.append($("div",{class:"toast",attrs:{role:"status"}},
    icon("check"), $("span",{text:S.toast})));

  root.append(app);
}

/* Header actions. The identity chip shows WHO is signed in (role comes from
   the session, never a switcher — §8). Sign-out and the theme toggle are the
   only other actions. The demo role switcher is gone. */
function headerActions(){
  const wrap=$("div",{class:"row gap2"});
  if(S.user)
    wrap.append($("button",{class:"chip chip--accent", attrs:{type:"button",
      "aria-label":t("signedInAs")},
      on:{click:()=>go("profile")}},
      icon("profile"),
      $("span",{text: S.user.name || t("roleLabel."+(S.user.role||"rider"))})));
  wrap.append(themeToggle());
  wrap.append(IconBtn({name:"signout", label:t("signOut"), on:()=>signOut()}));
  return wrap;
}

/* Quick theme toggle in the top bar: flips to the opposite of the resolved
   theme (an "auto" preference is replaced by the explicit choice). The full
   three-way control lives in Profile. */
function themeToggle(){
  const dark = resolvedTheme()==="dark";
  return IconBtn({name: dark ? "sun" : "moon",
    label: dark ? t("switchLight") : t("switchDark"),
    on:()=>{ S.theme = dark ? "light" : "dark";
             storeSet("rs.theme", S.theme); render(); }});
}

/* Boot splash — the bouncy logo shown while the session resolves. The bounce
   is decorative and collapses under prefers-reduced-motion. */
function bootSplash(){
  return $("div",{class:"splash", attrs:{"aria-label":t("brand")}},
    $("div",{class:"splash__logo"}, logoSVG()),
    $("div",{class:"splash__name",text:t("brand")}));
}

/* Boot: show the splash, resolve any stored session, then land. The minimum
   splash time is long enough to feel intentional, not long enough to fake. */
function boot(){
  S.view="boot"; render();
  loadMapsConfig();                             // fire-and-forget, never blocks boot
  const minDelay = new Promise(r=>setTimeout(r, 1500));
  const session = (typeof fetch === "function" ? resolveSession() : Promise.resolve(API.user()))
    .catch(()=>null);
  Promise.all([minDelay, session]).then(([, user])=>{
    if(S.view!=="boot") return;                 // a test or a tap already left
    if(user){ enterApp(user); } else { S.view="landing"; render(); }
  });
}

/* Google Maps, key-gated and honest: fetch the client-safe key from the web
   server's /v1/config (never embedded in the bundle) and load the SDK. With
   no key the labelled illustration stays. */
async function loadMapsConfig(){
  if (typeof fetch !== "function" || window.__rsMapsConfigured) return;
  if (location.protocol === "file:") return; // no network on file:// previews
  try {
    const cfg = await API.getConfig();
    if (cfg && cfg.maps && cfg.maps.apiKey) {
      const s = document.createElement("script");
      s.src = "https://maps.googleapis.com/maps/api/js?key=" + cfg.maps.apiKey + "&loading=async";
      s.async = true;
      s.onload = () => { window.__rsMapsOn = true; render(); };
      s.onerror = () => {};
      document.head.appendChild(s);
    }
    window.__rsMapsConfigured = true;
  } catch { /* no backend yet → illustration stays */ }
}

document.addEventListener("keydown", e=>{ if(e.key==="Escape" && S.sheet) closeSheet(); });

/* Explicit surface for the verification suite. Declared with const above,
   which does not attach to window in a classic script. */
Object.assign(window, { S, DATA, T, PAGES, DEFAULT_PAGE, render, go, back,
                        openSheet, closeSheet, SHEETS, resolvedTheme,
                        enterApp, signOut, boot, API,
                        errText, OtpInput, otpValue,
                        setResendUntil, setLockedUntil });

boot();
