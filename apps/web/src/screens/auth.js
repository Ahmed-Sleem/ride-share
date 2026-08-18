/* ══════════════════════════════════════════════════════════════════════
   Auth screens — the REAL flows, wired to the API. No fabricated success.
   Resend respects the backend's 60s cooldown (a live countdown); a 1-hour
   lockout after 3 failures is shown honestly. Forgot-password and email
   verification share the same style and the same error-key handling.
   ══════════════════════════════════════════════════════════════════════ */
function auth() {
  // forgot-password takes over the whole card
  if (S.forgot) return forgotPassword();

  const seg=$("div",{class:"seg"});
  [["staff",t("staffTab")],["rider",t("riderTab")]].forEach(([k,lbl])=>
    seg.append($("button",{attrs:{type:"button","aria-pressed":String(S.authTab===k)},
      text:lbl, on:{click:()=>{ S.authTab=k; S.authStep="phone"; S.authError=null; render(); }}})));

  const body = S.authTab==="staff" ? (S.authMode==="signin" ? staffSignin() : staffNotice()) : riderFlow();

  return $("div",{class:"authwrap"},
    $("div",{class:"authwrap__card"},
      $("button",{class:"authwrap__back", attrs:{type:"button","aria-label":t("landingBack")},
        on:{click:()=>{ S.view="landing"; S.authError=null; render(); }}}, icon("back")),
      $("div",{class:"center"}, logoSVG(), null),
      $("h1",{class:"t-title center", text: S.authMode==="signup" ? t("createAccount") : t("signIn")}),
      seg,
      body,
      lockoutBanner(),
      S.authError ? Banner("danger", S.authError) : null,
      S.authMode==="signin" && S.authTab==="staff"
        ? $("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:t("forgotPassword"),
            on:{click:()=>{ S.forgot="identify"; S.authError=null; render(); }}})
        : null,
      $("div",{class:"center mt3 stack gap1"},
        $("span",{class:"t-cap", text: S.authMode==="signin" ? t("needAccount") : t("haveAccount")}),
        $("button",{class:"btn btn--ghost", attrs:{type:"button"},
          text: S.authMode==="signin" ? t("createAccount") : t("signIn"),
          on:{click:()=>{ S.authMode = S.authMode==="signin" ? "signup" : "signin";
                          S.authStep="phone"; S.authError=null; render(); }}}))));
}

/* ── staff ────────────────────────────────────────────────────────────── */
function staffSignin() {
  return $("div",{class:"stack gap3"},
    field("auth-identifier", t("identifierLabel"), "text"),
    field("auth-password", t("passwordLabel"), "password"),
    Btn({label:S.authBusy? "…" : t("signInAction"), block:true, dis:S.authBusy, on:()=>staffLogin()}));
}

/* Staff never self-register (DEC-032/033). Say so plainly, don't fake it. */
function staffNotice() {
  return $("div",{class:"stack gap3"}, Banner("info", t("staffNoSelfSignup")));
}

/* ── rider ────────────────────────────────────────────────────────────── */
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
      resendButton(),
      $("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:t("wrongNumber"),
        on:{click:()=>{ S.authStep="phone"; S.authError=null; render(); }}}));
  } else if(S.authStep==="name"){
    w.append(
      field("auth-name", t("yourName"), "text"),
      Btn({label:S.authBusy? "…" : t("finish"), block:true, dis:S.authBusy, on:()=>riderVerifyCode(val("auth-name"))}));
  }
  return w;
}

/* Resend control with a live 60s countdown (driven by the server's
   resendInMs). Disabled while counting; honours the 1-hour lockout. */
function resendButton() {
  const remaining = Math.max(0, Math.round(((S.resendUntil||0) - Date.now()) / 1000));
  const dis = remaining > 0 || S.authBusy;
  const btn = $("button",{class:"btn btn--ghost", attrs:{type:"button", disabled:dis||null},
    text: dis && remaining > 0 ? `${t("resendIn")} ${remaining}${t("seconds")}` : t("resendCode"),
    on:{click:()=>{ S.authStep="phone"; S.authError=null; render(); }}});
  if (remaining > 0) setTimeout(()=>render(), 1000);
  return btn;
}

function lockoutBanner() {
  if (!S.lockedUntil) return null;
  const until = new Date(S.lockedUntil).getTime();
  if (until <= Date.now()) return null;
  return Banner("danger", t("tooManyAttempts"));
}

/* ── forgot password ──────────────────────────────────────────────────── */
function forgotPassword() {
  const step = S.forgot; // 'identify' | 'code' | 'newpass' | 'done'
  const w=$("div",{class:"stack gap3"});
  if(step==="identify"){
    w.append($("p",{class:"t-cap",text:t("resetIdentify")}),
      field("reset-identifier", t("identifierLabel"), "text"),
      Btn({label:S.authBusy? "…" : t("sendCode"), block:true, dis:S.authBusy, on:()=>resetRequest()}));
  } else if(step==="code"){
    w.append($("p",{class:"t-cap",text:t("resetCodeSent")}),
      field("reset-code", t("codeLabel"), "text"),
      field("reset-password", t("newPassword"), "password"),
      Btn({label:S.authBusy? "…" : t("verifyCode"), block:true, dis:S.authBusy, on:()=>resetConfirm()}));
  } else if(step==="done"){
    w.append(Banner("ok", t("resetDone")));
  }
  return $("div",{class:"authwrap"},
    $("div",{class:"authwrap__card"},
      $("button",{class:"authwrap__back", attrs:{type:"button","aria-label":t("landingBack")},
        on:{click:()=>{ S.forgot=null; S.view="landing"; S.authError=null; render(); }}}, icon("back")),
      $("div",{class:"center"}, logoSVG(), null),
      $("h1",{class:"t-title center", text: step==="done" ? t("signIn") : t("resetTitle")}),
      w,
      lockoutBanner(),
      S.authError ? Banner("danger", S.authError) : null,
      step==="done"
        ? Btn({label:t("signInAction"), block:true, on:()=>{ S.forgot=null; S.view="auth"; S.authMode="signin"; S.authTab="staff"; S.authError=null; render(); }})
        : $("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:t("landingBack"),
            on:{click:()=>{ S.forgot=null; S.view="auth"; S.authMode="signin"; S.authTab="staff"; render(); }}})));
}

/* ── helpers + actions ────────────────────────────────────────────────── */
function field(id, label, type) {
  return $("div",{class:"field"},
    $("label",{attrs:{for:id}, text:label}),
    $("input",{class:"input ltr", attrs:{id, type, autocomplete:"off", "aria-label":label}}));
}
const val = (id) => (document.getElementById(id)||{}).value || "";
const resetLockout = (e) => {
  const d = e.payload && e.payload.details;
  if (d && d.retryAfterMs) { S.resendUntil = Date.now() + d.retryAfterMs; }
  if (d && d.lockedUntil) { S.lockedUntil = d.lockedUntil; }
  if (e.code === "TOO_MANY_REQUESTS" && !d) S.authError = "error.too_many_requests";
};

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
  S.authBusy=true; S.authError=null; S.lockedUntil=null; render();
  try {
    const res = await API.requestOtp(phone);
    S.authPhone=phone; S.authStep="otp"; S.authBusy=false;
    S.resendUntil = Date.now() + (res.resendInMs || 60000);
    render();
  } catch(e) { resetLockout(e); S.authError=e.messageKey||"error.internal"; S.authBusy=false; render(); }
}

async function riderVerifyCode(name) {
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.verifyOtp(S.authPhone, val("auth-code"), name || undefined);
    API.saveSession(res);
    enterApp(res.user);
  } catch(e) { resetLockout(e); S.authError=e.messageKey||"error.internal"; S.authBusy=false; render(); }
}

async function resetRequest() {
  S.authBusy=true; S.authError=null; render();
  try {
    await API.requestPasswordReset(val("reset-identifier"));
    S.forgot="code"; S.authBusy=false; render();
  } catch(e) { resetLockout(e); S.authError=e.messageKey||"error.internal"; S.authBusy=false; render(); }
}

async function resetConfirm() {
  S.authBusy=true; S.authError=null; render();
  try {
    await API.confirmPasswordReset(val("reset-identifier"), val("reset-code"), val("reset-password"));
    S.forgot="done"; S.authBusy=false; render();
  } catch(e) { resetLockout(e); S.authError=e.messageKey||"error.internal"; S.authBusy=false; render(); }
}
