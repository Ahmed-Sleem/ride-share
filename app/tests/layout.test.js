#!/usr/bin/env node
/* Real-browser layout verification across the GUI-rules §18.3 viewport matrix.
   jsdom cannot do this: it has no layout engine, so it cannot see overflow,
   overlap, or whether the dock is actually on screen. This file measures
   the rendered result. */
const path=require("path");
const puppeteer=require("/tmp/node_modules/puppeteer");

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

  const ROLES=["rider","driver","ops","manager","support"];

  for(const vp of VIEWPORTS){
    await page.setViewport({width:vp.w,height:vp.h,deviceScaleFactor:1});
    await page.goto(FILE,{waitUntil:"load"});

    for(const role of ROLES){
      const pages=await page.evaluate(r=>{ S.role=r; S.page=DEFAULT_PAGE[r]; S.stack=[];
        render(); return PAGES[r].map(p=>p.k); }, role);

      for(const pk of pages){
        const m=await page.evaluate((r,k)=>{
          S.role=r; S.page=k; S.stack=[]; S.sheet=null; S.opsView=null; render();
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

        // 5. chrome does not overlap the scroller
        if(m.top && m.main)
          ok(`${id}: top bar does not overlap content`,
             m.main.t>=m.top.b-1, `main.t=${m.main.t} top.b=${m.top.b}`);
        if(m.band && m.main)
          ok(`${id}: search band does not overlap content`,
             m.main.t>=m.band.b-1, `main.t=${m.main.t} band.b=${m.band.b}`);
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
  for(const sheet of ["qr","sos","topup","subs","scan","claim","report","contacts","trip","fare"]){
    await page.evaluate(s=>{
      S.role = (s==="scan"||s==="claim") ? "driver" : (s==="fare" ? "manager" : "rider");
      S.page = DEFAULT_PAGE[S.role]; openSheet(s);
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

  for(const theme of ["light","dark"]) for(const lang of ["en","ar"]){
    const m=await page.evaluate((th,lg)=>{
      S.theme=th; S.lang=lg; S.role="rider"; S.page="home"; S.sheet=null; render();
      const de=document.documentElement;
      return {dir:de.dir, over:de.scrollWidth-de.clientWidth,
              bg:getComputedStyle(document.body).backgroundColor};
    }, theme, lang);
    ok(`${theme}/${lang}: no overflow`, m.over<=1, String(m.over));
    ok(`${theme}/${lang}: direction correct`, m.dir===(lang==="ar"?"rtl":"ltr"), m.dir);
  }

  // 200% zoom (GUI rules §18.3) — emulated by halving the viewport in CSS px
  await page.setViewport({width:640,height:512,deviceScaleFactor:2});
  const z=await page.evaluate(()=>{ S.theme="light"; S.lang="en"; S.role="rider";
    S.page="home"; render();
    const de=document.documentElement;
    return {over:de.scrollWidth-de.clientWidth, navVisible:!!document.querySelector(".nav")};
  });
  ok("200% zoom: no horizontal overflow", z.over<=1, String(z.over));
  ok("200% zoom: navigation still present", z.navVisible);

  // long content must not break the shell
  await page.setViewport({width:375,height:812});
  const long=await page.evaluate(()=>{
    DATA.routes[0].en="A".repeat(160); DATA.user.name="B".repeat(80);
    S.role="rider"; S.page="home"; render();
    const de=document.documentElement;
    return {over:de.scrollWidth-de.clientWidth, vover:de.scrollHeight-de.clientHeight};
  });
  ok("very long text: no horizontal overflow", long.over<=1, String(long.over));
  ok("very long text: page still does not scroll", long.vover<=1, String(long.vover));

  ok("no console errors during the run", errors.length===0, errors.slice(0,2).join(" | "));

  await browser.close();
  console.log(`\n──────── layout: ${pass} passed, ${fail} failed ────────`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
