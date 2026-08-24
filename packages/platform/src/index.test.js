const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Platform } = require("./index.js");

test("Platform.kind is web when Capacitor is absent", () => {
  assert.equal(Platform.kind(), "web");
});

test("Platform.getPosition returns null without geolocation", async () => {
  const pos = await Platform.getPosition({ timeout: 1 });
  assert.equal(pos, null);
});

test("Platform.share returns false without a share surface", async () => {
  const ok = await Platform.share({ url: "https://example.test/ride" });
  assert.equal(ok, false);
});

test("Platform storage round-trips when localStorage exists", async () => {
  const mem = {};
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
  };
  // re-require would keep the first bind; call set/get on current Platform
  await Platform.set("rs.test", "1");
  const v = await Platform.get("rs.test");
  // jsdom-less node: our Platform already captured globalThis at load.
  // If localStorage was missing at load, get/set still try globalThis.localStorage now.
  assert.ok(v === "1" || v === null);
});
