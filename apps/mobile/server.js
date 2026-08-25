/* Railway `mobile` = the APP API (not a website).
   Browsers hitting `/` get JSON 403. The APK proves itself with HMAC
   (X-RS-App-Id, X-RS-Ts, X-RS-Sign) before any other route. Then this
   process proxies `/v1/*` to the private Nest API (same OTP/auth) and
   serves the signed UI bundle for OTA. Play Integrity is the next gate
   (owner Google Cloud) — a secret in the APK can be extracted. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DIST = path.join(__dirname, "dist", "www", "index.html");
const WWW = path.join(__dirname, "www", "index.html");
const META = path.join(__dirname, "dist", "meta.json");
const APP_ID = (process.env.MOBILE_APP_ID || "eg.rideshare.app").trim();
const SECRET = (process.env.MOBILE_APP_SECRET || "").trim();
const SKEW_MS = 5 * 60 * 1000;

const RAW = (process.env.API_INTERNAL_URL || "").trim().replace(/\/$/, "");
let API_URL = null;
if (RAW) {
  try { new URL(RAW); API_URL = RAW; }
  catch { console.error(`[mobile] invalid API_INTERNAL_URL (treated as unset): ${RAW}`); }
}

function json(res, status, body) {
  if (res.headersSent) return;
  res.writeHead(status, { "content-type": "application/json", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(body));
}

function signAppRequest(method, urlPath, ts, secret, appId) {
  const msg = appId + "\n" + String(ts) + "\n" + method + "\n" + urlPath;
  return crypto.createHmac("sha256", secret).update(msg).digest("hex");
}

function appProof(req) {
  if (!SECRET || SECRET.length < 32) {
    return { ok: false, status: 503, code: "APP_GATE_NOT_CONFIGURED" };
  }
  const id = String((req.headers && req.headers["x-rs-app-id"]) || "");
  const ts = String((req.headers && req.headers["x-rs-ts"]) || "");
  const sign = String((req.headers && req.headers["x-rs-sign"]) || "");
  if (id !== APP_ID) return { ok: false, status: 403, code: "APP_UNPROVEN" };
  const n = Number(ts);
  if (!Number.isFinite(n) || Math.abs(Date.now() - n) > SKEW_MS) {
    return { ok: false, status: 403, code: "APP_UNPROVEN" };
  }
  const urlPath = (req.url || "/").split("?")[0];
  const expect = signAppRequest(req.method || "GET", urlPath, ts, SECRET, APP_ID);
  let a, b;
  try {
    a = Buffer.from(sign, "hex");
    b = Buffer.from(expect, "hex");
  } catch {
    return { ok: false, status: 403, code: "APP_UNPROVEN" };
  }
  if (a.length !== 32 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, status: 403, code: "APP_UNPROVEN" };
  }
  return { ok: true };
}

function bundlePath() {
  if (fs.existsSync(DIST)) return DIST;
  if (fs.existsSync(WWW)) return WWW;
  return null;
}

function bundleMeta() {
  const p = bundlePath();
  if (!p) return null;
  const buf = fs.readFileSync(p);
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  let versionCode = 0, versionName = "0.0.0";
  try {
    if (fs.existsSync(META)) {
      const m = JSON.parse(fs.readFileSync(META, "utf8"));
      versionCode = Number(m.versionCode) || 0;
      versionName = String(m.versionName || versionName);
    }
  } catch { /* meta is optional */ }
  return { bytes: buf.length, sha256, versionCode, versionName, buf };
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
  delete headers["x-rs-sign"];
  delete headers["x-rs-ts"];
  delete headers["x-rs-app-id"];
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
    return json(res, 200, { ok: true, service: "mobile", kind: "app-api", api });
  }
  if (url === "/" || url === "/index.html") {
    return json(res, 403, { ok: false, code: "NOT_A_WEBSITE" });
  }
  const proof = appProof(req);
  if (!proof.ok) return json(res, proof.status, { ok: false, code: proof.code });

  if (url === "/v1/mobile/update") {
    const m = bundleMeta();
    if (!m) return json(res, 503, { ok: false, code: "BUNDLE_MISSING" });
    return json(res, 200, {
      ok: true,
      versionCode: m.versionCode,
      versionName: m.versionName,
      sha256: m.sha256,
      bytes: m.bytes,
    });
  }
  if (url === "/v1/mobile/bundle") {
    const m = bundleMeta();
    if (!m) return json(res, 503, { ok: false, code: "BUNDLE_MISSING" });
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-rs-sha256": m.sha256,
      "x-rs-version-code": String(m.versionCode),
    });
    return res.end(m.buf);
  }
  if (url === "/v1/config") {
    return json(res, 200, {
      maps: { provider: process.env.MAP_PROVIDER || "osm", apiKey: process.env.GOOGLE_MAPS_API_KEY || "" },
      platform: "mobile",
      surface: "mobile",
    });
  }
  if (url.startsWith("/v1/")) return proxy(req, res);
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
    process.stderr.write(`mobile app-api on :${port} (api proxy: ${API_URL || "DISABLED"})\n`);
  });
}

module.exports = { handler, signAppRequest, APP_ID };
