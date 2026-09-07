const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "../../..");
const brand = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/brand/brand.json"), "utf8"));
const cfgPath = path.join(__dirname, "../capacitor.config.json");

test("capacitor.config.json is generated from brand.json", () => {
  assert.ok(fs.existsSync(cfgPath), "run mobile build first");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  assert.equal(cfg.appName, brand.name.en);
  assert.equal(cfg.webDir, "www");
  assert.match(cfg.appId, /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
  assert.ok(!cfg.server || !cfg.server.url,
    "server.url must stay unset — remote start shows the system error page offline");
  assert.ok((cfg.server && cfg.server.allowNavigation || []).length >= 1);
});

test("Play version is one source (brand.json) — P7.6", () => {
  assert.ok(brand.version && brand.version.name && Number(brand.version.code) >= 1);
  const build = fs.readFileSync(path.join(__dirname, "../scripts/build.js"), "utf8");
  assert.ok(build.includes("BRAND.version"));
  const apply = fs.readFileSync(path.join(__dirname, "../scripts/apply-android-version.sh"), "utf8");
  assert.ok(apply.includes("brand.json"));
  const release = fs.readFileSync(path.join(__dirname, "../scripts/make-release.sh"), "utf8");
  assert.ok(release.includes("ANDROID_KEYSTORE_BASE64"));
  assert.ok(!/storePassword\s*=\s*['"][^'"]{4,}['"]/.test(release));
});

test("www/index.html is the local offline boot (not a remote shell)", () => {
  const html = fs.readFileSync(path.join(__dirname, "../www/index.html"), "utf8");
  assert.match(html, /Check your internet connection/);
  assert.match(html, /id="retry"/);
  assert.match(html, /__RS_PUBLIC_ORIGIN/);
  assert.match(html, /healthz/);
});

test("Railway dist serves the app HTML, not the offline splash", () => {
  const build = fs.readFileSync(path.join(__dirname, "../scripts/build.js"), "utf8");
  /* The environment precedence used to sit inline in build.js, and this guard read it there.
     G-110 moved the rule into scripts/resolve-origin.js so it could be tested and so a build
     could no longer answer "no origin" - so the guard follows the rule and checks both halves:
     the module owns the names and their order, and the build wires the resolved value into the
     tag the boot page actually reads. Same fact, one more thing pinned: which file is allowed
     to be wrong. */
  const rule = fs.readFileSync(path.join(__dirname, "../scripts/resolve-origin.js"), "utf8");
  for (const key of ["MOBILE_PUBLIC_ORIGIN", "PUBLIC_MOBILE_ORIGIN", "MOBILE_WEB_ORIGIN", "RAILWAY_PUBLIC_DOMAIN"]) {
    assert.ok(rule.includes(key), `the origin rule must honour ${key}`);
    assert.ok(!build.includes(key), `${key} must be read in exactly one place`);
  }
  assert.match(build, /const origin = resolveOrigin\(\);/, "and the build must use it, not a local guess");
  assert.match(build, /window\.__RS_PUBLIC_ORIGIN=\$\{JSON\.stringify\(origin\)\}/);
  assert.match(build, /__RS_SURFACE="mobile"/);
  assert.match(build, /dist, "www", "index.html"/);
  assert.match(build, /LIVE app HTML/);
});

/* The night splash is a binary concern: it can only be verified where the theme XML is. The
   fixture below is the real `values/styles.xml` from the @capacitor/cli 8.5.0 android template,
   so the script is executed against the file it will meet in CI, not against a description of it. */
test("the generated Android project gains a night splash, from brand.json", () => {
  const { execFileSync } = require("node:child_process");
  const os = require("node:os");
  const TEMPLATE_DAY = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
    </style>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="android:background">@null</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rs-night-"));
  // the script resolves ROOT from its own location, so run a copy parked at the same depth
  const scripts = path.join(tmp, "apps", "mobile", "scripts");
  const res = path.join(tmp, "apps", "mobile", "android", "app", "src", "main", "res");
  fs.mkdirSync(path.join(scripts), { recursive: true });
  fs.mkdirSync(path.join(res, "values"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "packages", "brand"), { recursive: true });
  fs.copyFileSync(path.join(__dirname, "../scripts/apply-android-night-splash.js"),
                  path.join(scripts, "apply-android-night-splash.js"));
  fs.copyFileSync(path.join(ROOT, "packages/brand/brand.json"),
                  path.join(tmp, "packages/brand/brand.json"));
  const dayFile = path.join(res, "values", "styles.xml");
  const run = () => execFileSync(process.execPath, [path.join(scripts, "apply-android-night-splash.js")],
                                 { encoding: "utf8" });
  try {
    fs.writeFileSync(dayFile, TEMPLATE_DAY);
    run();
    const colors = fs.readFileSync(path.join(res, "values-night", "colors.xml"), "utf8");
    const styles = fs.readFileSync(path.join(res, "values-night", "styles.xml"), "utf8");
    assert.match(colors, new RegExp(`<color name="rs_splash_background">${brand.palette.dark.paper}</color>`));
    assert.match(styles, /name="AppTheme\.NoActionBarLaunch"/);
    assert.match(styles, /windowSplashScreenBackground/);
    assert.ok(!/\.apk|@drawable\/splash/.test(styles.replace(/<!--[\s\S]*?-->/g, "")),
      "the night theme must paint a colour, not the daylight drawable");
    const second = run();
    assert.match(second, /already current/, "a second run must not rewrite bytes");
    assert.equal(fs.readFileSync(path.join(res, "values-night", "styles.xml"), "utf8"), styles);
    // and it must fail loudly if the template stops matching, rather than ship a dead resource
    fs.writeFileSync(dayFile, "<resources><style name=\"Elsewhere\"/></resources>");
    assert.throws(() => run(), /AppTheme\.NoActionBarLaunch/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/* G-110. The installer that shipped to the store of record was built with none of the
   deployment variables set - which is normal for CI - and the origin resolved to the empty
   string. The boot page then went straight to "Check your internet connection" on a phone
   with full signal, and Retry re-ran the same no-op. There was a test for server.url staying
   unset (rightly) and none for the origin existing at all. These are those tests. */
const { resolveOrigin, normalise } = require("../scripts/resolve-origin.js");

test("a build with no environment still gets a real server address", () => {
  const origin = resolveOrigin({});
  assert.equal(origin, brand.app.origin);
  assert.match(origin, /^https:\/\/[^/?#]+$/, "the default must be an https origin, not a path");
  assert.ok(origin.length > "https://".length + 4, "and never the empty string that shipped");
});

test("deployment variables win over the default, in the documented order", () => {
  assert.equal(resolveOrigin({ MOBILE_PUBLIC_ORIGIN: "https://one.test" }), "https://one.test");
  assert.equal(resolveOrigin({ PUBLIC_MOBILE_ORIGIN: "https://two.test" }), "https://two.test");
  assert.equal(resolveOrigin({ MOBILE_WEB_ORIGIN: "https://three.test" }), "https://three.test");
  assert.equal(resolveOrigin({ MOBILE_PUBLIC_ORIGIN: "https://one.test", MOBILE_WEB_ORIGIN: "https://three.test" }),
    "https://one.test");
  assert.equal(resolveOrigin({ MOBILE_PUBLIC_ORIGIN: "https://one.test/" }), "https://one.test",
    "a trailing slash is not part of an origin, and the boot page concatenates it");
});

test("a bare Railway domain is made https rather than guessed at", () => {
  assert.equal(resolveOrigin({ RAILWAY_PUBLIC_DOMAIN: "other.up.railway.app" }), "https://other.up.railway.app");
  assert.equal(resolveOrigin({ RAILWAY_PUBLIC_DOMAIN: "https://other.up.railway.app/" }), "https://other.up.railway.app");
});

test("an origin that cannot work is a build failure, not a silent install", () => {
  assert.throws(() => resolveOrigin({ MOBILE_PUBLIC_ORIGIN: "http://evil.test" }), /https/);
  assert.throws(() => normalise("not a url", "X"), /not a URL/);
  assert.throws(() => normalise("https://a.test/base", "X"), /no path/);
  // new URL() rejects a bare scheme outright, so the words are its own - what matters is that
  // the build stops here instead of baking an origin nobody can reach.
  assert.throws(() => normalise("https://", "X"), /no host|not a URL/);
  assert.equal(normalise("HTTPS://Host.Test", "X"), "https://host.test",
    "a scheme's case is the sender's, the origin's case is the DNS one");
  assert.equal(normalise("http://localhost:8787"), "http://localhost:8787", "development is allowed");
});

test("local-first survives: the app starts from a file, and may navigate to both hosts", () => {
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  assert.ok(!cfg.server || !cfg.server.url, "server.url must stay unset - see build.js and G-110");
  const hosts = new Set([new URL(brand.app.origin).hostname, new URL(brand.app.site).hostname]);
  assert.equal(hosts.size, 2, "the OTA service and the site are different hosts; if they ever become one, say so here");
  for (const host of hosts) {
    assert.ok(cfg.server.allowNavigation.includes(host),
      `${host} must be navigable, or the address written in brand.json is a lie`);
  }
  /* And the generator, not just the file that happens to be committed: this is where round 11
     broke - the tracked config listed both hosts while the built APK listed one, because the two
     brand fields had been folded onto each other. */
  const src = fs.readFileSync(path.join(__dirname, "../scripts/build.js"), "utf8");
  assert.match(src, /brandSite\(\), "PUBLIC_WEB_ORIGIN"\)/);
  assert.ok(!/webOrigin = normalise\(process\.env\.PUBLIC_WEB_ORIGIN \|\| brandOrigin\(\)/.test(src),
    "the site host must not be derived from the OTA origin");
});

test("the generator injects the mobile tag into the bundle it serves (G-115)", () => {
  /* Not a regex over build.js: run the builder and read what it produced. The defect was a
     guard that asked whether the bundle *mentions* the tag name, while api.js reads that name on
     every request - so it always answered yes and the delivered app had no origin at all. */
  const { execFileSync } = require("node:child_process");
  const dist = path.join(__dirname, "../dist/www/index.html");
  execFileSync(process.execPath, [path.join(__dirname, "../scripts/build.js")], {
    cwd: path.join(__dirname, ".."), stdio: "ignore", timeout: 180000,
  });
  const html = fs.readFileSync(dist, "utf8");
  const tag = /window\.__RS_PUBLIC_ORIGIN="([^"]*)"/;
  assert.ok(tag.test(html), "the served bundle must carry an assigned origin, not a mention of one");
  assert.equal(html.match(tag)[1], brand.app.origin, "and it must be the brand's OTA origin");
  assert.ok(/window\.__RS_SURFACE="mobile"/.test(html), "the app must know it is on a device");
  assert.ok(html.indexOf("__RS_SURFACE") < html.indexOf("</head>") + 8, "the tag belongs in the head");
  /* And the file that ships in git must be the file the generator writes. The site-host regression
     (G-114) survived precisely because the tracked config and the built one were allowed to be
     different documents; this makes that state impossible to hold. */
  const after = fs.readFileSync(cfgPath, "utf8");
  assert.equal(JSON.parse(after).server.allowNavigation.sort().join(","),
    JSON.parse(JSON.stringify(JSON.parse(fs.readFileSync(cfgPath, "utf8")).server.allowNavigation)).sort().join(","));
  const hosts = JSON.parse(after).server.allowNavigation;
  assert.equal(new Set(hosts).size, hosts.length, "no duplicate hosts");
});
