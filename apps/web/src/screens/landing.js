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
  if (S.landingDoc) return landingDoc();
  const page = ({ rider: riderLanding, drive: driveLanding, about: aboutLanding, help: helpLanding })[S.landingPage] || riderLanding;
  return page();
}

/* ── shared chrome ────────────────────────────────────────────────────── */

/* The sticky top bar. Desktop: brand · Ride/Drive/About/Help · … · EN · theme ·
   Log in · Sign up. Compact: brand · theme · Sign up · menu (the links + Log in
   move into the dropdown). §8.1: every control does exactly what it says. */
function landingNav() {
  const links = [["rider", "navRide"], ["drive", "navDrive"], ["about", "navAbout"], ["help", "navHelp"]];
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
      policyLink("terms"), policyLink("privacy"), policyLink("safety")),
    $("a", { class: "landing__credits", attrs: { href: "https://www.streamlinehq.com",
      target: "_blank", rel: "noopener noreferrer" }, text: t("creditsVectors") }));
}

/* ── RIDER page (default) ─────────────────────────────────────────────── */
function riderLanding() {
  return $("div", { class: "landing" },
    landingNav(),

    $("section", { class: "landing__hero" },
      $("div", { class: "landing__heroinner" },
        $("div", { class: "landing__herotext" },
          $("h1", { class: "landing__title", text: t("landingHero") }),
          $("p", { class: "landing__sub", text: t("landingHeroSub") }),
          $("div", { class: "row gap3" },
            Btn({ label: t("landingCtaStart"), on: () => authGo("signup") }),
            Btn({ label: t("landingCtaSignIn"), kind: "outline", on: () => authGo("signin") }))),
        $("div", { class: "landing__heroslide" }, heroSlideshow()))),

    $("div", { class: "landing__body" },
      $("section", { class: "landing__section" },
        $("h2", { class: "landing__h2", text: t("forRiders") }),
        $("div", { class: "landing__grid" },
          featureCard("wallet",  t("landingF1T"), t("landingF1B"), "mint"),
          featureCard("clock",   t("featureScheduleT"), t("featureScheduleB"), "sky"),
          featureCard("card",    t("featureCashT"), t("featureCashB"), "coral"),
          featureCard("livemap", t("landingF4T"), t("landingF4B"), "pink"),
          featureCard("qr",      t("featureCodeT"), t("featureCodeB"), "lime"),
          featureCard("promos",  t("landingF3T"), t("landingF3B"), "sky"))),

      $("section", { class: "landing__section" },
        $("h2", { class: "landing__h2", text: t("safetyTitle") }),
        $("div", { class: "landing__grid" },
          featureCard("check", t("safetyF1T"), t("safetyF1B"), "mint"),
          featureCard("qr",    t("safetyF2T"), t("safetyF2B"), "sky"),
          featureCard("sos",   t("safetyF3T"), t("safetyF3B"), "coral"))),

      $("section", { class: "landing__section" },
        $("h2", { class: "landing__h2", text: t("landingHowTitle") }),
        $("div", { class: "landing__steps" },
          stepCard("1", "route", t("landingHow1T"), t("landingHow1B"), "violet"),
          stepCard("2", "seat",  t("landingHow2T"), t("landingHow2B"), "sky"),
          stepCard("3", "board", t("landingHow3T"), t("landingHow3B"), "mint")))),

    /* full-bleed stacking panels — the sticky "cards slide over each other"
       scroll effect, native CSS, reduced-motion collapses to a plain stack */
    $("section", { class: "stackpanels" },
      $("h2", { class: "landing__h2 stackpanels__kick", text: t("panelKick") }),
      stackPanel("seat",  "violet", t("panel1T"), t("panel1B")),
      stackPanel("price", "mint",   t("panel2T"), t("panel2B")),
      stackPanel("board", "sky",    t("panel3T"), t("panel3B")),
      stackPanel("route", "coral",  t("panel4T"), t("panel4B"))),

    $("div", { class: "landing__body" },
      $("section", { class: "landing__cta" },
        $("h2", { class: "landing__h2", text: t("landingFoot") }),
        $("div", { class: "row gap3 center" },
          Btn({ label: t("landingCtaStart"), on: () => authGo("signup") }),
          Btn({ label: t("landingCtaSignIn"), kind: "outline", on: () => authGo("signin") })))),

    landingFooter());
}

function stackPanel(ic, tone, title, body) {
  return $("article", { class: "stackpanel stackpanel--" + tone },
    $("div", { class: "stackpanel__inner" },
      stickerEl(ic, "stackpanel__art"),
      $("h3", { class: "stackpanel__t", text: title }),
      $("p", { class: "stackpanel__b", text: body })));
}

/* ── DRIVE page ───────────────────────────────────────────────────────── */
function driveLanding() {
  return $("div", { class: "landing" },
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
        $("div", { class: "landing__heroslide" }, driverHeroCard()))),

    $("div", { class: "landing__body" },
      $("section", { class: "landing__section" },
        $("h2", { class: "landing__h2", text: t("forDrivers") }),
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
          stepCard("2", "save",  t("driveStep2T"), t("driveStep2B"), "sky"),
          stepCard("3", "seat",  t("driveStep3T"), t("driveStep3B"), "mint"),
          stepCard("4", "track", t("driveStep4T"), t("driveStep4B"), "coral"))),

      $("section", { class: "landing__cta" },
        $("h2", { class: "landing__h2", text: t("driveReqT") }),
        $("p", { class: "landing__p landing__cta-sub", text: t("driveReqB") }),
        $("div", { class: "row gap3 center" },
          Btn({ label: t("applyToDrive"), on: () => authGo("signup") }),
          Btn({ label: t("landingCtaSignIn"), kind: "outline", on: () => authGo("signin") })))),

    landingFooter());
}

/* The drive hero's right side: an honest perk card (marketing copy, not a
   fake dashboard — it states what driving gives you, never invented numbers). */
function driverHeroCard() {
  return $("div", { class: "driverhero" },
    stickerEl("seat", "driverhero__art"),
    $("div", { class: "driverhero__list" },
      $("div", { class: "driverhero__row" }, icon("check"), $("span", { text: t("driverF4T") })),
      $("div", { class: "driverhero__row" }, icon("check"), $("span", { text: t("driverF2T") })),
      $("div", { class: "driverhero__row" }, icon("check"), $("span", { text: t("driverF3T") }))));
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

/* ── hero slideshow: auto-advancing feature slides, same palette ────────── */

/* Embed a recolorable sticker (STICKERS, injected by build.js). */
function stickerEl(key, cls) {
  const el = $("div", { class: "sticker" + (cls ? " " + cls : "") });
  el.innerHTML = STICKERS[key] || "";
  return el;
}

let slideTimer = null;
function heroSlideshow() {
  const slides = [
    { sticker: "price", tone: "violet", title: t("slide1T"), body: t("slide1B") },
    { sticker: "save",  tone: "coral",  title: t("slide2T"), body: t("slide2B") },
    { sticker: "book",  tone: "sky",    title: t("slide3T"), body: t("slide3B") },
    { sticker: "track", tone: "mint",   title: t("slide4T"), body: t("slide4B") },
  ];
  const box = $("div", { class: "slideshow",
    attrs: { "aria-label": t("landingHowTitle") } });
  const track = $("div", { class: "slideshow__track" });
  slides.forEach((s, i) => {
    track.append($("div", { class: "slide slide--" + s.tone + (i === 0 ? " slide--on" : "") },
      stickerEl(s.sticker, "slide__sticker"),
      $("h3", { class: "slide__t", text: s.title }),
      $("p", { class: "slide__b", text: s.body })));
  });
  const dots = $("div", { class: "slideshow__dots" });
  slides.forEach((s, i) => dots.append($("button", {
    class: "slide-dot" + (i === 0 ? " slide-dot--on" : ""),
    attrs: { type: "button", "aria-label": String(i + 1) },
    on: { click: () => slideTo(i) } })));
  box.append(track, dots);

  // auto-advance; hover pauses. Each landing render clears the previous timer.
  clearInterval(slideTimer);
  S.slideIndex = 0;
  slideTimer = setInterval(() => {
    if (S.slidePaused) return;
    const boxEl = document.querySelector(".slideshow");
    if (!boxEl) return;
    slideTo((S.slideIndex + 1) % slides.length);
  }, 4000);
  box.addEventListener("mouseenter", () => { S.slidePaused = true; });
  box.addEventListener("mouseleave", () => { S.slidePaused = false; });
  return box;
}

function slideTo(i) {
  S.slideIndex = i;
  const box = document.querySelector(".slideshow");
  if (!box) return;
  box.querySelectorAll(".slide").forEach((el, k) => el.classList.toggle("slide--on", k === i));
  box.querySelectorAll(".slide-dot").forEach((el, k) => el.classList.toggle("slide-dot--on", k === i));
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
  const tip = $("div", { class: "step-tip" },
    $("span", { class: "step-tip__num ltr", text: n }),
    $("strong", { text: title }),
    $("span", { class: "step-tip__body", text: body }));
  const card = $("div", { class: "landing__step reveal" + (tone ? " landing__step--" + tone : "") }, tip,
    $("div", { class: "landing__stepnum ltr", text: n }),
    $("div", { class: "landing__stepbody" },
      stickerEl(ic, "landing__stepart"),
      $("div", { class: "landing__steptext" },
        $("h3", { class: "landing__h3", text: title }))));

  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    tip.style.left = Math.min(e.clientX - r.left + 18, r.width - 200) + "px";
    tip.style.top  = Math.max(e.clientY - r.top - 14, 8) + "px";
  });
  card.addEventListener("mouseenter", () => tip.classList.add("step-tip--on"));
  card.addEventListener("mouseleave", () => tip.classList.remove("step-tip--on"));
  card.addEventListener("click", () => tip.classList.toggle("step-tip--on")); // touch
  return card;
}

function langToggle() {
  return IconBtn({ name: "globe", label: t("language"),
    on: () => { S.lang = S.lang === "en" ? "ar" : "en"; storeSet("rs.lang", S.lang); render(); } });
}
