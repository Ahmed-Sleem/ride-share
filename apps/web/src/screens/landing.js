/* ══════════════════════════════════════════════════════════════════════
   Landing page — the front door. Uber/Careem-style: a sticky top bar with
   Ride (default) · Drive · About · Help · language · theme · Log in · Sign up,
   a separate marketing PAGE for riders and for drivers, an About and a Help
   page, and filled policy documents. The hero is full-bleed with the feature
   slideshow; below it, scroll-driven reveals + full-bleed sticky "stacking
   panels" (native CSS position:sticky — the next panel slides over the last,
   no scroll library). Everything is light/dark + RTL via the shared tokens,
   and reduced-motion collapses every effect to the static page.
   ══════════════════════════════════════════════════════════════════════ */
function landing() {
  document.querySelectorAll("body > .step-tip").forEach((el) => el.remove());
  const shareTok = (typeof location !== "undefined" && location.search)
    ? new URLSearchParams(location.search).get("share") : null;
  if (shareTok) return shareLanding(shareTok);
  if (S.landingDoc) return landingDoc();
  const page = ({ rider: riderLanding, drive: driveLanding, about: aboutLanding, help: helpLanding, download: downloadLanding })[S.landingPage] || riderLanding;
  return page();
}

function shareLanding(token) {
  const root = $("div", { class: "landing" }, landingNav(),
    $("div", { class: "landing__body landing__body--page" },
      $("section", { class: "landing__section landing__pagetop" },
        $("h1", { class: "landing__title", text: t("j_shareTitle") }),
        $("div", { id: "share-live", class: "stack gap3" }, Empty("livemap", t("shareTrip"), t("j_shareLoading"))))));
  loadPublicShare(token);
  return root;
}

async function loadPublicShare(token) {
  const el = document.getElementById("share-live");
  if (!el) return;
  try {
    const d = await API.publicShare(token);
    el.innerHTML = "";
    if (d.ended) el.append(Banner("info", t("j_shareEnded")));
    el.append(Card("",
      $("strong", { text: d.routeName || "—" }),
      $("div", { class: "t-cap ltr", text: d.serviceDate || "" }),
      d.driverFirst ? $("div", { class: "t-cap", text: t("j_shareDriver") + " " + d.driverFirst }) : null,
      (d.lat != null && d.lng != null)
        ? $("div", { class: "t-cap ltr", text: Number(d.lat).toFixed(4) + ", " + Number(d.lng).toFixed(4) })
        : $("div", { class: "t-cap", text: t("j_shareNoPos") })));
  } catch (e) {
    el.innerHTML = "";
    el.append(Empty("share", t("shareTrip"), errText(e.messageKey)));
  }
}

/* ── shared chrome ────────────────────────────────────────────────────── */

/* The sticky top bar. Desktop: brand · Ride/Drive/About/Help · … · EN · theme ·
   Log in · Sign up. Compact: brand · theme · Sign up · menu (the links + Log in
   move into the dropdown). §8.1: every control does exactly what it says. */
function landingNav() {
  const links = [["rider", "navRide"], ["drive", "navDrive"], ["about", "navAbout"], ["help", "navHelp"], ["download", "navDownload"]];
  const nav = $("header", { class: "landing__nav" });

  nav.append($("button", {
    class: "landing__brand", attrs: { type: "button", "aria-label": t("brand") },
    on: { click: () => landingGo("rider") },
  }, logoSVG(), $("span", { text: t("brand") })));

  const linksEl = $("nav", { class: "landing__links", attrs: { "aria-label": t("menu") } });
  links.forEach(([k, lbl]) => linksEl.append(landingLink(k, lbl)));
  nav.append(linksEl);

  const actions = $("div", { class: "landing__actions" });
  actions.append($("span", { class: "landing__tgl" }, langToggle()),
                 $("span", { class: "landing__tgl landing__tgl--theme" }, themeToggle()));
  actions.append($("button", {
    class: "landing__login", attrs: { type: "button" }, text: t("login"),
    on: { click: () => authGo("signin") },
  }));
  actions.append(Btn({ label: t("signup"), on: () => authGo("signup") }));
  nav.append(actions);

  nav.append($("button", {
    class: "landing__menu", attrs: { type: "button", "aria-label": t("menu"), "aria-expanded": String(!!S.landingMenu) },
    on: { click: () => { S.landingMenu = !S.landingMenu; render(); } },
  }, icon("menu")));

  if (S.landingMenu) {
    const dd = $("div", { class: "landing__menu-panel", attrs: { role: "navigation", "aria-label": t("menu") } });
    links.forEach(([k, lbl]) => dd.append($("button", {
      class: "landing__menulink", attrs: { type: "button" }, text: t(lbl),
      on: { click: () => { S.landingMenu = false; landingGo(k); } },
    })));
    dd.append($("div", { class: "divider" }));
    dd.append($("button", {
      class: "landing__menulink", attrs: { type: "button" }, text: t("login"),
      on: { click: () => { S.landingMenu = false; authGo("signin"); } },
    }));
    dd.append(Btn({ label: t("signup"), block: true, on: () => { S.landingMenu = false; authGo("signup"); } }));
    nav.append(dd);
  }
  return nav;
}

function landingLink(k, lbl) {
  return $("button", {
    class: "landing__link" + (S.landingPage === k ? " landing__link--on" : ""),
    attrs: { type: "button", "aria-current": S.landingPage === k ? "page" : null },
    text: t(lbl),
    on: { click: () => landingGo(k) },
  });
}

/* Navigate between landing pages: swap content and return to the top. */
function landingGo(page) {
  S.landingPage = page; S.landingMenu = false; render();
  const l = document.querySelector(".landing");
  if (l) l.scrollTop = 0;
}

function authGo(mode) {
  S.view = "auth"; S.authMode = mode; S.landingMenu = false;
  if (mode === "signup") { S.authStep = "choose"; } else { S.loginMethod = null; }
  S.authError = null;
  render();
}

function landingFooter() {
  return $("footer", { class: "landing__foot" },
    $("span", { class: "t-cap", text: t("brand") + " · " + t("landingFoot") }),
    $("div", { class: "landing__policies" },
      policyLink("terms"), policyLink("privacy"), policyLink("safety")));
}

/* ── RIDER page (default) ─────────────────────────────────────────────── */
function riderLanding() {
  const root = $("div", { class: "landing" },
    landingNav(),

    $("section", { class: "landing__hero" },
      $("div", { class: "landing__heroinner" },
        $("div", { class: "landing__herotext" },
          $("h1", { class: "landing__title", text: t("landingHero") }),
          $("p", { class: "landing__sub", text: t("landingHeroSub") }),
          $("div", { class: "row gap3" },
            Btn({ label: t("landingCtaStart"), on: () => authGo("signup") }),
            Btn({ label: t("landingCtaSignIn"), kind: "outline", on: () => authGo("signin") }))),
        heroStage("hero"))),

    $("section", { class: "stackpanels", attrs: { "aria-label": t("panelKick") } },
      storyDust(),
      stackPanel("seat",  "1", "violet", t("panel1T"), t("panel1B"), t("panelKick")),
      stackPanel("price", "2", "mint",   t("panel2T"), t("panel2B")),
      stackPanel("boardfast", "3", "sky",    t("panel3T"), t("panel3B")),
      stackPanel("route", "4", "coral",  t("panel4T"), t("panel4B"))),

    $("div", { class: "landing__body" },
      $("section", { class: "landing__section landing__section--afterstory" },
        $("div", { class: "landing__grid" },
          featureCard("wallet",  t("landingF1T"), t("landingF1B"), "mint"),
          featureCard("clock",   t("featureScheduleT"), t("featureScheduleB"), "sky"),
          featureCard("card",    t("featureCashT"), t("featureCashB"), "coral"),
          featureCard("livemap", t("landingF4T"), t("landingF4B"), "pink"),
          featureCard("promos",  t("landingF3T"), t("landingF3B"), "lime"),
          featureCard("check",   t("safetyF1T"), t("safetyF1B"), "mint"),
          featureCard("sos",     t("safetyF3T"), t("safetyF3B"), "coral"))),

      $("section", { class: "landing__section" },
        $("h2", { class: "landing__h2", text: t("landingHowTitle") }),
        $("div", { class: "landing__steps" },
          stepCard("1", "way",   t("landingHow1T"), t("landingHow1B"), "violet"),
          stepCard("2", "seat",  t("landingHow2T"), t("landingHow2B"), "sky"),
          stepCard("3", "board", t("landingHow3T"), t("landingHow3B"), "mint"))),

      $("section", { class: "landing__cta" },
        $("h2", { class: "landing__h2", text: t("landingFoot") }),
        $("div", { class: "row gap3 center" },
          Btn({ label: t("landingCtaStart"), on: () => authGo("signup") }),
          Btn({ label: t("landingCtaSignIn"), kind: "outline", on: () => authGo("signin") })))),

    landingFooter());
  bindStoryScroll(root);
  return root;
}

/* Sticky chapter: illustration + particles + parallax layers.
   Kick line lives on the first slide (not above the slider). */
function storyDust() {
  return $("div", { class: "stackpanels__dust", attrs: { "aria-hidden": "true" } },
    dustLayer("far", DUST.far),
    dustLayer("mid", DUST.mid),
    dustLayer("near", DUST.near));
}

/* Composed sky, not a hash scatter: clusters at the corners, a thin arc
   above the copy, and the centre (art + title) left clear. */
const DUST = {
  far: [
    [4,8,1],[9,14,1],[14,6,1],[18,18,1],[7,28,1],[22,10,1],
    [78,7,1],[84,12,1],[91,6,1],[96,16,1],[88,24,1],[80,20,1],
    [6,72,1],[11,80,1],[3,88,1],[16,90,1],[8,96,1],
    [82,78,1],[90,84,1],[95,74,1],[88,92,1],[76,88,1],
    [30,4,1],[38,8,1],[46,3,1],[54,7,1],[62,4,1],[70,9,1],
    [28,94,1],[42,96,1],[58,93,1],[66,97,1],
  ],
  mid: [
    [8,12,2],[15,20,1],[12,32,2],
    [86,10,2],[93,18,1],[80,28,2],[97,30,1],
    [5,68,2],[10,84,1],[18,76,2],
    [84,70,2],[92,80,1],[78,86,2],
    [34,10,1],[50,6,2],[66,12,1],
    [24,88,1],[48,92,2],[72,90,1],
  ],
  near: [
    [6,16,3],[16,8,2],
    [90,14,3],[84,6,2],
    [8,82,3],
    [92,76,3],[86,90,2],
    [48,8,2],
    [20,92,2],[70,88,3],
  ],
};

function dustLayer(kind, stars) {
  const el = $("div", { class: "stackpanels__dustin stackpanels__dustin--" + kind });
  const tiled = [];
  [0, 110, 220].forEach((off) => {
    stars.forEach(([x, y, r]) => tiled.push(x + "vw " + (y + off) + "vh 0 " + r + "px var(--on-solid)"));
  });
  el.style.boxShadow = tiled.join(",");
  return el;
}

function stackPanel(ic, n, tone, title, body, kick) {
  const copyKids = [];
  if (kick) copyKids.push($("div", { class: "landing__kick stackpanel__kick", text: kick }));
  copyKids.push($("h3", { class: "stackpanel__t", text: title }));
  copyKids.push($("p", { class: "stackpanel__b", text: body }));
  return $("article", { class: "stackpanel stackpanel--" + tone },
    $("div", { class: "stackpanel__stage", attrs: { "aria-hidden": "true" } },
      $("div", { class: "stackpanel__mesh" }),
      $("div", { class: "stackpanel__orb stackpanel__orb--a" }),
      $("div", { class: "stackpanel__orb stackpanel__orb--b" }),
      $("div", { class: "stackpanel__orb stackpanel__orb--c" }),
      $("div", { class: "stackpanel__ring" }),
      $("span", { class: "stackpanel__ghost ltr", text: n })),
    $("div", { class: "stackpanel__inner" },
      stickerEl(ic, "stackpanel__art"),
      $("div", { class: "stackpanel__copy" }, ...copyKids)));
}

/* ── DRIVE page ───────────────────────────────────────────────────────── */
function driveLanding() {
  const root = $("div", { class: "landing" },
    landingNav(),

    $("section", { class: "landing__hero" },
      $("div", { class: "landing__heroinner" },
        $("div", { class: "landing__herotext" },
          $("div", { class: "landing__kick", text: t("driveHeroKick") }),
          $("h1", { class: "landing__title", text: t("driveHeroT") }),
          $("p", { class: "landing__sub", text: t("driveHeroB") }),
          $("div", { class: "row gap3" },
            Btn({ label: t("applyToDrive"), on: () => authGo("signup") }),
            Btn({ label: t("landingCtaSignIn"), kind: "outline", on: () => authGo("signin") }))),
        heroStage("drivehero"))),

    $("section", { class: "stackpanels", attrs: { "aria-label": t("driveHeroKick") } },
      storyDust(),
      stackPanel("hours", "1", "sky",    t("driverF4T"), t("driverF4B"), t("driveHeroKick")),
      stackPanel("book",  "2", "mint",   t("driverF2T"), t("driverF2B")),
      stackPanel("save",  "3", "coral",  t("driverF3T"), t("driverF3B")),
      stackPanel("noroute", "4", "violet", t("driverF5T"), t("driverF5B"))),

    $("div", { class: "landing__body" },
      $("section", { class: "landing__section landing__section--afterstory" },
        $("div", { class: "landing__grid" },
          featureCard("doc",      t("driverF1T"), t("driverF1B"), "sky"),
          featureCard("clock",    t("driverF2T"), t("driverF2B"), "mint"),
          featureCard("card",     t("driverF3T"), t("driverF3B"), "coral"),
          featureCard("duty",     t("driverF4T"), t("driverF4B"), "pink"),
          featureCard("routes",   t("driverF5T"), t("driverF5B"), "lime"),
          featureCard("earnings", t("driverF6T"), t("driverF6B"), "sky"))),

      $("section", { class: "landing__section" },
        $("h2", { class: "landing__h2", text: t("driveStepsKick") }),
        $("div", { class: "landing__steps" },
          stepCard("1", "book",  t("driveStep1T"), t("driveStep1B"), "violet"),
          stepCard("2", "secure", t("driveStep2T"), t("driveStep2B"), "sky"),
          stepCard("3", "hours", t("driveStep3T"), t("driveStep3B"), "mint"),
          stepCard("4", "drivehero", t("driveStep4T"), t("driveStep4B"), "coral"))),

      $("section", { class: "landing__cta" },
        $("h2", { class: "landing__h2", text: t("driveReqT") }),
        $("p", { class: "landing__p landing__cta-sub", text: t("driveReqB") }),
        $("div", { class: "row gap3 center" },
          Btn({ label: t("applyToDrive"), on: () => authGo("signup") }),
          Btn({ label: t("landingCtaSignIn"), kind: "outline", on: () => authGo("signin") })))),

    landingFooter());
  bindStoryScroll(root);
  return root;
}

/* ── ABOUT + HELP pages ───────────────────────────────────────────────── */
function aboutLanding() {
  return $("div", { class: "landing" },
    landingNav(),
    $("div", { class: "landing__body landing__body--page" },
      $("section", { class: "landing__section landing__pagetop" },
        $("div", { class: "landing__kick", text: t("aboutKick") }),
        $("h1", { class: "landing__title", text: t("aboutTitle") }),
        $("p", { class: "landing__p", text: t("aboutP1") }),
        $("p", { class: "landing__p", text: t("aboutP2") }),
        $("p", { class: "landing__p", text: t("aboutP3") }),
        $("div", { class: "row gap3" },
          Btn({ label: t("landingCtaStart"), on: () => authGo("signup") }),
          Btn({ label: t("navDrive"), kind: "outline", on: () => landingGo("drive") })))),
    landingFooter());
}

function downloadLanding() {
  const origin = (typeof location !== "undefined" && location.origin && location.protocol !== "file:")
    ? location.origin : "https://ride-shareweb-production.up.railway.app";
  const apkUrl = origin + "/download/android.apk";
  const qrSrc = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(apkUrl);
  return $("div", { class: "landing" },
    landingNav(),
    $("div", { class: "landing__body landing__body--page" },
      $("section", { class: "landing__section landing__pagetop" },
        $("div", { class: "landing__kick", text: t("navDownload") }),
        $("h1", { class: "landing__title", text: t("j_dlTitle") }),
        $("p", { class: "landing__p", text: t("j_dlSub") }),
        $("p", { class: "t-cap", text: t("j_dlHint") }),
        $("div", { class: "row wrap gap4", style: { alignItems: "flex-start" } },
          $("div", { class: "stack gap3" },
            $("a", { class: "btn btn--primary", attrs: { href: apkUrl, download: "ride-share.apk" }, text: t("j_dlAndroid") }),
            $("div", { class: "card card--tight" },
              $("strong", { text: t("j_dlIos") }),
              $("p", { class: "t-cap", text: t("j_dlIosSoon") }))),
          $("div", { class: "stack gap2 center" },
            $("div", { class: "t-cap", text: t("j_dlQr") }),
            $("img", { class: "dlqr", attrs: { src: qrSrc, width: "220", height: "220", alt: t("j_dlQr") } }))))),
    landingFooter());
}

function helpLanding() {
  return $("div", { class: "landing" },
    landingNav(),
    $("div", { class: "landing__body landing__body--page" },
      $("section", { class: "landing__section landing__pagetop" },
        $("div", { class: "landing__kick", text: t("helpKick") }),
        $("h1", { class: "landing__title", text: t("helpTitle") })),
      $("section", { class: "landing__section" },
        $("div", { class: "landing__faq" },
          (T[S.lang].helpItems || []).map(([q, a]) => $("details", { class: "landing__faqitem" },
            $("summary", { text: q }),
            $("p", { class: "landing__p", text: a }))))),
      landingFooter()));
}

/* Policies — Terms / Privacy / Safety. Filled, generic, editable content from
   the one copy table; the template note stays (final legal wording is the
   operator's, DEC-030). */
function policyLink(kind) {
  return $("button", { class: "landing__policylink", attrs: { type: "button" }, text: t(kind),
    on: { click: () => { S.landingDoc = kind; render(); } } });
}

function landingDoc() {
  const key = ({ terms: "policyTerms", privacy: "policyPrivacy", safety: "policySafety" })[S.landingDoc] || "policyTerms";
  const title = ({ terms: t("policyTermsTitle"), privacy: t("policyPrivacyTitle"), safety: t("policySafetyTitle") })[S.landingDoc] || t("policyTermsTitle");
  const sections = T[S.lang][key] || [];
  return $("div", { class: "landing" },
    $("header", { class: "landing__nav" },
      $("div", { class: "landing__brand" }, logoSVG(), $("span", { text: t("brand") })),
      $("div", { class: "row gap2" }, langToggle(), themeToggle())),
    $("div", { class: "landing__body" },
      $("section", { class: "landing__section landing__doc" },
        $("button", { class: "btn btn--ghost", attrs: { type: "button" },
          on: { click: () => { S.landingDoc = null; render(); } } }, icon("back"), $("span", { text: t("landingBack") })),
        $("h1", { class: "landing__h2", text: title }),
        $("p", { class: "landing__p", text: t("policyTemplateNote") }),
        sections.map(([h, p]) => $("div", { class: "landing__docsec" },
          $("h2", { class: "landing__h3", text: h }),
          $("p", { class: "landing__p", text: p }))))));
}

/* Embed a recolorable sticker (STICKERS, injected by build.js). */
function stickerEl(key, cls) {
  const el = $("div", { class: "sticker" + (cls ? " " + cls : "") });
  el.innerHTML = STICKERS[key] || "";
  return el;
}

function heroStage(ic) {
  return $("div", { class: "heroart heroart--one", attrs: { "aria-hidden": "true" } },
    stickerEl(ic, "heroart__s heroart__s--solo"));
}

function bindStoryScroll(scroller) {
  if (!scroller) return;
  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let ticking = false;
  const tick = () => {
    ticking = false;
    const vh = scroller.clientHeight || 1;
    const hero = scroller.querySelector(".landing__hero");
    if (hero) {
      const t = Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / Math.max(hero.offsetHeight, 1)));
      hero.style.setProperty("--hy", t.toFixed(3));
    }
    scroller.querySelectorAll(".stackpanel").forEach((p) => {
      const t = Math.max(-1, Math.min(1, -p.getBoundingClientRect().top / vh));
      p.style.setProperty("--sy", t.toFixed(3));
    });
  };
  scroller.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  }, { passive: true });
  requestAnimationFrame(tick);
}

/* ── feature cards ──────────────────────────────────────────────────────── */
function featureCard(ic, title, body, tone) {
  return $("div", { class: "landing__feature reveal" },
    $("div", { class: "landing__featureico landing__featureico--" + tone }, icon(ic)),
    $("h3", { class: "landing__h3", text: title }),
    $("p", { class: "landing__p", text: body }));
}

/* ── how-it-works steps: number stays on the SAME side in RTL (physical
      right), and a floating tooltip follows the cursor on hover ─────────── */
function stepCard(n, ic, title, body, tone) {
  const tip = $("div", { class: "step-tip", attrs: { role: "tooltip" } },
    $("span", { class: "step-tip__num ltr", text: n }),
    $("strong", { text: title }),
    $("span", { class: "step-tip__body", text: body }));
  const card = $("div", { class: "landing__step reveal" + (tone ? " landing__step--" + tone : "") },
    $("div", { class: "landing__stepnum ltr", text: n }),
    $("div", { class: "landing__stepbody" },
      stickerEl(ic, "landing__stepart"),
      $("div", { class: "landing__steptext" },
        $("h3", { class: "landing__h3", text: title }),
        $("p", { class: "landing__stepdesc landing__p", text: body }))));
  document.body.appendChild(tip);

  const isCompact = () => typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none), (max-width: 839.98px)").matches;
  let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
  const place = () => {
    raf = 0;
    tx += (cx - tx) * 0.22;
    ty += (cy - ty) * 0.22;
    const w = 240, h = tip.offsetHeight || 88, pad = 12;
    const x = Math.min(window.innerWidth - w - pad, Math.max(pad, tx + 16));
    const y = Math.min(window.innerHeight - h - pad, Math.max(pad, ty - h - 12));
    tip.style.transform = "translate3d(" + x + "px," + y + "px,0)";
    if (tip.classList.contains("step-tip--on") && (Math.abs(cx - tx) > 0.4 || Math.abs(cy - ty) > 0.4))
      raf = requestAnimationFrame(place);
  };
  card.addEventListener("pointerenter", (e) => {
    if (isCompact()) return;
    cx = e.clientX; cy = e.clientY; tx = cx; ty = cy;
    tip.classList.add("step-tip--on");
    if (!raf) raf = requestAnimationFrame(place);
  });
  card.addEventListener("pointermove", (e) => {
    if (isCompact() || !tip.classList.contains("step-tip--on")) return;
    cx = e.clientX; cy = e.clientY;
    if (!raf) raf = requestAnimationFrame(place);
  });
  card.addEventListener("pointerleave", () => {
    tip.classList.remove("step-tip--on");
  });
  return card;
}

function langToggle() {
  return IconBtn({ name: "globe", label: t("language"),
    on: () => { S.lang = S.lang === "en" ? "ar" : "en"; storeSet("rs.lang", S.lang); render(); } });
}
