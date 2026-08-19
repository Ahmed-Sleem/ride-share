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
  w.append($("div",{id:"app-list"}), null);
  w.append($("h2",{class:"t-head",text:t("adminVehicleQueue")}));
  w.append($("div",{id:"veh-list"}), null);
  loadApplicationsInto(document.getElementById("app-list"));
  loadVehiclesInto(document.getElementById("veh-list"));
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
  w.append($("div",{id:"veh-table"}), null);
  loadVehicleTableInto(document.getElementById("veh-table"));
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
  const w=$("div",{class:"main"});
  w.append(Empty("stops", t("nav.stops"), t("opsStopsComing")));
  return w;
}

function opsRoutes(){                                         // O-23
  const w=$("div",{class:"main"});
  w.append(Empty("routes", t("nav.routes"), t("opsRoutesComing")));
  return w;
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
  w.append(Empty("tickets", t("nav.tickets"), t("supportComing")));
  return w;
}
function supportLost(){                                       // S-14
  const w=$("div",{class:"main"});
  w.append(Empty("lost", t("nav.lost"), t("supportComing")));
  return w;
}
