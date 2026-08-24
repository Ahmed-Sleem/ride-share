const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createTrack } = require("./track.js");

test("fixes batch and flush once — not one request per fix", async () => {
  let unwatch = null;
  let emit = null;
  const sent = [];
  const track = createTrack({
    watch: (cb) => { emit = cb; unwatch = () => { emit = null; }; return () => { unwatch(); }; },
    setInterval: () => 1,
    clearInterval: () => {},
  });
  track.start("j1", async (_id, points) => { sent.push(points); });
  for (let i = 0; i < 8; i++) emit({ lat: 31 + i / 1000, lng: 29.9, at: i });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].length, 8);
  assert.equal(track.pending(), 0);
  track.stop();
});

test("stop with no journey does not send (off-shift)", async () => {
  const sent = [];
  const track = createTrack({
    watch: () => () => {},
    setInterval: () => 1,
    clearInterval: () => {},
  });
  await track.stop();
  assert.equal(sent.length, 0);
  assert.equal(track.activeId(), null);
});

test("stop after start flushes leftover and clears the session", async () => {
  let emit = null;
  const sent = [];
  const track = createTrack({
    watch: (cb) => { emit = cb; return () => { emit = null; }; },
    setInterval: () => 1,
    clearInterval: () => {},
  });
  track.start("j9", async (id, points) => { sent.push({ id, n: points.length }); });
  emit({ lat: 31.2, lng: 29.9, at: 1 });
  emit({ lat: 31.21, lng: 29.91, at: 2 });
  await track.stop();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].id, "j9");
  assert.equal(sent[0].n, 2);
  assert.equal(track.activeId(), null);
  emit && emit({ lat: 1, lng: 1, at: 3 });
  assert.equal(track.pending(), 0);
});
