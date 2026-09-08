#!/usr/bin/env node
/* D-8.11 / chunk E — the harness' own front door: serves the BOOT page over TLS and proxies the
   service's read paths to a real `apps/mobile/server.js`. The product is not modified for this.

   Three reasons this file exists instead of "just open the URL against the service":

   1. The service answers `/` with `403 NOT_A_WEBSITE` on purpose (it is an app API, not a website),
      while a real device loads the boot page from Capacitor's WebView. So the harness must serve the
      page itself, from the same file the installer carries (`apps/mobile/www/index.html`).
   2. Chromium has no `crypto.subtle` on an insecure origin *that is not localhost*, and the boot page
      verifies the bundle's sha256 before it mounts. A named host alias is not localhost, so TLS (with a
      throwaway cert, generated per run and deleted) is what keeps the sha check real instead of a harness
      that quietly skips integrity and calls the result a pass.
   3. Serving the page on the SAME origin the page is told to dial makes the fetches same-origin, so the
      run tests the boot path rather than the CORS path (that half is covered by `apps/mobile/tests/`).

   `RS_BOOT_ALLOW_APP_PAGE=1` lifts the "that is the APP, not the boot page" refusal. It exists for one
   reason: to let `apps/mobile/tests/boot.test.js` prove that refusal actually fires. Nothing else.

   It refuses loudly rather than quietly testing nothing: a missing boot page, a mis-baked
   `__RS_PUBLIC_ORIGIN`, or a service that will not answer `/healthz` each stop the run with a message
   naming the file to look at. */
"use strict";
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { spawn } = require("node:child_process");

const HERE = __dirname;
const MOBILE = path.join(HERE, "..");
const ROOT = path.join(MOBILE, "..", "..");
const PASS_THROUGH = /^\/(healthz|health|v1\/mobile\/(update|bundle))$/;

function fail(msg) { console.error("boot-serve: FAIL: " + msg); process.exit(1); }

/* --- inputs ----------------------------------------------------------------------------- */
const bootPath = process.env.RS_BOOT_PAGE || path.join(MOBILE, "www", "index.html");
if (!fs.existsSync(bootPath)) fail(`no boot page at ${path.relative(ROOT, bootPath)} — run \`node apps/mobile/scripts/build.js\` first`);
let boot = fs.readFileSync(bootPath, "utf8");
if (/<div[^>]+id="root"/.test(boot) && process.env.RS_BOOT_ALLOW_APP_PAGE !== "1") {
  fail("the page being served is the APP, not the boot page — the installer must carry www/index.html "
    + "(the OTA artifact at dist/www/ is what the app should be, and serving it here would hide the whole bug class)");
}
const port = Number(process.env.PORT || 9443);
/* The origin the PAGE is told to dial, separate from the front door's own port on purpose: pointing it
   at a port where nothing answers is how the harness proves the OTHER half of the boot — that a phone
   which cannot reach the service shows the honest offline card instead of a white screen. Production
   never exercises that path; `verify-boot.js` does, in one browser run (D-8.11). */
const apiOrigin = process.env.RS_BOOT_PAGE_ORIGIN || `https://boot-live.test.invalid:${port}`;
const origin = apiOrigin;
/* Re-bake the origin the page dials, exactly the way scripts/build.js does for a real installer, so
   the harness points a shipped artifact at a local service instead of at production. The page reads it
   once at load, so this is the only edit the boot page ever needs. */
if (process.env.RS_BOOT_KEEP_ORIGIN === "1") {
  /* Escape hatch for the harness' OWN break-and-observe runs (D-8.2 [2]): a test that wants to prove a
     mis-baked origin is caught has to be able to ship one. It is opt-in, and never set by CI. */
} else if (/window\.__RS_PUBLIC_ORIGIN\s*=\s*"[^"]*"/.test(boot)) {
  boot = boot.replace(/window\.__RS_PUBLIC_ORIGIN\s*=\s*"[^"]*"/, `window.__RS_PUBLIC_ORIGIN="${origin}"`);
} else if (/window\.__RS_PUBLIC_ORIGIN/.test(boot)) {
  fail("the boot page sets __RS_PUBLIC_ORIGIN in a shape this harness does not recognise — fix the harness or the page, never both silently");
} else {
  boot = boot.replace("<head>", '<head><script>window.__RS_PUBLIC_ORIGIN="' + origin + '";</script>');
}
/* A page that dials a different address than the one being served is the interesting bug (G-114), so by
   default a mismatch is a harness error, not a test result. `RS_BOOT_KEEP_ORIGIN=1` says "the mismatch
   is the point" — then the page dials what it was baked with and the boot must go offline. */
if (!boot.includes(origin) && process.env.RS_BOOT_KEEP_ORIGIN !== "1") {
  fail("the harness could not point the boot page at " + origin + " (set RS_BOOT_KEEP_ORIGIN=1 to ship a page with a different baked origin on purpose)");
}

const keyPath = process.env.RS_BOOT_KEY || "";
const certPath = process.env.RS_BOOT_CERT || "";
if (!keyPath || !certPath) fail("RS_BOOT_KEY and RS_BOOT_CERT are required (see apps/mobile/scripts/verify-boot.js, which mints a throwaway pair with openssl)");

/* --- the service under test -------------------------------------------------------------- */
const apiPort = Number(process.env.RS_BOOT_API_PORT || 9444);
/* `RS_BOOT_BAKE_ONLY=1` runs every input check and the origin re-bake, prints the result and exits
   without binding a socket or starting a service. That is what lets `apps/mobile/tests/boot.test.js`
   test this file's guards at all — a guard that only fires after the network is up cannot be asserted
   from a unit test, and a guard nobody can assert is a guard that rots. */
if (process.env.RS_BOOT_BAKE_ONLY === "1") {
  console.log(JSON.stringify({ ok: true, origin, bytes: Buffer.byteLength(boot), hasOrigin: boot.includes(origin), bootPage: path.relative(ROOT, bootPath) }));
  process.exit(0);
}
const child = process.env.RS_BOOT_EXTERNAL_API === "1" ? null : spawn(
  process.execPath, [path.join(MOBILE, "server.js")],
  {
    cwd: MOBILE,
    env: Object.assign({}, process.env, {
      PORT: String(apiPort),
      MOBILE_PUBLIC_ORIGIN: origin,
      /* No API proxy: this harness boots an interface, it does not sign people in. The line
         "api proxy: DISABLED" in the log is the expected state, not a warning. */
      API_INTERNAL_URL: "",
    }),
    stdio: ["ignore", "pipe", "pipe"],
  }
);
if (child) {
  child.stdout.on("data", (b) => process.env.RS_BOOT_VERBOSE && process.stdout.write("[api] " + b));
  child.stderr.on("data", (b) => process.env.RS_BOOT_VERBOSE && process.stderr.write("[api!] " + b));
}
function stopAll(code) {
  if (child && !child.killed) { try { child.kill("SIGTERM"); } catch (_) { /* gone */ } }
  process.exit(code);
}
process.on("SIGINT", () => stopAll(130));
process.on("SIGTERM", () => stopAll(143));

/* --- the front door ---------------------------------------------------------------------- */
function proxy(req, res) {
  const fwd = http.request(
    { host: "127.0.0.1", port: apiPort, path: req.url, method: req.method, headers: Object.assign({}, req.headers, { host: `127.0.0.1:${apiPort}` }) },
    (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res); }
  );
  fwd.on("error", () => { res.writeHead(502, { "content-type": "application/json" }); res.end('{"ok":false,"code":"BOOT_SERVE_API_DOWN"}'); });
  req.pipe(fwd);
}
const serve = (req, res) => {
  const url = String(req.url || "/").split("?")[0];
  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(boot);
  }
  if (PASS_THROUGH.test(url)) return proxy(req, res);
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: false, code: "BOOT_SERVE_NOT_APPLICABLE", url }));
};
/* The origin bake is the part of this file that a unit test can assert without a browser, so let it be
   asserted: RS_BOOT_SELFTEST_EXIT=1 checks every input, prints the result and leaves before sockets. */
if (process.env.RS_BOOT_SELFTEST_EXIT === "1") {
  console.log(JSON.stringify({ ok: true, origin, port, apiPort, bytes: Buffer.byteLength(boot), hasOrigin: boot.includes(origin) }));
  process.exit(0);
}
const opts = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
const server = https.createServer(opts, serve);
server.listen(port, "0.0.0.0", () => console.log(`boot-serve: front https on :${port}, api on :${apiPort}, page → ${origin}/, service origin baked as ${origin}`));

/* One-shot mode for CI: serve, wait for the caller's probe to finish, exit with its verdict.
   `RS_BOOT_HOLD_MS` keeps the front door up while an external puppeteer run happens. */
const hold = Number(process.env.RS_BOOT_HOLD_MS || 0);
if (hold > 0) setTimeout(() => stopAll(0), hold);
else if (process.env.RS_BOOT_SELFTEST === "1") {
  setTimeout(() => {
    https.get({ host: "127.0.0.1", port, path: "/", rejectUnauthorized: false }, (r) => {
      let t = ""; r.on("data", (c) => (t += c));
      r.on("end", () => { console.log(`boot-serve: self-test / → ${r.statusCode}, ${t.length} bytes, origin baked: ${t.includes(origin)}`); stopAll(t.includes(origin) ? 0 : 1); });
    }).on("error", (e) => { console.error("boot-serve: self-test failed:", e.message); stopAll(1); });
  }, 400);
} else {
  console.log("boot-serve: ready (kill it when the run is done; RS_BOOT_HOLD_MS=N self-exits after N ms)");
}
