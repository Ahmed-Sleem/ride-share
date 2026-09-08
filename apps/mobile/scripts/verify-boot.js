#!/usr/bin/env node
/* D-8.11 / chunk E — boot the shipped artifact in a real browser, against a real service, in CI.

   What this catches that every other job here cannot: a build whose boot page cannot reach its own
   service, or reaches it and still stops. Both G-114 (a mis-baked origin in the installer) and G-115
   (a bundle with no `<origin>` tag: it mounted, then dialled the WebView's own `https://localhost`
   where nothing answers) passed every unit test, every layout matrix and the whole web suite, because
   each of them reads a file while this one reads a *screen*. The recipe lived in a scratch file for two
   rounds (that is how D-8.11 stayed open); it is a repo script now, and CI runs it on every push.

   Two assertions, both required, because a harness that can only pass is not a harness:

     live  the boot page, served exactly as the installer carries it, over TLS, must mount the app —
           `#root` with children — and must NOT be showing the offline card.
     dead  the same page, told to dial a port where nothing answers, MUST stop on the offline card with
           a reason line. If this one passes while reporting the app, the positive result means nothing:
           it would say the page mounts no matter what, which is a stuck spinner wearing a success.

   usage: node apps/mobile/scripts/verify-boot.js [--live-only] [--url https://host:port]
          RS_BOOT_PUPPETEER=/path/to/puppeteer      where to load puppeteer from (optional)
          RS_BOOT_CHROME=/path/to/chrome            browser to launch (optional; else puppeteer's own)

   It prints one line per check, prefixed `boot:` and ending in a `/examined N/`-style count so
   `scripts/verify-repo.sh`-style readers can tell a real run from a silent skip. */
"use strict";
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const HERE = __dirname;
const MOBILE = path.join(HERE, "..");
const ROOT = path.join(MOBILE, "..", "..");
const { verdictOf, isDone } = require(path.join(HERE, "lib", "boot-assert.js"));
const args = process.argv.slice(2);
const LIVE_ONLY = args.includes("--live-only");
const PORT = Number(process.env.RS_BOOT_PORT || 9443);

let examined = 0;
const results = [];
function report(name, ok, detail) {
  examined++;
  results.push({ name, ok: !!ok, detail: String(detail || "").slice(0, 300) });
  console.log(`boot: ${ok ? "ok  " : "FAIL"} ${name}${detail ? " — " + String(detail).slice(0, 240) : ""}`);
}
function die(msg) { console.error("boot: FAIL " + msg); process.exit(1); }

/* --- 1. certificate ---------------------------------------------------------------------- */
/* Chromium refuses crypto.subtle (so: refuses the sha check) on an insecure origin, and the boot page
   verifies a sha before it mounts. A throwaway cert is not a shortcut; it is what makes the failure mode
   real instead of fabricated. */
function mintCert(dir) {
  const key = path.join(dir, "key.pem"), crt = path.join(dir, "cert.pem");
  if (process.env.RS_BOOT_KEY && process.env.RS_BOOT_CERT) return { key: process.env.RS_BOOT_KEY, cert: process.env.RS_BOOT_CERT };
  const r = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt,
    "-days", "2", "-subj", "/CN=boot.test.invalid",
    "-addext", "subjectAltName=DNS:boot-live.test.invalid,DNS:boot-dead.test.invalid,DNS:boot.test.invalid,IP:127.0.0.1"],
    { encoding: "utf8" });
  if (r.status !== 0 || !fs.existsSync(crt)) die("could not mint a throwaway cert (openssl missing?): " + (r.stderr || "").slice(0, 200));
  return { key, cert: crt };
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rs-boot-"));
const { key, cert } = mintCert(tmp);

/* --- 2. puppeteer ------------------------------------------------------------------------ */
function loadPuppeteer() {
  const tries = [];
  if (process.env.RS_BOOT_PUPPETEER) tries.push(process.env.RS_BOOT_PUPPETEER);
  tries.push(path.join(ROOT, "apps", "web", "node_modules", "puppeteer"));
  tries.push(path.join(ROOT, "node_modules", "puppeteer"));
  tries.push("puppeteer");
  for (const t of tries) { try { return require(t); } catch (_) { /* next */ } }
  die("puppeteer is not resolvable from any of: " + tries.join(", ") + " — in CI that means `pnpm install` did not run for @ride-share/web");
}

/* --- 3. service (unless the caller brought its own URL) ----------------------------------- */
let child = null;
/* One front door per scenario, each with its OWN baked origin. Two separate ports rather than one
   server and a faked failure, because the negative control has to fail the way a phone fails — a fetch
   to a host that answers nothing — and not by the harness being switched off mid-run (a killed server
   would leave a cached bundle in localStorage and mount the app from cache, which is the one case that
   looks like a pass and proves nothing). */
const BOOT_PAGE = process.env.RS_BOOT_PAGE || path.join(MOBILE, "www", "index.html");
function startHarness(port, pageOrigin, apiPort) {
  const env = Object.assign({}, process.env, {
    PORT: String(port), RS_BOOT_KEY: key, RS_BOOT_CERT: cert,
    RS_BOOT_PAGE: BOOT_PAGE,
    RS_BOOT_PAGE_ORIGIN: pageOrigin, RS_BOOT_API_PORT: String(apiPort),
  });
  const c = spawn(process.execPath, [path.join(HERE, "boot-serve.js")], { cwd: MOBILE, env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  c.stdout.on("data", (b) => { out += b; if (process.env.RS_BOOT_VERBOSE) process.stdout.write("[serve] " + b); });
  c.stderr.on("data", (b) => { out += b; if (process.env.RS_BOOT_VERBOSE) process.stderr.write("[serve!] " + b); });
  c.on("exit", (code) => { if (code !== 0 && code !== null) dieMsg(`the harness front door exited ${code}:\n${out.slice(-800)}`); });
  return Object.assign(c, { out: () => out });
  function dieMsg(m) { console.error("boot: FAIL " + m); cleanup(); process.exit(1); }
}
function waitPort(host, port, ms) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    (function probe() {
      const s = net.connect({ host: "127.0.0.1", port });
      s.once("connect", () => { s.destroy(); resolve(); });
      s.once("error", () => { s.destroy(); Date.now() - t0 > ms ? reject(new Error(`${host}:${port} never answered within ${ms}ms`)) : setTimeout(probe, 120); });
    })();
  });
}
function cleanup() {
  if (child && !child.killed) { try { child.kill("SIGTERM"); } catch (_) { /* gone */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* temp dirs are allowed to survive */ }
}

/* --- 4. the probes ---------------------------------------------------------------------- */
const PROBE = () => {
  const q = (s) => document.querySelector(s);
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const off = q("#offline");
  const box = off ? off.getBoundingClientRect() : null;
  const root = q("#root");
  const st = cs(off);
  return {
    mounted: !!root && root.children.length > 0,
    rootChildren: root ? root.children.length : 0,
    offline: off ? { present: true, display: st.display, visibility: st.visibility, opacity: st.opacity, width: box.width, height: box.height } : { present: false },
    busyText: (q("#status")?.textContent || "") + " " + (q("#why")?.textContent || ""),
    versionCode: (() => { try { return localStorage.getItem("rs.ota.ver.v1"); } catch (e) { return null; } })(),
    sha: (() => { try { return localStorage.getItem("rs.ota.sha.v1"); } catch (e) { return null; } })(),
    errors: (window.__rsBootErrors || []).slice(0, 4),
  };
};
const COLLECT = () => {
  window.__rsBootErrors = [];
  window.addEventListener("error", (e) => window.__rsBootErrors.push(String(e.message || e)));
  window.addEventListener("unhandledrejection", (e) => window.__rsBootErrors.push("promise: " + String((e.reason && e.reason.message) || e.reason)));
};

async function bootOnce(browser, url, expect) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("requestfailed", (r) => { if (process.env.RS_BOOT_VERBOSE) console.log("boot:   (net) " + r.url() + " → " + (r.failure() || {}).errorText); });
  await page.evaluateOnNewDocument(COLLECT);
  // domcontentloaded, never networkidle: the splash is replaced the moment the bundle is mounted, so
  // an idle-waiting harness can settle AFTER the app has already come and gone. (Found while writing
  // the scratch version — it made a passing run look like a timing bug.)
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
  const deadline = Date.now() + (expect === "app" ? 30000 : 12000);
  let v = { state: "pending", detail: "not started", seen: {} };
  while (Date.now() < deadline) {
    const obs = await page.evaluate(PROBE);
    obs.errors = obs.errors.concat(errors);
    v = verdictOf(obs);
    if (isDone(v)) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  await page.close();
  return v;
}

/* The identity the mounted app must report, read from the very service the page dialled — not from a
   file in this repo: the point of the run is that the bytes a phone takes are the bytes the service
   advertises (that pairing is what versionCode bumps and D-8.22 are for). */
let expectVersionCode = null, expectSha = null;
async function readAdvertised(port) {
  const https = require("node:https");
  return new Promise((resolve, reject) => {
    const req = https.get({ host: "127.0.0.1", port, path: "/v1/mobile/update", rejectUnauthorized: false, headers: { host: `boot-live.test.invalid:${port}` } }, (r) => {
      let t = ""; r.on("data", (c) => (t += c)); r.on("end", () => { try { resolve(JSON.parse(t)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
  });
}

(async function main() {
  const external = args.indexOf("--url");
  const liveUrl = external >= 0 ? args[external + 1] : "https://boot-live.test.invalid:" + PORT + "/";
  const DEAD_PORT = PORT + 56;                 // nothing listens here, on purpose
  let deadChild = null;
  const deadUrl = "https://boot-dead.test.invalid:" + (DEAD_PORT + 1) + "/";
  if (external < 0) {
    if (!fs.existsSync(BOOT_PAGE)) die(`no boot page at ${BOOT_PAGE} — run \`node apps/mobile/scripts/build.js\` first (that is the file the installer carries)`);
    child = startHarness(PORT, `https://boot-live.test.invalid:${PORT}`, PORT + 1);
    try { await waitPort("boot-live.test.invalid", PORT, 15000); } catch (e) { die(String(e.message)); }
    if (!LIVE_ONLY) {
      /* The page here is told to dial DEAD_PORT, which nothing ever listens on; the front door itself
         runs on PORT+1 so the page still loads. */
      deadChild = startHarness(DEAD_PORT + 1, `https://boot-dead.test.invalid:${DEAD_PORT}`, DEAD_PORT + 2);
      try { await waitPort("boot-dead.test.invalid", DEAD_PORT + 1, 15000); } catch (e) { die("negative-control front door: " + e.message); }
    }
  } else {
    report("caller supplied --url, harness front door not started", true, liveUrl);
  }

  const puppeteer = loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: "new",
    ...(process.env.RS_BOOT_CHROME ? { executablePath: process.env.RS_BOOT_CHROME } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--ignore-certificate-errors",
           /* `.test.invalid` never resolves anywhere (RFC 6761), so the mapping is what makes the two
              hosts real for this run. `MAP * ~NOTFOUND` was tried first and it swallows the mappings
              that follow it — the page then fails with ERR_NAME_NOT_RESOLVED, which reads like a dead
              service and is really a harness that cannot reach itself. Pin only what you need. */
           "--host-resolver-rules=MAP boot-live.test.invalid 127.0.0.1, MAP boot-dead.test.invalid 127.0.0.1"],
  });
  try {
    try {
      const adv = await readAdvertised(PORT);
      if (adv && adv.ok) { expectVersionCode = adv.versionCode; expectSha = adv.sha256; }
    } catch (_) { /* an external --url may not expose /v1/mobile/update; the identity check just steps aside */ }

    const live = await bootOnce(browser, liveUrl, "app");
    report("the boot page mounts the app (not the offline card)", live.state === "app", `${live.state}: ${live.detail} ${JSON.stringify(live.seen)}${expectVersionCode ? " [want versionCode " + expectVersionCode + "]" : ""}`);
    if (expectVersionCode !== null) {
      report("the mounted bundle reports the version the service advertises", String(live.seen.mounted) === "true" && live.state === "app",
        `mounted=${live.seen.mounted} advertised=${expectVersionCode} sha=${String(expectSha).slice(0, 12)}…`);
    }
    if (!LIVE_ONLY) {
      /* The negative control. Same build, same browser, different port: nothing is listening, so the
         only honest answer is the offline card carrying a reason. */
      const dead = await bootOnce(browser, deadUrl, "offline");
      report("a service that does not answer produces the offline card, not a white screen", dead.state === "offline",
        `${dead.state}: ${dead.detail} ${JSON.stringify(dead.seen)}`);
    }
  } finally {
    await browser.close().catch(() => {});
    if (deadChild && !deadChild.killed) { try { deadChild.kill("SIGTERM"); } catch (_) {} }
    cleanup();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`boot: examined ${examined} check(s), ${failed.length} failing`);
  process.exit(failed.length ? 1 : 0);
})();
