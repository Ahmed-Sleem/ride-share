/* ══════════════════════════════════════════════════════════════════════
   6. RIDER SCREENS — auth screens live in screens/auth.js
   ══════════════════════════════════════════════════════════════════════ */
function riderHome(){                                         // R-10
  const u = S.user || {};
  const w=$("div",{class:"main"});
  /* Real identity, honest content: routes are not mapped yet (M2). */
  w.append(Card("card--brand",
    $("div",{class:"t-micro",text:t("greeting")}),
    $("div",{class:"t-lg",text:u.name || "—"}),
    $("div",{class:"t-cap",text:t("tagline")})));
  w.append(Empty("routes", t("comingSoon"), t("routesComingBody")));
  return w;
}

function riderRoutes(){                                       // R-11
  const w=$("div",{class:"main"});
  w.append(Empty("routes", t("comingSoon"), t("routesComingBody")));
  return w;
}

/* Booking, boarding and live tracking arrive with routes (M3). Until then
   every step of the journey shows the same honest "coming soon" state. */
function comingSoonRider(){
  const w=$("div",{class:"main"});
  w.append(Empty("clock", t("comingSoon"), t("bookingComingBody")));
  return w;
}
function riderBoarding(){ return comingSoonRider(); }         // R-12
function riderDepartures(){ return comingSoonRider(); }       // R-13
function riderReview(){ return comingSoonRider(); }           // R-14
function riderBooked(){ return comingSoonRider(); }           // R-15
function riderWaiting(){ return comingSoonRider(); }          // R-20
function riderOnboard(){ return comingSoonRider(); }          // R-22

function riderTrips(){                                        // R-30
  const w=$("div",{class:"main"});
  const seg=$("div",{class:"seg"});
  [["upcoming",t("upcoming")],["past",t("past")]].forEach(([k,lbl])=>
    seg.append($("button",{attrs:{type:"button","aria-pressed":String(S.tripTab===k)},
      text:lbl, on:{click:()=>{S.tripTab=k; render();}}})));
  w.append(seg);
  /* Real bookings don't exist yet (M3) — no invented trips. */
  w.append(Empty("trips", t("noTrips"), t("noTripsBody")));
  return w;
}

function riderWallet(){                                       // R-40
  const w=$("div",{class:"main"});
  /* Wallet and payments arrive with booking (M3) — no invented balance. */
  w.append(Empty("wallet", t("comingSoon"), t("walletComingBody")));
  return w;
}

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
    Row({icon:"trips", title:t("subs"), chev:true, on:()=>openSheet("subs")}),
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
