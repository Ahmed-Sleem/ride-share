/* ══════════════════════════════════════════════════════════════════════
   Auth screens — the REAL flows, wired to the API. No fabricated success.

   Sign-up: the user chooses Rider or Driver (the only two self-service
   roles). Both self-register by EMAIL code; the domain must be one the
   server accepts (allowlist — temporary mailboxes are refused with a
   friendly message). Choosing Driver also submits the driver application
   after the account exists. Staff never self-register (DEC-032/033).

   Sign-in: ONE field. The system auto-detects the account: a password
   account (staff) is asked for its password; an OTP account (rider/driver)
   gets a login code emailed automatically. No visible role toggle.

   Resend respects the backend 60s cooldown (live countdown); a 1-hour lockout
   after 3 failures is shown honestly; both survive a page refresh (the
   server re-derives them from PostgreSQL on every request — the client only
   mirrors the countdown). Forgot-password and email verification share the
   same style and error-key handling.
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
      $("div",{class:"t-head center",text:t("signupChoose")}),
      roleChoice("rider", t("roleLabel.rider"), t("signupRiderSub"), "wallet"),
      roleChoice("driver", t("roleLabel.driver"), t("signupDriverSub"), "bus"));
  } else if (S.authStep === "email") {
    body = $("div",{class:"stack gap3"},
      field("auth-email", t("emailLabel"), "email", "email"),
      $("p",{class:"t-cap",text:t("emailHelp")}),
      Btn({label:S.authBusy? "…" : t("sendCode"), block:true, dis:S.authBusy, on:()=>riderSendCode()}));
  } else if (S.authStep === "otp") {
    body = otpStep(
      `${t("codeSent")} `,
      () => riderVerifyCode(null),
      () => riderSendCode(),
      () => { S.authStep="email"; S.authError=null; render(); });
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
    body = otpStep(
      `${t("codeSentTo")} `,
      () => riderVerifyCode(null),
      () => identify(),
      () => { S.loginMethod=null; render(); });
  } else {
    body = $("div",{class:"stack gap3"},
      field("auth-identifier", t("identifierLabel"), "email", "email"),
      Btn({label:S.authBusy? "…" : t("signinContinue"), block:true, dis:S.authBusy, on:()=>identify()}),
      $("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:t("forgotPassword"),
        on:{click:()=>{ S.forgot="identify"; S.authError=null; render(); }}}));
  }
  return card(t("signIn"), body, true);
}

/* Shared OTP step: the sent-to line, the six boxes, the attempts hint, the
   verify button, the resend countdown, and a way back to the email field. */
function otpStep(sentPrefix, onVerify, onResend, onBack) {
  return $("div",{class:"stack gap3"},
    $("p",{class:"t-cap center"}, sentPrefix,
      $("span",{class:"ltr",text:S.authEmail})),
    OtpInput({ onComplete: onVerify }),
    S.attemptsLeft != null
      ? $("p",{class:"t-cap center",text:`${t("attemptsLeft")}: ${S.attemptsLeft}`}) : null,
    Btn({label:S.authBusy? "…" : t("verifyCode"), block:true, dis:S.authBusy, on:onVerify}),
    resendButton(onResend),
    backBtn(onBack));
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
    on:{click:()=>{ S.signupRole=role; S.authStep="email"; S.authError=null; render(); }}},
    $("div",{class:"rolechoice__ico"}, icon(iconName)),
    $("div",{class:"rolechoice__text"},
      $("strong",{class:"rolechoice__title",text:title}),
      $("div",{class:"rolechoice__sub",text:sub})),
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

function backBtn(onClick, label) {
  return $("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:label || t("changeEmail"),
    on:{click:onClick}});
}

function lockoutBanner() {
  if (!S.lockedUntil) return null;
  if (new Date(S.lockedUntil).getTime() <= Date.now()) return null;
  return Banner("danger", t("auth.code_locked"));
}

/* ── forgot password ──────────────────────────────────────────────────── */
function forgotPassword() {
  const step = S.forgot; // 'identify' | 'code' | 'newpass' | 'done'
  const w=$("div",{class:"stack gap3"});
  if(step==="identify"){
    w.append($("p",{class:"t-cap",text:t("resetIdentify")}),
      field("reset-identifier", t("identifierLabel"), "email", "email"),
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
        : backBtn(()=>{ S.forgot=null; S.view="auth"; S.authMode="signin"; S.loginMethod=null; render(); }, t("landingBack"))));
}

/* ── helpers + actions ────────────────────────────────────────────────── */
function field(id, label, type, autocomplete) {
  return $("div",{class:"field"},
    $("label",{attrs:{for:id}, text:label}),
    $("input",{class:"input ltr", attrs:{id, type, autocomplete: autocomplete || "off", "aria-label":label}}));
}
const val = (id) => (document.getElementById(id)||{}).value || "";
const resetLockout = (e) => {
  const d = e.payload && e.payload.details;
  if (d && d.retryAfterMs) setResendUntil(d.retryAfterMs);
  if (d && d.lockedUntil) setLockedUntil(d.lockedUntil);
};
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((s||"").trim());

async function identify() {
  const id = val("auth-identifier");
  if(!id){ S.authError=t("validation.email"); render(); return; }
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.identify(id);
    S.authIdentifier = id;
    if (res.method === "password") { S.loginMethod="password"; }
    else {
      S.authEmail = id;
      S.loginMethod="otp";
      setResendUntil(res.resendInMs || 60000);
    }
    S.authBusy=false; render();
  } catch(e) { resetLockout(e); S.authError=errText(e.messageKey); S.authBusy=false; render(); }
}

async function staffLogin() {
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.login(S.authIdentifier || val("auth-identifier"), val("auth-password"));
    API.saveSession(res);
    enterApp(res.user);
  } catch(e) { S.authError = errText(e.messageKey); S.authBusy=false; render(); }
}

async function riderSendCode() {
  const email = val("auth-email").trim().toLowerCase();
  if(!isEmail(email)){ S.authError=t("validation.email"); render(); return; }
  S.authBusy=true; S.authError=null; S.attemptsLeft=null; S.lockedUntil=null;
  setLockedUntil(null); render();
  try {
    const res = await API.requestOtp(email);
    S.authEmail=email; S.authStep="otp"; S.authBusy=false;
    setResendUntil(res.resendInMs || 60000);
    render();
  } catch(e) { resetLockout(e); S.authError=errText(e.messageKey); S.authBusy=false; render(); }
}

async function riderVerifyCode(name) {
  const code = otpValue();
  if(code.length !== 6){ S.authError=t("validation.code"); render(); return; }
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.verifyOtp(S.authEmail, code, name || undefined);
    API.saveSession(res);
    if (S.authMode==="signup" && S.signupRole==="driver") {
      try { await API.driverApply(); } catch { /* application state shows honestly in the app */ }
      toast(t("driverAppliedToast"));
    }
    enterApp(res.user);
  } catch(e) {
    resetLockout(e);
    const d = e.payload && e.payload.details;
    if (d && d.remainingAttempts != null) S.attemptsLeft = d.remainingAttempts;
    S.authError=errText(e.messageKey); S.authBusy=false; render();
  }
}

async function resetRequest() {
  S.authBusy=true; S.authError=null; render();
  try {
    await API.requestPasswordReset(val("reset-identifier"));
    S.forgot="code"; S.authBusy=false; render();
  } catch(e) { resetLockout(e); S.authError=errText(e.messageKey); S.authBusy=false; render(); }
}

async function resetConfirm() {
  S.authBusy=true; S.authError=null; render();
  try {
    await API.confirmPasswordReset(val("reset-identifier"), val("reset-code"), val("reset-password"));
    S.forgot="done"; S.authBusy=false; render();
  } catch(e) { resetLockout(e); S.authError=errText(e.messageKey); S.authBusy=false; render(); }
}
