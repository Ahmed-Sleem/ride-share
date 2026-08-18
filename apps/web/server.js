/* Tiny production server for the web app (BUILD_PLAN P0.4, PROJECT=web).
   Serves the single-file build, a health endpoint, and proxies /v1/* to the
   API over the private network (API_INTERNAL_URL). The browser only ever
   talks to this origin — no CORS, no key in the client.

   Env:
     PORT               (default 3000)
     API_INTERNAL_URL   e.g. http://api:3000 (compose) or the Railway private
                        host. When unset, /v1/* returns 503 API_NOT_CONFIGURED.
   Zero dependencies — node:http only. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST = path.join(__dirname, 'dist', 'index.html');
const LEGACY = path.join(__dirname, 'dist-preview.html');
const API_URL = (process.env.API_INTERNAL_URL || '').replace(/\/$/, '');

let doc = null;
function loadDoc() {
  if (!doc) doc = fs.readFileSync(fs.existsSync(DIST) ? DIST : LEGACY, 'utf8');
  return doc;
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function proxy(req, res) {
  if (!API_URL) return json(res, 503, { ok: false, code: 'API_NOT_CONFIGURED' });
  const upstream = new URL(API_URL + req.url.replace(/^\/v1/, ''));
  const headers = { ...req.headers, host: upstream.host };
  const fwd = http.request(
    {
      hostname: upstream.hostname,
      port: upstream.port || 80,
      path: upstream.pathname + upstream.search,
      method: req.method,
      headers,
    },
    (r) => {
      res.writeHead(r.statusCode || 502, r.headers);
      r.pipe(res);
    }
  );
  fwd.on('error', () => json(res, 502, { ok: false, code: 'BAD_GATEWAY' }));
  req.pipe(fwd);
}

function handler(req, res) {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz' || url === '/health') return json(res, 200, { ok: true, service: 'web' });
  // Client-safe configuration: the Maps JS key is public-by-design (restrict
  // it by HTTP referrer in the provider console). Secrets never leave here.
  if (url === '/v1/config') {
    return json(res, 200, {
      maps: { provider: 'google', apiKey: process.env.GOOGLE_MAPS_API_KEY || '' },
    });
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
  http.createServer(handler).listen(port, '0.0.0.0', () => {
    process.stderr.write(`web serving on :${port} (api proxy: ${API_URL || 'DISABLED'})\n`);
  });
}

module.exports = { handler };
