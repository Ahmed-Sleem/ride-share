/* ══════════════════════════════════════════════════════════════════════
   3. STATE + HELPERS
   ══════════════════════════════════════════════════════════════════════ */
/* Safe storage — localStorage throws on opaque origins (file://, jsdom),
   which must never crash the app. */
const storeGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const storeSet = (k,v) => { try{ localStorage.setItem(k,v); }catch(e){} };

/* resolvedTheme: S.theme is a preference ("auto"|"light"|"dark"); the resolved
   value is what the DOM actually renders. Auto = the device's prefers-color-
   scheme when the OS signals it, otherwise the local time of day (06:00–18:00
   light, night dark). An explicit choice always wins. */
const resolvedTheme = (now = new Date()) => {
  if (S.theme === "auto") {
    try {
      if (window.matchMedia) {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
        if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
      }
    } catch (e) { /* no matchMedia — fall through to time */ }
    const h = now.getHours();
    return (h >= 6 && h < 18) ? "light" : "dark";
  }
  return S.theme;
};

const detectLang = () => {
  try { return (navigator && navigator.language && String(navigator.language).toLowerCase().startsWith("ar"))
    ? "ar" : "en"; } catch(e){ return "en"; }
};

const S = {
  role:"rider", lang: storeGet("rs.lang") || detectLang(), theme: storeGet("rs.theme") || "auto",
  rail: storeGet("rs.rail") ?? "collapsed",   // collapsed is the DEFAULT (owner)
  view:"boot",                                // boot | intro | landing | auth | app
  introSlide:0,
  authed:false, user:null,                    // user comes from the session
  authMode:"signin", authTab:"staff",         // signin | signup ; staff | rider
  signupRole:"rider",                          // rider | driver (the only signup choices)
  loginMethod:null, authIdentifier:"",          // smart sign-in: 'password' | 'otp'
  forgot:null,
  /* cooldown & lockout persist across refresh — the server is authoritative
     (verification_codes in Postgres), the client only mirrors the countdown */
  resendUntil: (Number(storeGet("rs.resendUntil")) || 0) || null,
  lockedUntil: storeGet("rs.lockedUntil") ? new Date(Number(storeGet("rs.lockedUntil"))) : null,
  emailToast:null, emailToastKind:"info",
  authStep:"email", authBusy:false, authError:null,
  authEmail:"", authName:"", otpBypass:false,
  page:"home", sheet:null, toast:null,
  chosenRoute:null, chosenBoard:null, chosenDep:null, lastBooking:null, seats:1,
  tripTab:"upcoming", tripsCache:null,                 // bookings cached so tab-switch is seamless
  riderQuery:"", riderRoutes:null, riderIndex:null, riderJourneys:null,  // rider search (Fuse index)
  planFrom:null, planTo:null, planFromQ:"", planToQ:"", planFocus:null,   /* path B DEC-199 */
  stopsQuery:"", stopsCache:null,                      // ops stops live filter
  offline:false, gettingOff:false, onDuty:true,
  landingDoc:null,                             // landing sub-view: terms|privacy|safety
  landingPage:"rider", landingMenu:false,      // landing v2: rider (default) | drive | about | help
  opsView:null, opsTarget:null, stopTooClose:null, stopBusy:false,
  claimTarget:null, claimVehicleId:null, stack:[],
  staffEditing:null, staffEditName:"", staffEditRole:"operations",
  auditPage:0,
};

/* enter the signed-in app with the session user; role comes from auth, never
   a switcher (§8 — the demo role switcher is gone). */
/* API roles vs UI nav tables: operations staff are `operations` in the
   database and `ops` in PAGES. One map — never a second copy. */
function uiRole(role) {
  if (role === "operations") return "ops";
  if (typeof PAGES !== "undefined" && PAGES[role]) return role;
  return role || "rider";
}

function enterApp(user) {
  S.user = user;
  S.role = uiRole(user && user.role);
  S.authed = true;
  S.view = "app";
  S.page = (typeof DEFAULT_PAGE !== "undefined" && DEFAULT_PAGE[S.role]) || "home";
  S.stack = [];
  S.sheet = null; S.opsView = null;
  // reset the auth-flow state so returning to sign-in starts clean
  S.authBusy = false; S.authError = null; S.otpBypass = false;
  S.authStep = "choose"; S.loginMethod = null; S.forgot = null;
  render();
  if (typeof LocalAlarm !== "undefined") {
    LocalAlarm.restore({ onFire: (item) => { S.page = item.page || "waiting"; render(); } });
  }
  if (typeof Platform !== "undefined" && typeof API.registerDevice === "function") {
    Platform.registerPush().then((r) => {
      if (r && r.token) API.registerDevice(r.token, Platform.kind());
    }).catch(() => {});
  }
}

function isNativeApp() {
  return typeof Platform !== "undefined" && Platform.kind && Platform.kind() === "native";
}

/* Website vs installed-app product. Railway `web` injects __RS_SURFACE="web";
   Railway `mobile` injects "mobile". Intro slides belong only to the mobile
   product — never the public website (phone browser included). */
function isAppSurface() {
  const s = (typeof window !== "undefined" && window.__RS_SURFACE) || "";
  if (s === "mobile") return true;
  if (s === "web") return false;
  return isNativeApp();
}

const INTRO_KEY = "rs.intro.v1";
function introSeen() { return storeGet(INTRO_KEY) === "1"; }
function markIntroSeen() { storeSet(INTRO_KEY, "1"); }
function guestHome() {
  if (isAppSurface()) {
    if (!introSeen()) {
      S.view = "intro";
      S.introSlide = 0;
      return;
    }
    S.view = "auth";
    S.authMode = "signin";
    S.loginMethod = null;
    S.authStep = "choose";
    return;
  }
  S.view = "landing";
}

function signOut() {
  API.clearSession();
  S.user = null; S.authed = false; S.view = isAppSurface() ? "auth" : "landing";
  S.landingPage = "rider"; S.landingMenu = false; S.landingDoc = null;
  S.page = "home"; S.stack = []; S.sheet = null; S.opsView = null;
  S.authBusy = false; S.authError = null; S.otpBypass = false;
  S.authStep = "choose"; S.loginMethod = null; S.forgot = null;
  render();
}

const t = k => k.split(".").reduce((o,p)=>o&&o[p], T[S.lang]) ?? k;

/* error keys (message_key) → friendly, localized copy; unknown keys fall
   back to the generic message instead of leaking the raw key */
const errText = key => {
  const copy = t(key);
  return copy && copy !== key ? copy : t("error.internal");
};

/* Cooldown & lockout deadlines — persisted so a page refresh keeps the
   countdown honest (the server re-derives them on every request anyway). */
const setResendUntil = ms => { S.resendUntil = Date.now() + ms; storeSet("rs.resendUntil", String(S.resendUntil)); };
const setLockedUntil = date => {
  if (date) { S.lockedUntil = new Date(date); storeSet("rs.lockedUntil", String(S.lockedUntil.getTime())); }
  else { S.lockedUntil = null; try{localStorage.removeItem("rs.lockedUntil");}catch(e){} }
};
const L = o => S.lang==="ar" ? (o.ar ?? o.en) : o.en;
const money = n => {
  const v = Math.abs(n), sign = n<0 ? "−" : "";
  return S.lang==="ar" ? `${sign}${v} ج.م` : `${sign}${v} EGP`;
};

/* SVG has its own namespace, and `document.createElement("svg")` quietly hands
   back an HTML element: it parses, it has a class, it even reports a tag name —
   and it draws nothing and answers to no geometry API, so a whole illustration
   can be "built" and stay invisible. Every SVG tag therefore comes through here
   instead of createElement, and `className` goes the attribute route (an SVG
   element's className is read-only). One rule, in the one element factory. */
const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set(["svg","g","a","path","rect","circle","ellipse","line","polyline",
  "polygon","text","tspan","defs","use","symbol","marker","mask","clipPath","filter",
  "feGaussianBlur","linearGradient","radialGradient","stop","image"]);
const $ = (tag, opts={}, ...kids) => {
  const isSvg = SVG_TAGS.has(tag);
  const n = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  if (opts.class) { if (isSvg) n.setAttribute("class", opts.class); else n.className = opts.class; }
  if (opts.id != null) n.id = opts.id;   // convenience: id is a plain property
  if (opts.text != null) n.textContent = opts.text;
  if (opts.attrs) for (const [k,v] of Object.entries(opts.attrs)){
    if (v === true) n.setAttribute(k,"");
    else if (v != null && v !== false) n.setAttribute(k,v);
  }
  if (opts.style) Object.assign(n.style, opts.style);
  if (opts.on) for (const [e,f] of Object.entries(opts.on)) n.addEventListener(e,f);
  for (const k of kids.flat()){ if (k==null || k===false) continue;
    n.append(k.nodeType ? k : document.createTextNode(k)); }
  return n;
};

/* navigation — a real stack, so Back always has somewhere to go */
const go = (p) => { if (S.page!==p) S.stack.push(S.page); S.page=p; S.sheet=null; render(); };
const back = () => { S.page = S.stack.pop() || DEFAULT_PAGE[S.role]; S.sheet=null; render(); };
const openSheet = (s) => { S.sheet=s; render(); };
const closeSheet = () => { S.sheet=null; render(); };
const toast = (msg) => { S.toast=msg; render();
  clearTimeout(toast._h); toast._h=setTimeout(()=>{S.toast=null;render();}, 2600); };

/* ══════════════════════════════════════════════════════════════════════
   4. ICONS — one registry (§0.3: one place to change an icon)
   ══════════════════════════════════════════════════════════════════════ */
const ICON = {
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  trips:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
  wallet:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M17 14.5h.01"/>',
  safety:'<path d="M12 3l7.5 3v6c0 4.4-3.1 7.9-7.5 9-4.4-1.1-7.5-4.6-7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  profile:'<circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  duty:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  work:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  journey:'<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 10h16M7 21v-2M17 21v-2"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
  earnings:'<path d="M4 18V9M9 18V5M14 18v-6M19 18v-9"/>',
  queue:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  livemap:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  stops:'<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  routes:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 8h5.5"/>',
  users:'<circle cx="9" cy="8" r="3.2"/><path d="M2.5 19a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 13.4A6.5 6.5 0 0 1 21.5 19"/>',
  board:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M3 10h18"/>',
  coverage:'<path d="M4 20h16"/><path d="M4 15h4v5H4zM10 9h4v11h-4zM16 12h4v8h-4z"/>',
  pricing:'<path d="M20.6 13.4 12 22l-9-9V4h9z"/><circle cx="8" cy="8" r="1.4"/>',
  promos:'<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 6.6 19.6l1.2-6L3.3 9.4l6.1-.8z"/>',
  analytics:'<path d="M4 20h16"/><path d="m6 15 4-5 3.5 3L19 7"/>',
  lookup:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  tickets:'<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>',
  lost:'<path d="M20 7H4v13h16z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  back:'<path d="m15 5-7 7 7 7"/>', fwd:'<path d="m9 5 7 7-7 7"/>',
  signout:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="m10 8 4 4-4 4"/><path d="M14 12H4"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  /* The compact menu control is three dots and no chrome: a bordered square around
     a glyph reads as a button inside a bar that is already a bar. */
  dots:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  qr:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>',
  sos:'<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
  check:'<path d="m4 12 5 5L20 6"/>', close:'<path d="M6 6 18 18M18 6 6 18"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="m9 21 2-6-2-3V8l4-1 3 4 3 1"/><path d="m11 15-2 6M15 12l1 9"/>',
  bus:'<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 10h16M7 21v-2M17 21v-2"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
  phone:'<path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L17 13l4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6.5 3z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
  card:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/>',
  bell:'<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  moon:'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  sun:'<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
  doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  flag:'<path d="M5 21V4M5 5h11l-2 4 2 4H5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  seat:'<path d="M6 4h3a2 2 0 0 1 2 2v7H8a2 2 0 0 1-2-2z"/><path d="M6 17h11a2 2 0 0 0 2-2v-2h-8"/><path d="M19 17v3"/>',
  star:'<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 6.6 19.6l1.2-6L3.3 9.4l6.1-.8z"/>'
};

/* Brand mark — the user's bookmark-and-pin glyph. Filled, never stroked, and it
   takes the INK of whatever wraps it: there is no logo colour to keep in sync,
   because the mark is text-coloured by definition (the monochrome system in
   styles/shell.html). An explicit `fill` overrides that for the rare surface
   with no text context. The favicon is NOT one of them: it is generated from
   packages/brand/brand.json by apps/web/build.js, which is also the only place
   the mark's two literal colours are written down. */
const LOGO_PATH = BRAND.logo.path;   // the ONE brand source (packages/brand)
const logoSVG = (fill, cls) => {
  const s = document.createElementNS(SVG_NS,"svg");
  s.setAttribute("viewBox", BRAND.logo.viewBox);
  s.setAttribute("aria-hidden","true");
  if (cls) s.setAttribute("class", cls);
  const p = document.createElementNS(SVG_NS,"path");
  p.setAttribute("fill", fill || "currentColor");
  p.setAttribute("fill-rule","evenodd");
  p.setAttribute("clip-rule","evenodd");
  p.setAttribute("stroke","none");
  p.setAttribute("d", LOGO_PATH);
  s.append(p);
  return s;
};
const icon = (n, cls) => {
  const s = document.createElementNS(SVG_NS,"svg");
  s.setAttribute("viewBox","0 0 24 24");   // icons stay on the 24px grid
  s.setAttribute("aria-hidden","true");
  s.setAttribute("fill","none");
  s.setAttribute("stroke","currentColor");
  s.setAttribute("stroke-width","1.8");
  s.setAttribute("stroke-linecap","round");
  s.setAttribute("stroke-linejoin","round");
  if (cls) s.setAttribute("class", cls);
  s.innerHTML = ICON[n] || "";
  return s;
};

/* ══════════════════════════════════════════════════════════════════════
   5. COMPONENTS — pure functions: props -> element
   ══════════════════════════════════════════════════════════════════════ */
const Btn = ({label, kind="primary", block, driver, icon:ic, on, dis, size}) =>
  $("button",{class:`btn btn--${kind}${block?" btn--block":""}${driver?" btn--driver":""}${size==="sm"?" btn--sm":""}`,
    attrs:{type:"button", disabled:dis||null}, on:{click:on||(()=>{})}},
    ic?icon(ic):null, $("span",{text:label}));

const IconBtn = ({name,label,on,flip}) =>
  $("button",{class:`iconbtn${flip?" iconbtn--flip":""}`,
    attrs:{type:"button","aria-label":label}, on:{click:on||(()=>{})}}, icon(name));

const Chip = ({label, kind="", dot, on, pressed, dis}) => {
  const cls = `chip${kind?" chip--"+kind:""}`;
  if (on || pressed != null)
    return $("button",{class:cls, attrs:{type:"button", disabled:dis||null,
      "aria-pressed": pressed!=null ? String(pressed) : null},
      on:{click:on||(()=>{})}}, dot?$("span",{class:"dot"}):null, $("span",{text:label}));
  return $("span",{class:cls}, dot?$("span",{class:"dot"}):null, $("span",{text:label}));
};

const Card    = (cls, ...k) => $("div",{class:"card"+(cls?" "+cls:"")}, ...k);
const Panel   = (...k) => $("div",{class:"panel"}, ...k);
const Divider = () => $("div",{class:"divider"});
const Section = (title, ...k) => $("div",{class:"section"},
  title ? $("div",{class:"section__head"}, $("h2",{class:"t-head grow",text:title})) : null, ...k);
const Banner  = (kind, text) => $("div",{class:`banner banner--${kind}`},
  $("span",{class:"dot"}), $("span",{text}));
const Metric  = (m) => $("div",{class:"metric"},
  $("div",{class:"metric__v ltr",text:m.v}), $("div",{class:"metric__l",text:m.l}));
const KV = (k,v,strong=true) => $("div",{class:"row gap3"},
  $("span",{class:"t-cap grow",text:k}),
  $(strong?"strong":"span",{class:"ltr",text:v}));
const Empty = (ic, title, body, action) => $("div",{class:"empty"},
  $("div",{class:"empty__ico"}, icon(ic)), $("div",{class:"t-head",text:title}),
  body?$("div",{class:"t-cap",text:body}):null, action||null);

/* Row: one component owning row layout, so padding has exactly one owner. */
const Row = ({icon:ic, title, sub, right, on, dis, selected, bordered, chev}) =>
  $(on?"button":"div",{
    class:`rowitem${bordered?" rowitem--bordered":""}${selected?" rowitem--selected":""}`,
    attrs:{ type:on?"button":null, disabled:dis||null },
    on: on ? {click:(e)=>{ if(dis){e.preventDefault();return;} on(); }} : null},
    ic?icon(ic):null,
    $("div",{class:"stack grow gap1"},
      typeof title==="string" ? $("strong",{text:title}) : title,
      sub ? (typeof sub==="string" ? $("div",{class:"t-cap",text:sub}) : sub) : null),
    right||null,
    chev?icon("fwd","chev"):null);

/* Search: its own component. One owner of its box, so nothing fights it.
   `live` renders a REAL field: every keystroke calls onInput (the screen's
   own filter — never a dead input, §8.1), Enter calls on, and a clear button
   resets it. The value is restored after a re-render so a navigation never
   silently drops the query. */
const SearchBar = ({placeholder, on, live, value, onInput}) => {
  if (!live)
    return $("button",{class:"searchbar", attrs:{type:"button"}, on:{click:on||(()=>{})}},
      icon("lookup"), $("span",{class:"grow",text:placeholder}), icon("fwd","chev"));

  const input = $("input",{class:"searchbar__input",
    attrs:{type:"search", placeholder, "aria-label":placeholder}});
  if (value) input.value = value;
  const clear = $("button",{class:"searchbar__clear", attrs:{type:"button","aria-label":t("cancel")},
    on:{click:()=>{ input.value=""; clear.classList.remove("searchbar__clear--on"); input.focus(); onInput && onInput(""); }}},
    icon("close"));
  if (value) clear.classList.add("searchbar__clear--on");
  input.addEventListener("input", (e)=>{
    const v = e.currentTarget.value;
    clear.classList.toggle("searchbar__clear--on", !!v);
    if (onInput) onInput(v);
  });
  input.addEventListener("keydown", (e)=>{ if (e.key==="Enter" && on) on(); });
  return $("label",{class:"searchbar searchbar--field"}, icon("lookup"), input, clear);
};

const Table = (heads, rows) => {
  const tb=$("table",{class:"table"});
  tb.append($("thead",{}, $("tr",{}, ...heads.map(h=>$("th",{text:h})))));
  const body=$("tbody"); rows.forEach(r=>body.append(r)); tb.append(body);
  return $("div",{class:"tablewrap"}, tb);
};

const Sheet = (title, ...k) => $("div",{class:"sheet", attrs:{role:"dialog","aria-modal":"true",
  "aria-label":title||"Dialog"}},
  $("div",{class:"sheet__grip"}),
  title ? $("div",{class:"row gap2"},
    $("h2",{class:"t-head grow",text:title}),
    IconBtn({name:"close", label:t("cancel"), on:closeSheet})) : null,
  ...k);

/* Six-box one-time-code input — the industry-standard shape. Digits only,
   auto-advance, backspace/arrow navigation, paste and mobile one-time-code
   autofill distribute across the boxes. `onComplete` fires when all six are
   filled. Read the value with otpValue(). */
const otpValue = () =>
  [...document.querySelectorAll(".otp__box")].map((b) => b.value || "").join("").replace(/\D/g, "");
function OtpInput({ onComplete }) {
  const wrap = $("div", { class: "otp", attrs: { role: "group", "aria-label": t("codeLabel") } });
  const boxes = [];
  const allFilled = () => boxes.every((b) => b.value);
  for (let i = 0; i < 6; i++) {
    const inp = $("input", {
      class: "otp__box ltr",
      attrs: {
        type: "text", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6",
        "aria-label": `${t("codeLabel")} ${i + 1}`,
      },
    });
    inp.addEventListener("input", () => {
      const v = inp.value.replace(/\D/g, "");
      if (v.length > 1) { // paste or one-time-code autofill
        inp.value = "";
        v.slice(0, 6).split("").forEach((d, k) => { boxes[k].value = d; });
        boxes[Math.min(v.length, 6) - 1].focus();
      } else {
        inp.value = v;
        if (v && i < 5) boxes[i + 1].focus();
      }
      if (allFilled() && onComplete) onComplete(otpValue());
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !inp.value && i > 0) {
        boxes[i - 1].value = ""; boxes[i - 1].focus(); e.preventDefault();
      } else if (e.key === "ArrowLeft" && i > 0) { boxes[i - 1].focus(); }
      else if (e.key === "ArrowRight" && i < 5) { boxes[i + 1].focus(); }
    });
    boxes.push(inp);
  }
  wrap.append(...boxes);
  return wrap;
}

/* Map — drawn illustration. Labelled, never presented as live tiles. */
function MapView({h=200, route=true, vehicle=true, walk=false, stops=true, fleet=false, zoom=false, locate=false, onPick=null}){
  // Real map (Google when a key is configured, or OpenStreetMap via Leaflet —
  // DEC-198) once its SDK has loaded; otherwise the labelled illustration.
  // No fake tiles.
  if (window.__rsMapsOn && (window.google?.maps || window.L)) {
    return realMapView({h, route, locate, onPick});
  }
  const box=$("div",{class:"mapbox"+(zoom?" mapbox--zoom":""),style:{height:h+"px"}});
  if (locate) box.append($("button",{class:"mapbox__locate", attrs:{type:"button","aria-label":t("locateMe")},
    on:{click:()=>locateMe()}}, icon("stops"), $("span",{class:"t-cap",text:t("locateMe")})));
  const ns=SVG_NS;
  const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 400 220");
  svg.setAttribute("preserveAspectRatio","xMidYMid slice");
  svg.setAttribute("class","mapsvg");
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label", t("mapMock"));
  svg.innerHTML = `
    <rect width="400" height="220" fill="var(--map-land)"/>
    <path d="M0 172 Q70 160 130 176 T260 182 T400 168 L400 220 L0 220Z" fill="var(--map-water)"/>
    <rect x="24" y="20" width="66" height="44" rx="4" fill="var(--map-park)"/>
    <rect x="292" y="96" width="82" height="52" rx="4" fill="var(--map-park)"/>
    <g stroke="var(--map-road-minor)" stroke-width="7" stroke-linecap="round">
      <path d="M0 44h400M0 128h400M96 0v200M232 0v200M320 0v170"/>
    </g>
    <g stroke="var(--map-road)" stroke-width="11" stroke-linecap="round">
      <path d="M0 86h400M160 0v200"/>
    </g>
    <g fill="var(--map-building)">
      <rect x="112" y="52" width="26" height="20" rx="2"/><rect x="146" y="96" width="22" height="24" rx="2"/>
      <rect x="196" y="30" width="30" height="18" rx="2"/><rect x="248" y="104" width="26" height="22" rx="2"/>
      <rect x="60" y="98" width="24" height="18" rx="2"/><rect x="270" y="46" width="22" height="20" rx="2"/>
    </g>
    ${route?`<path d="M40 150 L96 150 L96 86 L232 86 L232 44 L360 44" fill="none"
      stroke="var(--accent-route)" stroke-width="5.5" stroke-linecap="round"
      stroke-linejoin="round" opacity=".92"/>`:""}
    ${walk?`<path d="M40 176 L40 150" fill="none" stroke="var(--accent-walk)" stroke-width="3.5"
      stroke-dasharray="2 6" stroke-linecap="round"/>
      <circle cx="40" cy="176" r="6" fill="var(--accent-walk)"/>
      <circle cx="40" cy="176" r="11" fill="var(--accent-walk)" opacity=".2"/>`:""}
    ${stops?`<g>
      <circle cx="96" cy="150" r="6.5" fill="var(--bg-base)" stroke="var(--accent-route)" stroke-width="3"/>
      <circle cx="96" cy="86"  r="6.5" fill="var(--bg-base)" stroke="var(--accent-route)" stroke-width="3"/>
      <circle cx="232" cy="86" r="6.5" fill="var(--bg-base)" stroke="var(--accent-route)" stroke-width="3"/>
      <circle cx="232" cy="44" r="6.5" fill="var(--bg-base)" stroke="var(--accent-route)" stroke-width="3"/>
      <circle cx="360" cy="44" r="7.5" fill="var(--brand)" stroke="var(--bg-base)" stroke-width="3"/>
    </g>`:""}
    ${vehicle?`<g transform="translate(150,79)">
      <rect x="-15" y="-9" width="30" height="18" rx="5" fill="var(--brand)"/>
      <rect x="-9" y="-5" width="18" height="7" rx="2" fill="var(--qr-paper)" opacity=".85"/>
    </g>`:""}
    ${fleet?`<g fill="var(--brand)">
      <circle cx="70" cy="120" r="7"/><circle cx="205" cy="60" r="7"/>
      <circle cx="300" cy="130" r="7"/><circle cx="120" cy="40" r="7"/>
    </g>`:""}`;
  box.append(svg,
    $("div",{class:"mapctl"},
      $("button",{attrs:{type:"button","aria-label":"Zoom in"},text:"+"}),
      $("button",{attrs:{type:"button","aria-label":"Zoom out"},text:"−"})),
    $("div",{class:"attribution",text:t("mapMock")}));
  return box;
}

/* Real map — Google when GOOGLE_MAPS_API_KEY is set, otherwise OpenStreetMap
   via Leaflet (DEC-198, free + no key). Honest fallback: with no SDK loaded
   the illustration renders and is labelled as such. `onPick` (lat,lng) turns
   the map into a coordinate picker for the desk mapping tool. */
const ALEX_CENTER = { lat: 31.2241, lng: 29.9549 }; // Alexandria
function realMapView({h, route, locate, onPick}) {
  const id = "gmap-" + Math.random().toString(36).slice(2, 9);
  const box = $("div",{class:"mapbox mapbox--real",style:{height:h+"px"}});
  box.append($("div",{class:"mapbox__canvas",attrs:{id, "aria-label":t("mapLive")}}));
  if (locate) box.append($("button",{class:"mapbox__locate", attrs:{type:"button","aria-label":t("locateMe")},
    on:{click:()=>locateMe()}}, icon("stops"), $("span",{class:"t-cap",text:t("locateMe")})));
  box.append($("div",{class:"attribution",text: window.L ? "OpenStreetMap" : "Google"}));
  // init after the element is in the DOM
  setTimeout(()=>{
    const el = document.getElementById(id);
    if (!el) return;

    if (window.L) {                       // OpenStreetMap via Leaflet
      const map = L.map(el, { zoomControl: false, attributionControl: true });
      map.setView([ALEX_CENTER.lat, ALEX_CENTER.lng], 13);
      L.tileLayer("https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.webp", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      window.__rsMapInstance = map;
      if (onPick) map.on("click", (e) => onPick(e.latlng.lat, e.latlng.lng));
      return;
    }

    if (!window.google?.maps) return;
    const map = new google.maps.Map(el, {
      center: ALEX_CENTER, zoom: 13,
      disableDefaultUI: true, clickableIcons: false,
      styles: [], fullscreenControl: false, streetViewControl: false,
    });
    window.__rsMapInstance = map;
    if (onPick) map.addListener("click", (e) => onPick(e.latLng.lat(), e.latLng.lng()));
    // Route drawing lives ONLY in lib/map.js RouteMap, driven by real data
    // (R21): the old hardcoded demo polyline was a §8 no-demo-data violation.
    new google.maps.Marker({ position: ALEX_CENTER, map, title: t("brand") });
  }, 0);
  return box;
}

function locateMe() {
  const map = window.__rsMapInstance;
  if (!map) { toast("locateDenied"); return; }
  const go = (lat, lng) => {
    if (map.setView) map.setView([lat, lng], map.getZoom && map.getZoom() > 3 ? map.getZoom() : 13);
    else map.setCenter({ lat, lng });
  };
  Platform.getPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 })
    .then((pos) => pos ? go(pos.lat, pos.lng) : go(ALEX_CENTER.lat, ALEX_CENTER.lng));
}

/* QR — deterministic blocks + the numeric code that is the real fallback */
/* InstallQR paints a matrix that a camera can decode — see lib/qr.js, which is
   the encoder and says why the two must not be confused. The boarding code above
   is a visual aid for a person at a desk (the scannable value there is the text
   code); an install link is scanned by a stranger's phone, so its pattern has to
   be real. The art is aria-hidden because the URL beside it is the accessible
   version of the same fact. */
function InstallQR(text){
  const q = QR.encode(text, "M");
  const ns = SVG_NS, quiet = 4, n = q.size + quiet * 2;
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${n} ${n}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const inData = r >= quiet && c >= quiet && r < quiet + q.size && c < quiet + q.size;
    if (inData && q.grid[r - quiet][c - quiet]) d += `M${c} ${r}h1v1h-1z`;
  }
  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", n); bg.setAttribute("height", n);
  bg.setAttribute("fill", "var(--qr-paper)");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d); path.setAttribute("fill", "var(--qr-ink)");
  svg.append(bg, path);
  return svg;
}

function QRPanel({code}){
  const ns=SVG_NS, n=21, cell=8;
  const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox",`0 0 ${n*cell} ${n*cell}`);
  svg.setAttribute("class","qr");
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label", t("boardingCode")+" "+code.split("").join(" "));
  let r=`<rect width="${n*cell}" height="${n*cell}" fill="var(--qr-paper)"/>`;
  const finder=(x,y)=>`<rect x="${x*cell}" y="${y*cell}" width="${7*cell}" height="${7*cell}" fill="var(--qr-ink)"/>
    <rect x="${(x+1)*cell}" y="${(y+1)*cell}" width="${5*cell}" height="${5*cell}" fill="var(--qr-paper)"/>
    <rect x="${(x+2)*cell}" y="${(y+2)*cell}" width="${3*cell}" height="${3*cell}" fill="var(--qr-ink)"/>`;
  r+=finder(0,0)+finder(n-7,0)+finder(0,n-7);
  let s=parseInt(code,10)||7;
  const rnd=()=> (s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff;
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){
    const inF=(x<8&&y<8)||(x>n-9&&y<8)||(x<8&&y>n-9);
    if(!inF && rnd()>0.52) r+=`<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="var(--qr-ink)"/>`;
  }
  svg.innerHTML=r;
  return $("div",{class:"qrwrap"}, svg,
    $("div",{class:"stack center gap1"},
      $("div",{class:"t-micro",text:t("boardingCode")}),
      $("div",{class:"qrcode ltr",text:code})),
    $("div",{class:"t-cap",text:t("scanAtDoor")}));
}

const VehicleId = (v) => $("div",{class:"row gap3"},
  $("div",{class:"avatar",style:{background:v.colour,color:"var(--on-solid)"}}, icon("bus")),
  $("div",{class:"stack grow gap1"},
    $("div",{class:"row gap2"},
      $("strong",{class:"ltr",text:v.plate}),
      Chip({label:v.colourName})),
    $("div",{class:"t-cap",text:`${v.model} · ${v.driver} · ★ ${v.rating}`})));

const RouteCard = (r, on) => $("button",{class:"routecard", attrs:{type:"button"},
  on:{click:on||(()=>{ S.chosenRoute=r; go("boarding"); })}},
  $("div",{class:"stack grow gap1"},
    $("div",{class:"routeline",text:L(r)}),
    $("div",{class:"t-cap",text:`${S.lang==="ar"?r.everyAr:r.every} · ${r.window}`})),
  $("div",{class:"stack",style:{alignItems:"flex-end"}},
    $("div",{class:"fare",text:money(r.fare)}),
    $("div",{class:"t-micro",text:t("fixedPrice")})));
