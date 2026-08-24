/* ══════════════════════════════════════════════════════════════════════
   9. OPERATIONS · 10. MANAGER · 11. SUPPORT
   The operations queue is REAL: driver applications and vehicles load from
   the API and approve/reject call the real endpoints. Everything that depends
   on geography/routes/journeys (M2/M3), commercial control (M5) or support
   tooling (M4) shows an honest "arrives in …" empty state — no fake rows.
   ══════════════════════════════════════════════════════════════════════ */
function opsQueue(){                                          // O-10
  if(S.opsView==="review") return opsReview();
  const w=$("div",{class:"main"});
  w.append($("h2",{class:"t-head",text:t("adminDriverQueue")}));
  const appList = $("div",{id:"app-list"});
  w.append(appList);
  w.append($("h2",{class:"t-head",text:t("adminVehicleQueue")}));
  const vehList = $("div",{id:"veh-list"});
  w.append(vehList);
  loadApplicationsInto(appList);
  loadVehiclesInto(vehList);
  return w;
}

function opsReview(){                                         // O-12
  const a = S.opsTarget || {};
  const w=$("div",{class:"main"});
  w.append($("div",{class:"row gap2"},
    $("h1",{class:"t-head grow",text:a.name || "—"}),
    Chip({label:a.status || "", kind:"warn"})));
  w.append(Card("card--tight",
    KV("Phone", a.phone || "—"),
    KV("Submitted", (a.submitted_at || "").toString().slice(0,16).replace("T"," "))));
  w.append($("div",{class:"field"},
    $("label",{text:t("reason")}),
    $("textarea",{class:"input", attrs:{id:"review-reason", placeholder:t("reason")}})));
  w.append($("div",{class:"row wrap gap3"},
    Btn({label:t("approve"), dis:S.authBusy, on:()=>reviewApplication("approve")}),
    Btn({label:t("reject"), kind:"danger", dis:S.authBusy, on:()=>reviewApplication("reject")})));
  w.append(backBtn(()=>{ S.opsView=null; S.opsTarget=null; render(); }, t("landingBack")));
  return w;
}

async function loadApplicationsInto(el) {
  if(!el) return;
  el.innerHTML="";
  try {
    const apps = await API.listDriverApplications();
    if(!apps.length){ el.append(Empty("users", t("adminDriverQueue"), t("opsNoApplications"))); return; }
    apps.forEach(a=> el.append(Row({
      icon:"profile",
      title: a.name || a.phone || "—",
      sub: `${t("roleLabel.rider")} · ${a.phone || ""}`,
      right: Chip({label:a.status, kind:"warn"}),
      bordered:true, chev:true,
      on:()=>{ S.opsTarget=a; S.opsView="review"; render(); }})));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

async function loadVehiclesInto(el) {
  if(!el) return;
  el.innerHTML="";
  try {
    const vehicles = await API.listVehicles();
    if(!vehicles.length){ el.append(Empty("bus", t("adminVehicleQueue"), t("opsNoVehicles"))); return; }
    vehicles.forEach(v=> el.append(Row({
      icon:"bus",
      title: $("span",{class:"ltr",text:v.plate}),
      sub: `${v.model || ""} · ${v.owner_name || ""}`,
      right: $("div",{class:"row gap2"},
        Chip({label:v.status, kind:v.status==="approved"?"ok":v.status==="rejected"?"danger":"warn"}),
        (v.status==="submitted")
          ? Btn({label:t("approve"), kind:"ghost", on:()=>reviewVehicle(v.id,"approve")})
          : null),
      bordered:true })));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

async function reviewApplication(decision) {
  const a = S.opsTarget;
  if(!a) return;
  S.authBusy = true; render();
  try {
    await API.reviewDriverApplication(a.id, decision, val("review-reason") || null);
    S.opsView=null; S.opsTarget=null;
    S.authBusy=false;
    toast(decision==="approve" ? t("approve") : t("reject"));
    render();
  } catch(e) { S.authBusy=false; toast(errText(e.messageKey)); render(); }
}

async function reviewVehicle(id, decision) {
  try {
    await API.reviewVehicle(id, decision);
    toast(decision==="approve" ? t("approve") : t("reject"));
    loadVehiclesInto(document.getElementById("veh-list"));
  } catch(e) { toast(errText(e.messageKey)); }
}

function opsLiveMap(){                                        // O-17
  const w=$("div",{class:"main"});
  w.append(MapView({h:240, fleet:true, vehicle:false}));
  const tbl = $("div",{id:"veh-table"});
  w.append(tbl);
  loadVehicleTableInto(tbl);
  return w;
}

async function loadVehicleTableInto(el) {
  if(!el) return;
  el.innerHTML="";
  try {
    const vehicles = await API.listVehicles();
    if(!vehicles.length){ el.append(Empty("bus", t("adminVehicleQueue"), t("opsNoVehicles"))); return; }
    el.append(Table(["Plate","Model","Owner","Status"],
      vehicles.map(v=> $("tr",{},
        $("td",{},$("strong",{class:"ltr",text:v.plate})),
        $("td",{text:v.model || "—"}),
        $("td",{text:v.owner_name || "—"}),
        $("td",{},Chip({label:v.status,
          kind:v.status==="approved"?"ok":v.status==="rejected"?"danger":"warn"}))))));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

function opsStops(){                                          // O-18 / O-20
  if (S.opsView === "stopReview") return stopReviewView();
  const w=$("div",{class:"main"});
  /* P2.4 — the verification queue (two-person rule) sits at the top. */
  w.append($("div",{class:"row gap2"},
    $("h2",{class:"t-head grow",text:t("pendingReview")}),
    Btn({label:t("fieldCapture"), kind:"secondary", on:()=>openSheet("fieldCapture")})));
  const pending = $("div",{id:"pending-list"});
  w.append(pending);
  loadPendingInto(pending);

  /* Add a stop: exact coordinates + bilingual names. The map below doubles as
     a coordinate picker when the (free, no-key) OSM map has loaded; the form
     always works. */
  w.append(Card("card--tight",
    $("div",{class:"t-micro",text:t("addStop")}),
    $("div",{class:"grid grid--tight"},
      field("stop-lat", t("latLabel"), "text", "off"),
      field("stop-lng", t("lngLabel"), "text", "off"),
      field("stop-name-en", t("stopNameEn"), "text", "off"),
      field("stop-name-ar", t("stopNameAr"), "text", "off")),
    S.stopTooClose
      ? $("div",{class:"stack gap2"},
          Banner("warn", t("stopTooClose")),
          field("stop-override", t("overrideReason"), "text", "off"))
      : null,
    Btn({label:t("addStop"), block:true, dis:S.stopBusy, on:()=>createStopAction()})));

  w.append(MapView({h:190, vehicle:false, route:false, stops:false,
    onPick:(lat,lng)=>{
      const la=document.getElementById("stop-lat"), lo=document.getElementById("stop-lng");
      if(la) la.value = lat.toFixed(6);
      if(lo) lo.value = lng.toFixed(6);
      toast(t("placedStop"));
    }}));

  w.append(Card("card--tight",
    $("div",{class:"t-micro",text:t("importCsv")}),
    $("p",{class:"t-cap",text:t("csvHint")}),
    $("textarea",{class:"input", attrs:{id:"stop-csv", "aria-label":t("importCsv")}}),
    Btn({label:t("importCsv"), kind:"secondary", block:true, dis:S.stopBusy, on:()=>importCsvAction()})));

  w.append($("h2",{class:"t-head",text:t("stopsList")}));
  const list = $("div",{id:"stops-list"});
  w.append(list);
  loadStopsInto(list);
  return w;
}

/* ── P2.4 verification queue + review ─────────────────────────────────── */
async function loadPendingInto(el) {
  if (!el) return;
  el.innerHTML = "";
  try {
    const stops = await API.listStops("pending");
    if (!stops.length) { el.append(Empty("stops", t("pendingReview"), t("noPendingStops"))); return; }
    stops.forEach((s) => el.append(Row({
      icon: s.source === "field" ? "walk" : "stops",
      title: $("span",{class:"ltr",text:s.code}),
      sub: `${s.source === "field" ? t("sourceField") : t("sourceDesk")} · ${Number(s.lat).toFixed(6)}, ${Number(s.lng).toFixed(6)}`,
      right: Btn({label:t("reviewStop"), kind:"ghost", on:()=>{ S.opsTarget=s; S.opsView="stopReview"; render(); }}),
      bordered:true, chev:true,
      on:()=>{ S.opsTarget=s; S.opsView="stopReview"; render(); } })));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

function stopReviewView() {
  const s = S.opsTarget || {};
  const mine = s.created_by === (S.user && S.user.id);
  const w = $("div",{class:"main"});
  w.append($("div",{class:"row gap2"},
    $("h1",{class:"t-head grow ltr",text:s.code || "—"}),
    Chip({label:t("stopStatus."+(s.status||"pending")), kind:"warn"})));
  w.append($("div",{class:"t-cap",text:`${t("latLabel")}: ${Number(s.lat||0).toFixed(6)} · ${t("lngLabel")}: ${Number(s.lng||0).toFixed(6)}`}));
  if (s.gps_accuracy_m != null)
    w.append($("div",{class:"t-cap",text:`${t("accuracyLabel")}: ${s.gps_accuracy_m} m`}));

  if (s.source === "field") {
    w.append(Card("card--tight",
      $("div",{class:"t-micro",text:t("checklist")}),
      checkRow("stand_ok", t("standOk")),
      checkRow("lit_ok", t("litOk")),
      checkRow("legal_stop_ok", t("legalOk")),
      checkRow("reachable_ok", t("reachableOk"))));
    const photo = $("div",{id:"stop-photo"});
    w.append(Card("card--tight", $("div",{class:"t-micro",text:t("photo")}), photo));
    loadStopPhotoInto(photo, s.id);
  }

  if (mine) w.append(Banner("info", t("cannotSelfVerify")));
  w.append($("div",{class:"field"},
    $("label",{text:t("rejectReason")}),
    $("textarea",{class:"input", attrs:{id:"review-reason", "aria-label":t("rejectReason")}})));
  w.append($("div",{class:"row wrap gap3"},
    mine ? null : Btn({label:t("approveStop"), on:()=>reviewStopAction(s.id, "approved")}),
    Btn({label:t("rejectStop"), kind:"danger", on:()=>reviewStopAction(s.id, "rejected")})));
  w.append(backBtn(()=>{ S.opsView=null; S.opsTarget=null; render(); }, t("landingBack")));
  return w;
}

function checkRow(flag, label) {
  const s = S.opsTarget || {};
  const ok = s[flag] === true;
  return Row({ icon: ok ? "check" : "close", title: label,
    right: Chip({label: ok ? t("approve") : "✗", kind: ok ? "ok" : "danger"}), bordered:true });
}

async function loadStopPhotoInto(el, id) {
  if (!el) return;
  const url = await API.stopPhoto(id);
  if (!url) { el.append($("div",{class:"t-cap",text:t("photo")+" —"})); return; }
  el.append($("img",{attrs:{src:url, alt:t("photo")}, style:{width:"100%",borderRadius:"var(--r-sm)",display:"block"}}));
}

async function reviewStopAction(id, decision) {
  S.stopBusy = true; render();
  try {
    await API.reviewStop(id, decision, val("review-reason") || null);
    S.stopBusy = false; S.opsView = null; S.opsTarget = null;
    toast(decision === "approved" ? t("approve") : t("reject"));
    render();
  } catch(e) { S.stopBusy = false; toast(errText(e.messageKey)); render(); }
}

/* ── P2.3 field capture (sheet) + offline queue ───────────────────────── */
function fieldCaptureSheet() {
  return Sheet(t("fieldCapture"),
    $("p",{class:"t-cap",text:t("checklistHint")}),
    $("div",{class:"row gap2"},
      Btn({label:t("useMyLocation"), kind:"secondary", on:()=>useMyLocation()}),
      $("span",{class:"t-cap grow", id:"field-acc", text:"—"})),
    $("div",{class:"grid grid--tight"},
      field("field-lat", t("latLabel"), "text", "off"),
      field("field-lng", t("lngLabel"), "text", "off")),
    field("field-photo", t("photo"), "file", "off"),
    $("p",{class:"t-cap",text:t("photoHint")}),
    fieldCheck("field-stand", t("standOk")),
    fieldCheck("field-lit", t("litOk")),
    fieldCheck("field-legal", t("legalOk")),
    fieldCheck("field-reachable", t("reachableOk")),
    Btn({label:t("captureStop"), block:true, driver:true, dis:S.stopBusy, on:()=>captureStopAction()}));
}

function fieldCheck(id, label) {
  const cb = $("input",{attrs:{type:"checkbox", id}});
  return $("label",{class:"rowitem rowitem--bordered"},
    cb,
    $("span",{class:"grow",text:label}));
}

function useMyLocation() {
  if (!navigator.geolocation) { toast(t("locationDenied")); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const la = document.getElementById("field-lat"), lo = document.getElementById("field-lng"), acc = document.getElementById("field-acc");
      if (la) la.value = pos.coords.latitude.toFixed(6);
      if (lo) lo.value = pos.coords.longitude.toFixed(6);
      if (acc) acc.textContent = `${t("accuracyLabel")}: ${Math.round(pos.coords.accuracy)} m`;
    },
    () => toast(t("locationDenied")),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function readPhotoFile(inputId, cb) {
  const input = document.getElementById(inputId);
  const file = input && input.files && input.files[0];
  if (!file) { cb(null); return; }
  const r = new FileReader();
  r.onload = () => cb(String(r.result));
  r.onerror = () => cb(null);
  r.readAsDataURL(file);
}

async function captureStopAction() {
  const lat = Number(val("field-lat")), lng = Number(val("field-lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { toast(t("validation.failed")); return; }
  readPhotoFile("field-photo", async (photoDataUrl) => {
    const accEl = document.getElementById("field-acc");
    const accText = (accEl && accEl.textContent) || "";
    const accMatch = /(\d+(?:\.\d+)?)/.exec(accText);
    if (!accMatch) { S.stopBusy = false; toast(t("locationDenied")); render(); return; } // a field capture needs a real fix
    const payload = {
      captureId: "cap-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10),
      lat, lng,
      gpsAccuracyM: accMatch ? Number(accMatch[1]) : 0,
      checklist: {
        stand: document.getElementById("field-stand").checked,
        lit: document.getElementById("field-lit").checked,
        legal: document.getElementById("field-legal").checked,
        reachable: document.getElementById("field-reachable").checked,
      },
      photoDataUrl: photoDataUrl || undefined,
    };
    S.stopBusy = true; render();
    try {
      await API.captureStop(payload);
      S.stopBusy = false; closeSheet();
      toast(t("captureSaved"));
      render();
      loadPendingInto(document.getElementById("pending-list"));
    } catch(e) {
      S.stopBusy = false;
      if (e.code === "NETWORK") {
        // offline: queue locally, upload on reconnect (idempotent by captureId)
        queueFieldCapture(payload);
        closeSheet(); toast(t("queuedOffline")); render();
      } else {
        toast(errText(e.messageKey)); render();
      }
    }
  });
}

function queueFieldCapture(payload) {
  let q = [];
  try { q = JSON.parse(localStorage.getItem("rs.fieldQueue") || "[]"); } catch {}
  q.push(payload);
  try { localStorage.setItem("rs.fieldQueue", JSON.stringify(q)); } catch {}
}

async function flushFieldQueue() {
  if (typeof fetch !== "function" || !navigator.onLine) return;
  let q = [];
  try { q = JSON.parse(localStorage.getItem("rs.fieldQueue") || "[]"); } catch {}
  if (!q.length) return;
  for (const payload of q) {
    try { await API.captureStop(payload); } catch { /* stay queued */ continue; }
  }
  try { localStorage.removeItem("rs.fieldQueue"); } catch {}
}

async function createStopAction() {
  const lat = Number(val("stop-lat")), lng = Number(val("stop-lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { toast(t("validation.failed")); return; }
  const payload = {
    lat, lng, source: "desk",
    nameEn: val("stop-name-en") || undefined,
    nameAr: val("stop-name-ar") || undefined,
  };
  if (S.stopTooClose) payload.overrideReason = val("stop-override") || undefined;
  S.stopBusy = true; render();
  try {
    await API.createStop(payload);
    S.stopTooClose = null; S.stopBusy = false;
    toast(t("placedStop"));
    render();
    loadStopsInto(document.getElementById("stops-list"));
  } catch(e) {
    S.stopBusy = false;
    if (e.messageKey === "geo.stop_too_close") {
      S.stopTooClose = (e.payload && e.payload.details) || {};
      render();
    } else { toast(errText(e.messageKey)); render(); }
  }
}

async function importCsvAction() {
  const csv = val("stop-csv");
  if (!csv.trim()) { toast(t("validation.failed")); return; }
  S.stopBusy = true; render();
  try {
    const res = await API.importStops(csv);
    S.stopBusy = false;
    toast(`${res.imported} ${t("importedStops")}`);
    render();
    loadStopsInto(document.getElementById("stops-list"));
  } catch(e) { S.stopBusy = false; toast(errText(e.messageKey)); render(); }
}

async function loadStopsInto(el) {
  if (!el) return;
  try {
    S.stopsCache = await API.listStops();   // full refresh (open + after mutations)
    renderStops(el);
  } catch(e) { el.innerHTML=""; el.append(Banner("danger", errText(e.messageKey))); }
}

/* Live filter: no refetch, no full render — the input keeps focus. */
function stopsSearchChanged(v){
  S.stopsQuery = v;
  renderStops(document.getElementById("stops-list"));
}

function renderStops(el) {
  if (!el) return;
  el.innerHTML = "";
  const stops = S.stopsCache || [];
  if (!stops.length) { el.append(Empty("stops", t("stopsList"), t("opsNoStops"))); return; }
  const shown = stops.filter((s)=> matchesQuery(S.stopsQuery, (s.code||"")+" "+(s.name_en||"")+" "+(s.name_ar||"")));
  if (!shown.length) { el.append(Empty("stops", t("stopsList"), t("noSearchResults"))); return; }
  shown.forEach(s=> el.append(Row({
    icon: "stops",
    title: $("span",{class:"ltr",text:s.code}),
    sub: `${s.name_en || s.name_ar || "—"} · ${Number(s.lat).toFixed(6)}, ${Number(s.lng).toFixed(6)}`,
    right: $("div",{class:"row gap2"},
      Chip({label:t("stopStatus."+s.status),
        kind: s.status==="verified" ? "ok" : s.status==="rejected" ? "danger" : s.status==="pending" ? "warn" : ""}),
      s.status==="draft" ? Btn({label:t("submitStop"), kind:"ghost", on:()=>submitStopAction(s.id)}) : null),
    bordered:true })));
}

async function submitStopAction(id) {
  try {
    await API.submitStop(id);
    toast(t("stopSubmitted"));
    loadStopsInto(document.getElementById("stops-list"));
  } catch(e) { toast(errText(e.messageKey)); }
}

function opsRoutes(){                                         // O-23
  if (S.opsView === "routeDetail") return routeDetailView();
  const w=$("div",{class:"main"});
  w.append(Card("card--tight",
    $("div",{class:"t-micro",text:t("newRoute")}),
    $("div",{class:"grid grid--tight"},
      field("route-name-en", t("stopNameEn"), "text", "off"),
      field("route-name-ar", t("stopNameAr"), "text", "off"),
      field("route-fare", t("fareLabel"), "number", "off"),
      field("route-interval", t("intervalLabel"), "number", "off"),
      field("route-win-start", t("windowStart"), "text", "off"),
      field("route-win-end", t("windowEnd"), "text", "off")),
    Btn({label:t("newRoute"), block:true, dis:S.stopBusy, on:()=>createRouteAction()})));

  w.append($("h2",{class:"t-head",text:t("nav.routes")}));
  const list = $("div",{id:"routes-list"});
  w.append(list);
  loadRoutesInto(list);
  return w;
}

async function createRouteAction() {
  const fare = Number(val("route-fare"));
  const interval = Number(val("route-interval"));
  const winStart = val("route-win-start"), winEnd = val("route-win-end");
  if (!Number.isFinite(fare) || fare <= 0 || !Number.isFinite(interval) || !winStart || !winEnd) {
    toast(t("validation.failed")); return;
  }
  S.stopBusy = true; render();
  try {
    await API.createRoute({
      nameEn: val("route-name-en") || undefined,
      nameAr: val("route-name-ar") || undefined,
      fareMinor: Math.round(fare * 100), // EGP → minor units (piastres)
      windowStart: winStart, windowEnd: winEnd, slotIntervalMin: interval,
    });
    S.stopBusy = false; toast(t("save")); render();
    loadRoutesInto(document.getElementById("routes-list"));
  } catch(e) { S.stopBusy = false; toast(errText(e.messageKey)); render(); }
}

async function loadRoutesInto(el) {
  if (!el) return;
  el.innerHTML = "";
  try {
    const routes = await API.listRoutes();
    if (!routes.length) { el.append(Empty("routes", t("nav.routes"), t("opsRoutesComing"))); return; }
    routes.forEach((r) => el.append(Row({
      icon: "routes",
      title: r.name_en || r.name_ar || r.code,
      sub: `${r.code} · ${money(r.fare_minor / 100)} · ${r.window_start}–${r.window_end} · ${r.slot_interval_min}${t("intervalLabel")}`,
      right: Chip({label: t("stopStatus." + ({draft:"draft",published:"verified",retired:"retired"}[r.status] || "draft")),
        kind: r.status === "published" ? "ok" : r.status === "retired" ? "danger" : ""}),
      bordered: true, chev: true,
      on: () => { S.opsTarget = r; S.opsView = "routeDetail"; render(); } })));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

function routeDetailView() {
  const r = S.opsTarget || {};
  const w = $("div",{class:"main"});
  w.append($("div",{class:"row gap2"},
    $("h1",{class:"t-head grow",text:r.name_en || r.name_ar || r.code}),
    Chip({label:r.status, kind:r.status==="published"?"ok":""})));
  w.append(backBtn(()=>{ S.opsView=null; S.opsTarget=null; render(); }, t("landingBack")));

  if (r.status === "draft") {
    w.append(Banner("info", t("routeNoStops")));
    w.append(Btn({label:t("publishRoute"), block:true, dis:S.stopBusy, on:()=>publishRouteAction(r.id)}));
  }

  const stops = $("div",{id:"route-stops"});
  w.append(stops);
  loadRouteStopsInto(stops, r.id);

  w.append(Card("card--tight",
    $("div",{class:"t-micro",text:t("generateSlots")}),
    $("div",{class:"grid grid--tight"},
      field("slots-from", t("slotsFrom"), "text", "off"),
      field("slots-to", t("slotsTo"), "text", "off")),
    Btn({label:t("generateSlots"), kind:"secondary", block:true, dis:S.stopBusy, on:()=>generateSlotsAction(r.id)})));

  const slotList = $("div",{id:"route-slots"});
  w.append(slotList);
  loadRouteSlotsInto(slotList, r.id);
  return w;
}

async function loadRouteStopsInto(el, routeId) {
  if (!el) return;
  el.innerHTML = "";
  try {
    const { route, stops } = await API.getRoute(routeId);
    if (!stops.length) { el.append(Empty("stops", t("nav.stops"), t("routeNoStops"))); return; }
    el.append($("h2",{class:"t-head",text:`${stops.length} ${t("stopCount")}`}));
    stops.forEach((s) => el.append(Row({
      icon: "stops",
      title: $("span",{class:"ltr",text:s.stop_code}),
      sub: `${s.stop_name_en || s.stop_name_ar || "—"} · ${Math.round(s.distance_from_start_m)} m · ${s.run_minutes} min`,
      right: Chip({label:String(s.position)}),
      bordered: true })));
    void route;
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

async function loadRouteSlotsInto(el, routeId) {
  if (!el) return;
  el.innerHTML = "";
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  try {
    const slots = await API.listRouteSlots(routeId, today, week);
    if (!slots.length) { el.append(Empty("clock", t("generateSlots"), t("noSlotsPublished"))); return; }
    el.append($("h2",{class:"t-head",text:t("nav.work")}));
    const days = {};
    slots.forEach((s) => { (days[s.service_date] ||= []).push(s.departs_at); });
    Object.entries(days).forEach(([date, times]) => el.append(
      $("div",{class:"row wrap gap2"}, $("span",{class:"t-cap ltr",text:date}),
        ...times.map((tm) => Chip({label:String(tm), kind:"info"})))));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

async function publishRouteAction(id) {
  S.stopBusy = true; render();
  try {
    await API.publishRoute(id);
    S.stopBusy = false; toast(t("publishRoute")); render();
    loadRoutesInto(document.getElementById("routes-list"));
  } catch(e) { S.stopBusy = false; toast(errText(e.messageKey)); render(); }
}

async function generateSlotsAction(id) {
  const from = val("slots-from"), to = val("slots-to");
  if (!from || !to) { toast(t("validation.failed")); return; }
  S.stopBusy = true; render();
  try {
    const res = await API.generateSlots(id, from, to);
    S.stopBusy = false; toast(`${res.generated}`); render();
    loadRouteSlotsInto(document.getElementById("route-slots"), id);
  } catch(e) { S.stopBusy = false; toast(errText(e.messageKey)); render(); }
}

function opsUsers(){                                          // O-22
  const w=$("div",{class:"main"});
  w.append(Empty("users", t("nav.users"), t("opsUsersComing")));
  return w;
}

/* ══════════════════════════════════════════════════════════════════════
   10. MANAGER — commercial control lands in M5
   ══════════════════════════════════════════════════════════════════════ */
function managerBoard(){                                      // G-10
  const w=$("div",{class:"main"});
  w.append(Empty("board", t("nav.board"), t("managerComing")));
  return w;
}
function managerCoverage(){                                   // G-11
  const w=$("div",{class:"main"});
  w.append(Empty("coverage", t("nav.coverage"), t("managerComing")));
  return w;
}
function managerPricing(){                                    // G-13
  const w=$("div",{class:"main"});
  w.append(Empty("pricing", t("nav.pricing"), t("managerComing")));
  return w;
}
function managerPromos(){                                     // G-15
  const w=$("div",{class:"main"});
  w.append(Empty("promos", t("nav.promos"), t("managerComing")));
  return w;
}
function managerAnalytics(){                                  // G-18
  const w=$("div",{class:"main"});
  w.append(Empty("analytics", t("nav.analytics"), t("managerComing")));
  return w;
}

/* ══════════════════════════════════════════════════════════════════════
   11. SUPPORT — support tooling lands in M4
   ══════════════════════════════════════════════════════════════════════ */
function supportLookup(){                                     // S-11
  const w=$("div",{class:"main"});
  w.append(Empty("lookup", t("nav.lookup"), t("supportComing")));
  return w;
}
function supportTickets(){                                    // S-12
  const w=$("div",{class:"main"});
  const list=$("div",{id:"incident-queue"});
  w.append(list);
  loadIncidentQueue(list);
  return w;
}

async function loadIncidentQueue(el){
  if(!el) return;
  el.innerHTML="";
  try {
    const rows = await API.incidentQueue();
    if(!rows.length){ el.append(Empty("tickets", t("nav.tickets"), t("j_queueEmpty"))); return; }
    rows.forEach((r)=> el.append(incidentRow(r)));
  } catch(e){ el.append(Banner("danger", errText(e.messageKey))); }
}

function incidentRow(r){
  const actions=$("div",{class:"row wrap gap2"});
  if(r.status==="OPEN" || r.status==="TRIAGE"){
    actions.append(Btn({label:t("j_investigate"), kind:"secondary", on:async()=>{
      try { await API.investigateIncident(r.id); toast(t("j_investigate")); loadIncidentQueue(document.getElementById("incident-queue")); }
      catch(e){ toast(errText(e.messageKey)); }
    }}));
  }
  if(r.status==="INVESTIGATING"){
    actions.append(Btn({label:t("j_decide"), on:()=>{ S.opsTarget=r; openSheet("decideIncident"); }}));
  }
  return Card("card--tight",
    $("div",{class:"row gap2"},
      $("strong",{class:"grow",text:r.kind==="sos"?t("sos"):(t("j_cat_"+r.category)==="j_cat_"+r.category?r.category:t("j_cat_"+r.category))}),
      Chip({label:r.severity, kind:r.severity==="severe"||r.severity==="high"?"danger":"warn"})),
    $("div",{class:"t-cap",text:r.status+(r.body?" · "+r.body:"")}),
    r.precautionary ? Banner("danger", t("j_precaution")) : null,
    actions);
}
function supportLost(){                                       // S-14
  const w=$("div",{class:"main"});
  w.append(Empty("lost", t("nav.lost"), t("supportComing")));
  return w;
}

function decideIncidentSheet(){
  const r = S.opsTarget || {};
  return Sheet(t("j_decide"),
    $("div",{class:"t-cap",text:r.category || ""}),
    $("div",{class:"field"},
      $("label",{attrs:{for:"dec-kind"}, text:t("j_decide")}),
      $("select",{class:"input", attrs:{id:"dec-kind", "aria-label":t("j_decide")}},
        ...["no_action","warning","training","suspension","removal"].map((d)=>
          $("option",{attrs:{value:d}, text:t("j_dec_"+d)==="j_dec_"+d?d:t("j_dec_"+d)})))),
    $("div",{class:"field"},
      $("label",{attrs:{for:"dec-why"}, text:t("reason")}),
      $("textarea",{class:"input", attrs:{id:"dec-why", "aria-label":t("reason")}})),
    Btn({label:t("save"), block:true, on:async()=>{
      try {
        await API.decideIncident(r.id, val("dec-kind"), val("dec-why"));
        closeSheet(); toast(t("j_decide"));
        loadIncidentQueue(document.getElementById("incident-queue"));
      } catch(e){ toast(errText(e.messageKey)); }
    }}));
}
