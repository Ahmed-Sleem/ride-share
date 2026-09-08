const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const MOBILE = path.join(__dirname, "..");
const LIB = path.join(MOBILE, "scripts", "lib", "boot-assert.js");
const SERVE = path.join(MOBILE, "scripts", "boot-serve.js");
const HARNESS_DOC = path.join(MOBILE, "scripts", "BOOT_HARNESS.md");
const { verdictOf, isVisible, isDone } = require(LIB);

/* ------------------------------------------------------------------ the state machine
   The puppeteer harness can only observe the states a real boot happens to pass through. These tests
   exist for the states it cannot reach on purpose — and for the ordering, which is the whole design:
   "offline beats mounted" is what makes the suite catch a mount that gets discarded (the M3 mutation
   found while building this harness: a rejected-but-valid bundle). */
const seen = (o) => Object.assign({ mounted: false, offline: { present: false }, busyText: "", errors: [] }, o);
const shown = (txt) => ({ present: true, display: "flex", visibility: "visible", opacity: "1", width: 380, height: 120, ...(txt ? {} : {}) });

test("a mounted app with no card is the success state", () => {
  const v = verdictOf(seen({ mounted: true }));
  assert.equal(v.state, "app");
  assert.ok(/replaced the boot page/.test(v.detail));
});

test("the offline card wins over a mount — a discarded bundle is the loudest bug here", () => {
  const v = verdictOf(seen({ mounted: true, offline: shown() }));
  assert.equal(v.state, "offline");
  assert.match(v.detail, /mount is being discarded/);
});

test("an offline card with a reason line reports that reason", () => {
  const withReason = seen({ offline: Object.assign(shown(), {}), busyText: "Updating... Updating..." });
  assert.equal(verdictOf(withReason).state, "offline");
  assert.match(verdictOf(withReason).detail, /Updating/);
  const bare = seen({ offline: shown() });
  assert.match(verdictOf(bare).detail, /no reason printed/, "a card with nothing on it is worth naming: that is a silent stop");
});

test("an uncaught page error is never reported as offline", () => {
  /* A crash that shows the card (because the page threw while handling it) must be labelled a crash.
     Telling the owner "the device was offline" when the bundle has a syntax error is how a real bug
     gets a week of being blamed on the network. */
  const v = verdictOf(seen({ offline: shown(), errors: ["crypto.subtle is undefined"] }));
  assert.equal(v.state, "error");
  assert.match(v.detail, /crypto\.subtle/);
});

test("a busy splash is pending, and a white screen is pending too (the driver sets the deadline)", () => {
  assert.equal(verdictOf(seen({ busyText: "Connecting to api…" })).state, "pending");
  const white = verdictOf(seen({}));
  assert.equal(white.state, "pending");
  assert.match(white.detail, /white screen/);
});

test("only app / offline / error end a run; pending keeps it polling", () => {
  assert.deepEqual(["app", "offline", "error"].map((s) => isDone({ state: s })), [true, true, true]);
  assert.equal(isDone({ state: "pending" }), false);
});

test("isVisible refuses to call a hidden, transparent or zero-size card shown", () => {
  assert.equal(isVisible({ present: true, display: "flex", visibility: "visible", opacity: "1", width: 10, height: 10 }), true);
  for (const k of ["display:none", "visibility:hidden", "opacity:0", "width:0", "height:0"]) {
    const [prop, val] = k.split(":");
    const o = { present: true, display: "flex", visibility: "visible", opacity: "1", width: 10, height: 10 };
    // getComputedStyle gives numbers for opacity/width/height, strings for display/visibility
    o[prop] = ["width", "height", "opacity"].includes(prop) ? Number(val) : val;
    assert.equal(isVisible(o), false, `${k} must not read as shown`);
  }
  assert.equal(isVisible(null), false);
  assert.equal(isVisible({ present: false }), false);
});

test("a missing observation object does not throw (the harness must never crash into a false green)", () => {
  assert.equal(verdictOf(undefined).state, "pending");
  assert.equal(verdictOf({ errors: null }).state, "pending");
  assert.equal(verdictOf({ errors: [null, "", "boom"] }).state, "error", "blank entries are not errors");
});

/* ------------------------------------------------------------------ the front door's guards
   Each guard below is asserted by RUNNING the file with a bad input, in `RS_BOOT_BAKE_ONLY=1` mode
   (every input check, no socket). The alternative — trusting a guard because it is written — is the
   mistake G-129 records: an `if` that nothing has ever satisfied is untested code. */
function bake(env, html) {
  const file = path.join(fs.mkdtempSync(path.join(fs.realpathSync("/tmp"), "rs-bake-")), "index.html");
  fs.writeFileSync(file, html);
  const r = spawnSync(process.execPath, [SERVE], {
    encoding: "utf8",
    env: Object.assign({}, process.env, { RS_BOOT_BAKE_ONLY: "1", RS_BOOT_PAGE: file, RS_BOOT_KEY: file, RS_BOOT_CERT: file }, env),
  });
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
  return r;
}

test("the front door refuses to boot the APP page instead of the boot page", () => {
  const appHtml = '<!doctype html><head></head><body><div id="root"></div><script>/* the OTA app */</script></body>';
  const refused = bake({}, appHtml);
  assert.equal(refused.status, 1, "serving the OTA app as the boot page must stop the run");
  assert.match(refused.stderr, /not the boot page/);
  const allowed = bake({ RS_BOOT_ALLOW_APP_PAGE: "1" }, appHtml);
  assert.equal(allowed.status, 0, "…and the escape hatch exists only so this assertion can prove it");
});

test("the front door re-bakes the origin and refuses a page it cannot rewrite", () => {
  const good = bake({}, '<!doctype html><head></head><body>x</body>');
  assert.equal(good.status, 0);
  const out = JSON.parse(good.stdout);
  assert.match(out.origin, /^https:\/\/boot-live\.test\.invalid:\d+$/);
  assert.equal(out.hasOrigin, true);

  const unknown = bake({}, '<!doctype html><head><script>window.__RS_PUBLIC_ORIGIN = somethingElse;</script></head>');
  assert.equal(unknown.status, 1, "an origin assignment in a shape the harness does not understand is a stop, not a shrug");
  assert.match(unknown.stderr, /does not recognise/);

  const kept = bake({ RS_BOOT_KEEP_ORIGIN: "1", RS_BOOT_PAGE_ORIGIN: "https://elsewhere.test.invalid:1" },
    '<!doctype html><head><script>window.__RS_PUBLIC_ORIGIN="https://elsewhere.test.invalid:1";</script></head>');
  assert.equal(kept.status, 0, "a deliberate mis-bake is allowed so the harness itself can be proven to notice");
});

test("the boot page in the tree still matches what the guards assume", () => {
  /* Not a duplicate of the harness: this fails the moment someone renames `#offline` or `#root`, i.e.
     the day the harness silently stops observing anything. Cheap insurance against a green that means
     nothing, and it is the reason the harness reads ids rather than text. */
  const boot = fs.readFileSync(path.join(MOBILE, "offline.html"), "utf8");
  assert.match(boot, /id="offline"/);
  assert.match(boot, /id="status"/);
  assert.match(boot, /id="why"/);
  const app = fs.readFileSync(path.join(MOBILE, "..", "web", "src", "shell", "app.js"), "utf8");
  assert.match(app, /getElementById\("root"\)|querySelector\("#root"\)|\$\("#root"\)/, "the app must still mount into #root, which is how a boot is judged");
});

test("the entry page Capacitor loads IS the boot page the harness boots", () => {
  /* www/ holds two copies of the same page: `index.html` (what the WebView loads when there is no server.url)
     and `offline.html` (what it loads as a fallback). The harness serves `index.html`, because that is the
     page a phone actually opens. If a build ever wrote them from different sources, the harness would be
     booting a file the installer still carries but nobody loads — a green run about the wrong bytes. */
  const dir = path.join(MOBILE, "www");
  const a = path.join(dir, "index.html"), b = path.join(dir, "offline.html");
  if (!fs.existsSync(a) || !fs.existsSync(b)) return; // build not run in this checkout; nothing to compare
  assert.equal(fs.readFileSync(a, "utf8"), fs.readFileSync(b, "utf8"),
    "www/index.html and www/offline.html must be the same bytes — both are the boot page");
});

test("verify-boot.js runs both scenarios and prints an examinable count", () => {
  const drv = fs.readFileSync(path.join(MOBILE, "scripts", "verify-boot.js"), "utf8");
  assert.ok(drv.includes("boot-assert.js"), "the driver must use the shared verdict, not its own");
  assert.match(drv, /waitUntil: "domcontentloaded"/, "never networkidle: the splash is replaced as soon as the bundle mounts");
  assert.match(drv, /MAP boot-live\.test\.invalid 127\.0\.0\.1/, "`.invalid` hosts are mapped, and `MAP * ~NOTFOUND` must not be used (it swallows them)");
  assert.match(drv, /boot: examined \$\{examined\}/, "a run that examined nothing must be distinguishable from a run that passed");
  const ci = fs.readFileSync(path.join(MOBILE, "..", "..", ".github", "workflows", "ci.yml"), "utf8");
  assert.match(ci, /verify-boot\.js/, "and CI actually runs it — a harness only anyone can run locally is a harness nobody runs");
  assert.match(ci, /name: Boot the installer's first screen/);
});

test("the harness documents its own env switches, because half of them exist to break it on purpose", () => {
  /* The switches are the reason RS_BOOT_ALLOW_APP_PAGE / RS_BOOT_KEEP_ORIGIN are not vulnerabilities:
     they are how the guards get proven. A flag nobody remembers why it exists is a flag someone removes. */
  const doc = fs.readFileSync(HARNESS_DOC, "utf8");
  for (const f of ["RS_BOOT_KEEP_ORIGIN", "RS_BOOT_ALLOW_APP_PAGE", "RS_BOOT_BAKE_ONLY", "RS_BOOT_PORT", "--live-only"]) {
    assert.ok(doc.includes(f), `BOOT_HARNESS.md must name ${f} and say what it is for`);
  }
  const serve = fs.readFileSync(SERVE, "utf8");
  for (const f of ["RS_BOOT_KEEP_ORIGIN", "RS_BOOT_ALLOW_APP_PAGE", "RS_BOOT_BAKE_ONLY"]) {
    assert.ok(serve.includes(f), `${f} is documented but not implemented`);
  }
  assert.ok(fs.existsSync(HARNESS_DOC), "BOOT_HARNESS.md is referenced from CI's failure step; it must exist");
});
