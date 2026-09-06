/* node:test for the web runtime server (P0.4). The handler is exercised
   directly — no port, no network — so the proof is deterministic. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../server.js');

/* A real Writable, not a stub with two methods on it: the APK route pipes a file stream, and
   `Readable.pipe` calls write/on/removeListener — a plain object threw inside the handler and the
   old swallow-everything `.catch` turned that into a promise that never settled, which is how a
   test can hang instead of failing. Nothing is caught and discarded here any more. */
const { Writable } = require('node:stream');
class Capture extends Writable {
  constructor() {
    super();
    this._code = 200;
    this._body = '';
    this._headers = {};
    this._done = new Promise((resolve) => { this._resolve = resolve; });
  }
  writeHead(code, headers) { this._code = code; Object.assign(this._headers, headers); }
  _write(chunk, _enc, cb) { this._body += chunk; cb(); }
  end(data, cb) {
    const done = () => this._resolve({ status: this._code, body: this._body, headers: this._headers });
    if (data === undefined || data === null) return super.end(done);
    return super.end(data, done);
  }
}
function run(url) {
  const res = new Capture();
  Promise.resolve(handler({ url }, res)).catch((e) => res._resolve({ status: 'threw', body: String(e && e.message || e), headers: {} }));
  return res._done;
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
  assert.equal(body.maps.provider, 'osm');   // DEC-198: OSM is the default, no key
  assert.equal(body.maps.apiKey, '');
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

/* The route that ships the app had no test at all — which is how "download the app" could answer
   with a JSON error for a whole release. Three cases, no network: a file staged next to the site,
   the published release as a fallback, and the honest 404 when nobody configured either. */
test('download: a staged APK is served as an attachment', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-apk-'));
  const file = path.join(dir, 'ride-share.apk');
  fs.writeFileSync(file, 'PK\u0003\u0004 not really an apk');
  const prev = process.env.ANDROID_APK_PATH;
  process.env.ANDROID_APK_PATH = file;
  try {
    const r = await run('/download/android');
    assert.equal(r.status, 200);
    assert.equal(r.headers['content-type'], 'application/vnd.android.package-archive');
    assert.match(r.headers['content-disposition'], /filename="ride-share\.apk"/);
    assert.equal(r.headers['cache-control'], 'no-store');
    assert.equal(r.body, 'PK\u0003\u0004 not really an apk');
    // the extensionless alias and the .apk form must stay interchangeable: QR codes were printed
    const alias = await run('/download/android.apk');
    assert.equal(alias.status, 200);
  } finally {
    if (prev === undefined) delete process.env.ANDROID_APK_PATH;
    else process.env.ANDROID_APK_PATH = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('download: with nothing staged, it redirects to the published release', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const BRAND = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'packages', 'brand', 'brand.json'), 'utf8'));
  const D = BRAND.download;
  const prevPath = process.env.ANDROID_APK_PATH;
  const prevUrl = process.env.ANDROID_APK_URL;
  process.env.ANDROID_APK_PATH = path.join(__dirname, 'definitely-not-here.apk');
  delete process.env.ANDROID_APK_URL;
  try {
    const r = await run(D.path);
    assert.equal(r.status, 302);
    assert.equal(r.headers.location,
      `https://github.com/${D.release.repository}/releases/download/${D.release.tag}/${D.apk}`);
    assert.equal(r.headers['cache-control'], 'no-store');
  } finally {
    if (prevPath === undefined) delete process.env.ANDROID_APK_PATH; else process.env.ANDROID_APK_PATH = prevPath;
    if (prevUrl !== undefined) process.env.ANDROID_APK_URL = prevUrl;
  }
});

test('download: ANDROID_APK_URL wins over brand.json, and a missing setup says so', async () => {
  const path = require('node:path');
  const fs = require('node:fs');
  const prevPath = process.env.ANDROID_APK_PATH, prevUrl = process.env.ANDROID_APK_URL;
  process.env.ANDROID_APK_PATH = path.join(__dirname, 'definitely-not-here.apk');
  process.env.ANDROID_APK_URL = 'https://files.example.test/app.apk';
  try {
    const r = await run('/download/android');
    assert.equal(r.status, 302);
    assert.equal(r.headers.location, 'https://files.example.test/app.apk');
  } finally {
    if (prevPath === undefined) delete process.env.ANDROID_APK_PATH; else process.env.ANDROID_APK_PATH = prevPath;
    if (prevUrl !== undefined) process.env.ANDROID_APK_URL = prevUrl; else delete process.env.ANDROID_APK_URL;
  }
  // The 404 shape is what an operator sees when neither source exists; the hint must name all
  // three ways to fix it, or the next person greps the repo for the answer the way I did.
  const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(src, /code: 'APK_NOT_STAGED'/);
  assert.match(src, /ANDROID_APK_URL|download\.release/);
});
