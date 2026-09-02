/* ══════════════════════════════════════════════════════════════════════════
   MARKETING PRIMITIVES — the shapes the landing is built from.

   The poster has a small vocabulary: a section, an eyebrow, a display line, a
   lede, a running band, a journey cut, a numbered chapter, a step, an inverted
   slab, a closer. Those were previously re-typed per page (rider, drive, about,
   help, download, docs), which is how a "one design" site ends up with six
   slightly different paddings. Here each shape is a function of its COPY KEYS,
   so a page reads as a list of what it says and the typography is impossible to
   fork by accident.

   What these functions never do:
   • no styles, colours or pixel sizes — every visual is a class in
     styles/shell.html; the only value written here is the 12 of the rule field,
     because that count IS the composition, not a measurement;
   • no inlined copy — a primitive takes a key and calls t(); a string literal
     in this file is a bug, since AR would silently keep English;
   • no measuring, scrolling or animation — `data-rv` (reveal), `--d` (its
     delay), `data-vf` / `data-word` (variable weight) are attributes the
     observer in lib/motion.js reads; if the script never runs, every element is
     already in its end state, so the page degrades to a static poster.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── section scaffolding ─────────────────────────────────────────────────
   `.landing__body` is a grid of gutter · measure · gutter, so a section placed
   in track 2 gets the capped measure and a bled section prints to both edges and
   reintroduces its own gutter. That is the whole layout system. */
function mkSection(kids, opts) {
  const o = opts || {};
  const cls = "landing__section" + (o.bleed ? " landing__section--bleed" : "") +
    (o.first ? " landing__section--first" : "") + (o.cls ? " " + o.cls : "");
  const section = $("section", {
    class: cls,
    attrs: { "aria-label": o.label ? t(o.label) : null, id: o.id || null },
  }, ...kids);
  /* The reveal rhythm belongs to the section, not to each page. A block that
     already carries `data-rv` — or holds blocks that do, like the rider page's
     feature rows — keeps its own stagger; everything else fades in as it enters.
     One rule, so the About, Help, download and policy views speak the same
     language as the poster without anyone remembering to wire them up. */
  let n = 0;
  Array.prototype.forEach.call(section.children, (kid) => {
    if (!kid || kid.nodeType !== 1) return;
    if (kid.hasAttribute("data-rv") || (kid.querySelector && kid.querySelector("[data-rv]"))) return;
    const prev = kid.getAttribute("style");
    kid.setAttribute("data-rv", "");
    kid.setAttribute("style", (prev ? prev.replace(/;\s*$/, "") + ";" : "") + "--d:" + (n++ * 90) + "ms");
  });
  return section;
}

function mkEyebrow(key) {
  return $("p", { class: "landing__kick", text: t(key) });
}

/* Three printed lines, the middle of the masthead. `lines` is
   [{ k, out }] — `out` knocks one line out to an outline, which is the
   composition's only accent, so at most one line per masthead may use it. */
function mkDisplay(lines, opts) {
  const o = opts || {};
  const box = $("h1", {
    class: "landing__display",
    attrs: o.label ? { "aria-label": t(o.label) } : null,
  });
  lines.forEach((ln) => {
    if (!ln || ln.k == null) return;
    box.append($("span", {
      class: "landing__displayline" + (ln.out ? " landing__displayline--out" : ""),
      attrs: { "data-vf": "" },
    }, $("span", { text: t(ln.k) })));
  });
  return box;
}

/* The rule field: twelve hairlines, drawn as cells so the columns are the grid
   itself rather than a background image that would need its own gutters.
   Decorative by definition, so it is hidden from AT and never counted. */
function mkRuleField() {
  const cells = [];
  for (let i = 0; i < 12; i++) cells.push($("i"));
  return $("div", { class: "landing__hero-grid", attrs: { "aria-hidden": "true" } }, cells);
}

function mkHeadTop() {
  return $("div", { class: "landing__head-top" },
    $("span", { text: t("brand") }),
    $("span", { text: t("tagline") }));
}

function mkLede(key) {
  return $("p", { class: "landing__lede", text: t(key) });
}

/* Buttons, from keys: { k, go: "signup" | "signin" | <page>, bare }. A page
   action and an auth action are the same shape here so no page builds its own
   click handler and drifts from the routing rules. */
function mkActions(acts) {
  return $("div", { class: "landing__acts" }, acts.map((a) => {
    const run = a.go === "signup" ? () => authGo("signup")
      : a.go === "signin" ? () => authGo("signin")
      : () => landingGo(a.go);
    return Btn({ label: t(a.k), kind: a.bare ? "bare" : (a.kind || "primary"), on: run });
  }));
}

/* ── the running band ─────────────────────────────────────────────────────
   One row of glyphs rendered twice with the track shifted -50%: the seam is
   invisible because the halves are identical, which is why MARQUEE_REPEATS has
   to stay even (data/journey.js owns it and says so in its own comment). */
function mkMarquee() {
  const row = () => {
    const out = [];
    for (let i = 0; i < MARQUEE_REPEATS * MARQUEE_GLYPHS.length; i++) {
      out.push(icon(MARQUEE_GLYPHS[i % MARQUEE_GLYPHS.length], "landing__marquee-ic"));
    }
    return out;
  };
  return $("div", { class: "landing__marquee", attrs: { "aria-hidden": "true" } },
    $("div", { class: "landing__marquee-in" }, row(), row()));
}

/* ── the journey ────────────────────────────────────────────────────────
   Four cuts on one road. The <svg> is deliberately EMPTY here: lib/motion.js
   fills it from data/journey.js once the section has a real width, because the
   route must be fitted to the box it is drawn in rather than to a size guessed
   at authoring time. The cuts are complete paragraphs, so a reader without the
   geometry (or without SVG measurement) still gets the whole argument. */
function mkJourney(cuts, opts) {
  const o = opts || {};
  const section = $("section", {
    class: "journey", id: o.id || "journey",
    attrs: { "data-journey": "", "aria-label": t(o.labelKey || "mkJourneyLabel") },
  });
  section.append($("svg", {
    class: "journey__svg",
    attrs: { "data-journey-map": "", "aria-hidden": "true", focusable: "false" },
  }));
  const list = $("div", { class: "journey__cuts" });
  list.append($("p", { class: "journey__caption", text: t(o.captionKey || "mkJourneyCaption") }));
  cuts.forEach((c, i) => {
    list.append($("article", {
      class: "journey__cut",
      /* Which side of the corridor this cut belongs to. It is written here, from the index,
         and not by a media query, because the road weaves: a cut on the same side as the
         segment it describes is the whole idea of the section. The sheet mirrors it with
         logical properties, so RTL gets the mirror for free and the bus reaches each stop
         in the order the copy is read. */
      attrs: { "data-journey-cut": "", "data-side": i % 2 ? "right" : "left" },
    },
    $("div", { class: "journey__rule" },
      $("span", { class: "ltr", text: String(i + 1).padStart(2, "0") }),
      /* A cut carries a word beside its number only if the page gives it one. The
         rider page puts seven claims on the road, and a label above each would be
         an eighth way of saying what the line already says. */
      c.n ? $("span", { text: t(c.n) }) : null),
    /* The word is the poster of the cut, and a poster sets one word to a line: the split
       happens here, in the markup, so the h2 still holds the whole phrase as one text node
       for anything that reads the document rather than paints it. */
    $("h2", { class: "journey__word", attrs: { "data-word": "" } },
      ...(strings => strings.map((w, i) =>
        /* The space belongs to the word before it, not between the elements: a text node
           between two blocks collapses to nothing in `textContent`, and a claim set read
           back as "Verifieddrivers" is a claim set no test or screen reader can match. */
        $("span", { class: "journey__wordline", text: i < strings.length - 1 ? w + " " : w })
      ))(String(t(c.t)).split(/\s+/).filter(Boolean))),
    $("p", { class: "journey__body", text: t(c.b) })));
  });
  section.append(list);
  return section;
}

/* ── the intro: one rule, every surface ─────────────────────────────────
   Every landing page opens the same way — the rule field, the display type, the
   promise under it — and exactly one rule makes that true: `.landing__hero` is one
   viewport tall at least, never a fixed height, so the copy can be long or short
   and the poster is never cropped. A page that wrote its own `min-height` would
   drift from the others the first time anyone measured a phone, which is what the
   guard in tests/unit.test.js refuses.
   `lines` is the display type (one line on a page, three on the poster); `kick`,
   `lede`, `prose` and `actions` are all optional, because a help page has no
   promise to make and a driver page has one thing to press. */
function mkIntro(o) {
  const head = $("div", { class: "landing__introhead" },
    o.kick ? mkEyebrow(o.kick) : null,
    mkDisplay(o.lines)
  );
  const foot = $("div", { class: "landing__hero-foot" },
    ...(o.lede ? [mkLede(o.lede)] : []),
    ...(o.prose && o.prose.length ? [mkProse(o.prose)] : []),
    ...(o.actions && o.actions.length ? [mkActions(o.actions)] : [])
  );
  return $("section", { class: "landing__hero" },
    mkRuleField(),
    mkHeadTop(),
    head,
    foot
  );
}

/* ── the inverted slab, its steps, the chapters ──────────────────────── */
function mkSlab(kickKey, titleKey, kids, opts) {
  const o = opts || {};
  return $("section", { class: "landing__slab" + (o.mid ? " landing__slab--mid" : ""),
    attrs: { "aria-label": t(titleKey) } },
    $("p", { class: "landing__slab-k", text: t(kickKey) }),
    $("h2", { class: "landing__slab-t", text: t(titleKey) }),
    ...kids);
}

/* The step number sits in the physical top-right corner in BOTH languages,
   which the compact-suite regression test checks; `right` in the CSS is that
   choice, and it is intentional — the number is a printer's mark, not text. */
function mkStep(n, titleKey, bodyKey) {
  /* A step may be a single line — the driver requirements are facts, not arguments —
     and then no paragraph is manufactured to fill the row: the body is only built when
     the copy table has one for it. */
  return $("li", { class: "landing__step", attrs: { "data-rv": "" } },
    $("span", { class: "landing__stepnum ltr", text: String(n).padStart(2, "0") }),
    $("h3", { class: "landing__stept", text: t(titleKey) }),
    bodyKey ? $("p", { class: "landing__stepb", text: t(bodyKey) }) : null);
}

function mkSteps(steps) {
  return $("ol", { class: "landing__steps" }, steps.map(([n, tk, bk]) => mkStep(n, tk, bk)));
}

/* A chapter row: number · name, a title, a body. The board the old design used
   (a grid of cards, one colour each) is gone: in a monochrome system a card grid
   is a wall of boxes, while a numbered rule reads as an argument. */
function mkPanel(n, total, titleKey, bodyKey) {
  return $("li", { class: "landing__feature", attrs: { "data-rv": "", style: "--d:" + (n - 1) * 60 + "ms" } },
    $("span", { class: "landing__featuren ltr",
      text: String(n).padStart(2, "0") + " / " + String(total).padStart(2, "0") }),
    $("h3", { class: "landing__featuret", text: t(titleKey) }),
    $("p", { class: "landing__featured", text: t(bodyKey) }));
}

function mkPanels(panels) {
  return $("ol", { class: "landing__panels" }, panels.map((p, i) =>
    mkPanel(i + 1, panels.length, p.t, p.b)));
}

/* ── the closer ───────────────────────────────────────────────────────── */
function mkEnd(titleKey, mutedKey, noteKey, acts) {
  return $("section", { class: "landing__cta" },
    $("p", { class: "landing__cta-t", attrs: { "data-rv": "" } },
      t(titleKey), " ", $("span", { text: t(mutedKey) })),
    $("div", { class: "landing__cta-row" },
      mkActions(acts),
      $("span", { class: "landing__cta-note", text: t(noteKey) })));
}

/* ── the download cards + a QR that actually scans ────────────────────── */
/* Two cards, as the poster's download view is laid out: the Android build with a
   code that scans, and the iOS note that says what is true today. */
function mkDownloadCards(opts) {
  const o = opts || {};
  const url = apkDownloadUrl();
  const code = (typeof BRAND !== "undefined" && BRAND.version) ? BRAND.version.code : null;
  return $("div", { class: "landing__dlcards" },
    $("div", { class: "landing__dlcard", attrs: { "data-rv": "" } },
      $("span", { class: "landing__dlcard-t", text: t("j_dlAndroid") }),
      $("p", { class: "landing__dlcard-s", text: t(o.bodyKey || "j_dlSub") }),
      $("a", { class: "btn btn--primary", attrs: { href: url, download: BRAND.download.apk } },
        icon("doc"), $("span", { text: t("j_dlAndroid") })),
      mkInstallQr(url),
      $("div", { class: "landing__dlmeta" },
        code != null ? $("span", { class: "ltr", text: "v" + BRAND.version.name + " (" + code + ")" }) : null,
        $("span", { class: "ltr", text: url }))),
    $("div", { class: "landing__dlcard", attrs: { "data-rv": "", style: "--d:80ms" } },
      $("span", { class: "landing__dlcard-t", text: t("j_dlIos") }),
      $("p", { class: "landing__dlcard-s", text: t("j_dlIosSoon") }),
      Btn({ label: t("landingCtaSignIn"), kind: "bare", on: () => authGo("signin") })));
}

/* The matrix is generated here, in the browser, from the URL that the button
   next to it points at — see lib/qr.js for why a code that cannot scan is a lie,
   and why this is not the decorative boarding pattern from components.js. */
function mkInstallQr(url) {
  let art = null;
  try {
    art = InstallQR(url);
  } catch (e) {
    /* If a payload ever outgrows the encoder, the honest fallback is the link
       as text — never a square that looks like a code. */
    art = null;
  }
  return $("figure", { class: "landing__qr" }, art,
    $("figcaption", { text: t("j_dlQr") }));
}

/* ── FAQ, prose, policy documents ─────────────────────────────────────── */
function mkFaq() {
  return $("div", { class: "landing__faq" },
    (T[S.lang].helpItems || []).map(([q, a]) => $("details", { class: "landing__faqitem" },
      $("summary", { text: q }),
      $("p", { class: "landing__p", text: a }))));
}

function mkProse(keys) {
  return $("div", { class: "landing__prose" }, keys.map((k) => $("p", { class: "landing__p", text: t(k) })));
}

/* A policy is read, not scanned — but a reader who came for one clause still needs the
   way through it. So the document is two columns above the width where two columns are
   readable: the contents rail beside the text, holding its place under the fixed bar,
   and the sections in one centred measure under it. The rail is never hidden on a small
   screen, because a control that disappears takes its function with it: there it becomes
   a list of ways in, above the text. */
function mkDoc(sections) {
  const secs = sections.map(([h, body], n) =>
    $("section", { class: "landing__docsec", attrs: { id: "docsec-" + S.landingDoc + "-" + n } },
      $("h2", { class: "landing__h3", text: h }),
      $("p", { class: "landing__p", text: body })));
  const rail = $("nav", { class: "landing__docrail", attrs: { "aria-label": t("docRailLabel"), "data-docrail": "" } },
    sections.map(([h], n) => $("button", {
      class: "landing__railink", attrs: { type: "button", "data-docjump": String(n) }, text: h,
      on: { click: () => docJumpTo(n) },
    })));
  return $("div", { class: "landing__doc2" }, rail, $("div", { class: "landing__doc" }, secs));
}

function docJumpTo(n) {
  const el = document.getElementById("docsec-" + S.landingDoc + "-" + n);
  const scroller = document.querySelector(".landing");
  if (!el || !scroller) return;
  scroller.scrollTo({ top: Math.max(0, Math.round(scroller.scrollTop +
    el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - DOC_CLEAR)),
    behavior: Motion.reduced() ? "auto" : "smooth" });
}

/* Which clause you are in is the rail's one live fact, so it is read from where the
   sections are, not from a click log: an IntersectionObserver with a band across the
   upper part of the viewport. A host without one (jsdom) simply never marks a row,
   which is the honest degradation — every link still works. */
let DOC_CLEAR = 96;
function watchDocSecs(rail, secs) {
  const links = [...rail.querySelectorAll("[data-docjump]")];
  if (!links.length || typeof IntersectionObserver !== "function") return null;
  const scroller = rail.closest(".landing");
  if (!scroller || !secs.length) return null;
  DOC_CLEAR = Math.round(parseFloat(getComputedStyle(scroller).getPropertyValue("--bar-clearance")) ||
    (0.09 * scroller.clientHeight));
  let current = -1;
  const mark = () => links.forEach((b, n) => {
    if (n === current) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
  });
  /* Short sections can crowd the band at once, and an observer reports *changes*, so the
     answer is never "whichever row arrived last" — it is the last clause whose head the
     reader has already passed. The observer is the trigger; the geometry is the truth. */
  const settle = () => {
    /* The line the reader reads from is just under the bar, not a quarter down the
       screen: a rail marks where you are, not roughly what is in front of you. And a
       short document that cannot scroll any further has no clause left to reach, so the
       last one is the truth at the end of the scroll. */
    const line = scroller.getBoundingClientRect().top + DOC_CLEAR + 8;
    let n = 0;
    secs.forEach((el, i) => { if (el.getBoundingClientRect().top <= line) n = i; });
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) n = secs.length - 1;
    if (n !== current) { current = n; mark(); }
  };
  const io = new IntersectionObserver(settle, { root: scroller,
    rootMargin: "-" + DOC_CLEAR + "px 0px -20% 0px", threshold: 0 });
  secs.forEach((el) => io.observe(el));
  scroller.addEventListener("scroll", settle, { passive: true });
  settle();
  return () => { io.disconnect(); scroller.removeEventListener("scroll", settle); };
}

/* ── the two header controls the poster does its own way ────────────────
   A language control that shows the language you are about to read, and a theme
   switch you can read the state of — the app's icon toggles stay as they are,
   because inside the product the icon is next to the label it belongs to. */
function mkLangButton() {
  return $("button", {
    class: "landing__langbtn", attrs: { type: "button", "aria-label": t("language") },
    text: t("mkLangTo"),
    on: {
      click: () => {
        S.lang = S.lang === "en" ? "ar" : "en";
        storeSet("rs.lang", S.lang);
        render();
      },
    },
  });
}

function mkThemeSwitch() {
  const dark = resolvedTheme() === "dark";
  return $("button", {
    class: "landingsw", attrs: {
      type: "button", role: "switch", "aria-checked": String(dark),
      "aria-label": dark ? t("switchLight") : t("switchDark"),
    },
    on: {
      click: () => {
        S.theme = dark ? "light" : "dark";
        storeSet("rs.theme", S.theme);
        render();
      },
    },
  },
  $("span", { class: "landingsw__track" },
    icon("sun", "landingsw__ic landingsw__ic--sun"),
    icon("moon", "landingsw__ic landingsw__ic--moon"),
    $("span", { class: "landingsw__knob" })));
}

/* ── motion mounting ──────────────────────────────────────────────────────
   One teardown per landing render. The rAF is load-bearing, not tidiness: the
   journey measures `clientWidth` and projects each cut onto the route, so it has
   to run after the section is in the document and laid out — mounting earlier
   parks the bus on a zero-size map for the rest of the page's life. */
let LANDING_MOTION = null;

function mountLanding(root) {
  requestAnimationFrame(() => {
    if (LANDING_MOTION) { LANDING_MOTION(); LANDING_MOTION = null; }
    if (!root.isConnected) return;              // replaced before it ever painted
    LANDING_MOTION = bindLandingMotion(root);
  });
}

function bindLandingMotion(root) {
  const offs = [];
  offs.push(Motion.reveal(root, root));           // .landing is the scroller itself
  offs.push(Motion.mountScrub(root, root));
  Array.prototype.forEach.call(root.querySelectorAll("[data-journey]"), (section) => {
    offs.push(Motion.journey({ section, scroller: root, geography: journeyGeography() }));
  });
  /* A document page carries its own contents rail, and the rail needs to know which
     clause the reader is in. It is mounted here, with the rest of the page\u2019s
     behaviour, because the nodes only have a scroller once they are in the document. */
  root.querySelectorAll("[data-docrail]").forEach((rail) => {
    const secs = [...rail.parentElement.querySelectorAll(".landing__docsec")];
    const off = watchDocSecs(rail, secs);
    if (off) offs.push(off);
  });
  return () => { offs.forEach((f) => { if (typeof f === "function") f(); }); };
}

/* The geography, assembled at render time: raw numbers from data/journey.js plus
   the *translated* station labels. The data module holds no copy on purpose — a
   label is product text, so it comes from the copy table and is escaped on its
   way into an SVG that is painted with innerHTML. */
function journeyGeography() {
  return {
    route: JOURNEY_ROUTE, sea: JOURNEY_SEA, coast: JOURNEY_COAST,
    canal: JOURNEY_CANAL, roads: JOURNEY_ROADS, bbox: JOURNEY_BBOX,
    marks: JOURNEY_MARKS.map((m) => ({ x: m.x, y: m.y, label: svgText(t(m.key)) })),
  };
}

function svgText(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
