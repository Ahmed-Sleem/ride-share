#!/usr/bin/env node
/* Real-browser layout verification across the GUI-rules §18.3 viewport matrix.
   jsdom cannot do this: it has no layout engine, so it cannot see overflow,
   overlap, or whether the dock is actually on screen. This file measures
   the rendered result. */
const path=require("path");
const puppeteer=require("puppeteer");

const FILE="file://"+path.join(__dirname,"..","dist-preview.html");

/* §18.3 baseline viewports + the M3 breakpoint boundaries */
const VIEWPORTS=[
  {n:"320×568  min phone",     w:320,  h:568,  nav:"bar"},
  {n:"360×640  common Android",w:360,  h:640,  nav:"bar"},
  {n:"375×812  iPhone",        w:375,  h:812,  nav:"bar"},
  {n:"599×800  compact edge",  w:599,  h:800,  nav:"bar"},
  {n:"600×800  medium edge",   w:600,  h:800,  nav:"rail"},
  {n:"768×1024 tablet",        w:768,  h:1024, nav:"rail"},
  {n:"839×700  expanded edge", w:839,  h:700,  nav:"rail"},
  {n:"840×700  expanded",      w:840,  h:700,  nav:"rail-wide"},
  {n:"1024×768 laptop",        w:1024, h:768,  nav:"rail-wide"},
  {n:"1280×800 desktop",       w:1280, h:800,  nav:"rail-wide"},
  {n:"1440×900 desktop",       w:1440, h:900,  nav:"rail-wide"},
  {n:"1920×1080 wide",         w:1920, h:1080, nav:"rail-wide"},
  {n:"2560×1440 ultrawide",    w:2560, h:1440, nav:"rail-wide"},
  {n:"812×375  landscape",     w:812,  h:375,  nav:"rail"},
  {n:"320×480  tiny",          w:320,  h:480,  nav:"bar"}
];

let pass=0, fail=0;
const ok=(n,c,d)=>{ if(c){pass++;} else {fail++;console.log("  FAIL  "+n+(d?"  → "+d:""));} };

(async()=>{
  const browser=await puppeteer.launch({args:["--no-sandbox","--disable-setuid-sandbox"]});
  const page=await browser.newPage();
  const errors=[];
  page.on("console",m=>{ if(m.type()==="error") errors.push(m.text()); });
  page.on("pageerror",e=>errors.push(String(e)));

  /* The shell measures LAYOUT, not the network. On file:// every relative
     fetch is blocked by the browser's CORS policy (a test-environment
     artifact, not an app defect — in production the web server proxies
     /v1/*). Stub fetch to answer with the standard error shape so the real
     screens render their honest error/empty states instead of firing
     blocked requests that would pollute the console-error check. */
  await page.evaluateOnNewDocument(() => {
    window.fetch = () => new Promise((resolve) => {
      setTimeout(() => resolve({
        ok: false, status: 503,
        json: async () => ({ code: "503", message_key: "error.unavailable" }),
      }), 0);
    });
  });

  const ROLES=["rider","driver","ops","manager","support","super_admin"];

  for(const vp of VIEWPORTS){
    await page.setViewport({width:vp.w,height:vp.h,deviceScaleFactor:1});
    await page.goto(FILE,{waitUntil:"load"});

    for(const role of ROLES){
      const pages=await page.evaluate(r=>{ S.view="app"; S.authed=true; S.role=r; S.page=DEFAULT_PAGE[r]; S.stack=[];
        render(); return PAGES[r].map(p=>p.k); }, role);

      for(const pk of pages){
        const m=await page.evaluate((r,k)=>{
          S.view="app"; S.authed=true; S.rail="open"; S.role=r; S.page=k; S.stack=[]; S.sheet=null; S.opsView=null; render();
          const de=document.documentElement;
          const q=s=>document.querySelector(s);
          const box=el=>{ if(!el) return null; const b=el.getBoundingClientRect();
            return {t:b.top,l:b.left,r:b.right,b:b.bottom,w:b.width,h:b.height}; };
          const nav=q(".nav"), main=q(".main"), top=q(".topbar"), band=q(".searchband");
          // widest element that pokes outside the window
          // An element wider than the window is only a defect if nothing
          // between it and the root scrolls. Content inside a deliberate
          // scroll container (a wide data table) is correct, not overflow.
          // Measure overflow at the CONTAINER, not at every descendant.
          // A wide table inside a scroll container is correct; the defect is a
          // container that is itself wider than the space it was given. Only
          // scrollable ancestors (auto/scroll) legitimise a wide child --
          // overflow:hidden hides a bug rather than handling it, so it does
          // not count as containment here.
          let widest=0, offender="";
          document.querySelectorAll("*").forEach(el=>{
            // Skip geometry INSIDE an svg: getBoundingClientRect reports a
            // shape's own coordinates and ignores the clip its viewBox applies,
            // so a slice-scaled map reads as overflow when it is really clipped.
            // The <svg> element itself is still measured.
            if(el.ownerSVGElement) return;
            const cs=getComputedStyle(el);
            if(cs.display==="none"||cs.visibility==="hidden") return;
            const b=el.getBoundingClientRect();
            if(b.width===0 && b.height===0) return;
            const escapes=Math.max(0, b.right-de.clientWidth, -b.left);
            if(escapes<=widest) return;
            let contained=false;
            for(let n=el.parentElement;n;n=n.parentElement){
              const ov=getComputedStyle(n).overflowX;
              if(ov==="auto"||ov==="scroll"){ contained=true; break; }
            }
            if(contained) return;
            widest=escapes;
            offender=(typeof el.className==="string"&&el.className?el.className:el.tagName);
          });
          // An element that scrolls internally must still FIT its own parent.
          let burst=0, burstEl="";
          document.querySelectorAll(".tablewrap,.main,.grid,.card,.panel").forEach(el=>{
            const par=el.parentElement; if(!par) return;
            const over=el.getBoundingClientRect().width-par.getBoundingClientRect().width;
            if(over>burst){ burst=over;
              burstEl=(typeof el.className==="string"?el.className:el.tagName); }
          });
          return {
            docScrollW:de.scrollWidth, docClientW:de.clientWidth,
            docScrollH:de.scrollHeight, docClientH:de.clientHeight,
            nav:box(nav), main:box(main), top:box(top), band:box(band),
            title:box(q(".topbar__title")),
            /* The edge is a pseudo-element, so it can only be read from the rendered
               style — the whole reason this suite exists next to a text grep. */
            edge:(()=>{ if(!top) return null; const c=getComputedStyle(top);
              return {w:c.borderBottomWidth, col:c.borderBottomColor}; })(),
            afterPseudo:top?getComputedStyle(top,"::after").backgroundImage:null,
            navTop:(()=>{ if(!nav) return null; const c=getComputedStyle(nav);
              return {w:c.borderTopWidth, col:c.borderTopColor}; })(),
            navSide:(()=>{ if(!nav) return null; const c=getComputedStyle(nav);
              return {w:c.borderInlineEndWidth, col:c.borderInlineEndColor}; })(),
            /* The rolled state, read in the same pass so both halves describe one render.
               The transition is switched off for the measurement: the colour is animated over
               --fast, so a value sampled the instant the class lands is the OLD value, and the
               assertion would be reading a frame of motion instead of a rule. */
            rolled:(()=>{ if(!top||!main) return null;
              const prev=top.style.transition; top.style.transition="none";
              main.classList.add("is-rolled");
              const c=getComputedStyle(top);
              const out={w:c.borderBottomWidth, col:c.borderBottomColor};
              main.classList.remove("is-rolled"); top.style.transition=prev;
              return out; })(),
            navDur:nav?parseFloat(getComputedStyle(nav).transitionDuration)||0:null,
            navDisplay:nav?getComputedStyle(nav).flexDirection:null,
            labelShown:(()=>{ const l=q(".navitem__label");
              return l?getComputedStyle(l).display!=="none":false; })(),
            brandShown:(()=>{ const b2=q(".nav__brand");
              return b2?getComputedStyle(b2).display!=="none":false; })(),
            mainScrollable:main?main.scrollHeight>main.clientHeight+1:false,
            widestOverflow:Math.round(widest), offender:String(offender).slice(0,40),
            burst:Math.round(burst), burstEl:String(burstEl).slice(0,40),
            innerW:(()=>{ const i=q(".main__inner"); return i?Math.round(i.getBoundingClientRect().width):null; })(),
            wide:!!(main&&main.classList.contains("main--wide")),
            contentMax:parseInt(getComputedStyle(de).getPropertyValue("--content-max"),10)||0
          };
        }, role, pk);

        const id=`${vp.n} ${role}/${pk}`;
        /* "Use the same edge as the bottom menu" is only testable as an equality: when the
           head's line is on it must BE the line the bar at the other end of the shell already
           draws — its top rule on a phone, its inline rule on a rail. */
        const wantLine=m=>(vp.nav==="bar"?m.navTop:m.navSide)||{col:"",w:""};

        // 1. no horizontal page overflow, ever
        ok(`${id}: no horizontal overflow`,
           m.docScrollW<=m.docClientW+1, `${m.docScrollW}>${m.docClientW} via ${m.offender}`);
        ok(`${id}: nothing escapes the window`,
           m.widestOverflow<=1, `${m.widestOverflow}px via ${m.offender}`);
        ok(`${id}: no container is wider than its parent`,
           m.burst<=1, `${m.burst}px via ${m.burstEl}`);

        // 2. the page itself never scrolls vertically — the shell owns height
        ok(`${id}: page does not scroll vertically`,
           m.docScrollH<=m.docClientH+1, `${m.docScrollH}>${m.docClientH}`);

        // 3. navigation is fully on screen
        ok(`${id}: nav visible`, m.nav && m.nav.w>0 && m.nav.h>0);
        ok(`${id}: nav inside the viewport`,
           m.nav && m.nav.b<=vp.h+1 && m.nav.r<=vp.w+1 && m.nav.t>=-1 && m.nav.l>=-1,
           JSON.stringify(m.nav));

        // 4. correct navigation form for the breakpoint
        if(vp.nav==="bar"){
          ok(`${id}: bar sits at the bottom`,
             m.nav && Math.abs(m.nav.b-vp.h)<=1, `bottom=${m.nav&&m.nav.b}`);
          ok(`${id}: bar spans the width`,
             m.nav && Math.abs(m.nav.w-vp.w)<=1, `w=${m.nav&&m.nav.w}`);
        } else {
          ok(`${id}: rail is vertical`, m.navDisplay==="column", m.navDisplay);
          ok(`${id}: rail is full height`,
             m.nav && Math.abs(m.nav.h-vp.h)<=1, `h=${m.nav&&m.nav.h}`);
          ok(`${id}: rail is narrow, not full width`,
             m.nav && m.nav.w<vp.w*0.4, `w=${m.nav&&m.nav.w}`);
        }
        if(vp.nav==="rail-wide")
          ok(`${id}: expanded rail shows labels`, m.labelShown);

        // 5. the head is the page's first block, so nothing may sit under it.
        //    Round 9 retired "the scroller starts below a fixed bar" (m.main.t>=m.top.b):
        //    the head moved into the column, so that comparison is now the wrong contract.
        //    The guarantee it existed for is measured directly instead — the first block
        //    of content begins at or below the head's bottom on every viewport. If the
        //    head ever stopped reserving its own height, this number catches it.
        if(m.top && m.band)
          ok(`${id}: content starts below the page head`,
             m.band.t>=m.top.b-1, `band.t=${m.band.t} top.b=${m.top.b}`);
        /* 5b. THE BAR IS THE TOP OF THE PAGE, AND IT HAS AN EDGE.
           Round 17 (the owner, on the running app): the bar was thin, it did not reach
           the top of the page, and its boundary was a blur that had nothing under it.
           These three are the only way to see that, because they depend on the entrance
           animation, the sticky offset and a pseudo-element — none of which exist in the
           stylesheet text or in jsdom. The 1200px gutter is in here deliberately: it was
           the exact number that floated the bar down, and it is the exact number that will
           do it again if someone "tidies" the rule back. */
        if(m.top)
          ok(`${id}: the head touches the top of the page`, Math.abs(m.top.t)<=0.5, `top.t=${m.top.t}`);
        if(m.top && m.title){
          ok(`${id}: the title owns air under it inside the bar`,
             m.top.b-m.title.b>=10, `head.b=${m.top.b} title.b=${m.title.b}`);
          ok(`${id}: and air above it, so the poster is not glued to the edge`,
             m.title.t-m.top.t>=10, `title.t=${m.title.t} head.t=${m.top.t}`);
        }
        if(m.edge && m.rolled){
          ok(`${id}: the head carries no visible rule at rest`,
             m.edge.w==="1px"&&/rgba\(0, 0, 0, 0\)|transparent/.test(m.edge.col), JSON.stringify(m.edge));
          ok(`${id}: content under the head brings the other bar's exact line`,
             m.rolled.w==="1px" && m.rolled.col===wantLine(m).col && wantLine(m).w==="1px",
             `${m.rolled.col} vs ${JSON.stringify(wantLine(m))}`);
          ok(`${id}: and the line is the only layer — no pseudo, no gradient left behind`,
             !m.afterPseudo || m.afterPseudo==="none", String(m.afterPseudo).slice(0,26));
        }
        if(m.navDur!=null && vp.nav!=="bar")
          ok(`${id}: the rail's width change is travelled, not snapped`,
             m.navDur>0, `transition-duration=${m.navDur}s`);

        if(m.band && m.main)
          ok(`${id}: search band sits inside the scroller`,
             m.band.t>=m.main.t-1 && m.band.b<=m.main.b+1,
             `band=${m.band.t}..${m.band.b} main=${m.main.t}..${m.main.b}`);
        if(m.nav && m.main && vp.nav==="bar")
          ok(`${id}: bar does not cover content`,
             m.main.b<=m.nav.t+1, `main.b=${m.main.b} nav.t=${m.nav.t}`);
        if(m.nav && m.main && vp.nav!=="bar")
          ok(`${id}: rail does not cover content`,
             m.main.w>0 && (m.main.l>=m.nav.r-1 || m.nav.l>=m.main.r-1),
             `main=${m.main.l}..${m.main.r} nav=${m.nav.l}..${m.nav.r}`);

        // 6. content stays within its reading measure on huge screens.
        // Without a cap, a line of text on a 2560px monitor is unreadable.
        if(m.innerW!=null){
          ok(`${id}: content width is bounded`, m.innerW<=vp.w, `${m.innerW}`);
          if(!m.wide)
            ok(`${id}: content respects the reading cap`, m.innerW<=m.contentMax+1,
               `inner=${m.innerW} cap=${m.contentMax}`);
        }
      }
    }
  }

  /* ── overlays, themes, RTL, zoom ─────────────────────────────────── */
  await page.setViewport({width:375,height:812});
  await page.goto(FILE,{waitUntil:"load"});

  /* The sheet list is DERIVED from the live SHEETS registry (§0.3 — one
     definition). A hardcoded list drifted when demo sheets were removed
     (the test kept asserting deleted sheets); reading the registry means
     every registered sheet is measured and none can silently fall out of
     coverage. The core-sheet guard keeps this from going vacuously green. */
  const sheetNames = await page.evaluate(() => Object.keys(SHEETS));
  ok("sheet registry exposes the core sheets",
     ["sos","report","claimSlot","fieldCapture","staffEdit","staffRemove"].every((k) => sheetNames.includes(k)),
     sheetNames.join(","));
  for(const sheet of sheetNames){
    await page.evaluate(s=>{
      S.view="app"; S.authed=true; S.role="rider"; S.page="home"; S.stack=[];
      openSheet(s);
    }, sheet);
    // measure AFTER the entry animation; mid-flight geometry is not a defect
    await new Promise(r=>setTimeout(r,400));
    const m=await page.evaluate(()=>{
      const el=document.querySelector(".sheet");
      if(!el) return null;
      const b=el.getBoundingClientRect();
      return {t:b.top,b:b.bottom,l:b.left,r:b.right,
              scrolls:el.scrollHeight>el.clientHeight+1};
    });
    ok(`sheet ${sheet} renders`, !!m);
    if(m){
      ok(`sheet ${sheet} within viewport`,
         m.b<=812+1 && m.l>=-1 && m.r<=375+1, JSON.stringify(m));
      ok(`sheet ${sheet} top is on screen`, m.t>=-1, String(m.t));
    }
  }

  /* Wide data must scroll inside its own wrapper, never overflow the page
     (§18.4 "wide data uses an intentional small-space strategy"). Staff
     tables have a 560px floor; on a phone that floor must scroll, not push
     the page wider. */ 
  await page.setViewport({width:375,height:812});
  await page.goto(FILE,{waitUntil:"load"});
  const tableOver = await page.evaluate(()=>{
    S.view="app"; S.authed=true; S.theme="light"; S.lang="en"; S.role="ops";
    S.page="queue"; S.stack=[]; S.sheet=null; render();
    const main=document.querySelector(".main");
    if(!main) return null;
    const wrap=document.createElement("div"); wrap.className="tablewrap";
    const tb=document.createElement("table"); tb.className="table";
    const tr=document.createElement("tr");
    for(let i=0;i<8;i++){ const td=document.createElement("td"); td.textContent="Wide cell "+i; tr.appendChild(td); }
    tb.appendChild(tr); wrap.appendChild(tb);
    (main.querySelector(".main__inner")||main).appendChild(wrap);
    const de=document.documentElement;
    return { wrapOverflowX:getComputedStyle(wrap).overflowX,
             docScrollW:de.scrollWidth, clientW:de.clientWidth };
  });
  ok("wide table scrolls inside its wrapper (no page overflow)",
     !!tableOver && (tableOver.wrapOverflowX==="auto"||tableOver.wrapOverflowX==="scroll")
       && tableOver.docScrollW<=tableOver.clientW+1,
     JSON.stringify(tableOver));

  for(const theme of ["light","dark"]) for(const lang of ["en","ar"]){
    const m=await page.evaluate((th,lg)=>{
      S.view="app"; S.authed=true; S.theme=th; S.lang=lg; S.role="rider"; S.page="home"; S.sheet=null; render();
      const de=document.documentElement;
      return {dir:de.dir, over:de.scrollWidth-de.clientWidth,
              bg:getComputedStyle(document.body).backgroundColor};
    }, theme, lang);
    ok(`${theme}/${lang}: no overflow`, m.over<=1, String(m.over));
    ok(`${theme}/${lang}: direction correct`, m.dir===(lang==="ar"?"rtl":"ltr"), m.dir);
  }

  // 200% zoom (GUI rules §18.3) — emulated by halving the viewport in CSS px
  await page.setViewport({width:640,height:512,deviceScaleFactor:2});
  const z=await page.evaluate(()=>{ S.view="app"; S.authed=true; S.theme="light"; S.lang="en"; S.role="rider";
    S.page="home"; render();
    const de=document.documentElement;
    return {over:de.scrollWidth-de.clientWidth, navVisible:!!document.querySelector(".nav")};
  });
  ok("200% zoom: no horizontal overflow", z.over<=1, String(z.over));
  ok("200% zoom: navigation still present", z.navVisible);

  // long content must not break the shell
  await page.setViewport({width:375,height:812});
  const long=await page.evaluate(()=>{
    S.view="app"; S.authed=true; S.role="rider";
    S.user={id:"u1",role:"rider",name:"A".repeat(80),email:"a@x.com"};
    S.page="home"; render();
    const de=document.documentElement;
    return {over:de.scrollWidth-de.clientWidth, vover:de.scrollHeight-de.clientHeight};
  });
  ok("very long text: no horizontal overflow", long.over<=1, String(long.over));
  ok("very long text: page still does not scroll", long.vover<=1, String(long.vover));

  /* The motion guard, proven from both sides. A rule that lives inside
     `prefers-reduced-motion:no-preference` is only real if a reader who asks for calm
     actually gets the old instant behaviour — so the same element is measured twice,
     and the assertion that matters is the one that passes on the second pass. */
  {
    const railDur=async(mode)=>{
      await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:mode}]);
      await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
      await page.goto(FILE,{waitUntil:"load"});
      await page.evaluate(()=>{ S.view="app"; S.authed=true; S.role="rider"; S.page="home";
        S.stack=[]; S.sheet=null; S.opsView=null; render(); });
      return await page.evaluate(()=>{
        const nav=document.querySelector(".nav"), head=document.querySelector(".topbar");
        const main=document.querySelector(".main");
        /* Under `reduce` a engine does not set durations to zero — it rewrites them to a
           hair above nothing (Chrome reports 0.00001s), so the predicate is "not a
           travel", never "== 0". And the edge is matched on the whole function name: a
           truncated probe string once made a passing edge look like a failing one here. */
        return {dur:parseFloat(getComputedStyle(nav).transitionDuration)||0,
          label:getComputedStyle(document.querySelector(".navitem__label")).animationName,
          /* The edge is a border now, and a border is not motion: it must be there in both
             modes when content is under the bar. Its ARRIVAL is the motion, so the
             transition is suppressed to read the settled value in either mode. */
          line:(()=>{ if(!head||!main) return null;
            const prev=head.style.transition; head.style.transition="none";
            main.classList.add("is-rolled");
            const c=getComputedStyle(head);
            const out={w:c.borderBottomWidth, col:c.borderBottomColor};
            main.classList.remove("is-rolled"); head.style.transition=prev; return out; })()};
      });
    };
    const lively=await railDur("no-preference");
    ok("the rail travels when motion is welcome", lively.dur>0.05, String(lively.dur)+"s");
    ok("…and the labels fade in", lively.label==="rail-in", lively.label);
    const calm=await railDur("reduce");
    ok("reduced motion leaves the rail no travel", calm.dur<0.01, String(calm.dur)+"s");
    ok("reduced motion takes the label fade back too", calm.label==="none", calm.label);
    ok("the line is not motion, so it is painted in both modes",
       !!lively.line&&!!calm.line&&lively.line.w==="1px"&&calm.line.w==="1px"&&
       lively.line.col===calm.line.col&&!/rgba\(0, 0, 0, 0\)/.test(calm.line.col),
       `${JSON.stringify(lively.line)} | ${JSON.stringify(calm.line)}`);
    await page.emulateMediaFeatures([]);
  }

  ok("no console errors during the run", errors.length===0, errors.slice(0,2).join(" | "));

  await browser.close();
  console.log(`\n──────── layout: ${pass} passed, ${fail} failed ────────`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
