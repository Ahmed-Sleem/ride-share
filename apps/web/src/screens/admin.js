/* ══════════════════════════════════════════════════════════════════════
   Administration screens — the Super Admin's platform power (staff
   management + audit log), per CH02 §2.4 ("Grant staff roles", "View audit
   log"). Everything is REAL data from the API; every action is guarded by
   the single authority resolver server-side. Loading / empty / error states
   are honest — no fabricated rows.
   ══════════════════════════════════════════════════════════════════════ */
function adminHome() {
  const w=$("div",{class:"main"});
  w.append($("div",{class:"grid"},
    adminStat("adminStaff", t("adminStaff"), ()=>go("adminStaff")),
    adminStat("adminAudit", t("adminAudit"), ()=>go("adminAudit")),
    adminStat("queue",   t("adminDriverQueue"), ()=>go("queue")),
    adminStat("vehicles", t("adminVehicleQueue"), ()=>go("vehicles"))));
  w.append(Banner("info", t("staffNoSelfSignup")));
  return w;
}

function adminStat(ic, label, on) {
  return $("button",{class:"metric metric--link", attrs:{type:"button"}, on:{click:on}},
    $("div",{class:"row gap2"}, icon(ic), $("div",{class:"metric__l",text:label})));
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
    $("div",{class:"field"},
      $("label",{text:t("adminRole")}),
      $("select",{class:"input", id:"staff-role"},
        ["operations","manager","support"].map(r=>
          $("option",{attrs:{value:r}, text:t("roleLabel."+r)})))),
    Btn({label:t("adminCreate"), block:true, on:()=>createStaff()})));
  w.append($("div",{id:"staff-list"}), null);
  loadStaffInto(document.getElementById("staff-list"));
  return w;
}

function adminAudit() {
  const w=$("div",{class:"main"});
  w.append($("h2",{class:"t-head",text:t("adminAudit")}));
  w.append($("div",{id:"audit-list"}), null);
  loadAuditInto(document.getElementById("audit-list"));
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
  try {
    await API.createStaff(payload);
    toast(t("save"));
    loadStaffInto(document.getElementById("staff-list"));
  } catch(e) { toast(e.messageKey || "error.internal"); }
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

async function loadAuditInto(el) {
  if(!el) return;
  el.innerHTML="";
  try {
    const entries = await API.listAudit();
    if(!entries.length){ el.append(Empty("board", t("adminAudit"), t("adminAuditEmpty"))); return; }
    entries.forEach(e=> el.append(Row({
      icon:"flag",
      title: e.action,
      sub: `${e.actor_name || "—"} · ${(e.created_at||"").slice(0,16).replace("T"," ")}${e.reason ? " · "+e.reason : ""}`,
      bordered:true })));
  } catch(e) { el.append(Banner("danger", e.messageKey || "error.internal")); }
}
