/* ══════════════════════════════════════════════════════════════════════
   12. SHEETS
   ══════════════════════════════════════════════════════════════════════ */
const SHEETS = {
  /* Safety & support actions arrive in M4 — honest placeholders, no fake calls. */
  sos: () => sosSheet(),
  report: () => reportSheet(),
  shareRide: () => shareRideSheet(),
  decideIncident: () => decideIncidentSheet(),

  staffEdit: () => staffEdit(),
  staffRemove: () => staffRemove(),
  fieldCapture: () => fieldCaptureSheet(),
  claimSlot: () => claimSlotSheet(),
  topup: () => topupSheet(),   /* Path A (money) — wallet top-up */
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
    {k:"plan",      ic:"routes",  fn:riderPlan,       title:"j_planTitle"}, /* path B */
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
    {k:"routes",  ic:"routes",  fn:opsRoutes,  dock:true, wide:true},
    {k:"users",   ic:"users",   fn:opsUsers,   dock:true, wide:true},
    {k:"profile", ic:"profile", fn:staffProfile, dock:true, foot:true}
  ],
  manager:[
    {k:"board",     ic:"board",     fn:managerBoard,     dock:true, wide:true},
    {k:"coverage",  ic:"coverage",  fn:managerCoverage,  dock:true, wide:true},
    {k:"pricing",   ic:"pricing",   fn:managerPricing,   dock:true, wide:true},
    {k:"promos",    ic:"promos",    fn:managerPromos,    dock:true, wide:true},
    {k:"analytics", ic:"analytics", fn:managerAnalytics, dock:true, wide:true},
    {k:"profile",   ic:"profile",   fn:staffProfile,     dock:true, foot:true}
  ],
  support:[
    {k:"lookup",  ic:"lookup",  fn:supportLookup,  dock:true, wide:true},
    {k:"tickets", ic:"tickets", fn:supportTickets, dock:true, wide:true},
    {k:"lost",    ic:"lost",    fn:supportLost,    dock:true, wide:true},
    {k:"profile", ic:"profile", fn:staffProfile,   dock:true, foot:true}
  ],
  super_admin:[
    {k:"admin",      ic:"board",    fn:adminHome,     dock:true, wide:true, title:"adminArea"},
    {k:"adminStaff", ic:"users",    fn:adminStaff,    dock:true, wide:true},
    {k:"adminAudit", ic:"flag",     fn:adminAudit,    dock:true, wide:true},
    {k:"adminSettings", ic:"pricing", fn:adminSettings, dock:true, wide:true},
    {k:"queue",      ic:"queue",    fn:opsQueue,      dock:true, wide:true},
    {k:"routes",     ic:"routes",   fn:opsRoutes,     dock:true, wide:true},
    {k:"livemap",    ic:"livemap",  fn:opsLiveMap,    dock:true, wide:true}, /* path B — existing ops surface */
    {k:"tickets",    ic:"tickets",  fn:supportTickets,dock:true, wide:true}, /* path B — existing support surface */
    {k:"board",      ic:"coverage", fn:managerBoard,  dock:true, wide:true},
    {k:"profile",    ic:"profile",  fn:staffProfile,  dock:true, foot:true}
  ]
};
const DEFAULT_PAGE = Object.fromEntries(
  Object.entries(PAGES).map(([r,list])=>[r, list[0].k]));
const pagesFor = (role) => {
  const key = (typeof uiRole === "function" ? uiRole(role) : role);
  return (PAGES[key] || PAGES.rider);
};
const pageDef = () => {
  const list = pagesFor(S.role);
  return list.find(p=>p.k===S.page) || list[0];
};

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
};
function searchBand(){
  const key = (SEARCHABLE[S.role]||{})[S.page];
  if(!key) return null;
  const label = t(key)===key ? key : t(key);
  // Every band is a REAL control (§8.1 — never a dead input). The rider home
  // band navigates to the results screen; the others are live fields wired to
  // their screen's filter. A screen with no wired filter gets NO band.
  let bar=null;
  if(S.role==="rider" && S.page==="home")
    bar=SearchBar({placeholder:label, on:()=>{ S.riderQuery=""; go("routes"); }});
  else if(S.role==="rider" && S.page==="routes")
    bar=SearchBar({placeholder:label, live:true, value:S.riderQuery, onInput:riderSearchChanged});
  else if(S.role==="ops" && S.page==="stops")
    bar=SearchBar({placeholder:label, live:true, value:S.stopsQuery, onInput:stopsSearchChanged});
  if(!bar) return null;
  const def=pageDef();
  const band=$("div",{class:"searchband"+(def.wide?" searchband--wide":"")});
  band.append($("div",{class:"searchband__inner"}, bar));
  return band;
}

/* Navigation. One definition, four presentations — the CSS decides which,
   so there is no JS branch per screen size and no resize listener. */
function nav(){
  const el=$("nav",{class:"nav",attrs:{"aria-label":"Primary"}});
  el.append($("div",{class:"nav__brand"}, logoSVG(), $("span",{text:t("brand")})));

  const items=$("div",{class:"nav__items"});
  pagesFor(S.role).filter(p=>p.dock && !p.foot).forEach(p=> items.append(navItem(p)));
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
  /* One choke point for the page transition: every view change passes through here,
     so nothing a person navigates to can miss the curtain, and nothing else (a field
     re-render, a tick, a sheet) can put one up. */
  if (typeof PageFx !== "undefined" && PageFx.armed(PageFx.routeKey(S), render)) return;
  try { renderUnsafe(); }
  catch (err) {
    const root=document.getElementById("root");
    if (root) {
      root.innerHTML="";
      root.append($("div",{class:"main"},
        Banner("danger", t("error.internal")),
        Btn({label:t("signOut"), kind:"secondary", on:()=>signOut()})));
    }
    try { console.error(err); } catch (_) { /* no console */ }
  }
}
function renderUnsafe(){
  document.documentElement.lang = S.lang;
  document.documentElement.dir  = S.lang==="ar" ? "rtl" : "ltr";
  // One source of truth: the pre-paint script sets <html data-theme>, so
  // render() must update <html> too — if only <body> is set, the stale <html>
  // attribute wins and the theme toggle "does nothing" (reported bug).
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  const native = typeof Platform !== "undefined" && Platform.kind && Platform.kind() === "native";
  document.documentElement.classList.toggle("native", !!native);
  document.body.classList.toggle("native", !!native);
  if (native && typeof Platform.applyChrome === "function") Platform.applyChrome(theme);

  const root=document.getElementById("root");
  /* One teardown point for the landing's scroll machinery: whatever the next
     view is, the previous render's observer and rAF loop are already gone. */
  if (typeof teardownLanding === "function") teardownLanding();
  root.innerHTML="";

  /* view machine: boot splash → landing → auth → the signed-in app */
  if(S.view==="boot"){ root.append(bootSplash()); return; }
  const appSurface = typeof isAppSurface === "function" ? isAppSurface() : false;
  if(S.view==="intro"){
    if (!appSurface) { guestHome(); }
    else { root.append(introView()); return; }
  }
  if(appSurface && !S.authed){
    if (S.view === "intro") { root.append(introView()); return; }
    if (S.view !== "auth") { S.view = "auth"; S.authMode = S.authMode || "signin"; }
    root.append(auth()); return;
  }
  if(S.view==="landing"){ root.append(landing()); return; }
  if(S.view==="auth"){ root.append(auth()); return; }
  if(!S.authed){ guestHome(); if (S.view==="intro") { root.append(introView()); return; } if (S.view==="auth") { root.append(auth()); return; } S.view="landing"; root.append(landing()); return; }

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
/* The viewport, measured, in CSS pixels. A unit that a phone changes under the page
   (or that a browser zoom counts twice) cannot promise a masthead that is exactly one
   screen tall; a number read off the window can. It is published as `--view-h` and the
   sheet consumes it: the hero, the intro, and the map band the claims now sit under. */
function measureViewport() {
  const set = () => {
    const vv = typeof window !== "undefined" && window.visualViewport;
    const h = Math.round((vv && vv.height) || (typeof window !== "undefined" && window.innerHeight) || 0);
    if (h > 0) document.documentElement.style.setProperty("--view-h", h + "px");
  };
  set();
  if (typeof window === "undefined") return;
  window.addEventListener("resize", set);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", set);
}

function boot(){
  S.view="boot"; render();
  measureViewport();
  loadMapsConfig();                             // fire-and-forget, never blocks boot
  flushFieldQueue();                            // field captures saved offline upload now
  if (typeof flushDriverOutbox === "function") flushDriverOutbox();
  const minDelay = new Promise(r=>setTimeout(r, 1500));
  /* The splash leaves when the page has actually loaded — never before, however
     short the minimum is — so the first thing under the curtain is a painted app. */
  const loaded = typeof document !== "undefined" && document.readyState === "complete"
    ? Promise.resolve()
    : new Promise(r => (typeof window !== "undefined"
        ? window.addEventListener("load", () => r(), { once: true }) : r()));
  const session = (typeof fetch === "function" ? resolveSession() : Promise.resolve(API.user()))
    .catch(()=>null);
  Promise.all([minDelay, session, loaded]).then(([, user])=>{
    if(S.view!=="boot") return;                 // a test or a tap already left
    const swap = () => {
      if (user) { enterApp(user); }
      else { guestHome(); render(); }
    };
    PageFx.handoff(swap);          // the same curtain as every page
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
    const provider = (cfg && cfg.maps && cfg.maps.provider) || "osm"; // DEC-198: OSM default
    if (provider === "google" && cfg && cfg.maps && cfg.maps.apiKey) {
      const s = document.createElement("script");
      s.src = "https://maps.googleapis.com/maps/api/js?key=" + cfg.maps.apiKey + "&loading=async";
      s.async = true;
      s.onload = () => { window.__rsMapsOn = true; render(); };
      s.onerror = () => {};
      document.head.appendChild(s);
    } else if (provider !== "google") {
      // OpenStreetMap via Leaflet — free, no key, no login (DEC-198).
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.async = true;
      s.onload = () => { window.__rsMapsOn = true; render(); };
      s.onerror = () => {};
      document.head.appendChild(s);
    }
    window.__rsMapsConfigured = true;
  } catch { /* no backend yet → illustration stays */ }
}

try {
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (S.theme === "auto") render();
    });
  }
} catch (_) { /* old WebView */ }

document.addEventListener("keydown", e=>{ if(e.key==="Escape" && S.sheet) closeSheet(); });
window.addEventListener("online", ()=>{
  flushFieldQueue();
  if (typeof flushDriverOutbox === "function") flushDriverOutbox();
});

/* Explicit surface for the verification suite. Declared with const above,
   which does not attach to window in a classic script. */
window.addEventListener("focus", () => {
  if (!S.authed || typeof API === "undefined" || typeof API.me !== "function") return;
  API.me().then((me) => {
    if (!me || !me.actor) return;
    const next = typeof uiRole === "function" ? uiRole(me.actor.role) : me.actor.role;
    if (S.user) {
      S.user.role = me.actor.role;
      try { storeSet("rs.user", JSON.stringify(S.user)); } catch (_) { /* */ }
    }
    if (next !== S.role) enterApp(S.user);
  }).catch(() => {});
});

Object.assign(window, { S, T, BRAND, PAGES, DEFAULT_PAGE, render, go, back,
                        uiRole, pagesFor, guestHome, introSeen, markIntroSeen, introView, apkDownloadUrl,
                        openSheet, closeSheet, SHEETS, resolvedTheme,
                        enterApp, signOut, boot, API,
                        errText, OtpInput, otpValue,
                        setResendUntil, setLockedUntil, cooldownButton,
                        flushFieldQueue, flushDriverOutbox, queueOrSend, Outbox,
                        normalizeText, buildRiderIndex, searchRoutes, matchesQuery });

boot();
