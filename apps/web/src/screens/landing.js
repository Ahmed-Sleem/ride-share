/* ══════════════════════════════════════════════════════════════════════
   Landing page — the front door. Clean, branded, city-agnostic (DEC —
   "general and suitable for expansion"). One scroller of its own; light/
   dark and RTL via the shared tokens and logical properties. The hero uses
   CSS scroll-driven animation (view-timeline) with a reduced-motion
   fallback — transform/opacity only, no JS scroll handlers.
   ══════════════════════════════════════════════════════════════════════ */
function landing() {
  return $("div",{class:"landing"},
    $("header",{class:"landing__nav"},
      $("div",{class:"landing__brand"}, logoSVG(), $("span",{text:t("brand")})),
      $("div",{class:"row gap2"},
        langToggle(), themeToggle())),
    $("div",{class:"landing__body"},

      /* ── HERO ───────────────────────────────────────────────────────── */
      $("section",{class:"landing__hero"},
        $("div",{class:"landing__herotext"},
          $("h1",{class:"landing__title",text:t("landingHero")}),
          $("p",{class:"landing__sub",text:t("landingHeroSub")}),
          $("div",{class:"row gap3 mt4"},
            Btn({label:t("landingCtaStart"), on:()=>{ S.view="auth"; S.authMode="signup"; S.authStep="phone"; S.authError=null; render(); }}),
            Btn({label:t("landingCtaSignIn"), kind:"outline", on:()=>{ S.view="auth"; S.authMode="signin"; S.authError=null; render(); }}))),
        $("div",{class:"landing__heromap"},
          MapView({h:420, walk:true, route:true, stops:true, vehicle:true}))),

      /* ── FEATURES ──────────────────────────────────────────────────── */
      $("section",{class:"landing__section"},
        $("div",{class:"landing__grid"},
          featureCard("wallet", t("landingF1T"), t("landingF1B"), "mint"),
          featureCard("clock",  t("landingF2T"), t("landingF2B"), "sky"),
          featureCard("routes", t("landingF3T"), t("landingF3B"), "pink"),
          featureCard("globe",  t("landingF4T"), t("landingF4B"), "lime"))),

      /* ── HOW IT WORKS ──────────────────────────────────────────────── */
      $("section",{class:"landing__section"},
        $("h2",{class:"landing__h2",text:t("landingHowTitle")}),
        $("div",{class:"landing__steps"},
          stepCard("1", "routes", t("landingHow1T"), t("landingHow1B")),
          stepCard("2", "seat",   t("landingHow2T"), t("landingHow2B")),
          stepCard("3", "qr",      t("landingHow3T"), t("landingHow3B")))),

      /* ── CTA band ──────────────────────────────────────────────────── */
      $("section",{class:"landing__cta"},
        $("h2",{class:"landing__h2",text:t("landingFoot")}),
        $("div",{class:"row gap3 center"},
          Btn({label:t("landingCtaStart"), on:()=>{ S.view="auth"; S.authMode="signup"; S.authStep="phone"; S.authError=null; render(); }}),
          Btn({label:t("landingCtaSignIn"), kind:"outline", on:()=>{ S.view="auth"; S.authMode="signin"; S.authError=null; render(); }}))),

      $("footer",{class:"landing__foot"},
        $("span",{class:"t-cap",text:t("brand")+" · "+t("landingFoot")}))));
}

function featureCard(ic, title, body, tone) {
  return $("div",{class:"landing__feature reveal"},
    $("div",{class:"landing__featureico landing__featureico--"+tone}, icon(ic)),
    $("h3",{class:"landing__h3",text:title}),
    $("p",{class:"landing__p",text:body}));
}

function stepCard(n, ic, title, body) {
  return $("div",{class:"landing__step reveal"},
    $("div",{class:"landing__stepnum ltr",text:n}),
    $("div",{class:"landing__featureico"}, icon(ic)),
    $("h3",{class:"landing__h3",text:title}),
    $("p",{class:"landing__p",text:body}));
}

function langToggle() {
  return IconBtn({name:"globe", label:t("language"),
    on:()=>{ S.lang = S.lang==="en" ? "ar" : "en"; storeSet("rs.lang", S.lang); render(); }});
}
