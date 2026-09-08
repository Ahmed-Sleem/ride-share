/* Railway `mobile` = the APP API (not a website).
   Browsers hitting `/` get JSON 403. The app proves *which program it is* with a short-lived
   device token it obtains once from POST /v1/mobile/enroll; the signing key never leaves this
   service, so nothing has to be baked into a binary or a bundle. Personal routes then proxy
   `/v1/*` to the private Nest API (same OTP/auth), which is what proves *who the person is* -
   the device token is attestation, never auth. Serving the OTA UI bundle stays public because an
   update cannot require a credential the client could not keep. Play Integrity (owner's Google
   Cloud) is the next step: it replaces our "this came from our app" claim with Google's. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

/* Where the OTA artifact lives. `MOBILE_BUNDLE_DIR` exists for one reason that is not a convenience:
   `apps/mobile/tests/config.test.js` runs the *builder* as a child process to prove what build.js
   produces, and the builder starts by `rmSync`-ing `dist/`. Two test files sharing that directory is a
   race, and CI lost it once (run 34190310438: `/v1/mobile/bundle` answered 503 BUNDLE_MISSING in a test
   that had passed for a month — the file was deleted between its two `existsSync` calls). So the tests
   point the server at a private directory and never touch a real build's output; deployment keeps the
   default and never sets the variable. */
const BUNDLE_DIR = (process.env.MOBILE_BUNDLE_DIR || "").trim();
const DIST = BUNDLE_DIR ? path.join(BUNDLE_DIR, "index.html") : path.join(__dirname, "dist", "www", "index.html");
const WWW = path.join(__dirname, "www", "index.html");
const META = BUNDLE_DIR ? path.join(BUNDLE_DIR, "..", "meta.json") : path.join(__dirname, "dist", "meta.json");
const APP_ID = (process.env.MOBILE_APP_ID || "eg.rideshare.app").trim();
/* The key the device tokens are signed with. It is deliberately the only secret in this design,
   it is read at RUN time from the service that verifies it, and it is never sent anywhere: the
   previous scheme asked the client to hold the same secret and prove it on every request, which
   cannot work - a bundle is public text and an APK is a zip anyone owns (D-8.12). */
const TOKEN_KEY_GIVEN = (process.env.MOBILE_DEVICE_TOKEN_KEY || process.env.MOBILE_APP_SECRET || "").trim();
/* A key has to be worth the name. "abc" is a guess, and HMAC keys short enough to brute force make
   every token in the fleet forgeable while the enrol response still claims key:"configured" — the
   lie is the dangerous part, not the weakness. So a short key is treated as absent: this process
   mints an ephemeral one, enrolment keeps working (the law this service lives under is that a
   misconfiguration must never lock every install out — that is exactly what G-117 replaced), and the
   warning names the variable and the number to fix. */
const TOKEN_KEY_MIN_CHARS = 32;
if (TOKEN_KEY_GIVEN && TOKEN_KEY_GIVEN.length < TOKEN_KEY_MIN_CHARS) {
  console.error(
    `[mobile] MOBILE_DEVICE_TOKEN_KEY is ${TOKEN_KEY_GIVEN.length} chars; at least ${TOKEN_KEY_MIN_CHARS} are required. ` +
    "Ignoring it and using an ephemeral key for this process, so tokens will not survive a restart or span instances."
  );
}
const TOKEN_KEY = TOKEN_KEY_GIVEN.length >= TOKEN_KEY_MIN_CHARS ? TOKEN_KEY_GIVEN : "";
const TOKEN_TTL_MS = Number(process.env.MOBILE_DEVICE_TOKEN_TTL_MS || 24 * 60 * 60 * 1000);
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

/* Without a configured key, mint an ephemeral one for this process instead of refusing every
   request. The old gate answered 503 APP_GATE_NOT_CONFIGURED, so a fresh clone could not run the
   app at all and a production misconfiguration looked like a client bug. An ephemeral key still
   proves "this token came from this process", which is exactly what this layer is for; the
   durable key only matters when tokens must survive a restart (they expire in a day anyway). */
const KEY_SOURCE = TOKEN_KEY ? "configured" : "ephemeral";
const ACTIVE_KEY = TOKEN_KEY || require("node:crypto").randomBytes(32).toString("hex");

function sign1(payload) {
  return require("node:crypto").createHmac("sha256", ACTIVE_KEY).update(payload).digest("hex");
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(text) {
  const b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64 + "=".repeat((4 - (b64.length % 4)) % 4), "base64");
}

function issueDeviceToken(deviceId) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = b64url(JSON.stringify({ d: deviceId, a: APP_ID, e: exp }));
  return { token: `d1.${payload}.${sign1(payload)}`, expiresAt: exp };
}

function readJsonBody(req, limit = 16384) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("BODY_TOO_LARGE")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); }
      catch { reject(new Error("BAD_JSON")); }
    });
    req.on("error", reject);
  });
}

/* A forged or tampered token fails the signature; an old one fails the expiry. There is no
   store and no revocation list: the whole claim being made is "this request came from a client
   this service enrolled", and a day is enough for that to be worth anything. */
function deviceToken(req) {
  const raw = String((req.headers && req.headers["x-rs-device-token"]) || "");
  const m = /^d1\.([A-Za-z0-9_-]+)\.([0-9a-f]{64})$/.exec(raw);
  if (!m) return { ok: false, status: 401, code: "DEVICE_TOKEN_MISSING" };
  let payload, sig;
  try {
    payload = m[1];
    sig = m[2];
    if (sign1(payload) !== sig) throw new Error("sig");
    const body = JSON.parse(unb64url(payload).toString("utf8"));
    if (body.a !== APP_ID) return { ok: false, status: 401, code: "DEVICE_TOKEN_APP_MISMATCH" };
    /* No clock tolerance here, unlike the old per-request timestamp: `exp` is minted by this same
       process, so client skew cannot make it look expired and a grace period would only keep a
       dead token usable. A TTL that can be talked past is not a TTL. */
    if (!Number.isFinite(body.e) || Date.now() > body.e) {
      return { ok: false, status: 401, code: "DEVICE_TOKEN_EXPIRED" };
    }
    return { ok: true, deviceId: String(body.d || "") };
  } catch {
    return { ok: false, status: 401, code: "DEVICE_TOKEN_INVALID" };
  }
}

/* One enrolment per device per interval, in memory. This container runs a single process, so the
   per-process map is the right size of lock: enough to stop a client that retries in a loop from
   minting tokens forever, without pretending to be a distributed rate limiter (the api has the
   real one, in postgres, for everything that touches a person). */
const ENROLL_MIN_INTERVAL_MS = Number(process.env.MOBILE_ENROLL_INTERVAL_MS || 60 * 1000);
const lastEnroll = new Map();

function enrollAllowed(deviceId, now) {
  const last = lastEnroll.get(deviceId);
  if (last !== undefined && now - last < ENROLL_MIN_INTERVAL_MS) return false;
  lastEnroll.set(deviceId, now);
  if (lastEnroll.size > 20000) lastEnroll.clear();
  return true;
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
  /* The device token is this service's business, not the api's: it is not forwarded. The bearer
     token (the person's own session) is forwarded untouched, which is the layer that matters. */
  delete headers["x-rs-device-token"];
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
      /* Our own scoped allow-origin is already set; two of them in one response is a hard
         failure in every browser, so an upstream copy is dropped rather than appended. */
      const fwdHeaders = { ...r.headers };
      for (const h of ["access-control-allow-origin", "access-control-allow-credentials",
        "access-control-allow-methods", "access-control-allow-headers"]) delete fwdHeaders[h];
      res.writeHead(r.statusCode || 502, fwdHeaders);
      r.pipe(res);
    }
  );
  fwd.on("timeout", () => { fwd.destroy(); json(res, 504, { ok: false, code: "API_TIMEOUT" }); });
  fwd.on("error", () => json(res, 502, { ok: false, code: "BAD_GATEWAY" }));
  req.on("error", () => fwd.destroy());
  req.pipe(fwd);
}

/* The app lives in a WebView that serves itself from https://localhost (Capacitor's local
   scheme) and then fetches its interface from this service. Two consequences the boot page
   depends on, both missing until now (G-110, the second half of that defect):
   1. the fetch is cross-origin, so the response must carry access-control-allow-origin;
   2. the app sends x-rs-* headers (the device token, the app id) which are not CORS-safelisted,
      so the browser preflights with OPTIONS before it will send them at all.
   Without both the app can never leave its offline card, however good the connection is.
   Only these read-only paths are opened, only to the app's own local origins, and the proof
   check still runs on the real request - a preflight carries nothing to prove. */
const OTA_PATHS = new Set(["/healthz", "/health", "/v1/mobile/update", "/v1/mobile/bundle"]);
const OTA_ORIGIN = /^(?:https?:\/\/localhost|capacitor:\/\/localhost)(?::\d+)?$/;

function otaCors(req, res) {
  const origin = String(req.headers.origin || "");
  /* A port is allowed on purpose: `cap serve` and any local harness run on http://localhost:PORT,
     and the WebView itself is https://localhost with no port. Both are "this app on this device";
     nothing else gets an answer. */
  if (!OTA_ORIGIN.test(origin)) return;
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("vary", "Origin");
}

async function handler(req, res) {
  const url = (req.url || "/").split("?")[0];
  /* The whole surface this service offers is called by one client: the app on a device, whose
     document origin is https://localhost (or localhost with a port under `cap serve`). The app
     reads its interface from here and its data through the proxy below, and the proof check that
     guards that proxy answers with a plain 403 - which, without an allow-origin, the WebView
     reports as a CORS failure, so a refused request looked like a dead network. Same defect as
     G-110, one route wider. Answering CORS is not answering the request: the proof check still
     runs, still refuses, and now the refusal arrives readable. */
  otaCors(req, res);
  if (req.method === "OPTIONS" && (OTA_PATHS.has(url) || url.startsWith("/v1/"))) {
    res.writeHead(204, {
      "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "authorization, content-type, x-rs-app-id, x-rs-device-token",
      "access-control-max-age": "600",
      "content-length": "0",
    });
    return res.end();
  }
  if (url === "/healthz" || url === "/health") {
    const api = await apiHealth();
    return json(res, 200, { ok: true, service: "mobile", kind: "app-api", api });
  }
  if (url === "/" || url === "/index.html") {
    return json(res, 403, { ok: false, code: "NOT_A_WEBSITE" });
  }
  /* The two OTA reads are public by decision, not by oversight (round 11), and the reason is
     now structural rather than an incident: a client that updates its own interface cannot be
     asked to authenticate the fetch with a credential, because the credential would have to be
     either baked (readable: an APK is a zip, a bundle is public text) or fetched (which is the
     fetch being gated). They serve one static, non-personal artefact - the interface itself.
     Everything that touches a person runs through the device-token check below. */
  if (url === "/v1/mobile/update" || url === "/v1/mobile/bundle") {
    const m = bundleMeta();
    if (!m) return json(res, 503, { ok: false, code: "BUNDLE_MISSING" });
    if (url === "/v1/mobile/update") {
      return json(res, 200, {
        ok: true,
        versionCode: m.versionCode,
        versionName: m.versionName,
        sha256: m.sha256,
        bytes: m.bytes,
      });
    }
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-rs-sha256": m.sha256,
      "x-rs-version-code": String(m.versionCode),
    });
    return res.end(m.buf);
  }

  /* The app introduces itself here and gets a token to carry instead of a signature to compute.
     It has to be reachable before the check it feeds - and reachable with no key configured - so
     that a device that was refused for the last round (the empty baked secret, D-8.12) can enroll
     and start working on its next launch, with no reinstall: this route is served by the same
     process that serves the bundle, so fixing it here fixes every install. */
  if (url === "/v1/mobile/enroll") {
    if (req.method !== "POST") return json(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
    let body;
    try { body = await readJsonBody(req); }
    catch (e) { return json(res, 400, { ok: false, code: String(e.message || "BAD_JSON") }); }
    const deviceId = String(body.deviceId || "").trim();
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(deviceId)) {
      return json(res, 400, { ok: false, code: "BAD_DEVICE_ID" });
    }
    const appId = String(body.appId || APP_ID).trim();
    if (appId !== APP_ID) return json(res, 403, { ok: false, code: "APP_UNPROVEN" });
    if (!enrollAllowed(deviceId, Date.now())) {
      return json(res, 429, { ok: false, code: "ENROLL_THROTTLED" });
    }
    const { token, expiresAt } = issueDeviceToken(deviceId);
    return json(res, 200, { ok: true, token, tokenType: "rs-device", expiresAt, key: KEY_SOURCE });
  }

  const proof = deviceToken(req);
  if (!proof.ok) return json(res, proof.status, { ok: false, code: proof.code });

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

module.exports = { handler, issueDeviceToken, deviceToken, APP_ID, TOKEN_TTL_MS };
