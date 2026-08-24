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
});

test("www/index.html is the web bundle", () => {
  const html = fs.readFileSync(path.join(__dirname, "../www/index.html"), "utf8");
  assert.match(html, /<html/i);
  assert.ok(html.length > 1000);
});
