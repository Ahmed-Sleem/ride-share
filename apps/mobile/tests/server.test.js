const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

/* The name still says APP_SECRET because the key lives in the same variable on the deployed
   service; what changed is who may hold it - only the process that verifies tokens (D-8.12). */
process.env.MOBILE_DEVICE_TOKEN_KEY = "a".repeat(32);
process.env.MOBILE_APP_ID = "eg.rideshare.app";

const HERE = path.join(__dirname, "..");
const htmlPath = path.join(HERE, "dist", "www", "index.html");
if (!fs.existsSync(htmlPath)) {
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, "<!doctype html><title>fixture</title>");
}

const { handler, issueDeviceToken, APP_ID } = require("../server.js");

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

/* A token minted by the module under test, which is what a client cannot do - and that is the
   whole design: the client asks, the server signs, and the client can only carry the result. */
function deviceHeaders() {
  const { token } = issueDeviceToken("d" + "a".repeat(31));
  return { "x-rs-device-token": token, "x-rs-app-id": APP_ID };
}

function post(url, body, headers) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => { handler(req, res).catch(reject); });
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      const data = JSON.stringify(body);
      const rq = http.request({
        hostname: "127.0.0.1", port, path: url, method: "POST",
        headers: Object.assign({ "content-type": "application/json", "content-length": Buffer.byteLength(data) }, headers || {}),
      }, (r) => {
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => { srv.close(); resolve({ status: r.statusCode, body: Buffer.concat(chunks).toString("utf8") }); });
      });
      rq.on("error", (e) => { srv.close(); reject(e); });
      rq.end(data);
    });
  });
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

test("a personal route with nothing to present is refused, and says which thing is missing", async () => {
  const r = await request("/v1/healthz");
  assert.equal(r.status, 401, "a missing credential is 401, not a 403 that looks like a policy");
  assert.equal(JSON.parse(r.body).code, "DEVICE_TOKEN_MISSING");
  const forged = await request("/v1/healthz", { "x-rs-device-token": "d1.eyJhIjoxfQ." + "0".repeat(64) });
  assert.equal(forged.status, 401);
  assert.equal(JSON.parse(forged.body).code, "DEVICE_TOKEN_INVALID", "a guessed signature must not parse into access");
  const tok = deviceHeaders()["x-rs-device-token"];
  const tampered = await request("/v1/healthz", {
    "x-rs-device-token": tok.replace(/\.(.)\w+$/, (m, c) => "." + (c === "a" ? "b" : "a") + "0".repeat(63)),
    "x-rs-app-id": APP_ID,
  });
  assert.equal(tampered.status, 401, "changing one character of the payload must break the token");
});

test("enrolment mints a token, and that token opens the personal routes", async () => {
  const e = await post("/v1/mobile/enroll", { deviceId: "d" + "b".repeat(31), appId: APP_ID });
  assert.equal(e.status, 200);
  const j = JSON.parse(e.body);
  assert.equal(j.ok, true);
  assert.match(j.token, /^d1\.[A-Za-z0-9_-]+\.[0-9a-f]{64}$/);
  assert.ok(j.expiresAt > Date.now(), "it must be short-lived, not forever");
  assert.equal(j.key, "configured");
  const r = await request("/v1/healthz", { "x-rs-device-token": j.token, "x-rs-app-id": APP_ID });
  assert.equal(r.status, 503, "past the gate, and the proxy honestly says there is no api here");
  assert.equal(JSON.parse(r.body).code, "API_NOT_CONFIGURED");
  const cfg = await request("/v1/config", { "x-rs-device-token": j.token, "x-rs-app-id": APP_ID });
  assert.equal(cfg.status, 200, "the app can read its own config, which is what sign-in needed");
  assert.equal(JSON.parse(cfg.body).surface, "mobile");
  const wrong = await post("/v1/mobile/enroll", { deviceId: "d" + "b".repeat(31), appId: "eg.other.app" });
  assert.equal(wrong.status, 403, "another program cannot enroll under our id");
});

test("a device cannot enrol in a loop", async () => {
  const first = await post("/v1/mobile/enroll", { deviceId: "d" + "c".repeat(31), appId: APP_ID });
  assert.equal(first.status, 200);
  const second = await post("/v1/mobile/enroll", { deviceId: "d" + "c".repeat(31), appId: APP_ID });
  assert.equal(second.status, 429, "a client that retries must not mint tokens forever");
  assert.equal(JSON.parse(second.body).code, "ENROLL_THROTTLED");
});

test("enrolment is reachable with no credential, so a locked-out install can recover", async () => {
  const r = await post("/v1/mobile/enroll", { deviceId: "d" + "e".repeat(31), appId: APP_ID });
  assert.equal(r.status, 200, "the route that fixes a bad gate cannot itself be behind a gate");
  const bad = await post("/v1/mobile/enroll", { deviceId: "short", appId: APP_ID });
  assert.equal(bad.status, 400, "but it is not a token dispenser for anyone with a curl");
});

test("the interface itself stays public, with nothing to present", async () => {
  const r = await request("/v1/mobile/update");
  assert.equal(r.status, 200);
  const j = JSON.parse(r.body);
  assert.equal(j.ok, true);
  assert.match(j.sha256, /^[a-f0-9]{64}$/);
  const bundle = await request("/v1/mobile/bundle");
  assert.equal(bundle.status, 200, "an update cannot require a credential the client could not keep");
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
  /* Was /x-rs-sign/, which pinned the removed mechanism; the intent is "every header the app puts
     on a real request is allowed through preflight", and the app's header is now the token. */
  assert.match(r.headers["access-control-allow-headers"], /x-rs-device-token/);
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
  assert.ok((pre.headers["access-control-allow-headers"] || "").includes("x-rs-device-token"),
    "and the device credential the app now carries must survive preflight too");
  /* And the refusal itself: a 403 without allow-origin shows up as a network error, which is
     how a person ends up reading "check your internet connection" while the server is fine. */
  const denied = await raw("GET", "/v1/config", { origin: "https://localhost" });
  assert.equal(denied.status, 401, "no token, no data - and the refusal is named, not guessed");
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

test("a service with no key configured still enrols, instead of locking everyone out", async () => {
  /* This is the failure mode that shipped the 403 to every install: the gate demanded a secret the
     build never had, and answered 503 when it was missing - so a fresh clone could not run the app
     and a misconfiguration looked like a client bug. Spawned as a child process because the key is
     read once, at module load. */
  const { spawn } = require("node:child_process");
  const port = 9123;
  const child = spawn(process.execPath, [require.resolve("../server.js")], {
    env: Object.assign({}, process.env, {
      PORT: String(port), MOBILE_DEVICE_TOKEN_KEY: "", MOBILE_APP_SECRET: "",
      // A real TTL, short enough to pass inside the test: 300 ms of validity, then 500 ms of waiting.
      // "1" was my first guess and it expired before the *positive* check could run - which is the
      // same lesson as always: make the environment prove the behaviour, do not assume a number.
      MOBILE_DEVICE_TOKEN_TTL_MS: "300",
    }),
    stdio: "ignore",
  });
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("server did not start")), 8000);
      const tryOnce = () => {
        http.get({ host: "127.0.0.1", port, path: "/healthz" }, (r) => { r.resume(); clearTimeout(t); resolve(); })
          .on("error", () => setTimeout(tryOnce, 150));
      };
      setTimeout(tryOnce, 200);
    });
    const e = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ deviceId: "d" + "f".repeat(31), appId: APP_ID });
      const rq = http.request({ host: "127.0.0.1", port, path: "/v1/mobile/enroll", method: "POST",
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(data) } },
      (r) => { const c = []; r.on("data", (x) => c.push(x)); r.on("end", () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString() })); });
      rq.on("error", reject); rq.end(data);
    });
    assert.equal(e.status, 200, "enrolment must work with no key at all");
    const token = JSON.parse(e.body).token;
    assert.equal(JSON.parse(e.body).key, "ephemeral", "and it must say which key signed it");
    const cfg = await new Promise((resolve, reject) => {
      http.get({ host: "127.0.0.1", port, path: "/v1/config", headers: { "x-rs-device-token": token } },
        (r) => { const c = []; r.on("data", (x) => c.push(x)); r.on("end", () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString() })); })
        .on("error", reject);
    });
    assert.equal(cfg.status, 200, "and the personal routes open for it, no 503 anywhere");
    await new Promise((r) => setTimeout(r, 500));
    const stale = await new Promise((resolve, reject) => {
      http.get({ host: "127.0.0.1", port, path: "/v1/config", headers: { "x-rs-device-token": token } },
        (r) => { const c = []; r.on("data", (x) => c.push(x)); r.on("end", () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString() })); })
        .on("error", reject);
    });
    assert.equal(stale.status, 401, "a token past its TTL stops working, which is the point of a TTL");
    assert.equal(JSON.parse(stale.body).code, "DEVICE_TOKEN_EXPIRED");
  } finally {
    child.kill("SIGTERM");
  }
});


/* ── G-120: what one key does across processes ────────────────────────────────────────────
   A single-process suite cannot see this class of fault, which is how it shipped: with no key the
   service mints one at module load, so every instance holds a different secret and a device enrolled
   on A is refused on B. The cut that proved the blindness — replacing the random fallback with ""
   — reddened nothing, because inside one process an empty key still signs and still verifies.
   These three tests are what makes that cut (and any key-length regression) observable. */
function spawnServer(port, extraEnv) {
  const { spawn } = require("node:child_process");
  const child = spawn(process.execPath, [require.resolve("../server.js")], {
    env: Object.assign({}, process.env, { PORT: String(port) }, extraEnv || {}),
    stdio: "ignore",
  });
  const ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server on :${port} did not start`)), 8000);
    const once = () => http
      .get({ host: "127.0.0.1", port, path: "/healthz" }, (r) => { r.resume(); clearTimeout(t); resolve(); })
      .on("error", () => setTimeout(once, 150));
    setTimeout(once, 150);
  });
  return { child, ready };
}

function send(port, method, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const rq = http.request({
      host: "127.0.0.1", port, path: urlPath, method,
      headers: Object.assign(
        data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {},
        headers || {}),
    }, (r) => {
      const c = [];
      r.on("data", (x) => c.push(x));
      r.on("end", () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString() }));
    });
    rq.on("error", reject);
    if (data) rq.end(data); else rq.end();
  });
}

const NO_KEY = { MOBILE_DEVICE_TOKEN_KEY: "", MOBILE_APP_SECRET: "" };
const GOOD_KEY = "0123456789abcdef0123456789abcdef";
const DEVICE = "d" + "c".repeat(31);

test("an ephemeral key is per-process, so a token from one instance is refused by the next (G-120)", async () => {
  const a = spawnServer(9131, NO_KEY);
  const b = spawnServer(9132, NO_KEY);
  try {
    await Promise.all([a.ready, b.ready]);
    const enr = await send(9131, "POST", "/v1/mobile/enroll", { deviceId: DEVICE, appId: APP_ID });
    assert.equal(enr.status, 200);
    assert.equal(JSON.parse(enr.body).key, "ephemeral", "and it must admit which key signed it");
    const token = JSON.parse(enr.body).token;
    const onA = await send(9131, "GET", "/v1/config", null, { "x-rs-device-token": token });
    assert.equal(onA.status, 200, "the minting instance accepts it");
    const onB = await send(9132, "GET", "/v1/config", null, { "x-rs-device-token": token });
    assert.equal(onB.status, 401, "a second instance must not accept it — that is the exposure");
    assert.equal(JSON.parse(onB.body).code, "DEVICE_TOKEN_INVALID");
  } finally { a.child.kill("SIGTERM"); b.child.kill("SIGTERM"); }
});

test("one configured key makes a token valid on every instance, so the fix is one variable", async () => {
  const env = { MOBILE_DEVICE_TOKEN_KEY: GOOD_KEY, MOBILE_APP_SECRET: "" };
  const a = spawnServer(9133, env);
  const b = spawnServer(9134, env);
  try {
    await Promise.all([a.ready, b.ready]);
    const enr = await send(9133, "POST", "/v1/mobile/enroll", { deviceId: DEVICE, appId: APP_ID });
    assert.equal(enr.status, 200);
    assert.equal(JSON.parse(enr.body).key, "configured");
    const onB = await send(9134, "GET", "/v1/config", null, { "x-rs-device-token": JSON.parse(enr.body).token });
    assert.equal(onB.status, 200, "MOBILE_DEVICE_TOKEN_KEY is all an autoscaling deploy needs");
  } finally { a.child.kill("SIGTERM"); b.child.kill("SIGTERM"); }
});

test("a key too short to be a secret is ignored, and the service still enrols (no lockout)", async () => {
  /* Refusing to start would be the 503 story again, so a weak key degrades to ephemeral — but it
     must not be reported as configured, because that is the difference between a warning a deployer
     acts on and a green light. */
  const s = spawnServer(9135, { MOBILE_DEVICE_TOKEN_KEY: "abc", MOBILE_APP_SECRET: "" });
  try {
    await s.ready;
    const enr = await send(9135, "POST", "/v1/mobile/enroll", { deviceId: DEVICE, appId: APP_ID });
    assert.equal(enr.status, 200, "a short key must not lock anyone out of enrolment");
    assert.equal(JSON.parse(enr.body).key, "ephemeral", "and it must be honest about which key signed");
    const cfg = await send(9135, "GET", "/v1/config", null, { "x-rs-device-token": JSON.parse(enr.body).token });
    assert.equal(cfg.status, 200, "the token it minted still works");
  } finally { s.child.kill("SIGTERM"); }
});
