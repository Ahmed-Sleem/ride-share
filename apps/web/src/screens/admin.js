/* ══════════════════════════════════════════════════════════════════════
   Administration screens — the Super Admin's platform power (staff
   management + audit log), per CH02 §2.4 ("Grant staff roles", "View audit
   log"). Everything is REAL data from the API; every action is guarded by
   the single authority resolver server-side. Loading / empty / error states
   are honest — no fabricated rows.
   ══════════════════════════════════════════════════════════════════════ */
function adminHome() {
  const w=$("div",{class:"main"});
  w.append($("div",{class:"rowgroup"},
    Row({icon:"users", title:t("adminStaff"), sub:t("j_adminStaffSub"), chev:true, bordered:true, on:()=>go("adminStaff")}),
    Row({icon:"flag", title:t("adminAudit"), sub:t("j_adminAuditSub"), chev:true, bordered:true, on:()=>go("adminAudit")}),
    Row({icon:"queue", title:t("adminDriverQueue"), sub:t("j_adminQueueSub"), chev:true, bordered:true, on:()=>go("queue")}),
    Row({icon:"bus", title:t("adminVehicleQueue"), sub:t("j_adminVehSub"), chev:true, bordered:true, on:()=>go("queue")}),
    Row({icon:"pricing", title:t("j_settingsTitle"), sub:t("j_settingsSub"), chev:true, bordered:true, on:()=>go("adminSettings")}),
    Row({icon:"routes", title:t("nav.routes"), sub:t("j_adminRoutesSub"), chev:true, bordered:true, on:()=>go("routes")}),
    Row({icon:"stops", title:t("nav.stops"), sub:t("j_adminStopsSub"), chev:true, bordered:true, on:()=>go("stops")})));
  return w;
}

/* Staff profile — account + appearance settings only. Wallet, subscriptions
   and safety-centre are RIDER features; staff never see them (§8.1 hide what
   the role can never use). Shared by operations / manager / support / super_admin. */
function staffProfile() {
  const u = S.user || {};
  const initials = (u.name || "?").slice(0,1).toUpperCase();
  const w=$("div",{class:"main"});
  w.append($("div",{class:"row gap3"},
    $("div",{class:"avatar avatar--lg",text:initials}),
    $("div",{class:"stack grow gap1"},
      $("strong",{class:"t-head",text:u.name || "—"}),
      $("div",{class:"t-cap ltr",text:u.email || u.phone || "—"}))));
  w.append(emailSection());
  w.append($("div",{class:"rowgroup"},
    Row({icon:"globe", title:t("language"), right:langSeg()}),
    Row({icon:"moon",  title:t("theme"),    right:themeSeg()}),
    Row({icon:"bell",  title:t("notifications"), right:switchEl(true)})));
  w.append(Btn({label:t("signOut"), kind:"secondary", block:true,
    on:()=>signOut()}));
  return w;
}

function adminStaff() {
  const w=$("div",{class:"main"});
  w.append($("h2",{class:"t-head",text:t("adminCreateStaff")}));
  w.append(Card("card--tight",
    $("div",{class:"grid grid--tight"},
      field("staff-name", t("adminName"), "text"),
      field("staff-phone", t("adminPhone"), "tel"),
      field("staff-email", t("adminEmail"), "email")),
    field("staff-password", t("adminPassword"), "password"),
    $("p",{class:"t-cap",text:t("j_staffPassHint")}),
    $("div",{class:"field"},
      $("label",{text:t("adminRole")}),
      $("select",{class:"input", id:"staff-role"},
        ["operations","manager","support"].map(r=>
          $("option",{attrs:{value:r}, text:t("roleLabel."+r)})))),
    Btn({label:t("adminCreate"), block:true, on:()=>createStaff()})));
  const list = $("div",{id:"staff-list"});
  w.append(list);
  loadStaffInto(list);
  return w;
}

function adminAudit() {
  const w=$("div",{class:"main"});
  const list = $("div",{id:"audit-list"});
  w.append(list);
  loadAuditInto(list);
  return w;
}

/* ── data + actions ───────────────────────────────────────────────────── */
async function createStaff() {
  const payload = {
    name: val("staff-name") || undefined,
    phone: val("staff-phone") || undefined,
    email: val("staff-email") || undefined,
    password: val("staff-password"),
    role: val("staff-role") || "operations",
  };
  if (!payload.email && !payload.phone) { toast(errText("auth.identifier_required")); return; }
  if (!payload.password || payload.password.length < 12) { toast(t("j_staffPassHint")); return; }
  try {
    await API.createStaff(payload);
    toast(t("save"));
    loadStaffInto(document.getElementById("staff-list"));
  } catch(e) { toast(errText(e.messageKey)); }
}

async function loadStaffInto(el) {
  if(!el) return;
  el.innerHTML="";
  try {
    const staff = await API.listStaff();
    if(!staff.length){ el.append(Empty("users", t("adminStaff"), t("adminStaffEmpty"))); return; }
    el.append($("h2",{class:"t-head",text:t("adminStaff")}));
    staff.forEach(s=> el.append(staffRow(s)));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

/* One staff row. The system admin (the env-seeded main admin) is marked and
   has no edit/remove controls — it is immutable by design (DEC-196). Every
   other staff account can be edited or removed by the main admin. */
function staffRow(s) {
  const isMain = s.isSystemAdmin === true;
  return Row({
    icon: isMain ? "safety" : "profile",
    title: s.name || s.phone || s.email,
    sub: `${t("roleLabel."+s.role)} · ${s.phone||s.email||""}`,
    right: isMain
      ? $("div",{class:"row gap2"}, Chip({label:t("adminSystemAdmin"), kind:"brand"}), Chip({label:s.status}))
      : $("div",{class:"row gap2"},
          Chip({label:s.status}),
          IconBtn({name:"pricing", label:t("adminEdit"), on:()=>{ S.staffEditing=s; S.staffEditName=s.name||""; S.staffEditRole=s.role; openSheet("staffEdit"); }}),
          IconBtn({name:"close", label:t("adminRemove"), on:()=>{ S.staffEditing=s; openSheet("staffRemove"); }})),
    bordered:true });
}

/* ── staff edit / remove (sheets) ─────────────────────────────────────── */
function staffEdit() {
  const s = S.staffEditing || {};
  return Sheet(t("adminEditTitle"),
    field("staff-edit-name", t("adminName"), "text", "name", S.staffEditName || s.name || ""),
    $("div",{class:"field"},
      $("label",{text:t("adminRole")}),
      $("select",{class:"input", id:"staff-edit-role"},
        ["operations","manager","support"].map(r=>
          $("option",{attrs:{value:r, selected: s.role===r ? "" : null}, text:t("roleLabel."+r)})))),
    Btn({label:t("save"), block:true, on:()=>saveStaffEdit()}));
}

function staffRemove() {
  return Sheet(t("adminRemove"),
    Banner("warn", t("adminRemoveConfirm")),
    Btn({label:t("adminRemove"), kind:"danger", block:true, on:()=>confirmStaffRemove()}));
}

async function saveStaffEdit() {
  const s = S.staffEditing;
  if(!s) return;
  try {
    await API.updateStaff(s.id, { name: val("staff-edit-name") || undefined, role: val("staff-edit-role") || undefined });
    closeSheet();
    toast(t("save"));
    loadStaffInto(document.getElementById("staff-list"));
  } catch(e) { toast(errText(e.messageKey)); }
}

async function confirmStaffRemove() {
  const s = S.staffEditing;
  if(!s) return;
  try {
    await API.deleteStaff(s.id);
    closeSheet();
    toast(t("adminRemove"));
    loadStaffInto(document.getElementById("staff-list"));
  } catch(e) { toast(errText(e.messageKey)); }
}

const AUDIT_PAGE = 25;

function auditActionLabel(action) {
  const key = "j_act_" + String(action || "").replace(/\./g, "_");
  const copy = t(key);
  return copy !== key ? copy : String(action || "—").replace(/\./g, " · ");
}

function auditWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16).replace("T", " ");
  return d.toLocaleString(S.lang === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function auditPager(el, page, pages, total) {
  const bar = $("div",{class:"row wrap gap2", attrs:{"aria-label":t("j_auditPager")}});
  bar.append(Btn({label:t("j_auditPrev"), kind:"secondary", dis: page<=0, on:()=>{ if(page>0){ S.auditPage = page - 1; loadAuditInto(el); }}}));
  const windowStart = Math.max(0, page - 2);
  const windowEnd = Math.min(pages - 1, page + 2);
  if (windowStart > 0)
    bar.append(Btn({label:"1", kind: page===0?"primary":"ghost", on:()=>{ S.auditPage = 0; loadAuditInto(el); }}));
  if (windowStart > 1) bar.append($("span",{class:"t-cap",text:"…"}));
  for (let i = windowStart; i <= windowEnd; i++) {
    bar.append(Btn({label:String(i+1), kind: i===page?"primary":"ghost", on:()=>{ S.auditPage = i; loadAuditInto(el); }}));
  }
  if (windowEnd < pages - 2) bar.append($("span",{class:"t-cap",text:"…"}));
  if (windowEnd < pages - 1)
    bar.append(Btn({label:String(pages), kind: page===pages-1?"primary":"ghost", on:()=>{ S.auditPage = pages-1; loadAuditInto(el); }}));
  bar.append(Btn({label:t("j_auditNext"), kind:"secondary", dis: page>=pages-1, on:()=>{ if(page<pages-1){ S.auditPage = page + 1; loadAuditInto(el); }}}));
  bar.append($("span",{class:"t-cap ltr",text:`${total} ${t("j_auditRows")}`}));
  return bar;
}

async function loadAuditInto(el) {
  if(!el) return;
  el.innerHTML="";
  const page = Math.max(0, S.auditPage || 0);
  try {
    const res = await API.listAudit(AUDIT_PAGE, page * AUDIT_PAGE);
    const items = Array.isArray(res) ? res : (res && res.items) || [];
    const total = Array.isArray(res) ? res.length : Number((res && res.total) || 0);
    if(!items.length){ el.append(Empty("flag", t("adminAudit"), t("adminAuditEmpty"))); return; }
    const from = page * AUDIT_PAGE + 1;
    const to = page * AUDIT_PAGE + items.length;
    const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE));
    el.append($("div",{class:"row gap2"},
      $("h2",{class:"t-head grow",text:t("adminAudit")}),
      $("div",{class:"t-cap ltr",text:`${from}–${to} ${t("j_auditPageOf")} ${total}`})));
    el.append(auditPager(el, page, pages, total));
    const rows = items.map((e)=> $("tr",{},
      $("td",{class:"ltr",text:auditWhen(e.created_at)}),
      $("td",{text:e.actor_name || e.email || "—"}),
      $("td",{},$("strong",{text:auditActionLabel(e.action)})),
      $("td",{text:e.target_type || "—"}),
      $("td",{text:e.reason || "—"})));
    el.append(Table([t("j_auditWhen"), t("j_auditWho"), t("j_auditAction"), t("j_auditTarget"), t("reason")], rows));
    el.append(auditPager(el, page, pages, total));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

function adminSettings() {
  const w=$("div",{class:"main"});
  const box=$("div",{id:"owner-settings"});
  w.append(box);
  loadOwnerSettingsInto(box);
  return w;
}

function settingField(id, label, envVal, overrideVal) {
  const usingPage = overrideVal != null;
  return $("div",{class:"field"},
    $("label",{attrs:{for:id}, text:label}),
    $("div",{class:"t-cap",text:`${t("j_settingsEnv")}: ${envVal}`}),
    $("input",{class:"input", attrs:{id, type:"text", inputmode:"numeric", value: usingPage ? String(overrideVal) : String(envVal)}}),
    $("label",{class:"row gap2"},
      $("input",{attrs:{type:"checkbox", id:id+"-ovr", checked: usingPage ? "" : null}}),
      $("span",{class:"t-cap",text:t("j_settingsOverride")})));
}

async function loadOwnerSettingsInto(el) {
  if(!el) return;
  el.innerHTML="";
  try {
    const s = await API.getOwnerSettings();
    S.ownerSettings = s;
    el.append($("h2",{class:"t-head",text:t("j_settingsTitle")}));
    el.append(Banner("info", t("j_settingsHelp")));
    el.append(Card("card--tight",
      settingField("set-comm", t("j_setCommission"), s.env.commission_percent, s.override.commission_percent),
      settingField("set-nbd", t("j_setBehDay"), s.env.notify_behavioural_max_day, s.override.notify_behavioural_max_day),
      settingField("set-nbg", t("j_setBehGap"), s.env.notify_behavioural_gap_hours, s.override.notify_behavioural_gap_hours),
      settingField("set-npd", t("j_setPromoDay"), s.env.notify_promo_max_day, s.override.notify_promo_max_day),
      settingField("set-npw", t("j_setPromoWeek"), s.env.notify_promo_max_week, s.override.notify_promo_max_week),
      settingField("set-nnt", t("j_setNonTx"), s.env.notify_non_tx_max_day, s.override.notify_non_tx_max_day),
      $("div",{class:"field"},
        $("label",{text:t("j_setPaymob")}),
        $("div",{class:"t-cap",text:`${t("j_settingsEnv")}: ${s.env.paymob_enabled ? t("j_on") : t("j_off")}`}),
        $("select",{class:"input", attrs:{id:"set-paymob"}},
          $("option",{attrs:{value:"env"}, text:t("j_settingsUseEnv")}),
          $("option",{attrs:{value:"true", selected: s.override.paymob_enabled===true ? "" : null}, text:t("j_on")}),
          $("option",{attrs:{value:"false", selected: s.override.paymob_enabled===false ? "" : null}, text:t("j_off")}))),
      Btn({label:t("save"), block:true, on:()=>saveOwnerSettings()})));
    el.append($("p",{class:"t-cap",text:`${t("j_settingsEffective")}: ${t("j_setCommission")} ${s.effective.commission_percent}% · Paymob ${s.effective.paymob_enabled?t("j_on"):t("j_off")}`}));
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}

function readOverride(id) {
  const box = document.getElementById(id+"-ovr");
  if (!box || !box.checked) return null;
  const n = Number(val(id));
  return Number.isInteger(n) ? n : null;
}

async function saveOwnerSettings() {
  const pay = val("set-paymob");
  const otp = val("set-otp");
  const payload = {
    commission_percent: readOverride("set-comm"),
    notify_behavioural_max_day: readOverride("set-nbd"),
    notify_behavioural_gap_hours: readOverride("set-nbg"),
    notify_promo_max_day: readOverride("set-npd"),
    notify_promo_max_week: readOverride("set-npw"),
    notify_non_tx_max_day: readOverride("set-nnt"),
    paymob_enabled: pay === "env" ? null : pay === "true",
    auth_otp_bypass: otp === "env" ? null : otp === "true",
  };
  try {
    await API.saveOwnerSettings(payload);
    toast(t("save"));
    loadOwnerSettingsInto(document.getElementById("owner-settings"));
  } catch(e) { toast(errText(e.messageKey)); }
}
