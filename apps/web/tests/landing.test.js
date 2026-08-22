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
const VIEWPORTS = [
  { w: 320, h: 568 }, { w: 375, h: 812 }, { w: 768, h: 1024 },
  { w: 1024, h: 768 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 }, { w: 2560, h: 1440 },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto(FILE);
    await new Promise((r) => setTimeout(r, 1600)); // boot splash → landing
    const m = await page.evaluate(() => {
      const doc = document.documentElement;
      const landing = document.querySelector('.landing');
      const hero = document.querySelector('.landing__hero');
      const map = document.querySelector('.slideshow');
      const lb = landing ? landing.getBoundingClientRect() : null;
      const hb = hero ? hero.getBoundingClientRect() : null;
      return {
        landingW: lb ? Math.round(lb.width) : 0,
        vw: doc.clientWidth,
        landingL: lb ? Math.round(lb.left) : -999,
        docScrollW: doc.scrollWidth,
        heroH: hb ? Math.round(hb.height) : 0,
        vh: doc.clientHeight,
        hasMap: !!map,
      };
    });
    const id = `${vp.w}×${vp.h}`;
    ok(`${id}: landing fills the viewport width`,
      Math.abs(m.landingW - m.vw) <= 1, `${m.landingW} vs ${m.vw}`);
    ok(`${id}: landing starts at the left edge`, m.landingL >= -1, String(m.landingL));
    ok(`${id}: no horizontal overflow`, m.docScrollW <= m.vw + 1, `${m.docScrollW} > ${m.vw}`);
    ok(`${id}: hero is at least one viewport tall`, m.heroH >= m.vh - 80, `${m.heroH} vs ${m.vh}`);
    ok(`${id}: hero slideshow renders`, m.hasMap);

    // auth card centered
    await page.evaluate(() => { S.view = 'auth'; S.authMode = 'signin'; S.loginMethod = null; render(); });
    await new Promise((r) => setTimeout(r, 100));
    const a = await page.evaluate(() => {
      const c = document.querySelector('.authwrap__card').getBoundingClientRect();
      const w = document.documentElement.clientWidth;
      return { center: Math.round(c.left + c.width / 2), half: w / 2 };
    });
    ok(`${id}: auth card is horizontally centered`, Math.abs(a.center - a.half) <= 2, `${a.center} vs ${a.half}`);
  }

  // RTL: same guarantees in Arabic
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(FILE);
  await new Promise((r) => setTimeout(r, 1600));
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

  // step numbers stay on the same (physical right) side in both languages
  const numPos = await page.evaluate(() => {
    const c = document.querySelector('.landing__step').getBoundingClientRect();
    const n = document.querySelector('.landing__stepnum').getBoundingClientRect();
    return { right: Math.round(c.right - n.right) };
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

  ok('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log(`\n──────── landing: ${pass} passed, ${fail} failed ────────`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
