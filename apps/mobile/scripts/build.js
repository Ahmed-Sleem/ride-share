#!/usr/bin/env node
/* Assemble the Capacitor www/ + Railway dist/ from the ONE web build
   (DEC-176, P7.1). Never fork screens. Brand identity comes from
   packages/brand/brand.json — the same source the web and emails use. */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../../..");
const HERE = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "apps/web");
const BRAND = JSON.parse(
  fs.readFileSync(path.join(ROOT, "packages/brand/brand.json"), "utf8")
);

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}

const webBuild = path.join(WEB, "build.js");
if (!fs.existsSync(webBuild)) {
  console.error("FAIL: web build.js missing — mobile wraps @ride-share/web");
  process.exit(1);
}
run(process.execPath, [webBuild], WEB);

const webHtml = fs.existsSync(path.join(WEB, "dist/index.html"))
  ? path.join(WEB, "dist/index.html")
  : path.join(WEB, "dist-preview.html");
if (!fs.existsSync(webHtml)) {
  console.error("FAIL: web produced no HTML");
  process.exit(1);
}

const www = path.join(HERE, "www");
const dist = path.join(HERE, "dist");
fs.rmSync(www, { recursive: true, force: true });
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
fs.mkdirSync(path.join(dist, "www"), { recursive: true });

function liveOrigin() {
  const env = (process.env.MOBILE_PUBLIC_ORIGIN || process.env.PUBLIC_MOBILE_ORIGIN ||
    process.env.MOBILE_WEB_ORIGIN || "").trim();
  if (env) return env.replace(/\/$/, "");
  const railway = (process.env.RAILWAY_PUBLIC_DOMAIN || "").trim().replace(/^https?:\/\//, "");
  if (railway) return "https://" + railway.replace(/\/$/, "");
  return "";
}
const origin = liveOrigin();
const webOrigin = (process.env.PUBLIC_WEB_ORIGIN ||
  "https://ride-shareweb-production.up.railway.app").replace(/\/$/, "");
const appId = (process.env.MOBILE_APP_ID || "eg.rideshare.app").trim();
const secret = (process.env.MOBILE_APP_SECRET || "").trim();

/* Local-first: Capacitor must start on a FILE in www/, never server.url.
   With server.url the WebView hits the remote host first; offline then
   shows Android's default error page. Boot HTML lives on the device. */
const bootSrc = path.join(HERE, "offline.html");
if (!fs.existsSync(bootSrc)) {
  console.error("FAIL: apps/mobile/offline.html missing");
  process.exit(1);
}
const inject = `<script>window.__RS_PUBLIC_ORIGIN=${JSON.stringify(origin)};window.__RS_SURFACE="mobile";window.__RS_APP_ID=${JSON.stringify(appId)};window.__RS_APP_SECRET=${JSON.stringify(secret)};</script>`;
let boot = fs.readFileSync(bootSrc, "utf8");
/* The boot page is inside the binary and cannot fetch the app's stylesheet, so the
   typeface is handed to it here, from the same brand.json the web build reads. The
   marker is asserted on purpose: a silently missed injection would leave the splash on
   a system font, and nobody would notice until two screens were compared. */
const BRAND_CSS_MARK = "/*__RS_BRAND__*/";
if (!boot.includes(BRAND_CSS_MARK)) throw new Error("apps/mobile/offline.html: brand CSS marker missing");
/* @font-face blocks are taken from the web build's own output, where they are already
   base64-inlined. That is deliberate: naming a family the APK never ships would leave the
   boot page on Roboto and look like a match without being one, and pointing at a path
   build.js invented would be a second source of truth about where the fonts live. */
const faces = (fs.readFileSync(webHtml, "utf8").match(/@font-face\s*\{[^}]*\}/g) || []).join("");
if (!faces) throw new Error("web build contains no @font-face block — refusing to ship a boot page on a system font");
/* The declarations go inside the boot page's :root, the @font-face blocks must NOT: an
   at-rule nested in a style rule is invalid and is dropped in silence, which is how the
   first version of this injection shipped a boot page that named Cairo and loaded nothing.
   Two markers, two positions, both asserted. */
const FACES_MARK = "/*__RS_FACES__*/";
if (!boot.includes(FACES_MARK)) throw new Error("apps/mobile/offline.html: faces marker missing");
boot = boot.replace(FACES_MARK, "<style>" + faces + "</style>");
boot = boot.replace(BRAND_CSS_MARK,
  "--brand-font:" + BRAND.font.family + ";--brand-font-weight:" + BRAND.font.weight);
if (boot.includes("</head>")) boot = boot.replace("</head>", inject + "</head>");
else boot = inject + boot;
fs.writeFileSync(path.join(www, "index.html"), boot);
fs.writeFileSync(path.join(www, "offline.html"), boot);

/* Railway `mobile` serves the LIVE app HTML (intro → auth), not the splash.
   The splash only lives on the device so offline never hits Android's page. */
let appHtml = fs.readFileSync(webHtml, "utf8");
const appTag = `<script>window.__RS_SURFACE="mobile";window.__RS_PUBLIC_ORIGIN=${JSON.stringify(origin)};window.__RS_APP_ID=${JSON.stringify(appId)};window.__RS_APP_SECRET=${JSON.stringify(secret)};</script>`;
if (!appHtml.includes("__RS_SURFACE")) {
  appHtml = appHtml.includes("<head>") ? appHtml.replace("<head>", "<head>" + appTag) : appTag + appHtml;
} else if (!appHtml.includes("__RS_APP_SECRET")) {
  appHtml = appHtml.replace('window.__RS_SURFACE="mobile";', `window.__RS_SURFACE="mobile";window.__RS_APP_ID=${JSON.stringify(appId)};window.__RS_APP_SECRET=${JSON.stringify(secret)};`);
}
fs.writeFileSync(path.join(dist, "www", "index.html"), appHtml);
fs.writeFileSync(path.join(dist, "www", "offline.html"), boot);

fs.copyFileSync(path.join(HERE, "server.js"), path.join(dist, "server.js"));

const cfg = {
  appId,
  appName: BRAND.name.en,
  webDir: "www",
  android: { allowMixedContent: false },
  server: {
    cleartext: false,
    androidScheme: "https",
    hostname: "localhost",
    allowNavigation: [...new Set([
      origin.replace(/^https?:\/\//, ""),
      webOrigin.replace(/^https?:\/\//, ""),
    ].filter(Boolean))],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: BRAND.browserThemeColor.light,
    },
    StatusBar: { style: "DARK" },
  },
};
fs.writeFileSync(
  path.join(HERE, "capacitor.config.json"),
  JSON.stringify(cfg, null, 2) + "\n"
);
fs.writeFileSync(
  path.join(dist, "capacitor.config.json"),
  JSON.stringify(cfg, null, 2) + "\n"
);

const ver = BRAND.version || { name: "0.0.0", code: 0 };
const meta = {
  service: "mobile",
  wrapped: "@ride-share/web",
  appId,
  appName: BRAND.name.en,
  versionName: ver.name,
  versionCode: ver.code,
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(dist, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(`mobile: boot ${boot.length} bytes → www/ (live ${origin})`);
