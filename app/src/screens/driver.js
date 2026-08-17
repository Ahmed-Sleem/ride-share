/* ══════════════════════════════════════════════════════════════════════
   8. DRIVER SCREENS — bigger targets, glanceable
   ══════════════════════════════════════════════════════════════════════ */
function driverDuty(){                                        // D-10
  const d=DATA.driverToday;
  const w=$("div",{class:"main"});
  if(S.offline) w.append(Banner("offline", `${t("offlineBanner")} · 3 ${t("queued")}`));
  w.append($("div",{class:"row gap2"},
    Chip({label:DATA.vehicle.plate, kind:"info"}),
    $("div",{class:"grow"}),
    Chip({label:S.onDuty?t("online"):t("offline"), kind:S.onDuty?"ok":"", dot:true})));

  w.append(Btn({ label:S.onDuty?t("goOffline"):t("goOnline"),
    kind:S.onDuty?"secondary":"primary", block:true, driver:true,
    on:()=>{ S.onDuty=!S.onDuty; toast(S.onDuty?t("online"):t("offline")); }}));

  w.append($("div",{class:"grid grid--tight"},
    Metric({v:String(d.journeys), l:t("today")}),
    Metric({v:money(d.earned), l:t("earnings")}),
    Metric({v:money(d.cash), l:t("cashToSettle")})));

  w.append(Section(t("myDepartures"), ...(DATA.claims.length
    ? DATA.claims.map(c=> Row({
        icon:"clock",
        title:$("div",{class:"row gap2"},
          $("strong",{class:"ltr",text:c.time}),
          c.committed?Chip({label:"committed",kind:"ok"}):Chip({label:"provisional",kind:"warn"})),
        sub:`${c.route} · ${c.date} · ${c.booked}/${c.seats} ${t("seats")}`,
        bordered:true, chev:true, on:()=>go("journey")}))
    : [Empty("clock", t("noClaims"), t("noClaimsBody"),
        Btn({label:t("nav.work"), on:()=>go("work")}))])));

  if(d.cash>0) w.append(Banner("warn", `${t("cashToSettle")}: ${money(d.cash)}`));
  return w;
}

function driverWork(){                                        // D-11
  const w=$("div",{class:"main"});
  DATA.routes.slice(0,2).forEach(r=>{
    const card=Card("",
      $("div",{class:"row gap3"},
        $("div",{class:"stack grow gap1"},
          $("strong",{text:L(r)}),
          $("div",{class:"t-cap",text:`${r.window} · ${t("fixedPrice")}`})),
        $("div",{class:"fare",text:money(r.fare)})));

    const grid=$("div",{class:"row wrap gap2"});
    DATA.slots.forEach(s=>{
      const taken=s.state==="taken", mine=s.state==="claimed";
      grid.append(Chip({
        label: s.time + (s.demand ? ` · ${s.demand}` : ""),
        kind: mine ? "brand" : taken ? "" : "info",
        dis: taken || mine,
        pressed: mine,
        on: (taken||mine) ? ()=>{} : ()=>openSheet("claim")}));
    });
    card.append(grid);

    /* Recommendation carries its evidence. A number with no source is not shown. */
    const hot=DATA.slots.find(s=>s.demand>0 && s.state==="open");
    if(hot) card.append($("div",{class:"alert"},
      $("div",{class:"row gap2"},
        $("strong",{class:"ltr",text:hot.time}),
        $("div",{class:"grow"}),
        hot.bonus?Chip({label:"+"+money(hot.bonus),kind:"ok"}):null),
      $("div",{class:"t-cap",text:`${hot.demand} ${t("ridersWaiting")}`}),
      Btn({label:t("claimSlot"), driver:true, on:()=>openSheet("claim")})));
    w.append(card);
  });
  return w;
}

function driverJourney(){                                     // D-20
  const w=$("div",{class:"main"});
  if(S.offline) w.append(Banner("offline",
    `${t("offlineBanner")} · 3 ${t("queued")} · ${t("lastSync")} 07:42`));
  w.append(Card("card--raised card--tight",
    $("div",{class:"row gap2"},
      $("div",{class:"t-micro grow",text:t("nextStop")}),
      Chip({label:t("onTime"),kind:"ok"})),
    $("div",{class:"t-title",text:L(DATA.routeStops[2])}),
    $("div",{class:"t-cap",text:"400 m · 2 min"})));
  w.append(MapView({h:160}));

  w.append($("div",{class:"t-micro"},t("boarding")));
  DATA.manifest.filter(m=>!m.alighting).forEach(m=>
    w.append($("div",{class:"manifest"},
      $("div",{class:"avatar",text:m.initials}),
      $("div",{class:"stack grow gap1"},
        $("strong",{text:m.name}),
        $("div",{class:"t-cap",text:`${m.stop} · ${m.seats} ${t("seats")}`})),
      Chip({label:m.scanned?t("scanned"):t("notScanned"), kind:m.scanned?"ok":"warn"}))));

  const off=DATA.manifest.filter(m=>m.alighting);
  if(off.length){
    w.append($("div",{class:"t-micro"},t("alighting")));
    off.forEach(m=> w.append($("div",{class:"manifest"},
      $("div",{class:"avatar",text:m.initials}),
      $("div",{class:"stack grow gap1"},
        $("strong",{text:m.name}),
        $("div",{class:"t-cap",text:m.stop})),
      Chip({label:t("alighting"),kind:"info"}))));
  }

  w.append($("div",{class:"row gap3"},
    Btn({label:t("scan"), driver:true, block:true, icon:"qr", on:()=>openSheet("scan")}),
    Btn({label:t("arrived"), kind:"secondary", driver:true, block:true,
         on:()=>toast(t("arrived"))})));
  w.append($("div",{class:"row gap3"},
    Btn({label:t("reportIssue"), kind:"ghost", block:true, on:()=>openSheet("report")}),
    Btn({label:t("endJourney"), kind:"ghost", block:true, on:()=>toast(t("endJourney"))})));
  return w;
}

function driverEarnings(){                                    // D-30
  const d=DATA.driverToday;
  const w=$("div",{class:"main"});
  w.append($("div",{class:"grid grid--tight"},
    Metric({v:money(d.earned), l:t("today")}),
    Metric({v:money(1840), l:"This week"}),
    Metric({v:money(d.cash), l:t("cashToSettle")}),
    Metric({v:d.nextPayout, l:t("nextPayout")})));
  w.append(Panel($("div",{class:"t-micro",text:t("payouts")}),
    KV("Gross", money(1840)),
    KV("Commission (20%)", "− "+money(368)),
    KV(t("cashToSettle"), "− "+money(d.cash)),
    Divider(),
    KV("Net", money(1292))));
  w.append(Section(t("documents"),
    ...DATA.driverDocs.map(doc=> Row({
      icon:"doc", title:doc.name, sub:`${t("expires")} ${doc.expires}`, bordered:true,
      right:Chip({label:doc.state==="soon"?t("expires"):"OK",
                  kind:doc.state==="soon"?"warn":"ok"})}))));
  return w;
}

function driverProfile(){                                     // D-40
  const w=$("div",{class:"main"});
  w.append($("div",{class:"row gap3"},
    $("div",{class:"avatar avatar--lg"}, icon("profile")),
    $("div",{class:"stack grow gap1"},
      $("strong",{class:"t-head",text:DATA.vehicle.driver}),
      $("div",{class:"t-cap",text:`★ ${DATA.vehicle.rating} · ${DATA.vehicle.plate}`}))));
  w.append(Card("card--tight", $("div",{class:"t-micro",text:t("vehicle")}), VehicleId(DATA.vehicle)));
  w.append($("div",{class:"rowgroup"},
    Row({icon:"globe", title:t("language"), right:langSeg()}),
    Row({icon:"moon",  title:t("theme"),    right:themeSeg()}),
    Row({icon:"doc",   title:t("documents"), chev:true, on:()=>go("earnings")}),
    Row({icon:"safety",title:t("safetyCentre"), chev:true, on:()=>openSheet("sos")})));
  w.append(Btn({label:t("signOut"), kind:"secondary", block:true,
    on:()=>{ S.authed=false; S.authStep="welcome"; render(); }}));
  return w;
}
