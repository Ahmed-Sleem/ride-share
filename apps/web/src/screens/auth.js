/* ══════════════════════════════════════════════════════════════════════
   Auth screens — the REAL flows, wired to the API. No fabricated success:
   every action shows its true state (busy / error key / success). Staff sign
   in with phone-or-email + password; riders self-register with phone OTP
   (name collected once, before the single verify call); drivers apply from
   inside the app after their rider account exists.
   ══════════════════════════════════════════════════════════════════════ */
function auth() {
  const seg=$("div",{class:"seg"});
  [["staff",t("staffTab")],["rider",t("riderTab")]].forEach(([k,lbl])=>
    seg.append($("button",{attrs:{type:"button","aria-pressed":String(S.authTab===k)},
      text:lbl, on:{click:()=>{ S.authTab=k; S.authStep="phone"; S.authError=null; render(); }}})));

  return $("div",{class:"authwrap"},
    $("div",{class:"authwrap__card"},
      $("button",{class:"authwrap__back", attrs:{type:"button","aria-label":t("landingBack")},
        on:{click:()=>{ S.view="landing"; S.authError=null; render(); }}}, icon("back")),
      $("div",{class:"center"}, logoSVG(), null),
      $("h1",{class:"t-title center", text: S.authMode==="signup" ? t("createAccount") : t("signIn")}),
      seg,
      S.authTab==="staff" ? (S.authMode==="signin" ? staffSignin() : staffNotice()) : riderFlow(),
      S.authError ? Banner("danger", S.authError) : null,
      $("div",{class:"center mt3 stack gap1"},
        $("span",{class:"t-cap", text: S.authMode==="signin" ? t("needAccount") : t("haveAccount")}),
        $("button",{class:"btn btn--ghost", attrs:{type:"button"},
          text: S.authMode==="signin" ? t("createAccount") : t("signIn"),
          on:{click:()=>{ S.authMode = S.authMode==="signin" ? "signup" : "signin";
                          S.authStep="phone"; S.authError=null; render(); }}}))));
}

function staffSignin() {
  return $("div",{class:"stack gap3"},
    field("auth-identifier", t("identifierLabel"), "text"),
    field("auth-password", t("passwordLabel"), "password"),
    Btn({label:S.authBusy? "…" : t("signInAction"), block:true, dis:S.authBusy,
         on:()=>staffLogin()}));
}

/* Staff never self-register (DEC-032/033). Say so plainly, don't fake it. */
function staffNotice() {
  return $("div",{class:"stack gap3"},
    Banner("info", t("staffNoSelfSignup")));
}

function riderFlow() {
  const w=$("div",{class:"stack gap3"});
  if(S.authStep==="phone"){
    w.append(
      field("auth-phone", t("phoneLabel"), "tel"),
      Btn({label:S.authBusy? "…" : t("sendCode"), block:true, dis:S.authBusy, on:()=>riderSendCode()}));
  } else if(S.authStep==="otp"){
    w.append(
      $("p",{class:"t-cap"}, `${t("codeSent")} `, $("span",{class:"ltr",text:S.authPhone})),
      field("auth-code", t("codeLabel"), "text"),
      S.authMode==="signup"
        ? Btn({label:S.authBusy? "…" : t("continue"), block:true, dis:S.authBusy, on:()=>{ S.authStep="name"; render(); }})
        : Btn({label:S.authBusy? "…" : t("verifyCode"), block:true, dis:S.authBusy, on:()=>riderVerifyCode(null)}),
      $("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:t("wrongNumber"),
        on:{click:()=>{ S.authStep="phone"; S.authError=null; render(); }}}));
  } else if(S.authStep==="name"){
    w.append(
      field("auth-name", t("yourName"), "text"),
      Btn({label:S.authBusy? "…" : t("finish"), block:true, dis:S.authBusy, on:()=>riderVerifyCode(val("auth-name"))}));
  }
  return w;
}

/* ── helpers ──────────────────────────────────────────────────────────── */
function field(id, label, type) {
  return $("div",{class:"field"},
    $("label",{attrs:{for:id}, text:label}),
    $("input",{class:"input ltr", attrs:{id, type, autocomplete:"off", "aria-label":label}}));
}
const val = (id) => (document.getElementById(id)||{}).value || "";

async function staffLogin() {
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.login(val("auth-identifier"), val("auth-password"));
    API.saveSession(res);
    enterApp(res.user);
  } catch(e) { S.authError = e.messageKey || "error.internal"; S.authBusy=false; render(); }
}

async function riderSendCode() {
  const phone = val("auth-phone");
  if(!phone){ S.authError="validation.phone"; render(); return; }
  S.authBusy=true; S.authError=null; render();
  try {
    await API.requestOtp(phone);
    S.authPhone=phone; S.authStep="otp"; S.authBusy=false; render();
  } catch(e) { S.authError=e.messageKey||"error.internal"; S.authBusy=false; render(); }
}

async function riderVerifyCode(name) {
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.verifyOtp(S.authPhone, val("auth-code"), name || undefined);
    API.saveSession(res);
    enterApp(res.user);
  } catch(e) { S.authError=e.messageKey||"error.internal"; S.authBusy=false; render(); }
}
