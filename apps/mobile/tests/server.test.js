const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

process.env.MOBILE_APP_SECRET = "a".repeat(32);
process.env.MOBILE_APP_ID = "eg.rideshare.app";

const HERE = path.join(__dirname, "..");
const htmlPath = path.join(HERE, "dist", "www", "index.html");
if (!fs.existsSync(htmlPath)) {
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, "<!doctype html><title>fixture</title>");
}

const { handler, signAppRequest, APP_ID } = require("../server.js");

function request(url, headers) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      handler(req, res).catch(reject);
    });
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      http.get({ hostname: "127.0.0.1", port, path: url, headers: headers || {} }, (r) => {
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => {
          srv.close();
          resolve({ status: r.statusCode, body: Buffer.concat(chunks).toString("utf8") });
        });
      }).on("error", reject);
    });
  });
}

function appHeaders(method, urlPath) {
  const ts = String(Date.now());
  const sign = signAppRequest(method, urlPath, ts, process.env.MOBILE_APP_SECRET, APP_ID);
  return { "x-rs-app-id": APP_ID, "x-rs-ts": ts, "x-rs-sign": sign };
}

test("healthz is public and names an app-api", async () => {
  const r = await request("/healthz");
  assert.equal(r.status, 200);
  const j = JSON.parse(r.body);
  assert.equal(j.ok, true);
  assert.equal(j.service, "mobile");
  assert.equal(j.kind, "app-api");
});

test("root is not a website", async () => {
  const r = await request("/");
  assert.equal(r.status, 403);
  assert.equal(JSON.parse(r.body).code, "NOT_A_WEBSITE");
});

test("v1 without app proof is refused", async () => {
  const r = await request("/v1/healthz");
  assert.equal(r.status, 403);
  assert.equal(JSON.parse(r.body).code, "APP_UNPROVEN");
});

test("proven v1 without API is an honest 503", async () => {
  const r = await request("/v1/healthz", appHeaders("GET", "/v1/healthz"));
  assert.equal(r.status, 503);
  assert.equal(JSON.parse(r.body).code, "API_NOT_CONFIGURED");
});

test("proven update returns bundle sha", async () => {
  const r = await request("/v1/mobile/update", appHeaders("GET", "/v1/mobile/update"));
  assert.equal(r.status, 200);
  const j = JSON.parse(r.body);
  assert.equal(j.ok, true);
  assert.match(j.sha256, /^[a-f0-9]{64}$/);
});

/* The other half of G-110. The app's WebView runs on https://localhost and fetches these
   paths cross-origin, always carrying the x-rs-* proof headers - which are not
   CORS-safelisted, so the browser will not even send the request until an OPTIONS probe is
   answered. With no preflight and no allow-origin, the boot page can never reach the bundle,
   whatever the network is doing. These requests are written here rather than through the
   file's helper because that helper keeps only status and body, and headers are the point. */
function raw(method, url, headers) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => { handler(req, res).catch(reject); });
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      const req2 = http.request({ hostname: "127.0.0.1", port, path: url, method, headers: headers || {} }, (r) => {
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => { srv.close(); resolve({ status: r.statusCode, headers: r.headers, body: Buffer.concat(chunks).toString("utf8") }); });
      });
      req2.on("error", (e) => { srv.close(); reject(e); });
      req2.end();
    });
  });
}

test("the OTA preflight is answered before any proof is asked for", async () => {
  const r = await raw("OPTIONS", "/v1/mobile/bundle", {
    origin: "https://localhost",
    "access-control-request-method": "GET",
    "access-control-request-headers": "x-rs-app-id, x-rs-ts, x-rs-sign",
  });
  assert.equal(r.status, 204);
  assert.equal(r.headers["access-control-allow-origin"], "https://localhost");
  /* Included, not equal: the same answer now also covers the app's writes, and pinning the
     literal list here is what made this test contradict the test added beside it. The intent is
     "a preflight is answered before any proof is asked for" - the 204 above is that proof. */
  assert.match(r.headers["access-control-allow-methods"], /GET/);
  assert.match(r.headers["access-control-allow-methods"], /OPTIONS/);
  assert.match(r.headers["access-control-allow-headers"], /x-rs-sign/);
  assert.ok(Number(r.headers["access-control-max-age"]) >= 60, "the probe should be cached");
});

test("a write from the app is preflighted too, and a refusal stays readable", async () => {
  const pre = await raw("OPTIONS", "/v1/auth/login", {
    origin: "https://localhost",
    "access-control-request-method": "POST",
    "access-control-request-headers": "authorization, content-type, x-rs-app-id, x-rs-ts, x-rs-sign",
  });
  assert.equal(pre.status, 204, "the WebView must not be answered by the proof check");
  const methods = pre.headers["access-control-allow-methods"] || "";
  for (const m of ["GET", "POST", "PATCH", "DELETE"]) {
    assert.ok(methods.includes(m), `preflight must allow ${m} - the app writes, not just reads`);
  }
  assert.ok((pre.headers["access-control-allow-headers"] || "").includes("authorization"),
    "a signed-in request carries a bearer token, so preflight must allow the header");
  /* And the refusal itself: a 403 without allow-origin shows up as a network error, which is
     how a person ends up reading "check your internet connection" while the server is fine. */
  const denied = await raw("GET", "/v1/config", { origin: "https://localhost" });
  assert.equal(denied.status, 403, "no proof, no data - unchanged");
  assert.equal(denied.headers["access-control-allow-origin"], "https://localhost");
  const foreign = await raw("GET", "/v1/config", { origin: "https://somewhere-else.test" });
  assert.ok(!foreign.headers["access-control-allow-origin"], "and nothing for anyone else");
});

test("localhost with a port is an app origin; a look-alike is not", async () => {
  for (const origin of ["http://localhost:8099", "https://localhost:3000", "capacitor://localhost"]) {
    const r = await raw("GET", "/healthz", { origin });
    assert.equal(r.headers["access-control-allow-origin"], origin, `${origin} must be answered`);
  }
  for (const origin of ["http://evil.localhost", "https://localhost.evil.test", "http://127.0.0.1:8099"]) {
    const r = await raw("GET", "/healthz", { origin });
    assert.ok(!r.headers["access-control-allow-origin"], `${origin} must get nothing`);
  }
});

test("the app origin is allowed on the OTA reads, and nobody else is", async () => {
  const mine = await raw("GET", "/healthz", { origin: "https://localhost" });
  assert.equal(mine.status, 200);
  assert.equal(mine.headers["access-control-allow-origin"], "https://localhost");
  assert.equal(mine.headers["vary"], "Origin", "a cached answer must not be reused for another origin");
  const foreign = await raw("GET", "/healthz", { origin: "https://somewhere-else.test" });
  assert.ok(!foreign.headers["access-control-allow-origin"], "a random web page gets no permission");
  /* Follows the round-11 policy: the interface reads are public, so an unsigned bundle read is
     allowed and must still be readable by the WebView - which is the whole point of the CORS
     answer. The refusal lives on the proxied API, asserted in boot.test.js, not here. */
  const bundle = await raw("GET", "/v1/mobile/bundle", { origin: "https://localhost" });
  assert.equal(bundle.status, 200);
  assert.equal(bundle.headers["access-control-allow-origin"], "https://localhost");
  assert.match(bundle.headers["x-rs-sha256"] || "", /^[a-f0-9]{64}$/, "and the integrity header the boot page verifies against");
});
