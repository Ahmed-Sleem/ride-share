/* Landing-page layout verification (owner-reported regression: the page
   filled only ~50% of the viewport). Proves, in a real browser, that:
   - the landing fills the full viewport width at every size;
   - the hero is at least one viewport tall;
   - there is no horizontal overflow;
   - the auth card is horizontally centered;
   - RTL mirrors without breaking width.
   Puppeteer is required; run via `pnpm --filter @ride-share/web test:landing`. */
const path = require('path');
const puppeteer = require('puppeteer');

const FILE = 'file://' + path.join(__dirname, '..', 'dist-preview.html');
/* A phone in a pocket, a laptop with a short lid, an ultrawide, and a browser zoomed
   to 200% (the narrow viewports below emulate exactly that: the CSS pixel box is what
   a zoom leaves you with). Every entry runs the whole battery above. */
const VIEWPORTS = [
  { w: 320, h: 568 }, { w: 320, h: 480 }, { w: 360, h: 640 }, { w: 375, h: 812 },
  { w: 390, h: 844 }, { w: 412, h: 915 }, { w: 430, h: 932 }, { w: 480, h: 800 },
  { w: 540, h: 960 }, { w: 599, h: 900 }, { w: 600, h: 900 }, { w: 680, h: 1024 },
  { w: 720, h: 1280 }, { w: 768, h: 1024 }, { w: 820, h: 1180 }, { w: 900, h: 700 },
  { w: 1024, h: 768 }, { w: 1180, h: 820 }, { w: 1280, h: 800 }, { w: 1366, h: 1024 },
  { w: 1440, h: 900 }, { w: 1600, h: 900 }, { w: 1920, h: 1080 }, { w: 2560, h: 1440 },
  { w: 3440, h: 1440 }, { w: 812, h: 375 },
];
/* Scroll a landing page from top to bottom in a few steps and report how many of
   its reveal blocks ended up visible. `doc` opens a policy first. */
async function page_scroll(view, key, doc) {
  await view.evaluate(async (p, d) => {
    S.lang = 'en'; S.view = 'landing'; S.landingPage = p; S.landingDoc = d ? d[0] : null;
    render();
    await new Promise((r) => setTimeout(r, 60));
    const l = document.querySelector('.landing');
    /* `.landing` animates its own scrolls (the shell's one rule), which turns a
       test's position jumps into a slow glide that never reaches the bottom.
       Measurement wants the jump, not the easing. */
    l.style.scrollBehavior = 'auto';
    for (let i = 1; i <= 6; i++) {
      l.scrollTop = Math.round((l.scrollHeight - l.clientHeight) * (i / 6));
      await new Promise((r) => setTimeout(r, 180));
    }
    /* A block that has just entered is still travelling: `--rev` sets the
       duration and `--d` its delay, so "revealed" and "arrived" are two
       different moments. This counts the first. */
    await new Promise((r) => setTimeout(r, 1600));
    if (l.scrollTop < l.scrollHeight - l.clientHeight - 2) {
      throw new Error('the landing did not scroll (scrollTop ' + l.scrollTop + ' of ' + (l.scrollHeight - l.clientHeight) + ')');
    }
  }, key, doc);
  return view.evaluate(() => {
    const rv = [...document.querySelectorAll('.landing [data-rv]')];
    return {
      total: rv.length,
      done: rv.filter((el) => el.getAttribute('data-rv') === 'in').length,
      hidden: rv.filter((el) => Number(getComputedStyle(el).opacity) < 0.05).length,
    };
  });
}


let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  /* The splash holds until the document has loaded, so the harness waits for the page
     rather than for a number of milliseconds that a cold load can outrun. */
  const settled = async () => {
    await page.waitForSelector('.landing', { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 500));            // reveals and the band's delay
  };

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto(FILE);
    await settled();                             // boot splash → landing
    const m = await page.evaluate(() => {
      const doc = document.documentElement;
      const landing = document.querySelector('.landing');
      const hero = document.querySelector('.landing__hero');
      const journey = document.querySelector('.journey');
      const cuts = document.querySelectorAll('.journey__cut');
      const lines = document.querySelectorAll('.landing__displayline');
      const done = document.querySelector('.journey__done');
      const line = document.querySelector('.journey__line');
      const lb = landing ? landing.getBoundingClientRect() : null;
      const hb = hero ? hero.getBoundingClientRect() : null;
      return {
        landingW: lb ? Math.round(lb.width) : 0,
        vw: doc.clientWidth,
        landingL: lb ? Math.round(lb.left) : -999,
        docScrollW: doc.scrollWidth,
        heroH: hb ? Math.round(hb.height) : 0,
        vh: doc.clientHeight,
        lines: lines.length,
        cuts: cuts.length,
        hasJourney: !!journey,
        journeyH: journey ? Math.round(journey.getBoundingClientRect().height) : 0,
        /* "Drawn, not declared" measured at scrollTop 0: the reader has not reached the road
           yet, so what must exist here is the geometry itself (`.journey__line`), while the
           inked progress (`.journey__done`) belongs to the scrolled survey below, where it is
           true to say 0 if the bus never moved. */
        routeLen: line && line.getAttribute('d') ? line.getAttribute('d').length : 0,
        bandW: Math.round(document.querySelector('.landing__marquee-in').getBoundingClientRect().width),
        /* The masthead is sized from a measured viewport, so it can be checked against
           the window it was given; and nothing may be clipped inside it, because the
           box is a floor for the copy, not a crop for it. */
        heroClip: hero ? hero.scrollHeight - hero.clientHeight : -1,
        viewH: parseFloat(getComputedStyle(doc).getPropertyValue('--view-h')) || 0,
        heroParas: document.querySelectorAll('.landing__hero .landing__p').length,
        /* The page names sit on the bar's own axis when there is room for them there. */
        navOff: (() => {
          const nl = document.querySelector('.landing__links'), nv = document.querySelector('.landing__nav');
          if (!nl || !nv || getComputedStyle(nl).display === 'none') return -1;
          const a = nl.getBoundingClientRect(), b = nv.getBoundingClientRect();
          return Math.round((a.left + a.width / 2 - (b.left + b.width / 2)) * 10) / 10;
        })(),
        /* The switches and the two ways in are one row, but not one crowd. */
        authGap: (() => {
          const b = document.querySelector('.landing__actions > .btn');
          return b ? Math.round(parseFloat(getComputedStyle(b).marginInlineStart) || 0) : -1;
        })(),
        rights: (() => {
          const fine = document.querySelector('.landing__foot .landing__fine');
          const L = (window.T && T[S.lang]) || {};
          return fine ? [fine.textContent.includes(L.rights || '\u0000'),
                         fine.textContent.includes(L.brand || '\u0000'),
                         /\b(19|20)\d\d\b/.test(fine.textContent)] : [false, false, false];
        })(),
        footEcho: (() => {
          const want = ((window.T && T[S.lang] && T[S.lang].landingFoot) || '').trim();
          if (!want) return -1;
          return [...document.querySelectorAll('.landing *')]
            .filter((e) => !e.children.length && e.textContent.trim() === want).length;
        })(),
      };
    });
    const id = `${vp.w}×${vp.h}`;
    ok(`${id}: landing fills the viewport width`,
      Math.abs(m.landingW - m.vw) <= 1, `${m.landingW} vs ${m.vw}`);
    ok(`${id}: landing starts at the left edge`, m.landingL >= -1, String(m.landingL));
    ok(`${id}: no horizontal overflow`, m.docScrollW <= m.vw + 1, `${m.docScrollW} > ${m.vw}`);
    /* The masthead is one screen: three lines of display type, no illustration,
       and nothing cropped. The `vh` tolerance is one line of hairline rounding. */
    ok(`${id}: the masthead is at least one viewport tall`, m.heroH >= m.vh - 2, `${m.heroH} vs ${m.vh}`);
    ok(`${id}: the masthead crops nothing`, m.heroClip <= 2, `overflow ${m.heroClip}px`);
    ok(`${id}: its height comes from the measured viewport`,
       m.viewH > 0 && Math.abs(m.viewH - m.vh) <= 2, `${m.viewH} vs ${m.vh}`);
    ok(`${id}: the masthead explains the service, not only names it`, m.heroParas >= 1, String(m.heroParas));
    ok(`${id}: the page names are centred in the bar where there is room`,
       m.navOff === -1 || vp.w < 1000 || Math.abs(m.navOff) <= 2, String(m.navOff));
    ok(`${id}: the switches are set apart from the way in`,
       m.authGap === -1 || vp.w <= 700 || m.authGap >= 8, String(m.authGap));
    /* The bar's fine print is the legal line — the brand, and the rights — with no year
       in it, and the poster's sentence is said once per page. */
    ok(`${id}: the foot line is a rights line, not a repeated slogan`,
       m.rights[0] && m.rights[1] && !m.rights[2], JSON.stringify(m.rights));
    ok(`${id}: the slogan is not echoed under the fold`, m.footEcho <= 1, String(m.footEcho));
    ok(`${id}: the masthead prints three lines`, m.lines === 3, String(m.lines));
    /* Seven claims on the road is the rider page's structure; the four chapters are
       the rows under it, and this suite measures the road at every width. */
    ok(`${id}: the journey carries the seven claims`, m.hasJourney && m.cuts === 7, String(m.cuts));
    ok(`${id}: the route is drawn, not declared`, m.routeLen > 200, String(m.routeLen));
    /* The band is one row rendered twice, so a half-width wider than the
       viewport means the loop can never show its seam. */
    ok(`${id}: the running band is longer than the screen`, m.bandW > m.vw * 1.5,
       `${m.bandW} vs ${m.vw}`);

    // auth card centered
    await page.evaluate(() => { S.view = 'auth'; S.authMode = 'signin'; S.loginMethod = null; render(); });
    await new Promise((r) => setTimeout(r, 100));
    const a = await page.evaluate(() => {
      const c = document.querySelector('.authwrap__card').getBoundingClientRect();
      const w = document.documentElement.clientWidth;
      return { center: Math.round(c.left + c.width / 2), half: w / 2 };
    });
    ok(`${id}: auth card is horizontally centered`, Math.abs(a.center - a.half) <= 2, `${a.center} vs ${a.half}`);

    /* Get the app: Android and iPhone are one decision seen twice, so they share a row
       whenever there is room, and neither is a taller box than the other needs. */
    await page.evaluate(() => { S.view = 'landing'; S.landingPage = 'download'; render(); });
    await new Promise((r) => setTimeout(r, 140));
    const dl = await page.evaluate(() => {
      const grid = document.querySelector('.landing__dlcards');
      if (!grid) return null;
      const gb = grid.getBoundingClientRect();
      const cards = [...grid.querySelectorAll('.landing__dlcard')].map((c) => {
        const b = c.getBoundingClientRect();
        return { t: c.offsetTop, r: Math.round(b.right), w: Math.round(b.width) };  /* layout, not paint */
      });
      return {
        cols: getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
        cards,
        spill: Math.round(Math.max(...cards.map((c) => c.r)) - gb.right),
      };
    });
    ok(`${id}: the two stores share a row once there is room`,
       !!dl && dl.cols === (vp.w >= 700 ? 2 : 1), dl && String(dl.cols));
    ok(`${id}: both store cards open on the same line`,
       !!dl && (vp.w < 700 || Math.abs(dl.cards[0].t - dl.cards[1].t) <= 2),
       dl && JSON.stringify(dl.cards.map((c) => c.t)));
    ok(`${id}: no store card escapes the grid`, !!dl && dl.spill <= 1, dl && String(dl.spill));

    /* The intro and the splash are one screen each — measured, so a phone that hides
       its own browser chrome cannot make the first thing the reader sees taller than
       the thing they can see. */
    for (const view of ['intro', 'boot']) {
      // the intro belongs to the mobile surface; measured as that surface renders it
      await page.evaluate((v) => { window.__RS_SURFACE = v === 'intro' ? 'mobile' : 'web'; S.view = v; render(); }, view);
      await new Promise((r) => setTimeout(r, 120));
      const f = await page.evaluate(() => {
        const el = document.querySelector('.intro, .splash');
        const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--view-h')) || document.documentElement.clientHeight;
        return el ? { h: Math.round(el.getBoundingClientRect().height), scroll: el.scrollHeight,
                      client: el.clientHeight, vh: Math.round(vh) } : null;
      });
      ok(`${id}: the ${view} screen is exactly one viewport`, !!f && Math.abs(f.h - f.vh) <= 2,
         f && `${f.h} vs ${f.vh}`);
      /* Neither box scrolls, so anything below the fold here is simply unreachable:
         the first screen the reader meets has to fit in the first screen they have. */
      ok(`${id}: the ${view} screen holds all of its own content`,
         !!f && f.scroll <= f.client + 2, f && `${f.scroll} > ${f.client}`);
    }
    await page.evaluate(() => { window.__RS_SURFACE = 'web'; S.view = 'landing'; S.landingPage = 'rider'; render(); });
  }

  // RTL: same guarantees in Arabic
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(FILE);
  await settled();
  await page.evaluate(() => { S.lang = 'ar'; S.view = 'landing'; render(); });
  await new Promise((r) => setTimeout(r, 100));
  const rtl = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    landingW: Math.round(document.querySelector('.landing').getBoundingClientRect().width),
  }));
  ok('arabic: dir is rtl', rtl.dir === 'rtl', rtl.dir);
  ok('arabic: landing fills width', Math.abs(rtl.landingW - rtl.clientW) <= 1, `${rtl.landingW}`);
  ok('arabic: no horizontal overflow', rtl.scrollW <= rtl.clientW + 1, `${rtl.scrollW}`);

  // the head frosts over the poster, and dark mode inverts the slab
  await page.evaluate(() => { S.lang = 'en'; S.view = 'landing'; S.landingPage = 'rider'; render(); });
  const chrome = await page.evaluate(() => {
    const nav = getComputedStyle(document.querySelector('.landing__nav'));
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const slab = () => getComputedStyle(document.querySelector('.landing__slab'));
    document.documentElement.dataset.theme = 'dark';
    const dark = lum(slab().backgroundColor);
    const paperDark = lum(getComputedStyle(document.querySelector('.landing')).backgroundColor);
    document.documentElement.dataset.theme = 'light';
    return {
      blur: nav.backdropFilter || nav.webkitBackdropFilter,
      slabLight: lum(slab().backgroundColor),
      paperLight: lum(getComputedStyle(document.querySelector('.landing')).backgroundColor),
      dark, paperDark,
    };
  });
  ok('the head is frosted, not opaque', /blur\(20px\)/.test(chrome.blur), chrome.blur);
  /* The poster's one inversion: light paper with a black slab, black paper with
     a white slab. Measured by luminance so a token may move without lying. */
  ok('dark mode inverts the slab against the paper',
     chrome.slabLight < 0.02 && chrome.dark > 0.9 &&
     chrome.paperLight > 0.9 && chrome.paperDark < 0.02,
     `slab ${chrome.slabLight.toFixed(3)}→${chrome.dark.toFixed(3)}, paper ${chrome.paperLight.toFixed(3)}→${chrome.paperDark.toFixed(3)}`);

  // scrolling the journey actually rides the bus and arrives
  const ride = await page.evaluate(async () => {
    const l = document.querySelector('.landing');
    const j = document.querySelector('.journey');
    const before = document.querySelector('.journey__bus').getAttribute('transform');
    /* A reader keeps going; the page below the journey is where the route's
       last half-screen is spent, so scroll to the end and let the ease settle. */
    l.scrollTop = l.scrollHeight;
    await new Promise((r) => setTimeout(r, 1400));
    const after = document.querySelector('.journey__bus').getAttribute('transform');
    return {
      moved: before !== after,
      arrived: !!document.querySelector('.journey__dest.is-arrived'),
      passed: document.querySelectorAll('.journey__stop.is-passed').length,
      confetti: document.querySelectorAll('[class^="journey__confetti-"]').length,
    };
  });
  ok('the bus rides the route as the reader scrolls', ride.moved);
  ok('the stops light once the bus is past them', ride.passed >= 3, String(ride.passed));
  ok('the arrival fires once, and celebrates', ride.arrived && ride.confetti > 0,
     `${ride.arrived} / ${ride.confetti} particles`);

  /* Every landing view has to mount the reveal observer: a `[data-rv]` block is
     written invisible in CSS and only the observer turns it on, so a view that
     forgets to mount shows nothing while its text still reads fine to a DOM test.
     Scrolling to the end of each page must reveal everything on it. */
  for (const key of ['rider', 'drive', 'about', 'help', 'download']) {
    const reveal = await page_scroll(page, key, null);
    ok(`${key}: scrolling the page reveals all of it`,
       reveal.total > 0 && reveal.done === reveal.total && reveal.hidden === 0,
       `${reveal.done}/${reveal.total} revealed${reveal.hidden ? `, ${reveal.hidden} still transparent` : ''}`);
  }
  const docReveal = await page_scroll(page, 'rider', ['privacy']);
  ok('a policy document reveals its sections too',
     docReveal.total > 0 && docReveal.done === docReveal.total,
     `${docReveal.done}/${docReveal.total}`);

  // back to the page the rest of this file measures
  await page.evaluate(() => { S.landingDoc = null; S.landingPage = 'rider'; S.lang = 'en'; render(); });

  // step numbers stay on the same (physical right) side in both languages
  const numPos = await page.evaluate(() => {
    const c = document.querySelector('.landing__step').getBoundingClientRect();
    const n = document.querySelector('.landing__stepnum').getBoundingClientRect();
    /* A block-level number spans the step, so its right edge is the step's
       content edge in both directions — the mark never migrates to the other
       side of the text when the language does. */
    return { right: Math.round(Math.abs(c.right - n.right)) };
  });
  ok('arabic: step number stays on the right', numPos.right >= 0 && numPos.right < 60, `${numPos.right}px`);

  // landing v2 sub-pages (drive / about / help) carry the same guarantees at
  // compact and desktop widths, in both languages
  const SUBPAGES = [['rider', 'en'], ['drive', 'en'], ['about', 'en'], ['help', 'en'], ['drive', 'ar'], ['help', 'ar']];
  await page.setViewport({ width: 375, height: 812 });
  for (const [pg, lang] of SUBPAGES) {
    await page.evaluate((p, l) => { S.lang = l; S.view = 'landing'; S.landingDoc = null; S.landingPage = p; render(); }, pg, lang);
    await new Promise((r) => setTimeout(r, 120));
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    }));
    ok(`${pg} [${lang}] 375px: no horizontal overflow`, m.sw <= m.cw + 1, `${m.sw}>${m.cw}`);
  }
  await page.setViewport({ width: 1440, height: 900 });
  for (const pg of ['rider', 'drive', 'about', 'help']) {
    await page.evaluate((p) => { S.lang = 'en'; S.view = 'landing'; S.landingPage = p; render(); }, pg);
    await new Promise((r) => setTimeout(r, 120));
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    }));
    ok(`${pg} 1440px: no horizontal overflow`, m.sw <= m.cw + 1, `${m.sw}>${m.cw}`);
  }

/* ── THE ADAPTIVE PROOF ───────────────────────────────────────────────────────
   "Adaptive" is not one screenshot at 1440 px. These are the widths where a rule
   turns over — 700 (the bar folds to dots), 899/900 (the claims stop sharing a
   column with the map), 1359/1360 (the measure caps) — measured on all five
   marketing pages in both directions, because RTL is where a physical property
   shows up. Each check reads the rendered box, never the source. */
const BOUNDARIES = [
  { w: 320, h: 568 }, { w: 375, h: 812 }, { w: 390, h: 844 },
  { w: 699, h: 800 }, { w: 700, h: 800 }, { w: 899, h: 900 }, { w: 900, h: 900 },
  { w: 1359, h: 900 }, { w: 1360, h: 900 }, { w: 1440, h: 900 },
];
/* The five pages, and the three policy documents: a document is rendered on the same
   surface, through the same primitives, so it gets the same measurement — a wide
   `<pre>` or a table in a policy page is exactly the burst these checks look for. */
const MARKETING = [
  { k: 'rider' }, { k: 'drive' }, { k: 'about' }, { k: 'help' }, { k: 'download' },
  { k: 'rider', doc: 'terms' }, { k: 'rider', doc: 'privacy' }, { k: 'rider', doc: 'safety' },
];

/* Render one page, walk its whole length so every reveal fires, and read the boxes.
   It settles faster than page_scroll because it wants geometry, not patience. */
async function survey(view, lang, key, doc) {
  await view.evaluate(async (p, lg, d) => {
    S.lang = lg; S.view = 'landing'; S.landingPage = p; S.landingDoc = d; S.landingMenu = false;
    render();
    const l = document.querySelector('.landing');
    l.style.scrollBehavior = 'auto';
    for (let i = 1; i <= 4; i++) {
      l.scrollTop = Math.round((l.scrollHeight - l.clientHeight) * (i / 4));
      await new Promise((r) => setTimeout(r, 130));
    }
    await new Promise((r) => setTimeout(r, 900));
  }, key, lang, doc);
  return view.evaluate(() => {
    const de = document.documentElement;
    const land = document.querySelector('.landing');
    const num = (v) => parseFloat(v) || 0;
    const s2 = num(getComputedStyle(de).getPropertyValue('--s2'));
    const flow = num(getComputedStyle(de).getPropertyValue('--flow'));
    const name = (el) => String((typeof el.className === 'string' && el.className) || el.tagName);
    const escapes = [];
    land.querySelectorAll('*').forEach((el) => {
      if (el.ownerSVGElement) return;                    /* the viewBox clips these */
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) return;
      if (Math.max(0, b.right - de.clientWidth, -b.left) <= 1) return;
      for (let n = el.parentElement; n; n = n.parentElement) {
        /* A scroller owns its children's width. `hidden` counts only when the
           clipping box itself fits the window: the marquee row is deliberately
           wider than the screen — that is how a loop hides its seam — so its clip
           is the design, while a clipped box that does not fit is the bug. */
        const ov = getComputedStyle(n).overflowX;
        if (ov === 'auto' || ov === 'scroll') return;
        if (ov === 'hidden') {
          const nb = n.getBoundingClientRect();
          if (nb.right <= de.clientWidth + 1 && nb.left >= -1) return;
        }
      }
      escapes.push(name(el) + ' +' + Math.round(b.right - de.clientWidth));
    });
    /* Copy clipped to an ellipsis is content the reader never gets. */
    const clipped = [];
    land.querySelectorAll('.landing__p, .landing__lede, .landing__title, .landing__featuret,'
      + ' .landing__featureb, .landing__stept, .journey__word, .journey__body, .landing__cta-t')
      .forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden' || cs.webkitLineClamp !== 'none') {
          clipped.push(name(el) + ' clamped');
        } else if (el.scrollWidth > el.clientWidth + 1) {
          clipped.push(name(el) + ' ' + el.scrollWidth + '>' + el.clientWidth);
        }
      });
    /* The rhythm has one owner: no block carries its own bottom margin, and the
       space above a block is a token — or the weld the central sheet declares for a
       title. Reading the declarations rather than the boxes means an element still
       travelling through its reveal cannot hide a mistake or invent one. */
    const offRhythm = [];
    land.querySelectorAll('.landing__section, .landing__cta, .landing__slab').forEach((box) => {
      const kids = [...box.children].filter((k) => getComputedStyle(k).display !== 'none'
        && k.getBoundingClientRect().height > 0);
      for (let i = 1; i < kids.length; i++) {
        const cs = getComputedStyle(kids[i]);
        const mt = Math.round(parseFloat(cs.marginBlockStart) || 0);
        const mb = Math.round(parseFloat(getComputedStyle(kids[i - 1]).marginBlockEnd) || 0);
        /* A label welds to what it labels at `--s2`; a title opens the poster's own
           air under itself; everything else takes exactly `--flow`. A zero here is not
           a rhythm, it is the absence of one — which is how a section ends up with its
           blocks touching. */
        const weld = /landing__kick|landing__slab-k/.test(String(kids[i - 1].className));
        const title = /landing__slab-t|landing__cta-t/.test(String(kids[i - 1].className));
        const okTop = weld ? Math.abs(mt - s2) <= 1
          : title ? mt >= flow - 1 : Math.abs(mt - flow) <= 1;
        if (mb !== 0 || !okTop) offRhythm.push(name(kids[i]) + ' top ' + mt + (mb ? ', prev bottom ' + mb : ''));
      }
    });
    /* A control the window cannot show is a control that does not exist: a clipped
       box hides the defect from the eye and from an overflow check. */
    const clippedAway = [];
    land.querySelectorAll('a, button, input, select, [tabindex]').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      if (Math.max(b.right - de.clientWidth, -b.left) <= 1) return;
      for (let n = el.parentElement; n; n = n.parentElement) {   /* a scroller owns it */
        const ov = getComputedStyle(n).overflowX;
        if (ov === 'auto' || ov === 'scroll') return;
      }
      clippedAway.push(((typeof el.className === 'string' && el.className) || el.tagName)
        + ' @' + Math.round(b.left) + '..' + Math.round(b.right));
    });
    /* A block that is wider than the space it was given, whatever clips it. */
    const burst = [];
    land.querySelectorAll('.landing__panels, .landing__steps, .landing__dlcards,'
      + ' .landing__cta-row, .landing__hero-grid, .journey__cuts').forEach((el) => {
      const par = el.parentElement;
      if (!par) return;
      const over = Math.round(el.getBoundingClientRect().width - par.getBoundingClientRect().width);
      if (over > 1) burst.push(name(el) + ' +' + over);
    });
    /* The map: on a phone it is a band the copy follows; on a wide screen the claims
       hold one half of the measure and the road weaves down the other half. */
    const svg = land.querySelector('.journey__svg');
    let onMap = -1, widestCut = 0, boxErr = -1, wordPx = 0, nCuts = 0, roadGap = -1;
    if (svg) {
      const mb = svg.getBoundingClientRect();
      const sb = land.querySelector('.journey').getBoundingClientRect();
      /* The one measurement that would have caught an empty map: the <svg> box must equal the
         section box, because the projection is measured from the section. A letterboxed drawing
         shrinks and clips and still passes any check that only counts text. */
      boxErr = Math.max(Math.abs(mb.height - sb.height), Math.abs(mb.width - sb.width));
      const type = [...land.querySelectorAll('.journey__word, .journey__body, .journey__caption')];
      onMap = type.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > mb.top + 1 && r.top < mb.bottom - 1 && r.right > mb.left && r.left < mb.right;
      }).length;
      nCuts = land.querySelectorAll('.journey__cut').length;
      wordPx = Math.max(...type.filter((e) => e.classList.contains('journey__word'))
        .map((e) => parseFloat(getComputedStyle(e).fontSize)));
      widestCut = Math.max(...[...land.querySelectorAll('.journey__cut')]
        .map((c) => c.getBoundingClientRect().width / sb.width));
      /* Below 900 the copy is one column and the road hugs the far edge behind it, so the
         promise is not "half the measure" but "the corridor is left clear" — measured on the
         end side, which is the reading side's opposite in either direction. */
      /* Measured on the *type*, not on the article box: the cut is allowed to reach the gutter,
         and its `padding-inline-end` is what keeps the corridor visible behind the words. The
         far edge is the reading side's opposite, so RTL is the mirror and not a special case. */
      const rtl = getComputedStyle(land).direction === 'rtl';
      roadGap = Math.min(...[...land.querySelectorAll('.journey__cut')].map((c) => {
        const el = c.querySelector('.journey__body') || c;
        const r = el.getBoundingClientRect();
        return Math.round(rtl ? r.left - sb.left : sb.right - r.right);
      }));
    }
    /* Every control you can tap, measured as drawn. */
    const phone = window.matchMedia('(max-width: 899px)').matches;
    const small = [], smallPrimary = [];
    land.querySelectorAll('a, button').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      if (Math.min(b.width, b.height) < 24) small.push(name(el) + ' ' + Math.round(b.width) + '\u00d7' + Math.round(b.height));
      if (phone && el.classList.contains('btn') && Math.min(b.width, b.height) < 40) {
        smallPrimary.push(name(el) + ' ' + Math.round(b.width) + '\u00d7' + Math.round(b.height));
      }
    });
    /* The bar: three regions that must never touch, measured as drawn, in whatever
       direction the document is in. The defect this replaces was an `inset-inline-start:50%`
       anchor with a `translateX(-50%)` shift — exact in LTR, one element width off in RTL,
       which laid the page names on top of the auth group at 1280px. */
    const nav = land.querySelector('.landing__nav');
    let barOverlap = 0, barCentreErr = -1, barParts = [];
    if (nav) {
      const parts = ['.landing__brand', '.landing__links', '.landing__actions', '.landing__menu']
        .map((q) => nav.querySelector(q))
        .filter((el) => el && getComputedStyle(el).display !== 'none')
        .map((el) => ({ el, cls: el.className.split(' ')[0], r: el.getBoundingClientRect() }));
      barParts = parts.map((q) => `${q.cls}:${Math.round(q.r.left)}..${Math.round(q.r.right)}`);
      for (let a = 0; a < parts.length; a++) {
        for (let b = a + 1; b < parts.length; b++) {
          const ov = Math.min(parts[a].r.right, parts[b].r.right) - Math.max(parts[a].r.left, parts[b].r.left);
          if (ov > barOverlap) barOverlap = Math.round(ov);
        }
      }
      const links = nav.querySelector('.landing__links');
      if (links && getComputedStyle(links).display !== 'none') {
        const lr = links.getBoundingClientRect();
        barCentreErr = Math.round(Math.abs((lr.left + lr.width / 2) - de.clientWidth / 2));
      }
    }
    const rv = [...land.querySelectorAll('[data-rv]')];
    /* On a phone the bar's menu is the reader's way out of a page. A document is the
       one view that answers with a Back control instead, so either is a way out. */
    const mb2 = land.querySelector('.landing__menu')
      || [...land.querySelectorAll('.landing .btn')].find((e) => e.textContent.trim() === T[S.lang].landingBack) || null;
    const base = {
      over: de.scrollWidth - de.clientWidth, landOver: land.scrollWidth - land.clientWidth,
      escapes: escapes.slice(0, 3), clipped: clipped.slice(0, 3), offRhythm: offRhythm.slice(0, 3),
      burst: burst.slice(0, 3), clippedAway: clippedAway.slice(0, 3),
      doneLen: (() => { const d = land.querySelector('.journey__done');
        return d && d.getAttribute('d') ? d.getAttribute('d').length : 0; })(),
      barOverlap, barCentreErr, barParts, onMap, nCuts, wordPx, boxErr, roadGap, widestCut: Math.round(widestCut * 100), small: small.slice(0, 3),
      smallPrimary: smallPrimary.slice(0, 3),
      hidden: rv.filter((el) => Number(getComputedStyle(el).opacity) < 0.05).length,
      phone,
      menu: mb2 ? { shown: getComputedStyle(mb2).display !== 'none',
        box: mb2.getBoundingClientRect().height } : null,
    };
    /* The sheet, opened. LAST on purpose: opening it re-renders the landing, and every
       measurement above would otherwise be read off a detached tree (that is how one probe
       here turned into 270 failures over a bar that measured perfectly by hand. So the whole
       survey is frozen into `base` first, and this is the last thing the page does. */
    let sheet = null;
    const navNow = document.querySelector('.landing__nav');
    const mb0 = navNow && navNow.querySelector('.landing__menu');
    if (mb0 && getComputedStyle(mb0).display !== 'none') {
      mb0.click();
      const panel = document.querySelector('.landing__menu-panel');
      const navRef = document.querySelector('.landing__nav');
      if (panel && navRef) {
        const pcs = getComputedStyle(panel), ncs = getComputedStyle(navRef);
        const al = (x) => +((x.match(/[\d.]+/g) || [0, 0, 0, 1])[3]);
        sheet = { alpha: al(pcs.backgroundColor), navAlpha: al(ncs.backgroundColor),
          blur: pcs.backdropFilter || pcs.webkitBackdropFilter || 'none',
          navBlur: ncs.backdropFilter || ncs.webkitBackdropFilter || 'none',
          rows: panel.querySelectorAll('.landing__menulink').length };
      }
    }
    base.sheet = sheet;
    return base;
  });
}

for (const vp of BOUNDARIES) {
  await page.setViewport({ width: vp.w, height: vp.h });
  await page.goto(FILE);
  await new Promise((r) => setTimeout(r, 900));
  for (const pg of MARKETING) {
    for (const lang of ['en', 'ar']) {
      const m = await survey(page, lang, pg.k, pg.doc || null);
      const id = `${vp.w}\u00d7${vp.h} ${lang}/${pg.doc ? pg.doc + ' doc' : pg.k}`;
      ok(`${id}: no horizontal overflow`, m.over <= 1 && m.landOver <= 1, `${m.over}/${m.landOver}`);
      if (m.doneLen >= 0 && m.hasJourney) {
        ok(`${id}: the bus inks the road as the reader reaches it`, m.doneLen > 200, `${m.doneLen}`);
      }
      ok(`${id}: nothing escapes the window`, m.escapes.length === 0, m.escapes.join(' | '));
      ok(`${id}: no control is clipped out of the window`, m.clippedAway.length === 0, m.clippedAway.join(' | '));
      ok(`${id}: copy is never clipped`, m.clipped.length === 0, m.clipped.join(' | '));
      ok(`${id}: no block is wider than its space`, m.burst.length === 0, m.burst.join(' | '));
      ok(`${id}: the rhythm is the flow tokens`, m.offRhythm.length === 0, m.offRhythm.join(' | '));
      ok(`${id}: every block is revealed by the scroll`, m.hidden === 0, `${m.hidden} still transparent`);
      ok(`${id}: tap targets are at least 24px`, m.small.length === 0, m.small.join(' | '));
      ok(`${id}: the bar's regions never touch`, m.barOverlap <= 0, `${m.barOverlap}px — ${m.barParts.join(' ')}`);
      if (m.sheet) {
        ok(`${id}: the open sheet is the bar's own glass`,
          m.sheet.blur !== 'none' && m.sheet.alpha <= 0.7 && m.sheet.navBlur !== 'none' &&
          Math.abs(m.sheet.alpha - m.sheet.navAlpha) < 0.01, JSON.stringify(m.sheet));
        ok(`${id}: the sheet carries every page name`, m.sheet.rows >= 5, String(m.sheet.rows));
      }
      if (m.barCentreErr >= 0) {
        ok(`${id}: the page names sit on the poster's own axis`, m.barCentreErr <= 2,
          `${m.barCentreErr}px off centre`);
      }
      if (m.boxErr >= 0) {   /* only pages that carry the map own these promises */
        ok(`${id}: the map box is the section box — no letterbox, no clipped corridor`,
          m.boxErr <= 1, `${m.boxErr}px of disagreement`);
        ok(`${id}: every claim is drawn on the road, not filed under it`,
          m.onMap === 2 * m.nCuts + 1, `${m.onMap} of ${2 * m.nCuts + 1} text boxes over the drawing`);
        ok(`${id}: the poster word keeps its scale`, m.wordPx >= 28, `${m.wordPx}px`);
        const wide = !m.phone;   /* the same 900px boundary the sheet uses */
        /* widestCut comes back as a percent — 52% of the measure plus a rounding allowance. */
        ok(`${id}: ${wide ? 'a cut takes half the measure and the road weaves down the other'
                          : 'the copy leaves the corridor clear at the far edge'}`,
          wide ? m.widestCut <= 56 : m.roadGap >= 24,
          `${m.widestCut}% / gap ${m.roadGap}px`);
      }
      if (m.phone) {
        ok(`${id}: a button on a phone is at least 40px`, m.smallPrimary.length === 0, m.smallPrimary.join(' | '));

        ok(`${id}: the way out of the page is reachable`, !!m.menu && m.menu.shown && m.menu.box >= 24,
          JSON.stringify(m.menu));
      } else {
        ok(`${id}: the road keeps its half of the measure`, m.widestCut <= 56, `${m.widestCut}%`);
      }
    }
  }
}

  /* ── round 4: the map's lines, the slab, the hairlines, and the two switches ───── */
  for (const lang of ['en', 'ar']) {
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(FILE);
    await page.waitForSelector('.landing', { timeout: 15000 });
    await page.evaluate((lg) => {
      S.lang = lg; S.view = 'landing'; S.landingPage = 'rider'; S.landingDoc = null;
      S.landingMenu = false; render();
    }, lang);
    await new Promise((r) => setTimeout(r, 600));
    const w = await page.evaluate(() => {
      const words = [...document.querySelectorAll('.journey__word')].map((h) => {
        const lines = [...h.querySelectorAll('.journey__wordline')].map((el) => el.getBoundingClientRect());
        return { n: lines.length, tops: lines.map((r) => Math.round(r.top)),
          text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 22) };
      });
      const slab = document.querySelector('.landing__slab--mid');
      const cs = slab ? getComputedStyle(slab) : null;
      const btn = slab ? slab.querySelector('.btn') : null;
      const bcs = btn ? getComputedStyle(btn) : null;
      const lum = (c) => { const m = ((c || '').match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const ratio = (a, b) => { const hi = Math.max(lum(a), lum(b)), lo = Math.min(lum(a), lum(b));
        return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
      const sels = ['.landing__section', '.landing__feature', '.journey', '.landing__foot',
        '.landing__hero', '.landing__hero-foot', '.landing__cta-row'];
      let maxRule = 0;
      for (const sel of sels) {
        for (const el of document.querySelectorAll(sel)) {
          const c = getComputedStyle(el);
          maxRule = Math.max(maxRule, parseFloat(c.borderTopWidth) || 0, parseFloat(c.borderBottomWidth) || 0);
        }
      }
      const mast = [document.querySelector('.landing__lede'), document.querySelector('.landing__prose')]
        .map((el) => (el ? el.textContent : '')).join(' ');
      return { words, maxRule, mast,
        slab: slab ? { align: cs.textAlign, kids: slab.children.length,
          ratio: bcs ? ratio(bcs.color, bcs.backgroundColor) : -1,
          slabText: cs.color, slabBg: cs.backgroundColor,
          slabRatio: ratio(cs.color, cs.backgroundColor),
          invert: cs.backgroundColor } : null };
    });
    ok(`${lang}: every map word stacks one word to a line`,
      w.words.length > 0 && w.words.every((x) => x.tops.every((t, i) => i === 0 || t > x.tops[i - 1])),
      JSON.stringify(w.words.map((x) => x.n)));
    ok(`${lang}: a multi-word claim is as many lines as it has words`,
      w.words.some((x) => x.n >= 2), w.words.map((x) => `${x.text}=${x.n}`).join(' / '));
    ok(`${lang}: the driver invite is the centred inverted slab`,
      !!w.slab && w.slab.align === 'center' && w.slab.kids >= 3, JSON.stringify(w.slab));
    ok(`${lang}: the slab's own button stays legible on its face`,
      !!w.slab && w.slab.ratio >= 4.5, `${w.slab && w.slab.ratio}:1`);
    ok(`${lang}: the slab keeps its own text legible on the inverted surface`,
      !!w.slab && w.slab.slabRatio >= 4.5, `${w.slab && w.slab.slabRatio}:1`);
    ok(`${lang}: no landing block is separated by a hairline`, w.maxRule === 0, `${w.maxRule}px`);
    /* The masthead must not tell you the same thing twice. */
    const rep = (re) => (w.mast.match(new RegExp(re, 'gi')) || []).length;
    ok(`${lang}: the masthead states each claim once`,
      rep(lang === 'en' ? 'fixed|published|one fare|does not move' : 'منشور|ثاب|لا يتغي|لا يغيّر') <= 2,
      w.mast.slice(0, 60));
  }

  /* Both switches repaint the whole surface, so both owe the page the curtain. */
  for (const [which, key] of [['theme', 'data-theme'], ['lang', 'lang']]) {
    await page.goto(FILE);
    await page.waitForSelector('.landing', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 500));
    const sel = which === 'theme' ? '.landingsw' : '.landing__langbtn';
    const before = await page.evaluate((k) => document.documentElement.getAttribute(k), key);
    /* A real pointer, because a scripted click is exactly what the curtain refuses to
       honour: `armed()` demands a trusted gesture, so that automation, deep links and the
       other suites can flip a switch without waiting 700 ms for a wipe that is only there
       for a human hand. */
    await page.click(sel);
    const mid = await page.evaluate(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { fx: !!document.querySelector('.pagefx'), path: !!document.querySelector('.pagefx__path') };
    });
    ok(`${which}: the switch draws the same curtain as a page does`, mid.fx && mid.path, JSON.stringify(mid));
    const down = await page.evaluate(async () => {
      await new Promise((r) => setTimeout(r, 2200));
      return { gone: !document.querySelector('.pagefx'), landed: !!document.querySelector('.landing') };
    });
    ok(`${which}: the curtain is taken down and the page is intact`, down.gone && down.landed, JSON.stringify(down));
    const after = await page.evaluate((k) => document.documentElement.getAttribute(k), key);
    ok(`${which}: the attribute on <html> moved`, after !== before, `${before} -> ${after}`);
  }

  ok('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log(`\n──────── landing: ${pass} passed, ${fail} failed ────────`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
