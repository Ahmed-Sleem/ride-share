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
      Btn({label:t("j_planAction"), kind:"secondary", on:()=>go("plan")}),
      Btn({label:t("trips"), kind:"secondary", on:()=>go("trips")}))));
  const list = $("div",{id:"rider-home-routes"});
  w.append(list);
  loadRiderRoutesInto(list);
  return w;
}

function riderPlan(){                                         // DEC-199/206 — Path A owns the planner search UX
  /* RouteMap/planner (Path A, DEC-206): the stop-picker input moved to the
     Uber-style typeahead + map screen in screens/planner.js. The engine
     (planJourneys), cards and helpers below stay THE one implementation. */
  return plannerSearchScreen();
}

function stopLabel(s){
  if(!s) return t("j_pickStop");
  return s.stop_name_en || s.stop_name_ar || s.stop_code || t("j_pickStop");
}

async function ensureRiderIndex(){
  if (S.riderIndex) return;
  const routes = await API.publishedRoutes();
  S.riderRoutes = routes;
  S.riderIndex = buildRiderIndex(routes);
}

function loadRiderPlan(el){
  if(!el) return;
  renderRiderPlan(el);
  ensureRiderIndex().then(()=> { if(el.isConnected) renderRiderPlan(el); }).catch((e)=>{
    if(!el.isConnected) return;
    el.append(Banner("danger", errText(e.messageKey)));
  });
}

function renderRiderPlan(el){
  if(!el) return;
  el.innerHTML="";
  const stops = collectPlannerStops(S.riderIndex || []);
  el.append(planPickField("from", t("j_from"), S.planFrom, S.planFromQ, (v)=>{ S.planFromQ=v; renderRiderPlan(el); }));
  el.append(planPickField("to", t("j_to"), S.planTo, S.planToQ, (v)=>{ S.planToQ=v; renderRiderPlan(el); }));
  if(S.planFocus){
    const q = S.planFocus === "from" ? S.planFromQ : S.planToQ;
    const hits = searchPlannerStops(q, stops).slice(0, 12);
    if(!hits.length) el.append(Empty("stops", t("j_pickStop"), t("noSearchResults")));
    else el.append(Section(t("j_pickStop"), ...hits.map((s)=> Row({
      icon:"stops",
      title: stopLabel(s),
      sub: s.stop_code || "",
      bordered:true,
      on:()=>{
        if(S.planFocus==="from"){ S.planFrom=s; S.planFromQ=stopLabel(s); }
        else { S.planTo=s; S.planToQ=stopLabel(s); }
        S.planFocus=null;
        renderRiderPlan(el);
      }
    }))));
    return;
  }
  if(!S.planFrom || !S.planTo){
    el.append(Empty("routes", t("j_planTitle"), t("j_planNeedBoth")));
    return;
  }
  if(S.planFrom.stop_id === S.planTo.stop_id){
    el.append(Empty("stops", t("j_planTitle"), t("j_planSame")));
    return;
  }
  const plans = planJourneys(S.planFrom, S.planTo, S.riderIndex || []);
  if(!plans.length){
    el.append(Empty("routes", t("j_planTitle"), t("j_noPlan")));
    return;
  }
  plans.forEach((p, i)=> el.append(planResultCard(p, i===0)));
}

function planPickField(which, label, chosen, query, onInput){
  return $("div",{class:"field"},
    $("label",{attrs:{for:"plan-"+which}, text:label}),
    $("input",{class:"input", attrs:{id:"plan-"+which, type:"search",
      value: query || (chosen ? stopLabel(chosen) : ""),
      "aria-label":label, autocomplete:"off"},
      on:{focus:()=>{ S.planFocus=which; },
          input:(e)=>{ S.planFocus=which; onInput(e.target.value); }}}));
}

function planResultCard(p, recommended){
  const card=$("div",{class:"routecard routecard--results"});
  const name = p.kind==="single"
    ? (p.route.name_en || p.route.name_ar || p.route.code)
    : t("j_mix");
  const walkBits = [t("j_walkBoard")+" "+formatWalkMeters(p.walkBoard)+" "+t("walk")];
  if(p.kind==="mix") walkBits.push(t("j_transfer")+" "+formatWalkMeters(p.walkTransfer)+" "+t("walk"));
  walkBits.push(t("j_walkAlight")+" "+formatWalkMeters(p.walkAlight)+" "+t("walk"));
  card.append($("button",{class:"routecard__head", attrs:{type:"button"},
    on:{click:()=>applyPlan(p)}},
    $("div",{class:"stack grow gap1"},
      $("div",{class:"routeline",text:name}),
      $("div",{class:"t-cap",text:walkBits.join(" · ")})),
    $("div",{class:"stack",style:{alignItems:"flex-end"}},
      $("div",{class:"fare",text:money((p.fareMinor||0)/100)}),
      recommended ? Chip({label:t("recommended"), kind:"ok"}) : $("div",{class:"t-micro",text:p.kind==="mix"?t("j_mix"):t("j_single")}))));
  if(p.kind==="mix"){
    p.legs.forEach((leg, n)=>{
      card.append($("div",{class:"routecard__stop"},
        icon("bus"),
        $("span",{class:"t-cap",text:(n+1)+". "+(leg.route.name_en||leg.route.code)+" · "+t("boardHere")+" "+stopLabel(leg.board)})));
    });
  } else {
    card.append($("div",{class:"routecard__stop"},
      icon("stops"),
      $("span",{class:"t-cap",text:t("boardHere")+" · "+stopLabel(p.board)})));
  }
  return card;
}

function applyPlan(p){
  if(p.kind==="single"){
    S.chosenRoute = { route:p.route, stops:p.stops };
    S.chosenBoard = p.board.stop_id;
    S.chosenDep = null;
    go("departures");
    return;
  }
  const first = p.legs[0];
  S.chosenRoute = { route:first.route, stops:first.stops };
  S.chosenBoard = first.board.stop_id;
  S.chosenDep = null;
  go("departures");
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
  /* RouteMap (DEC-205 Path A): the route line + numbered stops, the chosen
     boarding stop highlighted once picked — live context above the list. */
  if ((chosen.stops||[]).length >= 2) {
    w.append(RouteMap({ stops: chosen.stops, highlightStopId: S.chosenBoard, h: 200, title: t("m_routeAria") }));
  }
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
  /* RouteMap (DEC-205 Path A): the line with THIS boarding stop highlighted. */
  if ((S.chosenRoute && S.chosenRoute.stops || []).length >= 2) {
    w.append(RouteMap({ stops: S.chosenRoute.stops, highlightStopId: S.chosenBoard, h: 180, title: t("m_boardingHere") }));
  }
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
    scheduleLeaveAlarm(booking);
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

function riderWaiting(){                                      // R-20
  return riderLiveScreen("waiting");
}
function riderOnboard(){                                      // R-22
  return riderLiveScreen("onboard");
}

function riderLiveScreen(mode) {
  const w=$("div",{class:"main"});
  const box=$("div",{id:"rider-live"});
  w.append(box);
  loadRiderLive(box, mode);
  return w;
}

async function loadRiderLive(el, mode) {
  if (!el) return;
  if (S._liveTimer) { clearTimeout(S._liveTimer); S._liveTimer = null; }
  el.innerHTML = "";
  const b = S.lastBooking || (S.tripsCache || []).find((x) => x.status === "ON_BOARD" || x.status === "CONFIRMED" || x.status === "RESERVED");
  if (!b || !b.id) { el.append(Empty("clock", t("j_waiting"), t("noTripsBody"))); return; }
  let delay = 15000;
  const paint = async () => {
    if (!el.isConnected) return;
    if (typeof document !== "undefined" && document.hidden) {
      S._liveTimer = setTimeout(paint, delay);
      return;
    }
    try {
      const live = await API.bookingLive(b.id);
      if (!el.isConnected) return;
      el.innerHTML = "";
      if (live.code) el.append(QRPanel({code:String(live.code)}));
      if (live.arriving) el.append(Banner("ok", t("j_arriving")));
      else el.append(Banner("info", t("j_waiting")+" · "+(live.status||"")));
      if (live.stale) el.append(Banner("warn", t("j_posStale")));
      if (live.stop) {
        const nm = S.lang==="ar" ? live.stop.nameAr : live.stop.nameEn;
        el.append(Card("", $("div",{class:"t-micro",text:t("nextStop")}), $("strong",{text:nm})));
      }
      if (mode === "onboard" || live.bookingStatus === "ON_BOARD") {
        el.append(Btn({label:t("imGettingOff"), block:true, on:async()=>{
          try { await API.requestAlight(b.id); toast(t("j_alightOk")); }
          catch(e){ toast(errText(e.messageKey)); }
        }}));
      }
      el.append(Btn({label:t("sos"), kind:"danger", block:true, on:()=>openSheet("sos")}));
      delay = 15000;
    } catch (e) {
      if (!el.isConnected) return;
      el.innerHTML = "";
      el.append(Banner("danger", errText(e.messageKey)));
      delay = Math.min(delay * 2, 60000);
    }
    S._liveTimer = setTimeout(paint, delay);
  };
  paint();
}

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
  w.append(Banner("info", t("j_safetyHint")));
  w.append($("div",{class:"rowgroup"},
    Row({icon:"sos",   title:t("sos"), sub:t("j_sosSub"), chev:true, on:()=>openSheet("sos")}),
    (S.lastBooking || (S.tripsCache||[]).some((b)=>b.status==="CONFIRMED"||b.status==="ON_BOARD"||b.status==="RESERVED"))
      ? Row({icon:"share", title:t("shareTrip"), sub:t("j_shareSub"), chev:true, on:()=>openSheet("shareRide")})
      : null,
    Row({icon:"flag",  title:t("reportProblem"), sub:t("j_reportSub"), chev:true, on:()=>openSheet("report")})));
  const mine=$("div",{id:"safety-tickets"});
  w.append($("h2",{class:"t-head",text:t("j_myTickets")}));
  w.append(mine);
  loadMyIncidents(mine);
  return w;
}

async function loadMyIncidents(el){
  if(!el) return;
  el.innerHTML="";
  try {
    const rows = await API.myIncidents();
    if(!rows.length){ el.append(Empty("flag", t("j_myTickets"), t("j_noTickets"))); return; }
    rows.forEach((r)=> el.append(Row({
      icon: r.kind==="sos" ? "sos" : "flag",
      title: t("j_cat_"+r.category) === "j_cat_"+r.category ? r.category : t("j_cat_"+r.category),
      sub: `${r.status} · ${r.severity}` + (r.decision ? " · "+r.decision : ""),
      bordered:true })));
  } catch(e){ el.append(Banner("danger", errText(e.messageKey))); }
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

function activeBookingId(){
  const b = S.lastBooking || (S.tripsCache || []).find((x)=> x.status==="ON_BOARD" || x.status==="CONFIRMED" || x.status==="RESERVED");
  return b && b.id;
}

function sosSheet(){
  return Sheet(t("sos"),
    Banner("danger", t("j_sosWarn")),
    $("label",{class:"rowitem rowitem--bordered"},
      $("input",{attrs:{type:"checkbox", id:"sos-silent", "aria-label":t("j_sosSilent")}}),
      $("span",{class:"grow",text:t("j_sosSilent")})),
    Btn({label:t("j_sosSend"), kind:"danger", block:true, on:()=>sendSos()}));
}

async function sendSos(){
  const silent = !!(document.getElementById("sos-silent") && document.getElementById("sos-silent").checked);
  const bookingId = activeBookingId();
  const body = { silent, bookingId: bookingId || undefined };
  const pos = await Platform.getPosition({ enableHighAccuracy:true, timeout:4000, maximumAge:15000 });
  if (pos) { body.lat = pos.lat; body.lng = pos.lng; }
  try {
    await API.raiseSos(body);
    closeSheet();
    if (!silent) toast(t("j_sosOk"));
  } catch(e){ toast(errText(e.messageKey)); }
}

function reportSheet(){
  const cats = ["assault","harassment","dangerous_driving","discrimination","theft","vehicle_condition","punctuality","other"];
  return Sheet(t("reportProblem"),
    $("div",{class:"field"},
      $("label",{attrs:{for:"rep-cat"}, text:t("j_category")}),
      $("select",{class:"input", attrs:{id:"rep-cat", "aria-label":t("j_category")}},
        ...cats.map((c)=> $("option",{attrs:{value:c}, text: t("j_cat_"+c)==="j_cat_"+c ? c : t("j_cat_"+c)})))),
    $("div",{class:"field"},
      $("label",{attrs:{for:"rep-body"}, text:t("j_reportBody")}),
      $("textarea",{class:"input", attrs:{id:"rep-body", "aria-label":t("j_reportBody")}})),
    Btn({label:t("submit"), block:true, on:()=>sendReport()}));
}

async function sendReport(){
  const category = val("rep-cat");
  const body = val("rep-body");
  try {
    await API.fileReport({ category, body, bookingId: activeBookingId() || undefined });
    closeSheet(); toast(t("j_reportOk"));
  } catch(e){ toast(errText(e.messageKey)); }
}

function shareRideSheet(){
  const id = activeBookingId();
  if(!id) return Sheet(t("shareTrip"), Empty("share", t("shareTrip"), t("j_shareNeedRide")));
  return Sheet(t("shareTrip"),
    $("p",{class:"t-cap",text:t("j_shareSub")}),
    Btn({label:t("j_shareMake"), block:true, on:()=>makeShare(id)}),
    $("div",{id:"share-out"}));
}

async function makeShare(id){
  try {
    const res = await API.createShareLink(id);
    const url = location.origin + "/?share=" + res.token;
    const out = document.getElementById("share-out");
    if(out){
      out.innerHTML="";
      out.append($("div",{class:"field"},
        $("label",{attrs:{for:"share-url"}, text:t("j_shareLink")}),
        $("input",{class:"input ltr", attrs:{id:"share-url", readonly:true, value:url, "aria-label":t("j_shareLink")}})));
    }
    const shared = await Platform.share({ title: t("j_shareTitle"), url, text: t("j_shareSub") });
    if (shared) toast(t("j_shareCopied"));
  } catch(e){ toast(errText(e.messageKey)); }
}





