/* Tiny production server for the web app (BUILD_PLAN P0.4, PROJECT=web).
   Serves the single-file build, a health endpoint, and proxies /v1/* to the
   API over the private network (API_INTERNAL_URL). The browser only ever
   talks to this origin — no CORS, no key in the client.

   Env:
     PORT               (default 3000)
     API_INTERNAL_URL   e.g. http://api:3000 (compose) or the Railway private
                        host. When unset or malformed, /v1/* returns a clean
                        503 API_NOT_CONFIGURED (never a crash).
     GOOGLE_MAPS_API_KEY (optional) — client-safe key via /v1/config.

   Resilience: the proxy has a timeout and never throws; /healthz reports the
   API's reachability so a broken link is visible in one GET. Zero deps. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST = path.join(__dirname, 'dist', 'index.html');
const LEGACY = path.join(__dirname, 'dist-preview.html');

/* Validate ONCE at startup — a malformed value (e.g. an unresolved Railway
   reference variable) is logged and treated as unconfigured, so a request can
   never crash the process later. */
const RAW = (process.env.API_INTERNAL_URL || '').trim().replace(/\/$/, '');
let API_URL = null;
if (RAW) {
  try {
    new URL(RAW); // throws on illegal hostnames (e.g. '${{...}}')
    API_URL = RAW;
  } catch {
    console.error(`[web] invalid API_INTERNAL_URL (treated as unset): ${RAW}`);
  }
}

let doc = null;
function loadDoc() {
  if (!doc) doc = fs.readFileSync(fs.existsSync(DIST) ? DIST : LEGACY, 'utf8');
  return doc;
}

function json(res, status, body) {
  if (res.headersSent) return;
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/* Reachability of the API, reported in the health payload so a broken link is
   diagnosable from one GET. Short, bounded timeout — never blocks. */
function apiHealth(timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!API_URL) return resolve('unconfigured');
    const req = http.get(API_URL + '/healthz', (r) => {
      resolve(r.statusCode === 200 ? 'up' : 'down');
      r.resume();
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve('unreachable'); });
    req.on('error', () => resolve('unreachable'));
  });
}

function proxy(req, res) {
  if (!API_URL) return json(res, 503, { ok: false, code: 'API_NOT_CONFIGURED' });
  let upstream;
  try {
    upstream = new URL(API_URL + req.url.replace(/^\/v1/, ''));
  } catch {
    return json(res, 502, { ok: false, code: 'BAD_GATEWAY' });
  }
  const headers = { ...req.headers, host: upstream.host };
  const fwd = http.request(
    {
      hostname: upstream.hostname,
      port: upstream.port || 80,
      path: upstream.pathname + upstream.search,
      method: req.method,
      headers,
      timeout: 10000, // fail fast instead of hanging the whole request
    },
    (r) => {
      res.writeHead(r.statusCode || 502, r.headers);
      r.pipe(res);
    }
  );
  fwd.on('timeout', () => { fwd.destroy(); json(res, 504, { ok: false, code: 'API_TIMEOUT' }); });
  fwd.on('error', () => json(res, 502, { ok: false, code: 'BAD_GATEWAY' }));
  req.on('error', () => fwd.destroy());
  req.pipe(fwd);
}

async function handler(req, res) {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz' || url === '/health') {
    const api = await apiHealth();
    return json(res, 200, { ok: true, service: 'web', api });
  }
  // Client-safe configuration: the Maps JS key is public-by-design (restrict
  // it by HTTP referrer in the provider console). Secrets never leave here.
  if (url === '/v1/config') {
    // Client-safe config. The provider is 'osm' (free, no key — DEC-198) by
    // default; set MAP_PROVIDER=google + GOOGLE_MAPS_API_KEY to use Google.
    return json(res, 200, {
      maps: { provider: process.env.MAP_PROVIDER || 'osm', apiKey: process.env.GOOGLE_MAPS_API_KEY || '' },
    });
  }
  if (url === '/download/android.apk' || url === '/download/android') {
    const candidates = [
      process.env.ANDROID_APK_PATH,
      path.join(__dirname, 'downloads', 'android.apk'),
      path.join(__dirname, '..', '..', 'uploads', 'app-debug.apk'),
    ].filter(Boolean);
    const file = candidates.find((p) => { try { return fs.existsSync(p) && fs.statSync(p).isFile(); } catch { return false; } });
    if (!file) return json(res, 404, { ok: false, code: 'APK_NOT_STAGED', hint: 'Place the debug APK at apps/web/downloads/android.apk or set ANDROID_APK_PATH' });
    res.writeHead(200, {
      'content-type': 'application/vnd.android.package-archive',
      'content-disposition': 'attachment; filename="ride-share.apk"',
      'cache-control': 'no-store',
    });
    return fs.createReadStream(file).pipe(res);
  }
  if (url.startsWith('/v1/')) return proxy(req, res);
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    return res.end(loadDoc());
  }
  return json(res, 404, { ok: false, code: 'NOT_FOUND' });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  http.createServer((req, res) => {
    handler(req, res).catch((e) => { console.error('[web] handler error', e); json(res, 500, { ok: false, code: 'INTERNAL' }); });
  }).listen(port, '0.0.0.0', () => {
    process.stderr.write(`web serving on :${port} (api proxy: ${API_URL || 'DISABLED'})\n`);
  });
}

module.exports = { handler };
