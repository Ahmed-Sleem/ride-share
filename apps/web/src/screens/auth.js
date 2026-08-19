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
      cooldownButton(Btn({label:S.authBusy? "…" : t("sendCode"), block:true, dis:S.authBusy, on:()=>riderSendCode()}),
                     S.authBusy? "…" : t("sendCode")));
  } else if (S.authStep === "otp") {
    body = otpStep(
      `${t("codeSent")} `,
      () => signupVerifyCode(),
      () => riderSendCode(),
      () => { S.authStep="email"; S.authError=null; render(); },
      { nameField:true, btnLabel:t("createAccount") });
  } else if (S.authStep === "name") {
    // OTP bypass: the code step is skipped — name + password are collected.
    body = $("div",{class:"stack gap3"},
      field("auth-name", t("yourName"), "text", "name"),
      field("auth-password", t("passwordLabel"), "password", "new-password"),
      $("p",{class:"t-cap",text:t("passwordHint")}),
      Btn({label:S.authBusy? "…" : t("createAccount"), block:true, dis:S.authBusy, on:()=>signupVerifyCode()}));
  }
  return card(t("createAccount"), body, S.authMode==="signup");
}

/* ── sign-in: smart auto-detect ────────────────────────────────────────── */
function signinAuth() {
  let body;
  if (S.loginMethod === "password") {
    body = $("div",{class:"stack gap3"},
      $("p",{class:"t-cap"}, t("enterPassword")),
      field("auth-password", t("passwordLabel"), "password", "current-password"),
      Btn({label:S.authBusy? "…" : t("signInAction"), block:true, dis:S.authBusy, on:()=>staffLogin()}),
      backBtn(()=>{ S.loginMethod=null; render(); }));
  } else if (S.loginMethod === "otp") {
    body = otpStep(
      `${t("codeSentTo")} `,
      () => signinVerifyCode(),
      () => identify(),
      () => { S.loginMethod=null; render(); });
  } else {
    body = $("div",{class:"stack gap3"},
      field("auth-identifier", t("identifierLabel"), "email", "email"),
      cooldownButton(Btn({label:S.authBusy? "…" : t("signinContinue"), block:true, dis:S.authBusy, on:()=>identify()}),
                     S.authBusy? "…" : t("signinContinue")),
      $("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:t("forgotPassword"),
        on:{click:()=>{ S.forgot="identify"; S.authError=null; render(); }}}));
  }
  return card(t("signIn"), body, true);
}

/* Shared OTP step: the sent-to line, the six boxes, the attempts hint, the
   verify button, the resend countdown, and a way back to the email field.
   Sign-up also collects the rider's name on this step. */
function otpStep(sentPrefix, onVerify, onResend, onBack, opts) {
  opts = opts || {};
  return $("div",{class:"stack gap3"},
    $("p",{class:"t-cap center"}, sentPrefix,
      $("span",{class:"ltr",text:S.authEmail})),
    OtpInput({ onComplete: onVerify }),
    opts.nameField ? field("auth-name", t("yourName"), "text", "name") : null,
    opts.nameField ? field("auth-password", t("passwordLabel"), "password", "new-password") : null,
    opts.nameField ? $("p",{class:"t-cap",text:t("passwordHint")}) : null,
    S.attemptsLeft != null
      ? $("p",{class:"t-cap center",text:`${t("attemptsLeft")}: ${S.attemptsLeft}`}) : null,
    Btn({label:S.authBusy? "…" : (opts.btnLabel || t("verifyCode")), block:true, dis:S.authBusy, on:onVerify}),
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
  return cooldownButton($("button",{class:"btn btn--ghost", attrs:{type:"button"}, text:t("resendCode"),
    on:{click:onClick}}), t("resendCode"));
}

/* Live countdown that updates the button IN PLACE — never re-render(), because
   a full render wipes the OTP boxes the user is typing into (and, on the email
   step, the email they just typed). The cooldown deadline is S.resendUntil
   (persisted, so it survives a refresh). */
function cooldownButton(btn, idleLabel) {
  const tick = () => {
    const remaining = Math.max(0, Math.round(((S.resendUntil||0) - Date.now()) / 1000));
    if (remaining > 0) {
      btn.textContent = `${t("resendIn")} ${remaining}${t("seconds")}`;
      btn.disabled = true;
      setTimeout(tick, 1000);
    } else {
      btn.textContent = idleLabel;
      btn.disabled = false;
    }
  };
  tick();
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
      field("reset-password", t("newPassword"), "password", "new-password"),
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
function field(id, label, type, autocomplete, value) {
  const input = $("input",{class:"input ltr", attrs:{id, type, autocomplete: autocomplete || "off", "aria-label":label, value: value ?? null}});
  // password fields get a show/hide eye (a standard, expected control)
  if (type === "password") {
    const eye = $("button",{class:"field__eye", attrs:{type:"button", "aria-label":t("showPassword"), "aria-pressed":"false"},
      on:{click:()=>{
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        eye.setAttribute("aria-label", show ? t("hidePassword") : t("showPassword"));
        eye.setAttribute("aria-pressed", show ? "true" : "false");
        eye.replaceChildren(icon(show ? "eyeoff" : "eye"));
      }}}, icon("eye"));
    return $("div",{class:"field"},
      $("label",{attrs:{for:id}, text:label}),
      $("div",{class:"inputwrap"}, input, eye));
  }
  return $("div",{class:"field"},
    $("label",{attrs:{for:id}, text:label}),
    input);
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
  S.authBusy=true; S.authError=null; S.otpBypass=false; render();
  try {
    const res = await API.identify(id);
    S.authIdentifier = id;
    if (res.method === "password") { S.loginMethod="password"; S.authBusy=false; render(); return; }
    S.authEmail = id;
    S.loginMethod="otp";
    if (res.bypass) {
      // OTP bypass: no code step — sign straight in.
      S.otpBypass = true;
      S.authBusy = false;
      await signinVerifyCode();
      return;
    }
    setResendUntil(res.resendInMs || 60000);
    S.authBusy=false; render();
  } catch(e) { resetLockout(e); S.authError=errText(e.messageKey); S.authBusy=false; render(); }
}

async function staffLogin() {
  // read BEFORE render(): render() wipes and rebuilds the DOM, so reading the
  // field afterwards always yields "" (the live "Please check your entries" bug)
  const identifier = S.authIdentifier || val("auth-identifier");
  const password = val("auth-password");
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.login(identifier, password);
    API.saveSession(res);
    enterApp(res.user);
  } catch(e) { S.authError = errText(e.messageKey); S.authBusy=false; render(); }
}

async function riderSendCode() {
  // fall back to S.authEmail so "Resend" works from the OTP step (no email field there)
  const email = (val("auth-email") || S.authEmail).trim().toLowerCase();
  if(!isEmail(email)){ S.authError=t("validation.email"); render(); return; }
  S.authBusy=true; S.authError=null; S.attemptsLeft=null; S.lockedUntil=null;
  setLockedUntil(null); render();
  try {
    const res = await API.requestOtp(email);
    S.authEmail=email; S.authBusy=false;
    if (res.bypass) {
      // OTP bypass: skip the code step, go straight to the name step.
      S.otpBypass = true;
      S.authStep = "name";
      render();
      return;
    }
    S.authStep="otp";
    setResendUntil(res.resendInMs || 60000);
    render();
  } catch(e) { resetLockout(e); S.authError=errText(e.messageKey); S.authBusy=false; render(); }
}

async function signupVerifyCode() {
  // undefined (not "") in bypass mode: JSON.stringify drops the key, so the
  // DTO's @IsOptional code passes — an empty string would fail the 6-digit
  // regex and return "Please check your entries".
  const code = S.otpBypass ? undefined : otpValue();
  if(!S.otpBypass && code.length !== 6){ S.authError=t("validation.code"); render(); return; }
  const name = val("auth-name") || undefined;   // read BEFORE render()
  const password = val("auth-password");        // read BEFORE render()
  if (password.length < 8) { S.authError = t("validation.password"); render(); return; }
  S.authBusy=true; S.authError=null; render();
  try {
    // one email = one account: a taken email (any role) is refused server-side
    const res = await API.signupVerify(S.authEmail, code, name, password);
    API.saveSession(res);
    if (S.signupRole==="driver") {
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

async function signinVerifyCode() {
  const code = S.otpBypass ? undefined : otpValue();
  if(!S.otpBypass && code.length !== 6){ S.authError=t("validation.code"); render(); return; }
  S.authBusy=true; S.authError=null; render();
  try {
    const res = await API.verifyOtp(S.authEmail, code);
    API.saveSession(res);
    enterApp(res.user);
  } catch(e) {
    resetLockout(e);
    const d = e.payload && e.payload.details;
    if (d && d.remainingAttempts != null) S.attemptsLeft = d.remainingAttempts;
    S.authError=errText(e.messageKey); S.authBusy=false; render();
  }
}

async function resetRequest() {
  const identifier = val("reset-identifier");   // read BEFORE render()
  S.authBusy=true; S.authError=null; render();
  try {
    await API.requestPasswordReset(identifier);
    S.forgot="code"; S.authBusy=false; render();
  } catch(e) { resetLockout(e); S.authError=errText(e.messageKey); S.authBusy=false; render(); }
}

async function resetConfirm() {
  const identifier = val("reset-identifier");   // read BEFORE render()
  const code = val("reset-code");
  const password = val("reset-password");
  S.authBusy=true; S.authError=null; render();
  try {
    await API.confirmPasswordReset(identifier, code, password);
    S.forgot="done"; S.authBusy=false; render();
  } catch(e) { resetLockout(e); S.authError=errText(e.messageKey); S.authBusy=false; render(); }
}
