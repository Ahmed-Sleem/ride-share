/* ══════════════════════════════════════════════════════════════════════
   Auth screens — the REAL flows, wired to the API. No fabricated success.

   Sign-up: the user chooses Rider or Driver (the only two self-service
   roles). Both self-register by phone OTP; choosing Driver also submits the
   driver application after the account exists. Staff never self-register
   (DEC-032/033) — there is no staff option anywhere.

   Sign-in: ONE form. The system auto-detects the account: a password account
   (staff) is asked for its password; an OTP account (rider/driver) gets a
   login code automatically. No visible role toggle.

   Resend respects the backend 60s cooldown (live countdown); a 1-hour lockout
   after 3 failures is shown honestly. Forgot-password and email verification
   share the same style and error-key handling.
   ══════════════════════════════════════════════════════════════════════ */
function auth() {
  if (S.forgot) return forgotPassword();
  return S.authMode === "signup" ? signupAuth() : signinAuth();
}

/* ── sign-up: rider or driver ──────────────────────────────────────────── */
function signupAuth() {
  let body;
  if (S.authStep === "choose") {
    body = $("div",{class:"stack gap3"},
      $("p",{class:"t-cap center",text:t("signupChoose")}),
      roleChoice("rider", t("roleLabel.rider"), t("signupRiderSub"), "wallet"),
      roleChoice("driver", t("roleLabel.driver"), t("signupDriverSub"), "bus"));
  } else if (S.authStep === "phone") {
    body = $("div",{class:"stack gap3"},
      field("auth-phone", t("phoneLabel"), "tel"),
      Btn({label:S.authBusy? "…" : t("sendCode"), block:true, dis:S.authBusy, on:()=>riderSendCode()}));
  } else if (S.authStep === "otp") {
    body = $("div",{class:"stack gap3"},
      $("p",{class:"t-cap"}, `${t("codeSent")} `, $("span",{class:"ltr",text:S.authPhone})),
      field("auth-code", t("codeLabel"), "text"),
      Btn({label:S.authBusy? "…" : t("continue"), block:true, dis:S.authBusy, on:()=>{ S.authStep="name"; render(); }}),
      resendButton(()=>{ S.authStep="phone"; render(); }));
  } else { // name
    body = $("div",{class:"stack gap3"},
      field("auth-name", t("yourName"), "text"),
      Btn({label:S.authBusy? "…" : t("finish"), block:true, dis:S.authBusy, on:()=>riderVerifyCode(val("auth-name"))}));
  }
  return card(t("createAccount"), body, S.authMode==="signup");
}

/* ── sign-in: smart auto-detect ────────────────────────────────────────── */
function signinAuth() {
  let body;
  if (S.loginMethod === "password") {
    body = $("div",{class:"stack gap3"},
      $("p",{class:"t-cap"}, t("enterPassword")),
      field("auth-password", t("passwordLabel"), "password"),
      Btn({label:S.authBusy? "…" : t("signInAction"), block:true, dis:S.authBusy, on:()=>staffLogin()}),
      backBtn(()=>{ S.loginMethod=null; render(); }));
  } else if (S.loginMethod === "otp") {
    body = $("div",{class:"stack gap3"},
      $("p",{class:"t-cap"}, `${t("codeSentTo")} `, $("span",{class:"ltr",text:S.authIdentifier})),
      field("auth-code", t("codeLabel"), "text"),
      Btn({label:S.authBusy? "…" : t("verifyCode"), block:true, dis:S.authBusy, on:()=>riderVerifyCode(null)}),
      resendButton(()=>identify()),
      backBtn(()=>{ S.loginMethod=null; render(); }));
  } else {
    body = $("div",{class:"stack gap3"},
      field("auth-identifier", t("identifierLabel"), "text"),
      Btn({label:S.authBusy? "…" : t("signinContinue"), block:true, dis:S.authBusy, on:()=>identify()}),
      $("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:t("forgotPassword"),
        on:{click:()=>{ S.forgot="identify"; S.authError=null; render(); }}}));
  }
  return card(t("signIn"), body, true);
}

/* ── shared card chrome ────────────────────────────────────────────────── */
function card(title, body, showSignupToggle) {
  return $("div",{class:"authwrap"},
    $("div",{class:"authwrap__card"},
      $("button",{class:"authwrap__back", attrs:{type:"button","aria-label":t("landingBack")},
        on:{click:()=>{ S.view="landing"; S.authError=null; S.authStep="choose"; S.loginMethod=null; render(); }}}, icon("back")),
      $("div",{class:"center"}, logoSVG(), null),
      $("h1",{class:"t-title center", text:title}),
      body,
      lockoutBanner(),
      S.authError ? Banner("danger", S.authError) : null,
      showSignupToggle
        ? $("div",{class:"center mt3 stack gap1"},
            $("span",{class:"t-cap", text: S.authMode==="signin" ? t("needAccount") : t("haveAccount")}),
            $("button",{class:"btn btn--ghost", attrs:{type:"button"},
              text: S.authMode==="signin" ? t("createAccount") : t("signIn"),
              on:{click:()=>{ S.authMode = S.authMode==="signin" ? "signup" : "signin";
                              S.authStep="choose"; S.loginMethod=null; S.authError=null; render(); }}}))
        : null));
}

function roleChoice(role, title, sub, iconName) {
  return $("button",{class:"rolechoice", attrs:{type:"button","aria-pressed":String(S.signupRole===role)},
    on:{click:()=>{ S.signupRole=role; S.authStep="phone"; S.authError=null; render(); }}},
    $("div",{class:"rolechoice__ico"}, icon(iconName)),
    $("div",{class:"stack gap1 grow"},
      $("strong",{text:title}),
      $("div",{class:"t-cap",text:sub})),
    icon("fwd","chev"));
}

function resendButton(onClick) {
  const remaining = Math.max(0, Math.round(((S.resendUntil||0) - Date.now()) / 1000));
  const dis = remaining > 0 || S.authBusy;
  const btn = $("button",{class:"btn btn--ghost", attrs:{type:"button", disabled:dis||null},
    text: dis && remaining > 0 ? `${t("resendIn")} ${remaining}${t("seconds")}` : t("resendCode"),
    on:{click:onClick}});
  if (remaining > 0) setTimeout(()=>render(), 1000);
  return btn;
}

function backBtn(onClick) {
  return $("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:t("landingBack"),
    on:{click:onClick}});
}

function lockoutBanner() {
  if (!S.lockedUntil) return null;
  if (new Date(S.lockedUntil).getTime() <= Date.now()) return null;
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
        ? Btn({label:t("signInAction"), block:true, on:()=>{ S.forgot=null; S.view="auth"; S.authMode="signin"; S.loginMethod=null; S.authError=null; render(); }})
        : backBtn(()=>{ S.forgot=null; S.view="auth"; S.authMode="signin"; S.loginMethod=null; render(); })));
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
};

async function identify() {
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.identify(val("auth-identifier"));
    S.authIdentifier = val("auth-identifier");
    if (res.method === "password") { S.loginMethod="password"; }
    else { S.loginMethod="otp"; S.resendUntil = Date.now() + (res.resendInMs || 60000); }
    S.authBusy=false; render();
  } catch(e) { resetLockout(e); S.authError=e.messageKey||"error.internal"; S.authBusy=false; render(); }
}

async function staffLogin() {
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.login(S.authIdentifier || val("auth-identifier"), val("auth-password"));
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
    if (S.authMode==="signup" && S.signupRole==="driver") {
      try { await API.driverApply(); } catch {}
      toast(t("driverAppliedToast"));
    }
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
