/* ══════════════════════════════════════════════════════════════════════
   6. AUTH SCREENS  (R-01 … R-05)
   ══════════════════════════════════════════════════════════════════════ */
function authWelcome(){                                       // R-01
  return $("div",{class:"appcol"},
    $("div",{class:"hero"},
      $("div",{class:"logomark"}, icon("logo")),
      $("div",{class:"stack gap2 center"},
        $("h1",{class:"t-display",text:t("brand")}),
        $("div",{class:"t-cap",text:t("tagline")})),
      MapView({h:180, walk:true})),
    $("div",{class:"authfoot"},
      Btn({label:t("getStarted"), block:true, on:()=>{S.authStep="phone"; S.authed=false; render();}}),
      Btn({label:t("browse"), kind:"secondary", block:true,
           on:()=>{S.authed=true; S.page="routes"; render();}})));
}

function authPhone(){                                         // R-02
  return $("div",{class:"appcol"},
    topbar({title:"", back:()=>{S.authStep="welcome"; render();}, plain:true}),
    $("div",{class:"main"},
      $("h1",{class:"t-title",text:t("phoneLabel")}),
      $("div",{class:"t-cap",text:t("phoneHelp")}),
      $("div",{class:"row gap2 mt4"},
        $("span",{class:"chip chip--outline ltr",text:"+20"}),
        $("input",{class:"input grow ltr",attrs:{type:"tel", inputmode:"numeric",
          placeholder:"100 000 0000", "aria-label":t("phoneLabel")}}))),
    $("div",{class:"authfoot"},
      Btn({label:t("continue"), block:true, on:()=>{S.authStep="otp"; render();}})));
}

function authOtp(){                                           // R-03
  const boxes=$("div",{class:"otp"});
  for(let i=0;i<6;i++) boxes.append($("input",{
    attrs:{inputmode:"numeric", maxlength:"1", "aria-label":`Digit ${i+1}`}}));
  return $("div",{class:"appcol"},
    topbar({title:"", back:()=>{S.authStep="phone"; render();}, plain:true}),
    $("div",{class:"main"},
      $("h1",{class:"t-title",text:t("otpTitle")}),
      $("div",{class:"t-cap"}, `${t("otpSent")} `, $("span",{class:"ltr",text:DATA.user.phone})),
      $("div",{class:"mt4"}, boxes),
      $("div",{class:"row gap3 mt4",style:{justifyContent:"center"}},
        $("span",{class:"t-cap",text:`${t("resendIn")} 0:42`}),
        Btn({label:t("wrongNumber"), kind:"ghost", on:()=>{S.authStep="phone"; render();}}))),
    $("div",{class:"authfoot"},
      Btn({label:t("verify"), block:true, on:()=>{S.authStep="name"; render();}})));
}

function authName(){                                          // R-05
  return $("div",{class:"appcol"},
    topbar({title:"", plain:true}),
    $("div",{class:"main"},
      $("h1",{class:"t-title",text:t("yourName")}),
      $("div",{class:"t-cap",text:t("nameWhy")}),
      $("input",{class:"input mt4",attrs:{placeholder:t("yourName"),"aria-label":t("yourName")}})),
    $("div",{class:"authfoot"},
      Btn({label:t("finish"), block:true,
           on:()=>{S.authed=true; S.page="home"; S.stack=[]; render();}}),
      Btn({label:t("skip"), kind:"ghost", block:true,
           on:()=>{S.authed=true; S.page="home"; S.stack=[]; render();}})));
}

/* ══════════════════════════════════════════════════════════════════════
   7. RIDER SCREENS
   ══════════════════════════════════════════════════════════════════════ */
function riderHome(){                                         // R-10
  const w=$("div",{class:"main"});
  if(S.offline) w.append(Banner("offline", `${t("offlineBanner")} · ${t("lastSync")} 07:42`));

  /* Name, greeting and balance are in the top bar — not repeated here. */
  /* active ticket outranks everything else on this screen */
  w.append(Card("card--brand",
    $("div",{class:"row gap2"},
      Chip({label:t("yourRide"), kind:"brand"}),
      $("div",{class:"grow"}),
      $("strong",{class:"ltr",text:DATA.ticket.time})),
    $("div",{class:"t-lg",text:DATA.ticket.route}),
    $("div",{class:"t-cap",text:`${DATA.ticket.boarding} · 6 ${t("walk")}`}),
    $("div",{class:"row gap2 mt2"},
      Btn({label:t("showQr"), icon:"qr", on:()=>openSheet("qr")}),
      Btn({label:t("trackVehicle"), kind:"secondary", on:()=>go("waiting")}))));

  w.append(Section(t("nearby"), ...DATA.routes.slice(0,3).map(r=>RouteCard(r))));
  return w;
}

function riderRoutes(){                                       // R-11
  const w=$("div",{class:"main"});
  w.append(MapView({h:170, walk:false, vehicle:false}));
  w.append(Section(null, ...DATA.routes.map(r=>RouteCard(r))));
  return w;
}

function riderBoarding(){                                     // R-12
  const r=S.chosenRoute||DATA.routes[0];
  const w=$("div",{class:"main"});
  w.append($("div",{class:"stack gap1"},
    $("h1",{class:"t-head",text:L(r)}),
    $("div",{class:"t-cap",text:t("getOffAnywhere")})));
  w.append(MapView({h:170, walk:true, vehicle:false}));
  w.append(Section(t("whereBoard"),
    ...DATA.boardingPoints.map(b=> Row({
      icon:"walk",
      title: b.rec
        ? $("div",{class:"row gap2"}, $("strong",{text:L(b)}), Chip({label:t("recommended"),kind:"ok"}))
        : L(b),
      sub: b.ok ? `${b.walk} ${t("walk")}` : b.why,
      bordered:true, chev:b.ok, dis:!b.ok, selected:S.chosenBoard===b.id,
      on: b.ok ? ()=>{ S.chosenBoard=b.id; go("departures"); } : ()=>{}
    })),
    Row({ icon:"stops", title:t("streetPickup"),
      sub:`${t("streetPickupWhy")} · + ${money(DATA.streetPickupFare - r.fare)}`,
      bordered:true, chev:true,
      on:()=>{ S.chosenBoard="street"; go("departures"); } })));
  return w;
}

function riderDepartures(){                                   // R-13
  const street = S.chosenBoard==="street";
  const w=$("div",{class:"main"});
  w.append(Banner("info", t("getOffAnywhere")));
  DATA.departures.forEach(d=>{
    const fare = street ? DATA.streetPickupFare : d.fare;
    w.append(Row({
      title: $("div",{class:"row gap2"},
        $("strong",{class:"ltr",text:d.time}),
        d.rec?Chip({label:t("recommended"),kind:"ok"}):null),
      sub: `${street?t("streetPickup"):L(DATA.boardingPoints[0])} · ${t("arrives")} ${d.arrive} · ${d.seatsLeft} ${t("seats")}`,
      right: $("div",{class:"fare",text:money(fare)}),
      bordered:true, chev:true,
      on:()=>{ S.chosenDep=d; go("review"); }}));
  });
  return w;
}

function riderReview(){                                       // R-14
  const r=S.chosenRoute||DATA.routes[0], d=S.chosenDep||DATA.departures[0];
  const street=S.chosenBoard==="street";
  const unit=street?DATA.streetPickupFare:d.fare, total=unit*S.seats;
  const w=$("div",{class:"main"});
  w.append(Card("",
    $("div",{class:"pricetag ltr",text:money(total)}),
    $("div",{class:"t-micro",text:t("fixedPrice")}),
    Divider(),
    KV(L(r).split("—")[0].trim(), `${d.time} → ${d.arrive}`),
    KV(t("whereBoard"), street?t("streetPickup"):L(DATA.boardingPoints[0])),
    KV(t("seats"), `${S.seats} × ${money(unit)}`)));
  w.append($("div",{class:"row gap3"},
    $("span",{class:"grow t-lg",text:t("seats")}),
    $("div",{class:"stepper"},
      $("button",{attrs:{type:"button","aria-label":"−", disabled:S.seats<=1?true:null},
        on:{click:()=>{ if(S.seats>1){S.seats--; render();} }}},"−"),
      $("span",{text:String(S.seats)}),
      $("button",{attrs:{type:"button","aria-label":"+", disabled:S.seats>=4?true:null},
        on:{click:()=>{ if(S.seats<4){S.seats++; render();} }}},"+"))));
  w.append(Panel($("div",{class:"t-micro",text:t("cancel")}),
                 $("div",{class:"t-cap",text:t("cancelTerms")})));
  w.append(Btn({label:t("confirmBooking"), block:true, on:()=>go("booked")}));
  return w;
}

function riderBooked(){                                       // R-15
  const w=$("div",{class:"main"});
  w.append($("div",{class:"hero"},
    $("div",{class:"logomark",style:{background:"var(--ok-bg)",color:"var(--ok)"}}, icon("check")),
    $("div",{class:"stack gap2 center"},
      $("h1",{class:"t-title",text:t("booked")}),
      $("div",{class:"t-cap",text:t("bookedBody")})),
    QRPanel({code:DATA.ticket.code})));
  w.append(Btn({label:t("yourRide"), block:true, on:()=>{S.stack=[]; go("waiting");}}));
  return w;
}

function riderWaiting(){                                      // R-20
  const v=DATA.vehicle;
  const w=$("div",{class:"main"});
  if(S.offline) w.append(Banner("offline", `${t("offlineBanner")} · ${t("lastSync")} 07:42`));
  w.append(MapView({h:190, walk:true}));
  w.append(Card("card--raised",
    $("div",{class:"row gap3"},
      $("div",{class:"stack grow gap1"},
        $("div",{class:"t-micro",text:t("arriving")}),
        $("div",{class:"t-display ltr",text:v.eta+" min"})),
      Btn({label:t("leaveNow"), on:()=>toast(t("leaveNow"))})),
    Divider(), VehicleId(v)));
  w.append($("div",{class:"row gap3"},
    Btn({label:t("showQr"), icon:"qr", block:true, on:()=>openSheet("qr")}),
    Btn({label:t("sos"), kind:"danger", icon:"sos", on:()=>openSheet("sos")})));
  return w;
}

function riderOnboard(){                                      // R-22
  const w=$("div",{class:"main"});
  w.append(Card("card--raised card--tight",
    $("div",{class:"t-micro",text:t("nextStop")}),
    $("div",{class:"t-title",text:L(DATA.routeStops[2])})));
  w.append($("div",{class:"stops"}, ...DATA.routeStops.map(s=>
    $("div",{class:`stop stop--${s.state==="done"?"done":s.state==="now"?"now":"next"}`},
      $("span",{class:"grow",text:L(s)}),
      s.state==="now"?Chip({label:t("nextStop"),kind:"brand"}):null))));
  w.append(Btn({label:t("imGettingOff"), block:true, driver:true,
    dis:S.gettingOff, on:()=>{ S.gettingOff=true; toast(t("imGettingOff")); }}));
  if(S.gettingOff) w.append(Banner("ok", t("imGettingOff")));
  w.append($("div",{class:"row gap3"},
    Btn({label:t("shareRide"), kind:"secondary", icon:"share", block:true,
         on:()=>toast(t("shareRide"))}),
    Btn({label:t("sos"), kind:"danger", icon:"sos", on:()=>openSheet("sos")})));
  return w;
}

function riderTrips(){                                        // R-30
  const w=$("div",{class:"main"});
  const seg=$("div",{class:"seg"});
  [["upcoming",t("upcoming")],["past",t("past")]].forEach(([k,lbl])=>
    seg.append($("button",{attrs:{type:"button","aria-pressed":String(S.tripTab===k)},
      text:lbl, on:{click:()=>{S.tripTab=k; render();}}})));
  w.append(seg);
  const list = S.tripTab==="upcoming" ? DATA.tripsUpcoming : DATA.tripsPast;
  if(!list.length){ w.append(Empty("trips", t("noTrips"), t("noTripsBody"),
    Btn({label:t("searchRoute"), on:()=>go("routes")}))); return w; }
  list.forEach(tr=> w.append(Row({
    icon:"bus", title:tr.route, sub:tr.when, bordered:true,
    right:$("div",{class:"stack",style:{alignItems:"flex-end"}},
      $("div",{class:"fare",text:money(tr.fare)}),
      Chip({label:tr.state, kind:tr.state==="cancelled"?"danger":tr.state==="confirmed"?"ok":""})),
    on:()=>openSheet("trip")})));
  return w;
}

function riderWallet(){                                       // R-40
  const w=$("div",{class:"main"});
  w.append(Card("card--brand",
    $("div",{class:"t-micro",text:t("balance")}),
    $("div",{class:"pricetag ltr",text:money(DATA.user.balance)}),
    $("div",{class:"row gap2 mt2"},
      Btn({label:t("addMoney"), icon:"plus", on:()=>openSheet("topup")}),
      Btn({label:t("subs"), kind:"secondary", on:()=>openSheet("subs")}))));
  w.append(Section(t("history"),
    ...DATA.walletHistory.map(h=> Row({
      icon:h.amount>0?"plus":"bus", title:h.label, sub:h.when, bordered:true,
      right:$("strong",{class:"ltr", style:{color:h.amount>0?"var(--ok)":"inherit"},
        text:(h.amount>0?"+":"")+money(h.amount)})}))));
  return w;
}

function riderSafety(){                                       // R-60
  const w=$("div",{class:"main"});
  w.append(Banner("info", t("safetyCentre")));
  w.append($("div",{class:"rowgroup"},
    Row({icon:"sos",   title:t("sos"), sub:t("emergency"), chev:true, on:()=>openSheet("sos")}),
    Row({icon:"share", title:t("shareTrip"), chev:true, on:()=>toast(t("shareTrip"))}),
    Row({icon:"phone", title:t("emergency"), chev:true, on:()=>openSheet("contacts")}),
    Row({icon:"flag",  title:t("reportProblem"), chev:true, on:()=>openSheet("report")}),
    Row({icon:"phone", title:t("callSupport"), chev:true, on:()=>toast(t("callSupport"))})));
  w.append(Card("card--tight",
    $("div",{class:"t-micro",text:t("vehicle")}),
    VehicleId(DATA.vehicle)));
  return w;
}

function riderProfile(){                                      // R-80
  const w=$("div",{class:"main"});
  w.append($("div",{class:"row gap3"},
    $("div",{class:"avatar avatar--lg",text:DATA.user.initials}),
    $("div",{class:"stack grow gap1"},
      $("strong",{class:"t-head",text:DATA.user.name}),
      $("div",{class:"t-cap ltr",text:DATA.user.phone}))));
  w.append($("div",{class:"rowgroup"},
    Row({icon:"globe", title:t("language"), right:langSeg()}),
    Row({icon:"moon",  title:t("theme"),    right:themeSeg()}),
    Row({icon:"bell",  title:t("notifications"), right:switchEl(true)})));
  w.append($("div",{class:"rowgroup"},
    Row({icon:"card",  title:t("wallet"), chev:true, on:()=>go("wallet")}),
    Row({icon:"trips", title:t("subs"), chev:true, on:()=>openSheet("subs")}),
    Row({icon:"safety",title:t("safetyCentre"), chev:true, on:()=>go("safety")})));
  w.append(Btn({label:t("signOut"), kind:"secondary", block:true,
    on:()=>{ S.authed=false; S.authStep="welcome"; render(); }}));
  return w;
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
  [["light","☀"],["dark","☾"]].forEach(([k,lbl])=>
    seg.append($("button",{attrs:{type:"button","aria-pressed":String(S.theme===k),
      "aria-label":k}, text:lbl, on:{click:()=>{S.theme=k; render();}}})));
  return seg;
}
function switchEl(on){
  return $("button",{class:"switch",attrs:{type:"button",role:"switch",
    "aria-checked":String(!!on),"aria-label":t("notifications")},
    on:{click:(e)=>{ const b=e.currentTarget;
      b.setAttribute("aria-checked", b.getAttribute("aria-checked")==="true"?"false":"true"); }}});
}
