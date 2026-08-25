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
