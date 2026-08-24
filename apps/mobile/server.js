/* Railway / compose entry for the mobile service (P7.1).
   The APK is a Capacitor wrap of the same HTML; this process exists so the
   Railway "mobile" component is a real, healthy service — it serves that
   same HTML and proxies /v1/* exactly like apps/web/server.js (one proxy
   contract). Removing Capacitor leaves this working as a second web origin. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const DIST = path.join(__dirname, "dist", "www", "index.html");
const WWW = path.join(__dirname, "www", "index.html");

const RAW = (process.env.API_INTERNAL_URL || "").trim().replace(/\/$/, "");
let API_URL = null;
if (RAW) {
  try { new URL(RAW); API_URL = RAW; }
  catch { console.error(`[mobile] invalid API_INTERNAL_URL (treated as unset): ${RAW}`); }
}

let doc = null;
function loadDoc() {
  if (!doc) {
    const p = fs.existsSync(DIST) ? DIST : WWW;
    if (!fs.existsSync(p)) throw new Error("mobile HTML missing — run pnpm --filter @ride-share/mobile build");
    doc = fs.readFileSync(p, "utf8");
  }
  return doc;
}

function json(res, status, body) {
  if (res.headersSent) return;
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function apiHealth(timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!API_URL) return resolve("unconfigured");
    const req = http.get(API_URL + "/healthz", (r) => {
      resolve(r.statusCode === 200 ? "up" : "down");
      r.resume();
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve("unreachable"); });
    req.on("error", () => resolve("unreachable"));
  });
}

function proxy(req, res) {
  if (!API_URL) return json(res, 503, { ok: false, code: "API_NOT_CONFIGURED" });
  let upstream;
  try { upstream = new URL(API_URL + req.url.replace(/^\/v1/, "")); }
  catch { return json(res, 502, { ok: false, code: "BAD_GATEWAY" }); }
  const headers = { ...req.headers, host: upstream.host };
  const fwd = http.request(
    {
      hostname: upstream.hostname,
      port: upstream.port || 80,
      path: upstream.pathname + upstream.search,
      method: req.method,
      headers,
      timeout: 10000,
    },
    (r) => {
      res.writeHead(r.statusCode || 502, r.headers);
      r.pipe(res);
    }
  );
  fwd.on("timeout", () => { fwd.destroy(); json(res, 504, { ok: false, code: "API_TIMEOUT" }); });
  fwd.on("error", () => json(res, 502, { ok: false, code: "BAD_GATEWAY" }));
  req.on("error", () => fwd.destroy());
  req.pipe(fwd);
}

async function handler(req, res) {
  const url = (req.url || "/").split("?")[0];
  if (url === "/healthz" || url === "/health") {
    const api = await apiHealth();
    return json(res, 200, { ok: true, service: "mobile", api, wrap: "capacitor" });
  }
  if (url === "/v1/config") {
    return json(res, 200, {
      maps: { provider: process.env.MAP_PROVIDER || "osm", apiKey: process.env.GOOGLE_MAPS_API_KEY || "" },
      platform: "mobile",
    });
  }
  if (url.startsWith("/v1/")) return proxy(req, res);
  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
    return res.end(loadDoc());
  }
  return json(res, 404, { ok: false, code: "NOT_FOUND" });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  http.createServer((req, res) => {
    handler(req, res).catch((e) => {
      console.error("[mobile] handler error", e);
      json(res, 500, { ok: false, code: "INTERNAL" });
    });
  }).listen(port, "0.0.0.0", () => {
    process.stderr.write(`mobile serving on :${port} (api proxy: ${API_URL || "DISABLED"})\n`);
  });
}

module.exports = { handler };
