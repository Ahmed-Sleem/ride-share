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

function driverJourney(){                                     // D-20 / D-21 — scan + manifest
  const w=$("div",{class:"main"});
  const pick = $("div",{id:"journey-pick"});
  const scan = $("div",{id:"journey-scan"});
  const list = $("div",{id:"journey-manifest"});
  w.append(pick, scan, list);
  loadDriverJourneyInto(pick, scan, list);
  return w;
}

async function loadDriverJourneyInto(pick, scan, list) {
  if (!pick) return;
  pick.innerHTML = ""; if (scan) scan.innerHTML = ""; if (list) list.innerHTML = "";
  try {
    const journeys = (await API.myJourneys()).filter((j) =>
      j.status !== "CANCELLED" && j.status !== "COMPLETED" && j.status !== "ABORTED");
    if (!journeys.length) {
      pick.append(Empty("journey", t("nav.journey"), t("j_noActiveJourney"),
        Btn({label:t("nav.work"), on:()=>go("work")})));
      return;
    }
    S.scanJourneyId = S.scanJourneyId || journeys[0].id;
    journeys.forEach((j) => pick.append(Row({
      icon: "bus",
      title: j.route_name_en || j.route_name_ar || j.route_code,
      sub: `${j.service_date} · ${j.departs_at} · ${j.status}`,
      selected: S.scanJourneyId === j.id,
      bordered: true,
      on: () => { S.scanJourneyId = j.id; render(); },
    })));
    const jid = S.scanJourneyId;
    const live = $("div",{id:"journey-live"});
    scan.append(live);
    try {
      const p = await API.journeyProgress(jid);
      const slipKind = p.exceedsSlip ? "danger" : (p.slipMinutes > 0 ? "warn" : "ok");
      const nextName = p.stop ? (S.lang==="ar" ? p.stop.nameAr : p.stop.nameEn) : "—";
      live.append(Card("",
        $("div",{class:"t-micro",text:t("nextStop")}),
        $("strong",{text:nextName}),
        Chip({label:t("j_slip")+" "+p.slipMinutes+"'", kind:slipKind})));
      const acts = $("div",{class:"row wrap gap2"});
      const st = (journeys.find((x)=>x.id===jid)||{}).status;
      if (st === "OPEN_FOR_BOOKING" || st === "LOCKED")
        acts.append(Btn({label:t("j_startRide"), driver:true, on:()=>dutyAct(()=>queueOrSend("start","POST",`/journeys/${jid}/start`))}));
      if (st === "IN_PROGRESS") {
        acts.append(Btn({label:t("j_arrivedStop"), kind:"secondary", driver:true, on:()=>dutyAct(()=>queueOrSend("arrive","POST",`/journeys/${jid}/arrive`))}));
        acts.append(Btn({label:t("j_completeRide"), kind:"secondary", driver:true, on:()=>dutyAct(()=>queueOrSend("complete","POST",`/journeys/${jid}/complete`))}));
        acts.append(Btn({label:t("sos"), kind:"danger", driver:true, on:()=>openSheet("sos")}));
        acts.append(Btn({label:t("j_abortRide"), kind:"danger", on:()=>{
          const reason = window.prompt(t("j_abortWhy")) || "";
          if (reason) dutyAct(()=>queueOrSend("abort","POST",`/journeys/${jid}/abort`,{ reason }));
        }}));
      }
      const box = driverOutbox();
      if (box) {
        const pend = box.pending().length;
        const rev = box.review();
        if (pend) live.prepend(Banner("info", t("j_outboxPending")+" · "+pend));
        if (rev.length) live.prepend(Banner("warn", t("j_outboxReview")+" · "+rev.length));
      }
      live.append(acts);
    } catch (e) { live.append(Banner("info", errText(e.messageKey))); }
    scan.append($("h2",{class:"t-head",text:t("j_scanTitle")}));
    scan.append($("p",{class:"t-cap",text:t("j_scanHint")}));
    const field = $("input",{class:"input ltr", attrs:{
      type:"text", inputmode:"numeric", pattern:"[0-9]*", maxlength:"6",
      autocomplete:"one-time-code", "aria-label":t("boardingCode"),
      id:"scan-code", placeholder:"000000",
    }});
    if (S.scanCode) field.value = S.scanCode;
    field.addEventListener("input", () => { S.scanCode = field.value.replace(/\D/g,"").slice(0,6); });
    scan.append(field);
    scan.append($("div",{class:"row wrap gap2"},
      Btn({label:t("j_scanCamera"), kind:"secondary", driver:true, dis:S.stopBusy, on:()=>scanCameraAction(jid)}),
      Btn({label:t("j_scanAction"), driver:true, dis:S.stopBusy, on:()=>scanCodeAction(jid)})));
    await loadManifestInto(list, jid);
  } catch (e) { pick.append(Banner("danger", errText(e.messageKey))); }
}

async function scanCodeAction(journeyId) {
  const code = (S.scanCode || "").replace(/\D/g,"");
  if (code.length !== 6) { toast(t("validation.code")); return; }
  S.stopBusy = true; render();
  try {
    await queueOrSend("scan", "POST", "/bookings/scan", { journeyId, code });
    S.scanCode = "";
    S.stopBusy = false;
    toast(t("j_boarded"));
    render();
  } catch (e) { S.stopBusy = false; toast(errText(e.messageKey)); render(); }
}

async function loadManifestInto(el, journeyId) {
  if (!el || !journeyId) return;
  el.innerHTML = "";
  el.append($("h2",{class:"t-head",text:t("j_manifest")}));
  try {
    const rows = await API.journeyManifest(journeyId);
    if (!rows.length) { el.append(Empty("users", t("j_manifest"), t("j_noPassengers"))); return; }
    rows.forEach((p) => {
      const stop = S.lang === "ar" ? (p.stop_name_ar || p.stop_name_en) : (p.stop_name_en || p.stop_name_ar);
      const cashBtn = (typeof API.cashCollected === "function")
        ? Btn({label:t("cashCollected"), kind:"ghost", on:()=>cashTap(p.id)})
        : null;
      el.append(Row({
        icon: p.status === "ON_BOARD" ? "check" : "seat",
        title: p.rider_name || "—",
        sub: `${stop} · ${p.seats} · ${p.code}` + (p.alight_requested_at ? " · "+t("imGettingOff") : ""),
        right: $("div",{class:"row gap2"},
          Chip({label:p.status === "ON_BOARD" ? t("scanned") : t("notScanned"),
            kind: p.status === "ON_BOARD" ? "ok" : ""}),
          cashBtn),
        bordered: true,
      }));
    });
  } catch (e) { el.append(Banner("danger", errText(e.messageKey))); }
}

function driverOutbox() {
  if (typeof Outbox === "undefined") return null;
  if (!Outbox.live()) {
    Outbox.install({
      persist: Outbox.localPersist("rs.outbox.v1"),
      maxAgeMs: Outbox.DEFAULT_MAX_AGE_MS,
      send: (item) => API.request(item.method, item.path, item.body, { "idempotency-key": item.id }),
    });
  }
  return Outbox.live();
}

function isOfflineErr(e) {
  return !!(e && (e.code === "NETWORK" || e.messageKey === "error.network" || e.messageKey === "error.unavailable"));
}

async function queueOrSend(kind, method, path, body) {
  const box = driverOutbox();
  const item = box ? await box.enqueue({ kind, method, path, body: body || null }) : null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    toast(t("j_queued"));
    return { queued: true };
  }
  if (box) {
    const r = await box.flush();
    if (r.stopped === "network") { toast(t("j_queued")); return { queued: true }; }
    const mine = box.review().find((i) => item && i.id === item.id);
    if (mine && mine.status === "conflict") {
      throw Object.assign(new Error(mine.lastError), { messageKey: mine.lastError });
    }
    return { ok: true };
  }
  try {
    return await API.request(method, path, body);
  } catch (e) {
    if (isOfflineErr(e)) { toast(t("j_queued")); return { queued: true }; }
    throw e;
  }
}

async function flushDriverOutbox() {
  const box = driverOutbox();
  if (!box) return;
  await box.flush();
}

async function dutyAct(fn) {
  S.stopBusy = true; render();
  try { await fn(); S.stopBusy = false; render(); }
  catch (e) { S.stopBusy = false; toast(errText(e.messageKey)); render(); }
}

async function cashTap(bookingId) {
  if (typeof API.cashCollected !== "function") return;
  try { await queueOrSend("cash", "POST", "/payments/cash-collected", { bookingId }); toast(t("cashCollected")); }
  catch (e) { toast(errText(e.messageKey)); }
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
