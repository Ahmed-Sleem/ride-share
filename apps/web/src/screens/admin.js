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
        ["operations","manager","support","super_admin"].map(r=>
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
    staff.forEach(s=> el.append(Row({
      icon: s.role==="super_admin" ? "safety" : "profile",
      title: s.name || s.phone || s.email,
      sub: `${t("roleLabel."+s.role)} · ${s.phone||s.email||""}`,
      right: Chip({label:s.status}), bordered:true })));
  } catch(e) { el.append(Banner("danger", e.messageKey || "error.internal")); }
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
