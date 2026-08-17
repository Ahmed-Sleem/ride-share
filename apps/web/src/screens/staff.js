/* ══════════════════════════════════════════════════════════════════════
   9. OPERATIONS
   ══════════════════════════════════════════════════════════════════════ */
function opsQueue(){                                          // O-10
  if(S.opsView==="review") return opsReview();
  const w=$("div",{class:"main"});
  w.append($("div",{class:"grid grid--tight"},
    Metric({v:"49", l:t("waiting")}),
    Metric({v:"2",  l:"Incidents"}),
    Metric({v:"11 min", l:t("oldest")})));
  DATA.opsQueue.forEach(q=> w.append(Row({
    icon:"queue",
    title:$("div",{class:"row gap2"},
      q.severity!=="none"
        ? $("span",{class:"dot",style:{color:q.severity==="danger"?"var(--danger)":"var(--warn)"}})
        : null,
      $("strong",{text:q.label})),
    sub:`${t("oldest")}: ${q.oldest}`,
    right:Chip({label:String(q.count), kind:q.severity==="danger"?"danger":"info"}),
    bordered:true, chev:true,
    on:()=>{ S.opsView="review"; render(); }})));
  return w;
}

function opsReview(){                                         // O-12
  const a=DATA.applicant;
  const w=$("div",{class:"main"});
  w.append($("div",{class:"row gap2"},
    $("h1",{class:"t-head grow",text:a.name}),
    Chip({label:a.submitted, kind:"warn"})));
  const docs=$("div",{class:"row wrap gap3"});
  a.docs.forEach(d=> docs.append($("div",{class:"card card--tight",style:{width:"152px"}},
    $("div",{class:"skeleton",style:{height:"92px"}}),
    $("div",{class:"t-cap",text:d}))));
  w.append(Card("", $("div",{class:"t-micro",text:t("documents")}), docs));
  w.append(Card("card--tight", KV("Phone", a.phone), KV("Duplicate check","No match")));
  w.append($("div",{class:"field"},
    $("label",{text:t("reason")}),
    $("textarea",{class:"input",attrs:{placeholder:t("reason")}})));
  w.append($("div",{class:"row wrap gap3"},
    Btn({label:t("approve"), on:()=>{S.opsView=null; toast(t("approve"));}}),
    Btn({label:t("needsFix"), kind:"secondary", on:()=>{S.opsView=null; toast(t("needsFix"));}}),
    Btn({label:t("reject"), kind:"danger", on:()=>{S.opsView=null; toast(t("reject"));}})));
  return w;
}

function opsLiveMap(){                                        // O-17
  const w=$("div",{class:"main"});
  w.append(MapView({h:260, fleet:true, vehicle:false}));
  w.append(Table([t("vehicle"),"Route","Driver","Schedule"],
    DATA.opsVehicles.map(v=> $("tr",{},
      $("td",{},$("strong",{class:"ltr",text:v.plate})),
      $("td",{text:v.route}),
      $("td",{text:v.driver}),
      $("td",{},Chip({label:v.slip,
        kind:v.slip.startsWith("+9")?"warn":v.state==="idle"?"":"ok"}))))));
  return w;
}

function opsStops(){                                          // O-18 / O-20
  const w=$("div",{class:"main"});
  w.append(MapView({h:180, vehicle:false}));
  w.append(Table(["Stop","Route","State","Source"],
    DATA.opsStops.map(s=> $("tr",{},
      $("td",{},$("strong",{text:s.name})),
      $("td",{text:s.route}),
      $("td",{},Chip({label:s.state,
        kind:s.state==="verified"?"ok":s.state==="rejected"?"danger":"warn"})),
      $("td",{},$("span",{class:"t-cap",text:s.by}))))));
  return w;
}

function opsRoutes(){                                         // O-23
  const w=$("div",{class:"main"});
  w.append(Banner("info","Slots published here are what drivers can claim."));
  DATA.routes.forEach(r=>{
    const card=Card("",
      $("div",{class:"row gap3"},
        $("div",{class:"stack grow gap1"},
          $("strong",{text:L(r)}),
          $("div",{class:"t-cap",text:`${r.stops} stops · ${r.window}`})),
        Chip({label:money(r.fare), kind:"info"})));
    const grid=$("div",{class:"row wrap gap2"});
    DATA.slots.forEach(s=> grid.append(Chip({
      label:s.time, kind:s.state==="open"?"warn":"ok"})));
    card.append(grid);
    card.append($("div",{class:"row gap2"},
      Btn({label:"Edit slots", kind:"secondary", on:()=>toast("Edit slots")}),
      Btn({label:"Publish", kind:"ghost", on:()=>toast("Published")})));
    w.append(card);
  });
  return w;
}

function opsUsers(){                                          // O-22
  const w=$("div",{class:"main"});
  w.append(Table(["Name","Role","State",""],
    [["Nour","Rider","active"],["Mahmoud A.","Driver","active"],
     ["Tarek S.","Driver","suspended"],["Yara M.","Support agent","active"]]
    .map(([n,r,st])=> $("tr",{},
      $("td",{},$("strong",{text:n})),
      $("td",{text:r}),
      $("td",{},Chip({label:st, kind:st==="active"?"ok":"danger"})),
      $("td",{},Btn({label:t("open"), kind:"ghost", on:()=>toast(n)}))))));
  return w;
}

/* ══════════════════════════════════════════════════════════════════════
   10. MANAGER
   ══════════════════════════════════════════════════════════════════════ */
function managerBoard(){                                      // G-10
  const w=$("div",{class:"main"});
  w.append($("div",{class:"grid grid--tight"}, ...DATA.metrics.map(Metric)));
  w.append(MapView({h:200, fleet:true, vehicle:false}));
  w.append(Section("Alerts", ...DATA.alerts.map(a=>
    $("div",{class:`alert${a.kind==="ok"?" alert--ok":""}`},
      $("div",{class:"row gap2"},
        $("strong",{class:"grow",text:a.zone}),
        Chip({label:a.kind==="ok"?"clear":"action", kind:a.kind==="ok"?"ok":"warn"})),
      $("div",{class:"t-cap",text:a.body}),
      a.kind!=="ok" ? $("div",{class:"row wrap gap2"},
        Btn({label:t("launchSale"), on:()=>toast(t("launchSale"))}),
        Btn({label:t("notifyRiders"), kind:"secondary", on:()=>toast(t("notifyRiders"))}),
        Btn({label:t("dismiss"), kind:"ghost", on:()=>toast(t("dismiss"))})) : null))));
  return w;
}

function managerCoverage(){                                   // G-11
  const w=$("div",{class:"main"});
  w.append(Banner("warn","2 windows are short of drivers."));
  w.append(Table(["Slot","Route","Need","Claimed",""],
    DATA.coverage.map(c=> $("tr",{},
      $("td",{},$("strong",{class:"ltr",text:c.slot})),
      $("td",{text:c.route}),
      $("td",{},$("span",{class:"ltr",text:String(c.need)})),
      $("td",{},$("span",{class:"ltr",text:String(c.claimed)})),
      $("td",{}, c.state==="short"
        ? Btn({label:"Add bonus", kind:"ghost", on:()=>toast("Bonus added")})
        : Chip({label:"covered", kind:"ok"}))))));
  return w;
}

function managerPricing(){                                    // G-13
  const w=$("div",{class:"main"});
  w.append(Banner("info","Changes are previewed against recent journeys before publishing."));
  w.append(Table(["Route","Stop fare","Street fare","Updated",""],
    DATA.fares.map(f=> $("tr",{},
      $("td",{},$("strong",{text:f.route})),
      $("td",{},$("span",{class:"ltr",text:money(f.stop)})),
      $("td",{},$("span",{class:"ltr",text:money(f.street)})),
      $("td",{},$("span",{class:"t-cap",text:f.updated})),
      $("td",{},Btn({label:"Edit", kind:"ghost", on:()=>openSheet("fare")}))))));
  return w;
}

function managerPromos(){                                     // G-15
  const w=$("div",{class:"main"});
  w.append(Btn({label:"New promotion", icon:"plus", on:()=>toast("New promotion")}));
  w.append(Table(["Name","Type","Window","State","Uses"],
    DATA.promos.map(p=> $("tr",{},
      $("td",{},$("strong",{text:p.name})),
      $("td",{text:p.type}),
      $("td",{},$("span",{class:"ltr",text:p.window})),
      $("td",{},Chip({label:p.state, kind:p.state==="running"?"ok":"warn"})),
      $("td",{},$("span",{class:"ltr",text:String(p.uses)}))))));
  return w;
}

function managerAnalytics(){                                  // G-18
  const w=$("div",{class:"main"});
  w.append($("div",{class:"grid grid--tight"},
    ...DATA.analytics.map(a=> $("div",{class:"metric"},
      $("div",{class:"metric__v ltr",text:a.v}),
      $("div",{class:"metric__l",text:a.l}),
      $("div",{class:"t-cap",text:a.d})))));
  w.append(Card("", $("div",{class:"t-micro",text:"Rides per day"}), sparkline()));
  return w;
}
function sparkline(){
  const ns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 300 90");
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label","Rides per day, last 7 days, trending up");
  svg.setAttribute("style","width:100%;height:90px");
  const pts=[38,44,41,52,58,55,68];
  const d=pts.map((v,i)=>`${i===0?"M":"L"}${i*48+6},${88-v}`).join(" ");
  svg.innerHTML=`<path d="${d}" fill="none" stroke="var(--brand)" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((v,i)=>`<circle cx="${i*48+6}" cy="${88-v}" r="3" fill="var(--brand)"/>`).join("")}`;
  return svg;
}

/* ══════════════════════════════════════════════════════════════════════
   11. SUPPORT
   ══════════════════════════════════════════════════════════════════════ */
function supportLookup(){                                     // S-11
  const w=$("div",{class:"main"});
  w.append(Card("",
    $("div",{class:"row gap3"},
      $("div",{class:"avatar",text:"N"}),
      $("div",{class:"stack grow gap1"},
        $("strong",{text:"Nour"}),
        $("div",{class:"t-cap ltr",text:DATA.user.phone})),
      Chip({label:"Active ride", kind:"ok"})),
    Divider(),
    KV("Route", DATA.ticket.route),
    KV("Boarding", DATA.ticket.boarding),
    KV("Departure", DATA.ticket.time),
    KV("Fare", money(DATA.ticket.fare)),
    Divider(),
    $("div",{class:"row wrap gap2"},
      Btn({label:"Contact rider", kind:"secondary", on:()=>toast("Calling")}),
      Btn({label:"Cancel ride", kind:"secondary", on:()=>toast("Cancelled")}),
      Btn({label:"Refund (max 1 fare)", kind:"secondary", on:()=>toast("Refunded")}),
      Btn({label:"Escalate", kind:"ghost", on:()=>toast("Escalated")}))));
  /* Identity documents are not rendered at all for this role — not shown disabled. */
  return w;
}

function supportTickets(){                                    // S-12
  const w=$("div",{class:"main"});
  w.append(Table(["Ref","Subject","Rider","Age","State"],
    DATA.tickets.map(k=> $("tr",{},
      $("td",{},$("strong",{class:"ltr",text:k.ref})),
      $("td",{text:k.subject}),
      $("td",{text:k.who}),
      $("td",{},$("span",{class:"t-cap",text:k.age})),
      $("td",{},Chip({label:k.state, kind:k.state==="open"?"warn":""}))))));
  return w;
}

function supportLost(){                                       // S-14
  const w=$("div",{class:"main"});
  w.append(Btn({label:"Log an item", icon:"plus", on:()=>toast("Logged")}));
  DATA.lost.forEach(l=> w.append(Row({
    icon:"lost", title:l.item, sub:`${l.route} · ${l.when}`, bordered:true,
    right:Chip({label:l.state, kind:l.state==="claimed"?"ok":"warn"})})));
  return w;
}
