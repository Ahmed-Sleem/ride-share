/* ══════════════════════════════════════════════════════════════════════
   Accessibility scan (P0.7, GUI_STANDARD §11/§18.7). Runs axe-core over
   representative screens in both languages and fails on serious or
   critical violations. Automated checks do not replace manual testing —
   but a screen that axe flags as serious must not ship without review.
   ══════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const axe = require('axe-core');

const FILE = path.join(__dirname, '..', 'dist-preview.html');
const SRC = fs.readFileSync(FILE, 'utf8');

// One representative screen per role, both languages.
const CASES = [
  ['rider', 'home'], ['rider', 'profile'],
  ['driver', 'duty'], ['driver', 'journey'],
  ['ops', 'queue'], ['manager', 'board'], ['support', 'lookup'],
];

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  → ' + detail : '')); }
};

(async () => {
  const dom = new JSDOM(SRC, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://app.test/' });
  const w = dom.window;
  // inject axe into the page context
  w.eval(axe.source);

  for (const lang of ['en', 'ar']) {
    for (const [role, page] of CASES) {
      w.S.role = role; w.S.page = page; w.S.stack = []; w.S.sheet = null; w.S.opsView = null;
      w.S.lang = lang; w.S.theme = 'light';
      w.render();
      let results;
      try {
        results = await w.axe.run(w.document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
      } catch (e) {
        ok(`${role}/${page} [${lang}] axe ran`, false, String(e));
        continue;
      }
      const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      ok(`${role}/${page} [${lang}] no serious/critical a11y violations`,
        serious.length === 0,
        serious.slice(0, 3).map((v) => `${v.id} (${v.impact}) x${v.nodes.length}`).join(', '));
    }
  }

  console.log(`\n──────── a11y: ${pass} passed, ${fail} failed ────────`);
  process.exit(fail === 0 ? 0 : 1);
})();
