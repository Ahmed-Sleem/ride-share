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
  assert.equal(r.headers["access-control-allow-methods"], "GET, OPTIONS");
  assert.match(r.headers["access-control-allow-headers"], /x-rs-sign/);
  assert.ok(Number(r.headers["access-control-max-age"]) >= 60, "the probe should be cached");
});

test("the app origin is allowed on the OTA reads, and nobody else is", async () => {
  const mine = await raw("GET", "/healthz", { origin: "https://localhost" });
  assert.equal(mine.status, 200);
  assert.equal(mine.headers["access-control-allow-origin"], "https://localhost");
  assert.equal(mine.headers["vary"], "Origin", "a cached answer must not be reused for another origin");
  const foreign = await raw("GET", "/healthz", { origin: "https://somewhere-else.test" });
  assert.ok(!foreign.headers["access-control-allow-origin"], "a random web page gets no permission");
  const bundle = await raw("GET", "/v1/mobile/bundle", { origin: "https://localhost" });
  assert.ok(!bundle.headers["access-control-allow-origin"] || bundle.status >= 400,
    "an unproven bundle read stays refused - CORS opens the transport, not the content");
});
