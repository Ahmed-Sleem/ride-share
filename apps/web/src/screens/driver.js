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
  w.append(Empty("clock", t("noClaims"), t("dutyComingBody")));
  return w;
}

function driverWork(){                                        // D-11
  const w=$("div",{class:"main"});
  w.append(Empty("work", t("nav.work"), t("workComingBody")));
  return w;
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
