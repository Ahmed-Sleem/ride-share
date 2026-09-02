/* ══════════════════════════════════════════════════════════════════════════
   THE LANDING — the front door, printed as one poster.

   One scroller, five pages, two documents:
     landing()  →  ?share=<token>  a live trip, no chrome
                →  S.landingDoc   terms / privacy / safety, in full
                →  S.landingPage   rider (default) · drive · about · help · download

   The rider page carries the poster: a masthead exactly one viewport tall, a
   running band, the journey (four chapters that are stops on one real road), the
   inverted slab with the three steps, the chapter list, the closer. Every other
   page reuses the same scaffolding — kick, poster title, lede, measure — so the
   site reads as one document rather than a poster with appendices.

   Rules this file keeps:
   • No style, no measurement, no colour. The visual lives in
     styles/shell.html; the shapes come from lib/landing-parts.js.
   • No copy. Every string is a key through t(), so Arabic is complete by
     construction and nothing here can drift out of the copy table.
   • No URLs invented here. The APK link is apkDownloadUrl(): the brand's own
     `download.path`, resolved against the document that is asking, with the version
     code from packages/brand on the query. No host is written in this file, and the
     name the download arrives under is the name the server offers.
   • No dead controls. Every button switches a page, opens a document, starts an
     auth flow or downloads the build that exists.
   • Motion is mounted once per render and torn down by shell/app.js before the
     next one; the landing never leaves a rAF loop behind (lib/motion.js).
   ══════════════════════════════════════════════════════════════════════════ */

function landing() {
  const shareTok = (typeof location !== "undefined" && location.search)
    ? new URLSearchParams(location.search).get("share") : null;
  if (shareTok) return shareLanding(shareTok);   // a shared ride is not a poster
  const view = S.landingDoc ? landingDoc()
    : (({ rider: riderLanding, drive: driveLanding, about: aboutLanding,
        help: helpLanding, download: downloadLanding })[S.landingPage] || riderLanding)();
  /* Mounted here, once, for every landing view — because the reveal rule hides a
     `[data-rv]` block until the observer marks it in, and a page that never
     mounts is a page whose copy is invisible while its text still tests green. */
  mountLanding(view);
  return view;
}

/* ── a live trip, seen by someone you shared it with ──────────────────────
   No marketing chrome: a person following a ride wants the ride, so this view is
   the app's own empty/card vocabulary and nothing else. */
function shareLanding(token) {
  const root = $("div", { class: "landing" }, landingNav(),
    $("div", { class: "landing__body landing__body--page" },
      mkSection([
        $("h1", { class: "landing__title", text: t("j_shareTitle") }),
        $("p", { class: "landing__lede", text: t("j_shareSub") }),
        $("div", { class: "stack gap3", id: "share-live" },
          Empty("livemap", t("shareTrip"), t("j_shareLoading"))),
      ], { first: true })),
    landingFooter());
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

/* ── the head ─────────────────────────────────────────────────────────────
   Fixed and frosted over the poster. Desktop shows the five page links; compact
   moves them and Log in into a labelled panel — a hamburger with no name is a
   riddle, and the same five destinations must be reachable at 320px (§8.1). */
function landingNav() {
  const links = [["rider", "navRide"], ["drive", "navDrive"], ["about", "navAbout"],
    ["help", "navHelp"], ["download", "navDownload"]];
  const nav = $("header", { class: "landing__nav" });

  nav.append($("button", {
    class: "landing__brand", attrs: { type: "button", "aria-label": t("brand") },
    on: { click: () => landingGo("rider") },
  }, logoSVG(), $("span", { text: t("brand") })));

  const linksEl = $("nav", { class: "landing__links", attrs: { "aria-label": t("menu") } });
  links.forEach(([k, lbl]) => linksEl.append(landingLink(k, lbl)));
  nav.append(linksEl);

  const actions = $("div", { class: "landing__actions" });
  actions.append(mkLangButton(), mkThemeSwitch());
  actions.append(Btn({ label: t("login"), kind: "bare", on: () => authGo("signin") }));
  actions.append(Btn({ label: t("signup"), on: () => authGo("signup") }));
  nav.append(actions);

  nav.append($("button", {
    class: "landing__menu",
    attrs: { type: "button", "aria-label": t("menu"), "aria-expanded": String(!!S.landingMenu) },
    on: { click: () => { S.landingMenu = !S.landingMenu; render(); } },
  }, icon("dots")));

  if (S.landingMenu) {
    const dd = $("div", { class: "landing__menu-panel", attrs: { role: "navigation", "aria-label": t("menu") } });
    links.forEach(([k, lbl]) => dd.append($("button", {
      class: "landing__menulink", attrs: { type: "button" }, text: t(lbl),
      on: { click: () => { S.landingMenu = false; landingGo(k); } },
    })));
    dd.append($("div", { class: "divider" }));
    /* In the panel both entries are links like the page links above them. A filled
       button in a menu is a second hierarchy the bar already settles: the same
       "Sign up" sits in the header at the same moment. */
    [["login", "signin"], ["signup", "signup"]].forEach(([lbl, mode]) => dd.append($("button", {
      class: "landing__menulink", attrs: { type: "button" }, text: t(lbl),
      on: { click: () => { S.landingMenu = false; authGo(mode); } },
    })));
    nav.append(dd);
  }
  return nav;
}

function landingLink(k, lbl) {
  return $("button", {
    /* The one emphasised item in the bar, marked in the markup so the sheet's CSS owns
       the look and the panel's plain row for the same destination is untouched. */
    class: "landing__link" + (S.landingPage === k ? " landing__link--on" : ""),
    attrs: { type: "button", "aria-current": S.landingPage === k ? "page" : null,
      "data-cta": k === "download" ? "app" : null },
    text: t(lbl),
    on: { click: () => landingGo(k) },
  });
}

/* Between landing pages: swap the content and put the reader back at the top of
   the poster. `.landing` is the scroller — the document never scrolls. */
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

/* The foot: brand · links on one line, the tagline under it. padding-block only —
   a shorthand here would reset the page gutter and push the links to the edge
   (the demo shipped that bug; styles/shell.html says why it stays fixed). */
function landingFooter() {
  return $("footer", { class: "landing__foot" },
    $("div", { class: "landing__footrow" },
      $("strong", { class: "landing__brand", text: t("brand") }),
      $("div", { class: "landing__policies" },
        policyLink("terms"), policyLink("privacy"), policyLink("safety"))),
    /* One line, and it is the one a reader expects at the bottom of a document: who
       owns the name above, and in whose terms. The slogan already had its say. */
    $("div", { class: "landing__footrow" },
      $("span", { class: "landing__fine", text: `© ${t("brand")} · ${t("rights")}` })));
}

/* ── RIDER page: the poster ─────────────────────────────────────────────── */
function riderLanding() {
  const root = $("div", { class: "landing" },
    landingNav(),
    $("div", { class: "landing__body" },
      heroMasthead(),
      mkMarquee(),
      journeySection(),
      mkSlab("landingHowTitle", "mkStepsKick", [
        mkSteps([[1, "landingHow1T", "landingHow1B"],
          [2, "landingHow2T", "landingHow2B"],
          [3, "landingHow3T", "landingHow3B"]]),
      ]),
      mkSection([
        mkEyebrow("panelKick"),
        mkPanels(RIDER_PANELS),
      ]),
      /* The other side of the same marketplace, one link away — and it is said the way the
         page says the things it most wants you to act on: the inverted slab, black on light
         and paper on dark, the title at poster size, centred. A caption and a paragraph at
         the end of a long page are easy to read as a footnote. */
      mkSlab("driveInviteK", "driveInviteT", [
        mkLede("driveInviteB"),
        mkActions([{ k: "driveInviteGo", go: "drive" }]),
      ], { mid: true }),
      mkEnd("mkEndT", "mkEndB", "landingFoot",
        [{ k: "landingCtaStart", go: "signup" }, { k: "landingCtaSignIn", go: "signin", bare: true }])),
    landingFooter());
  return root;
}

/* The masthead: three lines of display type on the rule field, the promise as a lede and
   one paragraph of how it behaves. It is exactly one viewport tall by construction — the
   type size is measured against both viewport axes, so it never crops and never needs a
   scroll to meet the brand — and it carries no buttons: signing in, creating an account
   and getting the app are the bar's job, and a poster that repeats its own header has two
   places to be wrong. The masthead's own way forward is the road below it. */
function heroMasthead() {
  return $("section", { class: "landing__hero" },
    mkRuleField(),
    mkHeadTop(),
    /* The h1 is named by its own three lines. Labelling it with the lede below
       would give a screen reader the paragraph twice and the poster never. */
    mkDisplay([{ k: "mkDisplay1" }, { k: "mkDisplay2" }, { k: "mkDisplay3", out: true }]),
    $("div", { class: "landing__hero-foot" },
      mkLede("landingHero"),
      /* One paragraph past the slogan: the lede says what the product is, this says how
         it behaves — the timetable, the one fare, the cash at the door. */
      mkProse(["landingHeroB"])));
}

/* The journey. Four chapters that are the product's own argument, each one a
   stop the bus passes as the reader scrolls: the copy below is the substance and
   the map is the meter. The geometry is real Alexandria (data/journey.js, with
   its provenance and its limits written there); the labels are the four stages of
   a ride, not districts — the product publishes routes, not this drawing. */
/* Seven claims, one per cut, laid along the road as it unrolls: the drawing is
   the meter and the claim is the reading. This is where the rider page says what
   the service gives you — nowhere else on the page says it again. */
const RIDER_CUTS = [
  { t: "landingF1T", b: "landingF1B" },
  { t: "featureScheduleT", b: "featureScheduleB" },
  { t: "featureCashT", b: "featureCashB" },
  { t: "landingF4T", b: "landingF4B" },
  { t: "landingF3T", b: "landingF3B" },
  { t: "safetyF1T", b: "safetyF1B" },
  { t: "safetyF3T", b: "safetyF3B" },
];

/* The chapter list is the feature board: seven claims, each a numbered row.
   Safety is folded in rather than quarantined in its own coloured block — a
   promise you have to scroll past to find is a promise you do not make. */
/* The chapters: the same promises read as a case in four numbered rows — the
   seat, the price, the boarding, the network. The copy is theirs alone. */
const RIDER_PANELS = [
  { t: "panel1T", b: "panel1B" },
  { t: "panel2T", b: "panel2B" },
  { t: "panel3T", b: "panel3B" },
  { t: "panel4T", b: "panel4B" },
];

function journeySection() {
  return mkJourney(RIDER_CUTS, {
    labelKey: "mkJourneyLabel", captionKey: "mkJourneyCaption",
  });
}

/* ── DRIVE page ───────────────────────────────────────────────────────────
   A second audience gets a second page, not a second coat of paint: the same
   scaffolding, the driver's own copy, their own steps and their own closer. */
function driveLanding() {
  const root = $("div", { class: "landing" },
    landingNav(),
    $("div", { class: "landing__body" },
      mkSection([
        mkEyebrow("forDrivers"),
        $("h1", { class: "landing__title", text: t("driveHeroT") }),
        mkLede("driveHeroB"),
        mkActions([{ k: "applyToDrive", go: "signup" }, { k: "landingCtaSignIn", go: "signin", bare: true }]),
      ], { first: true }),
      mkSlab("driveStepsKick", "driveStepsT", [
        mkSteps([[1, "driveStep1T", "driveStep1B"],
          [2, "driveStep2T", "driveStep2B"],
          [3, "driveStep3T", "driveStep3B"],
          [4, "driveStep4T", "driveStep4B"]]),
      ]),
      mkSection([
        mkEyebrow("driveBoardKick"),
        mkPanels(DRIVER_PANELS),
      ]),
      mkSection([
        mkEyebrow("driveReqT"),
        mkProse(["driveReqB", "driveReqB2"]),
      ]),
      mkEnd("driveEndT", "driveEndB", "landingFoot",
        [{ k: "applyToDrive", go: "signup" }, { k: "landingCtaSignIn", go: "signin", bare: true }])),
    landingFooter());
  return root;
}

/* The driver page's chapters, in the order a driver decides: what you sign up to do,
   when you work, what a slot is worth, how you get paid. What the operator owns — the
   routes, the prices — is not a driver's decision, so it is not a chapter. */
const DRIVER_PANELS = [
  { t: "driverF1T", b: "driverF1B" },
  { t: "driverF4T", b: "driverF4B" },
  { t: "driverF2T", b: "driverF2B" },
  { t: "driverF3T", b: "driverF3B" },
];

/* ── ABOUT / HELP / DOWNLOAD ────────────────────────────────────────────── */
function aboutLanding() {
  return $("div", { class: "landing" },
    landingNav(),
    $("div", { class: "landing__body landing__body--page" },
      mkSection([
        mkEyebrow("aboutKick"),
        $("h1", { class: "landing__title", text: t("aboutTitle") }),
        mkProse(["aboutP1", "aboutP2", "aboutP3"]),
        mkActions([{ k: "landingCtaStart", go: "signup" }, { k: "navDrive", go: "drive", bare: true }]),
      ], { first: true }),
      mkSection([
        mkEyebrow("aboutPriceT"),
        mkProse(["aboutPrice1", "aboutPrice2"]),
      ]),
      mkSection([
        mkEyebrow("aboutOpsT"),
        mkProse(["aboutOps1", "aboutOps2"]),
        $("p", { class: "landing__note", text: t("policyTemplateNote") }),
      ])),
    landingFooter());
}

function helpLanding() {
  return $("div", { class: "landing" },
    landingNav(),
    $("div", { class: "landing__body landing__body--page" },
      mkSection([
        mkEyebrow("helpKick"),
        $("h1", { class: "landing__title", text: t("helpTitle") }),
        mkFaq(),
      ], { first: true })),
    landingFooter());
}

/* The installer lives on whatever server is serving this page — that is the whole
 * rule. Resolving the brand's own `download.path` against the document gives the real
 * address in production and a self-referential one in a preview, and it means a move or
 * a rename cannot leave a stale host behind inside a bundle. */
function apkDownloadUrl() {
  const D = (typeof BRAND !== "undefined" && BRAND.download) ? BRAND.download : null;
  if (!D) return "";
  const base = (typeof document !== "undefined" && document.baseURI) ||
    (typeof location !== "undefined" && location.href) || "";
  const code = (BRAND.version && BRAND.version.code) ? BRAND.version.code : 0;
  if (!base) return D.path;
  try { return `${new URL(D.path, base).href}?v=${code}`; }
  catch { return D.path + "?v=" + code; }
}

function downloadLanding() {
  return $("div", { class: "landing" },
    landingNav(),
    $("div", { class: "landing__body landing__body--page" },
      mkSection([
        /* No eyebrow here: the page is called Get the app, the nav link that got
           you here is called Get the app, and the heading says it too. Three of
           them on one screen is two too many. */
        $("h1", { class: "landing__title", text: t("j_dlTitle") }),
        mkLede("j_dlSub"),
        mkDownloadCards(),
      ], { first: true })),
    landingFooter());
}

/* ── THE INTRO (mobile surface only) ────────────────────────────────────
   Four slides that say what the app does, then the auth flow. Skinned onto the
   poster's tokens, never onto a hue, and the behaviour is untouched: the website
   never sees it (guestHome forces the landing) and `rs.intro.v1` still means
   "seen". */
function introSlides() {
  return [
    { ic: "bus", k: "j_intro1K", t: "j_intro1T", b: "j_intro1B" },
    { ic: "lookup", k: "j_intro2K", t: "j_intro2T", b: "j_intro2B" },
    { ic: "qr", k: "j_intro3K", t: "j_intro3T", b: "j_intro3B" },
    { ic: "earnings", k: "j_intro4K", t: "j_intro4T", b: "j_intro4B", c: "j_intro4C" },
  ];
}

function finishIntro(mode) {
  markIntroSeen();
  S.view = "auth";
  S.authMode = mode || "signup";
  if (S.authMode === "signup") { S.signupRole = "driver"; S.authStep = "choose"; }
  else { S.loginMethod = null; S.authStep = "choose"; }
  render();
}

function introView() {
  const slides = introSlides();
  const i = Math.max(0, Math.min(slides.length - 1, S.introSlide || 0));
  const s = slides[i];
  const last = i === slides.length - 1;
  const dots = $("div", { class: "intro__dots", attrs: { "aria-hidden": "true" } });
  slides.forEach((_, n) => dots.append($("span", { class: "intro__dot" + (n === i ? " intro__dot--on" : "") })));
  const copy = [
    $("span", { class: "intro__kick", text: t(s.k) }),
    $("div", { class: "intro__ic", attrs: { "aria-hidden": "true" } }, icon(s.ic)),
    $("h1", { class: "intro__t", text: t(s.t) }),
    $("p", { class: "intro__b", text: t(s.b) }),
  ];
  if (s.c) copy.push($("p", { class: "intro__c", text: t(s.c) }));
  copy.push(dots);
  return $("div", { class: "intro", attrs: { "aria-label": t("j_introStart") } },
    $("div", { class: "intro__stage" }, ...copy),
    $("div", { class: "intro__foot" },
      Btn({ label: t("j_introSkip"), kind: "ghost", on: () => finishIntro("signup") }),
      Btn({ label: t("j_introPrev"), kind: "outline", dis: i === 0, on: () => { if (i > 0) { S.introSlide = i - 1; render(); } } }),
      Btn({ label: last ? t("j_introStart") : t("j_introNext"), on: () => {
        if (last) finishIntro("signup");
        else { S.introSlide = i + 1; render(); }
      } })));
}

/* ── POLICIES ───────────────────────────────────────────────────────────
   Terms / Privacy / Safety, filled from the copy table. The template note stays
   on the page on purpose: the legal text is the operator's (DEC-030), and the
   landing must not imply that this build has a lawyer-approved policy. */
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
      $("span", { class: "landing__brand" }, logoSVG(), $("span", { text: t("brand") })),
      $("div", { class: "landing__actions" }, mkLangButton(), mkThemeSwitch())),
    $("div", { class: "landing__body landing__body--page" },
      mkSection([
        $("div", { class: "landing__doc" },
          Btn({ label: t("landingBack"), kind: "ghost", icon: "back", on: () => { S.landingDoc = null; render(); } }),
          $("h1", { class: "landing__title", text: title }),
          $("p", { class: "landing__note", text: t("policyTemplateNote") }),
          mkDoc(sections)),
      ], { first: true })));
}
