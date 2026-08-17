/* Tiny production server for the web app (BUILD_PLAN P0.4, PROJECT=web).
   Serves the single-file build and a health endpoint. Zero dependencies —
   node:http only. The Docker runner runs `node server.js` after `build.js`
   has written dist/index.html; outside a container it falls back to the
   checked-in dist-preview.html. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST = path.join(__dirname, 'dist', 'index.html');
const LEGACY = path.join(__dirname, 'dist-preview.html');
let doc = null;
function loadDoc() {
  if (!doc) doc = fs.readFileSync(fs.existsSync(DIST) ? DIST : LEGACY, 'utf8');
  return doc;
}

function handler(req, res) {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz' || url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'web' }));
    return;
  }
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    res.end(loadDoc());
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: false, code: 'NOT_FOUND' }));
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  http.createServer(handler).listen(port, '0.0.0.0', () => {
    process.stderr.write(`web serving on :${port}\n`);
  });
}

module.exports = { handler };
