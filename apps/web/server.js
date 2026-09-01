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

/* The brand file is the one place the product's name is written down; the bundle reads
   it at build time, and the server reads it so the file name it offers the browser is
   the same name the install card promises. */
const BRAND = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'packages', 'brand', 'brand.json'), 'utf8'));
  } catch {
    return {};
  }
})();
const DL_PATH = (BRAND.download && BRAND.download.path) || '/download/android';
const DL_APK = (BRAND.download && BRAND.download.apk) || 'app.apk';

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

function withSurface(html, surface) {
  if (!html || html.includes('__RS_SURFACE')) return html;
  const tag = '<script>window.__RS_SURFACE=' + JSON.stringify(surface) + ';</script>';
  if (html.includes('<head>')) return html.replace('<head>', '<head>' + tag);
  return tag + html;
}

let doc = null;
function loadDoc() {
  if (!doc) {
    const raw = fs.readFileSync(fs.existsSync(DIST) ? DIST : LEGACY, 'utf8');
    doc = withSurface(raw, 'web');
  }
  return doc;
}

function corsHeaders(req) {
  const origin = String((req.headers && req.headers.origin) || '');
  const ok = !origin ||
    origin === 'https://localhost' ||
    origin === 'http://localhost' ||
    origin.startsWith('capacitor://') ||
    origin.startsWith('ionic://') ||
    origin.startsWith('https://localhost');
  if (!ok) return {};
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-max-age': '86400',
  };
}

function json(res, status, body, req) {
  if (res.headersSent) return;
  res.writeHead(status, { 'content-type': 'application/json', ...corsHeaders(req || {}) });
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
  if (!API_URL) return json(res, 503, { ok: false, code: 'API_NOT_CONFIGURED' }, req);
  let upstream;
  try {
    upstream = new URL(API_URL + req.url.replace(/^\/v1/, ''));
  } catch {
    return json(res, 502, { ok: false, code: 'BAD_GATEWAY' }, req);
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
      res.writeHead(r.statusCode || 502, { ...r.headers, ...corsHeaders(req) });
      r.pipe(res);
    }
  );
  fwd.on('timeout', () => { fwd.destroy(); json(res, 504, { ok: false, code: 'API_TIMEOUT' }, req); });
  fwd.on('error', () => json(res, 502, { ok: false, code: 'BAD_GATEWAY' }, req));
  req.on('error', () => fwd.destroy());
  req.pipe(fwd);
}

async function handler(req, res) {
  const url = (req.url || '/').split('?')[0];
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }
  if (url === '/healthz' || url === '/health') {
    const api = await apiHealth();
    return json(res, 200, { ok: true, service: 'web', api }, req);
  }
  // Client-safe configuration: the Maps JS key is public-by-design (restrict
  // it by HTTP referrer in the provider console). Secrets never leave here.
  if (url === '/v1/config') {
    // Client-safe config. The provider is 'osm' (free, no key — DEC-198) by
    // default; set MAP_PROVIDER=google + GOOGLE_MAPS_API_KEY to use Google.
    return json(res, 200, {
      maps: { provider: process.env.MAP_PROVIDER || 'osm', apiKey: process.env.GOOGLE_MAPS_API_KEY || '' },
      surface: 'web',
    }, req);
  }
  // `<slug>.apk` is the extensionless alias; the `.apk` form keeps older links and
  // already-printed QR codes working.
  if (url === DL_PATH || url === DL_PATH + '.apk') {
    const candidates = [
      process.env.ANDROID_APK_PATH,
      path.join(__dirname, 'downloads', 'android.apk'),
      path.join(__dirname, '..', '..', 'uploads', 'app-debug.apk'),
    ].filter(Boolean);
    const file = candidates.find((p) => { try { return fs.existsSync(p) && fs.statSync(p).isFile(); } catch { return false; } });
    if (!file) return json(res, 404, { ok: false, code: 'APK_NOT_STAGED', hint: `Serve the installer from apps/web/downloads/${DL_APK} or set ANDROID_APK_PATH` }, req);
    res.writeHead(200, {
      'content-type': 'application/vnd.android.package-archive',
      'content-disposition': `attachment; filename="${DL_APK}"`,
      'cache-control': 'no-store',
    });
    return fs.createReadStream(file).pipe(res);
  }
  if (url.startsWith('/v1/')) return proxy(req, res);
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    return res.end(loadDoc());
  }
  return json(res, 404, { ok: false, code: 'NOT_FOUND' }, req);
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  http.createServer((req, res) => {
    handler(req, res).catch((e) => { console.error('[web] handler error', e); json(res, 500, { ok: false, code: 'INTERNAL' }, req); });
  }).listen(port, '0.0.0.0', () => {
    process.stderr.write(`web serving on :${port} (api proxy: ${API_URL || 'DISABLED'})\n`);
  });
}

module.exports = { handler };
