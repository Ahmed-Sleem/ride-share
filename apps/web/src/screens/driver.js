/* ══════════════════════════════════════════════════════════════════════
   8. DRIVER SCREENS — bigger targets, glanceable
   Driving depends on routes, slots and journeys (M3). Until then every
   driver screen shows the real account and an honest "arrives with routes"
   empty state — no invented shifts, earnings or manifests.
   ══════════════════════════════════════════════════════════════════════ */
function driverDuty(){                                        // D-10
  const u = S.user || {};
  const w=$("div",{class:"main"});
  w.append(Card("card--brand",
    $("div",{class:"t-micro",text:t("greeting")}),
    $("div",{class:"t-lg",text:u.name || "—"}),
    $("div",{class:"t-cap",text:t("roleLabel.driver")})));
  w.append($("h2",{class:"t-head",text:t("myJourneysTitle")}));
  const list = $("div",{id:"duty-list"});
  w.append(list);
  loadDutyInto(list);
  return w;
}

async function loadDutyInto(el) {
  if (!el) return;
  el.innerHTML = "";
  try {
    const journeys = await API.myJourneys();
    if (!journeys.length) {
      el.append(Empty("clock", t("noClaims"), t("noClaimsBody"),
        Btn({label:t("nav.work"), on:()=>go("work")})));
      return;
    }
    journeys.forEach((j) => el.append(Row({
      icon: "bus",
      title: j.route_name_en || j.route_name_ar || j.route_code,
      sub: `${j.service_date} · ${j.departs_at} · ${j.seats_total} ${t("seats")}`,
      right: $("div",{class:"row gap2"},
        Chip({label:j.status, kind:j.status==="CANCELLED"?"danger":j.status==="COMPLETED"?"ok":"warn"}),
        (j.status === "CLAIMED")
          ? Btn({label:t("openForBooking"), kind:"ghost", on:()=>openJourneyAction(j.id)})
          : null),
      bordered:true })));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

async function openJourneyAction(id) {
  try { await API.openJourney(id); toast(t("openForBooking")); loadDutyInto(document.getElementById("duty-list")); }
  catch(e) { toast(errText(e.messageKey)); }
}

function driverWork(){                                        // D-11
  const w=$("div",{class:"main"});
  w.append($("h2",{class:"t-head",text:t("findWork")}));
  const list = $("div",{id:"work-list"});
  w.append(list);
  loadWorkInto(list);
  return w;
}

async function loadWorkInto(el) {
  if (!el) return;
  el.innerHTML = "";
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  try {
    const board = await API.availableJourneys(today, week);
    if (!board.length || board.every((r) => !r.slots.length)) {
      el.append(Empty("work", t("findWork"), t("noSlotsPublished")));
      return;
    }
    board.forEach((r) => {
      const card = Card("",
        $("div",{class:"stack grow gap1"},
          $("strong",{text:r.route.nameEn || r.route.nameAr || r.route.code}),
          $("div",{class:"t-cap",text:`${r.route.code} · ${money(r.route.fareMinor / 100)}`})));
      const grid = $("div",{class:"row wrap gap2"});
      r.slots.forEach((s) => {
        const taken = s.claimed && !s.mine;
        grid.append(Chip({
          label: `${s.serviceDate.slice(5)} ${s.departsAt}`,
          kind: s.mine ? "brand" : taken ? "" : "info",
          dis: taken || s.mine,
          pressed: s.mine,
          on: (taken || s.mine) ? ()=>{}
             : ()=>claimConfirmSheet(r.route, s),
        }));
      });
      card.append(grid);
      el.append(card);
    });
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

function claimConfirmSheet(route, slot) {
  S.claimTarget = { route, slot };
  openSheet("claimSlot");
}

function claimSlotSheet() {
  const { route, slot } = S.claimTarget || {};
  if (!route || !slot) return Sheet(t("claimSlot"), Banner("danger", t("error.internal")));
  const vehicles = $("div",{id:"claim-vehicles"});
  setTimeout(() => loadClaimVehiclesInto(document.getElementById("claim-vehicles")), 0);
  return Sheet(t("claimSlot"),
    $("div",{class:"stack gap1"},
      $("strong",{text:route.nameEn || route.nameAr || route.code}),
      $("div",{class:"t-cap ltr",text:`${slot.serviceDate} · ${slot.departsAt}`}),
      $("div",{class:"t-cap",text:t("claimConfirm")})),
    vehicles,
    Btn({label:t("claimSlot"), block:true, driver:true, dis:S.stopBusy, on:()=>claimSlotAction()}));
}

async function loadClaimVehiclesInto(el) {
  if (!el) return;
  el.innerHTML = "";
  try {
    const vehicles = await API.driverVehicles();
    if (!vehicles.length) { el.append(Banner("warn", t("noApprovedVehicle"))); return; }
    S.claimVehicleId = S.claimVehicleId || vehicles[0].id;
    vehicles.forEach((v) => el.append(Row({
      icon: "bus",
      title: $("span",{class:"ltr",text:v.plate}),
      sub: v.model || "",
      selected: S.claimVehicleId === v.id,
      bordered: true,
      on: () => { S.claimVehicleId = v.id; render(); } })));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

async function claimSlotAction() {
  const { slot } = S.claimTarget || {};
  if (!slot) return;
  S.stopBusy = true; render();
  try {
    const vehicles = await API.driverVehicles();
    if (!vehicles.length) { S.stopBusy = false; closeSheet(); toast(t("noApprovedVehicle")); render(); return; }
    const vehicleId = (S.claimVehicleId) || vehicles[0].id;
    await API.claimJourney(slot.id, vehicleId, true);
    S.stopBusy = false; S.claimVehicleId = null; S.claimTarget = null;
    closeSheet(); toast(t("claimed")); render();
    loadWorkInto(document.getElementById("work-list"));
    loadDutyInto(document.getElementById("duty-list"));
  } catch(e) { S.stopBusy = false; toast(errText(e.messageKey)); render(); }
}

function driverJourney(){                                     // D-20
  const w=$("div",{class:"main"});
  w.append(Empty("journey", t("nav.journey"), t("journeyComingBody")));
  return w;
}

function driverEarnings(){                                    // D-30
  const w=$("div",{class:"main"});
  w.append(Empty("earnings", t("nav.earnings"), t("earningsComingBody")));
  return w;
}

function driverProfile(){                                     // D-40
  const u = S.user || {};
  const initials = (u.name || "?").slice(0,1).toUpperCase();
  const w=$("div",{class:"main"});
  w.append($("div",{class:"row gap3"},
    $("div",{class:"avatar avatar--lg",text:initials}),
    $("div",{class:"stack grow gap1"},
      $("strong",{class:"t-head",text:u.name || "—"}),
      $("div",{class:"row gap2"},
        $("div",{class:"t-cap ltr",text:u.email || u.phone || "—"}),
        Chip({label:t("roleLabel.driver"), kind:"accent"})))));
  w.append(emailSection());
  w.append($("div",{class:"rowgroup"},
    Row({icon:"globe", title:t("language"), right:langSeg()}),
    Row({icon:"moon",  title:t("theme"),    right:themeSeg()}))); 
  w.append(Btn({label:t("signOut"), kind:"secondary", block:true,
    on:()=>signOut()}));
  return w;
}
