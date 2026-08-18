/* ══════════════════════════════════════════════════════════════════════
   Landing page — the front door. Clean, branded, city-agnostic. The hero is
   full-bleed (its glow spans the whole viewport) with capped content; the
   right side is a modern auto-advancing feature slideshow (pause on hover,
   dot controls). Feature cards animate on hover; the "how it works" steps
   reveal a cursor-following tooltip. Light/dark + RTL via the shared tokens
   and logical properties; scroll-driven reveals are reduced-motion guarded.
   ══════════════════════════════════════════════════════════════════════ */
function landing() {
  return $("div",{class:"landing"},
    $("header",{class:"landing__nav"},
      $("div",{class:"landing__brand"}, logoSVG(), $("span",{text:t("brand")})),
      $("div",{class:"row gap2"},
        langToggle(), themeToggle())),

    /* ── HERO (full-bleed) ───────────────────────────────────────────── */
    $("section",{class:"landing__hero"},
      $("div",{class:"landing__heroinner"},
        $("div",{class:"landing__herotext"},
          $("h1",{class:"landing__title",text:t("landingHero")}),
          $("p",{class:"landing__sub",text:t("landingHeroSub")}),
          $("div",{class:"row gap3"},
            Btn({label:t("landingCtaStart"), on:()=>{ S.view="auth"; S.authMode="signup"; S.authStep="choose"; S.authError=null; render(); }}),
            Btn({label:t("landingCtaSignIn"), kind:"outline", on:()=>{ S.view="auth"; S.authMode="signin"; S.loginMethod=null; S.authError=null; render(); }}))),
        $("div",{class:"landing__heroslide"}, heroSlideshow()))),

    /* ── capped content ──────────────────────────────────────────────── */
    $("div",{class:"landing__body"},

      $("section",{class:"landing__section"},
        $("div",{class:"landing__grid"},
          featureCard("wallet", t("landingF1T"), t("landingF1B"), "mint"),
          featureCard("clock",  t("landingF2T"), t("landingF2B"), "sky"),
          featureCard("promos", t("landingF3T"), t("landingF3B"), "coral"),
          featureCard("livemap",t("landingF4T"), t("landingF4B"), "pink"))),

      $("section",{class:"landing__section"},
        $("h2",{class:"landing__h2",text:t("landingHowTitle")}),
        $("div",{class:"landing__steps"},
          stepCard("1", "route", t("landingHow1T"), t("landingHow1B")),
          stepCard("2", "seat",  t("landingHow2T"), t("landingHow2B")),
          stepCard("3", "board", t("landingHow3T"), t("landingHow3B")))),

      $("section",{class:"landing__cta"},
        $("h2",{class:"landing__h2",text:t("landingFoot")}),
        $("div",{class:"row gap3 center"},
          Btn({label:t("landingCtaStart"), on:()=>{ S.view="auth"; S.authMode="signup"; S.authStep="choose"; S.authError=null; render(); }}),
          Btn({label:t("landingCtaSignIn"), kind:"outline", on:()=>{ S.view="auth"; S.authMode="signin"; S.loginMethod=null; S.authError=null; render(); }}))),

      $("footer",{class:"landing__foot"},
        $("span",{class:"t-cap",text:t("brand")+" · "+t("landingFoot")}),
        $("span",{class:"landing__credits",text:t("creditsVectors")}))));
}

/* ── hero slideshow: auto-advancing feature slides, same palette ────────── */

/* Embed a recolorable sticker (STICKERS, injected by build.js). */
function stickerEl(key, cls) {
  const el = $("div",{class:"sticker"+(cls?" "+cls:"")});
  el.innerHTML = STICKERS[key] || "";
  return el;
}

let slideTimer = null;
function heroSlideshow() {
  const slides = [
    { sticker:"price", tone:"violet", title:t("slide1T"), body:t("slide1B") },
    { sticker:"save",  tone:"coral",  title:t("slide2T"), body:t("slide2B") },
    { sticker:"book",  tone:"sky",    title:t("slide3T"), body:t("slide3B") },
    { sticker:"track", tone:"mint",   title:t("slide4T"), body:t("slide4B") },
  ];
  const box = $("div",{class:"slideshow",
    attrs:{"aria-label":t("landingHowTitle")}});
  const track = $("div",{class:"slideshow__track"});
  slides.forEach((s,i)=>{
    track.append($("div",{class:"slide slide--"+s.tone+(i===0?" slide--on":"")},
      stickerEl(s.sticker, "slide__sticker"),
      $("h3",{class:"slide__t",text:s.title}),
      $("p",{class:"slide__b",text:s.body})));
  });
  const dots = $("div",{class:"slideshow__dots"});
  slides.forEach((s,i)=> dots.append($("button",{
    class:"slide-dot"+(i===0?" slide-dot--on":""),
    attrs:{type:"button","aria-label":String(i+1)},
    on:{click:()=>slideTo(i)}})));
  box.append(track, dots);

  // auto-advance; hover pauses. Each landing render clears the previous timer.
  clearInterval(slideTimer);
  S.slideIndex = 0;
  slideTimer = setInterval(()=>{
    if (S.slidePaused) return;
    const boxEl = document.querySelector(".slideshow");
    if (!boxEl) return;
    slideTo((S.slideIndex + 1) % slides.length);
  }, 4000);
  box.addEventListener("mouseenter", ()=>{ S.slidePaused = true; });
  box.addEventListener("mouseleave", ()=>{ S.slidePaused = false; });
  return box;
}

function slideTo(i) {
  S.slideIndex = i;
  const box = document.querySelector(".slideshow");
  if (!box) return;
  box.querySelectorAll(".slide").forEach((el,k)=> el.classList.toggle("slide--on", k===i));
  box.querySelectorAll(".slide-dot").forEach((el,k)=> el.classList.toggle("slide-dot--on", k===i));
}

/* ── feature cards ──────────────────────────────────────────────────────── */
function featureCard(ic, title, body, tone) {
  return $("div",{class:"landing__feature reveal"},
    $("div",{class:"landing__featureico landing__featureico--"+tone}, icon(ic)),
    $("h3",{class:"landing__h3",text:title}),
    $("p",{class:"landing__p",text:body}));
}

/* ── how-it-works steps: number stays on the SAME side in RTL (physical
      right), and a floating tooltip follows the cursor on hover ─────────── */
function stepCard(n, ic, title, body) {
  const tip = $("div",{class:"step-tip"},
    $("span",{class:"step-tip__num ltr",text:n}),
    $("strong",{text:title}),
    $("span",{class:"step-tip__body",text:body}));
  const card = $("div",{class:"landing__step reveal"}, tip,
    $("div",{class:"landing__stepnum ltr",text:n}),
    $("div",{class:"landing__stepbody"},
      stickerEl(ic, "landing__stepart"),
      $("div",{class:"landing__steptext"},
        $("h3",{class:"landing__h3",text:title}))));

  card.addEventListener("mousemove", (e)=>{
    const r = card.getBoundingClientRect();
    tip.style.left = Math.min(e.clientX - r.left + 18, r.width - 200) + "px";
    tip.style.top  = Math.max(e.clientY - r.top - 14, 8) + "px";
  });
  card.addEventListener("mouseenter", ()=> tip.classList.add("step-tip--on"));
  card.addEventListener("mouseleave", ()=> tip.classList.remove("step-tip--on"));
  card.addEventListener("click", ()=> tip.classList.toggle("step-tip--on")); // touch
  return card;
}

function langToggle() {
  return IconBtn({name:"globe", label:t("language"),
    on:()=>{ S.lang = S.lang==="en" ? "ar" : "en"; storeSet("rs.lang", S.lang); render(); }});
}
