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
  assert.match(build, /MOBILE_PUBLIC_ORIGIN/);
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
