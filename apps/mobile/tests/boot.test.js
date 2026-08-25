const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

process.env.MOBILE_APP_SECRET = "b".repeat(32);
process.env.MOBILE_APP_ID = "eg.rideshare.app";

const HERE = path.join(__dirname, "..");
const htmlPath = path.join(HERE, "dist", "www", "index.html");
if (!fs.existsSync(htmlPath)) {
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, "<!doctype html><title>test-bundle</title><body>Bundle Content</body>");
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
          resolve({ status: r.statusCode, headers: r.headers, body: Buffer.concat(chunks).toString("utf8") });
        });
      }).on("error", reject);
    });
  });
}

function makeHeaders(method, urlPath) {
  const ts = String(Date.now());
  const sign = signAppRequest(method, urlPath, ts, process.env.MOBILE_APP_SECRET, APP_ID);
  return { "x-rs-app-id": APP_ID, "x-rs-ts": ts, "x-rs-sign": sign };
}

async function subtleHmac(method, pathStr, ts, secret, appId) {
  const enc = new TextEncoder();
  const msg = appId + "\n" + ts + "\n" + method + "\n" + pathStr;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function subtleSha256(contentStr) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(contentStr));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

test("bootloader subtle HMAC matches server signAppRequest", async () => {
  const ts = String(Date.now());
  const clientSig = await subtleHmac("GET", "/v1/mobile/update", ts, process.env.MOBILE_APP_SECRET, APP_ID);
  const serverSig = signAppRequest("GET", "/v1/mobile/update", ts, process.env.MOBILE_APP_SECRET, APP_ID);
  assert.equal(clientSig, serverSig);
});

test("bootloader subtle SHA-256 matches node crypto hash", async () => {
  const sample = "<!doctype html><html><head></head><body><h1>Live Bundle</h1></body></html>";
  const clientHash = await subtleSha256(sample);
  const nodeHash = crypto.createHash("sha256").update(sample).digest("hex");
  assert.equal(clientHash, nodeHash);
});

test("update API returns valid bundle metadata with sha256", async () => {
  const r = await request("/v1/mobile/update", makeHeaders("GET", "/v1/mobile/update"));
  assert.equal(r.status, 200);
  const meta = JSON.parse(r.body);
  assert.equal(meta.ok, true);
  assert.match(meta.sha256, /^[a-f0-9]{64}$/);
  assert.ok(meta.bytes > 0);
});

test("bundle API serves html bundle and matches update sha256", async () => {
  const updateRes = await request("/v1/mobile/update", makeHeaders("GET", "/v1/mobile/update"));
  const meta = JSON.parse(updateRes.body);

  const bundleRes = await request("/v1/mobile/bundle", makeHeaders("GET", "/v1/mobile/bundle"));
  assert.equal(bundleRes.status, 200);
  assert.equal(bundleRes.headers["content-type"], "text/html; charset=utf-8");
  assert.equal(bundleRes.headers["x-rs-sha256"], meta.sha256);

  const computedHash = await subtleSha256(bundleRes.body);
  assert.equal(computedHash, meta.sha256);
});

test("tampered signature on bundle is rejected with 403", async () => {
  const headers = makeHeaders("GET", "/v1/mobile/bundle");
  headers["x-rs-sign"] = "0".repeat(64);
  const r = await request("/v1/mobile/bundle", headers);
  assert.equal(r.status, 403);
  assert.equal(JSON.parse(r.body).code, "APP_UNPROVEN");
});
