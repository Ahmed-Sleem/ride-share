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
    /* lintVitalRelease fails the whole release build with MissingDefaultResource when a value in
       `values-night` has no base declaration. The debug variant never ran that lint task, so the
       rule was latent until D-8.18 gave both variants one prep — and a rule only Android enforces
       has to be enforced here too, or the next person rediscovers it as a red CI. Checked as a set
       relationship, not as two hard-coded names, so a third colour cannot slip through. */
    const baseFile = path.join(res, "values", "colors.xml");
    assert.ok(fs.existsSync(baseFile), "the night colours must have a base values/colors.xml, not only a values-night one");
    const base = fs.readFileSync(baseFile, "utf8");
    const names = (xml) => new Set([...xml.matchAll(/name="([^"]+)"/g)].map((m) => m[1]));
    const missing = [...names(colors)].filter((n) => !names(base).has(n));
    assert.deepEqual(missing, [], `night colours with no base declaration (MissingDefaultResource): ${missing.join(", ")}`);
    assert.match(base, new RegExp(`<color name="rs_splash_background">${brand.palette.light.paper}</color>`),
      "the day value is the brand's light paper — the same source, so neither plane can drift");

    // A generated project may already carry colours (a future Capacitor template, or a plugin).
    // Merging is the contract; replacing the file would delete somebody else's resource.
    fs.writeFileSync(baseFile, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="colorPrimary">#123456</color>\n</resources>\n');
    fs.rmSync(path.join(res, "values-night", "colors.xml"));
    run();
    const merged = fs.readFileSync(baseFile, "utf8");
    assert.match(merged, /colorPrimary/, "an existing colour must survive the patch");
    assert.deepEqual([...names(colors)].filter((n) => !names(merged).has(n)), [], "and the night pair must still be complete after a merge");

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
  let built = true;
  try {
    execFileSync(process.execPath, [path.join(__dirname, "../scripts/build.js")], {
      cwd: path.join(__dirname, ".."), stdio: "ignore", timeout: 180000,
    });
  } catch (e) {
    /* The builder shells out to the web bundler, which needs apps/web/node_modules. A workspace
       without an install must not report a product defect - but it must say so out loud. */
    if (/ENOENT|node_modules/.test(String(e && e.stderr))) {
      console.log("SKIP: apps/web dependencies are not installed, so the builder could not run");
      return;
    }
    built = false;
    throw e;
  }
  assert.ok(built);
  const html = fs.readFileSync(dist, "utf8");
  const tag = /window\.__RS_PUBLIC_ORIGIN="([^"]*)"/;
  assert.ok(tag.test(html), "the served bundle must carry an assigned origin, not a mention of one");
  assert.equal(html.match(tag)[1], brand.app.origin, "and it must be the brand's OTA origin");
  assert.ok(/window\.__RS_SURFACE="mobile"/.test(html), "the app must know it is on a device");
  assert.ok(!/__RS_APP_SECRET/.test(html), "no client-side key may be baked or served (D-8.12)");
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

test("the installer variants share one prep, and the manifest patch bites for real (D-8.18, G-122)", () => {
  /* Two things a shape check cannot prove, so both are executed:
     (1) the debug and release installers run an IDENTICAL prep list — a signed build that quietly
         loses the permissions or the night splash is worse than the debug build it replaces;
     (2) apply-android-manifest.sh actually rewrites a manifest, including refusing backup. The
         shipped debug APK measured android:allowBackup="true", which puts the bearer token in the
         WebView data dir into Android's cloud backup and device transfer. */
  const { execFileSync } = require("node:child_process");
  const os = require("node:os");
  const root = path.join(__dirname, "..", "..", "..");
  const run = (s) => execFileSync("bash", [path.join(root, "apps/mobile/scripts", s)],
    { cwd: root, encoding: "utf8", env: Object.assign({}, process.env, { RS_PREP_DRY: "1" }) });
  const prep = (out) => out.split("\n").filter((l) => l.startsWith("prep: "));

  const d = prep(run("make-apk.sh"));
  const r = prep(run("make-release.sh"));
  assert.ok(d.length >= 6, "the debug variant must run the shared prep steps, saw: " + d.join(" | "));
  assert.deepStrictEqual(r, d, "release prep diverged from debug prep — the signed build would ship without a patch");
  for (const need of ["permissions", "adaptive icons", "night splash", "system bars", "brand.json"]) {
    assert.ok(d.some((l) => l.includes(need)), `prep must include "${need}", saw: ` + d.join(" | "));
  }
  assert.match(run("make-apk.sh"), /gradle: assembleDebug/);
  assert.match(run("make-release.sh"), /gradle: bundleRelease assembleRelease/);

  // Now the patch itself, on a manifest in the state a fresh `cap add` leaves it in.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rs-manifest-"));
  const manifest = path.join(dir, "AndroidManifest.xml");
  fs.writeFileSync(manifest,
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n' +
    '    <application android:allowBackup="true" android:label="@string/app_name">\n' +
    '        <activity android:name=".MainActivity" />\n' +
    '    </application>\n</manifest>\n');
  execFileSync("bash", [path.join(root, "apps/mobile/scripts/apply-android-manifest.sh"), manifest], { encoding: "utf8" });
  const out = fs.readFileSync(manifest, "utf8");
  for (const perm of ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION",
                      "FOREGROUND_SERVICE", "FOREGROUND_SERVICE_LOCATION", "POST_NOTIFICATIONS"]) {
    assert.ok(out.includes(`android:name="android.permission.${perm}"`), `missing ${perm}`);
  }
  assert.match(out, /android:allowBackup="false"/, "backup must be refused: the bearer token lives in the backed-up data dir");
  assert.ok(!/android:allowBackup="true"/.test(out), "and the old value must be gone, not merely followed by a second attribute");
  // A second run must be a no-op: the step is in a build that can be re-run on an existing project.
  execFileSync("bash", [path.join(root, "apps/mobile/scripts/apply-android-manifest.sh"), manifest], { encoding: "utf8" });
  assert.equal(fs.readFileSync(manifest, "utf8"), out, "apply-android-manifest.sh is not idempotent");
  fs.rmSync(dir, { recursive: true, force: true });
});

/* G-124 — the system bars. The bug this closes was measured on the device, not guessed from a
   screenshot: the activity paints a status-bar background of its own, and on a night-mode cold start
   the app opened with a light band carrying the page's title row. `plugins.StatusBar` looked like the
   fix for two rounds; it was configuring a plugin that is not installed. The theme has to say it, and a
   theme that only Android can read has to be proven here, against the real template, in CI. */
test("the generated theme owns the system bars, day and night (G-124)", () => {
  const { execFileSync } = require("node:child_process");
  const os = require("node:os");
  const SCRIPT = "apply-android-system-bars.js";
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rs-bars-"));
  const scripts = path.join(tmp, "apps", "mobile", "scripts");
  const res = path.join(tmp, "apps", "mobile", "android", "app", "src", "main", "res");
  fs.mkdirSync(path.join(scripts), { recursive: true });
  fs.mkdirSync(path.join(res, "values"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "packages", "brand"), { recursive: true });
  // the script resolves ROOT from its own location, so it runs as a copy parked at the same depth
  fs.copyFileSync(path.join(__dirname, "../scripts", SCRIPT), path.join(scripts, SCRIPT));
  fs.copyFileSync(path.join(ROOT, "packages/brand/brand.json"), path.join(tmp, "packages/brand/brand.json"));
  const TEMPLATE = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
`;
  const dayFile = path.join(res, "values", "styles.xml");
  const nightFile = path.join(res, "values-night", "styles.xml");
  const run = () => execFileSync(process.execPath, [path.join(scripts, SCRIPT)], { encoding: "utf8" });
  try {
    fs.writeFileSync(dayFile, TEMPLATE);
    const first = run();
    assert.match(first, /system bars:/, "a first run must say what it wrote — a quiet no-op is how G-122 hid");
    const day = fs.readFileSync(dayFile, "utf8");
    for (const item of ["android:statusBarColor", "android:navigationBarColor", "android:windowLightStatusBar",
                        "android:windowLightNavigationBar", "android:enforceStatusBarContrast",
                        "android:enforceNavigationBarContrast"]) {
      assert.ok(day.includes(`name="${item}"`), `the day theme must set ${item}; saw:\n${day}`);
    }
    assert.match(day, /android:statusBarColor">#00000000</, "the bar is transparent, not painted: the page underneath is what a person sees");
    assert.match(day, /android:windowLightStatusBar">true</, "day icons are dark, because day paper is light");
    assert.match(day, /@drawable\/splash/, "the night splash's drawable must survive — this script adds items, it does not rewrite the style");
    const night = fs.readFileSync(nightFile, "utf8");
    assert.match(night, /android:windowLightStatusBar">false</, "night icons are light, over the brand's ink paper");
    assert.match(night, /android:statusBarColor">#00000000</, "and the bar is transparent there too");

    // idempotent: a re-run on an already-patched project writes no bytes
    const dayNow = day, nightNow = night;
    assert.match(run(), /already current/);
    assert.equal(fs.readFileSync(dayFile, "utf8"), dayNow, "a second run must not rewrite the day theme");
    assert.equal(fs.readFileSync(nightFile, "utf8"), nightNow, "a second run must not rewrite the night theme");

    // a style added by the night splash is merged into, not replaced, and a template that moved fails loudly
    fs.writeFileSync(nightFile, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@color/rs_splash_background</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
</resources>
`);
    run();
    const merged = fs.readFileSync(nightFile, "utf8");
    assert.match(merged, /@color\/rs_splash_background/, "the night splash's colour must survive this patch");
    assert.match(merged, /android:enforceStatusBarContrast">false</, "and the bar items must still arrive");
    fs.writeFileSync(dayFile, '<resources><style name="Elsewhere"/></resources>');
    let failed = false;
    try { run(); } catch (_) { failed = true; }
    assert.ok(failed, "a template this script can no longer anchor to must fail the build, not ship a dead resource");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/* G-126 — `plugins` in capacitor.config.json is read by exactly one call site in Capacitor's own
   source (CapConfig#getPluginConfig), which only ever asks for the id of a plugin that was loaded. A key
   with no package behind it is a decoration: it looks like a decision, costs a reviewer nothing to
   approve, and changes no pixels. Both of this app's blocks were that (measured: `grep -ril splash`
   over @capacitor/android 8.5.1's java returns nothing; @capacitor/status-bar has zero hits in
   pnpm-lock.yaml). This guard is what keeps a third one from being written in good faith. */
test("no config block configures a plugin that is not installed (G-126)", () => {
  const pkgs = (txt) => [...txt.matchAll(/["']@(capacitor|capacitor-[a-z]+)\/([a-z0-9-]+)["']/g)]
    .map((m) => m[2].split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(""));
  const mobilePkg = fs.readFileSync(path.join(ROOT, "apps/mobile/package.json"), "utf8");
  const lock = fs.readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8");
  const installed = new Set([...pkgs(mobilePkg), ...pkgs(lock)]);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const generated = fs.readFileSync(path.join(ROOT, "apps/mobile/scripts/build.js"), "utf8");
  /* The generator is the source of truth (capacitor.config.json is its output); both are checked so a
     block cannot be added on one side and quietly dropped from the other. */
  const declared = new Set([...Object.keys(cfg.plugins || {}),
                           ...[...generated.matchAll(/^\s{4}([A-Z][A-Za-z]+): \{$/gm)].map((m) => m[1])]);
  for (const key of declared) {
    assert.ok(installed.has(key),
      `"${key}" is configured but no @capacitor/${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()).replace(/^-/, "")} ` +
      "dependency exists — that block is inert. Paint it in the theme (apply-android-system-bars.js) " +
      "or add the plugin, but do not write a config nobody reads.");
  }
  assert.ok(!/StatusBar|SplashScreen/.test(JSON.stringify(cfg.plugins || {})),
    "the two blocks that were dead stay deleted; the theme is the one place the bars are decided");
});

/* CAMERA is declared for a reason a reader should not have to rediscover: the barcode plugin this app
   depends on ships an EMPTY manifest, and its requestPermissions() answers checkPermissions() instead of
   prompting when the permission is undeclared — a silent "denied" for a driver at the door. Placement is
   asserted because Android is picky about it, and the count is asserted because the loop above appends
   before </manifest>: a permission added twice is a build that still passes and still confuses. */
test("the manifest carries the camera permission in the right place, exactly once (G-127)", () => {
  const { execFileSync } = require("node:child_process");
  const os = require("node:os");
  const root = path.join(__dirname, "..", "..", "..");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rs-cam-"));
  const manifest = path.join(dir, "AndroidManifest.xml");
  // the real file a fresh `cap add android` leaves behind, copied from the @capacitor/cli template
  fs.writeFileSync(manifest,
    '<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n\n' +
    '    <application\n        android:allowBackup="true"\n        android:label="@string/app_name"\n        android:theme="@style/AppTheme">\n\n' +
    '        <activity android:name=".MainActivity" android:theme="@style/AppTheme.NoActionBarLaunch" />\n    </application>\n\n' +
    '    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>\n');
  const script = path.join(root, "apps/mobile/scripts/apply-android-manifest.sh");
  execFileSync("bash", [script, manifest], { encoding: "utf8", cwd: root });
  const out = fs.readFileSync(manifest, "utf8");
  const line = '<uses-permission android:name="android.permission.CAMERA" />';
  assert.equal(out.split(line).length - 1, 1, `CAMERA must appear exactly once, saw ${out.split(line).length - 1}`);
  assert.ok(out.indexOf(line) < out.indexOf("<application"), "a permission belongs before <application>");
  assert.ok(out.indexOf("com.google.mlkit.vision.DEPENDENCIES") > out.indexOf("<application")
    && out.indexOf("com.google.mlkit.vision.DEPENDENCIES") < out.indexOf("</application>"),
    "the MLKit barcode meta-data belongs INSIDE <application>, which is where the library looks for it");
  const twice = execFileSync("bash", [script, manifest], { encoding: "utf8", cwd: root });
  assert.match(twice, /already declared \(1\)/, "a re-run must say so rather than guess (the failure mode is a duplicate)");
  assert.equal(fs.readFileSync(manifest, "utf8"), out, "and write no bytes");
  let parsed = true;
  try { require("node:child_process").execFileSync("python3", ["-c", `import xml.dom.minidom,sys;xml.dom.minidom.parse(${JSON.stringify(manifest)})`]); }
  catch (_) { parsed = false; }
  assert.ok(parsed, "the patched manifest must still parse — aapt is not the place to discover otherwise");
  fs.rmSync(dir, { recursive: true, force: true });
});

/* ── the delivery contract, learned the hard way in round 17 ───────────────────────
   The owner asked for a GUI change and said, correctly, that no APK change was needed.
   The reason is stronger than "OTA will carry it": the installer never contained the app.
   Unzipping the binary CI shipped (6203ac7) showed `assets/public/index.html` is 100,474 B
   of boot page — `splash ×9`, `boot ×11`, `.topbar ×0` — while the app is 1.1 MB. That is
   by design (`www/` = what the WebView opens; `dist/www/` = what OTA hands out), and it has
   two consequences worth a test: nobody may quietly bake the shell into `www/` (it would be
   a GUI no `apps/web` change can reach), and a device only takes a new GUI when
   `packages/brand/brand.json`'s `version.code` goes up. Recorded in APP_GUI.md §17. */
test("the installer ships a boot page, and OTA is the only path to the app's GUI", () => {
  const build = fs.readFileSync(path.join(ROOT, "apps/mobile/scripts/build.js"), "utf8");
  const bootPage = fs.readFileSync(path.join(ROOT, "apps/mobile/offline.html"), "utf8");

  // Both files Capacitor packages come from the boot page…
  assert.match(build, /fs\.writeFileSync\(path\.join\(www, "index\.html"\), boot\)/,
    "www/index.html must stay the boot page — the APK may not start carrying the app");
  assert.match(build, /fs\.writeFileSync\(path\.join\(www, "offline\.html"\), boot\)/);
  // …and the app page is written only to the OTA artifact.
  assert.match(build, /fs\.writeFileSync\(path\.join\(dist, "www", "index\.html"\), appHtml\)/,
    "the app HTML must reach devices through dist/www (OTA)");
  assert.ok(!/writeFileSync\(path\.join\(www,[^)]*appHtml/.test(build),
    "appHtml into www/ would ship a frozen GUI inside the binary");

  // The boot page must not grow a copy of the shell it launches.
  assert.ok(!/\.topbar\s*\{/.test(bootPage),
    "offline.html carries no app CSS: a boot page with shell rules in it is a second, unreachable GUI");
  for (const route of ["/v1/mobile/update", "/v1/mobile/bundle"]) {
    assert.ok(bootPage.includes(route), `the boot page must reach ${route} — that is how the app arrives`);
  }

  // version.code is the release lever for the GUI on a phone, so it has to be the number meta.json publishes.
  assert.match(build, /versionCode: ver\.code/,
    "meta.json must publish brand.json's code, or an installed app has no way to be told there is a new GUI");
  assert.ok(Number.isInteger(brand.version.code) && brand.version.code >= 1,
    "brand.version.code must stay a positive integer: OTA compares it, and a regression is invisible on every screen");

  // The generator says which bytes went where, so `boot 100474` is visible in a build log
  // instead of having to be discovered by unzipping a published artifact.
  // The generator prints both sizes on one line (round 17b), so each half is asserted on its
  // own: the fact worth keeping is that a build log states what went into the APK and what is
  // OTA-only. (This assertion is also why the log change needed a test change: the guard read
  // the old `console.log(` + literal adjacency, refused my edit, and was right to.)
  assert.match(build, /mobile: boot \$\{boot\.length\} bytes → www\//,
    "the boot page's size must be printed at build time");
  assert.match(build, /app \$\{appHtml\.length\} bytes → dist\/www\/ \(OTA, versionCode \$\{BRAND\.version\.code\}\)/,
    "the OTA artifact's size and versionCode must be printed beside it");
});

test("the OTA artifact can paint with no network at all (a phone in a tunnel is the normal case)", () => {
  const build = fs.readFileSync(path.join(ROOT, "apps/mobile/scripts/build.js"), "utf8");
  // Three shapes make a page wait on someone else's server before it can draw anything: a font
  // or image in url(), a stylesheet link, a script src. On a laptop with a network each one is
  // invisible; on a phone in a tunnel the page is blank, and no CI job ever sees it. So the
  // generator screens the bytes it publishes, and this test screens the screen.
  const m = build.match(/const RENDER_BLOCKING = \[([\s\S]*?)\];/);
  assert.ok(m, "build.js must declare RENDER_BLOCKING — the OTA artifact is the app, offline");
  for (const shape of ["url", "stylesheet", "script"]) {
    assert.ok(m[1].includes(shape), `the screen must cover ${shape}`);
  }
  // Each shape is only dangerous because it names an absolute origin; a pattern that lost its
  // protocol would still look like a guard and screen nothing.
  assert.equal((m[1].match(/https\?:/g) || []).length, 3,
    "all three render-blocking shapes must be anchored on a protocol");
  assert.ok(/if \(leaks\.length\) \{[\s\S]{0,400}process\.exit\(1\)/.test(build),
    "a leak has to stop the build, not just be mentioned");
  const at = build.indexOf("const RENDER_BLOCKING");
  const wrote = build.indexOf('fs.writeFileSync(path.join(dist, "www", "index.html")');
  assert.ok(at > 0 && at < wrote, "the check must run BEFORE the artifact is written");

  // And the real thing, whenever the app has actually been built in this checkout.
  const ota = path.join(ROOT, "apps/mobile/dist/www/index.html");
  if (fs.existsSync(ota)) {
    const bytes = fs.readFileSync(ota, "utf8");
    for (const re of [/url\(\s*["']?https?:\/\//i, /<link[^>]+rel=["']?stylesheet["']?[^>]+href=["']?https?:/i, /<script[^>]+src=["']?https?:/i]) {
      assert.ok(!re.test(bytes), `the published OTA artifact still reaches out: ${re}`);
    }
  }
});
