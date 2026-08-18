/* ══════════════════════════════════════════════════════════════════════
   3. STATE + HELPERS
   ══════════════════════════════════════════════════════════════════════ */
/* Safe storage — localStorage throws on opaque origins (file://, jsdom),
   which must never crash the app. */
const storeGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const storeSet = (k,v) => { try{ localStorage.setItem(k,v); }catch(e){} };

/* resolvedTheme: S.theme is a preference ("auto"|"light"|"dark"); the resolved
   value is what the DOM actually renders. Auto follows the device setting. */
const resolvedTheme = () => {
  if (S.theme === "auto") {
    try { return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark" : "light"; } catch(e){ return "light"; }
  }
  return S.theme;
};

const S = {
  role:"rider", lang:"en", theme: storeGet("rs.theme") || "auto",
  rail: storeGet("rs.rail") ?? "collapsed",   // collapsed is the DEFAULT (owner)
  view:"boot",                                // boot | landing | auth | app
  authed:false, user:null,                    // user comes from the session
  authMode:"signin", authTab:"staff",         // signin | signup ; staff | rider
  signupRole:"rider",                          // rider | driver (the only signup choices)
  loginMethod:null, authIdentifier:"",          // smart sign-in: 'password' | 'otp'
  forgot:null, resendUntil:null, lockedUntil:null,
  emailToast:null, emailToastKind:"info",
  authStep:"phone", authBusy:false, authError:null,
  authPhone:"", authName:"",
  page:"home", sheet:null, toast:null,
  chosenRoute:null, chosenBoard:null, chosenDep:null, seats:1,
  tripTab:"upcoming", offline:false, gettingOff:false, onDuty:true,
  opsView:null, stack:[]
};

/* enter the signed-in app with the session user; role comes from auth, never
   a switcher (§8 — the demo role switcher is gone). */
function enterApp(user) {
  S.user = user;
  S.role = user.role;
  S.authed = true;
  S.view = "app";
  S.page = DEFAULT_PAGE[S.role] || "home";
  S.stack = [];
  S.sheet = null; S.opsView = null;
  render();
}

function signOut() {
  API.clearSession();
  S.user = null; S.authed = false; S.view = "landing";
  S.page = "home"; S.stack = []; S.sheet = null; S.opsView = null;
  render();
}

const t = k => k.split(".").reduce((o,p)=>o&&o[p], T[S.lang]) ?? k;
const L = o => S.lang==="ar" ? (o.ar ?? o.en) : o.en;
const money = n => {
  const v = Math.abs(n), sign = n<0 ? "−" : "";
  return S.lang==="ar" ? `${sign}${v} ج.م` : `${sign}${v} EGP`;
};

const $ = (tag, opts={}, ...kids) => {
  const n = document.createElement(tag);
  if (opts.class) n.className = opts.class;
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
  qr:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>',
  sos:'<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
  check:'<path d="m4 12 5 5L20 6"/>', close:'<path d="M6 6 18 18M18 6 6 18"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="m9 21 2-6-2-3V8l4-1 3 4 3 1"/><path d="m11 15-2 6M15 12l1 9"/>',
  bus:'<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 10h16M7 21v-2M17 21v-2"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
  phone:'<path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L17 13l4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6.5 3z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
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

/* Brand mark — the user's bookmark-and-pin glyph. Filled (not stroked), and
   coloured by the brand gradient defined once in the document, or by the
   given fill. */
const LOGO_PATH = "M10.6223 3.90741c-1.20712-1.20714-3.09489-1.23486-4.30929-.02046-.41495.41495-.71699.96417-.84122 1.55432-.59015.12423-1.13937.42627-1.55432.84122-1.2144 1.2144-1.18669 3.10218.02046 4.30931.96862.9686 2.37548 1.1779 3.52103.5953l1.47896 1.3553c-.05911.3509-.08406.7078-.07998 1.0623.01453 1.26.39197 2.5758 1.00914 3.7262.13522.252.37182.4341.65002.5002.2782.0661.5714.0099.8055-.1543.5376-.3772.9988-.4969 1.3707-.4979.3764-.0009.7303.1199 1.0473.3317.5919.3956.8671 1.1024.4524 2.0481-.1383.3154-.1045.6799.0894.9646.1939.2847.5207.4495.8649.4362 1.437-.0553 2.7584-.8034 3.8989-1.9439 1.1842-1.1842 1.7637-2.5978 1.6758-4.071-.0866-1.4527-.8131-2.8268-1.9736-3.9873-1.1796-1.17955-2.7171-1.95508-4.2554-2.16837-.5785-.08021-1.1679-.08125-1.7413.01127l-1.5065-1.42739c.548-1.13519.3301-2.5124-.6229-3.4654Zm.0919 5.71744L9.2479 8.23554c-.19592-.18563-.30849-.44256-.31213-.71243-.00363-.26987.10196-.52975.29281-.72059.41457-.41457.42454-1.03588-.02046-1.48089-.44501-.44501-1.06633-.43503-1.4809-.02046-.26525.26524-.35944.64193-.30022.89134.08017.33765-.02045.69273-.26584.93813-.2454.2454-.60048.34602-.93813.26584-.24941-.05922-.6261.03498-.89135.30022-.41457.41457-.42455 1.03589.02046 1.4809.44501.44501 1.06633.43503 1.4809.02046.37853-.37854.98803-.39183 1.38271-.03016l1.5307 1.4027c.11824-.1603.24972-.314.39525-.4595.1813-.1813.3728-.34306.5725-.48625Z";
const logoSVG = (fill, cls) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg","svg");
  s.setAttribute("viewBox","0 0 24 24");
  s.setAttribute("aria-hidden","true");
  if (cls) s.setAttribute("class", cls);
  const p = document.createElementNS("http://www.w3.org/2000/svg","path");
  p.setAttribute("fill", fill || "url(#brandGrad)");
  p.setAttribute("fill-rule","evenodd");
  p.setAttribute("clip-rule","evenodd");
  p.setAttribute("stroke","none");
  p.setAttribute("d", LOGO_PATH);
  s.append(p);
  return s;
};
const icon = (n, cls) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg","svg");
  s.setAttribute("viewBox","0 0 24 24");
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
const Btn = ({label, kind="primary", block, driver, icon:ic, on, dis}) =>
  $("button",{class:`btn btn--${kind}${block?" btn--block":""}${driver?" btn--driver":""}`,
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

/* Search: its own component. One owner of its box, so nothing fights it. */
const SearchBar = ({placeholder, on, live}) => live
  ? $("label",{class:"searchbar searchbar--field"}, icon("lookup"),
      $("input",{attrs:{type:"search", placeholder, "aria-label":placeholder}}))
  : $("button",{class:"searchbar", attrs:{type:"button"}, on:{click:on||(()=>{})}},
      icon("lookup"), $("span",{class:"grow",text:placeholder}), icon("fwd","chev"));

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

/* Map — drawn illustration. Labelled, never presented as live tiles. */
function MapView({h=200, route=true, vehicle=true, walk=false, stops=true, fleet=false, zoom=false, locate=false}){
  // Real Google Maps when the key is configured (via /v1/config) and the
  // script has loaded; otherwise the labelled illustration. No fake tiles.
  if (window.__rsMapsOn && typeof google === "object" && google.maps) {
    return realMapView({h, route, locate});
  }
  const box=$("div",{class:"mapbox"+(zoom?" mapbox--zoom":""),style:{height:h+"px"}});
  if (locate) box.append($("button",{class:"mapbox__locate", attrs:{type:"button","aria-label":t("locateMe")},
    on:{click:()=>locateMe()}}, icon("stops"), $("span",{class:"t-cap",text:t("locateMe")})));
  const ns="http://www.w3.org/2000/svg";
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

/* Real Google Map — activates only when GOOGLE_MAPS_API_KEY is set and the
   script has loaded. Honest fallback: without the key, the illustration
   renders and is labelled as such. Geolocation (navigator.geolocation) is
   exercised here so the Capacitor mobile build inherits it for free. */
const ALEX_CENTER = { lat: 31.2241, lng: 29.9549 }; // Alexandria
function realMapView({h, route, locate}) {
  const id = "gmap-" + Math.random().toString(36).slice(2, 9);
  const box = $("div",{class:"mapbox mapbox--real",style:{height:h+"px"}});
  box.append($("div",{class:"mapbox__canvas",attrs:{id, "aria-label":t("mapLive")}}));
  if (locate) box.append($("button",{class:"mapbox__locate", attrs:{type:"button","aria-label":t("locateMe")},
    on:{click:()=>locateMe()}}, icon("stops"), $("span",{class:"t-cap",text:t("locateMe")})));
  box.append($("div",{class:"attribution",text:"Google"}));
  // init after the element is in the DOM
  setTimeout(()=>{
    const el = document.getElementById(id);
    if (!el || !window.google?.maps) return;
    const map = new google.maps.Map(el, {
      center: ALEX_CENTER, zoom: 13,
      disableDefaultUI: true, clickableIcons: false,
      styles: [], fullscreenControl: false, streetViewControl: false,
    });
    window.__rsMapInstance = map;
    if (route) {
      // token, not a literal — the design system owns every colour (§0.3)
      const brand = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim() || "violet";
      new google.maps.Polyline({
        path: [{lat:31.2456,lng:29.9839},{lat:31.2241,lng:29.9549},{lat:31.2037,lng:29.9196}],
        map, geodesic:true,
        strokeColor: brand, strokeOpacity:0.9, strokeWeight:5,
      });
    }
    new google.maps.Marker({ position: ALEX_CENTER, map, title: t("brand") });
  }, 0);
  return box;
}

function locateMe() {
  const map = window.__rsMapInstance;
  if (map && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast("locateDenied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  } else if (map) {
    map.setCenter(ALEX_CENTER);
  } else {
    toast("locateDenied");
  }
}

/* QR — deterministic blocks + the numeric code that is the real fallback */
function QRPanel({code}){
  const ns="http://www.w3.org/2000/svg", n=21, cell=8;
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
