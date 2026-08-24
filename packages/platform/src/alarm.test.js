const { test } = require("node:test");
const assert = require("node:assert/strict");

const mem = {};
globalThis.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
};
delete require.cache[require.resolve("./alarm.js")];
const { LocalAlarm } = require("./alarm.js");

test("alarm fires from cache with no network (DEC-147)", async () => {
  let fired = null;
  LocalAlarm.schedule(
    { id: "b1", at: Date.now() + 20, title: "Leave now", body: "Gate 2" },
    { onFire: (i) => { fired = i; } },
  );
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(fired && fired.id, "b1");
  assert.equal(fired.title, "Leave now");
});

test("permission is irrelevant — schedule still persists", () => {
  const r = LocalAlarm.schedule({ id: "b2", at: Date.now() + 60_000, title: "Leave now" });
  assert.equal(r.ok, true);
  assert.ok(LocalAlarm.list().some((a) => a.id === "b2"));
  LocalAlarm.cancel("b2");
  assert.equal(LocalAlarm.list().some((a) => a.id === "b2"), false);
});
