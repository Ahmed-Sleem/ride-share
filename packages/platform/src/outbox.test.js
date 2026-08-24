const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createOutbox, memoryPersist } = require("./outbox.js");

function netErr() {
  return Object.assign(new Error("error.network"), { code: "NETWORK", messageKey: "error.network" });
}
function conflictErr(key) {
  return Object.assign(new Error(key), { code: "409", messageKey: key });
}

test("twenty offline actions replay once, in order", async () => {
  const persist = memoryPersist();
  const sent = [];
  const box = createOutbox({ persist, send: async (item) => { sent.push(item.seq); } });
  for (let i = 0; i < 20; i++) await box.enqueue({ kind: "scan", method: "POST", path: "/bookings/scan", body: { n: i } });
  await box.flush();
  assert.deepEqual(sent, Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(box.pending().length, 0);
});

test("killing mid-queue loses nothing (persist is the source of truth)", async () => {
  const persist = memoryPersist();
  let failAt = 3;
  const send = async (item) => {
    if (item.seq === failAt) throw netErr();
  };
  const a = createOutbox({ persist, send });
  for (let i = 0; i < 5; i++) await a.enqueue({ kind: "scan", path: "/bookings/scan", body: { i } });
  const stop = await a.flush();
  assert.equal(stop.stopped, "network");
  assert.equal(a.pending().length, 3); // 3,4,5 remain (1-2 delivered)

  const b = createOutbox({ persist, send: async () => {} });
  await b.hydrate();
  assert.equal(b.pending().length, 3);
  assert.deepEqual(b.pending().map((i) => i.seq), [3, 4, 5]);
});

test("replaying the whole queue twice produces one send per action", async () => {
  const persist = memoryPersist();
  const sent = [];
  const send = async (item) => { sent.push(item.id); };
  const box = createOutbox({ persist, send });
  for (let i = 0; i < 5; i++) await box.enqueue({ kind: "arrive", path: "/j/arrive", body: {} });
  await box.flush();
  await box.flush();
  assert.equal(sent.length, 5);
  assert.equal(new Set(sent).size, 5);
});

test("a server conflict is surfaced, not discarded or retried as success", async () => {
  const persist = memoryPersist();
  const box = createOutbox({
    persist,
    send: async (item) => { if (item.body.bad) throw conflictErr("bookings.already_boarded"); },
  });
  await box.enqueue({ kind: "scan", path: "/bookings/scan", body: { bad: true } });
  await box.enqueue({ kind: "scan", path: "/bookings/scan", body: { bad: false } });
  await box.flush();
  const rev = box.review();
  assert.equal(rev.length, 1);
  assert.equal(rev[0].status, "conflict");
  assert.equal(rev[0].lastError, "bookings.already_boarded");
  assert.equal(box.pending().length, 0);
});

test("an action older than MaxOutboxAge is held for review, not dropped or sent", async () => {
  let t = 1_000_000;
  const persist = memoryPersist();
  const sent = [];
  const box = createOutbox({
    persist,
    now: () => t,
    maxAgeMs: 1000,
    send: async (item) => { sent.push(item.id); },
  });
  await box.enqueue({ kind: "start", path: "/j/start", body: {} });
  t += 5000;
  await box.flush();
  assert.equal(sent.length, 0);
  assert.equal(box.review().length, 1);
  assert.equal(box.review()[0].status, "stale");
});

test("pending position updates for the same path coalesce (explicit rule, not row LWW)", async () => {
  const persist = memoryPersist();
  const sent = [];
  const box = createOutbox({ persist, send: async (item) => { sent.push(item.body); } });
  await box.enqueue({ kind: "position", path: "/journeys/j1/position", body: { lat: 1, lng: 1 } });
  await box.enqueue({ kind: "position", path: "/journeys/j1/position", body: { lat: 2, lng: 2 } });
  await box.enqueue({ kind: "scan", path: "/bookings/scan", body: { code: "1" } });
  assert.equal(box.pending().length, 2);
  await box.flush();
  assert.deepEqual(sent[0], { lat: 2, lng: 2 });
  assert.equal(sent.length, 2);
});

test("network failure does not let a later action overtake", async () => {
  const persist = memoryPersist();
  const sent = [];
  const box = createOutbox({
    persist,
    send: async (item) => {
      if (item.kind === "start") throw netErr();
      sent.push(item.kind);
    },
  });
  await box.enqueue({ kind: "start", path: "/j/start", body: {} });
  await box.enqueue({ kind: "scan", path: "/bookings/scan", body: {} });
  await box.flush();
  assert.deepEqual(sent, []);
  assert.equal(box.pending().map((i) => i.kind).join(","), "start,scan");
});
