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

const { handler, APP_ID } = require("../server.js");

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

/* The boot page carries no credential, so this is now "the headers a real boot page sends".
   If a future edit puts a signing step back, the test above fails and says why. */
function makeHeaders() {
  return { "x-rs-app-id": APP_ID };
}


async function subtleSha256(contentStr) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(contentStr));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

test("the boot page asks for its interface without a credential, and without a preflight", async () => {
  /* This test used to prove the two HMAC implementations agreed. They cannot disagree now because
     neither exists: a client-side signature needed a key in a public artefact (D-8.12), so the boot
     page sends only an app id - and, having no non-safelisted header to announce, it no longer has
     to survive an OPTIONS probe before it can even ask. That is the property worth holding: the
     splash's one job is to fetch, and nothing about fetching may depend on a secret. */
  const boot = fs.readFileSync(path.join(__dirname, "..", "offline.html"), "utf8");
  assert.ok(!/x-rs-sign/.test(boot), "no signature: there is no key a bundle could keep");
  assert.ok(!/x-rs-ts/.test(boot), "and no timestamp, so no clock skew to fail on");
  assert.match(boot, /x-rs-app-id/, "it still says which program it is");
  for (const p of ["/v1/mobile/update", "/v1/mobile/bundle"]) {
    const r = await request(p, { "x-rs-app-id": APP_ID });
    assert.equal(r.status, 200, `${p} must answer a plain request from the boot page`);
  }
});

test("bootloader subtle SHA-256 matches node crypto hash", async () => {
  const sample = "<!doctype html><html><head></head><body><h1>Live Bundle</h1></body></html>";
  const clientHash = await subtleSha256(sample);
  const nodeHash = crypto.createHash("sha256").update(sample).digest("hex");
  assert.equal(clientHash, nodeHash);
});

test("update API returns valid bundle metadata with sha256", async () => {
  const r = await request("/v1/mobile/update", makeHeaders());
  assert.equal(r.status, 200);
  const meta = JSON.parse(r.body);
  assert.equal(meta.ok, true);
  assert.match(meta.sha256, /^[a-f0-9]{64}$/);
  assert.ok(meta.bytes > 0);
});

test("bundle API serves html bundle and matches update sha256", async () => {
  const updateRes = await request("/v1/mobile/update", makeHeaders());
  const meta = JSON.parse(updateRes.body);

  const bundleRes = await request("/v1/mobile/bundle", makeHeaders());
  assert.equal(bundleRes.status, 200);
  assert.equal(bundleRes.headers["content-type"], "text/html; charset=utf-8");
  assert.equal(bundleRes.headers["x-rs-sha256"], meta.sha256);

  const computedHash = await subtleSha256(bundleRes.body);
  assert.equal(computedHash, meta.sha256);
});

/* Round 11 reversed one policy and this is where it shows. A signature over a key baked into a
   debug APK is not a secret - anyone holding the installer can read it out of the bundle - so the
   gate on the two OTA reads bought nothing except a 403 that bricked every installed app once the
   installer job turned out to have no secret to bake. They are public now. What must stay shut is
   anything that reaches a person, so the assertions moved to the proxy path instead: a bad
   signature there is still refused, and the OTA reads ignore a bad signature rather than reject it.
   If the owner ever wants the old behaviour back, it is one repo secret plus flipping this block. */
test("a tampered signature no longer blocks the public interface reads", async () => {
  const r = await request("/v1/mobile/bundle", {
    "x-rs-app-id": APP_ID,
    "x-rs-ts": String(Date.now()),
    "x-rs-sign": "f".repeat(64),
  });
  assert.equal(r.status, 200);
  assert.match(r.body, /test-bundle|fixture|<!doctype/i, "the bundle is served, headers and all");
});

test("but the proxied API still refuses it, and names what is missing", async () => {
  const r = await request("/v1/healthz", {
    "x-rs-app-id": APP_ID,
    "x-rs-ts": String(Date.now()),
    "x-rs-sign": "f".repeat(64),
  });
  assert.equal(r.status, 401);
  assert.equal(JSON.parse(r.body).code, "DEVICE_TOKEN_MISSING");
});
