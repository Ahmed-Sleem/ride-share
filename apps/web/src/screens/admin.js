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
    Row({icon:"bus", title:t("adminVehicleQueue"), sub:t("j_adminVehSub"), chev:true, bordered:true, on:()=>go("queue")})));
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
    el.append($("div",{class:"row gap2"},
      $("h2",{class:"t-head grow",text:t("adminAudit")}),
      $("div",{class:"t-cap ltr",text:`${from}–${to} ${t("j_auditPageOf")} ${total}`})));
    items.forEach((e)=> el.append(Row({
      icon:"flag",
      title: auditActionLabel(e.action),
      sub: `${t("j_auditWho")} · ${e.actor_name || e.email || "—"} · ${t("j_auditWhen")} · ${auditWhen(e.created_at)}` +
        (e.target_type ? ` · ${e.target_type}` : "") +
        (e.reason ? ` · ${e.reason}` : ""),
      bordered:true })));
    const more = (page + 1) * AUDIT_PAGE < total;
    if (page > 0 || more) {
      el.append($("div",{class:"row wrap gap2"},
        page > 0 ? Btn({label:t("j_auditPrev"), kind:"secondary", on:()=>{ S.auditPage = page - 1; loadAuditInto(el); }}) : null,
        more ? Btn({label:t("j_auditNext"), kind:"secondary", on:()=>{ S.auditPage = page + 1; loadAuditInto(el); }}) : null));
    }
  } catch(e) { el.append(Banner("danger", errText(e.messageKey))); }
}
