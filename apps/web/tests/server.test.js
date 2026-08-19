/* node:test for the web runtime server (P0.4). The handler is exercised
   directly — no port, no network — so the proof is deterministic. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../server.js');

function run(url) {
  return new Promise((resolve) => {
    const res = {
      _code: 200,
      _body: '',
      _headers: {},
      writeHead(code, headers) { this._code = code; Object.assign(this._headers, headers); },
      end(data) { this._body = data; resolve({ status: this._code, body: this._body, headers: this._headers }); },
    };
    Promise.resolve(handler({ url }, res)).catch(() => {});
  });
}

test('health endpoint reports ok + api status', async () => {
  const r = await run('/healthz');
  assert.equal(r.status, 200);
  const body = JSON.parse(r.body);
  assert.equal(body.ok, true);
  assert.equal(body.service, 'web');
  assert.equal(body.api, 'unconfigured'); // no API_INTERNAL_URL in the test env
});

test('config endpoint returns client-safe maps config', async () => {
  const r = await run('/v1/config');
  assert.equal(r.status, 200);
  const body = JSON.parse(r.body);
  assert.deepEqual(body.maps, { provider: 'google', apiKey: '' });
});

test('proxy without a configured API is a clean 503 (never a crash)', async () => {
  const r = await run('/v1/auth/login/identify');
  assert.equal(r.status, 503);
  assert.equal(JSON.parse(r.body).code, 'API_NOT_CONFIGURED');
});

test('root serves the built document', async () => {
  const r = await run('/');
  assert.equal(r.status, 200);
  assert.match(r.body, /<div id="root">/);
  assert.match(r.headers['content-type'], /text\/html/);
});

test('unknown path is a 404 with the standard shape', async () => {
  const r = await run('/nope');
  assert.equal(r.status, 404);
  assert.equal(JSON.parse(r.body).code, 'NOT_FOUND');
});
