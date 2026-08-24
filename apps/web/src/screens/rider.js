/* ══════════════════════════════════════════════════════════════════════
   6. RIDER SCREENS — auth screens live in screens/auth.js
   ══════════════════════════════════════════════════════════════════════ */
function riderHome(){                                         // R-10
  const u = S.user || {};
  const w=$("div",{class:"main"});
  w.append(Card("card--brand",
    $("div",{class:"t-micro",text:t("greeting")}),
    $("div",{class:"t-lg",text:u.name || "—"}),
    $("div",{class:"t-cap",text:t("tagline")}),
    $("div",{class:"row gap2 mt2"},
      Btn({label:t("searchRoute"), on:()=>go("routes")}),
      Btn({label:t("trips"), kind:"secondary", on:()=>go("trips")}))));
  const list = $("div",{id:"rider-home-routes"});
  w.append(list);
  loadRiderRoutesInto(list);
  return w;
}

function riderRoutes(){                                       // R-11 — searchable routes + journeys
  const w=$("div",{class:"main"});
  const list = $("div",{id:"rider-routes"});
  w.append(list);
  loadRiderRoutesInto(list);
  return w;
}

/* Search changed: filter the on-screen list in place — no full render(), so
   the input keeps its value and focus and the page never jumps. */
function riderSearchChanged(v){
  S.riderQuery = v;
  renderRiderRoutes(document.getElementById("rider-routes") || document.getElementById("rider-home-routes"));
}

async function loadRiderRoutesInto(el) {
  if (!el) return;
  try {
    // Build the Fuse index once; every keystroke only reads it.
    if (!S.riderIndex) {
      const routes = await API.publishedRoutes();
      S.riderRoutes = routes;
      S.riderIndex = buildRiderIndex(routes);
    }
    // Bookable journeys (all routes, one call) — nested under each route.
    if (!S.riderJourneys) {
      const today = new Date().toISOString().slice(0, 10);
      const week  = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const journeys = await API.upcomingJourneys(null, today, week).catch(()=>[]);
      const byRoute = {};
      (journeys || []).forEach((j)=>{ (byRoute[j.route_id] = byRoute[j.route_id] || []).push(j); });
      S.riderJourneys = byRoute;
    }
    renderRiderRoutes(el);
  } catch(e) { el.innerHTML=""; el.append(Banner("danger", errText(e.messageKey))); }
}

function renderRiderRoutes(el){
  if(!el) return;
  el.innerHTML="";
  const index = S.riderIndex || [];
  if(!index.length){ el.append(Empty("routes", t("nav.routes"), t("noRoutesPublished"))); return; }
  const ids = searchRoutes(S.riderQuery, index);
  if(!ids.length){ el.append(Empty("routes", t("searchRoute"), t("noSearchResults"))); return; }
  const byId = Object.fromEntries(index.map((e)=>[e.id, e]));
  ids.forEach((id)=>{ const entry = byId[id]; if(entry) el.append(routeResultCard(entry)); });
}

/* A route card with its bookable journeys nested under it (§ search surface:
   routes first, journeys inside). The card head goes to boarding; each
   departure chip is a fast path straight to review (first stop, best-first). */
function routeResultCard(entry){
  const { route, stops } = entry;
  const deps = (S.riderJourneys && S.riderJourneys[route.id]) || [];
  const card = $("div",{class:"routecard routecard--results"});
  card.append($("button",{class:"routecard__head", attrs:{type:"button"},
    on:{click:()=>{ S.chosenRoute = { route, stops }; S.chosenBoard = null; S.chosenDep = null; go("boarding"); }}},
    $("div",{class:"stack grow gap1"},
      $("div",{class:"routeline",text:route.name_en || route.name_ar || route.code}),
      $("div",{class:"t-cap",text:`${stops.length} ${t("stopsList")} · ${route.window_start}–${route.window_end}`})),
    $("div",{class:"stack",style:{alignItems:"flex-end"}},
      $("div",{class:"fare",text:money(route.fare_minor / 100)}),
      $("div",{class:"t-micro",text:t("fixedPrice")}))));

  // When the query matched a boarding stop, name it so the hit is visible.
  if(S.riderQuery){
    const q = normalizeText(S.riderQuery);
    const hit = stops.find((s)=> normalizeText((s.stop_name_en||"")+" "+(s.stop_name_ar||"")+" "+(s.stop_code||"")).includes(q));
    if(hit) card.append($("div",{class:"routecard__stop"},
      icon("stops"), $("span",{class:"t-cap",text:(hit.stop_name_en || hit.stop_name_ar || hit.stop_code)})));
  }

  const deprow = $("div",{class:"routecard__deps"});
  deprow.append($("span",{class:"t-micro",text:t("nextDepartures")}));
  if(!deps.length){
    deprow.append($("span",{class:"t-micro routecard__nodeps",text:t("noDeparturesShort")}));
  } else {
    deps.slice(0, 4).forEach((j)=>{
      deprow.append($("button",{class:"depchip ltr", attrs:{type:"button",
        "aria-label":t("pickDeparture")+" "+new Date(j.departs).toISOString().slice(11,16)},
        on:{click:()=>{
          S.chosenRoute = { route, stops };
          S.chosenBoard = stops[0] ? stops[0].stop_id : null;   // best-first: recommended stop
          S.chosenDep = j;
          go("review");
        }}},
        new Date(j.departs).toISOString().slice(11, 16)));
    });
    if(deps.length > 4) deprow.append($("span",{class:"t-micro",text:"+"+(deps.length - 4)}));
  }
  card.append(deprow);
  return card;
}

function riderBoarding(){                                     // R-12 — real boarding stops
  const w=$("div",{class:"main"});
  const chosen = S.chosenRoute || { route: {}, stops: [] };
  w.append($("div",{class:"stack gap1"},
    $("h1",{class:"t-head",text:chosen.route.name_en || chosen.route.name_ar || chosen.route.code || "—"}),
    $("div",{class:"t-cap",text:t("getOffAnywhere")})));
  const stops = $("div",{id:"boarding-stops"});
  w.append(stops);
  renderBoardingStops(stops, chosen.stops);
  return w;
}

function renderBoardingStops(el, stops) {
  el.innerHTML = "";
  if (!stops || !stops.length) { el.append(Empty("stops", t("whereBoard"), t("routeNoStops"))); return; }
  el.append(Section(t("whereBoard"),
    ...stops.map((s, i) => Row({
      icon: "stops",
      title: s.stop_name_en || s.stop_name_ar || s.stop_code,
      sub: `${s.stop_code} · ${t("boardHere")}`,
      right: i === 0 ? Chip({label:t("recommended"), kind:"ok"}) : null,
      bordered:true, chev:true,
      selected: S.chosenBoard === s.stop_id,
      on:()=>{ S.chosenBoard = s.stop_id; go("departures"); } }))));
}

function riderDepartures(){                                   // R-13 — real upcoming journeys
  const w=$("div",{class:"main"});
  const route = (S.chosenRoute && S.chosenRoute.route) || {};
  w.append($("div",{class:"stack gap1"},
    $("h1",{class:"t-head",text:route.name_en || route.name_ar || route.code || "—"}),
    $("div",{class:"t-cap",text:t("getOffAnywhere")})));
  const list = $("div",{id:"departures-list"});
  w.append(list);
  loadDeparturesInto(list, route.id);
  return w;
}

async function loadDeparturesInto(el, routeId) {
  if (!el) return;
  el.innerHTML = "";
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  try {
    const journeys = await API.upcomingJourneys(routeId, today, week);
    if (!journeys.length) { el.append(Empty("clock", t("pickDeparture"), t("noDepartures"))); return; }
    journeys.forEach((j) => {
      const d = new Date(j.departs);
      const time = d.toISOString().slice(11, 16);
      const day = j.service_date === today ? t("today") : j.service_date;
      el.append(Row({
        icon: "bus",
        title: $("span",{class:"ltr",text:time}),
        sub: `${day} · ${j.seats_total} ${t("seats")}`,
        right: $("div",{class:"fare",text:money((S.chosenRoute.route.fare_minor || 0) / 100)}),
        bordered:true, chev:true,
        on:()=>{ S.chosenDep = j; go("review"); } }));
    });
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

function riderReview(){                                       // R-14 — real fare + seats + book
  const w=$("div",{class:"main"});
  const route = (S.chosenRoute && S.chosenRoute.route) || {};
  const dep = S.chosenDep || {};
  const unit = (route.fare_minor || 0) / 100;
  const total = unit * S.seats;
  const stop = (S.chosenRoute && S.chosenRoute.stops || []).find((s) => s.stop_id === S.chosenBoard);
  w.append(Card("",
    $("div",{class:"pricetag ltr",text:money(total)}),
    $("div",{class:"t-micro",text:t("fixedPrice")}),
    Divider(),
    KV(route.name_en || route.name_ar || route.code || "—",
       dep.service_date ? `${dep.service_date} · ${new Date(dep.departs).toISOString().slice(11,16)}` : "—"),
    KV(t("whereBoard"), (stop && (stop.stop_name_en || stop.stop_name_ar || stop.stop_code)) || "—"),
    KV(t("seats"), `${S.seats} × ${money(unit)}`)));
  w.append($("div",{class:"row gap3"},
    $("span",{class:"grow t-lg",text:t("seats")}),
    $("div",{class:"stepper"},
      $("button",{attrs:{type:"button","aria-label":"−", disabled:S.seats<=1?true:null},
        on:{click:()=>{ if(S.seats>1){S.seats--; render();} }}},"−"),
      $("span",{text:String(S.seats)}),
      $("button",{attrs:{type:"button","aria-label":"+", disabled:S.seats>=4?true:null},
        on:{click:()=>{ if(S.seats<4){S.seats++; render();} }}},"+"))));
  w.append(Btn({label:t("confirmBooking"), block:true, dis:S.stopBusy, on:()=>confirmBookingAction()}));
  return w;
}

async function confirmBookingAction() {
  const dep = S.chosenDep;
  if (!dep || !S.chosenBoard) { toast(t("validation.failed")); return; }
  S.stopBusy = true; render();
  try {
    const booking = await API.book(dep.id, S.chosenBoard, S.seats);
    S.stopBusy = false;
    S.lastBooking = booking;
    go("booked");
  } catch(e) { S.stopBusy = false; toast(errText(e.messageKey)); render(); }
}

function riderBooked(){                                       // R-15 / R-21 — boarding code
  const cached = (S.tripsCache || []).find((x) => x.id === (S.lastBooking && S.lastBooking.id));
  const b = Object.assign({}, cached || {}, S.lastBooking || {});
  const w=$("div",{class:"main"});
  w.append($("div",{class:"hero"},
    $("div",{class:"logomark",style:{background:"var(--ok-bg)",color:"var(--ok)"}}, icon("check")),
    $("div",{class:"stack gap2 center"},
      $("h1",{class:"t-title",text:t("booked")}),
      $("div",{class:"t-cap",text:t("bookedBody")}))));
  if (b.code) {
    w.append(QRPanel({code:String(b.code)}));
    const name = S.lang === "ar" ? (b.route_name_ar || b.route_name_en) : (b.route_name_en || b.route_name_ar);
    if (name || b.departs_at) {
      w.append(Card("",
        name ? $("strong",{text:name}) : null,
        $("div",{class:"t-cap ltr",text:[b.service_date, b.departs_at].filter(Boolean).join(" · ")}),
        b.stop_name_en || b.stop_name_ar
          ? $("div",{class:"t-cap",text:t("boardHere")+" · "+(S.lang==="ar"?(b.stop_name_ar||b.stop_name_en):(b.stop_name_en||b.stop_name_ar))})
          : null));
    }
    w.append(Btn({label:t("trips"), block:true, on:()=>{S.stack=[]; go("trips");}}));
  } else {
    w.append(Empty("qr", t("booked"), t("noTripsBody")));
  }
  return w;
}

function riderWaiting(){ return comingSoonRider(); }          // R-20 (live tracking — P3.9)
function riderOnboard(){ return comingSoonRider(); }          // R-22 (live journey — P3.9)

function comingSoonRider(){
  const w=$("div",{class:"main"});
  w.append(Empty("clock", t("comingSoon"), t("bookingComingBody")));
  return w;
}

function riderTrips(){                                        // R-30 — real bookings
  const w=$("div",{class:"main"});
  const seg=$("div",{class:"seg", id:"trips-seg"});
  [["upcoming",t("upcoming")],["past",t("past")]].forEach(([k,lbl])=>
    seg.append($("button",{class:"seg__btn",attrs:{type:"button","aria-pressed":String(S.tripTab===k)},
      text:lbl, on:{click:()=>{ if(S.tripTab===k) return; S.tripTab=k; tripsSyncTabs(); tripsRenderList(); }}})));
  w.append(seg);
  const list = $("div",{id:"rider-trips"});
  w.append(list);
  loadRiderTripsInto(list);              // pass the ref: it is not in the DOM yet
  return w;
}

/* Tab switch must be SEAMLESS (§15 GUI rules: no layout shift, no lost state).
   A full render() here rebuilds the .main scroller (snapping it to the top —
   the reported "page moves" bug), refetches /bookings/mine, and drops focus.
   So the tab click only syncs aria-pressed and re-renders the list from the
   cache; the list is fetched exactly once. */
function tripsSyncTabs(){
  const seg=document.getElementById("trips-seg");
  if(!seg) return;
  [["upcoming"],["past"]].forEach(([k],i)=>{
    const b=seg.children[i];
    if(b) b.setAttribute("aria-pressed", String(k===S.tripTab));
  });
}

function tripsRenderList(el){
  el = el || document.getElementById("rider-trips");
  if(!el) return;
  el.innerHTML="";
  const bookings=S.tripsCache || [];
  const upcoming=bookings.filter((b)=> b.status!=="COMPLETED" && b.status!=="CANCELLED" && b.status!=="NO_SHOW");
  const past=bookings.filter((b)=> !upcoming.includes(b));
  const shown=S.tripTab==="upcoming" ? upcoming : past;
  if(!shown.length){ el.append(Empty("trips", t("noTrips"), t("noTripsBody"))); return; }
  shown.forEach((b)=> el.append(Row({
    icon:"bus",
    title: b.route_name_en || b.route_name_ar || "—",
    sub: `${b.service_date} · ${b.departs_at} · ${b.seats} ${t("seats")} · ${b.code}`,
    on: () => { S.lastBooking = b; go("booked"); },
    right: $("div",{class:"stack",style:{alignItems:"flex-end"}},
      $("div",{class:"fare",text:money(b.fare_minor / 100)}),
      (S.tripTab==="upcoming")
        ? Btn({label:t("cancelBooking"), kind:"ghost", on:()=>cancelRiderBooking(b.id)})
        : Chip({label:b.status, kind:b.status==="CANCELLED" ? "danger" : "ok"})),
    bordered:true })));
}

async function loadRiderTripsInto(el) {
  if (!el) return;
  try {
    const bookings = await API.myBookings();
    S.tripsCache = bookings;          // fetch once; tabs filter the cache
    tripsRenderList(el);
  } catch(e) { el.innerHTML=""; el.append(Banner("danger", errText(e.messageKey))); }
}

async function cancelRiderBooking(id) {
  try {
    await API.cancelBooking(id);
    S.tripsCache = (S.tripsCache || []).map((b)=> b.id===id ? { ...b, status:"CANCELLED" } : b);
    tripsRenderList();
    toast(t("cancelBooking"));
  } catch(e) { toast(errText(e.messageKey)); }
}

/* riderWallet moved to screens/wallet.js (Path A ownership — parallel-work split). */

function riderSafety(){                                       // R-60
  const w=$("div",{class:"main"});
  w.append(Banner("info", t("safetyCentre")));
  w.append($("div",{class:"rowgroup"},
    Row({icon:"sos",   title:t("sos"), sub:t("emergency"), chev:true, on:()=>openSheet("sos")}),
    Row({icon:"share", title:t("shareTrip"), chev:true, on:()=>toast(t("shareTrip"))}),
    Row({icon:"flag",  title:t("reportProblem"), chev:true, on:()=>openSheet("report")}),
    Row({icon:"phone", title:t("callSupport"), chev:true, on:()=>toast(t("callSupport"))})));
  return w;
}

function riderProfile(){                                      // R-80
  const u = S.user || {};
  const initials = (u.name || "?").slice(0,1).toUpperCase();
  const w=$("div",{class:"main"});
  w.append($("div",{class:"row gap3"},
    $("div",{class:"avatar avatar--lg",text:initials}),
    $("div",{class:"stack grow gap1"},
      $("strong",{class:"t-head",text:u.name || "—"}),
      $("div",{class:"t-cap ltr",text:u.phone || u.email || "—"}))));
  w.append(emailSection());
  w.append($("div",{class:"rowgroup"},
    Row({icon:"globe", title:t("language"), right:langSeg()}),
    Row({icon:"moon",  title:t("theme"),    right:themeSeg()}),
    Row({icon:"bell",  title:t("notifications"), right:switchEl(true)})));
  w.append($("div",{class:"rowgroup"},
    Row({icon:"card",  title:t("wallet"), chev:true, on:()=>go("wallet")}),
    Row({icon:"safety",title:t("safetyCentre"), chev:true, on:()=>go("safety")})));
  w.append(Btn({label:t("signOut"), kind:"secondary", block:true,
    on:()=>signOut()}));
  return w;
}

/* Email verification — real API flow: add email → code → verified. Shared by
   rider and driver profiles. Honest states, no fake success. */
function emailSection() {
  const u = S.user || {};
  const card = Card("card--tight", $("div",{class:"t-micro",text:t("verifyEmailTitle")}));
  if (u.email && u.emailVerified) {
    card.append(Row({ icon:"check", title:$("span",{class:"ltr",text:u.email}),
      right:Chip({label:t("emailVerified"), kind:"ok"}), bordered:true }));
  } else {
    if (!u.email) {
      card.append(
        $("div",{class:"field"},
          $("label",{attrs:{for:"em-addr"}, text:t("emailLabel")}),
          $("input",{class:"input ltr", attrs:{id:"em-addr", type:"email", "aria-label":t("emailLabel")}})),
        Btn({label:t("sendVerify"), block:true, on:()=>emailSend()}));
    } else {
      card.append(Row({ icon:"mail", title:$("span",{class:"ltr",text:u.email}),
        right:Chip({label:t("emailNotVerified"), kind:"warn"}), bordered:true }));
      card.append(
        $("div",{class:"field"},
          $("label",{attrs:{for:"em-code"}, text:t("codeLabel")}),
          $("input",{class:"input ltr", attrs:{id:"em-code", type:"text", "aria-label":t("codeLabel")}})),
        $("div",{class:"row gap2"},
          Btn({label:t("verifyEmailAction"), block:true, on:()=>emailVerify()}),
          Btn({label:t("emailResend"), kind:"ghost", on:()=>emailSend()})));
    }
  }
  if (S.emailToast) card.append(Banner(S.emailToastKind || "info", S.emailToast));
  return card;
}

async function emailSend() {
  const email = val("em-addr") || (S.user && S.user.email);
  if (!email) { S.emailToast = "validation.email"; S.emailToastKind = "danger"; render(); return; }
  try {
    await API.requestEmailVerification(email);
    S.emailToast = t("emailSaved"); S.emailToastKind = "ok";
    // refresh the session user so the email shows immediately
    const me = await API.me();
    if (me && me.actor && API.user()) {
      API.saveSession({ ...API.user(), email, emailVerified:false });
      S.user = API.user();
    }
    render();
  } catch(e) { S.emailToast = e.messageKey || "error.internal"; S.emailToastKind = "danger"; render(); }
}

async function emailVerify() {
  try {
    await API.verifyEmail(val("em-code"));
    S.emailToast = t("emailDone"); S.emailToastKind = "ok";
    API.saveSession({ ...API.user(), emailVerified:true });
    S.user = API.user();
    render();
  } catch(e) { S.emailToast = e.messageKey || "error.internal"; S.emailToastKind = "danger"; render(); }
}

/* shared small controls */
function langSeg(){
  const seg=$("div",{class:"seg"});
  [["en","EN"],["ar","AR"]].forEach(([k,lbl])=>
    seg.append($("button",{attrs:{type:"button","aria-pressed":String(S.lang===k)},
      text:lbl, on:{click:()=>{S.lang=k; render();}}})));
  return seg;
}
function themeSeg(){
  const seg=$("div",{class:"seg"});
  [["auto",t("themeAuto")],["light",t("themeLight")],["dark",t("themeDark")]].forEach(([k,lbl])=>
    seg.append($("button",{attrs:{type:"button","aria-pressed":String(S.theme===k),
      "aria-label":k}, text:lbl, on:{click:()=>{S.theme=k; storeSet("rs.theme",k); render();}}})));
  return seg;
}
function switchEl(on){
  return $("button",{class:"switch",attrs:{type:"button",role:"switch",
    "aria-checked":String(!!on),"aria-label":t("notifications")},
    on:{click:(e)=>{ const b=e.currentTarget;
      b.setAttribute("aria-checked", b.getAttribute("aria-checked")==="true"?"false":"true"); }}});
}
